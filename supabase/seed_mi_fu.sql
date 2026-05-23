-- Seed Mi Fu for Supabase.
-- Run this after supabase/schema.sql.
-- Image placeholders expected:
--   assets/operators/avatars/Mi_Fu.png
--   assets/operators/skills/mifu/fs_small.png
--   assets/operators/skills/mifu/bs_small.png
--   assets/operators/skills/mifu/cs_small.png
--   assets/operators/skills/mifu/ult_small.png

begin;

insert into public.operators (
    id,
    game,
    slug,
    name,
    star,
    operator_class,
    element_type,
    icon_path,
    can_enter_ultimate_state,
    sort_order,
    raw_data
) values (
    27,
    'arknights_endfield',
    'mi_fu',
    'Mi Fu',
    6,
    'Guard',
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    false,
    27,
    $json$
    {
        "id": 27,
        "name": "Mi Fu",
        "star": 6,
        "operatorClass": "Guard",
        "icon": "assets/operators/avatars/Mi_Fu.png",
        "elementType": "physical",
        "weaponType": "Greatsword",
        "mainAttribute": "Strength",
        "sourceNote": "Pre-release/operator preview data. Cooldowns, SP costs, and exact multipliers should be updated once live values are available."
    }
    $json$::jsonb
)
on conflict (id) do update set
    game = excluded.game,
    slug = excluded.slug,
    name = excluded.name,
    star = excluded.star,
    operator_class = excluded.operator_class,
    element_type = excluded.element_type,
    icon_path = excluded.icon_path,
    can_enter_ultimate_state = excluded.can_enter_ultimate_state,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data,
    updated_at = now();

delete from public.operator_skills
where operator_id = 27
  and id not in (2701, 2702, 2703, 2704);

insert into public.operator_skills (
    id,
    operator_id,
    slot_index,
    name,
    skill_type,
    short_type,
    cooldown,
    energy,
    element_type,
    icon_path,
    icon_small_path,
    description,
    combo_trigger,
    combo_trigger_mode,
    raw_data
) values
(
    2701,
    27,
    1,
    'Fistmancer of Blades',
    'Final Strike',
    'FS',
    null,
    null,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/fs_small.png',
    'Physical Final Strike. Deals massive Physical DMG and restores some SP.',
    null,
    null,
    $json$
    {
        "id": 2701,
        "name": "Fistmancer of Blades",
        "icon": "assets/operators/avatars/Mi_Fu.png",
        "iconSmall": "assets/operators/skills/mifu/fs_small.png",
        "type": "Final Strike",
        "shortType": "FS",
        "cooldown": null,
        "energy": null,
        "elementType": "physical",
        "description": "Physical Final Strike. Deals massive Physical DMG and restores some SP.",
        "debuffs": [
            {
                "id": "final_strike",
                "name": "Final Strike",
                "appliesEffect": "final_strike",
                "persistsForCombo": false,
                "visible": false
            }
        ]
    }
    $json$::jsonb
),
(
    2702,
    27,
    2,
    'Qingbo Triplex',
    'Battle Skill',
    'BS',
    null,
    null,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/bs_small.png',
    'Three-move Battle Skill. Move 1 pulls small enemies or dashes to large enemies. Move 2 applies Crush and consumes Vulnerability. Move 3 becomes available after consuming at least 3 Vulnerability stacks and deals heavy frontal Physical DMG.',
    null,
    null,
    $json$
    {
        "id": 2702,
        "name": "Qingbo Triplex",
        "icon": "assets/operators/avatars/Mi_Fu.png",
        "iconSmall": "assets/operators/skills/mifu/bs_small.png",
        "type": "Battle Skill",
        "shortType": "BS",
        "cooldown": null,
        "energy": null,
        "elementType": "physical",
        "description": "Three-move Battle Skill. Move 1 pulls small enemies or dashes to large enemies. Move 2 applies Crush and consumes Vulnerability. Move 3 becomes available after consuming at least 3 Vulnerability stacks and deals heavy frontal Physical DMG.",
        "comboNotes": [
            "Move 1: Cloudtrapper",
            "Move 2: Trail and Mangle",
            "Move 3: World Splitter"
        ],
        "consumeDebuffs": [
            "vulnerable"
        ],
        "debuffs": [
            {
                "id": "pull",
                "name": "Pull",
                "appliesEffect": "pull",
                "persistsForCombo": false,
                "visible": true
            },
            {
                "id": "crush",
                "name": "Crush",
                "appliesEffect": "crush",
                "persistsForCombo": false,
                "visible": true
            }
        ]
    }
    $json$::jsonb
),
(
    2703,
    27,
    3,
    'Fists of No Regrets',
    'Combo Skill',
    'CS',
    null,
    null,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/cs_small.png',
    'Triggers when an enemy reaches 3 Vulnerability stacks. Deals Physical DMG, applies Physical Susceptibility, and replaces Mi Fu''s next Battle Skill Move 1 with Move 2.',
    '3 Vulnerability stacks',
    'all',
    $json$
    {
        "id": 2703,
        "name": "Fists of No Regrets",
        "icon": "assets/operators/avatars/Mi_Fu.png",
        "iconSmall": "assets/operators/skills/mifu/cs_small.png",
        "type": "Combo Skill",
        "shortType": "CS",
        "cooldown": null,
        "energy": null,
        "elementType": "physical",
        "description": "Triggers when an enemy reaches 3 Vulnerability stacks. Deals Physical DMG, applies Physical Susceptibility, and replaces Mi Fu's next Battle Skill Move 1 with Move 2.",
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
                "stackable": false
            }
        ]
    }
    $json$::jsonb
),
(
    2704,
    27,
    4,
    'Pile of No Mercy',
    'Ultimate',
    'Ult',
    null,
    null,
    'physical',
    'assets/operators/avatars/Mi_Fu.png',
    'assets/operators/skills/mifu/ult_small.png',
    'Forcibly Lifts a target, slams it down to deal Physical DMG, and replaces Mi Fu''s next Battle Skill Move 1 with Move 2.',
    null,
    null,
    $json$
    {
        "id": 2704,
        "name": "Pile of No Mercy",
        "icon": "assets/operators/avatars/Mi_Fu.png",
        "iconSmall": "assets/operators/skills/mifu/ult_small.png",
        "type": "Ultimate",
        "shortType": "Ult",
        "cooldown": null,
        "energy": null,
        "elementType": "physical",
        "description": "Forcibly Lifts a target, slams it down to deal Physical DMG, and replaces Mi Fu's next Battle Skill Move 1 with Move 2.",
        "debuffs": [
            {
                "id": "lift",
                "name": "Lift",
                "appliesEffect": "lift",
                "persistsForCombo": false,
                "visible": true
            }
        ]
    }
    $json$::jsonb
)
on conflict (id) do update set
    operator_id = excluded.operator_id,
    slot_index = excluded.slot_index,
    name = excluded.name,
    skill_type = excluded.skill_type,
    short_type = excluded.short_type,
    cooldown = excluded.cooldown,
    energy = excluded.energy,
    element_type = excluded.element_type,
    icon_path = excluded.icon_path,
    icon_small_path = excluded.icon_small_path,
    description = excluded.description,
    combo_trigger = excluded.combo_trigger,
    combo_trigger_mode = excluded.combo_trigger_mode,
    raw_data = excluded.raw_data,
    updated_at = now();

commit;
