begin;

-- Operator mechanics audit, batch 05C (persistent fields and resource conversion).
-- The client evaluates only generic battlefieldResource, activeEffectScaling,
-- activeEffectExtensions, and skillValueByStacks structures.

with mechanics(operator_id, skill_id, patch) as (
    values
        (
            15,
            1503,
            '{
              "cooldown":14,
              "damageProfile":{"atkMultiplier":1.07,"hitCount":1,"element":"cryo"},
              "ultimateEnergyGain":10,
              "buffs":[],
              "battlefieldResource":{
                "resourceKey":"whirlpool",
                "name":"Whirlpool",
                "ownerOperatorId":15,
                "maxStacks":2,
                "durationSeconds":30,
                "displayTrack":"buff",
                "iconBase":"assets/operators/skills/tangtang/65px-Combo-Tangtang",
                "creation":{"guaranteedStacks":1,"maxStacksPerUse":1},
                "sourceUrl":"https://endfield.wiki.gg/wiki/Tangtang",
                "skillLevel":1
              }
            }'::jsonb
        ),
        (
            15,
            1502,
            '{
              "damageProfile":{"atkMultiplier":2.13,"hitCount":2,"element":"cryo"},
              "damageSequences":[{"sequenceIndex":1,"label":"Shot","atkMultiplier":0.8},{"sequenceIndex":2,"label":"Waterspout 1","atkMultiplier":1.33}],
              "battlefieldResource":{
                "resourceKey":"whirlpool",
                "name":"Whirlpool",
                "ownerOperatorId":15,
                "maxStacks":2,
                "durationSeconds":30,
                "displayTrack":"buff",
                "iconBase":"assets/operators/skills/tangtang/65px-Combo-Tangtang",
                "consumption":{"consumeAllActive":true},
                "outcomesByConsumedStacks":{
                  "0":{"actionOverride":{"damageProfile":{"atkMultiplier":2.13,"hitCount":2,"element":"cryo"},"damageSequences":[{"sequenceIndex":1,"label":"Shot","atkMultiplier":0.8},{"sequenceIndex":2,"label":"Waterspout 1","atkMultiplier":1.33}],"spRecovery":0,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}]}},
                  "1":{"actionOverride":{"damageProfile":{"atkMultiplier":3.46,"hitCount":3,"element":"cryo"},"damageSequences":[{"sequenceIndex":1,"label":"Shot","atkMultiplier":0.8},{"sequenceIndex":2,"label":"Waterspout 1","atkMultiplier":1.33},{"sequenceIndex":3,"label":"Waterspout 2","atkMultiplier":1.33}],"spRecovery":20,"spReturn":true,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","persistsForCombo":true,"visible":true,"stackable":false,"valuePercent":3,"durationSeconds":15,"iconBase":"assets/debuffs/arts_susceptibility"}]}},
                  "2":{"actionOverride":{"damageProfile":{"atkMultiplier":4.79,"hitCount":4,"element":"cryo"},"damageSequences":[{"sequenceIndex":1,"label":"Shot","atkMultiplier":0.8},{"sequenceIndex":2,"label":"Waterspout 1","atkMultiplier":1.33},{"sequenceIndex":3,"label":"Waterspout 2","atkMultiplier":1.33},{"sequenceIndex":4,"label":"Waterspout 3","atkMultiplier":1.33}],"spRecovery":40,"spReturn":true,"debuffs":[{"id":"cryo_infliction","name":"Cryo Infliction","appliesEffect":"cryo_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","persistsForCombo":true,"visible":true,"stackable":false,"valuePercent":6,"durationSeconds":15,"iconBase":"assets/debuffs/arts_susceptibility"}]}}
                },
                "sourceUrl":"https://endfield.wiki.gg/wiki/Tangtang",
                "skillLevel":1
              }
            }'::jsonb
        ),
        (
            11,
            1104,
            '{
              "damageProfile":{"atkMultiplier":3.33,"hitCount":1,"element":"nature"},
              "debuffs":[{"id":"nature_infliction","name":"Nature Infliction","appliesEffect":"nature_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"iconBase":"assets/debuffs/nature_infliction"},{"id":"slow","name":"Slow","appliesEffect":"slow","persistsForCombo":true,"visible":true,"stackable":false,"valuePercent":80,"durationSeconds":5},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","persistsForCombo":true,"visible":true,"stackable":false,"valuePercent":18,"durationSeconds":5,"iconBase":"assets/debuffs/arts_susceptibility"}],
              "activeEffectScaling":{"effect":"vulnerable","maxStacks":4,"effectValues":[{"effect":"arts_susceptibility","baseValuePercent":18,"valuePercentPerStack":1.8,"durationSeconds":5}],"sourceUrl":"https://endfield.wiki.gg/wiki/Gilberta","skillLevel":1},
              "activeEffectExtensions":[{"effect":"lift","durationSeconds":5,"visible":true}],
              "field":{"name":"Anomalous Gravity Field","durationSeconds":5,"snapshotEffects":["vulnerable"],"displayTrack":"debuff"}
            }'::jsonb
        ),
        (
            21,
            2103,
            '{
              "damageProfile":{"atkMultiplier":1.11,"hitCount":1,"element":"physical"},
              "ultimateEnergyGain":10,
              "buffs":[{"id":"link","name":"Link","appliesEffect":"link","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"consumeOnSkillType":["Battle Skill","Ultimate"],"consumeAllStacks":true,"iconBase":"assets/ui/buffs/link","skillValueByStacks":{"valueField":"multiplicativeDamageBonusPercent","maxStacks":4,"valuesBySkillType":{"battle_skill":{"1":30,"2":45,"3":60,"4":75},"bs":{"1":30,"2":45,"3":60,"4":75},"ultimate":{"1":20,"2":30,"3":40,"4":50},"ult":{"1":20,"2":30,"3":40,"4":50}}},"verified":true,"sourceUrl":"https://endfield.wiki.gg/wiki/Damage"}]
            }'::jsonb
        ),
        (
            21,
            2104,
            '{
              "damageProfile":{"atkMultiplier":3.56,"hitCount":2,"element":"physical"},
              "damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":1.78},{"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":1.78}],
              "debuffs":[{"id":"knock_down","name":"Knock Down x2","appliesEffect":"knock_down","persistsForCombo":false,"visible":true},{"id":"vulnerable","name":"Vulnerable","appliesEffect":"vulnerable","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":2,"maxStacks":4}],
              "activeEffectScaling":{"effect":"link","maxStacks":4,"variantsByStacks":{"1":{"damageProfile":{"atkMultiplier":6.23,"hitCount":3,"element":"physical"},"damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":1.78},{"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":1.78},{"sequenceIndex":3,"label":"Link Additional Hit","atkMultiplier":2.67,"requiresEffect":"link"}]},"2":{"damageProfile":{"atkMultiplier":6.23,"hitCount":3,"element":"physical"},"damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":1.78},{"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":1.78},{"sequenceIndex":3,"label":"Link Additional Hit","atkMultiplier":2.67,"requiresEffect":"link"}]},"3":{"damageProfile":{"atkMultiplier":6.23,"hitCount":3,"element":"physical"},"damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":1.78},{"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":1.78},{"sequenceIndex":3,"label":"Link Additional Hit","atkMultiplier":2.67,"requiresEffect":"link"}]},"4":{"damageProfile":{"atkMultiplier":6.23,"hitCount":3,"element":"physical"},"damageSequences":[{"sequenceIndex":1,"label":"SEQ 1","atkMultiplier":1.78},{"sequenceIndex":2,"label":"SEQ 2","atkMultiplier":1.78},{"sequenceIndex":3,"label":"Link Additional Hit","atkMultiplier":2.67,"requiresEffect":"link"}]}},"sourceUrl":"https://endfield.wiki.gg/wiki/Lifeng","skillLevel":1}
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

