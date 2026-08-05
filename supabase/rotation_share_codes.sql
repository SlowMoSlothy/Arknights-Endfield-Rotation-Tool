-- Short, mode-aware share codes for the Endfield planner.
-- Run this migration in the Supabase SQL editor.

create table if not exists public.rotation_share_codes (
    id uuid primary key default gen_random_uuid(),
    short_code varchar(6) not null unique,
    share_type text not null,
    share_payload text not null,
    operator_ids integer[] not null default '{}'::integer[],
    format_version smallint not null default 13,
    payload_hash text not null,
    created_by uuid references auth.users(id) on delete set null,
    title text not null default 'Shared Build',
    description text not null default '',
    author_name text not null default 'Anonymous',
    is_public boolean not null default true,
    created_at timestamptz not null default now(),
    expires_at timestamptz,
    constraint rotation_share_codes_short_code_format
        check (short_code ~ '^[A-Z0-9]{6}$'),
    constraint rotation_share_codes_share_type
        check (share_type in ('rotation', 'simulation')),
    constraint rotation_share_codes_payload_size
        check (char_length(share_payload) between 8 and 12000),
    constraint rotation_share_codes_format_version
        check (format_version between 1 and 32767)
);

alter table public.rotation_share_codes
    add column if not exists operator_ids integer[] not null default '{}'::integer[];

alter table public.rotation_share_codes
    add column if not exists title text not null default 'Shared Build',
    add column if not exists description text not null default '',
    add column if not exists author_name text not null default 'Anonymous';

update public.rotation_share_codes as share
set title = case share.share_type
    when 'simulation' then 'Shared Simulation'
    else 'Shared Rotation'
end
where trim(coalesce(share.title, '')) in ('', 'Shared Build');

update public.rotation_share_codes as share
set author_name = coalesce(
    nullif(trim(profile.username), ''),
    'Anonymous'
)
from public.user_profiles as profile
where share.created_by = profile.user_id
    and trim(coalesce(share.author_name, '')) = 'Anonymous';

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'rotation_share_codes_operator_count'
            and conrelid = 'public.rotation_share_codes'::regclass
    ) then
        alter table public.rotation_share_codes
            add constraint rotation_share_codes_operator_count
            check (cardinality(operator_ids) between 0 and 4);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'rotation_share_codes_title_length'
            and conrelid = 'public.rotation_share_codes'::regclass
    ) then
        alter table public.rotation_share_codes
            add constraint rotation_share_codes_title_length
            check (char_length(trim(title)) between 3 and 60);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'rotation_share_codes_description_length'
            and conrelid = 'public.rotation_share_codes'::regclass
    ) then
        alter table public.rotation_share_codes
            add constraint rotation_share_codes_description_length
            check (char_length(description) <= 500);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'rotation_share_codes_author_name_length'
            and conrelid = 'public.rotation_share_codes'::regclass
    ) then
        alter table public.rotation_share_codes
            add constraint rotation_share_codes_author_name_length
            check (char_length(trim(author_name)) between 1 and 40);
    end if;
end;
$$;

-- Preserve already approved legacy community rotations when this directory is
-- introduced. Re-running the migration is safe because the legacy row id is
-- recorded in payload_hash and checked before insertion.
do $$
declare
    legacy_rotation record;
    candidate_code text;
    attempt integer;
begin
    if to_regclass('public.community_rotations') is null then
        return;
    end if;

    for legacy_rotation in
        select legacy.*
        from public.community_rotations as legacy
        where legacy.game = 'arknights_endfield'
            and legacy.is_public
            and legacy.is_approved
            and not legacy.is_hidden
            and char_length(trim(coalesce(legacy.share_code, ''))) between 8 and 12000
            and trim(legacy.share_code) ~ '^[A-Za-z0-9_-]+$'
            and not exists (
                select 1
                from public.rotation_share_codes as existing
                where existing.payload_hash = 'legacy-community:' || legacy.id::text
            )
    loop
        for attempt in 0..99 loop
            candidate_code := upper(substr(md5('legacy-community:' || legacy_rotation.id::text || ':' || attempt::text), 1, 6));
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
                    author_name,
                    is_public,
                    created_at
                )
                values (
                    candidate_code,
                    'rotation',
                    trim(legacy_rotation.share_code),
                    coalesce(legacy_rotation.team_operator_ids, '{}'::integer[]),
                    least(greatest(coalesce(legacy_rotation.setup_version, 13), 1), 32767),
                    'legacy-community:' || legacy_rotation.id::text,
                    legacy_rotation.submitted_by,
                    case
                        when char_length(trim(coalesce(legacy_rotation.title, ''))) between 3 and 60
                            then trim(legacy_rotation.title)
                        when char_length(trim(coalesce(legacy_rotation.title, ''))) > 60
                            then left(trim(legacy_rotation.title), 60)
                        else 'Shared Rotation'
                    end,
                    left(coalesce(legacy_rotation.description, ''), 500),
                    left(coalesce(nullif(trim(legacy_rotation.author_name), ''), 'Anonymous'), 40),
                    true,
                    coalesce(legacy_rotation.created_at, now())
                );
                exit;
            exception
                when unique_violation then
                    if attempt = 99 then
                        raise;
                    end if;
            end;
        end loop;
    end loop;
end;
$$;

create index if not exists idx_rotation_share_codes_payload
    on public.rotation_share_codes (share_type, payload_hash);

