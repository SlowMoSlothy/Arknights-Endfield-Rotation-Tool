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
    weapon_type text,
    icon_path text not null,
    can_enter_ultimate_state boolean not null default false,
    base_hp integer,
    base_atk integer,
    base_hp_level_1 integer,
    base_atk_level_1 integer,
    base_strength numeric,
    base_agility numeric,
    base_intellect numeric,
    base_will numeric,
    base_strength_level_1 numeric,
    base_agility_level_1 numeric,
    base_intellect_level_1 numeric,
    base_will_level_1 numeric,
    base_stats_level integer,
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
alter table public.operators add column if not exists base_hp integer;
alter table public.operators add column if not exists base_atk integer;
alter table public.operators add column if not exists base_hp_level_1 integer;
alter table public.operators add column if not exists base_atk_level_1 integer;
alter table public.operators add column if not exists base_strength numeric;
alter table public.operators add column if not exists base_agility numeric;
alter table public.operators add column if not exists base_intellect numeric;
alter table public.operators add column if not exists base_will numeric;
alter table public.operators add column if not exists base_strength_level_1 numeric;
alter table public.operators add column if not exists base_agility_level_1 numeric;
alter table public.operators add column if not exists base_intellect_level_1 numeric;
alter table public.operators add column if not exists base_will_level_1 numeric;
alter table public.operators add column if not exists base_stats_level integer;
alter table public.operators alter column base_strength type numeric using base_strength::numeric;
alter table public.operators alter column base_agility type numeric using base_agility::numeric;
alter table public.operators alter column base_intellect type numeric using base_intellect::numeric;
alter table public.operators alter column base_will type numeric using base_will::numeric;
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
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (operator_id, slot_index)
);

