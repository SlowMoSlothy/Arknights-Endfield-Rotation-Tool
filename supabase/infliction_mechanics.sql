-- Current Arts Infliction mechanics for Arknights: Endfield.
-- This is the single gameplay-data source used by the simulator for durations and Arts Bursts.

begin;

create table if not exists public.infliction_mechanics (
    effect_key text primary key,
    game text not null default 'arknights_endfield',
    name text not null,
    element text not null,
    duration_seconds numeric not null check (duration_seconds > 0),
    max_stacks smallint not null check (max_stacks > 0),
    burst_key text not null,
    burst_name text not null,
    burst_atk_multiplier numeric not null check (burst_atk_multiplier >= 0),
    burst_hit_count smallint not null default 1 check (burst_hit_count > 0),
    burst_can_crit boolean not null default true,
    burst_delay_seconds numeric not null default 0 check (burst_delay_seconds >= 0),
    verified boolean not null default false,
    source_url text not null,
    source_note text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_infliction_mechanics_game_sort
    on public.infliction_mechanics (game, sort_order, effect_key);

alter table public.infliction_mechanics enable row level security;

drop policy if exists "Public read infliction mechanics" on public.infliction_mechanics;
create policy "Public read infliction mechanics"
    on public.infliction_mechanics
    for select
    using (true);

insert into public.infliction_mechanics (
    effect_key,
    game,
    name,
    element,
    duration_seconds,
    max_stacks,
    burst_key,
    burst_name,
    burst_atk_multiplier,
    burst_hit_count,
    burst_can_crit,
    burst_delay_seconds,
    verified,
    source_url,
    source_note,
    sort_order
) values
    ('electric_infliction', 'arknights_endfield', 'Electric Infliction', 'electric', 20, 4, 'electric_burst', 'Electric Burst', 1.6, 1, true, 0, true, 'https://endfield.wiki.gg/wiki/Electric_Infliction', 'Same-element reapplication refreshes the debuff, adds a stack up to four, and triggers a 160% ATK Electric Burst.', 10),
    ('heat_infliction', 'arknights_endfield', 'Heat Infliction', 'heat', 20, 4, 'heat_burst', 'Heat Burst', 1.6, 1, true, 0, true, 'https://endfield.wiki.gg/wiki/Heat_Infliction', 'Same-element reapplication refreshes the debuff, adds a stack up to four, and triggers a 160% ATK Heat Burst.', 20),
    ('cryo_infliction', 'arknights_endfield', 'Cryo Infliction', 'cryo', 20, 4, 'cryo_burst', 'Cryo Burst', 1.6, 1, true, 0, true, 'https://endfield.wiki.gg/wiki/Cryo_Infliction', 'Same-element reapplication refreshes the debuff, adds a stack up to four, and triggers a 160% ATK Cryo Burst.', 30),
    ('nature_infliction', 'arknights_endfield', 'Nature Infliction', 'nature', 20, 4, 'nature_burst', 'Nature Burst', 1.6, 1, true, 0, true, 'https://endfield.wiki.gg/wiki/Nature_Infliction', 'Same-element reapplication refreshes the debuff, adds a stack up to four, and triggers a 160% ATK Nature Burst.', 40)
on conflict (effect_key) do update set
    game = excluded.game,
    name = excluded.name,
    element = excluded.element,
    duration_seconds = excluded.duration_seconds,
    max_stacks = excluded.max_stacks,
    burst_key = excluded.burst_key,
    burst_name = excluded.burst_name,
    burst_atk_multiplier = excluded.burst_atk_multiplier,
    burst_hit_count = excluded.burst_hit_count,
    burst_can_crit = excluded.burst_can_crit,
    burst_delay_seconds = excluded.burst_delay_seconds,
    verified = excluded.verified,
    source_url = excluded.source_url,
    source_note = excluded.source_note,
    sort_order = excluded.sort_order,
    updated_at = now();

commit;
