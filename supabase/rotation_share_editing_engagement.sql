-- Run AFTER rotation_share_codes.sql in the Supabase SQL editor.
-- Existing links and creator attribution are preserved. Safe to rerun.
begin;
alter table public.rotation_share_codes
    add column if not exists revision integer not null default 1 check (revision > 0),
    add column if not exists updated_at timestamptz;
create index if not exists rotation_share_codes_creator_idx
    on public.rotation_share_codes (created_by, created_at desc);

create or replace function public.create_rotation_share(
    p_share_type text,
    p_share_payload text,
    p_format_version integer,
    p_operator_ids integer[],
    p_title text,
    p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    normalized_type text := lower(trim(coalesce(p_share_type, '')));
    normalized_payload text := trim(coalesce(p_share_payload, ''));
    normalized_title text := regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g');
    normalized_description text := trim(coalesce(p_description, ''));
    normalized_operator_ids integer[];
    creator_id uuid := auth.uid();
    resolved_author text := 'Anonymous';
    content_hash text;
    existing_share public.rotation_share_codes%rowtype;
    inserted_share public.rotation_share_codes%rowtype;
    candidate_code text;
    alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    attempt integer;
    character_index integer;
begin
    if normalized_type not in ('rotation', 'simulation') then
        raise exception 'Unknown share type: %', p_share_type using errcode = '22023';
    end if;

    if char_length(normalized_payload) not between 8 and 12000
        or normalized_payload !~ '^[A-Za-z0-9_-]+$' then
        raise exception 'Invalid share payload' using errcode = '22023';
    end if;

    if p_format_version is null or p_format_version not between 1 and 32767 then
        raise exception 'Invalid share format version' using errcode = '22023';
    end if;

    if char_length(normalized_title) not between 3 and 60 then
        raise exception 'Share title must contain between 3 and 60 characters' using errcode = '22023';
    end if;

    if char_length(normalized_description) > 500 then
        raise exception 'Share description must not exceed 500 characters' using errcode = '22023';
    end if;

    if creator_id is not null then
        select coalesce(
            nullif(trim(profile.username), ''),
            nullif(trim(auth.jwt() -> 'user_metadata' ->> 'username'), ''),
            'Anonymous'
        )
        into resolved_author
        from (select 1) as source
        left join public.user_profiles as profile on profile.user_id = creator_id;
    end if;

    select coalesce(array_agg(normalized.operator_id order by normalized.first_position), '{}'::integer[])
    into normalized_operator_ids
    from (
        select requested.operator_id, min(requested.position) as first_position
        from unnest(coalesce(p_operator_ids, '{}'::integer[]))
            with ordinality as requested(operator_id, position)
        where requested.operator_id is not null
        group by requested.operator_id
    ) as normalized;

    if cardinality(normalized_operator_ids) not between 1 and 4 then
        raise exception 'A share must contain between one and four operators' using errcode = '22023';
    end if;

    if exists (
        select 1
        from unnest(normalized_operator_ids) as requested(requested_operator_id)
        where not exists (
            select 1
            from public.operators as op
            where op.id = requested.requested_operator_id
                and op.game = 'arknights_endfield'
        )
    ) then
        raise exception 'Share contains an unknown Endfield operator' using errcode = '22023';
    end if;

    -- This hash is a deduplication key, not an authentication primitive.
    content_hash := md5(normalized_payload);

    -- Serialize equal payloads so repeated clicks reuse the same short code.
    perform pg_advisory_xact_lock(hashtext(
        normalized_type || ':' || content_hash || ':' || coalesce(creator_id::text, 'anonymous') || ':' || normalized_title
    ));

    select share.*
    into existing_share
    from public.rotation_share_codes as share
    where share.share_type = normalized_type
        and share.payload_hash = content_hash
        and share.share_payload = normalized_payload
        and share.title = normalized_title
        and share.description = normalized_description
        and share.created_by is not distinct from creator_id
        and share.is_public
        and (share.expires_at is null or share.expires_at > now())
    order by share.created_at desc
    limit 1;

    if found then
        if existing_share.operator_ids is distinct from normalized_operator_ids then
            update public.rotation_share_codes as share
            set operator_ids = normalized_operator_ids
            where share.id = existing_share.id;
        end if;

        return jsonb_build_object(
            'short_code', existing_share.short_code,
            'share_type', existing_share.share_type,
            'title', existing_share.title,
            'description', existing_share.description,
            'author_name', existing_share.author_name,
            'format_version', existing_share.format_version,
            'can_edit', coalesce(existing_share.created_by = auth.uid(), false),
            'revision', existing_share.revision,
            'updated_at', existing_share.updated_at,
            'created_at', existing_share.created_at
        );
    end if;

    for attempt in 1..24 loop
        candidate_code := '';
        for character_index in 1..6 loop
            candidate_code := candidate_code || substr(
                alphabet,
                1 + floor(random() * char_length(alphabet))::integer,
                1
            );
        end loop;

        begin
            insert into public.rotation_share_codes (
                short_code,
                share_type,
                share_payload,
                operator_ids,
                format_version,
                payload_hash,
                created_by,
                title,
                description,
                author_name
            ) values (
                candidate_code,
                normalized_type,
                normalized_payload,
                normalized_operator_ids,
                p_format_version::smallint,
                content_hash,
                creator_id,
                normalized_title,
                normalized_description,
                resolved_author
            )
            returning * into inserted_share;

            return jsonb_build_object(
                'short_code', inserted_share.short_code,
                'share_type', inserted_share.share_type,
                'title', inserted_share.title,
                'description', inserted_share.description,
                'author_name', inserted_share.author_name,
                'format_version', inserted_share.format_version,
                'can_edit', coalesce(inserted_share.created_by = auth.uid(), false),
                'revision', inserted_share.revision,
                'updated_at', inserted_share.updated_at,
                'created_at', inserted_share.created_at
            );
        exception
            when unique_violation then
                -- Generate another code. The six-character namespace contains
                -- more than one billion unambiguous combinations.
                null;
        end;
    end loop;

    raise exception 'Could not allocate a unique share code' using errcode = '54000';
end;
$$;

create or replace function public.resolve_rotation_share(p_short_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
    normalized_code text := upper(trim(coalesce(p_short_code, '')));
    stored_share public.rotation_share_codes%rowtype;
begin
    if normalized_code !~ '^[A-Z0-9]{6}$' then
        raise exception 'Invalid short share code' using errcode = '22023';
    end if;

    select share.*
    into stored_share
    from public.rotation_share_codes as share
    where share.short_code = normalized_code
        and share.is_public
        and (share.expires_at is null or share.expires_at > now());

    if not found then
        raise exception 'Share code not found' using errcode = 'P0002';
    end if;

    return jsonb_build_object(
        'short_code', stored_share.short_code,
        'share_type', stored_share.share_type,
        'share_payload', stored_share.share_payload,
        'title', stored_share.title,
        'description', stored_share.description,
        'author_name', stored_share.author_name,
        'format_version', stored_share.format_version,
        'can_edit', coalesce(stored_share.created_by = auth.uid(), false),
        'revision', stored_share.revision,
        'updated_at', stored_share.updated_at,
        'created_at', stored_share.created_at
    );
end;
$$;

create or replace function public.list_public_rotation_shares(
    p_limit integer default 200
)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
    with visible_shares as (
        select share.*
        from public.rotation_share_codes as share
        where share.is_public
            and (share.expires_at is null or share.expires_at > now())
    ),
    listed_shares as (
        select share.*
        from visible_shares as share
        order by share.created_at desc, share.short_code
        limit least(greatest(coalesce(p_limit, 200), 1), 500)
    )
    select jsonb_build_object(
        'rotation_count', (select count(*) from visible_shares where share_type = 'rotation'),
        'simulation_count', (select count(*) from visible_shares where share_type = 'simulation'),
        'items', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'short_code', listed.short_code,
                    'share_type', listed.share_type,
                    'title', listed.title,
                    'description', listed.description,
                    'author_name', listed.author_name,
                    'format_version', listed.format_version,
                    'can_edit', coalesce(listed.created_by = auth.uid(), false),
                    'revision', listed.revision,
                    'updated_at', listed.updated_at,
                    'created_at', listed.created_at,
                    'operator_ids', listed.operator_ids
                )
                order by listed.created_at desc, listed.short_code
            )
            from listed_shares as listed
        ), '[]'::jsonb)
    );
