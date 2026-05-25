-- Updates verified skill metadata for the first operator review batch.
-- Covers Alesh, Xaihi, Zhuang Fangyi, and Last Rite.
-- Run after supabase/schema.sql and after importing operator data.

begin;

with skill_updates(
    operator_id,
    skill_id,
    description,
    combo_trigger,
    combo_trigger_mode,
    raw_data
) as (
    values
        (
            10,
            1003,
            'Triggers when an Arts Reaction or Originium Crystals are consumed. Deals Physical DMG and recovers SP.',
            null,
            'all',
            '{
                "id": 1003,
                "name": "Auger Angling",
                "icon": "assets/operators/avatars/Alesh.png",
                "iconSmall": "assets/operators/skills/alesh/cs_small.png",
                "type": "Combo Skill",
                "shortType": "CS",
                "elementType": "physical",
                "cooldown": 9,
                "energy": 0,
                "description": "Triggers when an Arts Reaction or Originium Crystals are consumed. Deals Physical DMG and recovers SP.",
                "spRecovery": {
                    "amount": 10,
                    "source": "Auger Angling"
                },
                "comboTriggerMode": "all",
                "comboTriggers": [
                    {
                        "anyOf": [
                            { "effect": "arts_reaction_consumed", "minStacks": 1 },
                            { "effect": "combustion_consumed", "minStacks": 1 },
                            { "effect": "corrosion_consumed", "minStacks": 1 },
                            { "effect": "solidification_consumed", "minStacks": 1 },
                            { "effect": "originium_crystal_consumed", "minStacks": 1 }
                        ]
                    }
                ],
                "allowSelfTrigger": true,
                "buffs": [
                    {
                        "id": "sp_recovery",
                        "name": "SP Recovery",
                        "appliesEffect": "sp_recovery",
                        "visible": false,
                        "persistsForCombo": false
                    }
                ]
            }'::jsonb
        ),
        (
            25,
            2502,
            'Summons Auxiliary Crystal. The crystal provides HP Treatment after Final Strikes and grants Arts Amp if HP is full.',
            null,
            null,
            '{
                "id": 2502,
                "name": "Distributed DoS",
                "icon": "assets/operators/avatars/Xaihi.png",
                "iconSmall": "assets/operators/skills/xaihi/bs_small.png",
                "type": "Battle Skill",
                "shortType": "BS",
                "cooldown": 20,
                "energy": 100,
                "sp_cost": 100,
                "elementType": "cryo",
                "description": "Summons Auxiliary Crystal. The crystal provides HP Treatment after Final Strikes and grants Arts Amp if HP is full.",
                "buffs": [
                    {
                        "id": "auxiliary_crystal",
                        "name": "Auxiliary Crystal",
                        "appliesEffect": "auxiliary_crystal",
                        "persistsForCombo": true,
                        "visible": true,
                        "stackable": true,
                        "stacksApplied": 2,
                        "maxStacks": 2
                    }
                ]
            }'::jsonb
        ),
        (
            9,
            902,
            'Consumes Electrification to create Sunderblades, channels nearby Sunderblades for Thunder Strikes, and grants Electric Amp.',
            null,
            null,
            '{
                "id": 902,
                "name": "Mantra of Sundering",
                "icon": "assets/operators/avatars/Zhuang.png",
                "iconSmall": "assets/operators/skills/zhuang/bs_small.svg",
                "type": "Battle Skill",
                "cooldown": 20,
                "energy": 100,
                "sp_cost": 100,
                "elementType": "electric",
                "shortType": "BS",
                "description": "Consumes Electrification to create Sunderblades, channels nearby Sunderblades for Thunder Strikes, and grants Electric Amp.",
                "consumeDebuffs": ["electrification"],
                "buffs": [
                    {
                        "id": "electric_amp",
                        "name": "Electric Amp",
                        "appliesEffect": "electric_amp",
                        "persistsForCombo": true,
                        "visible": true,
                        "stackable": false
                    }
                ]
            }'::jsonb
        ),
        (
            9,
            903,
            'Triggers on Final Strike or Finisher against a target with Electric Infliction. Consumes Electric Infliction to forcibly apply Electrification.',
            null,
            'all',
            '{
                "id": 903,
                "name": "Breath of Transformation",
                "icon": "assets/operators/avatars/Zhuang.png",
                "iconSmall": "assets/operators/skills/zhuang/cs_small.png",
                "type": "Combo Skill",
                "cooldown": 17,
                "energy": 0,
                "elementType": "electric",
                "shortType": "CS",
                "description": "Triggers on Final Strike or Finisher against a target with Electric Infliction. Consumes Electric Infliction to forcibly apply Electrification.",
                "comboTriggerMode": "all",
                "comboTriggers": [
                    { "effect": "final_strike", "minStacks": 1 },
                    { "effect": "electric_infliction", "minStacks": 1 }
                ],
                "allowSelfTrigger": true,
                "consumeDebuffs": ["electric_infliction"],
                "debuffs": [
                    {
                        "id": "electrification",
                        "name": "Electrification",
                        "appliesEffect": "electrification",
                        "persistsForCombo": true,
                        "visible": true,
                        "stackable": false
                    }
                ]
            }'::jsonb
        ),
        (
            9,
            904,
            'Transforms into Empyrean of Truth, enhancing Zhuang Fangyi''s basic attacks, Battle Skill, and Combo Skill for a duration.',
            null,
            null,
            '{
                "id": 904,
                "name": "Smiting Tempest",
                "icon": "assets/operators/avatars/Zhuang.png",
                "iconSmall": "assets/operators/skills/zhuang/ult_small.png",
                "type": "Ultimate",
                "cooldown": 20,
                "energy": 240,
                "elementType": "electric",
                "shortType": "Ult",
                "description": "Transforms into Empyrean of Truth, enhancing Zhuang Fangyi''s basic attacks, Battle Skill, and Combo Skill for a duration."
            }'::jsonb
        ),
        (
            20,
            2002,
            'Applies Hypothermic Perfusion to the controlled operator''s weapon and returns 30 SP. The next Final Strike within the duration creates Last Rite''s Mirage, dealing Cryo DMG and applying Cryo Infliction.',
            null,
            null,
            '{
                "id": 2002,
                "name": "Esoteric Legacy of Seš''qa",
                "icon": "assets/operators/avatars/Last_Rite.png",
                "iconSmall": "assets/operators/skills/lastrite/bs_small.png",
                "type": "Battle Skill",
                "shortType": "BS",
                "cooldown": 20,
                "energy": 100,
                "sp_cost": 100,
                "elementType": "cryo",
                "description": "Applies Hypothermic Perfusion to the controlled operator''s weapon and returns 30 SP. The next Final Strike within the duration creates Last Rite''s Mirage, dealing Cryo DMG and applying Cryo Infliction.",
                "spRecovery": {
                    "amount": 30,
                    "source": "Esoteric Legacy of Seš''qa"
                },
                "buffs": [
                    {
                        "id": "hypothermic_perfusion",
                        "name": "Hypothermic Perfusion",
                        "appliesEffect": "hypothermic_perfusion",
                        "persistsForCombo": true,
                        "visible": true,
                        "consumeOnSkillType": "final_strike",
                        "consumeStacks": 1
                    }
                ]
            }'::jsonb
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
    values
        (10, 1003, (select raw_data from public.operator_skills where id = 1003 and operator_id = 10)),
        (25, 2502, (select raw_data from public.operator_skills where id = 2502 and operator_id = 25)),
        (9, 902, (select raw_data from public.operator_skills where id = 902 and operator_id = 9)),
        (9, 903, (select raw_data from public.operator_skills where id = 903 and operator_id = 9)),
        (9, 904, (select raw_data from public.operator_skills where id = 904 and operator_id = 9)),
        (20, 2002, (select raw_data from public.operator_skills where id = 2002 and operator_id = 20))
)
update public.operators as operator
set
    raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(
                coalesce(updates.raw_data, skill)
                order by ord
            )
            from jsonb_array_elements(operator.raw_data->'skills') with ordinality as items(skill, ord)
            left join skill_updates as updates
                on updates.operator_id = operator.id
               and (skill->>'id')::integer = updates.skill_id
        ),
        true
    ),
    updated_at = now()
where operator.id in (9, 10, 20, 25)
  and jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_updates as updates
        on updates.operator_id = operator.id
       and (skill->>'id')::integer = updates.skill_id
  );

commit;
