-- Backfills missing skill descriptions in Supabase.
-- Safe to run after any operator import or batch update.

begin;

with description_updates(operator_id, skill_id, description) as (
    values
        (7, 701, 'Physical Final Strike.'),
        (11, 1101, 'Nature Final Strike.'),
        (12, 1201, 'Nature Final Strike.'),
        (12, 1204, 'Nature Ultimate.'),
        (13, 1301, 'Physical Final Strike.'),
        (13, 1304, 'Physical Ultimate.'),
        (14, 1401, 'Physical Final Strike.'),
        (14, 1404, 'Physical Ultimate.')
)
update public.operator_skills as skill
set
    description = updates.description,
    raw_data = jsonb_set(
        coalesce(skill.raw_data, '{}'::jsonb),
        '{description}',
        to_jsonb(updates.description),
        true
    ),
    updated_at = now()
from description_updates as updates
where skill.operator_id = updates.operator_id
  and skill.id = updates.skill_id
  and nullif(trim(coalesce(skill.description, '')), '') is null;

with description_updates(operator_id, skill_id, description) as (
    values
        (7, 701, 'Physical Final Strike.'),
        (11, 1101, 'Nature Final Strike.'),
        (12, 1201, 'Nature Final Strike.'),
        (12, 1204, 'Nature Ultimate.'),
        (13, 1301, 'Physical Final Strike.'),
        (13, 1304, 'Physical Ultimate.'),
        (14, 1401, 'Physical Final Strike.'),
        (14, 1404, 'Physical Ultimate.')
)
update public.operators as operator
set
    raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(
                case
                    when updates.description is null then skill
                    when nullif(trim(coalesce(skill->>'description', '')), '') is null then
                        jsonb_set(skill, '{description}', to_jsonb(updates.description), true)
                    else skill
                end
                order by ord
            )
            from jsonb_array_elements(operator.raw_data->'skills') with ordinality as items(skill, ord)
            left join description_updates as updates
                on updates.operator_id = operator.id
               and (skill->>'id')::integer = updates.skill_id
        ),
        true
    ),
    updated_at = now()
where operator.id in (7, 11, 12, 13, 14)
  and jsonb_typeof(operator.raw_data->'skills') = 'array'
  and exists (
      select 1
      from jsonb_array_elements(operator.raw_data->'skills') as skill
      join description_updates as updates
        on updates.operator_id = operator.id
       and (skill->>'id')::integer = updates.skill_id
      where nullif(trim(coalesce(skill->>'description', '')), '') is null
  );

commit;
