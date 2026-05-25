-- Updates verified skill metadata for the sixth operator review batch.
-- Covers Laevatain, Akekuri, Tangtang, and Estella.
-- Run after supabase/schema.sql and after importing operator data.

begin;

with skill_updates(operator_id, skill_id, description, combo_trigger, combo_trigger_mode, raw_data) as (
    values
        (1, 101, 'Final Strike. Absorbs Heat Infliction and converts absorbed stacks into Melting Flame.', null, null, '{"id":101,"name":"Flaming Cinders","icon":"assets/operators/avatars/Laevatain.png","iconSmall":"assets/operators/skills/laevatain/fs_small.png","type":"Final Strike","shortType":"FS","elementType":"heat","cooldown":20,"energy":60,"description":"Final Strike. Absorbs Heat Infliction and converts absorbed stacks into Melting Flame.","debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}],"consumeInflictionToBuff":{"infliction":"heat_infliction","grantBuff":"melting_flames","buffName":"Melting Flame","ratio":1,"maxStacks":4,"visible":true,"stackable":true,"iconBase":"assets/ui/buffs/laevatain/melting_flames"}}'::jsonb),
        (1, 102, 'Applies Heat Infliction and grants Melting Flame. At 4 Melting Flame, consumes all stacks and applies Combustion instead of the normal Heat Infliction.', null, null, '{"id":102,"name":"Smouldering Fire","icon":"assets/operators/avatars/Laevatain.png","iconSmall":"assets/operators/skills/laevatain/bs_small.png","type":"Battle Skill","shortType":"BS","elementType":"heat","cooldown":20,"energy":100,"sp_cost":100,"description":"Applies Heat Infliction and grants Melting Flame. At 4 Melting Flame, consumes all stacks and applies Combustion instead of the normal Heat Infliction.","buffs":[{"id":"melting_flames","name":"Melting Flame","appliesEffect":"melting_flames","persistsForCombo":true,"visible":true,"stackable":true,"maxStacks":4,"stacksApplied":1,"iconBase":"assets/ui/buffs/laevatain/melting_flames"}],"debuffs":[{"id":"heat_infliction","name":"Heat Infliction","appliesEffect":"heat_infliction","visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"persistsForCombo":true,"iconBase":"assets/debuffs/heat_infliction"}],"conditionalDebuffs":[{"requiresBuffStacks":{"buff":"melting_flames","minStacks":4},"consumeBuffStacks":{"buff":"melting_flames","amount":4},"skipNormalBuffs":true,"skipNormalDebuffs":true,"debuffs":[{"id":"combustion","name":"Combustion","appliesEffect":"combustion","persistsForCombo":true,"visible":true,"stackable":false,"iconBase":"assets/debuffs/combustion"}]}]}'::jsonb),
        (1, 103, 'Triggers on Combustion or Corrosion.', null, 'all', '{"id":103,"name":"Seethe","icon":"assets/operators/avatars/Laevatain.png","iconSmall":"assets/operators/skills/laevatain/cs_small.png","type":"Combo Skill","shortType":"CS","elementType":"heat","cooldown":10,"energy":0,"description":"Triggers on Combustion or Corrosion.","comboTriggerMode":"all","comboTriggers":[{"anyOf":[{"effect":"combustion","minStacks":1},{"effect":"corrosion","minStacks":1}]}],"buffs":[{"id":"melting_flames","name":"Melting Flame","appliesEffect":"melting_flames","persistsForCombo":true,"visible":true,"stackable":true,"maxStacks":4,"stacksApplied":1,"iconBase":"assets/ui/buffs/laevatain/melting_flames"}]}'::jsonb),
        (1, 104, 'Enters Twilight, transforming Laevatain''s basic attacks into enhanced wide-range Heat slashes.', null, null, '{"id":104,"name":"Twilight","icon":"assets/operators/avatars/Laevatain.png","iconSmall":"assets/operators/skills/laevatain/ult_small.png","type":"Ultimate","shortType":"Ult","elementType":"heat","cooldown":20,"energy":300,"description":"Enters Twilight, transforming Laevatain''s basic attacks into enhanced wide-range Heat slashes."}'::jsonb),
        (2, 201, 'Physical Final Strike. As the controlled operator, Final Strike also deals Stagger.', null, null, '{"id":201,"name":"Sword of Aspiration","icon":"assets/operators/avatars/Akekuri.png","iconSmall":"assets/operators/skills/akekuri/fs_small.png","type":"Final Strike","shortType":"FS","cooldown":20,"energy":60,"elementType":"physical","description":"Physical Final Strike. As the controlled operator, Final Strike also deals Stagger.","debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}]}'::jsonb),
        (2, 202, 'A frontal slash that deals Heat DMG and applies Heat Infliction.', null, null, '{"id":202,"name":"Burst of Passion","icon":"assets/operators/avatars/Akekuri.png","iconSmall":"assets/operators/skills/akekuri/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"heat","debuffs":[{"id":"heat_infliction","name":"Heat Infliction","appliesEffect":"heat_infliction","visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"persistsForCombo":true,"iconBase":"assets/debuffs/heat_infliction"}],"description":"A frontal slash that deals Heat DMG and applies Heat Infliction."}'::jsonb),
        (2, 203, 'Triggers when an enemy becomes Staggered or hits a Stagger Node. Recovers SP.', null, null, '{"id":203,"name":"Flash and Dash","icon":"assets/operators/avatars/Akekuri.png","iconSmall":"assets/operators/skills/akekuri/cs_small.png","type":"Combo Skill","shortType":"CS","cooldown":9,"energy":0,"elementType":"physical","description":"Triggers when an enemy becomes Staggered or hits a Stagger Node. Recovers SP.","spRecovery":{"amount":15,"source":"Flash and Dash"},"comboTriggers":[{"effect":"stagger","minStacks":1}],"buffs":[{"id":"sp_recovery","name":"SP Recovery","appliesEffect":"sp_recovery","persistsForCombo":false,"visible":true,"stackable":false,"iconBase":"assets/buffs/sp_recovery"}]}'::jsonb),
        (2, 204, 'Enters a channeling state and fires 3 Rallying Flares. Each firing recovers SP.', null, null, '{"id":204,"name":"SQUAD! ON ME!","icon":"assets/operators/avatars/Akekuri.png","iconSmall":"assets/operators/skills/akekuri/ult_small.png","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":120,"elementType":"heat","description":"Enters a channeling state and fires 3 Rallying Flares. Each firing recovers SP.","spRecovery":{"amount":58,"source":"SQUAD! ON ME!"}}'::jsonb),
        (15, 1502, 'Shoots Cryo waves that apply Cryo Infliction and can trigger Waterspouts from existing Whirlpools.', null, null, '{"id":1502,"name":"IMA WAVERIDAAH!","icon":"assets/operators/avatars/Tangtang.png","iconSmall":"assets/operators/skills/tangtang/65px-Skill-Tangtang.webp","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"cryo","description":"Shoots Cryo waves that apply Cryo Infliction and can trigger Waterspouts from existing Whirlpools.","debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}]}'::jsonb),
        (15, 1503, 'Triggers when applying Cryo Infliction or dealing Arts Burst DMG. Creates a Whirlpool.', null, 'any', '{"id":1503,"name":"RIVER, TO ME!","icon":"assets/operators/avatars/Tangtang.png","iconSmall":"assets/operators/skills/tangtang/65px-Combo-Tangtang.webp","type":"Combo Skill","shortType":"CS","cooldown":12,"energy":0,"elementType":"cryo","description":"Triggers when applying Cryo Infliction or dealing Arts Burst DMG. Creates a Whirlpool.","comboTriggerMode":"any","allowSelfTrigger":true,"comboTriggers":[{"effect":"cryo_infliction","minStacks":1},{"effect":"cryo_burst","minStacks":1}],"buffs":[{"id":"whirlpool","name":"Whirlpool","appliesEffect":"whirlpool","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":2}],"debuffs":[{"id":"slow","name":"Slow","appliesEffect":"slow","persistsForCombo":true,"visible":true}]}'::jsonb),
        (15, 1504, 'Creates OLDEN STARE, dealing Cryo DMG over time before a rogue wave crashes down for massive Cryo DMG.', null, null, '{"id":1504,"name":"DA CHIEF SEES YOU!","icon":"assets/operators/avatars/Tangtang.png","iconSmall":"assets/operators/skills/tangtang/65px-Ult-Tangtang.webp","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":90,"elementType":"cryo","description":"Creates OLDEN STARE, dealing Cryo DMG over time before a rogue wave crashes down for massive Cryo DMG.","debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":false,"stacksApplied":1,"maxStacks":4},{"id":"cryo_burst","name":"Cryo Burst","appliesEffect":"cryo_burst","persistsForCombo":false,"visible":false}]}'::jsonb),
        (18, 1802, 'Deals Cryo DMG and applies Cryo Infliction.', null, null, '{"id":1802,"name":"Onomatopoeia","icon":"assets/operators/avatars/Estella.png","iconSmall":"assets/operators/skills/estella/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"cryo","description":"Deals Cryo DMG and applies Cryo Infliction.","debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/cryo_infliction"}]}'::jsonb)
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
        (1, 101), (1, 102), (1, 103), (1, 104),
        (2, 201), (2, 202), (2, 203), (2, 204),
        (15, 1502), (15, 1503), (15, 1504),
        (18, 1802)
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
where operator.id in (1, 2, 15, 18)
  and jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_updates as updates
        on updates.operator_id = operator.id
       and (skill->>'id')::integer = updates.skill_id
  );

commit;
