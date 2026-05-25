-- Fix Mi Fu icon paths to match the files in assets/operators/skills/mifu.
-- Run this in Supabase if Mi Fu already exists in the database.

begin;

with icon_updates(skill_id, icon_small_path) as (
    values
        (2701, 'assets/operators/skills/mifu/fs_small.png'),
        (2702, 'assets/operators/skills/mifu/bs_1.svg'),
        (2705, 'assets/operators/skills/mifu/bs_2.png'),
        (2706, 'assets/operators/skills/mifu/bs_3.svg'),
        (2703, 'assets/operators/skills/mifu/cs_small.svg'),
        (2704, 'assets/operators/skills/mifu/ult_small.svg')
)
update public.operator_skills as skill
set
    icon_small_path = updates.icon_small_path,
    raw_data = jsonb_set(
        skill.raw_data,
        '{iconSmall}',
        to_jsonb(updates.icon_small_path),
        true
    ),
    updated_at = now()
from icon_updates as updates
where skill.id = updates.skill_id
  and skill.operator_id = 27;

with icon_updates(skill_id, icon_small_path) as (
    values
        (2701, 'assets/operators/skills/mifu/fs_small.png'),
        (2702, 'assets/operators/skills/mifu/bs_1.svg'),
        (2705, 'assets/operators/skills/mifu/bs_2.png'),
        (2706, 'assets/operators/skills/mifu/bs_3.svg'),
        (2703, 'assets/operators/skills/mifu/cs_small.svg'),
        (2704, 'assets/operators/skills/mifu/ult_small.svg')
)
update public.operators as operator
set
    raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(
                case
                    when updates.icon_small_path is null then skill
                    else jsonb_set(skill, '{iconSmall}', to_jsonb(updates.icon_small_path), true)
                end
                order by ord
            )
            from jsonb_array_elements(operator.raw_data->'skills') with ordinality as items(skill, ord)
            left join icon_updates as updates
                on skill->>'id' = updates.skill_id::text
        ),
        true
    ),
    updated_at = now()
where operator.id = 27
  and jsonb_typeof(operator.raw_data->'skills') = 'array';

commit;
