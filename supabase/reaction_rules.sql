-- Arts reaction rules for Arknights Endfield.
-- Run this in the Supabase SQL Editor. The app falls back to js/data/reactionRules.js if this table is unavailable.

begin;

create table if not exists public.reaction_rules (
    reaction_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    requires_effects text[] not null default '{}',
    applies_effect text not null,
    reaction_effect text not null,
    persists_for_combo boolean not null default false,
    sort_order integer not null default 0,
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.reaction_rules add column if not exists game text not null default 'arknights_endfield';
alter table public.reaction_rules add column if not exists name text;
alter table public.reaction_rules add column if not exists requires_effects text[] not null default '{}';
alter table public.reaction_rules add column if not exists applies_effect text;
alter table public.reaction_rules add column if not exists reaction_effect text;
alter table public.reaction_rules add column if not exists persists_for_combo boolean not null default false;
alter table public.reaction_rules add column if not exists sort_order integer not null default 0;
alter table public.reaction_rules add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.reaction_rules add column if not exists created_at timestamptz not null default now();
alter table public.reaction_rules add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_reaction_rules_game_sort
    on public.reaction_rules (game, sort_order, reaction_key);

alter table public.reaction_rules enable row level security;

drop policy if exists "Public read reaction rules" on public.reaction_rules;
create policy "Public read reaction rules"
    on public.reaction_rules
    for select
    using (true);

insert into public.reaction_rules (
    reaction_key,
    game,
    name,
    requires_effects,
    applies_effect,
    reaction_effect,
    persists_for_combo,
    sort_order,
    raw_data
) values
    ('combustion', 'arknights_endfield', 'Combustion', array['heat_infliction', 'electric_infliction'], 'arts_reaction', 'combustion', false, 10, '{"id":"combustion","name":"Combustion","requires":["heat_infliction","electric_infliction"],"appliesEffect":"arts_reaction","reactionEffect":"combustion","persistsForCombo":false}'::jsonb),
    ('corrosion', 'arknights_endfield', 'Corrosion', array['nature_infliction', 'electric_infliction'], 'arts_reaction', 'corrosion', false, 20, '{"id":"corrosion","name":"Corrosion","requires":["nature_infliction","electric_infliction"],"appliesEffect":"arts_reaction","reactionEffect":"corrosion","persistsForCombo":false}'::jsonb),
    ('solidification', 'arknights_endfield', 'Solidification', array['cryo_infliction', 'nature_infliction'], 'arts_reaction', 'solidification', false, 30, '{"id":"solidification","name":"Solidification","requires":["cryo_infliction","nature_infliction"],"appliesEffect":"arts_reaction","reactionEffect":"solidification","persistsForCombo":false}'::jsonb)
on conflict (reaction_key) do update set
    game = excluded.game,
    name = excluded.name,
    requires_effects = excluded.requires_effects,
    applies_effect = excluded.applies_effect,
    reaction_effect = excluded.reaction_effect,
    persists_for_combo = excluded.persists_for_combo,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data,
    updated_at = now();

commit;
