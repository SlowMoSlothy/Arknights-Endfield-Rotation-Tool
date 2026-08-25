-- Personal admin API for the BATK Timing Analyzer.
-- Run after supabase/schema.sql and supabase/admin_panel.sql.
-- Only replaces operators.raw_data.basicAttack and preserves every other raw_data field.

drop function if exists public.update_operator_basic_attack(integer, jsonb);

create or replace function public.update_operator_basic_attack(
    target_operator_id integer,
    basic_attack_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    updated_basic_attack jsonb;
begin
    if not public.is_app_admin() then
        raise exception 'Admin access required' using errcode = '42501';
    end if;

    if basic_attack_data is null or jsonb_typeof(basic_attack_data) <> 'object' then
        raise exception 'Basic Attack must be a JSON object' using errcode = '22023';
    end if;

    if trim(coalesce(basic_attack_data ->> 'name', '')) = '' then
        raise exception 'Basic Attack name is required' using errcode = '22023';
    end if;

    if jsonb_typeof(basic_attack_data -> 'sequences') <> 'array'
       or jsonb_array_length(basic_attack_data -> 'sequences') = 0 then
        raise exception 'Basic Attack requires at least one sequence' using errcode = '22023';
    end if;

    update public.operators as op
    set
        raw_data = jsonb_set(
            coalesce(op.raw_data, '{}'::jsonb),
            '{basicAttack}',
            basic_attack_data,
            true
        ),
        updated_at = now()
    where op.id = target_operator_id
      and op.game = 'arknights_endfield'
    returning op.raw_data -> 'basicAttack' into updated_basic_attack;

    if not found then
        raise exception 'Unknown Endfield operator: %', target_operator_id using errcode = 'P0002';
    end if;

    return updated_basic_attack;
end;
$$;

revoke all on function public.update_operator_basic_attack(integer, jsonb) from public;
grant execute on function public.update_operator_basic_attack(integer, jsonb) to authenticated;

comment on function public.update_operator_basic_attack(integer, jsonb) is
    'Admin-only replacement of operators.raw_data.basicAttack for the BATK Timing Analyzer.';
