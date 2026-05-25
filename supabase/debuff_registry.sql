-- Debuff registry for Arknights Endfield.
-- Run this in the Supabase SQL Editor. The app will fall back to js/data/debuffRegistry.js if this table is unavailable.

begin;

create table if not exists public.debuff_registry (
    effect_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    icon_path text,
    icon_base_path text,
    stackable boolean not null default false,
    max_stacks integer not null default 0,
    extension text,
    sort_order integer not null default 0,
    raw_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.debuff_registry add column if not exists effect_key text;
alter table public.debuff_registry add column if not exists game text not null default 'arknights_endfield';
alter table public.debuff_registry add column if not exists name text;
alter table public.debuff_registry add column if not exists icon_path text;
alter table public.debuff_registry add column if not exists icon_base_path text;
alter table public.debuff_registry add column if not exists stackable boolean not null default false;
alter table public.debuff_registry add column if not exists max_stacks integer not null default 0;
alter table public.debuff_registry add column if not exists extension text;
alter table public.debuff_registry add column if not exists sort_order integer not null default 0;
alter table public.debuff_registry add column if not exists raw_data jsonb not null default '{}'::jsonb;
alter table public.debuff_registry add column if not exists created_at timestamptz not null default now();
alter table public.debuff_registry add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_debuff_registry_game_sort
    on public.debuff_registry (game, sort_order, effect_key);

alter table public.debuff_registry enable row level security;

drop policy if exists "Public read debuff registry" on public.debuff_registry;
create policy "Public read debuff registry"
    on public.debuff_registry
    for select
    using (true);

insert into public.debuff_registry (
    effect_key,
    game,
    name,
    icon_path,
    icon_base_path,
    stackable,
    max_stacks,
    extension,
    sort_order,
    raw_data
) values
    ('electric_infliction', 'arknights_endfield', 'Electric Infliction', null, 'assets/ui/debuffs/electric_infliction', true, 4, 'png', 10, '{"name":"Electric Infliction","iconBase":"assets/ui/debuffs/electric_infliction","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('electrification', 'arknights_endfield', 'Electrification', null, 'assets/ui/debuffs/electrification', false, 0, 'png', 20, '{"name":"Electrification","iconBase":"assets/ui/debuffs/electrification","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('electrification_consumed', 'arknights_endfield', 'Electrification consumed', null, 'assets/ui/debuffs/electrification_consumed', false, 0, 'png', 30, '{"name":"Electrification consumed","iconBase":"assets/ui/debuffs/electrification_consumed","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('combustion', 'arknights_endfield', 'Combustion', null, 'assets/ui/debuffs/combustion', false, 0, 'png', 40, '{"name":"Combustion","iconBase":"assets/ui/debuffs/combustion","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('corrosion', 'arknights_endfield', 'Corrosion', null, 'assets/ui/debuffs/corrosion', false, 0, 'png', 50, '{"name":"Corrosion","iconBase":"assets/ui/debuffs/corrosion","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('crush', 'arknights_endfield', 'Crush', null, 'assets/ui/debuffs/crush', false, 0, 'png', 60, '{"name":"Crush","iconBase":"assets/ui/debuffs/crush","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('solidification', 'arknights_endfield', 'Solidification', null, 'assets/ui/debuffs/solidification', false, 0, 'png', 70, '{"name":"Solidification","iconBase":"assets/ui/debuffs/solidification","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('arts_reaction', 'arknights_endfield', 'Arts Reaction', null, 'assets/ui/debuffs/arts_reaction', false, 0, 'png', 80, '{"name":"Arts Reaction","iconBase":"assets/ui/debuffs/arts_reaction","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('arts_infliction', 'arknights_endfield', 'Arts Infliction', null, 'assets/ui/debuffs/arts', true, 4, 'png', 90, '{"name":"Arts Infliction","iconBase":"assets/ui/debuffs/arts","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('originium_crystal', 'arknights_endfield', 'Originium Crystal', null, 'assets/operators/skills/endmin/cs_small', true, 4, 'png', 100, '{"name":"Originium Crystal","iconBase":"assets/operators/skills/endmin/cs_small","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('originium_crystal_consumed', 'arknights_endfield', 'Originium Crystal Consumed', null, 'assets/operators/skills/endmin/bs_small', false, 0, 'png', 110, '{"name":"Originium Crystal Consumed","iconBase":"assets/operators/skills/endmin/bs_small","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('arts_susceptibility', 'arknights_endfield', 'Arts Susceptibility', null, 'assets/ui/debuffs/arts_susceptibility', false, 4, 'svg', 120, '{"name":"Arts Susceptibility","iconBase":"assets/ui/debuffs/arts_susceptibility","stackable":false,"maxStacks":4,"extension":"svg"}'::jsonb),
    ('heat_infliction', 'arknights_endfield', 'Heat Infliction', null, 'assets/ui/debuffs/heat_infliction', true, 4, 'png', 130, '{"name":"Heat Infliction","iconBase":"assets/ui/debuffs/heat_infliction","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('heat_followup', 'arknights_endfield', 'Heat Follow-Up', null, 'assets/ui/debuffs/heat_followup', false, 0, 'png', 140, '{"name":"Heat Follow-Up","iconBase":"assets/ui/debuffs/heat_followup","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('cryo_infliction', 'arknights_endfield', 'Cryo Infliction', null, 'assets/ui/debuffs/cryo_infliction', true, 4, 'png', 150, '{"name":"Cryo Infliction","iconBase":"assets/ui/debuffs/cryo_infliction","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('cryo_burst', 'arknights_endfield', 'Cryo Burst', null, 'assets/ui/debuffs/cryo_burst', false, 0, 'png', 160, '{"name":"Cryo Burst","iconBase":"assets/ui/debuffs/cryo_burst","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('cryo_susceptibility', 'arknights_endfield', 'Cryo Susceptibility', null, 'assets/ui/debuffs/cryo_susceptibility', false, 0, 'png', 170, '{"name":"Cryo Susceptibility","iconBase":"assets/ui/debuffs/cryo_susceptibility","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('physical_susceptibility', 'arknights_endfield', 'Physical Susceptibility', 'assets/ui/debuffs/elements/physical.webp', null, false, 0, 'png', 180, '{"name":"Physical Susceptibility","icon":"assets/ui/debuffs/elements/physical.webp","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('pull', 'arknights_endfield', 'Pull', null, 'assets/ui/debuffs/pull', false, 0, 'png', 160, '{"name":"Pull","iconBase":"assets/ui/debuffs/pull","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('auxiliary_crystal', 'arknights_endfield', 'Auxiliary Crystal', null, 'assets/ui/debuffs/auxiliary_crystal', true, 2, 'png', 170, '{"name":"Auxiliary Crystal","iconBase":"assets/ui/debuffs/auxiliary_crystal","stackable":true,"maxStacks":2,"extension":"png"}'::jsonb),
    ('auxiliary_crystal_used_up', 'arknights_endfield', 'Auxiliary Crystal Used Up', null, 'assets/ui/debuffs/auxiliary_crystal_used_up', false, 0, 'png', 180, '{"name":"Auxiliary Crystal Used Up","iconBase":"assets/ui/debuffs/auxiliary_crystal_used_up","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('arts_amp', 'arknights_endfield', 'Arts Amp', null, 'assets/ui/debuffs/arts_amp', false, 0, 'png', 190, '{"name":"Arts Amp","iconBase":"assets/ui/debuffs/arts_amp","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('cryo_amp', 'arknights_endfield', 'Cryo Amp', null, 'assets/ui/debuffs/cryo_amp', false, 0, 'png', 200, '{"name":"Cryo Amp","iconBase":"assets/ui/debuffs/cryo_amp","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('nature_infliction', 'arknights_endfield', 'Nature Infliction', null, 'assets/ui/debuffs/nature_infliction', true, 4, 'png', 210, '{"name":"Nature Infliction","iconBase":"assets/ui/debuffs/nature_infliction","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('vulnerable', 'arknights_endfield', 'Vulnerable', null, 'assets/ui/debuffs/vulnerable', true, 4, 'png', 220, '{"name":"Vulnerable","iconBase":"assets/ui/debuffs/vulnerable","stackable":true,"maxStacks":4,"extension":"png"}'::jsonb),
    ('slow', 'arknights_endfield', 'Slow', null, 'assets/ui/debuffs/slow', false, 0, 'webp', 230, '{"name":"Slow","iconBase":"assets/ui/debuffs/slow","stackable":false,"maxStacks":0,"extension":"webp"}'::jsonb),
    ('lift', 'arknights_endfield', 'Lift', null, 'assets/ui/debuffs/lift', false, 0, 'svg', 240, '{"name":"Lift","iconBase":"assets/ui/debuffs/lift","stackable":false,"maxStacks":0,"extension":"svg"}'::jsonb),
    ('stagger', 'arknights_endfield', 'Stagger', null, 'assets/ui/debuffs/stagger', false, 0, 'svg', 250, '{"name":"Stagger","iconBase":"assets/ui/debuffs/stagger","stackable":false,"maxStacks":0,"extension":"svg"}'::jsonb),
    ('knock_down', 'arknights_endfield', 'Knock Down', null, 'assets/ui/debuffs/knock_down', false, 0, 'png', 260, '{"name":"Knock Down","iconBase":"assets/ui/debuffs/knock_down","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('breach', 'arknights_endfield', 'Breach', 'assets/ui/debuffs/breach.svg', null, false, 0, 'svg', 270, '{"name":"Breach","icon":"assets/ui/debuffs/breach.svg","stackable":false,"maxStacks":0,"extension":"svg"}'::jsonb),
    ('operator_attacked', 'arknights_endfield', 'Operator Attacked', null, 'assets/ui/debuffs/operator_attacked', false, 0, 'png', 280, '{"name":"Operator Attacked","iconBase":"assets/ui/debuffs/operator_attacked","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('operator_attacked_low_hp', 'arknights_endfield', 'Operator Attacked (Low HP)', null, 'assets/ui/debuffs/operator_attacked_low_hp', false, 0, 'png', 290, '{"name":"Operator Attacked (Low HP)","iconBase":"assets/ui/debuffs/operator_attacked_low_hp","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('hp_treatment', 'arknights_endfield', 'HP Treatment', null, 'assets/ui/debuffs/hp_treatment', false, 0, 'png', 300, '{"name":"HP Treatment","iconBase":"assets/ui/debuffs/hp_treatment","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('shield', 'arknights_endfield', 'Shield', null, 'assets/ui/debuffs/shield', false, 0, 'png', 310, '{"name":"Shield","iconBase":"assets/ui/debuffs/shield","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('focus', 'arknights_endfield', 'Focus', null, 'assets/ui/debuffs/focus', false, 0, 'png', 320, '{"name":"Focus","iconBase":"assets/ui/debuffs/focus","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('electric_susceptibility', 'arknights_endfield', 'Electric Susceptibility', null, 'assets/ui/debuffs/electric_susceptibility', false, 0, 'png', 330, '{"name":"Electric Susceptibility","iconBase":"assets/ui/debuffs/electric_susceptibility","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('heat_susceptibility', 'arknights_endfield', 'Heat Susceptibility', null, 'assets/ui/debuffs/heat_susceptibility', false, 0, 'png', 340, '{"name":"Heat Susceptibility","iconBase":"assets/ui/debuffs/heat_susceptibility","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('heat_amp', 'arknights_endfield', 'Heat Amp', null, 'assets/ui/debuffs/heat_amp', false, 0, 'png', 350, '{"name":"Heat Amp","iconBase":"assets/ui/debuffs/heat_amp","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('arts_reaction_consumed', 'arknights_endfield', 'Arts Reaction Consumed', null, 'assets/ui/debuffs/arts_reaction', false, 0, 'png', 351, '{"name":"Arts Reaction Consumed","iconBase":"assets/ui/debuffs/arts_reaction","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('combustion_consumed', 'arknights_endfield', 'Combustion Consumed', null, 'assets/ui/debuffs/combustion', false, 0, 'png', 352, '{"name":"Combustion Consumed","iconBase":"assets/ui/debuffs/combustion","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('corrosion_consumed', 'arknights_endfield', 'Corrosion Consumed', null, 'assets/ui/debuffs/corrosion', false, 0, 'png', 353, '{"name":"Corrosion Consumed","iconBase":"assets/ui/debuffs/corrosion","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('solidification_consumed', 'arknights_endfield', 'Solidification Consumed', null, 'assets/ui/debuffs/solidification', false, 0, 'png', 354, '{"name":"Solidification Consumed","iconBase":"assets/ui/debuffs/solidification","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('vulnerable_consumed', 'arknights_endfield', 'Vulnerable Consumed', null, 'assets/ui/debuffs/vulnerable', false, 0, 'png', 355, '{"name":"Vulnerable Consumed","iconBase":"assets/ui/debuffs/vulnerable","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('arts_infliction_consumed', 'arknights_endfield', 'Arts Infliction Consumed', null, 'assets/ui/debuffs/arts', false, 0, 'png', 356, '{"name":"Arts Infliction Consumed","iconBase":"assets/ui/debuffs/arts","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('push', 'arknights_endfield', 'Push', null, 'assets/ui/debuffs/push', false, 0, 'png', 357, '{"name":"Push","iconBase":"assets/ui/debuffs/push","stackable":false,"maxStacks":0,"extension":"png"}'::jsonb),
    ('steel_oath', 'arknights_endfield', 'Steel Oath', null, 'assets/buffs/steel_oath', true, 5, 'png', 358, '{"name":"Steel Oath","iconBase":"assets/buffs/steel_oath","stackable":true,"maxStacks":5,"extension":"png"}'::jsonb),
    ('final_strike', 'arknights_endfield', 'Final Strike', 'assets/ui/debuffs/final_strike.png', null, false, 0, null, 360, '{"name":"Final Strike","icon":"assets/ui/debuffs/final_strike.png"}'::jsonb)
on conflict (effect_key) do update set
    game = excluded.game,
    name = excluded.name,
    icon_path = excluded.icon_path,
    icon_base_path = excluded.icon_base_path,
    stackable = excluded.stackable,
    max_stacks = excluded.max_stacks,
    extension = excluded.extension,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data,
    updated_at = now();

commit;
