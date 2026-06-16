-- Updates Mi Fu with the currently known live profile and combat values.
-- Run after supabase/schema.sql and supabase/seed_mi_fu.sql.

begin;

update public.operators
set
    raw_data = (raw_data - 'sourceNote') || '{
        "weaponType": "Greatsword",
        "mainAttribute": "Strength",
        "secondaryAttribute": "Will",
        "race": "Sarkaz",
        "faction": "Hongshan Academy of Sciences",
        "voiceActors": {
            "en": "Rao Zijun",
            "jp": "Akeno Watanabe"
        },
        "stats": {
            "level1": {
                "hp": 500,
                "attack": 30,
                "strength": 22,
                "agility": 10,
                "intellect": 9,
                "will": 14
            },
            "level90": {
                "hp": 5495,
                "attack": 315,
                "strength": 174,
                "agility": 92,
                "intellect": 90,
                "will": 143
            }
        },
        "attributeIncreases": {
            "strength": [10, 15, 15, 20]
        },
        "talents": [
            {
                "name": "Stern Crackdown",
                "levels": [
                    {
                        "level": 1,
                        "worldSplitterMultiplierAgainstPhysicalSusceptibilityOrStagger": 1.1
                    },
                    {
                        "level": 2,
                        "worldSplitterMultiplierAgainstPhysicalSusceptibilityOrStagger": 1.2
                    }
                ]
            },
            {
                "name": "Vigilant Fury",
                "levels": [
                    {
                        "level": 1,
                        "shieldMaxHpPercent": 15,
                        "durationSeconds": 10,
                        "cooldownSeconds": 60
                    },
                    {
                        "level": 2,
                        "shieldMaxHpPercent": 30,
                        "durationSeconds": 10,
                        "cooldownSeconds": 60
                    }
                ]
            }
        ],
        "potentials": [
            {
                "level": 1,
                "name": "Restless Watch",
                "comboCooldownReductionSeconds": 2,
                "physicalSusceptibilityBonusPercent": 5,
                "physicalSusceptibilityDurationBonusSeconds": 4
            },
            {
                "level": 2,
                "name": "Kinesthesia of Harmony",
                "strength": 20,
                "artsIntensity": 16
            },
            {
                "level": 3,
                "name": "Complete Warmup",
                "shieldDurationBonusSeconds": 5,
                "shieldCooldownReductionSeconds": 15,
                "attackBonusPercent": 6,
                "attackBonusDurationSeconds": 20
            },
            {
                "level": 4,
                "name": "Qi Thrice-Refined",
                "ultimateEnergyCostReductionPercent": 15
            },
            {
                "level": 5,
                "name": "Pugilist of the Stockade",
                "battleSkillDamageMultiplier": 1.1,
                "ultimateStaggerBonus": 5
            }
        ],
        "dataStatus": "live"
    }'::jsonb,
    updated_at = now()
where id = 27;

