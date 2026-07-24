begin;

-- Operator mechanics audit, batch 05B (generic follow-up actions).
-- The client only evaluates manualSequence and delayedFollowUp. All operator
-- identifiers, timings, stage payloads, effects, and multipliers live here.
-- Exact timings were measured in game: Fluorite 3.65 s until the Nature
-- explosion; Rossi 1.817 s until the perfect-timing input.

with mechanics(operator_id, skill_id, patch) as (
    values
        (
            5,
            503,
            '{
              "ultimateEnergyGain":20,
              "manualSequence":{
                "autoComplete":true,
                "automaticDelaySeconds":1.817,
                "maxFollowUpDelaySeconds":3.0,
                "manualFollowUpCountsAsPerfect":false,
                "perfectTimingWindow":{"targetSeconds":1.817,"startSeconds":1.767,"endSeconds":1.867,"toleranceSeconds":0.05},
                "perfectTimingVerified":true,
                "followUpWindowVerified":false,
                "stages":[
                  {
                    "stage":1,
                    "label":"COMBO SEQUENCE 1",
                    "actionOverride":{
                      "damageProfile":{"atkMultiplier":0.67,"hitCount":1,"element":"physical"},
                      "damageSequences":[{"sequenceIndex":1,"label":"COMBO SEQUENCE 1","atkMultiplier":0.67,"ultimateEnergyGain":10}],
                      "ultimateEnergyGain":10,
                      "consumeDebuffs":[],
                      "consumedEffectScaling":null,
                      "buffs":[],
                      "debuffs":[]
                    }
                  },
                  {
                    "stage":2,
                    "label":"COMBO SEQUENCE 2",
                    "actionOverride":{
                      "damageProfile":{"atkMultiplier":1.33,"hitCount":1,"element":"physical"},
                      "damageSequences":[{"sequenceIndex":2,"label":"COMBO SEQUENCE 2","baseAtkMultiplier":1.33,"atkMultiplierPerStack":0.8,"ultimateEnergyGain":10,"consumesConfiguredEffects":true}],
                      "ultimateEnergyGain":10,
                      "consumeDebuffs":["arts_infliction","heat_infliction","electric_infliction","nature_infliction","cryo_infliction"],
                      "consumedEffectScaling":{
                        "effects":["heat_infliction","electric_infliction","cryo_infliction","nature_infliction"],
                        "stackAggregation":"sum",
                        "maxStacks":4,
                        "damageAtkMultiplierPerStack":0.8,
                        "damageSequences":[{"sequenceIndex":2,"label":"COMBO SEQUENCE 2","baseAtkMultiplier":1.33,"atkMultiplierPerStack":0.8,"ultimateEnergyGain":10,"consumesConfiguredEffects":true}],
                        "sourceUrl":"https://endfield.wiki.gg/wiki/Rossi",
                        "skillLevel":1
                      },
                      "buffs":[{"id":"rossi_crit_buff","name":"Crit Rate / Crit DMG","appliesEffect":"rossi_crit_buff","persistsForCombo":true,"visible":true,"stackable":false,"durationSeconds":15,"target":"self","critRatePercent":15,"critDamagePercent":30,"iconBase":"assets/buffs/rossi/crit_buff"}],
                      "debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true,"iconBase":"assets/debuffs/lift"},{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/vulnerable"}]
                    },
                    "perfectActionOverride":{
                      "debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true,"iconBase":"assets/debuffs/lift"},{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":2,"maxStacks":4,"iconBase":"assets/debuffs/vulnerable"}]
                    }
                  }
                ],
                "sourceUrl":"https://endfield.wiki.gg/wiki/Rossi"
              }
            }'::jsonb
        ),
        (
            19,
            1902,
            '{
              "delayedFollowUp":{
                "delaySeconds":3.65,
                "timingVerified":true,
                "maxActive":1,
                "detonateOnSkillIds":[1904],
                "earlyDetonationDamageMultiplier":1.3,
                "initialActionOverride":{
                  "damageProfile":null,
                  "debuffs":[{"id":"slow","name":"Slow","appliesEffect":"slow","persistsForCombo":true,"visible":true,"valuePercent":30,"iconBase":"assets/debuffs/slow"}]
                },
                "followUpActionOverride":{
                  "id":"fluorite_improvised_explosive",
                  "name":"Improvised Explosive",
                  "type":"Proc",
                  "shortType":"PROC",
                  "cooldown":0,
                  "energy":0,
                  "sp_cost":0,
                  "damageProfile":{"atkMultiplier":1.87,"hitCount":1,"element":"nature"},
                  "debuffs":[{"id":"nature_infliction","name":"Nature Infliction","appliesEffect":"nature_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/nature_infliction"}],
                  "buffs":[]
                },
                "sourceUrl":"https://endfield.wiki.gg/wiki/Fluorite"
              }
            }'::jsonb
        )
)
update public.operator_skills as skill
set raw_data = coalesce(skill.raw_data, '{}'::jsonb) || mechanics.patch,
    updated_at = now()
