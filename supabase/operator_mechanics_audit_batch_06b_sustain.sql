begin;

-- Operator mechanics audit, batch 06B: remaining verified sustain mechanics.
-- Formulas, charges, pickup conditions and operator ownership live in Supabase.

-- Xaihi: each consumed Auxiliary Crystal charge performs one treatment. The
-- existing generic buff consumer removes one charge on every Final Strike and
-- emits the configured proc; the second consumption still unlocks her Combo.
update public.buff_registry
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "name":"Auxiliary Crystal",
    "stackable":true,
    "maxStacks":2,
    "durationSeconds":20,
    "consumeOnSkillType":"final_strike",
    "consumeStacks":1,
    "onFullyConsumedEffect":"auxiliary_crystal_used_up",
    "onConsume":{
      "id":"xaihi_auxiliary_crystal_treatment",
      "name":"Auxiliary Crystal Treatment",
      "operatorId":25,
      "type":"Treatment Proc",
      "shortType":"PROC",
      "damageProfile":null,
      "sustainProfile":{"treatments":[{"name":"Controlled Operator Treatment","target":"controlled_operator","baseTreatment":324,"willMultiplier":0.76,"tickCount":1}],"conditionalBuffs":[{"conditionLabel":"At Max HP","name":"Arts Amp","valuePercent":15,"durationSeconds":25}],"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/xaihi-profile-skills"}
    }
  }'::jsonb,
    updated_at = now()
where effect_key = 'auxiliary_crystal';

with mechanics(operator_id, skill_id, patch) as (
    values
        (25, 2502, '{"damageProfile":null,"buffs":[{"id":"auxiliary_crystal","name":"Auxiliary Crystal","appliesEffect":"auxiliary_crystal","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":2,"maxStacks":2,"durationSeconds":20,"consumeOnSkillType":"final_strike","consumeStacks":1,"onFullyConsumedEffect":"auxiliary_crystal_used_up","onConsume":{"id":"xaihi_auxiliary_crystal_treatment","name":"Auxiliary Crystal Treatment","operatorId":25,"type":"Treatment Proc","shortType":"PROC","damageProfile":null,"sustainProfile":{"treatments":[{"name":"Controlled Operator Treatment","target":"controlled_operator","baseTreatment":324,"willMultiplier":0.76,"tickCount":1}],"conditionalBuffs":[{"conditionLabel":"At Max HP","name":"Arts Amp","valuePercent":15,"durationSeconds":25}],"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/xaihi-profile-skills"}}}],"mechanicsAudit":{"batch":"06B","status":"verified","skillLevel":12}}'::jsonb),
        (25, 2503, '{"cooldown":8,"damageProfile":{"atkMultiplier":4.5,"hitCount":1,"element":"cryo","staggerMultiplier":10},"ultimateEnergyGain":10,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}],"mechanicsAudit":{"batch":"06B","status":"verified","skillLevel":12}}'::jsonb),
        (12, 1202, '{"damageProfile":{"atkMultiplier":3.2,"hitCount":1,"element":"nature","staggerMultiplier":10},"battlefieldResource":{"resourceKey":"shadow_of_mr_dolly","name":"Shadow of Mr. Dolly","ownerOperatorId":12,"maxStacks":10,"durationSeconds":10,"displayTrack":"buff","iconBase":"assets/operators/skills/ardelia/bs_small","creation":{"guaranteedStacks":3,"maxStacksPerUse":3},"sourceUrl":"https://www.icy-veins.com/arknights-endfield/ardelia-profile-skills","skillLevel":12},"mechanicsAudit":{"batch":"06B","status":"verified","skillLevel":12,"notes":"Battle Skill creates three pickup resources. Random Ultimate drops remain in the talent/randomness backlog."}}'::jsonb),
        (11, 1102, '{"sustainProfile":{"treatments":[{"name":"Late Reply Treatment","target":"controlled_operator","baseTreatment":108,"intellectMultiplier":0.9,"tickCount":1}],"activationCondition":{"effect":"multi_target_hit_2_plus","label":"Last Battle Skill sequence hits at least 2 enemies"},"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/gilberta-profile-skills"},"mechanicsAudit":{"batch":"06B","status":"verified","skillLevel":12}}'::jsonb),
        (11, 1103, '{"sustainProfile":{"treatments":[{"name":"Late Reply Treatment","target":"controlled_operator","baseTreatment":108,"intellectMultiplier":0.9,"tickCount":1}],"activationCondition":{"effect":"multi_target_hit_2_plus","label":"Combo Skill hits at least 2 enemies"},"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/gilberta-profile-skills"},"mechanicsAudit":{"batch":"06B","status":"verified","skillLevel":12}}'::jsonb),
        (13, 1302, '{"damageProfile":{"atkMultiplier":4.0,"hitCount":1,"element":"physical","staggerMultiplier":20},"spRecovery":30,"spReturn":true,"buffs":[{"id":"protection","name":"Protection","appliesEffect":"protection","persistsForCombo":false,"visible":true,"valuePercent":90,"target":"team"}],"debuffs":[{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}],"sustainProfile":{"protectionPercent":90,"activationCondition":{"effect":"operator_attacked","label":"Retaliation succeeds while guard is active"},"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/catcher-profile-skills"},"mechanicsAudit":{"batch":"06B","status":"partial","skillLevel":12,"notes":"Exact guard timing remains in the timing backlog."}}'::jsonb),
        (13, 1303, '{"cooldown":35,"damageProfile":{"atkMultiplier":2.8,"hitCount":2,"element":"physical","staggerMultiplier":10},"damageSequences":[{"sequenceIndex":1,"label":"Sequence 1","atkMultiplier":0.55},{"sequenceIndex":2,"label":"Sequence 2","atkMultiplier":2.25}],"ultimateEnergyGain":10,"buffs":[{"id":"shield","name":"Timely Suppression Shield","appliesEffect":"shield","persistsForCombo":true,"visible":true,"stackable":false,"target":"self_and_controlled","durationSeconds":10}],"sustainProfile":{"shield":{"name":"Self + Controlled Operator Shield","target":"self_and_controlled","baseShield":810,"defenseMultiplier":5.06,"derivedDefenseFromWill":0.12,"durationSeconds":10},"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/catcher-profile-skills"},"mechanicsAudit":{"batch":"06B","status":"verified","skillLevel":12}}'::jsonb),
        (13, 1304, '{"damageProfile":{"atkMultiplier":10.05,"hitCount":6,"element":"physical","staggerMultiplier":20},"damageSequences":[{"sequenceIndex":1,"label":"Slash 1","atkMultiplier":2.0},{"sequenceIndex":2,"label":"Slash 2","atkMultiplier":2.7},{"sequenceIndex":3,"label":"Downward Slam","atkMultiplier":4.0},{"sequenceIndex":4,"label":"Shockwaves x3","atkMultiplier":1.35,"hitCount":3}],"debuffs":[{"id":"weaken","name":"Weaken","appliesEffect":"weaken","persistsForCombo":true,"visible":true,"valuePercent":30,"durationSeconds":8},{"id":"knock_down","name":"Knock Down","appliesEffect":"knock_down","persistsForCombo":false,"visible":true}],"mechanicsAudit":{"batch":"06B","status":"verified","skillLevel":12}}'::jsonb)
)
update public.operator_skills as skill
set raw_data = coalesce(skill.raw_data, '{}'::jsonb) || mechanics.patch,
    cooldown = coalesce((mechanics.patch->>'cooldown')::integer, skill.cooldown),
    updated_at = now()
