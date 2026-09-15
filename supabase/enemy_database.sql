-- Apply after admin_panel.sql. Anonymous visitors see published profiles only.
begin;
create table if not exists public.enemies (
    id uuid primary key default gen_random_uuid(),
    name text not null check (length(trim(name)) between 1 and 120),
    category text not null default 'normal' check (category in ('normal', 'elite', 'boss', 'test')),
    description text not null default '',
    location text not null default '',
    hp numeric check (hp >= 0 and hp < 'Infinity'::numeric),
    defense numeric check (defense >= 0 and defense < 'Infinity'::numeric),
    resistances jsonb not null default '{}' check (jsonb_typeof(resistances) = 'object'),
    skills jsonb not null default '[]' check (jsonb_typeof(skills) = 'array'),
    source_url text not null default '' check (source_url = '' or source_url ~ '^https?://'),
    is_visible boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.enemies enable row level security;
revoke all on public.enemies from anon, authenticated;
grant select on public.enemies to anon, authenticated;
grant insert, update on public.enemies to authenticated;
drop policy if exists "Published enemies are public" on public.enemies;
create policy "Published enemies are public" on public.enemies for select to anon, authenticated using (is_visible);
drop policy if exists "Admins read enemy drafts" on public.enemies;
create policy "Admins read enemy drafts" on public.enemies for select to authenticated using (public.is_app_admin());
drop policy if exists "Admins create enemies" on public.enemies;
create policy "Admins create enemies" on public.enemies for insert to authenticated with check (public.is_app_admin());
drop policy if exists "Admins edit enemies" on public.enemies;
create policy "Admins edit enemies" on public.enemies for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
create or replace function public.validate_enemy_profile() returns trigger
language plpgsql set search_path = public as $$
declare value jsonb; skill jsonb;
begin
    for value in select v from jsonb_each(new.resistances) as r(k,v) loop
        if value <> 'null'::jsonb then
            if jsonb_typeof(value) <> 'number' then raise exception 'Resistance multipliers must be numbers'; end if;
            if (value::text)::numeric < 0 then raise exception 'Resistance multipliers cannot be negative'; end if;
        end if;
    end loop;
    for skill in select * from jsonb_array_elements(new.skills) loop
        if jsonb_typeof(skill) <> 'object' or jsonb_typeof(skill->'name') is distinct from 'string'
            or length(trim(skill->>'name')) = 0 or jsonb_typeof(skill->'description') is distinct from 'string' then
            raise exception 'Abilities require a name and description';
        end if;
    end loop;
    new.updated_at = now();
    return new;
end; $$;
drop trigger if exists validate_enemy_profile on public.enemies;
create trigger validate_enemy_profile before insert or update on public.enemies for each row execute function public.validate_enemy_profile();
create index if not exists enemies_visible_name_idx on public.enemies (is_visible, name);
commit;
