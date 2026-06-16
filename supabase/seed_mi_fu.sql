-- Seed Mi Fu for Supabase.
-- Run this after supabase/schema.sql.
-- Image placeholders expected:
--   assets/operators/avatars/Mi_Fu.png
--   assets/operators/skills/mifu/fs_small.png
--   assets/operators/skills/mifu/bs_1.svg
--   assets/operators/skills/mifu/bs_2.png
--   assets/operators/skills/mifu/bs_3.svg
--   assets/operators/skills/mifu/cs_small.svg
--   assets/operators/skills/mifu/ult_small.svg

begin;

insert into public.operators (
    id,
    game,
    slug,
    name,
    star,
    operator_class,
    element_type,
    icon_path,
    can_enter_ultimate_state,
    sort_order,
    raw_data
) values (
    27,
    'arknights_endfield',
    'mi_fu',
    'Mi Fu',
    6,
    'Guard',
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    false,
    27,
    '{"id":27,"name":"Mi Fu","star":6,"operatorClass":"Guard","icon":"assets/operators/avatars/Mi_Fu.png","elementType":"physical","weaponType":"Greatsword","mainAttribute":"Strength","secondaryAttribute":"Will","race":"Sarkaz","faction":"Hongshan Academy of Sciences","voiceActors":{"en":"Rao Zijun","jp":"Akeno Watanabe"},"stats":{"level1":{"hp":500,"attack":30,"strength":22,"agility":10,"intellect":9,"will":14},"level90":{"hp":5495,"attack":315,"strength":174,"agility":92,"intellect":90,"will":143}},"attributeIncreases":{"strength":[10,15,15,20]},"talents":[{"name":"Stern Crackdown","levels":[{"level":1,"worldSplitterMultiplierAgainstPhysicalSusceptibilityOrStagger":1.1},{"level":2,"worldSplitterMultiplierAgainstPhysicalSusceptibilityOrStagger":1.2}]},{"name":"Vigilant Fury","levels":[{"level":1,"shieldMaxHpPercent":15,"durationSeconds":10,"cooldownSeconds":60},{"level":2,"shieldMaxHpPercent":30,"durationSeconds":10,"cooldownSeconds":60}]}],"potentials":[{"level":1,"name":"Restless Watch","comboCooldownReductionSeconds":2,"physicalSusceptibilityBonusPercent":5,"physicalSusceptibilityDurationBonusSeconds":4},{"level":2,"name":"Kinesthesia of Harmony","strength":20,"artsIntensity":16},{"level":3,"name":"Complete Warmup","shieldDurationBonusSeconds":5,"shieldCooldownReductionSeconds":15,"attackBonusPercent":6,"attackBonusDurationSeconds":20},{"level":4,"name":"Qi Thrice-Refined","ultimateEnergyCostReductionPercent":15},{"level":5,"name":"Pugilist of the Stockade","battleSkillDamageMultiplier":1.1,"ultimateStaggerBonus":5}],"dataStatus":"live"}'::jsonb
)
on conflict (id) do update set
    game = excluded.game,
    slug = excluded.slug,
    name = excluded.name,
    star = excluded.star,
    operator_class = excluded.operator_class,
    element_type = excluded.element_type,
    icon_path = excluded.icon_path,
    can_enter_ultimate_state = excluded.can_enter_ultimate_state,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data,
    updated_at = now();

delete from public.operator_skills
where operator_id = 27;

