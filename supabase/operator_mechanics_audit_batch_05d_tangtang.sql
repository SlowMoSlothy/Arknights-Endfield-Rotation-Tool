begin;

-- Operator mechanics audit, batch 05D: Tangtang at skill/talent level 12.
-- Trigger matching, early follow-ups and Whirlpool conversion are interpreted by
-- generic engines. The Tangtang-specific conditions and values remain in Supabase.

with mechanics(operator_id, skill_id, patch) as (
    values
        (
            15,
            1503,
            '{
              "cooldown":12,
              "damageProfile":{"atkMultiplier":2.4,"hitCount":1,"element":"cryo"},
              "ultimateEnergyGain":10,
              "battlefieldResource":{"resourceKey":"whirlpool","name":"Whirlpool","ownerOperatorId":15,"maxStacks":2,"durationSeconds":30,"displayTrack":"buff","iconBase":"assets/operators/skills/tangtang/65px-Combo-Tangtang","creation":{"guaranteedStacks":1,"maxStacksPerUse":1},"sourceUrl":"https://www.icy-veins.com/arknights-endfield/tangtang-profile-skills","skillLevel":12},
              "mechanicsAudit":{"batch":"05D","status":"verified","skillLevel":12,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/tangtang-profile-skills"}
            }'::jsonb
        ),
        (
            15,
            1502,
            '{
              "damageProfile":{"atkMultiplier":4.8,"hitCount":2,"element":"cryo"},
              "damageSequences":[{"sequenceIndex":1,"label":"Shot","atkMultiplier":1.8},{"sequenceIndex":2,"label":"Waterspout 1","atkMultiplier":3.0}],
              "battlefieldResource":{"resourceKey":"whirlpool","name":"Whirlpool","ownerOperatorId":15,"maxStacks":2,"durationSeconds":30,"displayTrack":"buff","iconBase":"assets/operators/skills/tangtang/65px-Combo-Tangtang","consumption":{"consumeAllActive":true},"outcomesByConsumedStacks":{"0":{"actionOverride":{"damageProfile":{"atkMultiplier":4.8,"hitCount":2,"element":"cryo"},"damageSequences":[{"sequenceIndex":1,"label":"Shot","atkMultiplier":1.8},{"sequenceIndex":2,"label":"Waterspout 1","atkMultiplier":3.0}],"spRecovery":0,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}]}},"1":{"actionOverride":{"damageProfile":{"atkMultiplier":7.8,"hitCount":3,"element":"cryo"},"damageSequences":[{"sequenceIndex":1,"label":"Shot","atkMultiplier":1.8},{"sequenceIndex":2,"label":"Waterspout 1","atkMultiplier":3.0},{"sequenceIndex":3,"label":"Waterspout 2","atkMultiplier":3.0}],"spRecovery":20,"spReturn":true,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","persistsForCombo":true,"visible":true,"stackable":false,"valuePercent":5,"durationSeconds":15,"iconBase":"assets/debuffs/arts_susceptibility"}]}},"2":{"actionOverride":{"damageProfile":{"atkMultiplier":10.8,"hitCount":4,"element":"cryo"},"damageSequences":[{"sequenceIndex":1,"label":"Shot","atkMultiplier":1.8},{"sequenceIndex":2,"label":"Waterspout 1","atkMultiplier":3.0},{"sequenceIndex":3,"label":"Waterspout 2","atkMultiplier":3.0},{"sequenceIndex":4,"label":"Waterspout 3","atkMultiplier":3.0}],"spRecovery":40,"spReturn":true,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","persistsForCombo":true,"visible":true,"stackable":false,"valuePercent":10,"durationSeconds":15,"iconBase":"assets/debuffs/arts_susceptibility"}]}}},"sourceUrl":"https://www.icy-veins.com/arknights-endfield/tangtang-profile-skills","skillLevel":12},
              "mechanicsAudit":{"batch":"05D","status":"verified","skillLevel":12,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/tangtang-profile-skills"}
            }'::jsonb
        ),
        (
            15,
            1504,
            '{
              "damageProfile":{"atkMultiplier":3.2,"hitCount":4,"element":"cryo"},
              "delayedFollowUp":{"delaySeconds":4,"detonatorScope":"team","detonateOnEmittedEffects":["dive_attack"],"initialActionOverride":{"damageProfile":{"atkMultiplier":3.2,"hitCount":4,"element":"cryo"},"debuffs":[{"id":"olden_stare","name":"OLDEN STARE","appliesEffect":"olden_stare","persistsForCombo":true,"visible":true,"stackable":false,"durationSeconds":4,"iconBase":"assets/operators/skills/tangtang/65px-Ult-Tangtang"}]},"followUpActionOverride":{"id":"tangtang_rogue_wave","name":"Rogue Wave","type":"Ultimate Follow-up","shortType":"Ult","damageProfile":{"atkMultiplier":4.0,"hitCount":1,"element":"cryo","staggerMultiplier":15},"consumeDebuffs":["olden_stare"],"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}]},"earlyFollowUpActionOverride":{"id":"tangtang_rogue_wave_early","name":"Rogue Wave (Early)","type":"Ultimate Follow-up","shortType":"Ult","damageProfile":{"atkMultiplier":7.0,"hitCount":1,"element":"cryo","staggerMultiplier":20},"consumeDebuffs":["olden_stare"],"debuffs":[]},"earlyAdditionalActions":[{"actionOverride":{"id":"tangtang_riot_bringer_waterspouts","name":"Riot Bringer: Waterspouts","type":"Battle Skill Follow-up","shortType":"BS","damageProfile":{"atkMultiplier":4.8,"hitCount":1,"element":"cryo"},"spRecovery":0,"spReturn":false,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}],"battlefieldResource":{"resourceKey":"whirlpool","name":"Whirlpool","ownerOperatorId":15,"maxStacks":2,"durationSeconds":30,"displayTrack":"buff","iconBase":"assets/operators/skills/tangtang/65px-Combo-Tangtang","consumption":{"consumeAllActive":true},"outcomesByConsumedStacks":{"0":{"actionOverride":{"damageProfile":{"atkMultiplier":4.8,"hitCount":1,"element":"cryo"},"spRecovery":0}},"1":{"actionOverride":{"damageProfile":{"atkMultiplier":9.6,"hitCount":2,"element":"cryo"},"spRecovery":0,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","persistsForCombo":true,"visible":true,"valuePercent":5,"durationSeconds":15,"iconBase":"assets/debuffs/arts_susceptibility"}]}},"2":{"actionOverride":{"damageProfile":{"atkMultiplier":14.4,"hitCount":3,"element":"cryo"},"spRecovery":0,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","persistsForCombo":true,"visible":true,"valuePercent":10,"durationSeconds":15,"iconBase":"assets/debuffs/arts_susceptibility"}]}}},"sourceUrl":"https://www.icy-veins.com/arknights-endfield/tangtang-profile-skills","skillLevel":12}}}],"sourceUrl":"https://www.icy-veins.com/arknights-endfield/tangtang-profile-skills","skillLevel":12},
              "mechanicsAudit":{"batch":"05D","status":"verified","skillLevel":12,"sourceUrl":"https://www.icy-veins.com/arknights-endfield/tangtang-profile-skills","notes":"OLDEN STARE DoT is represented by its level-12 total damage on cast; Dive selects the early terminal action."}
            }'::jsonb
        )
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
    where operator_id = 15 and id in (1502, 1503, 1504)
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
where operator.id = 15
  and jsonb_typeof(operator.raw_data->'skills') = 'array';

commit;