$$;

create or replace function public.list_my_rotation_shares(
    p_limit integer default 200
)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
    with visible_shares as (
        select share.*
        from public.rotation_share_codes as share
        where share.created_by = auth.uid() and share.is_public
            and (share.expires_at is null or share.expires_at > now())
    ),
    listed_shares as (
        select share.*
        from visible_shares as share
        order by share.created_at desc, share.short_code
        limit least(greatest(coalesce(p_limit, 200), 1), 500)
    )
    select jsonb_build_object(
        'rotation_count', (select count(*) from visible_shares where share_type = 'rotation'),
        'simulation_count', (select count(*) from visible_shares where share_type = 'simulation'),
        'items', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'short_code', listed.short_code,
                    'share_type', listed.share_type,
                    'title', listed.title,
                    'description', listed.description,
                    'author_name', listed.author_name,
                    'format_version', listed.format_version,
                    'can_edit', coalesce(listed.created_by = auth.uid(), false),
                    'revision', listed.revision,
                    'updated_at', listed.updated_at,
                    'created_at', listed.created_at,
                    'operator_ids', listed.operator_ids
                )
                order by listed.created_at desc, listed.short_code
            )
            from listed_shares as listed
        ), '[]'::jsonb)
    );
$$;

create or replace function public.update_rotation_share(
    p_short_code text, p_expected_revision integer, p_share_type text,
    p_share_payload text, p_format_version integer, p_operator_ids integer[],
    p_title text, p_description text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
    normalized_type text := lower(trim(coalesce(p_share_type, '')));
    normalized_payload text := trim(coalesce(p_share_payload, ''));
    normalized_title text := regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g');
    normalized_description text := trim(coalesce(p_description, ''));
    normalized_operator_ids integer[];
    stored_share public.rotation_share_codes%rowtype;
begin
    if auth.uid() is null then
        raise exception 'Sign in to edit your publication' using errcode = '42501';
    end if;
    select * into stored_share from public.rotation_share_codes
    where short_code = upper(trim(p_short_code)) and created_by = auth.uid()
        and is_public and (expires_at is null or expires_at > now()) for update;
    if not found then
        raise exception 'Publication not found or not owned by this account' using errcode = '42501';
    end if;
    if p_expected_revision is distinct from stored_share.revision then
        raise exception 'This publication changed. Reload its link before editing again.' using errcode = '40001';
    end if;
    if normalized_type is distinct from stored_share.share_type then
        raise exception 'Keep the original planner mode or publish a new share' using errcode = '22023';
    end if;
    if normalized_type not in ('rotation', 'simulation') then
        raise exception 'Unknown share type: %', p_share_type using errcode = '22023';
    end if;

    if char_length(normalized_payload) not between 8 and 12000
        or normalized_payload !~ '^[A-Za-z0-9_-]+$' then
        raise exception 'Invalid share payload' using errcode = '22023';
    end if;

    if p_format_version is null or p_format_version not between 1 and 32767 then
        raise exception 'Invalid share format version' using errcode = '22023';
    end if;

    if char_length(normalized_title) not between 3 and 60 then
        raise exception 'Share title must contain between 3 and 60 characters' using errcode = '22023';
    end if;

    if char_length(normalized_description) > 500 then
        raise exception 'Share description must not exceed 500 characters' using errcode = '22023';
    end if;

    select coalesce(array_agg(normalized.operator_id order by normalized.first_position), '{}'::integer[])
    into normalized_operator_ids
    from (
        select requested.operator_id, min(requested.position) as first_position
        from unnest(coalesce(p_operator_ids, '{}'::integer[]))
            with ordinality as requested(operator_id, position)
        where requested.operator_id is not null
        group by requested.operator_id
    ) as normalized;

    if cardinality(normalized_operator_ids) not between 1 and 4 then
        raise exception 'A share must contain between one and four operators' using errcode = '22023';
    end if;

    if exists (
        select 1
        from unnest(normalized_operator_ids) as requested(requested_operator_id)
        where not exists (
            select 1
            from public.operators as op
            where op.id = requested.requested_operator_id
                and op.game = 'arknights_endfield'
        )
    ) then
        raise exception 'Share contains an unknown Endfield operator' using errcode = '22023';
    end if;


    update public.rotation_share_codes set
        share_payload = normalized_payload, payload_hash = md5(normalized_payload),
        format_version = p_format_version, operator_ids = normalized_operator_ids,
        title = normalized_title, description = normalized_description,
        revision = revision + 1, updated_at = now()
    where id = stored_share.id;
    return public.resolve_rotation_share(stored_share.short_code);
end;
$$;

-- Visitor identifiers follow the Operator Database's per-browser model.
create table if not exists public.rotation_share_engagement (
    short_code varchar(6) not null references public.rotation_share_codes(short_code) on delete cascade,
    visitor_id uuid not null,
    viewed_at timestamptz,
    reaction text check (reaction in ('like', 'dislike')),
    primary key (short_code, visitor_id)
);
alter table public.rotation_share_engagement enable row level security;
revoke all on public.rotation_share_engagement from public, anon, authenticated;

create or replace function public.get_rotation_share_engagement(p_short_codes text[], p_visitor_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
    if p_visitor_id is null or coalesce(cardinality(p_short_codes), 0) not between 1 and 500 then
        raise exception 'Invalid engagement request' using errcode = '22023';
    end if;
    select coalesce(jsonb_object_agg(short_code, summary), '{}'::jsonb) into result from (
        select share.short_code, jsonb_build_object(
            'view_count', count(e.viewed_at),
            'like_count', count(*) filter (where e.reaction = 'like'),
            'dislike_count', count(*) filter (where e.reaction = 'dislike'),
            'reaction', max(e.reaction) filter (where e.visitor_id = p_visitor_id)
        ) as summary
        from public.rotation_share_codes share
        left join public.rotation_share_engagement e on e.short_code = share.short_code
        where share.short_code = any(p_short_codes) and share.is_public
            and (share.expires_at is null or share.expires_at > now())
        group by share.short_code
    ) summaries;
    return result;
end;
$$;

create or replace function public.record_rotation_share_view(p_short_code text, p_visitor_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare code text := upper(trim(p_short_code));
begin
    if p_visitor_id is null then
        raise exception 'Invalid visitor' using errcode = '22023';
    end if;
    if not exists (select 1 from public.rotation_share_codes where short_code = code
        and is_public and (expires_at is null or expires_at > now())) then
        raise exception 'Publication not found' using errcode = 'P0002';
    end if;
    insert into public.rotation_share_engagement (short_code, visitor_id, viewed_at)
        values (code, p_visitor_id, now())
    on conflict (short_code, visitor_id) do update
        set viewed_at = coalesce(rotation_share_engagement.viewed_at, excluded.viewed_at);
    return public.get_rotation_share_engagement(array[code], p_visitor_id) -> code;
end;
$$;

create or replace function public.set_rotation_share_reaction(p_short_code text, p_visitor_id uuid, p_reaction text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare code text := upper(trim(p_short_code));
begin
    if p_visitor_id is null or (p_reaction is not null and p_reaction not in ('like', 'dislike')) then
        raise exception 'Invalid reaction' using errcode = '22023';
    end if;
    if not exists (select 1 from public.rotation_share_codes where short_code = code
        and is_public and (expires_at is null or expires_at > now())) then
        raise exception 'Publication not found' using errcode = 'P0002';
    end if;
    insert into public.rotation_share_engagement (short_code, visitor_id, reaction)
        values (code, p_visitor_id, p_reaction)
    on conflict (short_code, visitor_id) do update set reaction = excluded.reaction;
    return public.get_rotation_share_engagement(array[code], p_visitor_id) -> code;
end;
$$;

revoke all on function public.list_my_rotation_shares(integer) from public, anon;
grant execute on function public.list_my_rotation_shares(integer) to authenticated;
revoke all on function public.update_rotation_share(text, integer, text, text, integer, integer[], text, text) from public, anon;
grant execute on function public.update_rotation_share(text, integer, text, text, integer, integer[], text, text) to authenticated;
revoke all on function public.get_rotation_share_engagement(text[], uuid) from public;
revoke all on function public.record_rotation_share_view(text, uuid) from public;
revoke all on function public.set_rotation_share_reaction(text, uuid, text) from public;
grant execute on function public.get_rotation_share_engagement(text[], uuid) to anon, authenticated;
grant execute on function public.record_rotation_share_view(text, uuid) to anon, authenticated;
grant execute on function public.set_rotation_share_reaction(text, uuid, text) to anon, authenticated;
commit;
