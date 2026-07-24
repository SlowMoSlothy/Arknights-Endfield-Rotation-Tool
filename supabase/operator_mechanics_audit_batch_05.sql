begin;

-- Operator mechanics audit, batch 05 (stack-scaling foundation).
-- The client only evaluates the generic triggerEffectScaling and
-- consumedEffectScaling shapes. Operator names, stack tables, damage values,
-- SP values, and sequence layouts remain in Supabase.

with mechanics(operator_id, skill_id, patch) as (
    values
        (
            22,
            2202,
            '{
              "spRecovery": {
                "effect": "vulnerable",
                "phase": "before",
                "amountByStacks": {"1":5,"2":10,"3":20,"4":30},
                "maxStacks": 4,
                "source": "The Pulverizing Front"
              }
            }'::jsonb
        ),
        (
            22,
            2203,
            '{
              "ultimateEnergyGain": 10,
              "triggerEffectScaling": {
                "effect": "vulnerable_consumed",
                "stackSource": "trigger",
                "maxStacks": 4,
                "variantsByStacks": {
                  "1": {
                    "damageProfile":{"atkMultiplier":0.42,"hitCount":1},
                    "damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":0.42,"spRecovery":5}],
                    "spRecovery":5,
                    "ultimateEnergyGain":10
                  },
                  "2": {
                    "damageProfile":{"atkMultiplier":0.96,"hitCount":2},
                    "damageSequences":[
                      {"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":0.42,"spRecovery":5},
                      {"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":0.54,"spRecovery":7}
                    ],
                    "spRecovery":12,
                    "ultimateEnergyGain":10
                  },
                  "3": {
                    "damageProfile":{"atkMultiplier":1.62,"hitCount":3},
                    "damageSequences":[
                      {"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":0.42,"spRecovery":5},
                      {"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":0.54,"spRecovery":7},
                      {"sequenceIndex":3,"label":"SEQ 3","atkMultiplier":0.66,"spRecovery":13}
                    ],
                    "spRecovery":25,
                    "ultimateEnergyGain":10
                  },
                  "4": {
                    "damageProfile":{"atkMultiplier":2.28,"hitCount":3},
                    "damageSequences":[
                      {"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":0.42,"spRecovery":5},
                      {"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":0.54,"spRecovery":7},
                      {"sequenceIndex":3,"label":"Enhanced SEQ 3","atkMultiplier":1.32,"spRecovery":23,"enhanced":true}
                    ],
                    "spRecovery":35,
                    "ultimateEnergyGain":10
                  }
                },
                "sourceUrl":"https://endfield.wiki.gg/wiki/Pogranichnik",
                "skillLevel":1
              }
            }'::jsonb
        ),
        (
            5,
            503,
            '{
              "ultimateEnergyGain":20,
              "consumedEffectScaling": {
                "effects":["heat_infliction","electric_infliction","cryo_infliction","nature_infliction"],
                "stackAggregation":"sum",
                "maxStacks":4,
                "damageAtkMultiplierPerStack":0.8,
                "damageSequences":[
                  {"sequenceIndex":1,"label":"COMBO SEQUENCE 1","baseAtkMultiplier":0.67,"ultimateEnergyGain":10},
                  {"sequenceIndex":2,"label":"COMBO SEQUENCE 2","baseAtkMultiplier":1.33,"atkMultiplierPerStack":0.8,"ultimateEnergyGain":10,"consumesConfiguredEffects":true}
                ],
                "sourceUrl":"https://endfield.wiki.gg/wiki/Rossi",
                "skillLevel":1
              },
              "buffs":[{
                "id":"rossi_crit_buff",
                "name":"Crit Rate / Crit DMG",
                "appliesEffect":"rossi_crit_buff",
                "persistsForCombo":true,
                "visible":true,
                "stackable":false,
                "durationSeconds":15,
                "target":"self",
                "critRatePercent":15,
                "critDamagePercent":30,
                "iconBase":"assets/buffs/rossi/crit_buff"
              }]
            }'::jsonb
        )
)
update public.operator_skills as skill
set raw_data = coalesce(skill.raw_data, '{}'::jsonb) || mechanics.patch,
    updated_at = now()
from mechanics
where skill.operator_id = mechanics.operator_id
  and skill.id = mechanics.skill_id;

-- Keep the embedded operator payload aligned with operator_skills so both
-- loading paths receive the same Supabase mechanics.
with mechanics(operator_id, skill_id, patch) as (
    values
        (22, 2202, '{"spRecovery":{"effect":"vulnerable","phase":"before","amountByStacks":{"1":5,"2":10,"3":20,"4":30},"maxStacks":4,"source":"The Pulverizing Front"}}'::jsonb),
        (22, 2203, '{"ultimateEnergyGain":10,"triggerEffectScaling":{"effect":"vulnerable_consumed","stackSource":"trigger","maxStacks":4,"variantsByStacks":{"1":{"damageProfile":{"atkMultiplier":0.42,"hitCount":1},"damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":0.42,"spRecovery":5}],"spRecovery":5,"ultimateEnergyGain":10},"2":{"damageProfile":{"atkMultiplier":0.96,"hitCount":2},"damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":0.42,"spRecovery":5},{"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":0.54,"spRecovery":7}],"spRecovery":12,"ultimateEnergyGain":10},"3":{"damageProfile":{"atkMultiplier":1.62,"hitCount":3},"damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":0.42,"spRecovery":5},{"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":0.54,"spRecovery":7},{"sequenceIndex":3,"label":"SEQ 3","atkMultiplier":0.66,"spRecovery":13}],"spRecovery":25,"ultimateEnergyGain":10},"4":{"damageProfile":{"atkMultiplier":2.28,"hitCount":3},"damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":0.42,"spRecovery":5},{"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":0.54,"spRecovery":7},{"sequenceIndex":3,"label":"Enhanced SEQ 3","atkMultiplier":1.32,"spRecovery":23,"enhanced":true}],"spRecovery":35,"ultimateEnergyGain":10}},"sourceUrl":"https://endfield.wiki.gg/wiki/Pogranichnik","skillLevel":1}}'::jsonb),
        (5, 503, '{"ultimateEnergyGain":20,"consumedEffectScaling":{"effects":["heat_infliction","electric_infliction","cryo_infliction","nature_infliction"],"stackAggregation":"sum","maxStacks":4,"damageAtkMultiplierPerStack":0.8,"damageSequences":[{"sequenceIndex":1,"label":"COMBO SEQUENCE 1","baseAtkMultiplier":0.67,"ultimateEnergyGain":10},{"sequenceIndex":2,"label":"COMBO SEQUENCE 2","baseAtkMultiplier":1.33,"atkMultiplierPerStack":0.8,"ultimateEnergyGain":10,"consumesConfiguredEffects":true}],"sourceUrl":"https://endfield.wiki.gg/wiki/Rossi","skillLevel":1},"buffs":[{"id":"rossi_crit_buff","name":"Crit Rate / Crit DMG","appliesEffect":"rossi_crit_buff","persistsForCombo":true,"visible":true,"stackable":false,"durationSeconds":15,"target":"self","critRatePercent":15,"critDamagePercent":30,"iconBase":"assets/buffs/rossi/crit_buff"}]}'::jsonb)
)
update public.operators as operator
set raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(
                case
                    when mechanics.patch is not null then skill || mechanics.patch
                    else skill
                end
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
where operator.id in (5, 22)
  and jsonb_typeof(operator.raw_data->'skills') = 'array';

commit;
