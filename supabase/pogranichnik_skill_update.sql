-- Updates Pogranichnik skill metadata in Supabase.
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
            2202,
            'Performs 2 slashes, deals Physical DMG, applies Breach, and consumes Vulnerable stacks for SP recovery.',
            null,
            null,
            '{
                "id": 2202,
                "name": "The Pulverizing Front",
                "icon": "assets/operators/avatars/Pogranichnik.png",
                "iconSmall": "assets/operators/skills/pogranichnik/bs_small.png",
                "type": "Battle Skill",
                "shortType": "BS",
                "cooldown": 0,
                "energy": 100,
                "sp_cost": 100,
                "elementType": "physical",
                "description": "Performs 2 slashes, deals Physical DMG, applies Breach, and consumes Vulnerable stacks for SP recovery.",
                "spRecovery": {
                    "effects": ["vulnerable"],
                    "amountByStacks": {
                        "1": 5,
                        "2": 10,
                        "3": 20,
                        "4": 30
                    },
                    "maxStacks": 4,
                    "source": "The Pulverizing Front"
                },
                "consumeDebuffs": ["vulnerable"],
                "debuffs": [
                    {
                        "id": "breach",
                        "name": "Breach",
                        "appliesEffect": "breach",
                        "persistsForCombo": false,
                        "visible": true,
                        "icon": "assets/ui/debuffs/breach.svg"
                    }
                ]
            }'::jsonb
        ),
        (
            2203,
            'Triggers when Breach or Crush consumes Vulnerable stacks. Deals Physical DMG and recovers SP.',
            null,
            'all',
            '{
                "id": 2203,
                "name": "Full Moon Slash",
                "icon": "assets/operators/avatars/Pogranichnik.png",
                "iconSmall": "assets/operators/skills/pogranichnik/cs_small.png",
                "type": "Combo Skill",
                "shortType": "CS",
                "cooldown": 18,
                "energy": 0,
                "elementType": "physical",
                "description": "Triggers when Breach or Crush consumes Vulnerable stacks. Deals Physical DMG and recovers SP.",
                "spRecovery": {
                    "effects": ["vulnerable"],
                    "amountByStacks": {
                        "1": 5,
                        "2": 12,
                        "3": 25,
                        "4": 35
                    },
                    "maxStacks": 4,
                    "fallbackStacks": 1,
                    "source": "Full Moon Slash"
                },
                "comboTriggerMode": "all",
                "allowSelfTrigger": true,
                "comboTriggers": [
                    { "effect": "vulnerable_consumed", "minStacks": 1 },
                    {
                        "anyOf": [
                            { "effect": "breach", "minStacks": 1 },
                            { "effect": "crush", "minStacks": 1 }
                        ]
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
  and skill.operator_id = 22;

with skill_updates(skill_id, raw_data) as (
    values
        (
            2202,
            '{
                "id": 2202,
                "name": "The Pulverizing Front",
                "icon": "assets/operators/avatars/Pogranichnik.png",
                "iconSmall": "assets/operators/skills/pogranichnik/bs_small.png",
                "type": "Battle Skill",
                "shortType": "BS",
                "cooldown": 0,
                "energy": 100,
                "sp_cost": 100,
                "elementType": "physical",
                "description": "Performs 2 slashes, deals Physical DMG, applies Breach, and consumes Vulnerable stacks for SP recovery.",
                "spRecovery": {
                    "effects": ["vulnerable"],
                    "amountByStacks": {
                        "1": 5,
                        "2": 10,
                        "3": 20,
                        "4": 30
                    },
                    "maxStacks": 4,
                    "source": "The Pulverizing Front"
                },
                "consumeDebuffs": ["vulnerable"],
                "debuffs": [
                    {
                        "id": "breach",
                        "name": "Breach",
                        "appliesEffect": "breach",
                        "persistsForCombo": false,
                        "visible": true,
                        "icon": "assets/ui/debuffs/breach.svg"
                    }
                ]
            }'::jsonb
        ),
        (
            2203,
            '{
                "id": 2203,
                "name": "Full Moon Slash",
                "icon": "assets/operators/avatars/Pogranichnik.png",
                "iconSmall": "assets/operators/skills/pogranichnik/cs_small.png",
                "type": "Combo Skill",
                "shortType": "CS",
                "cooldown": 18,
                "energy": 0,
                "elementType": "physical",
                "description": "Triggers when Breach or Crush consumes Vulnerable stacks. Deals Physical DMG and recovers SP.",
                "spRecovery": {
                    "effects": ["vulnerable"],
                    "amountByStacks": {
                        "1": 5,
                        "2": 12,
                        "3": 25,
                        "4": 35
                    },
                    "maxStacks": 4,
                    "fallbackStacks": 1,
                    "source": "Full Moon Slash"
                },
                "comboTriggerMode": "all",
                "allowSelfTrigger": true,
                "comboTriggers": [
                    { "effect": "vulnerable_consumed", "minStacks": 1 },
                    {
                        "anyOf": [
                            { "effect": "breach", "minStacks": 1 },
                            { "effect": "crush", "minStacks": 1 }
                        ]
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
where operator.id = 22
  and jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_updates as updates
        on (skill->>'id')::integer = updates.skill_id
  );

commit;
