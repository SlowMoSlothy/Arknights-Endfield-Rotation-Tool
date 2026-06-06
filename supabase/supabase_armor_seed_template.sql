-- Armor / equipment catalog seed for Arknights: Endfield.
-- Run supabase/schema.sql first.
--
-- Purpose:
-- 1) Creates reusable armor/equipment tables if they do not exist yet.
-- 2) Seeds armor slot types.
-- 3) Provides a copy/paste template for adding new armor pieces.
--
-- IMPORTANT:
-- Replace the example rows in public.armor_pieces with your real armor data.

begin;

-- Optional but recommended:
-- A small catalog table for armor slots.
create table if not exists public.armor_types (
    armor_type text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Main armor item table.
create table if not exists public.armor_pieces (
    armor_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    armor_type text not null references public.armor_types(armor_type) on update cascade,
    rarity smallint not null check (rarity between 1 and 6),
    main_attribute text,
    secondary_attribute text,
    set_key text,
    set_name text,
    icon_path text,
    description text,
    raw_data jsonb not null default '{}'::jsonb,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_armor_pieces_game_sort
    on public.armor_pieces (game, sort_order, name);

create index if not exists idx_armor_pieces_type
    on public.armor_pieces (armor_type);

create index if not exists idx_armor_pieces_set
    on public.armor_pieces (set_key);

alter table public.armor_types enable row level security;
alter table public.armor_pieces enable row level security;

drop policy if exists "Public read armor types" on public.armor_types;
create policy "Public read armor types"
    on public.armor_types
    for select
    using (true);

drop policy if exists "Public read armor pieces" on public.armor_pieces;
create policy "Public read armor pieces"
    on public.armor_pieces
    for select
    using (true);

-- Armor slot catalog.
-- Rename these if your UI uses different slot names.
insert into public.armor_types (armor_type, game, name, sort_order) values
    ('head', 'arknights_endfield', 'Head', 1),
    ('body', 'arknights_endfield', 'Body', 2),
    ('hands', 'arknights_endfield', 'Hands', 3),
    ('feet', 'arknights_endfield', 'Feet', 4),
    ('accessory', 'arknights_endfield', 'Accessory', 5)
on conflict (armor_type) do update set
    game = excluded.game,
    name = excluded.name,
    sort_order = excluded.sort_order,
    updated_at = now();

-- ============================================================
-- TEMPLATE: add new armor pieces here
-- ============================================================
--
-- Columns:
-- armor_key           unique internal id, lowercase + underscores
-- game                usually 'arknights_endfield'
-- name                display name
-- armor_type          must exist in public.armor_types
-- rarity              1-6
-- main_attribute      e.g. 'Attack', 'HP', 'Defense', 'Main Attribute'
-- secondary_attribute e.g. 'Crit Rate', 'Heat DMG', null
-- set_key             optional set id, lowercase + underscores
-- set_name            optional display set name
-- icon_path           optional asset path
-- description         optional item effect text
-- raw_data            optional full JSON data
-- sort_order          display order

insert into public.armor_pieces (
    armor_key,
    game,
    name,
    armor_type,
    rarity,
    main_attribute,
    secondary_attribute,
    set_key,
    set_name,
    icon_path,
    description,
    raw_data,
    sort_order
) values
    -- Example rows. Replace/delete these.
    ('example_head_01', 'arknights_endfield', 'Example Headpiece', 'head', 3, 'HP', null, null, null, 'assets/equipment/armor/example_head_01.png', null, '{}'::jsonb, 1),
    ('example_body_01', 'arknights_endfield', 'Example Armor', 'body', 4, 'Defense', 'HP', 'example_set', 'Example Set', 'assets/equipment/armor/example_body_01.png', 'Example armor effect text.', '{"effect":"Example armor effect text."}'::jsonb, 2),
    ('example_accessory_01', 'arknights_endfield', 'Example Charm', 'accessory', 5, 'Attack', 'Crit Rate', 'example_set', 'Example Set', 'assets/equipment/armor/example_accessory_01.png', null, '{}'::jsonb, 3)
on conflict (armor_key) do update set
    game = excluded.game,
    name = excluded.name,
    armor_type = excluded.armor_type,
    rarity = excluded.rarity,
    main_attribute = excluded.main_attribute,
    secondary_attribute = excluded.secondary_attribute,
    set_key = excluded.set_key,
    set_name = excluded.set_name,
    icon_path = excluded.icon_path,
    description = excluded.description,
    raw_data = excluded.raw_data,
    sort_order = excluded.sort_order,
    updated_at = now();

commit;
