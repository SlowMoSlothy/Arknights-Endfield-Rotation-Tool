begin;

-- Chen's own Ascending Strike can satisfy Soar to the Stars' Vulnerable trigger.
-- Keep the trigger definition, cooldown, damage and every other raw field intact.
do $$
begin
    if not exists (
        select 1 from public.operator_skills s
        join public.operators o on o.id = s.operator_id
        where s.id = 1403 and s.operator_id = 14
          and s.name = 'Soar to the Stars' and s.skill_type = 'Combo Skill'
          and o.name = 'Chen Qianyu' and o.game = 'arknights_endfield'
    ) then
        raise exception 'Chen combo identity check failed; no repair applied';
    end if;
end $$;

update public.operator_skills
set raw_data = jsonb_set(coalesce(raw_data, '{}'::jsonb), '{allowSelfTrigger}', 'true'::jsonb, true),
    updated_at = now()
where id = 1403 and operator_id = 14
  and raw_data->'allowSelfTrigger' is distinct from 'true'::jsonb;

commit;
