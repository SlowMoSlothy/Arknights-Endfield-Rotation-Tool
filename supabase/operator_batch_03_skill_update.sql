-- Updates verified skill metadata for the third operator review batch.
-- Covers Perlica, Gilberta, Ardelia, and Wulfgard.
-- Run after supabase/schema.sql and after importing operator data.

begin;

with skill_updates(operator_id, skill_id, description, combo_trigger, combo_trigger_mode, raw_data) as (
    values
        (4, 402, 'Deals Electric DMG and applies Electric Infliction.', null, null, '{"id":402,"name":"Protocol ω: Strike","icon":"assets/operators/avatars/Perlica.png","iconSmall":"assets/operators/skills/perlica/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"electric","description":"Deals Electric DMG and applies Electric Infliction.","debuffs":[{"id":"electric_infliction","name":"Electric Infliction","appliesEffect":"electric_infliction","visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"persistsForCombo":true},{"id":"stagger","name":"Stagger","appliesEffect":"stagger","persistsForCombo":false,"visible":true,"iconBase":"assets/debuffs/stagger"}]}'::jsonb),
        (11, 1102, 'Channels a gravity well that pulls nearby enemies, then implodes to apply Nature Infliction.', null, null, '{"id":1102,"name":"Arcane Staff: Gravity Mode","icon":"assets/operators/avatars/Gilberta.png","iconSmall":"assets/operators/skills/gilberta/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"nature","description":"Channels a gravity well that pulls nearby enemies, then implodes to apply Nature Infliction.","debuffs":[{"id":"nature_infliction","name":"Nature Infliction","appliesEffect":"nature_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/nature_infliction"}]}'::jsonb),
        (11, 1104, 'Applies Nature Infliction, Slow, and Arts Susceptibility. Lifted targets remain airborne while the field persists.', null, null, '{"id":1104,"name":"Arcane Staff: Gravity Field","icon":"assets/operators/avatars/Gilberta.png","iconSmall":"assets/operators/skills/gilberta/ult_small.png","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":90,"elementType":"nature","description":"Applies Nature Infliction, Slow, and Arts Susceptibility. Lifted targets remain airborne while the field persists.","debuffs":[{"id":"nature_infliction","name":"Nature Infliction","appliesEffect":"nature_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/nature_infliction"},{"id":"slow","name":"Slow","appliesEffect":"slow","persistsForCombo":true,"visible":true,"stackable":false},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/arts_susceptibility"}]}'::jsonb),
        (12, 1201, 'Nature Final Strike.', null, null, '{"id":1201,"name":"Rocky Whispers","icon":"assets/operators/avatars/Ardelia.png","iconSmall":"assets/operators/skills/ardelia/fs_small.png","type":"Final Strike","shortType":"FS","cooldown":20,"energy":60,"description":"Nature Final Strike.","debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}],"elementType":"nature"}'::jsonb),
        (12, 1202, 'Creates Mr. Dolly healing zones. If Corrosion is present nearby, Dolly Rush can recast for free.', null, null, '{"id":1202,"name":"Dolly Rush","icon":"assets/operators/avatars/Ardelia.png","iconSmall":"assets/operators/skills/ardelia/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"nature","description":"Creates Mr. Dolly healing zones. If Corrosion is present nearby, Dolly Rush can recast for free.","consumeDebuffs":["corrosion"]}'::jsonb),
        (12, 1203, 'Triggers when the controlled operator performs a Final Strike on an enemy with no Vulnerability or Arts Infliction. Applies temporary Corrosion.', null, 'all', '{"id":1203,"name":"Eruption Column","icon":"assets/operators/avatars/Ardelia.png","iconSmall":"assets/operators/skills/ardelia/cs_small.png","type":"Combo Skill","shortType":"CS","cooldown":18,"energy":0,"elementType":"nature","description":"Triggers when the controlled operator performs a Final Strike on an enemy with no Vulnerability or Arts Infliction. Applies temporary Corrosion.","comboTriggerMode":"all","comboTriggers":[{"effect":"final_strike","minStacks":1},{"noneOf":["vulnerable","arts_infliction","cryo_infliction","heat_infliction","electric_infliction","nature_infliction"]}],"debuffs":[{"id":"corrosion","name":"Corrosion","appliesEffect":"corrosion","persistsForCombo":true,"visible":true,"stackable":false},{"id":"stagger","name":"Stagger","appliesEffect":"stagger","persistsForCombo":false,"visible":true}]}'::jsonb),
        (12, 1204, 'Nature Ultimate.', null, null, '{"id":1204,"name":"Wooly Party","icon":"assets/operators/avatars/Ardelia.png","iconSmall":"assets/operators/skills/ardelia/ult_small.png","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":60,"elementType":"nature","description":"Nature Ultimate."}'::jsonb),
        (24, 2402, 'Applies Heat Infliction. If Combustion or Electrification is active, consumes it instead for extra Heat DMG.', null, null, '{"id":2402,"name":"Thermite Tracers","icon":"assets/operators/avatars/Wulfgard.png","iconSmall":"assets/operators/skills/wulfgard/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"heat","description":"Applies Heat Infliction. If Combustion or Electrification is active, consumes it instead for extra Heat DMG.","consumeDebuffs":["combustion","electrification"],"conditionalDebuffs":[{"noneOf":["combustion","electrification"],"debuffs":[{"id":"heat_infliction","name":"Heat Infliction","appliesEffect":"heat_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/heat_infliction"}]}]}'::jsonb),
        (24, 2403, 'Triggers when an Arts Infliction is applied. Applies Heat Infliction.', null, 'any', '{"id":2403,"name":"Frag Grenade·β","icon":"assets/operators/avatars/Wulfgard.png","iconSmall":"assets/operators/skills/wulfgard/cs_small.png","type":"Combo Skill","shortType":"CS","cooldown":20,"energy":0,"elementType":"heat","description":"Triggers when an Arts Infliction is applied. Applies Heat Infliction.","comboTriggerMode":"any","allowSelfTrigger":true,"comboTriggers":[{"effect":"heat_infliction","minStacks":1},{"effect":"cryo_infliction","minStacks":1},{"effect":"nature_infliction","minStacks":1},{"effect":"electric_infliction","minStacks":1}],"debuffs":[{"id":"heat_infliction","name":"Heat Infliction","appliesEffect":"heat_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/heat_infliction"}]}'::jsonb)
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
        (4, 402),
        (11, 1102), (11, 1104),
        (12, 1201), (12, 1202), (12, 1203), (12, 1204),
        (24, 2402), (24, 2403)
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
where operator.id in (4, 11, 12, 24)
  and jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_updates as updates
        on updates.operator_id = operator.id
       and (skill->>'id')::integer = updates.skill_id
  );

commit;
