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

create function public.create_rotation_share(
    p_share_type text,
    p_share_payload text,
    p_format_version integer default 13,
    p_operator_ids integer[] default '{}'::integer[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    normalized_type text := lower(trim(coalesce(p_share_type, '')));
    normalized_payload text := trim(coalesce(p_share_payload, ''));
    normalized_operator_ids integer[];
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
    perform pg_advisory_xact_lock(hashtext(normalized_type || ':' || content_hash));

    select share.*
    into existing_share
    from public.rotation_share_codes as share
    where share.share_type = normalized_type
        and share.payload_hash = content_hash
        and share.share_payload = normalized_payload
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
                created_by
            ) values (
                candidate_code,
                normalized_type,
                normalized_payload,
                normalized_operator_ids,
                p_format_version::smallint,
                content_hash,
                auth.uid()
            )
            returning * into inserted_share;

            return jsonb_build_object(
                'short_code', inserted_share.short_code,
                'share_type', inserted_share.share_type,
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

revoke all on function public.create_rotation_share(text, text, integer, integer[]) from public;
revoke all on function public.resolve_rotation_share(text) from public;
revoke all on function public.get_operator_share_summary(integer) from public;
revoke all on function public.list_operator_shares(integer, text, integer, integer) from public;
grant execute on function public.create_rotation_share(text, text, integer, integer[]) to anon, authenticated;
grant execute on function public.resolve_rotation_share(text) to anon, authenticated;
grant execute on function public.get_operator_share_summary(integer) to anon, authenticated;
grant execute on function public.list_operator_shares(integer, text, integer, integer) to anon, authenticated;

comment on table public.rotation_share_codes is
    'Opaque planner payloads addressed by unique six-character codes and separated by planner mode.';
comment on column public.rotation_share_codes.share_type is
    'rotation for Slot Mode; simulation for Simulation Mode.';
