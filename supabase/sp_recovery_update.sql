-- Adds SP cost/recovery metadata used by Simulation Mode.
-- Run this after supabase/schema.sql and after importing operator data.

begin;

-- Battle Skills used the legacy "energy" field as their SP cost.
-- Preserve energy for compatibility, but add the explicit raw_data.sp_cost.
-- Current research indicates Battle Skills cost 100 SP.
update public.operator_skills
set
    raw_data = jsonb_set(raw_data, '{sp_cost}', '100'::jsonb, true),
    updated_at = now()
where lower(coalesce(skill_type, raw_data->>'type')) = 'battle skill'
  and not raw_data ? 'sp_cost';

update public.operators
set
    raw_data = jsonb_set(
        raw_data,
        '{skills}',
        (
            select jsonb_agg(
                case
                    when lower(skill->>'type') = 'battle skill'
                         and not skill ? 'sp_cost'
                        then jsonb_set(skill, '{sp_cost}', '100'::jsonb, true)
                    else skill
                end
                order by ord
            )
            from jsonb_array_elements(raw_data->'skills') with ordinality as items(skill, ord)
        ),
        true
    ),
    updated_at = now()
where jsonb_typeof(raw_data->'skills') = 'array';

with skill_costs(skill_id, sp_cost) as (
    values
        (202,  100),
        (602,  100),
        (1002, 100),
        (2202, 100)
)
update public.operator_skills as skill
set
    raw_data = jsonb_set(skill.raw_data, '{sp_cost}', to_jsonb(costs.sp_cost), true),
    updated_at = now()
from skill_costs as costs
where skill.id = costs.skill_id;

with skill_costs(skill_id, sp_cost) as (
    values
        (202,  100),
        (602,  100),
        (1002, 100),
        (2202, 100)
)
update public.operators as operator
set
    raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(
                case
                    when costs.skill_id is not null
                        then jsonb_set(skill, '{sp_cost}', to_jsonb(costs.sp_cost), true)
                    else skill
                end
                order by ord
            )
            from jsonb_array_elements(operator.raw_data->'skills') with ordinality as items(skill, ord)
            left join skill_costs as costs
                on (skill->>'id')::integer = costs.skill_id
        ),
        true
    ),
    updated_at = now()
where jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_costs as costs
        on (skill->>'id')::integer = costs.skill_id
  );

with skill_updates(skill_id, sp_recovery) as (
    values
        (602,  '{"amount":30,"requiresEffect":"electrification","source":"Tempestuous Arc"}'::jsonb),
        (603,  '{"amount":8,"source":"Peal of Thunder"}'::jsonb),
        (203,  '{"amount":15,"source":"Flash and Dash"}'::jsonb),
        (204,  '{"amount":58,"source":"SQUAD! ON ME!"}'::jsonb),
        (1002, '{"effects":["cryo_infliction","originium_crystal"],"amountByStacks":{"1":10,"2":20,"3":30,"4":40},"maxStacks":4,"source":"Unconventional Lure"}'::jsonb),
        (1003, '{"amount":10,"source":"Auger Angling"}'::jsonb),
        (1004, '{"amount":20,"source":"One Monster Catch!"}'::jsonb),
        (2202, '{"effects":["vulnerable"],"amountByStacks":{"1":5,"2":10,"3":20,"4":30},"maxStacks":4,"source":"The Pulverizing Front"}'::jsonb),
        (2203, '{"effects":["vulnerable"],"amountByStacks":{"1":5,"2":12,"3":25,"4":35},"maxStacks":4,"fallbackStacks":1,"source":"Full Moon Slash"}'::jsonb)
)
update public.operator_skills as skill
set
    raw_data = jsonb_set(skill.raw_data, '{spRecovery}', updates.sp_recovery, true),
    updated_at = now()
from skill_updates as updates
where skill.id = updates.skill_id;

with skill_updates(skill_id, sp_recovery) as (
    values
        (602,  '{"amount":30,"requiresEffect":"electrification","source":"Tempestuous Arc"}'::jsonb),
        (603,  '{"amount":8,"source":"Peal of Thunder"}'::jsonb),
        (203,  '{"amount":15,"source":"Flash and Dash"}'::jsonb),
        (204,  '{"amount":58,"source":"SQUAD! ON ME!"}'::jsonb),
        (1002, '{"effects":["cryo_infliction","originium_crystal"],"amountByStacks":{"1":10,"2":20,"3":30,"4":40},"maxStacks":4,"source":"Unconventional Lure"}'::jsonb),
        (1003, '{"amount":10,"source":"Auger Angling"}'::jsonb),
        (1004, '{"amount":20,"source":"One Monster Catch!"}'::jsonb),
        (2202, '{"effects":["vulnerable"],"amountByStacks":{"1":5,"2":10,"3":20,"4":30},"maxStacks":4,"source":"The Pulverizing Front"}'::jsonb),
        (2203, '{"effects":["vulnerable"],"amountByStacks":{"1":5,"2":12,"3":25,"4":35},"maxStacks":4,"fallbackStacks":1,"source":"Full Moon Slash"}'::jsonb)
)
update public.operators as operator
set
    raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(
                case
                    when updates.skill_id is not null
                        then jsonb_set(skill, '{spRecovery}', updates.sp_recovery, true)
                    else skill
                end
                order by ord
            )
            from jsonb_array_elements(operator.raw_data->'skills') with ordinality as items(skill, ord)
            left join skill_updates as updates
                on (skill->>'id')::integer = updates.skill_id
        ),
        true
    ),
    updated_at = now()
where jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join skill_updates as updates
        on (skill->>'id')::integer = updates.skill_id
  );

commit;
