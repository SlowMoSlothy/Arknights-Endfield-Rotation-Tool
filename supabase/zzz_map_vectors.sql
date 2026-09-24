-- Run once after zzz_maps.sql. Existing maps and their access rules remain intact.
begin;
alter table public.zzz_maps add column if not exists vector_data jsonb not null
 default '{"version":1,"areas":[],"paths":[],"background":{"visible":true,"opacity":0.65}}'::jsonb;
alter table public.zzz_maps add column if not exists vector_revision integer not null default 0;
-- The existing owner/admin RLS protects edits; only published maps are readable by visitors.
commit;
