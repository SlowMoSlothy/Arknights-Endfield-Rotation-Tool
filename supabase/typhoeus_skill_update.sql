begin;

-- Typhoeus live skill data (Endfield 1.5, Rank 12).
-- The internal Sign/Hunting Arrow loop is retained as structured metadata so the
-- generic planner can expose the Combo trigger without hard-coding the operator.
insert into public.operator_skills (
    id, operator_id, slot_index, name, skill_type, short_type, cooldown, energy,
    element_type, icon_path, icon_small_path, description, combo_trigger,
    combo_trigger_mode, atk_multiplier, flat_damage, hit_count, damage_element,
    damage_verified, damage_source_url, raw_data
) values
(
    900031, 31, 1, 'Wildlands Huntress', 'Final Strike', 'FS', null, null,
    'nature', 'assets/operators/avatars/typhoeus.png', 'assets/operators/skills/typhoeus/fs_small.png',
    'Performs a five-shot Nature basic attack chain. The controlled Final Strike deals 17 Stagger; the Finisher deals 900% ATK.',
    null, null, 9.00, 0, 1, 'nature', true,
    'https://www.icy-veins.com/arknights-endfield/typhoeus-profile-skills',
    '{
      "skillRank":12,
      "damageMultiplier":900,
      "damageProfile":{"atkMultiplier":9.0,"flatDamage":0,"hitCount":1,"element":"nature","verified":true},
      "basicAttackMultipliers":[0.46,0.56,0.86,0.95,1.25],
      "finisherAtkMultiplier":9.0,
      "diveAtkMultiplier":1.8,
      "stagger":17,
      "debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"transientTrigger":true,"visible":false}],
      "iconSourceUrl":"https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/typhoeus/wildlands-huntress.png"
    }'::jsonb
),
(
    3102, 31, 2, 'Piercing Arrows of the Woods', 'Battle Skill', 'BS', null, 100,
    'nature', 'assets/operators/avatars/typhoeus.png', 'assets/operators/skills/typhoeus/bs_small.png',
    'Deals Nature DMG, enters Hovering and enables 5 Aerial Basic Attacks. These consume Nature Infliction and Hunting Arrows to gain Signs, Ultimate Energy and forced Nature Bursts.',
    null, null, 4.10, 0, 6, 'nature', true,
    'https://www.icy-veins.com/arknights-endfield/typhoeus-profile-skills',
    '{
      "skillRank":12,
      "sp_cost":100,
      "damageMultiplier":410,
      "damageProfile":{"atkMultiplier":4.1,"flatDamage":0,"hitCount":6,"element":"nature","verified":true},
      "damageSequences":[
        {"sequenceIndex":1,"label":"Initial Aerial Shot","atkMultiplier":0.5},
        {"sequenceIndex":2,"label":"ABATK 1","atkMultiplier":0.65},
        {"sequenceIndex":3,"label":"ABATK 2","atkMultiplier":0.65},
        {"sequenceIndex":4,"label":"ABATK 3","atkMultiplier":0.65},
        {"sequenceIndex":5,"label":"ABATK 4","atkMultiplier":0.65},
        {"sequenceIndex":6,"label":"Aerial Final Strike","atkMultiplier":1.0}
      ],
      "hovering":{"aerialBasicAttackUses":5,"maximumTargets":2,"controlledFifthAttackIsFinalStrike":true,"controlledFifthAttackIsPowerShot":true},
      "natureInflictionConsumption":{"effect":"nature_infliction","stacksPerAbatk":1,"signsPerConsumption":1,"ultimateEnergyPerConsumption":12},
      "huntingArrowConsumption":{"stacksPerAbatk":1,"powerShotDamageMultiplier":1.6,"forcedEffect":"nature_burst","consumedInflictionBurstMultiplier":1.3},
      "stagger":20,
      "iconSourceUrl":"https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/typhoeus/piercing-arrows-of-the-woods.png"
    }'::jsonb
),
(
    3103, 31, 3, 'Rampant Thorns', 'Combo Skill', 'CS', 19, 0,
    'nature', 'assets/operators/avatars/typhoeus.png', 'assets/operators/skills/typhoeus/cs_small.png',
    'Triggers at 8 Signs. Converts every 2 Signs into 1 Hunting Arrow, resets Aerial Basic Attacks and creates a 6-second Barrage Array.',
    '8 Signs', 'all', 5.00, 0, 4, 'nature', true,
    'https://www.icy-veins.com/arknights-endfield/typhoeus-profile-skills',
    '{
      "skillRank":12,
      "damageMultiplier":500,
      "damageProfile":{"atkMultiplier":5.0,"flatDamage":0,"hitCount":4,"element":"nature","verified":true},
      "damageSequences":[
        {"sequenceIndex":1,"label":"Huntress Gaze","atkMultiplier":2.0},
        {"sequenceIndex":2,"label":"Barrage Array 1","atkMultiplier":1.0},
        {"sequenceIndex":3,"label":"Barrage Array 2","atkMultiplier":1.0},
        {"sequenceIndex":4,"label":"Barrage Array 3","atkMultiplier":1.0}
      ],
      "comboTriggerMode":"all",
      "comboTriggers":[{"effect":"typhoeus_sign","minStacks":8}],
      "resourceConversion":{"consumeEffect":"typhoeus_sign","consumeAll":true,"grantEffect":"typhoeus_hunting_arrow","ratio":0.5,"maxStacks":4},
      "resetsAerialBasicAttacks":true,
      "ultimateEnergyGain":10,
      "stagger":10,
      "debuffs":[
        {"id":"barrage_array_slow","name":"Barrage Array Slow","appliesEffect":"slow","valuePercent":40,"durationSeconds":6,"persistsForCombo":false,"visible":true},
        {"id":"barrage_array_nature_burst_damage_taken","name":"Nature Burst DMG Taken","appliesEffect":"nature_burst_damage_taken","valuePercent":10,"durationSeconds":6,"persistsForCombo":false,"visible":true}
      ],
      "iconSourceUrl":"https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/typhoeus/rampant-thorns.png"
    }'::jsonb
),
(
    3104, 31, 4, 'Call of Ice Mountain', 'Ultimate', 'Ult', 10, 200,
    'nature', 'assets/operators/avatars/typhoeus.png', 'assets/operators/skills/typhoeus/ult_small.png',
    'Fires an Imbued Arrow, enters Hovering, resets Aerial Basic Attacks, grants 2 Hunting Arrows and adds a Hail of Arrows to the next 5 ABATKs.',
    null, null, 8.00, 0, 6, 'nature', true,
    'https://www.icy-veins.com/arknights-endfield/typhoeus-profile-skills',
    '{
      "skillRank":12,
      "damageMultiplier":800,
      "damageProfile":{"atkMultiplier":8.0,"flatDamage":0,"hitCount":6,"element":"nature","verified":true},
      "damageSequences":[
        {"sequenceIndex":1,"label":"Imbued Arrow","atkMultiplier":3.0},
        {"sequenceIndex":2,"label":"Hail of Arrows 1","atkMultiplier":0.75},
        {"sequenceIndex":3,"label":"Hail of Arrows 2","atkMultiplier":0.75},
        {"sequenceIndex":4,"label":"Hail of Arrows 3","atkMultiplier":0.75},
        {"sequenceIndex":5,"label":"Hail of Arrows 4","atkMultiplier":0.75},
        {"sequenceIndex":6,"label":"Empowered Hail of Arrows","atkMultiplier":2.0}
      ],
      "hovering":{"aerialBasicAttackUses":5,"resetsAerialBasicAttacks":true},
      "grantsResource":{"effect":"typhoeus_hunting_arrow","stacksApplied":2,"maxStacks":4},
      "stagger":20,
      "iconSourceUrl":"https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/typhoeus/call-of-ice-mountain.png"
    }'::jsonb
)
on conflict (id) do update set
    operator_id=excluded.operator_id, slot_index=excluded.slot_index, name=excluded.name,
    skill_type=excluded.skill_type, short_type=excluded.short_type, cooldown=excluded.cooldown,
    energy=excluded.energy, element_type=excluded.element_type, icon_path=excluded.icon_path,
    icon_small_path=excluded.icon_small_path, description=excluded.description,
    combo_trigger=excluded.combo_trigger, combo_trigger_mode=excluded.combo_trigger_mode,
    atk_multiplier=excluded.atk_multiplier, flat_damage=excluded.flat_damage,
    hit_count=excluded.hit_count, damage_element=excluded.damage_element,
    damage_verified=excluded.damage_verified, damage_source_url=excluded.damage_source_url,
    raw_data=excluded.raw_data, updated_at=now();

commit;

select id, operator_id, slot_index, name, short_type, combo_trigger, icon_small_path
from public.operator_skills
where operator_id = 31
order by slot_index;