create index if not exists idx_rotation_share_codes_expiry
    on public.rotation_share_codes (expires_at)
    where expires_at is not null;

create index if not exists idx_rotation_share_codes_operator_ids
    on public.rotation_share_codes using gin (operator_ids);

alter table public.rotation_share_codes enable row level security;

-- No table policies are intentional. Public clients can only use the
-- validated SECURITY DEFINER functions below.
revoke all on table public.rotation_share_codes from anon, authenticated;

-- Remove the first migration's three-argument overload before installing the
-- operator-aware version. This keeps the migration safe to rerun.
drop function if exists public.create_rotation_share(text, text, integer);
drop function if exists public.create_rotation_share(text, text, integer, integer[]);
drop function if exists public.create_rotation_share(text, text, integer, integer[], text, text);

create function public.create_rotation_share(
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

-- Compatibility overload for clients deployed before share metadata existed.
create function public.create_rotation_share(
    p_share_type text,
    p_share_payload text,
    p_format_version integer default 13,
    p_operator_ids integer[] default '{}'::integer[]
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
    select public.create_rotation_share(
        p_share_type,
        p_share_payload,
        p_format_version,
        p_operator_ids,
        case lower(trim(coalesce(p_share_type, '')))
            when 'simulation' then 'Shared Simulation'
            else 'Shared Rotation'
        end,
        ''
    );
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
        'created_at', stored_share.created_at
    );
end;
$$;

create or replace function public.get_operator_share_summary(p_operator_id integer)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
    select jsonb_build_object(
        'operator_id', p_operator_id,
        'rotation_count', count(*) filter (where share.share_type = 'rotation'),
        'simulation_count', count(*) filter (where share.share_type = 'simulation')
    )
    from public.rotation_share_codes as share
    where share.operator_ids @> array[p_operator_id]
        and share.is_public
        and (share.expires_at is null or share.expires_at > now());
$$;

create or replace function public.list_operator_shares(
    p_operator_id integer,
    p_share_type text,
    p_limit integer default 12,
    p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
    normalized_type text := lower(trim(coalesce(p_share_type, '')));
    result_limit integer := least(greatest(coalesce(p_limit, 12), 1), 50);
    result_offset integer := greatest(coalesce(p_offset, 0), 0);
    total_count bigint;
    share_items jsonb;
begin
    if normalized_type not in ('rotation', 'simulation') then
        raise exception 'Unknown share type: %', p_share_type using errcode = '22023';
    end if;

    select count(*)
    into total_count
    from public.rotation_share_codes as share
    where share.operator_ids @> array[p_operator_id]
        and share.share_type = normalized_type
        and share.is_public
        and (share.expires_at is null or share.expires_at > now());

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'short_code', listed_share.short_code,
                'share_type', listed_share.share_type,
                'title', listed_share.title,
                'description', listed_share.description,
                'author_name', listed_share.author_name,
                'format_version', listed_share.format_version,
                'created_at', listed_share.created_at,
                'operator_ids', listed_share.operator_ids,
                'operator_names', (
                    select coalesce(jsonb_agg(op.name order by array_position(listed_share.operator_ids, op.id)), '[]'::jsonb)
                    from public.operators as op
                    where op.id = any(listed_share.operator_ids)
                        and op.game = 'arknights_endfield'
                )
            )
            order by listed_share.created_at desc
        ),
        '[]'::jsonb
    )
    into share_items
    from (
        select share.*
        from public.rotation_share_codes as share
        where share.operator_ids @> array[p_operator_id]
            and share.share_type = normalized_type
            and share.is_public
            and (share.expires_at is null or share.expires_at > now())
        order by share.created_at desc
        limit result_limit
        offset result_offset
    ) as listed_share;

    return jsonb_build_object(
        'operator_id', p_operator_id,
        'share_type', normalized_type,
        'total', total_count,
        'items', share_items
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
                    'created_at', listed.created_at,
                    'operator_ids', listed.operator_ids
                )
                order by listed.created_at desc, listed.short_code
            )
            from listed_shares as listed
        ), '[]'::jsonb)
    );
$$;

revoke all on function public.create_rotation_share(text, text, integer, integer[]) from public;
revoke all on function public.create_rotation_share(text, text, integer, integer[], text, text) from public;
revoke all on function public.resolve_rotation_share(text) from public;
revoke all on function public.get_operator_share_summary(integer) from public;
revoke all on function public.list_operator_shares(integer, text, integer, integer) from public;
revoke all on function public.list_public_rotation_shares(integer) from public;
grant execute on function public.create_rotation_share(text, text, integer, integer[]) to anon, authenticated;
grant execute on function public.create_rotation_share(text, text, integer, integer[], text, text) to anon, authenticated;
grant execute on function public.resolve_rotation_share(text) to anon, authenticated;
grant execute on function public.get_operator_share_summary(integer) to anon, authenticated;
grant execute on function public.list_operator_shares(integer, text, integer, integer) to anon, authenticated;
grant execute on function public.list_public_rotation_shares(integer) to anon, authenticated;

comment on table public.rotation_share_codes is
    'Opaque planner payloads addressed by unique six-character codes and separated by planner mode.';
comment on column public.rotation_share_codes.share_type is
    'rotation for Slot Mode; simulation for Simulation Mode.';
comment on column public.rotation_share_codes.author_name is
    'Immutable display-name snapshot derived by the server; Anonymous for signed-out creators.';
