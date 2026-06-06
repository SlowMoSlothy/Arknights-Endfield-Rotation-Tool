-- Operator and weapon base combat stats for Arknights: Endfield.
-- Run after supabase/schema.sql, supabase/seed_operators_basic.sql,
-- supabase/seed_mi_fu.sql and supabase/equipment.sql.
--
-- Operator values are level 90 base values.
-- Weapon values are max-level base ATK values.
-- Formula reference: Prydwen Combat Basics describes operator ATK as
-- operator base ATK + weapon base ATK, with Main/Secondary attribute scaling.
-- Mi Fu is kept without HP/ATK because no reliable published stats were found.
-- Run supabase/operator_level_stats_update.sql afterwards to add the exact
-- level 1-to-90 operator growth range used by the level slider.

begin;

alter table public.operators add column if not exists base_hp integer;
alter table public.operators add column if not exists base_atk integer;
alter table public.operators add column if not exists base_strength integer;
alter table public.operators add column if not exists base_agility integer;
alter table public.operators add column if not exists base_intellect integer;
alter table public.operators add column if not exists base_will integer;
alter table public.operators add column if not exists base_stats_level integer;

alter table public.weapons add column if not exists base_atk integer;
alter table public.weapons add column if not exists base_atk_level_1 integer;
alter table public.weapons add column if not exists base_stats_level integer;