insert into public.operator_skills (
    id,
    operator_id,
    slot_index,
    name,
    skill_type,
    short_type,
    cooldown,
    energy,
    element_type,
    icon_path,
    icon_small_path,
    description,
    combo_trigger,
    combo_trigger_mode,
    raw_data
) values
(
    2701,
    27,
    1,
    'Fistmancer of Blades',
    'Final Strike',
    'FS',
    null,
    null,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/fs_small.png',
    'Performs up to 4 Physical attack sequences. The controlled operator''s Final Strike deals 25 Stagger; the finisher deals massive Physical DMG and recovers SP.',
    null,
    null,
    '{"id":2701,"name":"Fistmancer of Blades","icon":"assets/operators/avatars/Mi_Fu.png","iconSmall":"assets/operators/skills/mifu/fs_small.png","type":"Final Strike","shortType":"FS","cooldown":null,"energy":null,"elementType":"physical","description":"Performs up to 4 Physical attack sequences. The controlled operator''s Final Strike deals 25 Stagger; the finisher deals massive Physical DMG and recovers SP.","damageMultipliers":{"sequence1":34,"sequence2":38,"sequence3":61,"sequence4":77,"diveAttack":80,"finisherAttack":400},"finalStrikeStagger":25,"debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}]}'::jsonb
),
(
    2702,
    27,
    2,
    'Qingbo Triplex - Cloudtrapper',
    'Battle Skill',
    'BS',
    null,
    100,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/bs_1.svg',
    'Costs 100 SP and recovers 50 SP after casting. Mi Fu fires a claw chain from her finger gauntlet, dealing Physical DMG to the target and nearby enemies, then attempts to pull them toward her. After casting, the next Battle Skill is replaced with Trail and Mangle.',
    null,
    null,
    '{"id":2702,"name":"Qingbo Triplex - Cloudtrapper","icon":"assets/operators/avatars/Mi_Fu.png","iconSmall":"assets/operators/skills/mifu/bs_1.svg","type":"Battle Skill","shortType":"BS","cooldown":null,"energy":100,"sp_cost":100,"spRecovery":{"amount":50,"source":"Qingbo Triplex - Cloudtrapper"},"elementType":"physical","description":"Costs 100 SP and recovers 50 SP after casting. Mi Fu fires a claw chain from her finger gauntlet, dealing Physical DMG to the target and nearby enemies, then attempts to pull them toward her. After casting, the next Battle Skill is replaced with Trail and Mangle.","skillRank":9,"damageMultiplier":67,"qingboMove":1,"nextQingboMove":2,"debuffs":[{"id":"pull","name":"Pull","appliesEffect":"pull","persistsForCombo":false,"visible":true}]}'::jsonb
),
(
    2705,
    27,
    3,
    'Qingbo Triplex - Trail and Mangle',
    'Battle Skill',
    'BS',
    null,
    50,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/bs_2.png',
    'Costs 50 SP. Mi Fu unleashes a flurry of strikes that deal Physical DMG and applies 1 Vulnerability stack, with the final hit applying Crush. If that Crush consumes at least 3 Vulnerability stacks, the next Battle Skill is replaced with World Splitter.',
    null,
    null,
    '{"id":2705,"name":"Qingbo Triplex - Trail and Mangle","icon":"assets/operators/avatars/Mi_Fu.png","iconSmall":"assets/operators/skills/mifu/bs_2.png","type":"Battle Skill","shortType":"BS","cooldown":null,"energy":50,"sp_cost":50,"elementType":"physical","description":"Costs 50 SP. Mi Fu unleashes a flurry of strikes that deal Physical DMG and applies 1 Vulnerability stack, with the final hit applying Crush. If that Crush consumes at least 3 Vulnerability stacks, the next Battle Skill is replaced with World Splitter.","skillRank":9,"damageMultiplier":89,"stagger":5,"qingboMove":2,"requiresConsumedVulnerableStacks":3,"nextQingboMove":3,"fallbackQingboMove":1,"consumeDebuffs":["vulnerable"],"debuffs":[{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"crush","name":"Crush","appliesEffect":"crush","persistsForCombo":false,"visible":true}]}'::jsonb
),
(
    2706,
    27,
    4,
    'Qingbo Triplex - World Splitter',
    'Battle Skill',
    'BS',
    null,
    50,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/bs_3.svg',
    'Costs 50 SP. Mi Fu deals massive Physical DMG to enemies in the selected area. The damage is treated as Crush DMG instead of Battle Skill DMG.',
    null,
    null,
    '{"id":2706,"name":"Qingbo Triplex - World Splitter","icon":"assets/operators/avatars/Mi_Fu.png","iconSmall":"assets/operators/skills/mifu/bs_3.svg","type":"Battle Skill","shortType":"BS","cooldown":null,"energy":50,"sp_cost":50,"elementType":"physical","description":"Costs 50 SP. Mi Fu deals massive Physical DMG to enemies in the selected area. The damage is treated as Crush DMG instead of Battle Skill DMG.","skillRank":9,"damageMultiplier":400,"stagger":10,"qingboMove":3,"nextQingboMove":1,"debuffs":[{"id":"crush","name":"Crush","appliesEffect":"crush","persistsForCombo":false,"visible":true}]}'::jsonb
),
(
    2703,
    27,
    5,
    'Fists of No Regrets',
    'Combo Skill',
    'CS',
    20,
    0,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/cs_small.svg',
    'Triggers when an enemy has at least 3 Vulnerability stacks. Deals Physical DMG, applies 5% Physical Susceptibility for 16 seconds, gains 10 Ultimate Energy, and replaces the next Battle Skill with Trail and Mangle.',
    '3 Vulnerability stacks',
    'all',
    '{"id":2703,"name":"Fists of No Regrets","icon":"assets/operators/avatars/Mi_Fu.png","iconSmall":"assets/operators/skills/mifu/cs_small.svg","type":"Combo Skill","shortType":"CS","cooldown":20,"energy":0,"elementType":"physical","description":"Triggers when an enemy has at least 3 Vulnerability stacks. Deals Physical DMG, applies 5% Physical Susceptibility for 16 seconds, gains 10 Ultimate Energy, and replaces the next Battle Skill with Trail and Mangle.","damageMultiplier":111,"stagger":10,"ultimateEnergyGain":10,"nextQingboMove":2,"comboTrigger":"3 Vulnerability stacks","comboTriggerMode":"all","allowSelfTrigger":true,"comboTriggers":[{"effect":"vulnerable","minStacks":3}],"debuffs":[{"id":"physical_susceptibility","name":"Physical Susceptibility","appliesEffect":"physical_susceptibility","persistsForCombo":true,"visible":true,"stackable":false,"valuePercent":5,"durationSeconds":16}]}'::jsonb
),
(
    2704,
    27,
    6,
    'Pile of No Mercy',
    'Ultimate',
    'Ult',
    15,
    80,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/ult_small.svg',
    'Forcibly Lifts a target, then slams it down for Physical DMG. After casting, the next Battle Skill is replaced with Trail and Mangle.',
    null,
    null,
    '{"id":2704,"name":"Pile of No Mercy","icon":"assets/operators/avatars/Mi_Fu.png","iconSmall":"assets/operators/skills/mifu/ult_small.svg","type":"Ultimate","shortType":"Ult","cooldown":15,"energy":80,"elementType":"physical","description":"Forcibly Lifts a target, then slams it down for Physical DMG. After casting, the next Battle Skill is replaced with Trail and Mangle.","damageMultiplier":311,"stagger":20,"nextQingboMove":2,"debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true}]}'::jsonb
)
on conflict (id) do update set
    operator_id = excluded.operator_id,
    slot_index = excluded.slot_index,
    name = excluded.name,
    skill_type = excluded.skill_type,
    short_type = excluded.short_type,
    cooldown = excluded.cooldown,
    energy = excluded.energy,
    element_type = excluded.element_type,
    icon_path = excluded.icon_path,
    icon_small_path = excluded.icon_small_path,
    description = excluded.description,
    combo_trigger = excluded.combo_trigger,
    combo_trigger_mode = excluded.combo_trigger_mode,
    raw_data = excluded.raw_data,
    updated_at = now();

commit;
