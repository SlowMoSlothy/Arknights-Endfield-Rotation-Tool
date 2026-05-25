-- Buff registry for Arknights Endfield.
-- Run this in the Supabase SQL Editor. The app falls back to js/data/buffRegistry.js if this table is unavailable.

begin;

create table if not exists public.buff_registry (
    effect_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    icon_path text,
    icon_base_path text,
    stackable boolean not null default false,
    max_stacks integer not null default 0,
    extension text,
    consume_on_skill_type text,
    consume_stacks integer,
    on_fully_consumed_effect text,
    sort_order integer not null default 0,
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.buff_registry add column if not exists game text not null default 'arknights_endfield';
alter table public.buff_registry add column if not exists name text;
alter table public.buff_registry add column if not exists icon_path text;
alter table public.buff_registry add column if not exists icon_base_path text;
alter table public.buff_registry add column if not exists stackable boolean not null default false;
alter table public.buff_registry add column if not exists max_stacks integer not null default 0;
alter table public.buff_registry add column if not exists extension text;
alter table public.buff_registry add column if not exists consume_on_skill_type text;
alter table public.buff_registry add column if not exists consume_stacks integer;
alter table public.buff_registry add column if not exists on_fully_consumed_effect text;
alter table public.buff_registry add column if not exists sort_order integer not null default 0;
alter table public.buff_registry add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.buff_registry add column if not exists created_at timestamptz not null default now();
alter table public.buff_registry add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_buff_registry_game_sort
    on public.buff_registry (game, sort_order, effect_key);

alter table public.buff_registry enable row level security;

drop policy if exists "Public read buff registry" on public.buff_registry;
create policy "Public read buff registry"
    on public.buff_registry
    for select
    using (true);

insert into public.buff_registry (
    effect_key,
    game,
    name,
    icon_path,
    icon_base_path,
    stackable,
    max_stacks,
    extension,
    consume_on_skill_type,
    consume_stacks,
    on_fully_consumed_effect,
    sort_order,
    raw_data
) values
    ('melting_flames', 'arknights_endfield', 'Melting Flames', null, 'assets/ui/buffs/laevatain/melting_flames', true, 4, 'png', null, null, null, 10, '{"name":"Melting Flames","iconBase":"assets/ui/buffs/laevatain/melting_flames","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('electrification', 'arknights_endfield', 'Electrification', null, 'assets/ui/buffs/electrification', true, 4, 'png', null, null, null, 20, '{"name":"Electrification","iconBase":"assets/ui/buffs/electrification","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('electric_amp', 'arknights_endfield', 'Electric Amp', null, 'assets/ui/buffs/electric_amp', false, 0, 'svg', null, null, null, 30, '{"name":"Electric Amp","iconBase":"assets/ui/buffs/electric_amp","stackable":false,"maxStacks":0,"extension":"svg"}'::jsonb),
    ('arts_amp', 'arknights_endfield', 'Arts Amp', null, 'assets/ui/buffs/arts_amp', false, 0, 'png', null, null, null, 40, '{"name":"Arts Amp","iconBase":"assets/ui/buffs/arts_amp","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('cryo_amp', 'arknights_endfield', 'Cryo Amp', null, 'assets/ui/buffs/cryo_amp', false, 0, 'png', null, null, null, 50, '{"name":"Cryo Amp","iconBase":"assets/ui/buffs/cryo_amp","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('auxiliary_crystal', 'arknights_endfield', 'Auxiliary Crystal', null, 'assets/operators/skills/xaihi/bs_small', true, 2, 'png', 'final_strike', 1, 'auxiliary_crystal_used_up', 60, '{"name":"Auxiliary Crystal","iconBase":"assets/operators/skills/xaihi/bs_small","stackable":true,"maxStacks":2,"extension":"png","consumeOnSkillType":"final_strike","consumeStacks":1,"onFullyConsumedEffect":"auxiliary_crystal_used_up"}'::jsonb),
    ('atk_up', 'arknights_endfield', 'ATK Up', null, 'assets/ui/buffs/atk_up', true, 4, 'png', null, null, null, 70, '{"name":"ATK Up","iconBase":"assets/ui/buffs/atk_up","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('crit_up', 'arknights_endfield', 'Crit Up', null, 'assets/ui/buffs/crit_up', true, 4, 'png', null, null, null, 80, '{"name":"Crit Up","iconBase":"assets/ui/buffs/crit_up","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('link', 'arknights_endfield', 'Link', null, 'assets/ui/buffs/link', false, 0, 'png', null, null, null, 90, '{"name":"Link","iconBase":"assets/ui/buffs/link","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('hypothermic_perfusion', 'arknights_endfield', 'Hypothermic Perfusion', null, 'assets/operators/skills/lastrite/bs_small', false, 0, 'png', 'final_strike', 1, null, 100, '{"name":"Hypothermic Perfusion","iconBase":"assets/operators/skills/lastrite/bs_small","stackable":false,"maxStacks":0,"extension":"png","consumeOnSkillType":"final_strike","consumeStacks":1}'::jsonb),
    ('shield', 'arknights_endfield', 'Shield', null, 'assets/ui/buffs/ember/shield', false, 0, 'png', null, null, null, 110, '{"name":"Shield","iconBase":"assets/ui/buffs/ember/shield","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('protection', 'arknights_endfield', 'Protection', null, 'assets/ui/buffs/protection', false, 0, 'png', null, null, null, 120, '{"name":"Protection","iconBase":"assets/ui/buffs/protection","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('whirlpool', 'arknights_endfield', 'Whirlpool', null, 'assets/operators/skills/tangtang/65px-Combo-Tangtang', true, 2, 'webp', null, null, null, 130, '{"name":"Whirlpool","iconBase":"assets/operators/skills/tangtang/65px-Combo-Tangtang","stackable":true,"maxStacks":2,"extension":"webp"}'::jsonb),
    ('rossi_crit_buff', 'arknights_endfield', 'Crit Rate / Crit DMG', null, 'assets/buffs/rossi/crit_buff', false, 0, 'png', null, null, null, 140, '{"name":"Crit Rate / Crit DMG","iconBase":"assets/buffs/rossi/crit_buff","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb)
on conflict (effect_key) do update set
    game = excluded.game,
    name = excluded.name,
    icon_path = excluded.icon_path,
    icon_base_path = excluded.icon_base_path,
    stackable = excluded.stackable,
    max_stacks = excluded.max_stacks,
    extension = excluded.extension,
    consume_on_skill_type = excluded.consume_on_skill_type,
    consume_stacks = excluded.consume_stacks,
    on_fully_consumed_effect = excluded.on_fully_consumed_effect,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data,
    updated_at = now();

commit;
