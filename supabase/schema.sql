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
alter table public.weapons add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.weapons add column if not exists sort_order integer not null default 0;
alter table public.weapons add column if not exists created_at timestamptz not null default now();
alter table public.weapons add column if not exists updated_at timestamptz not null default now();

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

alter table public.operators enable row level security;
alter table public.operator_skills enable row level security;
alter table public.weapon_types enable row level security;
alter table public.weapons enable row level security;

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