-- Link is a universal combat buff, so every Supabase source uses the same
-- stack table and consumption behavior.
update public.buff_registry
set stackable = true,
    max_stacks = 4,
    consume_on_skill_type = null,
    consume_stacks = null,
    raw_data = coalesce(raw_data, '{}'::jsonb) || '{"name":"Link","iconBase":"assets/ui/buffs/link","stackable":true,"maxStacks":4,"consumeOnSkillType":["Battle Skill","Ultimate"],"consumeAllStacks":true,"skillValueByStacks":{"valueField":"multiplicativeDamageBonusPercent","maxStacks":4,"valuesBySkillType":{"battle_skill":{"1":30,"2":45,"3":60,"4":75},"bs":{"1":30,"2":45,"3":60,"4":75},"ultimate":{"1":20,"2":30,"3":40,"4":50},"ult":{"1":20,"2":30,"3":40,"4":50}}},"verified":true,"sourceUrl":"https://endfield.wiki.gg/wiki/Damage"}'::jsonb,
    updated_at = now()
where effect_key = 'link';

with updated_skills as (
    select operator_id, id, raw_data
    from public.operator_skills
    where (operator_id, id) in ((15,1502),(15,1503),(11,1104),(21,2103),(21,2104))
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
where operator.id in (11,15,21)
  and jsonb_typeof(operator.raw_data->'skills') = 'array';

commit;