create table if not exists public.weapon_types (
    weapon_type text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.weapons (
    weapon_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    weapon_type text not null references public.weapon_types(weapon_type),
    rarity smallint check (rarity between 1 and 6),
    icon_path text,
    main_attribute text,
    secondary_attribute text,
    passive_name text,
    base_atk integer,
    base_atk_level_1 integer,
    base_stats_level integer,
    raw_data jsonb not null default '{}'::jsonb,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.weapon_essence_profiles (
    weapon_key text primary key references public.weapons(weapon_key) on delete cascade,
    primary_label text,
    primary_values numeric[],
    primary_is_percent boolean not null default false,
    secondary_label text,
    secondary_values numeric[],
    secondary_is_percent boolean not null default false,
    skill_name text,
    skill_descriptions jsonb not null default '[]'::jsonb,
    primary_base_ranks smallint[] not null default array[1, 2, 2, 3, 3]::smallint[],
    secondary_base_ranks smallint[] not null default array[1, 1, 2, 2, 3]::smallint[],
    primary_max_essence smallint not null default 6,
    secondary_max_essence smallint not null default 6,
    skill_max_essence smallint not null default 4,
    source_url text,
    source_note text,
    verified boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint weapon_essence_primary_values_length
        check (primary_values is null or cardinality(primary_values) = 9),
    constraint weapon_essence_secondary_values_length
        check (secondary_values is null or cardinality(secondary_values) = 9),
    constraint weapon_essence_skill_descriptions_length
        check (jsonb_array_length(skill_descriptions) in (0, 9)),
    constraint weapon_essence_limits_check
        check (
            primary_max_essence between 0 and 8
            and secondary_max_essence between 0 and 8
            and skill_max_essence between 0 and 8
        )
);

create table if not exists public.gear_pieces (
    gear_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    gear_slot text not null check (gear_slot in ('body', 'hands', 'kit', 'kit1', 'kit2')),
    set_name text,
    rarity smallint check (rarity between 1 and 6),
    icon_path text,
    main_attribute text,
    secondary_attribute text,
    passive_name text,
    raw_data jsonb not null default '{}'::jsonb,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.weapon_types add column if not exists game text not null default 'arknights_endfield';
alter table public.weapon_types add column if not exists name text;
alter table public.weapon_types add column if not exists sort_order integer not null default 0;
alter table public.weapon_types add column if not exists created_at timestamptz not null default now();
alter table public.weapon_types add column if not exists updated_at timestamptz not null default now();

alter table public.weapons add column if not exists game text not null default 'arknights_endfield';
alter table public.weapons add column if not exists name text;
alter table public.weapons add column if not exists weapon_type text;
alter table public.weapons add column if not exists rarity smallint;
alter table public.weapons add column if not exists icon_path text;
alter table public.weapons add column if not exists main_attribute text;
alter table public.weapons add column if not exists secondary_attribute text;
alter table public.weapons add column if not exists passive_name text;
alter table public.weapons add column if not exists base_atk integer;
alter table public.weapons add column if not exists base_atk_level_1 integer;
alter table public.weapons add column if not exists base_stats_level integer;
alter table public.weapons add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.weapons add column if not exists sort_order integer not null default 0;
alter table public.weapons add column if not exists created_at timestamptz not null default now();
alter table public.weapons add column if not exists updated_at timestamptz not null default now();

alter table public.weapon_essence_profiles add column if not exists primary_label text;
alter table public.weapon_essence_profiles add column if not exists primary_values numeric[];
alter table public.weapon_essence_profiles add column if not exists primary_is_percent boolean not null default false;
alter table public.weapon_essence_profiles add column if not exists secondary_label text;
alter table public.weapon_essence_profiles add column if not exists secondary_values numeric[];
alter table public.weapon_essence_profiles add column if not exists secondary_is_percent boolean not null default false;
alter table public.weapon_essence_profiles add column if not exists skill_name text;
alter table public.weapon_essence_profiles add column if not exists skill_descriptions jsonb not null default '[]'::jsonb;
alter table public.weapon_essence_profiles add column if not exists primary_base_ranks smallint[] not null default array[1, 2, 2, 3, 3]::smallint[];
alter table public.weapon_essence_profiles add column if not exists secondary_base_ranks smallint[] not null default array[1, 1, 2, 2, 3]::smallint[];
alter table public.weapon_essence_profiles add column if not exists primary_max_essence smallint not null default 6;
alter table public.weapon_essence_profiles add column if not exists secondary_max_essence smallint not null default 6;
alter table public.weapon_essence_profiles add column if not exists skill_max_essence smallint not null default 4;
alter table public.weapon_essence_profiles add column if not exists source_url text;
alter table public.weapon_essence_profiles add column if not exists source_note text;
alter table public.weapon_essence_profiles add column if not exists verified boolean not null default false;
alter table public.weapon_essence_profiles add column if not exists created_at timestamptz not null default now();
alter table public.weapon_essence_profiles add column if not exists updated_at timestamptz not null default now();

alter table public.gear_pieces add column if not exists game text not null default 'arknights_endfield';
alter table public.gear_pieces add column if not exists name text;
alter table public.gear_pieces add column if not exists gear_slot text;
alter table public.gear_pieces add column if not exists set_name text;
alter table public.gear_pieces add column if not exists rarity smallint;
alter table public.gear_pieces add column if not exists icon_path text;
alter table public.gear_pieces add column if not exists main_attribute text;
alter table public.gear_pieces add column if not exists secondary_attribute text;
alter table public.gear_pieces add column if not exists passive_name text;
alter table public.gear_pieces add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.gear_pieces add column if not exists sort_order integer not null default 0;
alter table public.gear_pieces add column if not exists created_at timestamptz not null default now();
alter table public.gear_pieces add column if not exists updated_at timestamptz not null default now();

alter table public.gear_pieces drop constraint if exists gear_pieces_gear_slot_check;
alter table public.gear_pieces
    add constraint gear_pieces_gear_slot_check
    check (gear_slot in ('body', 'hands', 'kit', 'kit1', 'kit2'));

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
alter table public.operator_skills add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.operator_skills add column if not exists created_at timestamptz not null default now();
alter table public.operator_skills add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_operators_game_sort
    on public.operators (game, sort_order, name);

create index if not exists idx_operators_class
    on public.operators (operator_class);

create index if not exists idx_operators_element
    on public.operators (element_type);

create index if not exists idx_operators_weapon_type
    on public.operators (weapon_type);

create index if not exists idx_operator_skills_operator_id
    on public.operator_skills (operator_id, slot_index);

create index if not exists idx_weapons_game_type
    on public.weapons (game, weapon_type, rarity desc, name);

create index if not exists idx_gear_pieces_game_slot
    on public.gear_pieces (game, gear_slot, rarity desc, name);

alter table public.operators enable row level security;
alter table public.operator_skills enable row level security;
alter table public.weapon_types enable row level security;
alter table public.weapons enable row level security;
alter table public.weapon_essence_profiles enable row level security;
alter table public.gear_pieces enable row level security;

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

drop policy if exists "Public read weapon types" on public.weapon_types;
create policy "Public read weapon types"
    on public.weapon_types
    for select
    using (true);

drop policy if exists "Public read weapons" on public.weapons;
create policy "Public read weapons"
    on public.weapons
    for select
    using (true);

drop policy if exists "Public read weapon essence profiles" on public.weapon_essence_profiles;
create policy "Public read weapon essence profiles"
    on public.weapon_essence_profiles
    for select
    using (true);

drop policy if exists "Public read gear pieces" on public.gear_pieces;
create policy "Public read gear pieces"
    on public.gear_pieces
    for select
    using (true);
