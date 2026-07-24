begin;

-- Generic, manually placeable combat events for Simulation Mode.
-- The client has no Catcher/Ember/Snowshine branches: each row declares the
-- transient effects emitted at that point on the timeline, while Combo Skills
-- continue to declare their own trigger conditions in operator_skills.raw_data.
create table if not exists public.simulation_trigger_events (
    id bigint primary key,
    game text not null default 'arknights_endfield',
    event_key text not null unique,
    name text not null,
    description text not null default '',
    icon_path text,
    effects jsonb not null default '[]'::jsonb,
    enabled boolean not null default true,
    sort_order integer not null default 0,
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint simulation_trigger_events_effects_array
        check (jsonb_typeof(effects) = 'array')
);

create index if not exists idx_simulation_trigger_events_game_sort
    on public.simulation_trigger_events (game, sort_order, event_key);

alter table public.simulation_trigger_events enable row level security;

drop policy if exists "Public read simulation trigger events" on public.simulation_trigger_events;
create policy "Public read simulation trigger events"
    on public.simulation_trigger_events
    for select
    using (true);

insert into public.simulation_trigger_events (
    id,
    game,
    event_key,
    name,
    description,
    icon_path,
    effects,
    enabled,
    sort_order,
    raw_data
) values
    (
        900001,
        'arknights_endfield',
        'operator_attacked',
        'Operator Attacked',
        'The controlled operator is attacked and remains at or above 60% HP.',
        'assets/ui/events/combat_event.svg',
        '[{"effect":"operator_attacked","name":"Operator Attacked"}]'::jsonb,
        true,
        10,
        '{"hpBand":"60_or_above"}'::jsonb
    ),
    (
        900002,
        'arknights_endfield',
        'operator_attacked_below_60',
        'Attacked: HP below 60%',
        'The controlled operator is attacked and drops below 60% HP, but remains at or above 40% HP.',
        'assets/ui/events/combat_event.svg',
        '[
            {"effect":"operator_attacked","name":"Operator Attacked"},
            {"effect":"operator_attacked_below_60","name":"HP below 60% after hit"}
        ]'::jsonb,
        true,
        20,
        '{"hpBand":"40_to_below_60"}'::jsonb
    ),
    (
        900003,
        'arknights_endfield',
        'operator_attacked_below_40',
        'Attacked: HP below 40%',
        'The controlled operator is attacked and drops below 40% HP.',
        'assets/ui/events/combat_event.svg',
        '[
            {"effect":"operator_attacked","name":"Operator Attacked"},
            {"effect":"operator_attacked_below_60","name":"HP below 60% after hit"},
            {"effect":"operator_attacked_below_40","name":"HP below 40% after hit"}
        ]'::jsonb,
        true,
        30,
        '{"hpBand":"below_40"}'::jsonb
    ),
    (
        900004,
        'arknights_endfield',
        'enemy_skill_charging',
        'Enemy Skill Charging',
        'The target enemy begins charging a skill.',
        'assets/ui/events/combat_event.svg',
        '[{"effect":"enemy_skill_charging","name":"Enemy Skill Charging"}]'::jsonb,
        true,
        40,
        '{}'::jsonb
    ),
    (
        900005,
        'arknights_endfield',
        'stagger_node_hit',
        'Stagger Node Hit',
        'The controlled operator hits an enemy Stagger Node.',
        'assets/ui/events/combat_event.svg',
        '[{"effect":"stagger_node_hit","name":"Stagger Node Hit"}]'::jsonb,
        true,
        50,
        '{}'::jsonb
    )
on conflict (id) do update set
    game = excluded.game,
    event_key = excluded.event_key,
    name = excluded.name,
    description = excluded.description,
    icon_path = excluded.icon_path,
    effects = excluded.effects,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data,
    updated_at = now();

-- Catcher: charging OR attacked and below 40% HP.
update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "comboTriggers": {
        "anyOf": [
            {"effect":"enemy_skill_charging","minStacks":1},
            {"effect":"operator_attacked_below_40","minStacks":1}
        ]
    },
    "comboTriggerMode": "any",
    "allowSelfTrigger": false
}'::jsonb,
    combo_trigger = null,
    combo_trigger_mode = 'any',
    updated_at = now()
where operator_id = 13 and id = 1303;

-- Ember: every attack event.
update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "comboTriggers": [{"effect":"operator_attacked","minStacks":1}],
    "comboTriggerMode": "all",
    "allowSelfTrigger": false
}'::jsonb,
    combo_trigger = null,
    combo_trigger_mode = 'all',
    updated_at = now()
where operator_id = 17 and id = 1703;

-- Snowshine: attacked and below 60% HP.
update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "comboTriggers": [{"effect":"operator_attacked_below_60","minStacks":1}],
    "comboTriggerMode": "all",
    "allowSelfTrigger": false
}'::jsonb,
    combo_trigger = null,
    combo_trigger_mode = 'all',
    updated_at = now()
where operator_id = 23 and id = 2303;

-- Akekuri's second documented trigger route.
update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "comboTriggers": [
        {"effect":"stagger","minStacks":1},
        {"effect":"stagger_node_hit","minStacks":1}
    ],
    "comboTriggerMode": "any",
    "allowSelfTrigger": false
}'::jsonb,
    combo_trigger = null,
    combo_trigger_mode = 'any',
    updated_at = now()
where operator_id = 2 and id = 203;

commit;
