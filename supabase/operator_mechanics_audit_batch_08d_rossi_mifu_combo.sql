-- Operator mechanics audit Batch 08D
-- Makes Slot Mode evaluate Rossi's completed Combo Skill at perfect timing.
--
-- Crimson Shadow supplies the first Vulnerability stack. A perfectly timed
-- Moment of Blazing Shadow supplies two more, reaching the three stacks that
-- trigger Mi Fu's Fists of No Regrets.
--
-- Simulation Mode keeps its explicit two-stage timing model: the normal
-- second input applies one stack, while perfectActionOverride applies two.

begin;

update public.operator_skills as skill
set raw_data = jsonb_set(
    coalesce(skill.raw_data, '{}'::jsonb),
    '{debuffs}',
    coalesce((
        select jsonb_agg(
            case
                when effect->>'appliesEffect' = 'vulnerable'
                    then jsonb_set(effect, '{stacksApplied}', '2'::jsonb, true)
                else effect
            end
            order by effect_position
        )
        from jsonb_array_elements(coalesce(skill.raw_data->'debuffs', '[]'::jsonb))
            with ordinality as listed(effect, effect_position)
    ), '[]'::jsonb),
    true
) || jsonb_build_object(
    'slotModePerfectTiming', true,
    'mechanicsAudit', jsonb_build_object(
        'batch', '08D',
        'status', 'verified',
        'notes', 'Slot Mode resolves Rossi Combo Sequence 2 at perfect timing: two Vulnerability stacks.'
    )
)
where skill.operator_id = 5
  and skill.id = 503;

do $$
begin
    if not exists (
        select 1
        from public.operator_skills as skill
        cross join lateral jsonb_array_elements(coalesce(skill.raw_data->'debuffs', '[]'::jsonb)) as effect
        where skill.operator_id = 5
          and skill.id = 503
          and effect->>'appliesEffect' = 'vulnerable'
          and (effect->>'stacksApplied')::integer = 2
          and skill.raw_data->>'slotModePerfectTiming' = 'true'
    ) then
        raise exception 'Rossi Slot Mode perfect-timing configuration was not applied';
    end if;
end;
$$;

commit;

select
    operator_id,
    id,
    name,
    raw_data->>'slotModePerfectTiming' as slot_mode_perfect_timing,
    raw_data->'debuffs' as slot_mode_debuffs,
    raw_data->'manualSequence'->'stages' as simulation_sequence_stages
from public.operator_skills
where operator_id = 5
  and id = 503;
