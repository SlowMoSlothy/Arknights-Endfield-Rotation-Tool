-- Secured BATK profile editor for the planner admin panel.
-- Run after schema.sql and admin_panel.sql.

drop function if exists public.replace_operator_basic_attack_profile(integer, text, jsonb);

create or replace function public.replace_operator_basic_attack_profile(
    target_operator_id integer,
    target_form_key text,
    profile_data jsonb
)
returns setof public.operator_basic_attack_sequences
language plpgsql
security definer
set search_path = public
as $$
declare
    normalized_form_key text := lower(trim(coalesce(target_form_key, '')));
    normalized_attack_name text := trim(coalesce(profile_data ->> 'attackName', ''));
    normalized_timing_mode text := lower(trim(coalesce(profile_data ->> 'timingMode', 'absolute')));
    profile_sequences jsonb := profile_data -> 'sequences';
    profile_sequence jsonb;
    sequence_number integer;
    sequence_duration numeric;
    sequence_timings numeric[];
    sequence_hit_multipliers numeric[];
    sequence_emits text[];
    sequence_event_hit_index integer;
    sequence_kind text;
    sequence_ends_cycle boolean;
    cycle_duration numeric := 0;
    final_count integer := 0;
begin
    if not public.is_app_admin() then
        raise exception 'Admin access required' using errcode = '42501';
    end if;

    if not exists (
        select 1 from public.operators
        where id = target_operator_id and game = 'arknights_endfield'
    ) then
        raise exception 'Unknown Endfield operator: %', target_operator_id using errcode = '22023';
    end if;

    if normalized_form_key !~ '^[a-z0-9][a-z0-9_]{0,63}$' then
        raise exception 'Form key must contain only lowercase letters, numbers, and underscores.' using errcode = '22023';
    end if;

    if char_length(normalized_attack_name) not between 1 and 120 then
        raise exception 'Attack name must contain between 1 and 120 characters.' using errcode = '22023';
    end if;

    if normalized_timing_mode not in ('absolute', 'intervals') then
        raise exception 'Timing mode must be absolute or intervals.' using errcode = '22023';
    end if;

    if jsonb_typeof(profile_sequences) <> 'array'
       or jsonb_array_length(profile_sequences) not between 1 and 20 then
        raise exception 'A BATK profile needs between 1 and 20 sequences.' using errcode = '22023';
    end if;

    -- Validate the complete payload before replacing any rows.
    for profile_sequence, sequence_number in
        select value, ordinality::integer
        from jsonb_array_elements(profile_sequences) with ordinality
    loop
        sequence_duration := (profile_sequence ->> 'duration')::numeric;
        sequence_kind := lower(trim(coalesce(profile_sequence ->> 'kind', 'normal')));
        sequence_ends_cycle := coalesce((profile_sequence ->> 'endsCycle')::boolean, false);
        sequence_timings := array(
            select value::numeric
            from jsonb_array_elements_text(coalesce(profile_sequence -> 'hitTimings', '[]'::jsonb))
        );
        sequence_hit_multipliers := array(
            select value::numeric
            from jsonb_array_elements_text(coalesce(profile_sequence -> 'hitMultipliers', '[]'::jsonb))
        );
        sequence_event_hit_index := nullif(profile_sequence ->> 'eventHitIndex', '')::integer;

        if sequence_duration <= 0 then
            raise exception 'Sequence % needs a positive duration.', sequence_number using errcode = '22023';
        end if;

        if sequence_kind not in ('normal', 'final_strike') then
            raise exception 'Sequence % has an unsupported kind.', sequence_number using errcode = '22023';
        end if;

        if cardinality(sequence_timings) = 0
           or exists (select 1 from unnest(sequence_timings) timing where timing < 0) then
            raise exception 'Sequence % needs at least one non-negative hit timing.', sequence_number using errcode = '22023';
        end if;

        if normalized_timing_mode = 'absolute'
           and (select max(timing) from unnest(sequence_timings) timing) > sequence_duration then
            raise exception 'Sequence % contains an absolute hit timing after its duration.', sequence_number using errcode = '22023';
        end if;

        if normalized_timing_mode = 'intervals'
           and (select sum(timing) from unnest(sequence_timings) timing) > sequence_duration then
            raise exception 'Sequence % interval timings exceed its duration.', sequence_number using errcode = '22023';
        end if;

        if cardinality(sequence_hit_multipliers) > 0
           and cardinality(sequence_hit_multipliers) <> cardinality(sequence_timings) then
            raise exception 'Sequence % hit multipliers must match its hit count.', sequence_number using errcode = '22023';
        end if;

        if exists (select 1 from unnest(sequence_hit_multipliers) multiplier where multiplier < 0) then
            raise exception 'Sequence % hit multipliers cannot be negative.', sequence_number using errcode = '22023';
        end if;

        if sequence_event_hit_index is not null
           and sequence_event_hit_index not between 1 and cardinality(sequence_timings) then
            raise exception 'Sequence % event hit must reference an existing hit.', sequence_number using errcode = '22023';
        end if;

        if coalesce((profile_sequence ->> 'atkMultiplierTotal')::numeric, 0) < 0
           or coalesce((profile_sequence ->> 'staggerMultiplier')::numeric, 0) < 0 then
            raise exception 'Sequence % multipliers cannot be negative.', sequence_number using errcode = '22023';
        end if;

        cycle_duration := cycle_duration + sequence_duration;
        if sequence_ends_cycle then final_count := final_count + 1; end if;
    end loop;

    if final_count <> 1 then
        raise exception 'Exactly one sequence must end the BATK cycle.' using errcode = '22023';
    end if;

    delete from public.operator_basic_attack_sequences
    where game = 'arknights_endfield'
      and operator_id = target_operator_id
      and form_key = normalized_form_key;

    for profile_sequence, sequence_number in
        select value, ordinality::integer
        from jsonb_array_elements(profile_sequences) with ordinality
    loop
        sequence_timings := array(
            select value::numeric
            from jsonb_array_elements_text(profile_sequence -> 'hitTimings')
        );
        sequence_hit_multipliers := array(
            select value::numeric
            from jsonb_array_elements_text(coalesce(profile_sequence -> 'hitMultipliers', '[]'::jsonb))
        );
        sequence_kind := lower(trim(coalesce(profile_sequence ->> 'kind', 'normal')));
        sequence_ends_cycle := coalesce((profile_sequence ->> 'endsCycle')::boolean, false);
        sequence_event_hit_index := nullif(profile_sequence ->> 'eventHitIndex', '')::integer;
        sequence_emits := array(
            select trim(value)
            from jsonb_array_elements_text(coalesce(profile_sequence -> 'emits', '[]'::jsonb))
            where trim(value) <> ''
        );

        insert into public.operator_basic_attack_sequences (
            game, operator_id, form_key, attack_name, sequence_index, label, kind,
            duration_seconds, cycle_duration_seconds, hit_count, hit_timings,
            hit_timing_mode, hit_multipliers, atk_multiplier_total, stagger_multiplier,
            event_hit_index, ends_cycle, emits, icon_path, description, verified,
            source_url, source_note
        ) values (
            'arknights_endfield',
            target_operator_id,
            normalized_form_key,
            normalized_attack_name,
            sequence_number,
            nullif(trim(coalesce(profile_sequence ->> 'label', '')), ''),
            sequence_kind,
            (profile_sequence ->> 'duration')::numeric,
            cycle_duration,
            cardinality(sequence_timings),
            sequence_timings,
            normalized_timing_mode,
            sequence_hit_multipliers,
            coalesce((profile_sequence ->> 'atkMultiplierTotal')::numeric, 0),
            coalesce((profile_sequence ->> 'staggerMultiplier')::numeric, 0),
            coalesce(sequence_event_hit_index, case when sequence_ends_cycle then cardinality(sequence_timings) else null end)::smallint,
            sequence_ends_cycle,
            case
                when sequence_ends_cycle and not ('final_strike' = any(sequence_emits))
                    then array_append(sequence_emits, 'final_strike')
                else sequence_emits
            end,
            nullif(trim(coalesce(profile_data ->> 'iconPath', '')), ''),
            nullif(trim(coalesce(profile_data ->> 'description', '')), ''),
            coalesce((profile_data ->> 'verified')::boolean, false),
            nullif(trim(coalesce(profile_data ->> 'sourceUrl', '')), ''),
            nullif(trim(coalesce(profile_data ->> 'sourceNote', '')), '')
        );
    end loop;

    return query
    select sequence_row.*
    from public.operator_basic_attack_sequences as sequence_row
    where sequence_row.game = 'arknights_endfield'
      and sequence_row.operator_id = target_operator_id
      and sequence_row.form_key = normalized_form_key
    order by sequence_row.sequence_index;
end;
$$;

revoke all on function public.replace_operator_basic_attack_profile(integer, text, jsonb) from public;
grant execute on function public.replace_operator_basic_attack_profile(integer, text, jsonb) to authenticated;
