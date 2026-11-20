-- Run after supabase/admin_panel.sql. No account IDs, URLs or rotation contents are stored.
begin;

create table if not exists public.planner_events (
    visit_id uuid not null,
    event_name text not null check (event_name in (
        'builder_opened', 'builder_ready', 'builder_failed', 'team_selected',
        'first_skill_placed', 'share_opened', 'share_published', 'share_failed', 'example_loaded'
    )),
    entry_kind text not null check (entry_kind in ('unknown', 'new', 'restored', 'shared')),
    mode text not null check (mode in ('slot', 'simulation')),
    created_at timestamptz not null default now(),
    primary key (visit_id, event_name)
);
create index if not exists planner_events_created_at_idx on public.planner_events (created_at);
alter table public.planner_events enable row level security;
revoke all on public.planner_events from anon, authenticated;

-- Per-page random visit IDs only. No administrator/account identity is stored.
create table if not exists public.planner_excluded_visits (
    visit_id uuid primary key,
    created_at timestamptz not null default now()
);
alter table public.planner_excluded_visits enable row level security;
revoke all on public.planner_excluded_visits from anon, authenticated;

create or replace function public.exclude_planner_visit(p_visit_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not coalesce(public.is_app_admin(), false) then
        raise exception 'Admin access required' using errcode = '42501';
    end if;
    if p_visit_id is null then
        raise exception 'Invalid visit' using errcode = '22023';
    end if;
    insert into public.planner_excluded_visits (visit_id) values (p_visit_id)
    on conflict (visit_id) do nothing;
end;
$$;
revoke all on function public.exclude_planner_visit(uuid) from public;
grant execute on function public.exclude_planner_visit(uuid) to authenticated;

create or replace function public.record_planner_events(p_visit_id uuid, p_events jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
    if coalesce(public.is_app_admin(), false) then return; end if;
    if p_visit_id is null or jsonb_typeof(p_events) is distinct from 'array' then
        raise exception 'Invalid usage batch' using errcode = '22023';
    end if;
    if jsonb_array_length(p_events) not between 1 and 9 or octet_length(p_events::text) > 4096 then
        raise exception 'Invalid usage batch size' using errcode = '22023';
    end if;
    if exists (select 1 from public.planner_excluded_visits where visit_id = p_visit_id) then return; end if;
    insert into public.planner_events (visit_id, event_name, entry_kind, mode)
    select p_visit_id, item->>'event_name', item->>'entry_kind', item->>'mode'
    from jsonb_array_elements(p_events) as item
    on conflict (visit_id, event_name) do nothing;
end;
$$;
revoke all on function public.record_planner_events(uuid, jsonb) from public;
grant execute on function public.record_planner_events(uuid, jsonb) to anon, authenticated;

create or replace function public.get_planner_funnel(p_days integer default 7, p_entry_kind text default 'all')
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
    if not coalesce(public.is_app_admin(), false) then
        raise exception 'Admin access required' using errcode = '42501';
    end if;
    if p_days is null or p_days not in (7, 30) or p_entry_kind is null
        or p_entry_kind not in ('all', 'new', 'restored', 'shared') then
        raise exception 'Invalid report filter' using errcode = '22023';
    end if;

    with visits as (
        select visit_id from public.planner_events as opened
        where event_name = 'builder_opened' and created_at >= now() - make_interval(days => p_days)
            and not exists (select 1 from public.planner_excluded_visits as excluded where excluded.visit_id = opened.visit_id)
    ), classified as (
        select visits.visit_id, coalesce(ready.entry_kind, 'unknown') as entry_kind
        from visits left join public.planner_events as ready
            on ready.visit_id = visits.visit_id and ready.event_name = 'builder_ready'
    ), selected as (
        select visit_id from classified where p_entry_kind = 'all' or entry_kind = p_entry_kind
    ), counts as (
        select event_name, count(*) as visits
        from public.planner_events join selected using (visit_id)
        group by event_name
    )
    select jsonb_build_object(
        'days', p_days, 'entry_kind', p_entry_kind,
        'counts', coalesce((select jsonb_object_agg(event_name, visits) from counts), '{}'::jsonb),
        'entries', coalesce((select jsonb_object_agg(entry_kind, total) from (
            select entry_kind, count(*) as total from classified group by entry_kind
        ) as breakdown), '{}'::jsonb)
    ) into result;
    return result;
end;
$$;
revoke all on function public.get_planner_funnel(integer, text) from public;
grant execute on function public.get_planner_funnel(integer, text) to authenticated;

commit;