with operator_combat_stat_source (
    slug,
    name,
    base_hp,
    base_atk,
    base_strength,
    base_agility,
    base_intellect,
    base_will,
    base_stats_level,
    source_url,
    source_note
) as (
    values
        ('ardelia', 'Ardelia', 5495, 292, 121, 85, 150, 126, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('antal', 'Antal', 5495, 297, 88, 100, 132, 82, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('alesh', 'Alesh', 5495, 303, 137, 99, 120, 90, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('chen_qianyu', 'Chen Qianyu', 5495, 335, 140, 159, 80, 85, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('catcher', 'Catcher', 5495, 303, 158, 86, 85, 110, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('da_pan', 'Da Pan', 5495, 336, 145, 90, 95, 107, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('ember', 'Ember', 5495, 323, 165, 85, 80, 114, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('estella', 'Estella', 5495, 297, 124, 86, 86, 118, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('fluorite', 'Fluorite', 5495, 288, 85, 130, 110, 86, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('last_rite', 'Last Rite', 5495, 340, 169, 119, 85, 104, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('lifeng', 'Lifeng', 5495, 311, 130, 164, 95, 85, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('snowshine', 'Snowshine', 5495, 303, 160, 90, 85, 110, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('wulfgard', 'Wulfgard', 5495, 323, 145, 120, 85, 95, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('xaihi', 'Xaihi', 5495, 281, 86, 84, 115, 150, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('pogranichnik', 'Pogranichnik', 5495, 297, 139, 95, 115, 148, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('zhuang', 'Zhuang', 5495, 326, 99, 99, 123, 184, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('avywenna', 'Avywenna', 5495, 326, 97, 140, 95, 149, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('arclight', 'Arclight', 5495, 297, 129, 152, 95, 85, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('laevatain', 'Laevatain', 5495, 323, 110, 85, 187, 135, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('akekuri', 'Akekuri', 5495, 297, 115, 132, 97, 90, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('endministrator', 'Endministrator', 5495, 300, 135, 139, 95, 85, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('perlica', 'Perlica', 5495, 311, 105, 90, 154, 130, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('rossi', 'Rossi', 5495, 288, 99, 184, 123, 99, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('tangtang', 'Tangtang', 5495, 303, 135, 160, 90, 85, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('gilberta', 'Gilberta', 5495, 326, 105, 85, 125, 160, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('yvonne', 'Yvonne', 5495, 297, 95, 125, 165, 85, 90, 'https://www.prydwen.gg/arknights-endfield/characters-stats/', 'Prydwen character stats table, level 90, checked 2026-06-05'),
        ('mi_fu', 'Mi Fu', null, null, null, null, null, null, null, 'https://blog.prydwen.gg/2026/05/22/arknights-endfield-special-program-sketches-of-lost-heirlooms-summary/', 'Mi Fu has preview data only; level 90 combat stats not reliably published yet, checked 2026-06-05')
)
update public.operators as op
set
    base_hp = coalesce(src.base_hp, op.base_hp),
    base_atk = coalesce(src.base_atk, op.base_atk),
    base_strength = coalesce(src.base_strength, op.base_strength),
    base_agility = coalesce(src.base_agility, op.base_agility),
    base_intellect = coalesce(src.base_intellect, op.base_intellect),
    base_will = coalesce(src.base_will, op.base_will),
    base_stats_level = coalesce(src.base_stats_level, op.base_stats_level),
    raw_data = jsonb_strip_nulls(
        coalesce(op.raw_data, '{}'::jsonb) ||
        jsonb_build_object(
            'baseHp', coalesce(src.base_hp, op.base_hp),
            'baseAtk', coalesce(src.base_atk, op.base_atk),
            'baseStrength', coalesce(src.base_strength, op.base_strength),
            'baseAgility', coalesce(src.base_agility, op.base_agility),
            'baseIntellect', coalesce(src.base_intellect, op.base_intellect),
            'baseWill', coalesce(src.base_will, op.base_will),
            'baseStatsLevel', coalesce(src.base_stats_level, op.base_stats_level),
            'baseStatsSourceUrl', src.source_url,
            'baseStatsSourceNote', src.source_note,
            'baseStatsMissing', (
                coalesce(src.base_hp, op.base_hp) is null
                or coalesce(src.base_atk, op.base_atk) is null
                or coalesce(src.base_strength, op.base_strength) is null
                or coalesce(src.base_agility, op.base_agility) is null
                or coalesce(src.base_intellect, op.base_intellect) is null
                or coalesce(src.base_will, op.base_will) is null
            )
        )
    ),
    updated_at = now()
from operator_combat_stat_source as src
where op.game = 'arknights_endfield'
  and op.slug = src.slug;

with weapon_combat_stat_source (
    weapon_key,
    name,
    base_atk,
    base_atk_level_1,
    base_stats_level,
    source_url,
    source_note
) as (
    values
        ('tarr_11', 'Tarr 11', 283, 29, 90, 'https://ngae.end.wiki/en/weapons/handcannon/101', 'Published weapon ATK curve, levels 1 to 90, checked 2026-06-05'),
        ('wave_tide', 'Wave Tide', 341, 35, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('obj_edge_of_lightness', 'OBJ Edge of Lightness', 411, 42, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('aspirant', 'Aspirant', 411, 42, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('fortmaker', 'Fortmaker', 411, 42, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('forgeborn_scathe', 'Forgeborn Scathe', 510, 52, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('glorious_memory', 'Glorious Memory', 490, 50, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('grand_vision', 'Grand Vision', 500, 51, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('rapid_ascent', 'Rapid Ascent', 495, 51, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('thermite_cutter', 'Thermite Cutter', 490, 50, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('umbral_torch', 'Umbral Torch', 490, 50, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('darhoff_7', 'Darhoff 7', 283, 29, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('industry_01', 'Industry 0.1', 341, 35, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('obj_heavy_burden', 'OBJ Heavy Burden', 411, 42, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('exemplar', 'Exemplar', 500, 51, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('former_finery', 'Former Finery', 495, 51, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('sundered_prince', 'Sundered Prince', 490, 50, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('thunderberge', 'Thunderberge', 495, 51, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('opero_77', 'Opero 77', 283, 29, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('obj_razorhorn', 'OBJ Razorhorn', 411, 42, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('valiant', 'Valiant', 495, 51, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('jiminy_12', 'Jiminy 12', 283, 29, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('obj_arts_identifier', 'OBJ Arts Identifier', 411, 42, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('flickers_in_the_mist', 'Flickers in the Mist', 490, 50, 90, 'https://endfield.wiki.gg/wiki/Flickers_in_the_Mist', 'Published weapon ATK curve, levels 1 to 90, checked 2026-06-05'),
        ('lone_barge', 'Lone Barge', 510, 52, 90, 'https://www.icy-veins.com/arknights-endfield/weapons/lone-barge', 'Published weapon ATK curve, levels 1 to 90, checked 2026-06-05'),
        ('peco_5', 'Peco 5', 283, 29, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('howling_guard', 'Howling Guard', 341, 35, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('artzy_tyrannical', 'Artzy Tyrannical', 505, 52, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05'),
        ('brigands_calling', 'Brigand''s Calling', 505, 52, 90, 'https://game8.co/games/Arknights-Endfield/archives/523484', 'Published max ATK with the standard weapon ATK curve, checked 2026-06-05')
)
update public.weapons as weapon
set
    base_atk = src.base_atk,
    base_atk_level_1 = src.base_atk_level_1,
    base_stats_level = src.base_stats_level,
    raw_data = jsonb_strip_nulls(
        coalesce(weapon.raw_data, '{}'::jsonb) ||
        jsonb_build_object(
            'baseAtk', src.base_atk,
            'baseAtkLevel1', src.base_atk_level_1,
            'baseStatsLevel', src.base_stats_level,
            'baseAtkSourceUrl', src.source_url,
            'baseAtkSourceNote', src.source_note
        )
    ),
    updated_at = now()
from weapon_combat_stat_source as src
where weapon.game = 'arknights_endfield'
  and weapon.weapon_key = src.weapon_key;

commit;

select
    slug,
    name,
    base_hp,
    base_atk,
    base_strength,
    base_agility,
    base_intellect,
    base_will,
    base_stats_level
from public.operators
where game = 'arknights_endfield'
order by sort_order, name;

select
    weapon_key,
    name,
    base_atk,
    base_atk_level_1,
    base_stats_level
from public.weapons
where game = 'arknights_endfield'
order by sort_order, name;
