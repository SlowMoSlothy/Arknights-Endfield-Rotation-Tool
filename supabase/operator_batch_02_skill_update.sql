-- Updates verified skill metadata for the second operator review batch.
-- Covers Rossi, Arclight, Avywenna, and Antal.
-- Run after supabase/schema.sql and after importing operator data.

begin;

with skill_updates(operator_id, skill_id, description, combo_trigger, combo_trigger_mode, raw_data) as (
    values
        (
            6,
            602,
            'Consumes Electrification to launch an additional Electric attack and recover SP.',
            null,
            null,
            '{"id":602,"name":"Tempestuous Arc","icon":"assets/operators/avatars/Arclight.png","iconSmall":"assets/operators/skills/arclight/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"electric","description":"Consumes Electrification to launch an additional Electric attack and recover SP.","consumeDebuffs":["electrification"],"spRecovery":{"amount":30,"requiresEffect":"electrification","source":"Tempestuous Arc"},"debuffs":[{"id":"electrification_consumed","name":"Electrification Consumed","appliesEffect":"electrification_consumed","persistsForCombo":false,"visible":false}],"buffs":[{"id":"sp_recovery","name":"SP Recovery","appliesEffect":"sp_recovery","persistsForCombo":false,"visible":true,"stackable":false}]}'::jsonb
        ),
        (
            6,
            604,
            'Applies Electric Infliction. Lingering arcs can consume Electric Infliction to forcibly apply Electrification.',
            null,
            null,
            '{"id":604,"name":"Exploding Blitz","icon":"assets/operators/avatars/Arclight.png","iconSmall":"assets/operators/skills/arclight/ult_small.png","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":90,"elementType":"electric","description":"Applies Electric Infliction. Lingering arcs can consume Electric Infliction to forcibly apply Electrification.","debuffs":[{"id":"electric_infliction","name":"Electric Infliction","appliesEffect":"electric_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"electrification","name":"Electrification","appliesEffect":"electrification","persistsForCombo":true,"visible":true,"stackable":false}]}'::jsonb
        ),
        (
            7,
            701,
            'Physical Final Strike.',
            null,
            null,
            '{"id":701,"name":"Thunderlance: Blitz","icon":"assets/operators/avatars/Avywenna.png","iconSmall":"assets/operators/skills/avywenna/fs_small.png","type":"Final Strike","shortType":"FS","cooldown":20,"energy":60,"description":"Physical Final Strike.","debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}],"elementType":"physical"}'::jsonb
        ),
        (
            7,
            702,
            'Returns all deployed Thunderlances to Avywenna and strikes enemies in front. A returning Thunderlance EX can apply Electric Infliction.',
            null,
            null,
            '{"id":702,"name":"Thunderlance: Interdiction","icon":"assets/operators/avatars/Avywenna.png","iconSmall":"assets/operators/skills/avywenna/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"electric","description":"Returns all deployed Thunderlances to Avywenna and strikes enemies in front. A returning Thunderlance EX can apply Electric Infliction."}'::jsonb
        ),
        (
            7,
            703,
            'Triggers when a Final Strike hits an enemy with Electric Infliction or Electrification. Deploys Thunderlances.',
            null,
            'all',
            '{"id":703,"name":"Thunderlance: Strike","icon":"assets/operators/avatars/Avywenna.png","iconSmall":"assets/operators/skills/avywenna/cs_small.png","type":"Combo Skill","shortType":"CS","cooldown":13,"energy":0,"elementType":"electric","description":"Triggers when a Final Strike hits an enemy with Electric Infliction or Electrification. Deploys Thunderlances.","comboTriggerMode":"all","comboTriggers":[{"effect":"final_strike","minStacks":1},{"anyOf":[{"effect":"electrification","minStacks":1},{"effect":"electric_infliction","minStacks":1}]}]}'::jsonb
        ),
        (
            7,
            704,
            'Deploys one Thunderlance EX.',
            null,
            null,
            '{"id":704,"name":"Thunderlance: Final Shock","icon":"assets/operators/avatars/Avywenna.png","iconSmall":"assets/operators/skills/avywenna/ult_small.png","type":"Ultimate","shortType":"Ult","cooldown":10,"energy":100,"elementType":"electric","description":"Deploys one Thunderlance EX."}'::jsonb
        ),
        (
            8,
            801,
            'Final Strike.',
            null,
            null,
            '{"id":801,"name":"Exchange Current","icon":"assets/operators/avatars/Antal.png","iconSmall":"assets/operators/skills/antal/fs_small.png","type":"Final Strike","shortType":"FS","cooldown":20,"energy":60,"elementType":"electric","description":"Final Strike.","debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}]}'::jsonb
        ),
        (
            8,
            802,
            'Applies Focus. Focused enemies suffer Electric Susceptibility and Heat Susceptibility.',
            null,
            null,
            '{"id":802,"name":"Specified Research Subject","icon":"assets/operators/avatars/Antal.png","iconSmall":"assets/operators/skills/antal/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"electric","description":"Applies Focus. Focused enemies suffer Electric Susceptibility and Heat Susceptibility.","debuffs":[{"id":"focus","name":"Focus","appliesEffect":"focus","persistsForCombo":true,"visible":true,"stackable":false},{"id":"electric_susceptibility","name":"Electric Susceptibility","appliesEffect":"electric_susceptibility","persistsForCombo":true,"visible":true,"stackable":false},{"id":"heat_susceptibility","name":"Heat Susceptibility","appliesEffect":"heat_susceptibility","persistsForCombo":true,"visible":true,"stackable":false}]}'::jsonb
        ),
        (
            8,
            803,
            'Triggers when a focused enemy suffers a Physical Status or Arts Infliction, then applies another stack of the same effect.',
            null,
            'all',
            '{"id":803,"name":"EMP Test Site","icon":"assets/operators/avatars/Antal.png","iconSmall":"assets/operators/skills/antal/cs_small.png","type":"Combo Skill","shortType":"CS","cooldown":25,"energy":0,"elementType":"electric","description":"Triggers when a focused enemy suffers a Physical Status or Arts Infliction, then applies another stack of the same effect.","comboTriggerMode":"all","comboTriggers":[{"effect":"focus","minStacks":1},{"anyOf":[{"effect":"arts_infliction","minStacks":1},{"effect":"heat_infliction","minStacks":1},{"effect":"electric_infliction","minStacks":1},{"effect":"cryo_infliction","minStacks":1},{"effect":"nature_infliction","minStacks":1},{"effect":"vulnerable","minStacks":1},{"effect":"slow","minStacks":1},{"effect":"lift","minStacks":1},{"effect":"stagger","minStacks":1}]}],"matchingInfliction":{"candidateEffects":["arts_infliction","heat_infliction","electric_infliction","cryo_infliction","nature_infliction","vulnerable","slow","lift","stagger"],"minStacks":1,"stacksApplied":1,"maxStacks":4}}'::jsonb
        ),
        (
            8,
            804,
            'Applies Electric Amp and Heat Amp to the whole team.',
            null,
            null,
            '{"id":804,"name":"Overclocked Moment","icon":"assets/operators/avatars/Antal.png","iconSmall":"assets/operators/skills/antal/ult_small.png","type":"Ultimate","shortType":"Ult","cooldown":20,"energy":100,"elementType":"electric","description":"Applies Electric Amp and Heat Amp to the whole team.","buffs":[{"id":"electric_amp","name":"Electric Amp","appliesEffect":"electric_amp","persistsForCombo":true,"visible":true,"stackable":false},{"id":"heat_amp","name":"Heat Amp","appliesEffect":"heat_amp","persistsForCombo":true,"visible":true,"stackable":false}]}'::jsonb
        ),
        (
            5,
            502,
            'Applies Lift. If Vulnerability is present, Rossi also performs a Heat follow-up.',
            null,
            null,
            '{"id":502,"name":"Crimson Shadow","icon":"assets/operators/avatars/Rossi.png","iconSmall":"assets/operators/skills/rossi/bs_small.png","type":"Battle Skill","shortType":"BS","cooldown":20,"energy":100,"sp_cost":100,"elementType":"physical","description":"Applies Lift. If Vulnerability is present, Rossi also performs a Heat follow-up.","debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true,"iconBase":"assets/debuffs/lift"},{"id":"heat_followup","name":"Heat Follow-up","appliesEffect":"heat_followup","persistsForCombo":false,"visible":false}]}'::jsonb
        ),
        (
            5,
            503,
            'Triggers when the enemy has Vulnerability and any Arts Infliction. Consumes all Arts Infliction stacks, applies Lift, and buffs Rossi''s Crit stats.',
            null,
            'all',
            '{"id":503,"name":"Moment of Blazing Shadow","icon":"assets/operators/avatars/Rossi.png","iconSmall":"assets/operators/skills/rossi/cs_small.png","type":"Combo Skill","shortType":"CS","cooldown":14,"energy":0,"elementType":"physical","description":"Triggers when the enemy has Vulnerability and any Arts Infliction. Consumes all Arts Infliction stacks, applies Lift, and buffs Rossi''s Crit stats.","comboTriggerMode":"all","comboTriggers":[{"effect":"vulnerable","minStacks":1},{"anyOf":[{"effect":"heat_infliction","minStacks":1},{"effect":"electric_infliction","minStacks":1},{"effect":"nature_infliction","minStacks":1},{"effect":"cryo_infliction","minStacks":1}]}],"consumeDebuffs":["arts_infliction","heat_infliction","electric_infliction","nature_infliction","cryo_infliction"],"debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true,"iconBase":"assets/debuffs/lift"},{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/vulnerable"},{"id":"arts_infliction_consumed","name":"Arts Infliction Consumed","appliesEffect":"arts_infliction_consumed","persistsForCombo":false,"visible":false}],"buffs":[{"id":"rossi_crit_buff","name":"Crit Rate / Crit DMG","appliesEffect":"rossi_crit_buff","persistsForCombo":true,"visible":true,"stackable":false,"iconBase":"assets/buffs/rossi/crit_buff"}]}'::jsonb
        )
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
        (6, 602), (6, 604),
        (7, 701), (7, 702), (7, 703), (7, 704),
        (8, 801), (8, 802), (8, 803), (8, 804),
        (5, 502), (5, 503)
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
where operator.id in (5, 6, 7, 8)
  and jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_updates as updates
        on updates.operator_id = operator.id
       and (skill->>'id')::integer = updates.skill_id
  );

commit;
