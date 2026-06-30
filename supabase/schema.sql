-- Arknights Endfield Rotation Builder database schema for Supabase.
-- Run this in the Supabase SQL Editor first, then run seed_operators.sql.

create table if not exists public.operators (
    id integer primary key,
    game text not null default 'arknights_endfield',
    slug text not null unique,
    name text not null,
    star smallint not null check (star between 1 and 6),
    operator_class text not null,
    element_type text not null,
    weapon_type text not null,
    icon_path text not null,
    can_enter_ultimate_state boolean not null default false,
    sort_order integer not null default 0,
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- If the table already existed from an earlier test, create table if not exists
-- does not add new columns. Keep the schema rerunnable during development.
alter table public.operators add column if not exists game text not null default 'arknights_endfield';
alter table public.operators add column if not exists slug text;
alter table public.operators add column if not exists name text;
alter table public.operators add column if not exists star smallint;
alter table public.operators add column if not exists operator_class text;
alter table public.operators add column if not exists element_type text;
alter table public.operators add column if not exists weapon_type text;
alter table public.operators add column if not exists icon_path text;
alter table public.operators add column if not exists can_enter_ultimate_state boolean not null default false;
alter table public.operators add column if not exists sort_order integer not null default 0;
alter table public.operators add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.operators add column if not exists created_at timestamptz not null default now();
alter table public.operators add column if not exists updated_at timestamptz not null default now();

create table if not exists public.operator_skills (
    id integer primary key,
    operator_id integer not null references public.operators(id) on delete cascade,
    slot_index smallint not null,
    name text not null,
    skill_type text not null,
    short_type text,
    cooldown integer,
    energy integer,
    element_type text,
    icon_path text,
    icon_small_path text,
    description text,
    combo_trigger text,
    combo_trigger_mode text,
    atk_multiplier numeric,
    flat_damage numeric not null default 0,
    hit_count smallint not null default 1,
    damage_element text,
    damage_verified boolean not null default false,
    damage_source_url text,
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (operator_id, slot_index)
);

alter table public.operator_skills add column if not exists operator_id integer;
alter table public.operator_skills add column if not exists slot_index smallint;
alter table public.operator_skills add column if not exists name text;
alter table public.operator_skills add column if not exists skill_type text;
alter table public.operator_skills add column if not exists short_type text;
alter table public.operator_skills add column if not exists cooldown integer;
alter table public.operator_skills add column if not exists energy integer;
alter table public.operator_skills add column if not exists element_type text;
alter table public.operator_skills add column if not exists icon_path text;
alter table public.operator_skills add column if not exists icon_small_path text;
alter table public.operator_skills add column if not exists description text;
alter table public.operator_skills add column if not exists combo_trigger text;
alter table public.operator_skills add column if not exists combo_trigger_mode text;
alter table public.operator_skills add column if not exists atk_multiplier numeric;
alter table public.operator_skills add column if not exists flat_damage numeric not null default 0;
alter table public.operator_skills add column if not exists hit_count smallint not null default 1;
alter table public.operator_skills add column if not exists damage_element text;
alter table public.operator_skills add column if not exists damage_verified boolean not null default false;
alter table public.operator_skills add column if not exists damage_source_url text;
alter table public.operator_skills add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.operator_skills add column if not exists created_at timestamptz not null default now();
alter table public.operator_skills add column if not exists updated_at timestamptz not null default now();

create table if not exists public.weapons (
    weapon_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    weapon_type text not null,
    rarity smallint not null check (rarity between 1 and 6),
    main_attribute text,
    secondary_attribute text,
    passive_name text,
    icon_path text,
    base_atk integer,
    base_stats_level smallint,
    sort_order integer not null default 0,
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.weapons add column if not exists game text not null default 'arknights_endfield';
alter table public.weapons add column if not exists name text;
alter table public.weapons add column if not exists weapon_type text;
alter table public.weapons add column if not exists rarity smallint;
alter table public.weapons add column if not exists main_attribute text;
alter table public.weapons add column if not exists secondary_attribute text;
alter table public.weapons add column if not exists passive_name text;
alter table public.weapons add column if not exists icon_path text;
alter table public.weapons add column if not exists base_atk integer;
alter table public.weapons add column if not exists base_stats_level smallint;
alter table public.weapons add column if not exists sort_order integer not null default 0;
alter table public.weapons add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.weapons add column if not exists created_at timestamptz not null default now();
alter table public.weapons add column if not exists updated_at timestamptz not null default now();

create table if not exists public.weapon_essence_profiles (
    weapon_key text primary key references public.weapons (weapon_key) on delete cascade,
    primary_label text not null,
    primary_values numeric[] not null default '{}',
    primary_is_percent boolean not null default false,
    secondary_label text,
    secondary_values numeric[],
    secondary_is_percent boolean not null default false,
    skill_name text not null,
    skill_descriptions text[] not null default '{}',
    primary_base_ranks smallint[] not null default '{1,1,1,1,1}',
    secondary_base_ranks smallint[] not null default '{0,0,0,0,0}',
    primary_max_essence smallint not null default 0,
    secondary_max_essence smallint not null default 0,
    skill_max_essence smallint not null default 1,
    source_url text,
    source_note text,
    verified boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.enemy_combat_profiles (
    profile_key text primary key,
    game text not null default 'arknights_endfield',
    enemy_key text not null,
    name text not null,
    difficulty_label text not null default 'Standard',
    enemy_rank text not null default 'normal',
    enemy_type text not null default 'neutral',
    defense numeric not null default 100,
    resistance_multipliers jsonb not null default '{"physical":1,"heat":1,"cryo":1,"electric":1,"nature":1,"neutral":1}'::jsonb,
    icon_path text,
    description text,
    verified boolean not null default false,
    source_url text,
    source_note text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.enemy_combat_profiles add column if not exists game text not null default 'arknights_endfield';
alter table public.enemy_combat_profiles add column if not exists enemy_key text;
alter table public.enemy_combat_profiles add column if not exists name text;
alter table public.enemy_combat_profiles add column if not exists difficulty_label text not null default 'Standard';
alter table public.enemy_combat_profiles add column if not exists enemy_rank text not null default 'normal';
alter table public.enemy_combat_profiles add column if not exists enemy_type text not null default 'neutral';
alter table public.enemy_combat_profiles add column if not exists defense numeric not null default 100;
alter table public.enemy_combat_profiles add column if not exists resistance_multipliers jsonb not null default '{}'::jsonb;
alter table public.enemy_combat_profiles add column if not exists icon_path text;
alter table public.enemy_combat_profiles add column if not exists description text;
alter table public.enemy_combat_profiles add column if not exists verified boolean not null default false;
alter table public.enemy_combat_profiles add column if not exists source_url text;
alter table public.enemy_combat_profiles add column if not exists source_note text;
alter table public.enemy_combat_profiles add column if not exists sort_order integer not null default 0;
alter table public.enemy_combat_profiles add column if not exists created_at timestamptz not null default now();
alter table public.enemy_combat_profiles add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_operators_game_sort
    on public.operators (game, sort_order, name);

create index if not exists idx_operators_class
    on public.operators (operator_class);

create index if not exists idx_operators_element
    on public.operators (element_type);

create index if not exists idx_operator_skills_operator_id
    on public.operator_skills (operator_id, slot_index);

create index if not exists idx_weapons_game_type_sort
    on public.weapons (game, weapon_type, sort_order, name);

create index if not exists idx_enemy_combat_profiles_game_sort
    on public.enemy_combat_profiles (game, sort_order, name);

alter table public.operators enable row level security;
alter table public.operator_skills enable row level security;
alter table public.weapons enable row level security;
alter table public.weapon_essence_profiles enable row level security;
alter table public.enemy_combat_profiles enable row level security;

drop policy if exists "Public read operators" on public.operators;
create policy "Public read operators"
    on public.operators
    for select
    using (true);

drop policy if exists "Public read operator skills" on public.operator_skills;
create policy "Public read operator skills"
    on public.operator_skills
    for select
    using (true);

drop policy if exists "Public read weapon Essence profiles" on public.weapon_essence_profiles;
create policy "Public read weapon Essence profiles"
    on public.weapon_essence_profiles
    for select
    using (true);
drop policy if exists "Public read weapons" on public.weapons;
create policy "Public read weapons"
    on public.weapons
    for select
    using (true);

drop policy if exists "Public read enemy combat profiles" on public.enemy_combat_profiles;
create policy "Public read enemy combat profiles"
    on public.enemy_combat_profiles
    for select
    using (true);