with skill_updates(
    skill_id,
    cooldown,
    energy,
    description,
    raw_data
) as (
    values
        (
            2701,
            null,
            null,
            'Performs up to 4 Physical attack sequences. The controlled operator''s Final Strike deals 25 Stagger; the finisher deals massive Physical DMG and recovers SP.',
            '{
                "id": 2701,
                "name": "Fistmancer of Blades",
                "icon": "assets/operators/avatars/Mi_Fu.png",
                "iconSmall": "assets/operators/skills/mifu/fs_small.png",
                "type": "Final Strike",
                "shortType": "FS",
                "cooldown": null,
                "energy": null,
                "elementType": "physical",
                "description": "Performs up to 4 Physical attack sequences. The controlled operator''s Final Strike deals 25 Stagger; the finisher deals massive Physical DMG and recovers SP.",
                "damageMultipliers": {
                    "sequence1": 34,
                    "sequence2": 38,
                    "sequence3": 61,
                    "sequence4": 77,
                    "diveAttack": 80,
                    "finisherAttack": 400
                },
                "finalStrikeStagger": 25,
                "debuffs": [
                    {
                        "id": "final_strike",
                        "name": "Final Strike",
                        "appliesEffect": "final_strike",
                        "persistsForCombo": false,
                        "visible": false
                    }
                ]
            }'::jsonb
        ),
        (
            2702,
            null,
            100,
            'Costs 100 SP and recovers 50 SP after casting. Mi Fu fires a claw chain from her finger gauntlet, dealing Physical DMG to the target and nearby enemies, then attempts to pull them toward her. After casting, the next Battle Skill is replaced with Trail and Mangle.',
            '{
                "id": 2702,
                "name": "Qingbo Triplex - Cloudtrapper",
                "icon": "assets/operators/avatars/Mi_Fu.png",
                "iconSmall": "assets/operators/skills/mifu/bs_1.svg",
                "type": "Battle Skill",
                "shortType": "BS",
                "cooldown": null,
                "energy": 100,
                "sp_cost": 100,
                "spRecovery": {
                    "amount": 50,
                    "source": "Qingbo Triplex - Cloudtrapper"
                },
                "elementType": "physical",
                "description": "Costs 100 SP and recovers 50 SP after casting. Mi Fu fires a claw chain from her finger gauntlet, dealing Physical DMG to the target and nearby enemies, then attempts to pull them toward her. After casting, the next Battle Skill is replaced with Trail and Mangle.",
                "skillRank": 9,
                "damageMultiplier": 67,
                "qingboMove": 1,
                "nextQingboMove": 2,
                "debuffs": [
                    {
                        "id": "pull",
                        "name": "Pull",
                        "appliesEffect": "pull",
                        "persistsForCombo": false,
                        "visible": true
                    }
                ]
            }'::jsonb
        ),
        (
            2705,
            null,
            50,
            'Costs 50 SP. Mi Fu unleashes a flurry of strikes that deal Physical DMG and applies 1 Vulnerability stack, with the final hit applying Crush. If that Crush consumes at least 3 Vulnerability stacks, the next Battle Skill is replaced with World Splitter.',
            '{
                "id": 2705,
                "name": "Qingbo Triplex - Trail and Mangle",
                "icon": "assets/operators/avatars/Mi_Fu.png",
                "iconSmall": "assets/operators/skills/mifu/bs_2.png",
                "type": "Battle Skill",
                "shortType": "BS",
                "cooldown": null,
                "energy": 50,
                "sp_cost": 50,
                "elementType": "physical",
                "description": "Costs 50 SP. Mi Fu unleashes a flurry of strikes that deal Physical DMG and applies 1 Vulnerability stack, with the final hit applying Crush. If that Crush consumes at least 3 Vulnerability stacks, the next Battle Skill is replaced with World Splitter.",
                "skillRank": 9,
                "damageMultiplier": 89,
                "stagger": 5,
                "qingboMove": 2,
                "requiresConsumedVulnerableStacks": 3,
                "nextQingboMove": 3,
                "fallbackQingboMove": 1,
                "consumeDebuffs": ["vulnerable"],
                "debuffs": [
                    {
                        "id": "vulnerable",
                        "name": "Vulnerable",
                        "appliesEffect": "vulnerable",
                        "persistsForCombo": true,
                        "visible": true,
                        "stackable": true,
                        "stacksApplied": 1,
                        "maxStacks": 4
                    },
                    {
                        "id": "crush",
                        "name": "Crush",
                        "appliesEffect": "crush",
                        "persistsForCombo": false,
                        "visible": true
                    }
                ]
            }'::jsonb
        ),
        (
            2706,
            null,
            50,
            'Costs 50 SP. Mi Fu deals massive Physical DMG to enemies in the selected area. The damage is treated as Crush DMG instead of Battle Skill DMG.',
            '{
                "id": 2706,
                "name": "Qingbo Triplex - World Splitter",
                "icon": "assets/operators/avatars/Mi_Fu.png",
                "iconSmall": "assets/operators/skills/mifu/bs_3.svg",
                "type": "Battle Skill",
                "shortType": "BS",
                "cooldown": null,
                "energy": 50,
                "sp_cost": 50,
                "elementType": "physical",
                "description": "Costs 50 SP. Mi Fu deals massive Physical DMG to enemies in the selected area. The damage is treated as Crush DMG instead of Battle Skill DMG.",
                "skillRank": 9,
                "damageMultiplier": 400,
                "stagger": 10,
                "qingboMove": 3,
                "nextQingboMove": 1,
                "debuffs": [
                    {
                        "id": "crush",
                        "name": "Crush",
                        "appliesEffect": "crush",
                        "persistsForCombo": false,
                        "visible": true
                    }
                ]
            }'::jsonb
        ),
        (
            2703,
            20,
            0,
            'Triggers when an enemy has at least 3 Vulnerability stacks. Deals Physical DMG, applies 5% Physical Susceptibility for 16 seconds, gains 10 Ultimate Energy, and replaces the next Battle Skill with Trail and Mangle.',
            '{
                "id": 2703,
                "name": "Fists of No Regrets",
                "icon": "assets/operators/avatars/Mi_Fu.png",
                "iconSmall": "assets/operators/skills/mifu/cs_small.svg",
                "type": "Combo Skill",
                "shortType": "CS",
                "cooldown": 20,
                "energy": 0,
                "elementType": "physical",
                "description": "Triggers when an enemy has at least 3 Vulnerability stacks. Deals Physical DMG, applies 5% Physical Susceptibility for 16 seconds, gains 10 Ultimate Energy, and replaces the next Battle Skill with Trail and Mangle.",
                "damageMultiplier": 111,
                "stagger": 10,
                "ultimateEnergyGain": 10,
                "nextQingboMove": 2,
                "comboTrigger": "3 Vulnerability stacks",
                "comboTriggerMode": "all",
                "allowSelfTrigger": true,
                "comboTriggers": [
                    {
                        "effect": "vulnerable",
                        "minStacks": 3
                    }
                ],
                "debuffs": [
                    {
                        "id": "physical_susceptibility",
                        "name": "Physical Susceptibility",
                        "appliesEffect": "physical_susceptibility",
                        "persistsForCombo": true,
                        "visible": true,
                        "stackable": false,
                        "valuePercent": 5,
                        "durationSeconds": 16
                    }
                ]
            }'::jsonb
        ),
        (
            2704,
            15,
            80,
            'Forcibly Lifts a target, then slams it down for Physical DMG. After casting, the next Battle Skill is replaced with Trail and Mangle.',
            '{
                "id": 2704,
                "name": "Pile of No Mercy",
                "icon": "assets/operators/avatars/Mi_Fu.png",
                "iconSmall": "assets/operators/skills/mifu/ult_small.svg",
                "type": "Ultimate",
                "shortType": "Ult",
                "cooldown": 15,
                "energy": 80,
                "elementType": "physical",
                "description": "Forcibly Lifts a target, then slams it down for Physical DMG. After casting, the next Battle Skill is replaced with Trail and Mangle.",
                "damageMultiplier": 311,
                "stagger": 20,
                "nextQingboMove": 2,
                "debuffs": [
                    {
                        "id": "lift",
                        "name": "Lift",
                        "appliesEffect": "lift",
                        "persistsForCombo": false,
                        "visible": true
                    }
                ]
            }'::jsonb
        )
)
update public.operator_skills as skill
set
    cooldown = updates.cooldown,
    energy = updates.energy,
    description = updates.description,
    raw_data = skill.raw_data || updates.raw_data,
    updated_at = now()
