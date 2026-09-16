-- Global Enemy Database status. Re-running preserves your saved choice.
begin;
create table if not exists public.database_settings (
    id text primary key check (id = 'enemy_database'),
    work_in_progress boolean not null default true,
    updated_at timestamptz not null default now()
);
insert into public.database_settings (id) values ('enemy_database') on conflict (id) do nothing;
alter table public.database_settings enable row level security;
revoke all on public.database_settings from anon, authenticated;
grant select on public.database_settings to anon, authenticated;
grant update (work_in_progress) on public.database_settings to authenticated;
drop policy if exists "Database status is public" on public.database_settings;
create policy "Database status is public" on public.database_settings for select to anon, authenticated using (true);
drop policy if exists "Admins edit database status" on public.database_settings;
create policy "Admins edit database status" on public.database_settings for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create or replace function public.touch_database_settings() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = clock_timestamp(); return new; end; $$;
drop trigger if exists touch_database_settings on public.database_settings;
create trigger touch_database_settings before update on public.database_settings for each row execute function public.touch_database_settings();
commit;
