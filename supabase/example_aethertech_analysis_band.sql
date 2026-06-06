-- Example gear insert: Æthertech Analysis Band
-- Run supabase/schema.sql first.
-- Image path expected by the app:
--   endfield/assets/gear/aethertech_analysis_band.png

begin;

insert into public.gear_pieces (
    gear_key,
    game,
    name,
    gear_slot,
    set_name,
    rarity,
    icon_path,
    main_attribute,
    secondary_attribute,
    passive_name,
    raw_data,
    sort_order
) values (
    'aethertech_analysis_band',
    'arknights_endfield',
    'Æthertech Analysis Band',
    'kit',
    'Æthertech',
    5,
    'assets/gear/aethertech_analysis_band.png',
    'Strength +32',
    'Defense +21; Will +21; Physical DMG Bonus +23.0%',
    'Æthertech 3-piece set effect',
    '{
        "level": 70,
        "quality": "Gold",
        "region": "Wuling",
        "artifice": true,
        "source": "Exploring and Gathering",
        "description": "Designed by Portable Æthertech Labs and assembled by the AIC. This equipment improves the wearer''s combat capabilities.",
        "attributes": {
            "defense": "+21",
            "strength": "+32",
            "will": "+21",
            "physicalDmgBonus": "+23.0%"
        },
        "rankAttributes": {
            "strength": ["+35", "+38", "+41"],
            "will": ["+23", "+25", "+27"],
            "physicalDmgBonus": ["+25.3%", "+27.6%", "+29.9%"]
        },
        "setEffect": "3-piece set effect: Wearer''s ATK +8%. After the wearer applies Vulnerability, the wearer gains Physical DMG +8% for 15s. This effect can reach 4 stacks. If the target already has 4 stack(s) of Vulnerability, the wearer gains an additional Physical DMG +16% for 10s. This effect cannot stack.",
        "recipe": {
            "credits": 8000,
            "xiraniteComponent": 50
        }
    }'::jsonb,
    1000
)
on conflict (gear_key) do update set
    game = excluded.game,
    name = excluded.name,
    gear_slot = excluded.gear_slot,
    set_name = excluded.set_name,
    rarity = excluded.rarity,
    icon_path = excluded.icon_path,
    main_attribute = excluded.main_attribute,
    secondary_attribute = excluded.secondary_attribute,
    passive_name = excluded.passive_name,
    raw_data = excluded.raw_data,
    sort_order = excluded.sort_order,
    updated_at = now();

commit;
