-- Allow the existing admin account to remove unused enemy avatar uploads.
-- Does not delete any files when executed.
begin;
create or replace function public.enemy_avatar_is_unused(object_name text)
returns boolean language sql stable security definer set search_path = public
as $$
    select public.is_app_admin()
        and object_name ~ '^[0-9a-f-]{36}/[0-9a-f]{64}\.png$'
        and not exists (
            select 1 from public.enemies
            where avatar_url = 'https://ftssllxdkqvmlxhfeqmy.supabase.co/storage/v1/object/public/enemy-avatars/' || object_name
        );
$$;
revoke all on function public.enemy_avatar_is_unused(text) from public;
grant execute on function public.enemy_avatar_is_unused(text) to authenticated;
drop policy if exists "Admins delete unused enemy avatars" on storage.objects;
create policy "Admins delete unused enemy avatars" on storage.objects
    for delete to authenticated
    using (bucket_id = 'enemy-avatars' and public.enemy_avatar_is_unused(name));
notify pgrst, 'reload schema';
commit;