from mechanics
where skill.operator_id = mechanics.operator_id
  and skill.id = mechanics.skill_id;

-- Ardelia pickup event. Placing this event consumes one active Dolly shadow;
-- the outcome carries Ardelia's treatment formula and source ownership.
insert into public.simulation_trigger_events (
    id, game, event_key, name, description, icon_path, effects, enabled, sort_order, raw_data
) values (
    900006,
    'arknights_endfield',
    'dolly_shadow_picked_up',
    'Pick Up Dolly Shadow',
    'The controlled operator touches one active Shadow of Mr. Dolly.',
    'assets/operators/skills/ardelia/bs_small.png',
    '[]'::jsonb,
    true,
    60,
    '{"sourceOperatorId":12,"operatorId":12,"battlefieldResource":{"resourceKey":"shadow_of_mr_dolly","name":"Shadow of Mr. Dolly","ownerOperatorId":12,"maxStacks":10,"durationSeconds":10,"displayTrack":"buff","iconBase":"assets/operators/skills/ardelia/bs_small","consumption":{"count":1},"outcomesByConsumedStacks":{"0":{"actionOverride":{"sustainProfile":null}},"1":{"actionOverride":{"name":"Shadow of Mr. Dolly Treatment","sustainProfile":{"treatments":[{"name":"Controlled Operator Treatment","target":"controlled_operator","baseTreatment":63,"willMultiplier":0.53,"tickCount":1}],"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/ardelia-profile-skills"}}}}}}'::jsonb
)
on conflict (id) do update set
    event_key = excluded.event_key,
    name = excluded.name,
    description = excluded.description,
    icon_path = excluded.icon_path,
    effects = excluded.effects,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data,
    updated_at = now();

with updated_skills as (
    select operator_id, id, raw_data
    from public.operator_skills
    where (operator_id, id) in ((25,2502),(25,2503),(12,1202),(11,1102),(11,1103),(13,1302),(13,1303),(13,1304))
)
update public.operators as operator
set raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(coalesce(updated.raw_data, skill) order by ord)
            from jsonb_array_elements(operator.raw_data->'skills') with ordinality as items(skill, ord)
            left join updated_skills as updated
              on updated.operator_id = operator.id
             and (skill->>'id')::integer = updated.id
        ),
        true
    ),
    updated_at = now()
where operator.id in (11,12,13,25)
  and jsonb_typeof(operator.raw_data->'skills') = 'array';

commit;
