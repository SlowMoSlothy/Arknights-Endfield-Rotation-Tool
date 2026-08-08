-- Operator mechanics audit Batch 08E
-- Restores the missing prerequisite for Rossi's Combo Skill.
--
-- Crimson Shadow applies the first Vulnerability stack when its Lift is used
-- against an enemy that does not yet have Vulnerability. With an Arts
-- Infliction already active, this allows Moment of Blazing Shadow to trigger.

begin;

update public.operator_skills as skill
set raw_data = jsonb_set(
    coalesce(skill.raw_data, '{}'::jsonb),
    '{physicalStatusResolution}',
    '{
      "vulnerabilityMode": "stack",
      "vulnerableEffect": "vulnerable",
      "statusEffect": "lift",
      "vulnerableApplication": {
        "name": "Vulnerable",
        "visible": true,
        "stacksApplied": 1,
        "maxStacks": 4,
        "iconBase": "assets/debuffs/vulnerable"
      },
      "statusApplication": {
        "name": "Lift",
        "visible": true,
        "iconBase": "assets/debuffs/lift"
      },
      "verified": true,
      "sourceUrl": "https://endfield.games/en/tutorials/battle/"
    }'::jsonb,
    true
)
where skill.operator_id = 5
  and skill.id = 502;

-- Keep Rossi eligible to trigger her own Combo Skill from the Vulnerability
-- created by Crimson Shadow.
update public.operator_skills as skill
set raw_data = jsonb_set(
    coalesce(skill.raw_data, '{}'::jsonb),
    '{allowSelfTrigger}',
    'true'::jsonb,
    true
)
where skill.operator_id = 5
  and skill.id = 503;

do $$
begin
    if not exists (
        select 1
        from public.operator_skills as skill
        where skill.operator_id = 5
          and skill.id = 502
          and skill.raw_data->'physicalStatusResolution'->>'vulnerabilityMode' = 'stack'
          and skill.raw_data->'physicalStatusResolution'->>'vulnerableEffect' = 'vulnerable'
          and skill.raw_data->'physicalStatusResolution'->>'statusEffect' = 'lift'
          and (skill.raw_data->'physicalStatusResolution'->'vulnerableApplication'->>'stacksApplied')::integer = 1
    ) then
        raise exception 'Rossi Battle Skill physical-status resolution was not restored';
    end if;

    if not exists (
        select 1
        from public.operator_skills as skill
        where skill.operator_id = 5
          and skill.id = 503
          and skill.raw_data->>'allowSelfTrigger' = 'true'
          and exists (
              select 1
              from jsonb_array_elements(coalesce(skill.raw_data->'comboTriggers', '[]'::jsonb)) as trigger
              where trigger->>'effect' = 'vulnerable'
                and (trigger->>'minStacks')::integer = 1
          )
    ) then
        raise exception 'Rossi Combo Skill self-trigger configuration is incomplete';
    end if;
end;
$$;

commit;

select
    operator_id,
    id,
    name,
    raw_data->'physicalStatusResolution' as physical_status_resolution,
    raw_data->>'allowSelfTrigger' as allow_self_trigger,
    raw_data->'comboTriggers' as combo_triggers
from public.operator_skills
where operator_id = 5
  and id in (502, 503)
order by id;
