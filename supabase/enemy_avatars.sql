-- Run once after enemy_database.sql. Existing enemy profiles stay unchanged.
begin;
alter table public.enemies add column if not exists avatar_url text not null default ''
    check (avatar_url = '' or avatar_url ~ '^https://ftssllxdkqvmlxhfeqmy\.supabase\.co/storage/v1/object/public/enemy-avatars/[0-9a-f-]{36}/[0-9a-f]{64}\.png$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('enemy-avatars', 'enemy-avatars', true, 2097152, array['image/png'])
on conflict (id) do nothing;

drop policy if exists "Admins read enemy avatars" on storage.objects;
create policy "Admins read enemy avatars" on storage.objects for select to authenticated
    using (bucket_id = 'enemy-avatars' and public.is_app_admin());
drop policy if exists "Admins upload enemy avatars" on storage.objects;
create policy "Admins upload enemy avatars" on storage.objects for insert to authenticated
    with check (bucket_id = 'enemy-avatars' and public.is_app_admin()
        and name ~ '^[0-9a-f-]{36}/[0-9a-f]{64}\.png$');
-- Immutable, content-addressed files avoid overwriting images referenced by old pages.
-- Public bucket reads serve avatars to visitors; uploads require the existing admin role.
notify pgrst, 'reload schema';
commit;
