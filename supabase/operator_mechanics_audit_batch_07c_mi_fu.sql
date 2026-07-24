begin;

-- Operator mechanics audit, batch 07C: Mi Fu.
-- Runtime code only interprets these generic fields; Mi Fu's values and conditions live here.

update public.operator_skills
set atk_multiplier = 1.50,
    flat_damage = 0,
    hit_count = 1,
    damage_element = 'physical',
    damage_verified = true,
    damage_source_url = 'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills',
    raw_data = raw_data || '{
      "skillRank":12,
      "damageMultiplier":150,
      "qingboMove":1,
      "nextQingboMove":2
    }'::jsonb,
    updated_at = now()
where id = 2702 and operator_id = 27;

update public.operator_skills
set atk_multiplier = 2.00,
    flat_damage = 0,
    hit_count = 1,
    damage_element = 'physical',
    damage_verified = true,
    damage_source_url = 'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills',
    raw_data = raw_data || '{
      "skillRank":12,
      "damageMultiplier":200,
      "qingboMove":2,
      "requiresConsumedVulnerableStacks":3,
      "nextQingboMove":3,
      "fallbackQingboMove":1,
      "consumeDebuffs":["vulnerable"],
      "debuffs":[{"id":"crush","name":"Crush","appliesEffect":"crush","persistsForCombo":false,"visible":true}],
      "physicalStatusResolution":{
        "statusEffect":"crush",
        "statusName":"Crush",
        "vulnerableEffect":"vulnerable",
        "consumeAllVulnerable":true,
        "vulnerableApplication":{"name":"Vulnerable","visible":true,"stacksApplied":1,"maxStacks":4},
        "statusApplication":{"name":"Crush","visible":true},
        "damageAtkMultiplierByStacks":{"1":3.0,"2":4.5,"3":6.0,"4":7.5},
        "damageType":"crush",
        "artsIntensityScaling":true,
        "operatorLevelScaling":true,
        "staggeredDamageMultiplier":1.3,
        "verified":true,
        "sourceUrl":"https://endfield.wiki.gg/wiki/Crush"
      }
    }'::jsonb,
    updated_at = now()
where id = 2705 and operator_id = 27;

update public.operator_skills
set atk_multiplier = 6.00,
    flat_damage = 0,
    hit_count = 1,
    damage_element = 'physical',
    damage_verified = true,
    damage_source_url = 'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills',
    raw_data = raw_data || '{
      "skillRank":12,
      "damageMultiplier":600,
      "qingboMove":3,
      "nextQingboMove":1,
      "damageType":"crush",
      "artsIntensityScaling":true,
      "operatorLevelScaling":true,
      "staggeredDamageMultiplier":1.3
    }'::jsonb,
    updated_at = now()
where id = 2706 and operator_id = 27;

update public.operator_skills
set atk_multiplier = 2.50,
    flat_damage = 0,
    hit_count = 1,
    damage_element = 'physical',
    damage_verified = true,
    damage_source_url = 'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills',
    raw_data = raw_data || '{
      "skillRank":12,
      "damageMultiplier":250,
      "nextQingboMove":2,
      "comboTriggers":[{"effect":"vulnerable","minStacks":3}]
    }'::jsonb,
    updated_at = now()
where id = 2703 and operator_id = 27;

update public.operator_skills
set atk_multiplier = 7.00,
    flat_damage = 0,
    hit_count = 1,
    damage_element = 'physical',
    damage_verified = true,
    damage_source_url = 'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills',
    raw_data = raw_data || '{
      "skillRank":12,
      "damageMultiplier":700,
      "nextQingboMove":2,
      "debuffs":[
        {"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true},
        {"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}
      ]
    }'::jsonb,
    updated_at = now()
where id = 2704 and operator_id = 27;

-- Level-12 Basic/Final Strike coefficients are stored with the operator skill too.
update public.operator_skills
set raw_data = raw_data || '{
      "skillRank":12,
      "damageMultipliers":{
        "sequence1":76,
        "sequence2":86,
        "sequence3":136,
        "sequence4":172,
        "diveAttack":180,
        "finisherAttack":900
      }
    }'::jsonb,
    updated_at = now()
where id = 2701 and operator_id = 27;

commit;

select id, name, atk_multiplier, damage_verified, raw_data->>'skillRank' as skill_rank
from public.operator_skills
where operator_id = 27
order by slot_index;
