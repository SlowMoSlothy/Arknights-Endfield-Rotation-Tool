begin;

do $$
declare
    liino_id bigint;
    battle_skill_icon text;
begin
    select id
    into liino_id
    from public.operators
    where game = 'arknights_endfield'
      and slug = 'liino'
    limit 1;

    if liino_id is null then
        raise exception 'Liino operator row was not found';
    end if;

    select coalesce(icon_path, raw_data ->> 'icon')
    into battle_skill_icon
    from public.operator_skills
    where operator_id = liino_id
      and (
          upper(coalesce(short_type, '')) = 'BS'
          or lower(coalesce(skill_type, '')) = 'battle skill'
      )
    order by case when id = 3002 then 0 else 1 end, slot_index, id
    limit 1;

    if nullif(trim(battle_skill_icon), '') is null then
        raise exception 'Liino Battle Skill image path was not found';
    end if;

    update public.operators
    set
        icon_path = battle_skill_icon,
        raw_data = jsonb_set(
            jsonb_set(
                coalesce(raw_data, '{}'::jsonb),
                '{icon}',
                to_jsonb(battle_skill_icon),
                true
            ),
            '{background}',
            to_jsonb(battle_skill_icon),
            true
        ),
        updated_at = now()
    where id = liino_id;
end
$$;

commit;
