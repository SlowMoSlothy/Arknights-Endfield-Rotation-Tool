-- Gear sets and gear items for Arknights Endfield.
-- Run this in the Supabase SQL Editor.

begin;

-- Drop existing tables to recreate with complete schema
drop table if exists public.gear_items cascade;
drop table if exists public.gear_sets cascade;

-- 1. Create gear_sets table
create table public.gear_sets (
    set_key text primary key,
    name text not null,
    description text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Create gear_items table
create table public.gear_items (
    gear_key text primary key,
    category text not null check (category in ('gloves', 'armor', 'kits')),
    name text not null,
    set_key text references public.gear_sets(set_key) on delete cascade,
    rarity integer not null default 5,
    main_stat text not null,
    main_value numeric not null,
    sec_stat text,
    sec_value numeric,
    sub_stat text not null,
    sub_value numeric not null,
    def_value numeric,
    icon text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. Indexes
create index idx_gear_items_category_set
    on public.gear_items (category, set_key);

-- 4. Enable Row Level Security (RLS)
alter table public.gear_sets enable row level security;
alter table public.gear_items enable row level security;

-- 5. Read policies
create policy "Public read gear sets"
    on public.gear_sets
    for select
    using (true);

-- 6. Insert Gear Sets
insert into public.gear_sets (set_key, name, description) values
    ('aic_light', 'AIC Light Set Bonus', '3-Piece: Wearer''s HP +500. When the wearer defeats an enemy, ATK +20 for 5s.'),
    ('aic_heavy', 'AIC Heavy Set Bonus', '3-Piece: Wearer''s HP +500. When the wearer defeats an enemy, restore 100 HP. Cooldown: 5s.'),
    ('roving_msgr', 'Roving MSGR Set Bonus', '3-Piece: Wearer''s Agility +50. When the wearer''s HP is above 80%, Physical DMG +20%.'),
    ('armored_msgr', 'Armored MSGR Set Bonus', '3-Piece: Wearer''s Strength +50. When wearer''s HP is below 50%, they gain +30% DMG Reduction.'),
    ('mordvolt_resistant', 'Mordvolt Resistant Set Bonus', '3-Piece: Wearer''s Will +50. When wearer''s HP is below 50%, they gain +30% Treatment Effect.'),
    ('mordvolt_insulation', 'Mordvolt Insulation Set Bonus', '3-Piece: Wearer''s Intellect +50. When wearer''s HP is above 80%, they gain +20% Arts DMG Dealt.'),
    ('aburrey_legacy', 'Aburrey''s Legacy Set Bonus', '3-Piece: Wearer''s Skill DMG +24%. Casting any skill (battle/combo/ultimate) grants wearer +5% ATK for 15s (stacks up to 3 times).'),
    ('catastrophe', 'Catastrophe Set Bonus', '3-Piece: Wearer''s Ultimate Gain Efficiency +20%. Recovers 50 SP immediately at the start of battle.'),
    ('bonekrusha', 'Bonekrusha Set Bonus', '3-Piece: ATK +15%. Casting combo skills grants 1 stack of ''Bonekrushing Smash'' (up to 2 stacks), boosting the next battle skill''s DMG Dealt by +30%.'),
    ('eternal_xiranite', 'Eternal Xiranite Set Bonus', '3-Piece: Wearer''s HP +1000. After applying Amp, Protected, Susceptibility, or Weakened, teammates gain +16% DMG Dealt for 15s.'),
    ('frontiers', 'Frontiers Set Bonus', '3-Piece: Wearer''s Combo Skill CDR +15%. After recovering SP via skill, the team gains +18% DMG for 12s. Cooldown: 30s.'),
    ('hot_work', 'Hot Work Set Bonus', '3-Piece: Wearer''s Arts Intensity +30. When wearer applies Combustion, Heat DMG +60% for 8s. When wearer applies Corrosion, Nature DMG +60% for 8s.'),
    ('lynx', 'LYNX Set Bonus', '3-Piece: Wearer''s HP Treatment Efficiency +20%. Treating allies grants them +15% DMG Reduction (boosted to +30% if healing overflows Max HP) for 10s.'),
    ('mi_security', 'MI Security Set Bonus', '3-Piece: Wearer''s Crit Rate +5%. Scoring critical hits grants +5% ATK for 5s (up to 5 stacks). At max stacks, Crit Rate +5.'),
    ('pulser_labs', 'Pulser Labs Set Bonus', '3-Piece: Wearer''s Arts Intensity +30. Applying Electrification grants +60% Electric DMG for 8s. Applying Solidification grants +60% Cryo DMG for 8s.'),
    ('swordmancer', 'Swordmancer Set Bonus', '3-Piece: Wearer''s Stagger Efficiency Bonus +20%. After applying a physical status, deals 250% ATK as Physical DMG and 10 Stagger. Cooldown: 15s.'),
    ('tide_surge', 'Tide Surge Set Bonus', '3-Piece: Wearer''s Arts Intensity +24. Applying 3 stacks of Arts Infliction and triggering Arts Burst deals +100% DMG and reduces target''s Elemental Resistance by 15% for 10s.'),
    ('type_50_yinglung', 'Type 50 Yinglung Set Bonus', '3-Piece: Wearer''s ATK +15%. When teammates cast battle skills, wearer gains 1 stack of ''Yinglung''s Edge'' (up to 3 stacks), each stack boosting wearer''s next combo skill DMG by +20%.'),
    ('aethertech', 'Ã†thertech Set Bonus', '3-Piece: Wearer''s ATK +8%. Applying Vulnerable grants Physical DMG +8% for 15s (up to 4 stacks). At 4 stacks, gain +16% Physical DMG for 10s.');

-- 7. Insert Gear Items
insert into public.gear_items (gear_key, category, name, set_key, rarity, main_stat, main_value, sec_stat, sec_value, sub_stat, sub_value, def_value, icon) values
    ('aic_light_gloves', 'gloves', 'AIC Tactical Gloves', 'aic_light', 2, 'Intellect', 23, 'Agility', 23, 'Combo Skill DMG Bonus %', 13.5, 16.8, 'assets/gear/aic_light_gloves.png'),
    ('aic_light_armor', 'armor', 'AIC Light Armor', 'aic_light', 2, 'Intellect', 30, 'Will', 30, 'Battle Skill DMG Bonus %', 8.1, 22.400000000000002, 'assets/gear/aic_light_armor.png'),
    ('aic_heavy_gloves', 'gloves', 'AIC Gauntlets', 'aic_heavy', 2, 'Strength', 23, 'Will', 23, 'Final DMG Reduction %', 6.3, 16.8, 'assets/gear/aic_heavy_gloves.png'),
    ('aic_heavy_armor', 'armor', 'AIC Heavy Armor', 'aic_heavy', 2, 'Strength', 30, 'Agility', 30, 'Final DMG Reduction %', 3.9, 22.400000000000002, 'assets/gear/aic_heavy_armor.png'),
    ('roving_msgr_gloves', 'gloves', 'Roving MSGR Fists', 'roving_msgr', 3, 'Agility', 33, 'Strength', 22, 'Physical DMG Bonus %', 9.7, 21.599999999999998, 'assets/gear/roving_msgr_gloves.png'),
    ('roving_msgr_armor', 'armor', 'Roving MSGR Jacket', 'roving_msgr', 3, 'Agility', 44, 'Intellect', 29, 'ATK Bonus %', 16.2, 28.8, 'assets/gear/roving_msgr_armor.png'),
    ('armored_msgr_gloves', 'gloves', 'Armored MSGR Gloves', 'armored_msgr', 3, 'Strength', 33, 'Will', 22, 'Final DMG Reduction %', 8, 21.599999999999998, 'assets/gear/armored_msgr_gloves.png'),
    ('armored_msgr_armor', 'armor', 'Armored MSGR Jacket', 'armored_msgr', 3, 'Strength', 44, 'Agility', 29, 'HP Bonus %', 10.5, 28.8, 'assets/gear/armored_msgr_armor.png'),
    ('mordvolt_resistant_gloves', 'gloves', 'Mordvolt Resistant Gloves', 'mordvolt_resistant', 3, 'Will', 33, 'Intellect', 22, 'Treatment Effect %', 8.8, 21.599999999999998, 'assets/gear/mordvolt_resistant_gloves.png'),
    ('mordvolt_resistant_armor', 'armor', 'Mordvolt Resistant Vest', 'mordvolt_resistant', 3, 'Will', 44, 'Agility', 29, 'HP Bonus %', 10.5, 28.8, 'assets/gear/mordvolt_resistant_armor.png'),
    ('mordvolt_insulation_gloves', 'gloves', 'Mordvolt Insulation Gloves', 'mordvolt_insulation', 3, 'Intellect', 33, 'Will', 22, 'Final DMG Reduction %', 9.2, 21.599999999999998, 'assets/gear/mordvolt_insulation_gloves.png'),
    ('mordvolt_insulation_armor', 'armor', 'Mordvolt Insulation Vest', 'mordvolt_insulation', 3, 'Intellect', 44, 'Strength', 29, 'ATK Bonus %', 16.2, 28.8, 'assets/gear/mordvolt_insulation_armor.png'),
    ('aburrey_legacy_gloves', 'gloves', 'Aburrey Gauntlets', 'aburrey_legacy', 4, 'Strength', 46, 'Will', 30, 'DMG Bonus vs. Staggered %', 35, 30, 'assets/gear/aburrey_legacy_gloves.png'),
    ('aburrey_legacy_armor', 'armor', 'Aburrey Light Armor', 'aburrey_legacy', 4, 'Intellect', 61, 'Strength', 41, 'Ultimate Gain Efficiency %', 8.8, 40, 'assets/gear/aburrey_legacy_armor.png'),
    ('catastrophe_gloves', 'gloves', 'Catastrophe Gloves', 'catastrophe', 4, 'Will', 46, 'Intellect', 30, 'Arts Intensity', 24.5, 30, 'assets/gear/catastrophe_gloves.png'),
    ('catastrophe_armor', 'armor', 'Catastrophe Heavy Armor', 'catastrophe', 4, 'Strength', 61, 'Intellect', 41, 'Ultimate DMG Bonus %', 18.4, 40, 'assets/gear/catastrophe_armor.png'),
    ('bonekrusha_armor', 'armor', 'Bonekrusha Poncho', 'bonekrusha', 5, 'Will', 87, 'Strength', 58, 'Combo Skill DMG Bonus %', 20.7, 56, 'assets/gear/bonekrusha_armor.png'),
    ('eternal_xiranite_gloves', 'gloves', 'Eternal Xiranite Gloves', 'eternal_xiranite', 5, 'Intellect', 65, 'Strength', 43, 'Ultimate Gain Efficiency %', 20.5, 42, 'assets/gear/eternal_xiranite_gloves.png'),
    ('eternal_xiranite_armor', 'armor', 'Eternal Xiranite Armor', 'eternal_xiranite', 5, 'Will', 87, 'Intellect', 58, 'Arts Intensity', 20.7, 56, 'assets/gear/eternal_xiranite_armor.png'),
    ('frontiers_gloves', 'gloves', 'Frontiers Blight RES Gloves', 'frontiers', 5, 'Agility', 65, 'Intellect', 43, 'Battle Skill DMG Bonus %', 34.5, 42, 'assets/gear/frontiers_gloves.png'),
    ('frontiers_armor', 'armor', 'Frontiers Armor', 'frontiers', 5, 'Strength', 87, 'Intellect', 58, 'Ultimate DMG Bonus %', 25.9, 56, 'assets/gear/frontiers_armor.png'),
    ('hot_work_gloves', 'gloves', 'Hot Work Gauntlets', 'hot_work', 5, 'Intellect', 65, 'Strength', 43, 'Final DMG Reduction %', 19.2, 42, 'assets/gear/hot_work_gloves.png'),
    ('hot_work_armor', 'armor', 'Hot Work Exoskeleton', 'hot_work', 5, 'Strength', 87, 'Agility', 58, 'Heat DMG Bonus %', 11.5, 56, 'assets/gear/hot_work_armor.png'),
    ('lynx_gloves', 'gloves', 'LYNX Gloves', 'lynx', 5, 'Strength', 65, 'Will', 43, 'Ultimate Gain Efficiency %', 20.5, 42, 'assets/gear/lynx_gloves.png'),
    ('lynx_armor', 'armor', 'LYNX Heavy Armor', 'lynx', 5, 'Strength', 87, 'Will', 58, 'Treatment Effect %', 10.4, 56, 'assets/gear/lynx_armor.png'),
    ('mi_security_gloves', 'gloves', 'MI Security Gloves', 'mi_security', 5, 'Agility', 65, 'Strength', 43, 'Battle Skill DMG Bonus %', 34.5, 42, 'assets/gear/mi_security_gloves.png'),
    ('mi_security_armor', 'armor', 'MI Security Armor', 'mi_security', 5, 'Agility', 87, 'Strength', 58, 'Arts Intensity', 20.7, 56, 'assets/gear/mi_security_armor.png'),
    ('pulser_labs_gloves', 'gloves', 'Pulser Labs Gloves', 'pulser_labs', 5, 'Will', 65, 'Intellect', 43, 'Final DMG Reduction %', 19.2, 42, 'assets/gear/pulser_labs_gloves.png'),
    ('pulser_labs_armor', 'armor', 'Pulser Labs Disruptor Suit', 'pulser_labs', 5, 'Intellect', 87, 'Will', 58, 'Arts Intensity', 20.7, 56, 'assets/gear/pulser_labs_armor.png'),
    ('swordmancer_gloves', 'gloves', 'Swordmancer TAC Gauntlets', 'swordmancer', 5, 'Strength', 65, 'Will', 43, 'Physical DMG Bonus %', 19.2, 42, 'assets/gear/swordmancer_gloves.png'),
    ('swordmancer_armor', 'armor', 'Swordmancer Heavy Armor', 'swordmancer', 5, 'Agility', 87, 'Strength', 58, 'Arts Intensity', 20.7, 56, 'assets/gear/swordmancer_armor.png'),
    ('tide_surge_gloves', 'gloves', 'Tide Surge Gauntlets', 'tide_surge', 5, 'Strength', 65, 'Will', 43, 'Final DMG Reduction %', 19.2, 42, 'assets/gear/tide_surge_gloves.png'),
    ('tide_surge_armor', 'armor', 'Tide Fall Light Armor', 'tide_surge', 5, 'Intellect', 87, 'Strength', 58, 'Ultimate Gain Efficiency %', 12.3, 56, 'assets/gear/tide_surge_armor.png'),
    ('type_50_yinglung_gloves', 'gloves', 'Type 50 Yinglung Gloves', 'type_50_yinglung', 5, 'Agility', 65, 'Intellect', 43, 'Combo Skill DMG Bonus %', 34.5, 42, 'assets/gear/type_50_yinglung_gloves.png'),
    ('type_50_yinglung_armor', 'armor', 'Type 50 Yinglung Heavy Armor', 'type_50_yinglung', 5, 'Strength', 87, 'Will', 58, 'Physical DMG Bonus %', 11.5, 56, 'assets/gear/type_50_yinglung_armor.png'),
    ('aethertech_gloves', 'gloves', 'Æthertech Gloves', 'aethertech', 5, 'Agility', 65, 'Strength', 43, 'Arts Intensity', 34.5, 42, 'assets/gear/aethertech_gloves.png'),
    ('aethertech_armor', 'armor', 'Æthertech Plating', 'aethertech', 5, 'Strength', 87, 'Will', 58, 'DMG Bonus vs. Staggered %', 29.6, 56, 'assets/gear/aethertech_armor.png'),
    ('aburrey_legacy_kit', 'kits', 'Aburrey UV Lamp', 'aburrey_legacy', 4, 'Strength', 23, 'Agility', 15, 'Skill DMG Bonus %', 19.6, 15, 'assets/gear/aburrey_legacy_kit.png'),
    ('aburrey_auditory_chip_kit', 'kits', 'Aburrey Auditory Chip', 'aburrey_legacy', 4, 'Strength', 23, 'Will', 15, 'DMG Bonus vs. Staggered %', 42, 15, 'assets/gear/aburrey_legacy_kit.png'),
    ('aburrey_flashlight_kit', 'kits', 'Aburrey Flashlight', 'aburrey_legacy', 4, 'Intellect', 23, 'Strength', 15, 'Ultimate Gain Efficiency %', 17.5, 15, 'assets/gear/aburrey_legacy_kit.png'),
    ('aburrey_sensor_chip_kit', 'kits', 'Aburrey Sensor Chip', 'aburrey_legacy', 4, 'Will', 23, 'Agility', 15, 'Battle Skill DMG Bonus %', 29.4, 15, 'assets/gear/aburrey_legacy_kit.png'),
    ('type_50_yinglung_kit', 'kits', 'Type 50 Yinglung Radar', 'type_50_yinglung', 5, 'Strength', 32, 'Will', 21, 'Physical DMG Bonus %', 23, 21, 'assets/gear/type_50_yinglung_kit.png'),
    ('type_50_yinglung_knife_kit', 'kits', 'Type 50 Yinglung Knife', 'type_50_yinglung', 5, 'Will', 32, 'Agility', 21, 'Combo Skill DMG Bonus %', 41.4, 21, 'assets/gear/type_50_yinglung_kit.png'),
    ('mordvolt_resistant_wrench_kit', 'kits', 'Mordvolt Resistant Wrench', 'mordvolt_resistant', 3, 'Will', 21, null, null, 'ATK Bonus %', 10.5, 10.799999999999999, 'assets/gear/mordvolt_resistant_kit.png'),
    ('mordvolt_resistant_kit', 'kits', 'Mordvolt Resistant Battery', 'mordvolt_resistant', 3, 'Will', 21, null, null, 'Treatment Effect %', 10.5, 10.799999999999999, 'assets/gear/mordvolt_resistant_kit.png'),
    ('armored_msgr_kit', 'kits', 'Armored MSGR Gyro', 'armored_msgr', 3, 'Strength', 21, null, null, 'ATK Bonus %', 10.5, 10.799999999999999, 'assets/gear/armored_msgr_kit.png'),
    ('armored_msgr_flashlight_kit', 'kits', 'Armored MSGR Flashlight', 'armored_msgr', 3, 'Strength', 21, null, null, 'HP Bonus %', 21, 10.799999999999999, 'assets/gear/armored_msgr_kit.png'),
    ('lynx_kit', 'kits', 'LYNX Connector', 'lynx', 5, 'Strength', 32, 'Will', 21, 'Treatment Effect %', 82.9, 21, 'assets/gear/lynx_kit.png'),
    ('lynx_slab_kit', 'kits', 'LYNX Slab', 'lynx', 5, 'Will', 32, 'Intellect', 21, 'Main Attribute %', 20.7, 21, 'assets/gear/lynx_slab_kit.png'),
    ('lynx_aegis_injector_kit', 'kits', 'LYNX Aegis Injector', 'lynx', 5, 'Will', 41, null, null, 'Treatment Effect %', 20.7, 21, 'assets/gear/lynx_kit.png'),
    ('pulser_labs_kit', 'kits', 'Pulser Labs Calibrator', 'pulser_labs', 5, 'Intellect', 41, null, null, 'Arts Intensity', 41.4, 21, 'assets/gear/pulser_labs_kit.png'),
    ('mordvolt_insulation_wrench_kit', 'kits', 'Mordvolt Insulation Wrench', 'mordvolt_insulation', 3, 'Intellect', 21, null, null, 'ATK Bonus %', 10.5, 10.799999999999999, 'assets/gear/mordvolt_insulation_kit.png'),
    ('mordvolt_insulation_kit', 'kits', 'Mordvolt Insulation Battery', 'mordvolt_insulation', 3, 'Intellect', 21, null, null, 'Crit Rate %', 5.2, 10.799999999999999, 'assets/gear/mordvolt_insulation_kit.png'),
    ('Æthertech_analysis_band_kit', 'kits', 'Æthertech Analysis Band', 'aethertech', 5, 'Strength', 32, 'Will', 21, 'Physical DMG Bonus %', 23, 21, 'assets/gear/aethertech_kit.png'),
    ('Æthertech_stabilizer_kit', 'kits', 'Æthertech Stabilizer', 'aethertech', 5, 'Agility', 32, 'Strength', 21, 'Arts Intensity', 41.4, 21, 'assets/gear/aethertech_kit.png'),
    ('mi_security_armband_kit', 'kits', 'MI Security Armband', 'mi_security', 5, 'Strength', 32, 'Will', 21, 'Crit Rate %', 23, 21, 'assets/gear/mi_security_kit.png'),
    ('mi_security_scope_kit', 'kits', 'MI Security Scope', 'mi_security', 5, 'Agility', 32, 'Strength', 21, 'Battle Skill DMG Bonus %', 41.4, 21, 'assets/gear/mi_security_kit.png'),
    ('mi_security_kit', 'kits', 'MI Security Toolkit', 'mi_security', 5, 'Intellect', 32, 'Agility', 21, 'Crit Rate %', 10.4, 21, 'assets/gear/mi_security_kit.png'),
    ('mi_security_push_knife_kit', 'kits', 'MI Security Push Knife', 'mi_security', 5, 'Will', 32, 'Intellect', 21, 'Crit Rate %', 23, 21, 'assets/gear/mi_security_kit.png'),
    ('catastrophe_gauze_cartridge_kit', 'kits', 'Catastrophe Gauze Cartridge', 'catastrophe', 4, 'Strength', 23, 'Intellect', 15, 'Ultimate DMG Bonus %', 36.8, 15, 'assets/gear/catastrophe_kit.png'),
    ('catastrophe_kit', 'kits', 'Catastrophe Filter', 'catastrophe', 4, 'Will', 23, 'Intellect', 15, 'Arts Intensity', 29.4, 15, 'assets/gear/catastrophe_kit.png'),
    ('swordmancer_kit', 'kits', 'Swordmancer Flint', 'swordmancer', 5, 'Agility', 32, 'Strength', 21, 'Physical DMG Bonus %', 23, 21, 'assets/gear/swordmancer_kit.png'),
    ('aic_light_kit', 'kits', 'AIC Light Plate', 'aic_light', 2, 'Intellect', 16, null, null, 'Combo Skill DMG Bonus %', 16.2, 8.4, 'assets/gear/aic_light_kit.png'),
    ('aic_ceramic_plate_kit', 'kits', 'AIC Ceramic Plate', 'aic_light', 2, 'Will', 16, null, null, 'Battle Skill DMG Bonus %', 16.2, 8.4, 'assets/gear/aic_light_kit.png'),
    ('bonekrusha_kit', 'kits', 'Bonekrusha Figurine', 'bonekrusha', 5, 'Will', 32, 'Agility', 21, 'Battle Skill DMG Bonus %', 41.4, 21, 'assets/gear/bonekrusha_kit.png'),
    ('bonekrusha_mask_kit', 'kits', 'Bonekrusha Mask', 'bonekrusha', 5, 'Agility', 32, 'Strength', 21, 'DMG Bonus vs. Staggered %', 59.1, 21, 'assets/gear/bonekrusha_kit.png'),
    ('eternal_xiranite_kit', 'kits', 'Eternal Xiranite Power Core', 'eternal_xiranite', 5, 'Intellect', 32, 'Strength', 21, 'Ultimate Gain Efficiency %', 24.6, 21, 'assets/gear/eternal_xiranite_kit.png'),
    ('eternal_xiranite_auxiliary_arm_kit', 'kits', 'Eternal Xiranite Auxiliary Arm', 'eternal_xiranite', 5, 'Will', 32, 'Intellect', 21, 'Ultimate Gain Efficiency %', 24.6, 21, 'assets/gear/eternal_xiranite_kit.png'),
    ('roving_msgr_kit', 'kits', 'Roving MSGR Gyro', 'roving_msgr', 3, 'Agility', 21, null, null, 'ATK Bonus %', 10.5, 10.799999999999999, 'assets/gear/roving_msgr_kit.png'),
    ('roving_msgr_flashlight_kit', 'kits', 'Roving MSGR Flashlight', 'roving_msgr', 3, 'Agility', 21, null, null, 'Combo Skill DMG Bonus %', 21, 10.799999999999999, 'assets/gear/roving_msgr_kit.png'),
    ('aic_heavy_kit', 'kits', 'AIC Heavy Plate', 'aic_heavy', 2, 'Strength', 16, null, null, 'Final DMG Reduction %', 7.5, 8.4, 'assets/gear/aic_heavy_kit.png'),
    ('aic_alloy_plate_kit', 'kits', 'AIC Alloy Plate', 'aic_heavy', 2, 'Agility', 16, null, null, 'Final DMG Reduction %', 7.5, 8.4, 'assets/gear/aic_heavy_kit.png'),
    ('hot_work_kit', 'kits', 'Hot Work Power Bank', 'hot_work', 5, 'Strength', 32, 'Agility', 21, 'Arts Intensity', 41.4, 21, 'assets/gear/hot_work_kit.png'),
    ('hot_work_pyrometer_kit', 'kits', 'Hot Work Pyrometer', 'hot_work', 5, 'Intellect', 41, null, null, 'Battle Skill DMG Bonus %', 41.4, 21, 'assets/gear/hot_work_kit.png'),
    ('hot_work_power_cartridge_kit', 'kits', 'Hot Work Power Cartridge', 'hot_work', 5, 'Will', 32, 'Intellect', 21, 'Arts Intensity', 41.4, 21, 'assets/gear/hot_work_kit.png'),
    ('frontiers_kit', 'kits', 'Frontiers Comm', 'frontiers', 5, 'Strength', 32, 'Agility', 21, 'Combo Skill DMG Bonus %', 41.4, 21, 'assets/gear/frontiers_kit.png'),
    ('frontiers_extra_o2_tube_kit', 'kits', 'Frontiers Extra O2 Tube', 'frontiers', 5, 'Agility', 32, 'Intellect', 21, 'Main Attribute %', 20.7, 21, 'assets/gear/frontiers_kit.png'),
    ('tide_surge_kit', 'kits', 'Hanging River O2 Tube', 'tide_surge', 5, 'Strength', 32, 'Will', 21, 'All DMG Bonus %', 23, 21, 'assets/gear/tide_surge_kit.png'),
    ('turbid_cutting_torch_kit', 'kits', 'Turbid Cutting Torch', 'tide_surge', 5, 'Intellect', 32, 'Strength', 21, 'Arts DMG Bonus %', 27.6, 21, 'assets/gear/tide_surge_kit.png');

commit;

