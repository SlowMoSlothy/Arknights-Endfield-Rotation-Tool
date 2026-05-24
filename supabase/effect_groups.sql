-- Effect groups for Arknights Endfield.
-- Run this in the Supabase SQL Editor. The app falls back to js/data/effectGroups.js if this table is unavailable.

begin;

create table if not exists public.effect_groups (
    group_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    effects text[] not null default '{}',
    sort_order integer not null default 0,
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.effect_groups add column if not exists game text not null default 'arknights_endfield';
alter table public.effect_groups add column if not exists name text;
alter table public.effect_groups add column if not exists effects text[] not null default '{}';
alter table public.effect_groups add column if not exists sort_order integer not null default 0;
alter table public.effect_groups add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.effect_groups add column if not exists created_at timestamptz not null default now();
alter table public.effect_groups add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_effect_groups_game_sort
    on public.effect_groups (game, sort_order, group_key);

alter table public.effect_groups enable row level security;

drop policy if exists "Public read effect groups" on public.effect_groups;
create policy "Public read effect groups"
    on public.effect_groups
    for select
    using (true);

insert into public.effect_groups (
    group_key,
    game,
    name,
    effects,
    sort_order,
    raw_data
) values
    ('exclusive_inflictions', 'arknights_endfield', 'Exclusive Inflictions', array['electric_infliction', 'heat_infliction', 'cryo_infliction', 'nature_infliction', 'arts_infliction', 'electrification', 'hydro', 'hyperthermia', 'burning', 'frozen', 'chilled'], 10, '{"effects":["electric_infliction","heat_infliction","cryo_infliction","nature_infliction","arts_infliction","electrification","hydro","hyperthermia","burning","frozen","chilled"]}'::jsonb),
    ('physical_debuffs', 'arknights_endfield', 'Physical Debuffs', array['vulnerable', 'physical_susceptibility', 'lift', 'knock_down', 'crush', 'breach'], 20, '{"effects":["vulnerable","physical_susceptibility","lift","knock_down","crush","breach"]}'::jsonb),
    ('utility_debuffs', 'arknights_endfield', 'Utility Debuffs', array['defense_down', 'resistance_down', 'slow'], 30, '{"effects":["defense_down","resistance_down","slow"]}'::jsonb)
on conflict (group_key) do update set
    game = excluded.game,
    name = excluded.name,
    effects = excluded.effects,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data,
    updated_at = now();

commit;
