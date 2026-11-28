-- Run after issue_reports.sql, before deploying report rotation attachments.
-- Adds private snapshots only; does not replace status/Recent-fixes functions.
begin;

alter table public.issue_reports
    add column if not exists rotation_snapshot jsonb;

create or replace function public.is_valid_issue_report_rotation(value jsonb)
returns boolean
language plpgsql immutable
set search_path = public
as $$
begin
    if value is null then return true; end if;
    if jsonb_typeof(value) is distinct from 'object'
        or octet_length(value::text) > 131072
        or value->'version' is distinct from '1'::jsonb
        or jsonb_typeof(value->'share_code') is distinct from 'string'
        or char_length(value->>'share_code') not between 1 and 60000
        or value->>'share_code' !~ '^(AERT[0-9]+:)?[A-Za-z0-9_-]+$'
        or coalesce(value->>'mode', '') not in ('slot', 'simulation')
        or jsonb_typeof(value->'team') is distinct from 'array'
        or jsonb_typeof(value->'rotation') is distinct from 'array' then return false; end if;
    return jsonb_array_length(value->'team') <= 4
        and jsonb_array_length(value->'rotation') between 1 and 240;
end;
$$;

revoke all on function public.is_valid_issue_report_rotation(jsonb) from public;
grant execute on function public.is_valid_issue_report_rotation(jsonb) to anon, authenticated;

do $$
begin
    if not exists (select 1 from pg_constraint
        where conrelid = 'public.issue_reports'::regclass
          and conname = 'issue_reports_rotation_snapshot_valid') then
        alter table public.issue_reports add constraint issue_reports_rotation_snapshot_valid
            check (public.is_valid_issue_report_rotation(rotation_snapshot));
    end if;
end;
$$;

comment on column public.issue_reports.rotation_snapshot is
    'Private rotation and encoded build settings captured at report submission; NULL for older/empty reports.';

commit;
