begin;

-- Generic action transitions for Simulation Mode. Operator-specific effects,
-- trigger conditions and priorities live here; the client only evaluates the
-- shared condition/action grammar.
create table if not exists public.simulation_action_rules (
    rule_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    description text not null default '',
    action_type text not null,
    actor_scope text not null default 'controlled',
    conditions jsonb not null default '{}'::jsonb,
    consumed_effects jsonb not null default '[]'::jsonb,
    emitted_effects jsonb not null default '[]'::jsonb,
    action_override text,
    priority integer not null default 100,
    enabled boolean not null default true,
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint simulation_action_rules_conditions_object
        check (jsonb_typeof(conditions) = 'object'),
    constraint simulation_action_rules_consumed_array
        check (jsonb_typeof(consumed_effects) = 'array'),
    constraint simulation_action_rules_emitted_array
        check (jsonb_typeof(emitted_effects) = 'array')
);

create index if not exists idx_simulation_action_rules_game_action
    on public.simulation_action_rules (game, action_type, priority, rule_key);

alter table public.simulation_action_rules enable row level security;

drop policy if exists "Public read simulation action rules" on public.simulation_action_rules;
create policy "Public read simulation action rules"
    on public.simulation_action_rules
    for select
    using (true);

insert into public.simulation_action_rules (
    rule_key,
    game,
    name,
    description,
    action_type,
    actor_scope,
    conditions,
    consumed_effects,
    emitted_effects,
    action_override,
    priority,
    enabled,
    raw_data
) values
    (
        'next_attack_final_strike',
        'arknights_endfield',
        'Next Attack: Final Strike',
        'Consumes the pending next-attack effect and turns the next controlled basic attack into a Final Strike.',
        'basic_attack_hit',
        'controlled',
        '{"allOf":[{"effect":"yvonne_next_attack_final_strike","minStacks":1}]}'::jsonb,
        '[{"effect":"yvonne_next_attack_final_strike","amount":1}]'::jsonb,
        '[{"effect":"final_strike","name":"Final Strike","amount":1,"persistsForCombo":false,"transientTrigger":true}]'::jsonb,
        'final_strike',
        10,
        true,
        '{"stopAfterMatch":true,"source":"Yvonne - Barrage of Technology"}'::jsonb
    ),
    (
        'finisher_from_stagger',
        'arknights_endfield',
        'Finisher',
        'The first controlled basic attack against a Staggered enemy becomes a Finisher.',
        'basic_attack_hit',
        'controlled',
        '{"allOf":[{"effect":"stagger","minStacks":1}]}'::jsonb,
        '[{"effect":"stagger","amount":1}]'::jsonb,
        '[{"effect":"finisher","name":"Finisher","amount":1,"persistsForCombo":false,"transientTrigger":true}]'::jsonb,
        'finisher',
        20,
        true,
        '{"stopAfterMatch":true,"source":"Combat Mechanic - Finisher"}'::jsonb
    )
on conflict (rule_key) do update set
    game = excluded.game,
    name = excluded.name,
    description = excluded.description,
    action_type = excluded.action_type,
    actor_scope = excluded.actor_scope,
    conditions = excluded.conditions,
    consumed_effects = excluded.consumed_effects,
    emitted_effects = excluded.emitted_effects,
    action_override = excluded.action_override,
    priority = excluded.priority,
    enabled = excluded.enabled,
    raw_data = excluded.raw_data,
    updated_at = now();

-- A placeable persistent enemy state is required so the next basic attack can
-- resolve the generic Finisher rule. Existing transient combat events remain
-- unchanged.
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
) values (
    900006,
    'arknights_endfield',
    'enemy_staggered',
    'Enemy Staggered',
    'The target enemy enters Stagger. Its first incoming basic attack becomes a Finisher.',
    'assets/ui/events/combat_event.svg',
    '[{"effect":"stagger","name":"Stagger","persistsForCombo":true,"transientTrigger":false,"visible":true}]'::jsonb,
    true,
    60,
    '{"state":"enemy_staggered","consumedByActionRule":"finisher_from_stagger"}'::jsonb
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

-- Zhuang Fangyi: both Final Strike and Finisher are valid action events. The
-- concrete condition remains in Supabase.
update public.operator_skills
set raw_data = coalesce(raw_data, '{}'::jsonb) || '{
    "comboTriggerMode":"all",
    "comboTriggers":[
        {"anyOf":[
            {"effect":"final_strike","minStacks":1},
            {"effect":"finisher","minStacks":1}
        ]},
        {"effect":"electric_infliction","minStacks":1}
    ]
}'::jsonb,
    combo_trigger = null,
    combo_trigger_mode = 'all',
    updated_at = now()
where operator_id = 9 and id = 903;

commit;
