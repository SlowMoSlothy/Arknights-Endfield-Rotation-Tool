-- Anonymous in-app issue reports for RotationForge.
-- Run this after supabase/admin_panel.sql so public.is_app_admin() is available.

create extension if not exists pgcrypto;

create table if not exists public.issue_reports (
    id uuid primary key default gen_random_uuid(),
    game text not null default 'arknights_endfield',
    report_type text not null,
    description text not null,
    additional_information text not null default '',
    page_url text not null default '',
    team_operator_ids integer[] not null default '{}'::integer[],
    team_operator_names text[] not null default '{}'::text[],
    status text not null default 'pending',
    review_note text not null default '',
    reviewed_by uuid references auth.users(id) on delete set null,
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (report_type in ('missing_data', 'incorrect_data', 'bug', 'other')),
    check (char_length(description) between 20 and 2000),
    check (char_length(additional_information) <= 1500),
    check (char_length(page_url) <= 1000),
    check (coalesce(array_length(team_operator_ids, 1), 0) <= 4),
    check (coalesce(array_length(team_operator_names, 1), 0) <= 4),
    check (status in ('pending', 'resolved', 'dismissed'))
);

create index if not exists idx_issue_reports_review_queue
    on public.issue_reports (game, status, created_at desc);

alter table public.issue_reports enable row level security;

grant insert on public.issue_reports to anon, authenticated;
grant select on public.issue_reports to authenticated;

drop policy if exists "Public can submit anonymous issue reports" on public.issue_reports;
create policy "Public can submit anonymous issue reports"
    on public.issue_reports
    for insert
    to anon, authenticated
    with check (
        game = 'arknights_endfield'
        and status = 'pending'
        and review_note = ''
        and reviewed_by is null
        and reviewed_at is null
        and char_length(description) between 20 and 2000
        and char_length(additional_information) <= 1500
        and char_length(page_url) <= 1000
        and coalesce(array_length(team_operator_ids, 1), 0) <= 4
        and coalesce(array_length(team_operator_names, 1), 0) <= 4
    );

drop policy if exists "Admins can read issue reports" on public.issue_reports;
create policy "Admins can read issue reports"
    on public.issue_reports
    for select
    to authenticated
    using (public.is_app_admin());

revoke update, delete on public.issue_reports from anon, authenticated;

create or replace function public.set_issue_report_status(
    target_report_id uuid,
    report_status text,
    admin_review_note text default ''
)
returns table (
    id uuid,
    status text,
    review_note text,
    reviewed_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
    normalized_status text := lower(trim(coalesce(report_status, '')));
begin
    if not public.is_app_admin() then
        raise exception 'Admin access required' using errcode = '42501';
    end if;

    if normalized_status not in ('pending', 'resolved', 'dismissed') then
        raise exception 'Unsupported report status: %', report_status using errcode = '22023';
    end if;

    return query
    update public.issue_reports as report
    set
        status = normalized_status,
        review_note = left(coalesce(admin_review_note, ''), 400),
        reviewed_by = case when normalized_status = 'pending' then null else auth.uid() end,
        reviewed_at = case when normalized_status = 'pending' then null else now() end,
        updated_at = now()
    where report.id = target_report_id
        and report.game = 'arknights_endfield'
    returning report.id, report.status, report.review_note, report.reviewed_at, report.updated_at;
end;
$$;

revoke all on function public.set_issue_report_status(uuid, text, text) from public;
grant execute on function public.set_issue_report_status(uuid, text, text) to authenticated;
