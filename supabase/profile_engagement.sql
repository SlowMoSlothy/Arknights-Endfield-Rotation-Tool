-- Unique page views and one reversible reaction per browser for public
-- operator and enemy profile pages.
-- Run after schema.sql and enemy_database.sql.

begin;

create table if not exists public.profile_engagement (
    content_type text not null check (content_type in ('operator', 'enemy')),
    content_id text not null check (length(content_id) between 1 and 80),
    visitor_id uuid not null,
    viewed_at timestamptz,
    reaction text check (reaction in ('like', 'dislike')),
    reacted_at timestamptz,
    primary key (content_type, content_id, visitor_id),
    check (reaction is not null or reacted_at is null)
);

create index if not exists profile_engagement_summary_idx
    on public.profile_engagement (content_type, content_id, reaction);

alter table public.profile_engagement enable row level security;
revoke all on public.profile_engagement from public, anon, authenticated;

-- Raw anonymous visitor IDs are intentionally never exposed to the browser.
-- Only the security-definer RPCs below can read or modify this table.
create or replace function public.profile_engagement_target_exists(
    p_content_type text,
    p_content_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select case
        when p_content_type = 'operator' then exists (
            select 1
            from public.operators
            where id::text = p_content_id
                and game = 'arknights_endfield'
                and is_visible is not false
        )
        when p_content_type = 'enemy' then exists (
            select 1
            from public.enemies
            where id::text = p_content_id
                and is_visible = true
        )
        else false
    end;
$$;

revoke all on function public.profile_engagement_target_exists(text, text) from public, anon, authenticated;

create or replace function public.get_profile_engagement(
    p_content_type text,
    p_content_id text,
    p_visitor_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    result jsonb;
begin
    if p_visitor_id is null
        or p_content_type not in ('operator', 'enemy')
        or length(p_content_id) not between 1 and 80
        or not public.profile_engagement_target_exists(p_content_type, p_content_id)
    then
        raise exception 'Unknown public profile' using errcode = 'P0002';
    end if;

    select jsonb_build_object(
        'view_count', count(*) filter (where viewed_at is not null),
        'like_count', count(*) filter (where reaction = 'like'),
        'dislike_count', count(*) filter (where reaction = 'dislike'),
        'reaction', max(reaction) filter (where visitor_id = p_visitor_id)
    )
    into result
    from public.profile_engagement
    where content_type = p_content_type
        and content_id = p_content_id;

    return result;
end;
$$;

revoke all on function public.get_profile_engagement(text, text, uuid) from public;
grant execute on function public.get_profile_engagement(text, text, uuid) to anon, authenticated;

create or replace function public.record_profile_view(
    p_content_type text,
    p_content_id text,
    p_visitor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_visitor_id is null
        or p_content_type not in ('operator', 'enemy')
        or length(p_content_id) not between 1 and 80
        or not public.profile_engagement_target_exists(p_content_type, p_content_id)
    then
        raise exception 'Unknown public profile' using errcode = 'P0002';
    end if;

    insert into public.profile_engagement (
        content_type,
        content_id,
        visitor_id,
        viewed_at
    )
    values (
        p_content_type,
        p_content_id,
        p_visitor_id,
        now()
    )
    on conflict (content_type, content_id, visitor_id)
    do update set viewed_at = coalesce(public.profile_engagement.viewed_at, excluded.viewed_at);

    return public.get_profile_engagement(p_content_type, p_content_id, p_visitor_id);
end;
$$;

revoke all on function public.record_profile_view(text, text, uuid) from public;
grant execute on function public.record_profile_view(text, text, uuid) to anon, authenticated;

create or replace function public.set_profile_reaction(
    p_content_type text,
    p_content_id text,
    p_visitor_id uuid,
    p_reaction text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_visitor_id is null
        or p_content_type not in ('operator', 'enemy')
        or length(p_content_id) not between 1 and 80
        or (p_reaction is not null and p_reaction not in ('like', 'dislike'))
        or not public.profile_engagement_target_exists(p_content_type, p_content_id)
    then
        raise exception 'Invalid profile reaction' using errcode = '22023';
    end if;

    insert into public.profile_engagement (
        content_type,
        content_id,
        visitor_id,
        reaction,
        reacted_at
    )
    values (
        p_content_type,
        p_content_id,
        p_visitor_id,
        p_reaction,
        case when p_reaction is null then null else now() end
    )
    on conflict (content_type, content_id, visitor_id)
    do update set
        reaction = excluded.reaction,
        reacted_at = excluded.reacted_at;

    return public.get_profile_engagement(p_content_type, p_content_id, p_visitor_id);
end;
$$;

revoke all on function public.set_profile_reaction(text, text, uuid, text) from public;
grant execute on function public.set_profile_reaction(text, text, uuid, text) to anon, authenticated;

commit;
