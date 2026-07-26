-- BATK timing template
-- Copy this file, edit only the SETTINGS and SEQUENCE DATA sections, then run it
-- in the Supabase SQL editor.
--
-- Timing modes:
--   absolute  = every value is measured from the start of its sequence
--   intervals = every value is the delay after the previous hit

begin;

-- ============================================================
-- SETTINGS: edit the first four values. attack_name is optional.
-- ============================================================
create temporary table batk_timing_settings on commit drop as
select
    'mi_fu'::text as operator_slug,  -- Example: mi_fu, zhuang, arcane
    'base'::text as form_key,        -- base or e.g. empyrean_of_truth
    'intervals'::text as timing_mode, -- absolute or intervals
    false::boolean as verified,      -- true only after in-game verification
    null::text as attack_name;       -- optional; null = keep existing/default name

-- ============================================================
-- SEQUENCE DATA: enter one row for every BATK sequence the operator has.
--
-- Keep one row for every existing BATK sequence.
-- The number of hit timings must match that sequence's hit_count.
-- Add or remove sequence rows when the operator has fewer/more sequences.
--
-- atk_multiplier_total uses decimal multipliers:
--   0.36 = 36% ATK
--   1.08 = 108% ATK
-- ============================================================
create temporary table batk_timing_input (
    sequence_index smallint primary key,
    duration_seconds numeric not null,
    hit_timings numeric[] not null,
    atk_multiplier_total numeric not null check (atk_multiplier_total >= 0)
) on commit drop;

insert into batk_timing_input (
    sequence_index,
    duration_seconds,
    hit_timings,
    atk_multiplier_total
)
values
    -- sequence, duration, hit timings, total ATK multiplier
    (1, 0.600, array[0.267]::numeric[], 0.76),
    (2, 0.733, array[0.350, 0.333]::numeric[], 0.86),
    (3, 1.267, array[0.367, 0.233, 0.583]::numeric[], 1.36),
    (4, 1.317, array[0.267, 0.883]::numeric[], 1.72);

-- Stop before changing data if the operator does not exist or the input is invalid.
do $$
declare
    target_operator_id integer;
begin
    select operator_row.id
    into target_operator_id
    from public.operators as operator_row
    cross join batk_timing_settings as settings
    where operator_row.game = 'arknights_endfield'
      and operator_row.slug = settings.operator_slug;

    if target_operator_id is null then
        raise exception 'Unknown operator slug in BATK timing template.';
    end if;

    if not exists (select 1 from batk_timing_input) then
        raise exception 'The BATK sequence input is empty.';
    end if;

    if exists (
        select 1
        from batk_timing_settings
        where timing_mode not in ('absolute', 'intervals')
    ) then
        raise exception 'timing_mode must be absolute or intervals.';
    end if;

    if exists (
        select 1
        from batk_timing_input
        where duration_seconds <= 0
           or cardinality(hit_timings) = 0
           or exists (
               select 1
               from unnest(hit_timings) as timing(value)
               where timing.value < 0
           )
    ) then
        raise exception 'Every sequence needs a positive duration and at least one non-negative hit timing.';
    end if;
end;
$$;

-- The input is the complete profile. Existing sequence rows omitted from the
-- input are removed, so four input rows produce exactly four BATK sequences.
delete from public.operator_basic_attack_sequences as sequence_row
using public.operators as operator_row, batk_timing_settings as settings
where operator_row.game = 'arknights_endfield'
  and operator_row.slug = settings.operator_slug
  and sequence_row.game = 'arknights_endfield'
  and sequence_row.operator_id = operator_row.id
  and sequence_row.form_key = settings.form_key
  and not exists (
      select 1
      from batk_timing_input as input
      where input.sequence_index = sequence_row.sequence_index
  );

with profile as (
    select
        operator_row.id as operator_id,
        operator_row.name as operator_name,
        settings.form_key,
        settings.timing_mode,
        settings.verified,
        coalesce(
            settings.attack_name,
            (
                select existing.attack_name
                from public.operator_basic_attack_sequences as existing
                where existing.game = 'arknights_endfield'
                  and existing.operator_id = operator_row.id
                  and existing.form_key = settings.form_key
                order by existing.sequence_index
                limit 1
            ),
            operator_row.name || ' Basic Attack'
        ) as attack_name,
        (select max(sequence_index) from batk_timing_input) as final_sequence_index,
        (select sum(duration_seconds) from batk_timing_input) as cycle_duration
    from public.operators as operator_row
    cross join batk_timing_settings as settings
    where operator_row.game = 'arknights_endfield'
      and operator_row.slug = settings.operator_slug
)
insert into public.operator_basic_attack_sequences (
    game,
    operator_id,
    form_key,
    attack_name,
    sequence_index,
    label,
    kind,
    duration_seconds,
    cycle_duration_seconds,
    hit_count,
    hit_timings,
    hit_timing_mode,
    atk_multiplier_total,
    event_hit_index,
    ends_cycle,
    emits,
    verified,
    source_note
)
select
    'arknights_endfield',
    profile.operator_id,
    profile.form_key,
    profile.attack_name,
    input.sequence_index,
    case
        when input.sequence_index = profile.final_sequence_index then 'FS'
        else 'SEQ ' || input.sequence_index
    end,
    case
        when input.sequence_index = profile.final_sequence_index then 'final_strike'
        else 'normal'
    end,
    input.duration_seconds,
    profile.cycle_duration,
    cardinality(input.hit_timings),
    input.hit_timings,
    profile.timing_mode,
    input.atk_multiplier_total,
    case
        when input.sequence_index = profile.final_sequence_index
            then cardinality(input.hit_timings)
        else null
    end,
    input.sequence_index = profile.final_sequence_index,
    case
        when input.sequence_index = profile.final_sequence_index
            then array['final_strike']::text[]
        else '{}'::text[]
    end,
    profile.verified,
    'Created or updated with basic_attack_timing_template.sql'
from batk_timing_input as input
cross join profile
on conflict (game, operator_id, form_key, sequence_index) do update set
    attack_name = excluded.attack_name,
    label = excluded.label,
    kind = excluded.kind,
    duration_seconds = excluded.duration_seconds,
    cycle_duration_seconds = excluded.cycle_duration_seconds,
    hit_count = excluded.hit_count,
    hit_timings = excluded.hit_timings,
    hit_timing_mode = excluded.hit_timing_mode,
    atk_multiplier_total = excluded.atk_multiplier_total,
    event_hit_index = excluded.event_hit_index,
    ends_cycle = excluded.ends_cycle,
    emits = excluded.emits,
    verified = excluded.verified,
    source_note = excluded.source_note;

-- Result preview
select
    operator_row.name as operator,
    sequence_row.form_key,
    sequence_row.attack_name,
    sequence_row.sequence_index,
    sequence_row.duration_seconds,
    sequence_row.hit_count,
    sequence_row.hit_timings,
    sequence_row.hit_timing_mode,
    sequence_row.atk_multiplier_total,
    sequence_row.verified,
    sequence_row.updated_at
from public.operator_basic_attack_sequences as sequence_row
join public.operators as operator_row
  on operator_row.id = sequence_row.operator_id
cross join batk_timing_settings as settings
where operator_row.game = 'arknights_endfield'
  and operator_row.slug = settings.operator_slug
  and sequence_row.form_key = settings.form_key
order by sequence_row.sequence_index;

commit;
