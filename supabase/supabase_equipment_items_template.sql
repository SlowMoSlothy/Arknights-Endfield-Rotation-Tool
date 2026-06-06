-- Supabase SQL Template: Waffen und Rüstungen hinzufügen
-- Projekt: Arknights Endfield Rotation Builder
-- Zweck:
--   1) Legt eine generische Item-Tabelle für Waffen/Rüstungen an, falls sie noch nicht existiert.
--   2) Fügt neue Items per UPSERT hinzu.
--   3) Aktiviert öffentliche Leserechte wie bei operators/operator_skills.
--
-- Nutzung:
--   - In Supabase öffnen: SQL Editor -> New query
--   - Dieses Script ausführen.
--   - Beispiel-Items unten durch echte Daten ersetzen.
--
-- Hinweis:
--   Dieses Template ist bewusst eigenständig, weil im aktuellen Schema bisher
--   operators und operator_skills existieren, aber noch keine Item-/Equipment-Tabelle.

begin;

-- =========================================================
-- 1) Tabelle für Waffen / Rüstungen
-- =========================================================

create table if not exists public.equipment_items (
    id integer primary key,
    game text not null default 'arknights_endfield',

    -- Stabile technische ID für Code/URLs/Assets.
    -- Beispiele: 'training_sword', 'steel_chestplate'
    slug text not null unique,

    -- Anzeige-Name
    name text not null,

    -- 'weapon' oder 'armor'
    item_type text not null check (item_type in ('weapon', 'armor')),

    -- Für genauere Sortierung/Filter:
    -- Waffen: sword, staff, bow, gun, spear, catalyst ...
    -- Rüstung: head, chest, hands, legs, feet, accessory ...
    slot text not null,

    -- Optional: rarity 1-6 oder anpassen, falls dein Spiel andere Werte nutzt.
    rarity smallint not null default 1 check (rarity between 1 and 6),

    -- Optional: Element oder NULL, z. B. heat, cryo, electric, nature, physical
    element_type text,

    -- Asset-Pfade relativ zu deinem Projekt.
    icon_path text,
    icon_small_path text,

    -- Freitext-Beschreibung für UI/Tooltip.
    description text,

    -- Werte als JSONB, damit du flexibel bleiben kannst.
    -- Beispiele:
    -- {
    --   "atk": 120,
    --   "def": 20,
    --   "critRate": 0.08,
    --   "critDamage": 0.16,
    --   "hp": 350
    -- }
    stats jsonb not null default '{}'::jsonb,

    -- Zusätzliche Effekte / passive Boni als JSONB.
    -- Beispiele:
    -- [
    --   {
    --     "name": "Heat Boost",
    --     "description": "+10% Heat damage",
    --     "effect": "heat_damage_bonus",
    --     "value": 0.10
    --   }
    -- ]
    effects jsonb not null default '[]'::jsonb,

    -- Komplettes Original-Objekt für spätere UI-Synchronisierung.
    raw_data jsonb not null default '{}'::jsonb,

    sort_order integer not null default 0,
    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Falls die Tabelle schon existiert, aber später Spalten fehlen:
alter table public.equipment_items add column if not exists game text not null default 'arknights_endfield';
alter table public.equipment_items add column if not exists slug text;
alter table public.equipment_items add column if not exists name text;
alter table public.equipment_items add column if not exists item_type text;
alter table public.equipment_items add column if not exists slot text;
alter table public.equipment_items add column if not exists rarity smallint not null default 1;
alter table public.equipment_items add column if not exists element_type text;
alter table public.equipment_items add column if not exists icon_path text;
alter table public.equipment_items add column if not exists icon_small_path text;
alter table public.equipment_items add column if not exists description text;
alter table public.equipment_items add column if not exists stats jsonb not null default '{}'::jsonb;
alter table public.equipment_items add column if not exists effects jsonb not null default '[]'::jsonb;
alter table public.equipment_items add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.equipment_items add column if not exists sort_order integer not null default 0;
alter table public.equipment_items add column if not exists is_active boolean not null default true;
alter table public.equipment_items add column if not exists created_at timestamptz not null default now();
alter table public.equipment_items add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_equipment_items_game_sort
    on public.equipment_items (game, sort_order, name);

create index if not exists idx_equipment_items_type_slot
    on public.equipment_items (item_type, slot);

create index if not exists idx_equipment_items_element
    on public.equipment_items (element_type);

-- Supabase RLS wie bei operators/operator_skills:
alter table public.equipment_items enable row level security;

drop policy if exists "Public read equipment items" on public.equipment_items;
create policy "Public read equipment items"
    on public.equipment_items
    for select
    using (true);

-- =========================================================
-- 2) Neue Items eintragen
-- =========================================================
-- Ersetze die Beispiel-Items unten durch deine echten Waffen/Rüstungen.
-- Wichtig:
--   id muss eindeutig sein.
--   slug muss eindeutig sein.
--   item_type muss 'weapon' oder 'armor' sein.