from skill_updates as updates
where skill.id = updates.skill_id
  and skill.operator_id = 27;

-- Some older imports also stored the skills inside operators.raw_data.
update public.operators as operator
set
    raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(
                coalesce(
                    (
                        select skill_row.raw_data
                        from public.operator_skills as skill_row
                        where skill_row.operator_id = 27
                          and skill_row.id = (item.skill->>'id')::integer
                          and skill_row.id in (2701, 2702, 2703, 2704, 2705, 2706)
                    ),
                    item.skill
                )
                order by item.ord
            )
            from jsonb_array_elements(operator.raw_data->'skills')
                with ordinality as item(skill, ord)
        ),
        true
    ),
    updated_at = now()
where operator.id = 27
  and jsonb_typeof(operator.raw_data->'skills') = 'array';

commit;

-- Optional verification:
select
    id,
    name,
    cooldown,
    energy as sp_cost,
    raw_data->>'skillRank' as skill_rank,
    raw_data->>'damageMultiplier' as damage_multiplier,
    raw_data->>'stagger' as stagger,
    raw_data->'spRecovery' as sp_recovery,
    description
from public.operator_skills
where operator_id = 27
  and id in (2701, 2702, 2703, 2704, 2705, 2706)
order by slot_index;

select
    name,
    raw_data->>'race' as race,
    raw_data->>'faction' as faction,
    raw_data->>'mainAttribute' as main_attribute,
    raw_data->>'secondaryAttribute' as secondary_attribute,
    raw_data->'stats' as stats,
    raw_data->'talents' as talents,
    raw_data->'potentials' as potentials
from public.operators
where id = 27;
