begin;

-- Winter's Devourer uses the number of Cryo Infliction stacks present before
-- consumption for its damage, Ultimate Energy gain, and Cryo Susceptibility.
-- The client contains only the generic resolver; all gameplay values live here.
with mechanics as (
    select '{
        "effect": "cryo_infliction",
        "damageAtkMultiplierPerStack": 1.07,
        "ultimateEnergyBase": 40,
        "ultimateEnergyPerStack": 15,
        "effectValues": [
            {
                "effect": "cryo_susceptibility",
                "valuePercentPerStack": 4,
                "durationSeconds": 15
            }
        ],
        "verified": true,
        "sourceUrl": "https://endfield.wiki.gg/wiki/Last_Rite"
    }'::jsonb as config
)
update public.operator_skills as skill
set
    raw_data = coalesce(skill.raw_data, '{}'::jsonb)
        || jsonb_build_object('consumedEffectScaling', mechanics.config),
    updated_at = now()
from mechanics
where skill.operator_id = 20
  and skill.id = 2003;

-- Keep the embedded operator payload consistent for consumers that read the
-- operator JSON directly instead of joining public.operator_skills.
with mechanics as (
    select '{
        "effect": "cryo_infliction",
        "damageAtkMultiplierPerStack": 1.07,
        "ultimateEnergyBase": 40,
        "ultimateEnergyPerStack": 15,
        "effectValues": [
            {
                "effect": "cryo_susceptibility",
                "valuePercentPerStack": 4,
                "durationSeconds": 15
            }
        ],
        "verified": true,
        "sourceUrl": "https://endfield.wiki.gg/wiki/Last_Rite"
    }'::jsonb as config
)
update public.operators as operator
set
    raw_data = jsonb_set(
        operator.raw_data,
        '{skills}',
        (
            select jsonb_agg(
                case
                    when (skill->>'id')::integer = 2003
                        then skill || jsonb_build_object('consumedEffectScaling', mechanics.config)
                    else skill
                end
                order by ord
            )
            from jsonb_array_elements(operator.raw_data->'skills') with ordinality as skills(skill, ord)
        ),
        true
    ),
    updated_at = now()
from mechanics
where operator.id = 20
  and jsonb_typeof(operator.raw_data->'skills') = 'array';

commit;
