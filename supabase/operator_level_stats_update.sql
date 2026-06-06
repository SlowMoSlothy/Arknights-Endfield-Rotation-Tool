-- Exact level 1 and level 90 operator stats used by the equipment editor.
-- Run this after supabase/schema.sql and the operator seed files.
-- Source checked 2026-06-05: https://endfield.games/en/characters/

begin;

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

with operator_level_stat_source (
    slug,
    strength_level_1,
    agility_level_1,
    intellect_level_1,
    will_level_1,
    hp_level_1,
    atk_level_1,
    strength_level_90,
    agility_level_90,
    intellect_level_90,
    will_level_90,
    hp_level_90,
    atk_level_90
) as (
    values
        ('ardelia', 9.8, 9.5, 20.1, 15.9, 500, 30, 112.1, 93.9, 145.9, 118.2, 5495, 323),
        ('ember', 21.6, 9.8, 8.8, 13.6, 500, 30, 176.4, 97, 86.8, 120.3, 5495, 323),
        ('endministrator', 14.7, 14.2, 9.8, 10.8, 500, 30, 123.7, 140.8, 97, 107.2, 5495, 319),
        ('gilberta', 9.1, 9.4, 16.1, 20.4, 500, 30, 89.8, 92.9, 127.2, 171.7, 5495, 329),
        ('laevatain', 13.6, 9.6, 22.3, 9.1, 500, 30, 121.4, 100, 178, 89.8, 5495, 318),
        ('last_rite', 21.6, 8.8, 9.5, 15.9, 500, 30, 155.2, 104.2, 93.9, 109.3, 5495, 332),
        ('lifeng', 14.7, 20.1, 13.4, 12.9, 500, 30, 123.7, 132.3, 115.5, 117.5, 5495, 312),
        ('pogranichnik', 12.4, 13.6, 10.3, 20.1, 500, 30, 101.2, 110.3, 97, 173.2, 5495, 321),
        ('rossi', 9.9, 23.2, 14.1, 9.1, 500, 30, 98, 176.6, 118.1, 89.8, 5495, 323),
        ('tangtang', 13.6, 23.5, 8.9, 10.3, 500, 30, 123.6, 179.6, 85.8, 102.1, 5495, 321),
        ('yvonne', 8.4, 14.7, 24.6, 10.6, 500, 30, 82.7, 128.2, 176.7, 105.1, 5495, 321),
        ('zhuang', 10, 10, 17, 24.7, 500, 30, 99, 99, 123.9, 184.3, 5495, 326),
        ('alesh', 20.1, 9.5, 13.6, 10.8, 500, 30, 158.1, 95.9, 125.8, 90, 5495, 309),
        ('arclight', 14, 14.7, 12.5, 10.1, 500, 30, 107.5, 145.4, 123.5, 100, 5495, 306),
        ('avywenna', 12.9, 10.8, 14.1, 15, 500, 30, 107.4, 106.7, 110.5, 148.5, 5495, 312),
        ('chen_qianyu', 10.8, 20.6, 8.9, 9.7, 500, 30, 106.7, 171.8, 85.8, 93.9, 5495, 297),
        ('da_pan', 24.3, 9.8, 10.1, 10.4, 500, 30, 175.1, 97, 95, 102.2, 5495, 303),
        ('perlica', 9.3, 9.5, 21.6, 13.6, 500, 30, 91.9, 93.9, 161.7, 113.6, 5495, 303),
        ('snowshine', 18.6, 12.4, 9.5, 11, 500, 30, 154.9, 104.6, 93.9, 108.9, 5495, 297),
        ('wulfgard', 18.6, 9.6, 9.4, 13.8, 500, 30, 161.7, 95.4, 92.9, 111.5, 5495, 294),
        ('xaihi', 9.3, 9.4, 15.9, 15.2, 500, 30, 89.8, 91.9, 127.1, 150, 5495, 291),
        ('akekuri', 13.4, 15.2, 12.5, 9.3, 500, 30, 110.4, 140.9, 106.8, 108, 5495, 319),
        ('antal', 15.9, 9.5, 15.5, 9.8, 500, 30, 129.4, 86.8, 165.2, 82.8, 5495, 297),
        ('catcher', 21.6, 9.8, 8.8, 11.5, 500, 30, 176.4, 97, 86.8, 106.7, 5495, 300),
        ('estella', 13, 8.8, 14.1, 15, 500, 30, 104.6, 97.9, 110.5, 151.5, 5495, 312),
        ('fluorite', 14, 14.7, 12.5, 10.1, 500, 30, 90.3, 168.2, 114.6, 91.9, 5495, 303)
)
update public.operators as op
set
    base_strength_level_1 = src.strength_level_1,
    base_agility_level_1 = src.agility_level_1,
    base_intellect_level_1 = src.intellect_level_1,
    base_will_level_1 = src.will_level_1,
    base_hp_level_1 = src.hp_level_1,
    base_atk_level_1 = src.atk_level_1,
    base_strength = src.strength_level_90,
    base_agility = src.agility_level_90,
    base_intellect = src.intellect_level_90,
    base_will = src.will_level_90,
    base_hp = src.hp_level_90,
    base_atk = src.atk_level_90,
    base_stats_level = 90,
    raw_data = coalesce(op.raw_data, '{}'::jsonb) || jsonb_build_object(
        'baseStrengthLevel1', src.strength_level_1,
        'baseAgilityLevel1', src.agility_level_1,
        'baseIntellectLevel1', src.intellect_level_1,
        'baseWillLevel1', src.will_level_1,
        'baseHpLevel1', src.hp_level_1,
        'baseAtkLevel1', src.atk_level_1,
        'baseStrength', src.strength_level_90,
        'baseAgility', src.agility_level_90,
        'baseIntellect', src.intellect_level_90,
        'baseWill', src.will_level_90,
        'baseHp', src.hp_level_90,
        'baseAtk', src.atk_level_90,
        'baseStatsLevel', 90,
        'baseStatsSourceUrl', 'https://endfield.games/en/characters/',
        'baseStatsSourceNote', 'Level 1 and level 90 character stat tables, checked 2026-06-05'
    ),
    updated_at = now()
from operator_level_stat_source as src
where op.game = 'arknights_endfield'
  and op.slug = src.slug;

commit;
