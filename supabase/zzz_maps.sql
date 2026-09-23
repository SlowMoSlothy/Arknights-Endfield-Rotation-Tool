-- Run after admin_panel.sql. All maps start private, accessible only to their admin owner.
begin;
create table if not exists public.zzz_maps (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 title text not null check (length(title) between 1 and 120),
 attribution text not null default '@KELZERO · Vorlage: Suburbs Illusion',
 image_path text not null,
 is_public boolean not null default false,
 created_at timestamptz not null default now(),
 check (split_part(image_path, '/', 1) = id::text)
);
create table if not exists public.zzz_map_points (
 id uuid primary key default gen_random_uuid(),
 map_id uuid not null references public.zzz_maps(id) on delete cascade,
 title text not null check (length(title) between 1 and 120),
 category text not null check (category in ('chest','gear','medical','portal','quest','note')),
 x double precision not null check (x >= 0 and x <= 1),
 y double precision not null check (y >= 0 and y <= 1),
 notes text not null default '' check (length(notes) <= 5000),
 completed boolean not null default false,
 screenshots text[] not null default '{}',
 created_at timestamptz not null default now()
);
create index if not exists zzz_map_points_map_idx on public.zzz_map_points(map_id);
alter table public.zzz_maps enable row level security;
alter table public.zzz_map_points enable row level security;
grant select on public.zzz_maps, public.zzz_map_points to anon, authenticated;
grant insert, update, delete on public.zzz_maps, public.zzz_map_points to authenticated;
drop policy if exists "Published maps" on public.zzz_maps;
create policy "Published maps" on public.zzz_maps for select using (is_public);
drop policy if exists "Own admin maps" on public.zzz_maps;
create policy "Own admin maps" on public.zzz_maps for all to authenticated
 using (owner_id = auth.uid() and public.is_app_admin())
 with check (owner_id = auth.uid() and public.is_app_admin());
drop policy if exists "Visible points" on public.zzz_map_points;
create policy "Visible points" on public.zzz_map_points for select
 using (exists (select 1 from public.zzz_maps m where m.id = map_id));
drop policy if exists "Manage own points" on public.zzz_map_points;
create policy "Manage own points" on public.zzz_map_points for all to authenticated
 using (exists (select 1 from public.zzz_maps m where m.id = map_id and m.owner_id = auth.uid() and public.is_app_admin()))
 with check (exists (select 1 from public.zzz_maps m where m.id = map_id and m.owner_id = auth.uid() and public.is_app_admin()));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
 values ('zzz-maps', 'zzz-maps', false, 10485760, array['image/png','image/jpeg','image/webp'])
 on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Read visible map files" on storage.objects;
create policy "Read visible map files" on storage.objects for select
 using (bucket_id = 'zzz-maps' and exists (
 select 1 from public.zzz_maps m where m.id::text = split_part(name, '/', 1)
 and (m.owner_id = auth.uid() or m.image_path = name or exists (
 select 1 from public.zzz_map_points p where p.map_id = m.id and name = any(p.screenshots)))));
drop policy if exists "Upload own map files" on storage.objects;
create policy "Upload own map files" on storage.objects for insert to authenticated
 with check (bucket_id = 'zzz-maps' and public.is_app_admin() and exists (
 select 1 from public.zzz_maps m where m.id::text = split_part(name, '/', 1) and m.owner_id = auth.uid()));
drop policy if exists "Delete own map files" on storage.objects;
create policy "Delete own map files" on storage.objects for delete to authenticated
 using (bucket_id = 'zzz-maps' and public.is_app_admin() and exists (
 select 1 from public.zzz_maps m where m.id::text = split_part(name, '/', 1) and m.owner_id = auth.uid()));
commit;
