-- Equipment catalog seed for Arknights: Endfield.
-- Run supabase/schema.sql first.

begin;

insert into public.weapon_types (weapon_type, game, name, sort_order) values
    ('sword', 'arknights_endfield', 'Sword', 1),
    ('great_sword', 'arknights_endfield', 'Great Sword', 2),
    ('polearm', 'arknights_endfield', 'Polearm', 3),
    ('arts_unit', 'arknights_endfield', 'Arts Unit', 4),
    ('handcannon', 'arknights_endfield', 'Handcannon', 5)
on conflict (weapon_type) do update set
    game = excluded.game,
    name = excluded.name,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into public.weapons (
    weapon_key,
    game,
    name,
    weapon_type,
    rarity,
    main_attribute,
    secondary_attribute,
    sort_order
) values
    ('tarr_11', 'arknights_endfield', 'Tarr 11', 'sword', 3, 'Main Attribute', null, 1),
    ('wave_tide', 'arknights_endfield', 'Wave Tide', 'sword', 4, 'Intellect', 'Attack', 2),
    ('obj_edge_of_lightness', 'arknights_endfield', 'OBJ Edge of Lightness', 'sword', 5, null, null, 3),
    ('aspirant', 'arknights_endfield', 'Aspirant', 'sword', 5, null, null, 4),
    ('fortmaker', 'arknights_endfield', 'Fortmaker', 'sword', 5, null, null, 5),
    ('forgeborn_scathe', 'arknights_endfield', 'Forgeborn Scathe', 'sword', 6, 'Intellect', 'Attack', 6),
    ('glorious_memory', 'arknights_endfield', 'Glorious Memory', 'sword', 6, 'Agility', 'Crit Rate', 7),
    ('grand_vision', 'arknights_endfield', 'Grand Vision', 'sword', 6, 'Agility', 'Attack', 8),
    ('rapid_ascent', 'arknights_endfield', 'Rapid Ascent', 'sword', 6, 'Main Attribute', 'Crit Rate', 9),
    ('thermite_cutter', 'arknights_endfield', 'Thermite Cutter', 'sword', 6, 'Willpower', 'Attack', 10),
    ('umbral_torch', 'arknights_endfield', 'Umbral Torch', 'sword', 6, 'Intellect', 'Heat DMG', 11),
    ('darhoff_7', 'arknights_endfield', 'Darhoff 7', 'great_sword', 3, 'Main Attribute', null, 12),
    ('industry_01', 'arknights_endfield', 'Industry 0.1', 'great_sword', 4, 'Strength', 'Attack', 13),
    ('obj_heavy_burden', 'arknights_endfield', 'OBJ Heavy Burden', 'great_sword', 5, null, null, 14),
    ('exemplar', 'arknights_endfield', 'Exemplar', 'great_sword', 6, 'Main Attribute', 'Attack', 15),
    ('former_finery', 'arknights_endfield', 'Former Finery', 'great_sword', 6, 'Willpower', 'HP', 16),
    ('sundered_prince', 'arknights_endfield', 'Sundered Prince', 'great_sword', 6, 'Strength', 'Crit Rate', 17),
    ('thunderberge', 'arknights_endfield', 'Thunderberge', 'great_sword', 6, 'Strength', 'HP', 18),
    ('opero_77', 'arknights_endfield', 'Opero 77', 'polearm', 3, 'Main Attribute', null, 19),
    ('obj_razorhorn', 'arknights_endfield', 'OBJ Razorhorn', 'polearm', 5, 'Willpower', 'Physical DMG', 20),
    ('valiant', 'arknights_endfield', 'Valiant', 'polearm', 6, 'Agility', 'Physical DMG', 21),
    ('jiminy_12', 'arknights_endfield', 'Jiminy 12', 'arts_unit', 3, 'Main Attribute', null, 22),
    ('obj_arts_identifier', 'arknights_endfield', 'OBJ Arts Identifier', 'arts_unit', 5, null, null, 23),
    ('flickers_in_the_mist', 'arknights_endfield', 'Flickers in the Mist', 'arts_unit', 6, 'Willpower', 'Electric DMG', 24),
    ('peco_5', 'arknights_endfield', 'Peco 5', 'handcannon', 3, 'Main Attribute', null, 25),
    ('howling_guard', 'arknights_endfield', 'Howling Guard', 'handcannon', 4, null, null, 26),
    ('artzy_tyrannical', 'arknights_endfield', 'Artzy Tyrannical', 'handcannon', 6, 'Intellect', 'Crit Rate', 27),
    ('brigands_calling', 'arknights_endfield', 'Brigand''s Calling', 'handcannon', 6, 'Agility', 'Attack', 28)
on conflict (weapon_key) do update set
    game = excluded.game,
    name = excluded.name,
    weapon_type = excluded.weapon_type,
    rarity = excluded.rarity,
    main_attribute = excluded.main_attribute,
    secondary_attribute = excluded.secondary_attribute,
    sort_order = excluded.sort_order,
    updated_at = now();

update public.operators set weapon_type = weapon_values.weapon_type
from (
    values
        (1, 'sword'),
        (2, 'sword'),
        (3, 'sword'),
        (4, 'arts_unit'),
        (5, 'sword'),
        (6, 'sword'),
        (7, 'polearm'),
        (8, 'arts_unit'),
        (9, 'arts_unit'),
        (10, 'sword'),
        (11, 'arts_unit'),
        (12, 'arts_unit'),
        (13, 'great_sword'),
        (14, 'sword'),
        (15, 'handcannon'),
        (16, 'great_sword'),
        (17, 'great_sword'),
        (18, 'polearm'),
        (19, 'handcannon'),
        (20, 'great_sword'),
        (21, 'polearm'),
        (22, 'sword'),
        (23, 'great_sword'),
        (24, 'handcannon'),
        (25, 'arts_unit'),
        (26, 'handcannon'),
        (27, 'great_sword')
) as weapon_values(operator_id, weapon_type)
where public.operators.id = weapon_values.operator_id;

commit;
