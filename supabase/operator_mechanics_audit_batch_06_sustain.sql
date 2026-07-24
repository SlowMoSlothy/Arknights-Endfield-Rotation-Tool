begin;

-- Operator mechanics audit, batch 06: sustain profiles at skill/talent level 12.
-- The client evaluates only the generic sustainProfile structure. Every operator
-- formula, threshold, target and duration remains in Supabase.

with mechanics(operator_id, skill_id, patch) as (
    values
        (17, 1702, '{"damageProfile":{"atkMultiplier":3.9,"hitCount":1,"element":"heat","staggerMultiplier":10},"buffs":[{"id":"protection","name":"Protection","appliesEffect":"protection","persistsForCombo":false,"visible":true,"valuePercent":50,"target":"self"}],"sustainProfile":{"protectionPercent":50,"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/ember-profile-skills"},"conditionalStagger":{"triggerEffect":"operator_attacked","additionalStagger":10},"mechanicsAudit":{"batch":"06","status":"verified","skillLevel":12}}'::jsonb),
        (17, 1703, '{"cooldown":19,"damageProfile":{"atkMultiplier":2.3,"hitCount":1,"element":"physical","staggerMultiplier":10},"ultimateEnergyGain":10,"sustainProfile":{"treatments":[{"name":"Controlled Operator Treatment","target":"controlled_operator","baseTreatment":675,"willMultiplier":1.58,"tickCount":1}],"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/ember-profile-skills"},"mechanicsAudit":{"batch":"06","status":"verified","skillLevel":12}}'::jsonb),
        (17, 1704, '{"damageProfile":{"atkMultiplier":6.5,"hitCount":1,"element":"heat","staggerMultiplier":25},"buffs":[{"id":"shield","name":"Re-Ignited Oath Shield","appliesEffect":"shield","persistsForCombo":true,"visible":true,"stackable":false,"target":"team","durationSeconds":10,"maxHpMultiplier":0.25,"iconBase":"assets/ui/buffs/ember/shield"}],"sustainProfile":{"shield":{"name":"Team Shield","target":"team","maxHpMultiplier":0.25,"durationSeconds":10},"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/ember-profile-skills"},"mechanicsAudit":{"batch":"06","status":"verified","skillLevel":12}}'::jsonb),
        (23, 2302, '{"damageProfile":{"atkMultiplier":4.5,"hitCount":1,"element":"cryo","staggerMultiplier":20},"spRecovery":30,"spReturn":true,"ultimateEnergyGain":10,"buffs":[{"id":"protection","name":"Protection","appliesEffect":"protection","persistsForCombo":false,"visible":true,"valuePercent":90,"target":"team"}],"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/cryo_infliction"}],"sustainProfile":{"protectionPercent":90,"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/snowshine-profile-skills"},"requiresRetaliation":true,"retaliationTriggerEffect":"operator_attacked","mechanicsAudit":{"batch":"06","status":"partial","skillLevel":12,"notes":"Damage, Cryo Infliction and extra Ultimate Energy occur only on a successful retaliation; exact guard timing remains in the timing backlog."}}'::jsonb),
        (23, 2303, '{"cooldown":10,"damageProfile":null,"ultimateEnergyGain":10,"sustainProfile":{"treatments":[{"name":"Initial Team Treatment","target":"team","baseTreatment":216,"willMultiplier":0.5,"tickCount":1,"conditionalTargetHpAtMostPercent":55,"conditionalMultiplier":1.25},{"name":"Team Treatment Over Time","target":"team","baseTreatment":54,"willMultiplier":0.13,"intervalSeconds":0.5,"durationSeconds":3,"conditionalTargetHpAtMostPercent":55,"conditionalMultiplier":1.25}],"skillLevel":12,"verified":true,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/snowshine-profile-skills"},"mechanicsAudit":{"batch":"06","status":"verified","skillLevel":12}}'::jsonb),
        (23, 2304, '{"damageProfile":{"atkMultiplier":11.0,"hitCount":11,"element":"cryo","staggerMultiplier":20},"damageSequences":[{"sequenceIndex":1,"label":"Impact","atkMultiplier":4.5},{"sequenceIndex":2,"label":"Snow Zone x10","atkMultiplier":6.5,"hitCount":10,"intervalSeconds":0.5,"durationSeconds":5}],"debuffs":[{"id":"solidification","name":"Solidification","appliesEffect":"solidification","persistsForCombo":true,"visible":true,"stackable":false,"durationSeconds":5,"iconBase":"assets/debuffs/solidification"}],"field":{"name":"Snow Zone","durationSeconds":5,"tickIntervalSeconds":0.5,"displayTrack":"debuff"},"mechanicsAudit":{"batch":"06","status":"verified","skillLevel":12,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/snowshine-profile-skills"}}'::jsonb)
)
update public.operator_skills as skill
set raw_data = coalesce(skill.raw_data, '{}'::jsonb) || mechanics.patch,
    cooldown = coalesce((mechanics.patch->>'cooldown')::integer, skill.cooldown),
    updated_at = now()
from mechanics
where skill.operator_id = mechanics.operator_id
  and skill.id = mechanics.skill_id;

with updated_skills as (
    select operator_id, id, raw_data
    from public.operator_skills
    where (operator_id, id) in ((17,1702),(17,1703),(17,1704),(23,2302),(23,2303),(23,2304))
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
where operator.id in (17,23)
  and jsonb_typeof(operator.raw_data->'skills') = 'array';

commit;
