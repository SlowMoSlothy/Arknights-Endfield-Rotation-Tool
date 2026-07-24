begin;

-- Operator mechanics audit, batch 01.
-- Trigger conditions remain in Supabase. The client only interprets the
-- generic JSON rule shapes (effect / anyOf / allOf / noneOf / minStacks).

-- Endministrator: another operator dealing damage with a Combo Skill.
update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "comboTriggers": [{"effect":"combo_skill","minStacks":1}],
    "comboTriggerMode": "all",
    "allowSelfTrigger": false
}'::jsonb,
    combo_trigger = null,
    combo_trigger_mode = 'all',
    updated_at = now()
where operator_id = 3 and id = 303;

-- Catcher: enemy skill charge OR a hit that leaves the controlled operator
-- below 40% HP. The HP threshold is stored with the trigger for future/manual
-- combat-state events; it is not a client-side operator special case.
update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "comboTriggers": {
        "anyOf": [
            {"effect":"enemy_skill_charging","minStacks":1},
            {"effect":"operator_attacked_low_hp","minStacks":1,"hpBelowPercent":40}
        ]
    },
    "comboTriggerMode": "any",
    "allowSelfTrigger": false
}'::jsonb,
    combo_trigger = null,
    combo_trigger_mode = 'any',
    updated_at = now()
where operator_id = 13 and id = 1303;

-- Zhuang Fangyi: Final Strike OR basic-attack Finisher against Electric
-- Infliction. Finisher event support is tracked as a separate engine task.
update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "comboTriggers": [
        {"anyOf":[
            {"effect":"final_strike","minStacks":1},
            {"effect":"finisher","minStacks":1}
        ]},
        {"effect":"electric_infliction","minStacks":1}
    ],
    "comboTriggerMode": "all"
}'::jsonb,
    combo_trigger = null,
    combo_trigger_mode = 'all',
    updated_at = now()
where operator_id = 9 and id = 903;

-- Tangtang reacts to any Arts Burst damage, not only Cryo Burst damage.
update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "comboTriggers": [
        {"effect":"cryo_infliction","minStacks":1},
        {"effect":"arts_burst","minStacks":1}
    ],
    "comboTriggerMode": "any"
}'::jsonb,
    combo_trigger = null,
    combo_trigger_mode = 'any',
    updated_at = now()
where operator_id = 15 and id = 1503;

-- Fluorite's Battle Skill and Combo Skill names were interchanged.
update public.operator_skills
set name = 'Tiny Surprise',
    raw_data = jsonb_set(coalesce(raw_data, '{}'::jsonb), '{name}', '"Tiny Surprise"'::jsonb, true),
    updated_at = now()
where operator_id = 19 and id = 1902 and short_type = 'BS';

update public.operator_skills
set name = 'Free Giveaway',
    raw_data = jsonb_set(coalesce(raw_data, '{}'::jsonb), '{name}', '"Free Giveaway"'::jsonb, true),
    updated_at = now()
where operator_id = 19 and id = 1903 and short_type = 'CS';

commit;
