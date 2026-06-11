-- Updates Mi Fu's Qingbo Triplex Battle Skill with the Rank 9 values.
-- Run after supabase/schema.sql and supabase/seed_mi_fu.sql.

begin;

with skill_updates(
    skill_id,
    energy,
    description,
    raw_data
) as (
    values
        (
            2702,
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
            50,
            'Costs 50 SP. Mi Fu unleashes a flurry of strikes that deal Physical DMG, with the final hit applying Crush. If that Crush consumes at least 3 Vulnerability stacks, the next Battle Skill is replaced with World Splitter.',
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
                "description": "Costs 50 SP. Mi Fu unleashes a flurry of strikes that deal Physical DMG, with the final hit applying Crush. If that Crush consumes at least 3 Vulnerability stacks, the next Battle Skill is replaced with World Splitter.",
                "skillRank": 9,
                "qingboMove": 2,
                "requiresConsumedVulnerableStacks": 3,
                "nextQingboMove": 3,
                "fallbackQingboMove": 1,
                "consumeDebuffs": ["vulnerable"],
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
            2706,
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
        )
)
update public.operator_skills as skill
set
    energy = updates.energy,
    description = updates.description,
    raw_data = updates.raw_data,
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
                          and skill_row.id in (2702, 2705, 2706)
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
    energy as sp_cost,
    raw_data->>'skillRank' as skill_rank,
    raw_data->'spRecovery' as sp_recovery,
    description
from public.operator_skills
where operator_id = 27
  and id in (2702, 2705, 2706)
order by slot_index;