from mechanics
where skill.operator_id = mechanics.operator_id
  and skill.id = mechanics.skill_id;

with mechanics(operator_id, skill_id, patch) as (
    values
        (5, 503, '{"ultimateEnergyGain":20,"manualSequence":{"autoComplete":true,"automaticDelaySeconds":1.817,"maxFollowUpDelaySeconds":3.0,"manualFollowUpCountsAsPerfect":false,"perfectTimingWindow":{"targetSeconds":1.817,"startSeconds":1.767,"endSeconds":1.867,"toleranceSeconds":0.05},"perfectTimingVerified":true,"followUpWindowVerified":false,"stages":[{"stage":1,"label":"COMBO SEQUENCE 1","actionOverride":{"damageProfile":{"atkMultiplier":0.67,"hitCount":1,"element":"physical"},"damageSequences":[{"sequenceIndex":1,"label":"COMBO SEQUENCE 1","atkMultiplier":0.67,"ultimateEnergyGain":10}],"ultimateEnergyGain":10,"consumeDebuffs":[],"consumedEffectScaling":null,"buffs":[],"debuffs":[]}},{"stage":2,"label":"COMBO SEQUENCE 2","actionOverride":{"damageProfile":{"atkMultiplier":1.33,"hitCount":1,"element":"physical"},"damageSequences":[{"sequenceIndex":2,"label":"COMBO SEQUENCE 2","baseAtkMultiplier":1.33,"atkMultiplierPerStack":0.8,"ultimateEnergyGain":10,"consumesConfiguredEffects":true}],"ultimateEnergyGain":10,"consumeDebuffs":["arts_infliction","heat_infliction","electric_infliction","nature_infliction","cryo_infliction"],"consumedEffectScaling":{"effects":["heat_infliction","electric_infliction","cryo_infliction","nature_infliction"],"stackAggregation":"sum","maxStacks":4,"damageAtkMultiplierPerStack":0.8,"damageSequences":[{"sequenceIndex":2,"label":"COMBO SEQUENCE 2","baseAtkMultiplier":1.33,"atkMultiplierPerStack":0.8,"ultimateEnergyGain":10,"consumesConfiguredEffects":true}],"sourceUrl":"https://endfield.wiki.gg/wiki/Rossi","skillLevel":1},"buffs":[{"id":"rossi_crit_buff","name":"Crit Rate / Crit DMG","appliesEffect":"rossi_crit_buff","persistsForCombo":true,"visible":true,"stackable":false,"durationSeconds":15,"target":"self","critRatePercent":15,"critDamagePercent":30,"iconBase":"assets/buffs/rossi/crit_buff"}],"debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true,"iconBase":"assets/debuffs/lift"},{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/vulnerable"}]},"perfectActionOverride":{"debuffs":[{"id":"lift","name":"Lift","appliesEffect":"lift","persistsForCombo":false,"visible":true,"iconBase":"assets/debuffs/lift"},{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":2,"maxStacks":4,"iconBase":"assets/debuffs/vulnerable"}]}}],"sourceUrl":"https://endfield.wiki.gg/wiki/Rossi"}}'::jsonb),
        (19, 1902, '{"delayedFollowUp":{"delaySeconds":3.65,"timingVerified":true,"maxActive":1,"detonateOnSkillIds":[1904],"earlyDetonationDamageMultiplier":1.3,"initialActionOverride":{"damageProfile":null,"debuffs":[{"id":"slow","name":"Slow","appliesEffect":"slow","persistsForCombo":true,"visible":true,"valuePercent":30,"iconBase":"assets/debuffs/slow"}]},"followUpActionOverride":{"id":"fluorite_improvised_explosive","name":"Improvised Explosive","type":"Proc","shortType":"PROC","cooldown":0,"energy":0,"sp_cost":0,"damageProfile":{"atkMultiplier":1.87,"hitCount":1,"element":"nature"},"debuffs":[{"id":"nature_infliction","name":"Nature Infliction","appliesEffect":"nature_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/nature_infliction"}],"buffs":[]},"sourceUrl":"https://endfield.wiki.gg/wiki/Fluorite"}}'::jsonb)
)
update public.operators as operator
set raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(
                case when mechanics.patch is not null then skill || mechanics.patch else skill end
                order by ord
            )
            from jsonb_array_elements(operator.raw_data->'skills') with ordinality as items(skill, ord)
            left join mechanics
              on mechanics.operator_id = operator.id
             and (skill->>'id')::integer = mechanics.skill_id
        ),
        true
    ),
    updated_at = now()
where operator.id in (5, 19)
  and jsonb_typeof(operator.raw_data->'skills') = 'array';

commit;
