-- Updates verified skill metadata for the fifth operator review batch.
-- Covers Ember, Fluorite, Snowshine, and Yvonne.
-- Run after supabase/schema.sql and after importing operator data.

begin;

with skill_updates(operator_id, skill_id, description, combo_trigger, combo_trigger_mode, raw_data) as (
    values
        (17, 1702, 'Deals Heat DMG and applies Knock Down. If Ember takes DMG while casting, the slam deals additional Stagger.', null, null, '{"id":1702,"name":"Forward March","icon":"assets/operators/avatars/Ember.png","iconSmall":"assets/operators/skills/ember/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"heat","description":"Deals Heat DMG and applies Knock Down. If Ember takes DMG while casting, the slam deals additional Stagger.","debuffs":[{"id":"knock_down","name":"Knock Down","appliesEffect":"knock_down","persistsForCombo":false,"visible":true}]}'::jsonb),
        (19, 1902, 'Deals Nature DMG, slows enemies, and applies Nature Infliction.', null, null, '{"id":1902,"name":"Free Giveaway","icon":"assets/operators/avatars/Fluorite.png","iconSmall":"assets/operators/skills/fluorite/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"nature","description":"Deals Nature DMG, slows enemies, and applies Nature Infliction.","debuffs":[{"id":"slow","name":"Slow","appliesEffect":"slow","persistsForCombo":true,"visible":true,"iconBase":"assets/debuffs/slow"},{"id":"nature_infliction","name":"Nature Infliction","appliesEffect":"nature_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/nature_infliction"}]}'::jsonb),
        (23, 2302, 'Grants Protection. Retaliation applies Cryo Infliction.', null, null, '{"id":2302,"name":"Saturated Defense","icon":"assets/operators/avatars/Snowshine.png","iconSmall":"assets/operators/skills/snowshine/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"cryo","description":"Grants Protection. Retaliation applies Cryo Infliction.","buffs":[{"id":"protection","name":"Protection","appliesEffect":"protection","persistsForCombo":true,"visible":true,"iconBase":"assets/buffs/protection"}],"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/cryo_infliction"}]}'::jsonb),
        (26, 2602, 'Consumes Cryo Infliction or Nature Infliction to apply Solidification.', null, null, '{"id":2602,"name":"Brr-Brr-Bomb β","icon":"assets/operators/avatars/Yvonne.png","iconSmall":"assets/operators/skills/yvonne/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"cryo","description":"Consumes Cryo Infliction or Nature Infliction to apply Solidification.","consumeDebuffs":["cryo_infliction","nature_infliction"],"debuffs":[{"id":"solidification","name":"Solidification","appliesEffect":"solidification","persistsForCombo":true,"visible":true,"stackable":false,"iconBase":"assets/debuffs/solidification"}],"buffs":[{"id":"yvonne_next_attack_final_strike","name":"Next Attack Final Strike","appliesEffect":"yvonne_next_attack_final_strike","persistsForCombo":true,"visible":false,"stackable":false,"iconBase":"assets/buffs/final_strike"}]}'::jsonb),
        (26, 2604, 'Enhanced attack state. When the skill ends, Yvonne''s last basic attack becomes a Final Strike.', null, null, '{"id":2604,"name":"Cryoblasting Pistolier","icon":"assets/operators/avatars/Yvonne.png","iconSmall":"assets/operators/skills/yvonne/ult_small.png","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":220,"elementType":"cryo","description":"Enhanced attack state. When the skill ends, Yvonne''s last basic attack becomes a Final Strike.","debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}]}'::jsonb)
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
        (17, 1702),
        (19, 1902),
        (23, 2302),
        (26, 2602), (26, 2604)
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
where operator.id in (17, 19, 23, 26)
  and jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_updates as updates
        on updates.operator_id = operator.id
       and (skill->>'id')::integer = updates.skill_id
  );

commit;