with new_items (
    id,
    slug,
    name,
    item_type,
    slot,
    rarity,
    element_type,
    icon_path,
    icon_small_path,
    description,
    stats,
    effects,
    raw_data,
    sort_order,
    is_active
) as (
    values
        (
            1001,
            'example_training_sword',
            'Example Training Sword',
            'weapon',
            'sword',
            3,
            'physical',
            'assets/items/weapons/example_training_sword.png',
            'assets/items/weapons/example_training_sword_small.png',
            'Starter weapon template. Replace this with the real description.',
            '{
                "atk": 120,
                "critRate": 0.05
            }'::jsonb,
            '[
                {
                    "name": "Training Edge",
                    "description": "+5% Crit Rate.",
                    "effect": "crit_rate_bonus",
                    "value": 0.05
                }
            ]'::jsonb,
            '{
                "id": 1001,
                "slug": "example_training_sword",
                "name": "Example Training Sword",
                "itemType": "weapon",
                "slot": "sword",
                "rarity": 3,
                "elementType": "physical",
                "icon": "assets/items/weapons/example_training_sword.png",
                "iconSmall": "assets/items/weapons/example_training_sword_small.png",
                "description": "Starter weapon template. Replace this with the real description.",
                "stats": {
                    "atk": 120,
                    "critRate": 0.05
                },
                "effects": [
                    {
                        "name": "Training Edge",
                        "description": "+5% Crit Rate.",
                        "effect": "crit_rate_bonus",
                        "value": 0.05
                    }
                ]
            }'::jsonb,
            1001,
            true
        ),
        (
            2001,
            'example_steel_chestplate',
            'Example Steel Chestplate',
            'armor',
            'chest',
            3,
            null,
            'assets/items/armor/example_steel_chestplate.png',
            'assets/items/armor/example_steel_chestplate_small.png',
            'Starter armor template. Replace this with the real description.',
            '{
                "def": 80,
                "hp": 350
            }'::jsonb,
            '[]'::jsonb,
            '{
                "id": 2001,
                "slug": "example_steel_chestplate",
                "name": "Example Steel Chestplate",
                "itemType": "armor",
                "slot": "chest",
                "rarity": 3,
                "elementType": null,
                "icon": "assets/items/armor/example_steel_chestplate.png",
                "iconSmall": "assets/items/armor/example_steel_chestplate_small.png",
                "description": "Starter armor template. Replace this with the real description.",
                "stats": {
                    "def": 80,
                    "hp": 350
                },
                "effects": []
            }'::jsonb,
            2001,
            true
        )
)
insert into public.equipment_items (
    id,
    game,
    slug,
    name,
    item_type,
    slot,
    rarity,
    element_type,
    icon_path,
    icon_small_path,
    description,
    stats,
    effects,
    raw_data,
    sort_order,
    is_active,
    updated_at
)
select
    id,
    'arknights_endfield',
    slug,
    name,
    item_type,
    slot,
    rarity,
    element_type,
    icon_path,
    icon_small_path,
    description,
    stats,
    effects,
    raw_data,
    sort_order,
    is_active,
    now()
from new_items
on conflict (id) do update
set
    game = excluded.game,
    slug = excluded.slug,
    name = excluded.name,
    item_type = excluded.item_type,
    slot = excluded.slot,
    rarity = excluded.rarity,
    element_type = excluded.element_type,
    icon_path = excluded.icon_path,
    icon_small_path = excluded.icon_small_path,
    description = excluded.description,
    stats = excluded.stats,
    effects = excluded.effects,
    raw_data = excluded.raw_data,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = now();

commit;

-- =========================================================
-- 3) Kontrolle
-- =========================================================
-- Nach dem Ausführen kannst du prüfen:
--
-- select * from public.equipment_items order by item_type, sort_order, name;
--
-- Nur Waffen:
-- select * from public.equipment_items where item_type = 'weapon' order by sort_order;
--
-- Nur Rüstungen:
-- select * from public.equipment_items where item_type = 'armor' order by sort_order;
