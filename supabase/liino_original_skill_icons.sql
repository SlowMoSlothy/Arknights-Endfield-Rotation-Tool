begin;

-- Replace Liino's pre-release vector placeholders with the released game icons.
update public.operator_skills
set icon_small_path = icon_map.icon_path,
    raw_data = coalesce(raw_data, '{}'::jsonb)
        || jsonb_build_object(
            'iconSmall', icon_map.icon_path,
            'iconSourceUrl', icon_map.source_url
        ),
    updated_at = now()
from (
    values
        (3001, 'assets/operators/skills/liino/starry-heart-throb.png', 'https://github.com/cmyyx/cep/blob/main/public/images/wiki/skills/icon_attack_lance.avif'),
        (3002, 'assets/operators/skills/liino/dazzling-focus.png', 'https://github.com/cmyyx/cep/blob/main/public/images/wiki/skills/icon_skill_liino_01.avif'),
        (3003, 'assets/operators/skills/liino/delightful-harmonics.png', 'https://github.com/cmyyx/cep/blob/main/public/images/wiki/skills/icon_combo_skill_liino_01.avif'),
        (3004, 'assets/operators/skills/liino/dawnstar-concerto.png', 'https://github.com/cmyyx/cep/blob/main/public/images/wiki/skills/icon_ultimate_skill_liino_01.avif')
) as icon_map(skill_id, icon_path, source_url)
where public.operator_skills.id = icon_map.skill_id;

commit;

select id, operator_id, name, icon_small_path
from public.operator_skills
where id between 3001 and 3004
order by slot_index;
