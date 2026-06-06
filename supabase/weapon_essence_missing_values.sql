-- Missing weapon Essence values for Arknights: Endfield.
-- Checked: 2026-06-05.
--
-- Current result:
-- All 28 weapons from supabase/equipment.sql have verified rank 1-9 values.
-- This file is an audit plus a safe template for future or incomplete weapons.
--
-- Run supabase/weapon_essence_exact_values_update.sql first.

select
    weapon.weapon_key,
    weapon.name,
    weapon.rarity,
    case
        when profile.weapon_key is null then 'profile missing'
        when profile.verified is not true then 'not verified'
        when profile.primary_values is null or cardinality(profile.primary_values) <> 9
            then 'primary rank values missing'
        when weapon.rarity > 3
            and (profile.secondary_values is null or cardinality(profile.secondary_values) <> 9)
            then 'secondary rank values missing'
        when jsonb_array_length(coalesce(profile.skill_descriptions, '[]'::jsonb)) <> 9
            then 'skill rank descriptions missing'
        else 'complete'
    end as missing_value
from public.weapons as weapon
left join public.weapon_essence_profiles as profile
    on profile.weapon_key = weapon.weapon_key
where weapon.game = 'arknights_endfield'
  and (
      profile.weapon_key is null
      or profile.verified is not true
      or profile.primary_values is null
      or cardinality(profile.primary_values) <> 9
      or (
          weapon.rarity > 3
          and (
              profile.secondary_values is null
              or cardinality(profile.secondary_values) <> 9
          )
      )
      or jsonb_array_length(coalesce(profile.skill_descriptions, '[]'::jsonb)) <> 9
  )
order by weapon.weapon_type, weapon.rarity desc, weapon.name;

-- Template for a future weapon.
-- Keep verified = false until every value has been checked against a source.
-- Remove the surrounding /* ... */ before running the filled template.
/*
insert into public.weapon_essence_profiles (
    weapon_key,
    primary_label,
    primary_values,
    primary_is_percent,
    secondary_label,
    secondary_values,
    secondary_is_percent,
    skill_name,
    skill_descriptions,
    primary_base_ranks,
    secondary_base_ranks,
    primary_max_essence,
    secondary_max_essence,
    skill_max_essence,
    source_url,
    source_note,
    verified
) values (
    'replace_weapon_key',
    'Replace Primary Label',
    array[null, null, null, null, null, null, null, null, null]::numeric[],
    false,
    'Replace Secondary Label',
    array[null, null, null, null, null, null, null, null, null]::numeric[],
    false,
    'Replace Weapon Skill',
    '[
        "Rank 1 TODO",
        "Rank 2 TODO",
        "Rank 3 TODO",
        "Rank 4 TODO",
        "Rank 5 TODO",
        "Rank 6 TODO",
        "Rank 7 TODO",
        "Rank 8 TODO",
        "Rank 9 TODO"
    ]'::jsonb,
    array[1, 2, 2, 3, 3]::smallint[],
    array[1, 1, 2, 2, 3]::smallint[],
    6,
    6,
    4,
    'https://replace-with-source.example',
    'TODO: verify every rank value',
    false
)
on conflict (weapon_key) do update set
    primary_label = excluded.primary_label,
    primary_values = excluded.primary_values,
    primary_is_percent = excluded.primary_is_percent,
    secondary_label = excluded.secondary_label,
    secondary_values = excluded.secondary_values,
    secondary_is_percent = excluded.secondary_is_percent,
    skill_name = excluded.skill_name,
    skill_descriptions = excluded.skill_descriptions,
    primary_base_ranks = excluded.primary_base_ranks,
    secondary_base_ranks = excluded.secondary_base_ranks,
    primary_max_essence = excluded.primary_max_essence,
    secondary_max_essence = excluded.secondary_max_essence,
    skill_max_essence = excluded.skill_max_essence,
    source_url = excluded.source_url,
    source_note = excluded.source_note,
    verified = false,
    updated_at = now();
*/
