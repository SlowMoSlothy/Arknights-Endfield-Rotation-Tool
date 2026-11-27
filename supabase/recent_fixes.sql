-- Run after issue_reports.sql. Safe to run again; existing entries are retained.
-- Only admin-authored public copy is published. Report contents stay private.
begin;

create table if not exists public.recent_fixes (
    id uuid primary key default gen_random_uuid(),
    entry_key text not null unique,
    report_id uuid unique references public.issue_reports(id) on delete cascade,
    title text not null check (char_length(title) between 3 and 120),
    summary text not null check (char_length(summary) between 10 and 800),
    thank_you text not null default 'Thank you to the anonymous reporter for helping improve RotationForge!',
    fixed_at timestamptz not null default now()
);
alter table public.recent_fixes enable row level security;
revoke all on public.recent_fixes from public, anon, authenticated;

create or replace function public.resolve_issue_report_with_fix(
    target_report_id uuid,
    public_fix_title text default '',
    public_fix_summary text default ''
)
returns table (id uuid, status text, review_note text, reviewed_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
    report_row public.issue_reports%rowtype;
    fix_title text := trim(coalesce(public_fix_title, ''));
    fix_summary text := trim(coalesce(public_fix_summary, ''));
    resolution_time timestamptz;
begin
    if not public.is_app_admin() then
        raise exception 'Admin access required' using errcode = '42501';
    end if;
    select report.* into report_row from public.issue_reports as report
        where report.id = target_report_id and report.game = 'arknights_endfield' for update;
    if not found then
        raise exception 'Report not found' using errcode = 'P0002';
    end if;
    -- Repeated clicks/retries return the original result without republishing it.
    if report_row.status = 'resolved' and exists (
        select 1 from public.recent_fixes as fix where fix.report_id = target_report_id
    ) then
        return query select report.id, report.status, report.review_note, report.reviewed_at, report.updated_at
            from public.issue_reports as report where report.id = target_report_id;
        return;
    end if;
    if fix_title = '' then
        fix_title := case report_row.report_type
            when 'missing_data' then 'Missing data corrected'
            when 'incorrect_data' then 'Incorrect data corrected'
            when 'bug' then 'Planner issue fixed'
            else 'Reported issue resolved' end;
    end if;
    if fix_summary = '' then
        fix_summary := 'Fixed an issue reported by a community member.';
    end if;
    if char_length(fix_title) not between 3 and 120 or char_length(fix_summary) not between 10 and 800 then
        raise exception 'Public fix title must be 3–120 characters; summary must be 10–800 characters.' using errcode = '22023';
    end if;
    resolution_time := case when report_row.status = 'resolved' then coalesce(report_row.reviewed_at, now()) else now() end;
    update public.issue_reports as report set status = 'resolved', reviewed_by = auth.uid(),
        reviewed_at = resolution_time, updated_at = now() where report.id = target_report_id;
    insert into public.recent_fixes (entry_key, report_id, title, summary, fixed_at)
        values ('report-' || gen_random_uuid()::text, target_report_id, fix_title, fix_summary, resolution_time)
        on conflict (report_id) do update set title = excluded.title, summary = excluded.summary, fixed_at = excluded.fixed_at;
    return query select report.id, report.status, report.review_note, report.reviewed_at, report.updated_at
        from public.issue_reports as report where report.id = target_report_id;
end;
$$;

-- Preserve the existing RPC for old clients. Resolving through it publishes safe
-- generic copy too; internal review notes never become public fix descriptions.
create or replace function public.set_issue_report_status(
    target_report_id uuid, report_status text, admin_review_note text default ''
)
returns table (id uuid, status text, review_note text, reviewed_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare normalized_status text := lower(trim(coalesce(report_status, '')));
begin
    if not public.is_app_admin() then
        raise exception 'Admin access required' using errcode = '42501';
    end if;
    if normalized_status not in ('pending', 'resolved', 'dismissed') then
        raise exception 'Unsupported report status' using errcode = '22023';
    end if;
    if normalized_status = 'resolved' then
        return query select * from public.resolve_issue_report_with_fix(target_report_id);
        return;
    end if;
    return query update public.issue_reports as report set status = normalized_status,
        review_note = left(coalesce(admin_review_note, ''), 400),
        reviewed_by = case when normalized_status = 'pending' then null else auth.uid() end,
        reviewed_at = case when normalized_status = 'pending' then null else now() end, updated_at = now()
        where report.id = target_report_id and report.game = 'arknights_endfield'
        returning report.id, report.status, report.review_note, report.reviewed_at, report.updated_at;
end;
$$;

create or replace function public.list_recent_fixes(p_limit integer default 100)
returns table (entry_key text, title text, summary text, thank_you text, fixed_at timestamptz)
language sql stable security definer set search_path = public
as $$
    select fix.entry_key, fix.title, fix.summary, fix.thank_you, fix.fixed_at
    from public.recent_fixes as fix
    left join public.issue_reports as report on report.id = fix.report_id
    where fix.report_id is null or (report.status = 'resolved' and report.game = 'arknights_endfield')
    order by fix.fixed_at desc, fix.entry_key
    limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

revoke all on function public.resolve_issue_report_with_fix(uuid, text, text) from public, anon;
revoke all on function public.set_issue_report_status(uuid, text, text) from public, anon;
grant execute on function public.resolve_issue_report_with_fix(uuid, text, text) to authenticated;
grant execute on function public.set_issue_report_status(uuid, text, text) to authenticated;
revoke all on function public.list_recent_fixes(integer) from public;
grant execute on function public.list_recent_fixes(integer) to anon, authenticated;

-- Keep the published history, including Si's existing acknowledgement. Link the
-- Si entry only when the already-resolved report can be identified unambiguously.
with si_reports as (
    select report.id from public.issue_reports as report
    where report.game = 'arknights_endfield' and report.status = 'resolved'
        and report.team_operator_ids @> array[33]
        and report.description ilike '%brushwork realm%'
)
insert into public.recent_fixes (entry_key, report_id, title, summary, thank_you, fixed_at)
values ('si-brushwork-realm-infliction',
    (select id from si_reports where (select count(*) from si_reports) = 1),
    'Si · Brushwork Realm',
    'Fixed missing Infliction in Slot mode and combo detection. Brushwork Realm now applies Cryo Infliction, or Heat Infliction when a Heat operator occupies Team Position 01. Initial Stroke and Final Stroke do not add another stack.',
    'Thank you to the anonymous reporter who pointed out the missing Infliction on Si’s Battle Skill!',
    '2026-11-27T22:30:33+01:00') on conflict do nothing;

insert into public.recent_fixes (entry_key, title, summary, thank_you, fixed_at) values
    ('original-effect-icons', 'Buff and debuff icons',
     'Corrected mismatched icons, including Camille’s effect and Vulnerability, using the original game icons.', '', '2026-11-26T17:23:10+01:00'),
    ('effect-stack-contours', 'Infliction and Vulnerability stacks',
     'Added the missing quarter-ring contours so each additional stack adds a quarter of the outline.', '', '2026-11-26T17:03:44+01:00'),
    ('wrapped-debuff-layout', 'Multi-row debuffs',
     'Wrapped icons now extend downward beneath the portrait instead of overlapping the skill card.', '', '2026-11-26T17:31:58+01:00')
on conflict do nothing;

commit;
