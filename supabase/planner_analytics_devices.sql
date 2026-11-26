-- Run after planner_analytics.sql and before deploying the device-aware frontend.
-- The first device upgrade resets the reporting window once without deleting events.
-- Re-running keeps the reset boundary, publication details and new visits intact.
begin;

-- First upgrade starts a fresh report window. Re-running keeps its start date.
alter table public.planner_events add column if not exists device_type text not null default 'unknown'
    check (device_type in ('mobile', 'tablet', 'desktop', 'unknown'));
create table if not exists public.planner_analytics_state (
    singleton boolean primary key default true check (singleton),
    reset_at timestamptz not null default clock_timestamp()
);
insert into public.planner_analytics_state (singleton) values (true) on conflict (singleton) do nothing;
-- Additive publication-flow upgrade. Existing events and the reset boundary stay intact.
alter table public.planner_events drop constraint if exists planner_events_event_name_check;
alter table public.planner_events add constraint planner_events_event_name_check check (event_name in (
    'builder_opened', 'builder_ready', 'builder_failed', 'team_selected', 'first_skill_placed',
    'share_opened', 'share_submitted', 'share_cancelled', 'share_invalid', 'share_published', 'share_failed', 'example_loaded'
));
alter table public.planner_events add column if not exists failure_kind text
    check (failure_kind in ('network', 'validation', 'database', 'unavailable', 'unknown'));
alter table public.planner_analytics_state add column if not exists publishing_started_at timestamptz not null default clock_timestamp();

alter table public.planner_analytics_state enable row level security;
revoke all on public.planner_analytics_state from public, anon, authenticated;


create or replace function public.record_planner_events(p_visit_id uuid, p_events jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
    if coalesce(public.is_app_admin(), false) then return; end if;
    if p_visit_id is null or jsonb_typeof(p_events) is distinct from 'array' then
        raise exception 'Invalid usage batch' using errcode = '22023';
    end if;
    if jsonb_array_length(p_events) not between 1 and 12 or octet_length(p_events::text) > 4096 then
        raise exception 'Invalid usage batch size' using errcode = '22023';
    end if;
    if exists (select 1 from public.planner_excluded_visits where visit_id = p_visit_id) then return; end if;
    insert into public.planner_events (visit_id, event_name, entry_kind, mode, device_type, failure_kind)
    select p_visit_id, item->>'event_name', item->>'entry_kind', item->>'mode', coalesce(item->>'device_type', 'unknown'),
        case when item->>'event_name' = 'share_failed' then coalesce(item->>'failure_kind', 'unknown') else null end
    from jsonb_array_elements(p_events) as item
    on conflict (visit_id, event_name) do nothing;
end;
$$;
revoke all on function public.record_planner_events(uuid, jsonb) from public;
grant execute on function public.record_planner_events(uuid, jsonb) to anon, authenticated;

-- Three explicit arguments avoid ambiguous PostgREST overloads for older clients.
create or replace function public.get_planner_funnel(p_days integer, p_entry_kind text, p_device_type text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result jsonb; report_start timestamptz; publish_start timestamptz;
begin
    if not coalesce(public.is_app_admin(), false) then
        raise exception 'Admin access required' using errcode = '42501';
    end if;
    if p_days is null or p_days not in (7, 30) or p_entry_kind is null
        or p_entry_kind not in ('all', 'new', 'restored', 'shared') or p_device_type is null
        or p_device_type not in ('all', 'mobile', 'tablet', 'desktop', 'unknown') then
        raise exception 'Invalid report filter' using errcode = '22023';
    end if;
    select reset_at, publishing_started_at into report_start, publish_start from public.planner_analytics_state where singleton;
    report_start := coalesce(report_start, now());

    with visits as (
        select opened.visit_id, opened.device_type from public.planner_events as opened
        where opened.event_name = 'builder_opened'
            and opened.created_at >= greatest(report_start, now() - make_interval(days => p_days))
            and not exists (select 1 from public.planner_excluded_visits as excluded where excluded.visit_id = opened.visit_id)
    ), classified as (
        select visits.visit_id, visits.device_type, coalesce(ready.entry_kind, 'unknown') as entry_kind
        from visits left join public.planner_events as ready
            on ready.visit_id = visits.visit_id and ready.event_name = 'builder_ready'
    ), cohort as (
        select * from classified where p_entry_kind = 'all' or entry_kind = p_entry_kind
    ), selected as (
        select visit_id from cohort where p_device_type = 'all' or device_type = p_device_type
    ), counts as (
        select event_name, count(*) as visits
        from public.planner_events join selected using (visit_id)
        group by event_name
    )
    select jsonb_build_object(
        'days', p_days, 'entry_kind', p_entry_kind, 'device_type', p_device_type, 'reset_at', report_start, 'publishing_started_at', publish_start,
        'counts', coalesce((select jsonb_object_agg(event_name, visits) from counts), '{}'::jsonb),
        'failure_counts', coalesce((select jsonb_object_agg(kind, visits) from (
            select coalesce(event.failure_kind, 'unknown') as kind, count(*) as visits
            from public.planner_events event join selected using (visit_id)
            where event.event_name = 'share_failed' group by coalesce(event.failure_kind, 'unknown')
        ) as failures), '{}'::jsonb),
        'devices', coalesce((select jsonb_object_agg(device_type, total) from (
            select device_type, count(*) as total from cohort group by device_type
        ) as breakdown), '{}'::jsonb),
        'entries', coalesce((select jsonb_object_agg(entry_kind, total) from (
            select entry_kind, count(*) as total from classified
            where p_device_type = 'all' or device_type = p_device_type group by entry_kind
        ) as breakdown), '{}'::jsonb)
    ) into result;
    return result;
end;
$$;
revoke all on function public.get_planner_funnel(integer, text, text) from public, anon;
grant execute on function public.get_planner_funnel(integer, text, text) to authenticated;

-- Older deployed reports continue to read all devices, respecting the same reset.
create or replace function public.get_planner_funnel(p_days integer default 7, p_entry_kind text default 'all')
returns jsonb language sql security definer set search_path = public, pg_temp as $$
    select public.get_planner_funnel(p_days, p_entry_kind, 'all');
$$;
revoke all on function public.get_planner_funnel(integer, text) from public, anon;
grant execute on function public.get_planner_funnel(integer, text) to authenticated;

commit;
