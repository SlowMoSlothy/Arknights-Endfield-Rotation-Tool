-- Run after zzz_maps.sql and zzz_map_vectors.sql. Existing RLS stays in effect.
begin;
alter table public.zzz_map_points add column if not exists area_id text;
alter table public.zzz_map_points add column if not exists floor_id text;
commit;
