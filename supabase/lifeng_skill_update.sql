-- Updates Lifeng skill metadata in Supabase.
-- Run after supabase/schema.sql and after importing operator data.

begin;

with skill_updates(
    skill_id,
    description,
    combo_trigger,
    combo_trigger_mode,
    raw_data
) as (
    values
        (
            2102,
            'Deals 3 hits of Physical DMG, applies Knock Down and 1 Vulnerable stack. If the target had no Vulnerable stacks before the last hit, also applies Physical Susceptibility.',
            null,
            null,
            '{
                "id": 2102,
                "name": "Turbid Avatar",
                "icon": "assets/operators/avatars/Lifeng.png",
                "iconSmall": "assets/operators/skills/lifeng/bs_small.png",
                "type": "Battle Skill",
                "shortType": "BS",
                "cooldown": 0,
                "energy": 100,
                "sp_cost": 100,
                "elementType": "physical",
                "description": "Deals 3 hits of Physical DMG, applies Knock Down and 1 Vulnerable stack. If the target had no Vulnerable stacks before the last hit, also applies Physical Susceptibility.",
                "conditionalDebuffs": [
                    {
                        "noneOf": ["vulnerable"],
                        "debuffs": [
                            {
                                "id": "physical_susceptibility",
                                "name": "Physical Susceptibility",
                                "appliesEffect": "physical_susceptibility",
                                "persistsForCombo": true,
                                "visible": true,
                                "stackable": false
                            }
                        ]
                    }
                ],
                "debuffs": [
                    {
                        "id": "knock_down",
                        "name": "Knock Down",
                        "appliesEffect": "knock_down",
                        "persistsForCombo": false,
                        "visible": true
                    },
                    {
                        "id": "vulnerable",
                        "name": "Vulnerable",
                        "appliesEffect": "vulnerable",
                        "persistsForCombo": true,
                        "visible": true,
                        "stackable": true,
                        "stacksApplied": 1,
                        "maxStacks": 4
                    }
                ]
            }'::jsonb
        ),
        (
            2103,
            'Triggers when the controlled operator performs a Final Strike on an enemy with Physical Susceptibility or Breach. Deals Physical DMG and grants Link.',
            null,
            'all',
            '{
                "id": 2103,
                "name": "Aspect of Wrath",
                "icon": "assets/operators/avatars/Lifeng.png",
                "iconSmall": "assets/operators/skills/lifeng/cs_small.png",
                "type": "Combo Skill",
                "shortType": "CS",
                "cooldown": 0,
                "energy": 0,
                "elementType": "physical",
                "description": "Triggers when the controlled operator performs a Final Strike on an enemy with Physical Susceptibility or Breach. Deals Physical DMG and grants Link.",
                "comboTriggerMode": "all",
                "allowSelfTrigger": true,
                "comboTriggers": [
                    { "effect": "final_strike", "minStacks": 1 },
                    {
                        "anyOf": [
                            { "effect": "physical_susceptibility", "minStacks": 1 },
                            { "effect": "breach", "minStacks": 1 }
                        ]
                    }
                ],
                "buffs": [
                    {
                        "id": "link",
                        "name": "Link",
                        "appliesEffect": "link",
                        "persistsForCombo": true,
                        "visible": true,
                        "iconBase": "assets/buffs/link"
                    }
                ]
            }'::jsonb
        )
)
update public.operator_skills as skill
set
    description = updates.description,
    combo_trigger = updates.combo_trigger,
    combo_trigger_mode = updates.combo_trigger_mode,
    raw_data = updates.raw_data,
    updated_at = now()
from skill_updates as updates
where skill.id = updates.skill_id
  and skill.operator_id = 21;

with skill_updates(skill_id, raw_data) as (
    values
        (
            2102,
            '{
                "id": 2102,
                "name": "Turbid Avatar",
                "icon": "assets/operators/avatars/Lifeng.png",
                "iconSmall": "assets/operators/skills/lifeng/bs_small.png",
                "type": "Battle Skill",
                "shortType": "BS",
                "cooldown": 0,
                "energy": 100,
                "sp_cost": 100,
                "elementType": "physical",
                "description": "Deals 3 hits of Physical DMG, applies Knock Down and 1 Vulnerable stack. If the target had no Vulnerable stacks before the last hit, also applies Physical Susceptibility.",
                "conditionalDebuffs": [
                    {
                        "noneOf": ["vulnerable"],
                        "debuffs": [
                            {
                                "id": "physical_susceptibility",
                                "name": "Physical Susceptibility",
                                "appliesEffect": "physical_susceptibility",
                                "persistsForCombo": true,
                                "visible": true,
                                "stackable": false
                            }
                        ]
                    }
                ],
                "debuffs": [
                    {
                        "id": "knock_down",
                        "name": "Knock Down",
                        "appliesEffect": "knock_down",
                        "persistsForCombo": false,
                        "visible": true
                    },
                    {
                        "id": "vulnerable",
                        "name": "Vulnerable",
                        "appliesEffect": "vulnerable",
                        "persistsForCombo": true,
                        "visible": true,
                        "stackable": true,
                        "stacksApplied": 1,
                        "maxStacks": 4
                    }
                ]
            }'::jsonb
        ),
        (
            2103,
            '{
                "id": 2103,
                "name": "Aspect of Wrath",
                "icon": "assets/operators/avatars/Lifeng.png",
                "iconSmall": "assets/operators/skills/lifeng/cs_small.png",
                "type": "Combo Skill",
                "shortType": "CS",
                "cooldown": 0,
                "energy": 0,
                "elementType": "physical",
                "description": "Triggers when the controlled operator performs a Final Strike on an enemy with Physical Susceptibility or Breach. Deals Physical DMG and grants Link.",
                "comboTriggerMode": "all",
                "allowSelfTrigger": true,
                "comboTriggers": [
                    { "effect": "final_strike", "minStacks": 1 },
                    {
                        "anyOf": [
                            { "effect": "physical_susceptibility", "minStacks": 1 },
                            { "effect": "breach", "minStacks": 1 }
                        ]
                    }
                ],
                "buffs": [
                    {
                        "id": "link",
                        "name": "Link",
                        "appliesEffect": "link",
                        "persistsForCombo": true,
                        "visible": true,
                        "iconBase": "assets/buffs/link"
                    }
                ]
            }'::jsonb
        )
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
                on (skill->>'id')::integer = updates.skill_id
        ),
        true
    ),
    updated_at = now()
where operator.id = 21
  and jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_updates as updates
        on (skill->>'id')::integer = updates.skill_id
  );

commit;
