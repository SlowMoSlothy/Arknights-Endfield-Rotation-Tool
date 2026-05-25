-- Updates verified skill metadata for the fourth operator review batch.
-- Covers Endministrator, Catcher, Chen Qianyu, and Da Pan.
-- Run after supabase/schema.sql and after importing operator data.

begin;

with skill_updates(operator_id, skill_id, description, combo_trigger, combo_trigger_mode, raw_data) as (
    values
        (3, 301, 'Physical Final Strike.', null, null, '{"id":301,"name":"Destructive Sequence","icon":"assets/operators/avatars/Endmin.png","iconSmall":"assets/operators/skills/endmin/fs_small.png","type":"Final Strike","shortType":"FS","cooldown":0,"energy":0,"description":"Physical Final Strike.","elementType":"physical","debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}]}'::jsonb),
        (3, 302, 'Deals Physical DMG, applies Crush and Vulnerable, and can shatter Originium Crystals for burst damage.', null, null, '{"id":302,"name":"Constructive Sequence","icon":"assets/operators/avatars/Endmin.png","iconSmall":"assets/operators/skills/endmin/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"physical","description":"Deals Physical DMG, applies Crush and Vulnerable, and can shatter Originium Crystals for burst damage.","consumeDebuffs":["originium_crystal"],"debuffs":[{"id":"crush","name":"Crush","appliesEffect":"crush","persistsForCombo":false,"visible":true},{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}]}'::jsonb),
        (3, 303, 'Triggers when another operator uses a Combo Skill. Places Originium Crystals that can be shattered by Endministrator''s Battle Skill or Ultimate.', null, null, '{"id":303,"name":"Sealing Sequence","icon":"assets/operators/avatars/Endmin.png","iconSmall":"assets/operators/skills/endmin/cs_small.png","type":"Combo Skill","shortType":"CS","cooldown":16,"energy":0,"elementType":"physical","description":"Triggers when another operator uses a Combo Skill. Places Originium Crystals that can be shattered by Endministrator''s Battle Skill or Ultimate.","comboTriggers":["combo_skill"],"debuffs":[{"id":"originium_crystal","name":"Originium Crystal","appliesEffect":"originium_crystal","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}]}'::jsonb),
        (3, 304, 'Deals Physical DMG and shatters all Originium Crystals on the field.', null, null, '{"id":304,"name":"Bombardment Sequence","icon":"assets/operators/avatars/Endmin.png","iconSmall":"assets/operators/skills/endmin/ult_small.png","elementType":"physical","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":90,"description":"Deals Physical DMG and shatters all Originium Crystals on the field.","consumeDebuffs":["originium_crystal"]}'::jsonb),
        (13, 1301, 'Physical Final Strike.', null, null, '{"id":1301,"name":"Basic Tactics","icon":"assets/operators/avatars/Catcher.png","iconSmall":"assets/operators/skills/catcher/fs_small.png","type":"Final Strike","shortType":"FS","cooldown":20,"energy":60,"description":"Physical Final Strike.","debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}],"elementType":"physical"}'::jsonb),
        (13, 1302, 'Raises a shield, grants Protection, returns SP, and can retaliate when attacked to apply Vulnerability.', null, null, '{"id":1302,"name":"Rigid Interdiction","icon":"assets/operators/avatars/Catcher.png","iconSmall":"assets/operators/skills/catcher/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"physical","description":"Raises a shield, grants Protection, returns SP, and can retaliate when attacked to apply Vulnerability.","buffs":[{"id":"protection","name":"Protection","appliesEffect":"protection","persistsForCombo":true,"visible":true,"stackable":false},{"id":"shield","name":"Shield","appliesEffect":"shield","persistsForCombo":true,"visible":true,"stackable":false}]}'::jsonb),
        (13, 1303, 'Triggers when an enemy starts charging a skill, or when the controlled operator is attacked and falls below 40% HP. Grants shield.', null, 'all', '{"id":1303,"name":"Timely Suppression","icon":"assets/operators/avatars/Catcher.png","iconSmall":"assets/operators/skills/catcher/cs_small.png","type":"Combo Skill","shortType":"CS","cooldown":35,"energy":0,"elementType":"physical","description":"Triggers when an enemy starts charging a skill, or when the controlled operator is attacked and falls below 40% HP. Grants shield.","comboTriggerMode":"all","comboTriggers":[{"anyOf":[{"effect":"enemy_skill_charging","minStacks":1},{"effect":"operator_attacked","minStacks":1}]}],"buffs":[{"id":"shield","name":"Shield","appliesEffect":"shield","persistsForCombo":true,"visible":true,"stackable":false}]}'::jsonb),
        (13, 1304, 'Performs two Physical slashes and a powerful downward slam that applies Knock Down.', null, null, '{"id":1304,"name":"Textbook Assault","icon":"assets/operators/avatars/Catcher.png","iconSmall":"assets/operators/skills/catcher/ult_small.png","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":60,"elementType":"physical","description":"Performs two Physical slashes and a powerful downward slam that applies Knock Down.","debuffs":[{"id":"knock_down","name":"Knock Down","appliesEffect":"knock_down","persistsForCombo":false,"visible":true}]}'::jsonb),
        (14, 1401, 'Physical Final Strike.', null, null, '{"id":1401,"name":"Soaring Break","icon":"assets/operators/avatars/Chen.png","iconSmall":"assets/operators/skills/chen/fs_small.png","type":"Final Strike","shortType":"FS","cooldown":20,"energy":60,"elementType":"physical","description":"Physical Final Strike.","debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}]}'::jsonb),
        (14, 1402, 'Deals Physical DMG, applies Lift, and contributes Vulnerable pressure.', null, null, '{"id":1402,"name":"Ascending Strike","icon":"assets/operators/avatars/Chen.png","iconSmall":"assets/operators/skills/chen/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"physical","description":"Deals Physical DMG, applies Lift, and contributes Vulnerable pressure.","debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true},{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}]}'::jsonb),
        (14, 1403, 'Triggers when an enemy becomes Vulnerable. Dashes through the enemy, deals Physical DMG, and applies Lift.', null, 'all', '{"id":1403,"name":"Soar to the Stars","allowSelfTrigger":false,"icon":"assets/operators/avatars/Chen.png","iconSmall":"assets/operators/skills/chen/cs_small.png","type":"Combo Skill","shortType":"CS","cooldown":16,"energy":0,"elementType":"physical","comboTriggerMode":"all","description":"Triggers when an enemy becomes Vulnerable. Dashes through the enemy, deals Physical DMG, and applies Lift.","comboTriggers":[{"effect":"vulnerable","minStacks":1}],"debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true}]}'::jsonb),
        (14, 1404, 'Performs a 7-sequence Physical slash attack. The final slash deals increased damage.', null, null, '{"id":1404,"name":"Blade Gale","icon":"assets/operators/avatars/Chen.png","iconSmall":"assets/operators/skills/chen/ult_small.png","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":70,"elementType":"physical","description":"Performs a 7-sequence Physical slash attack. The final slash deals increased damage."}'::jsonb),
        (16, 1602, 'Deals Physical DMG and applies Lift plus 1 Vulnerable stack.', null, null, '{"id":1602,"name":"FLIP DA WOK!","icon":"assets/operators/avatars/Dapan.png","iconSmall":"assets/operators/skills/dapan/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"physical","description":"Deals Physical DMG and applies Lift plus 1 Vulnerable stack.","debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true},{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}]}'::jsonb)
)
update public.operator_skills as skill
set
    name = updates.raw_data->>'name',
    skill_type = updates.raw_data->>'type',
    short_type = updates.raw_data->>'shortType',
    cooldown = nullif(updates.raw_data->>'cooldown', '')::integer,
    energy = nullif(updates.raw_data->>'energy', '')::integer,
    element_type = updates.raw_data->>'elementType',
    icon_path = updates.raw_data->>'icon',
    icon_small_path = updates.raw_data->>'iconSmall',
    description = updates.description,
    combo_trigger = updates.combo_trigger,
    combo_trigger_mode = updates.combo_trigger_mode,
    raw_data = updates.raw_data,
    updated_at = now()
from skill_updates as updates
where skill.id = updates.skill_id
  and skill.operator_id = updates.operator_id;

with skill_updates(operator_id, skill_id, raw_data) as (
    select operator_id, id, raw_data
    from public.operator_skills
    where (operator_id, id) in (
        (3, 301), (3, 302), (3, 303), (3, 304),
        (13, 1301), (13, 1302), (13, 1303), (13, 1304),
        (14, 1401), (14, 1402), (14, 1403), (14, 1404),
        (16, 1602)
    )
)
update public.operators as operator
set
    raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(coalesce(updates.raw_data, skill) order by ord)
            from jsonb_array_elements(operator.raw_data->'skills') with ordinality as items(skill, ord)
            left join skill_updates as updates
                on updates.operator_id = operator.id
               and (skill->>'id')::integer = updates.skill_id
        ),
        true
    ),
    updated_at = now()
where operator.id in (3, 13, 14, 16)
  and jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_updates as updates
        on updates.operator_id = operator.id
       and (skill->>'id')::integer = updates.skill_id
  );

commit;
