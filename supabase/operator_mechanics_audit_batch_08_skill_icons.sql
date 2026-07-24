begin;

-- Batch 08 icon patch for installations where the initial migration already ran.
-- The paths remain data-driven in Supabase; no operator-specific icon mapping is
-- required in the client.
update public.operator_skills
set icon_path = values_map.icon_path,
    icon_small_path = values_map.icon_small_path,
    raw_data = coalesce(raw_data, '{}'::jsonb)
        || jsonb_build_object(
            'icon', values_map.icon_path,
            'iconSmall', values_map.icon_small_path,
            'iconSourceUrl', values_map.source_url
        ),
    updated_at = now()
from (
    values
        (2801, 'assets/operators/avatars/Arcane.png', 'assets/operators/skills/arcane/artillery-interdiction.png', 'https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/arcane/artillery-interdiction.png'),
        (2802, 'assets/operators/avatars/Arcane.png', 'assets/operators/skills/arcane/jadecrushing-grid.png', 'https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/arcane/jadecrushing-grid.png'),
        (2803, 'assets/operators/avatars/Arcane.png', 'assets/operators/skills/arcane/yinglung-stance-iv.png', 'https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/arcane/yinglung-stance-iv.png'),
        (2804, 'assets/operators/avatars/Arcane.png', 'assets/operators/skills/arcane/gloompurge.png', 'https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/arcane/gloompurge.png'),
        (2901, 'assets/operators/avatars/Camille.png', 'assets/operators/skills/camille/sanguine-absolution.png', 'https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/camille/sanguine-absolution.png'),
        (2902, 'assets/operators/avatars/Camille.png', 'assets/operators/skills/camille/blazing-exorcism.png', 'https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/camille/blazing-exorcism.png'),
        (2903, 'assets/operators/avatars/Camille.png', 'assets/operators/skills/camille/heartstake-thorn.png', 'https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/camille/heartstake-thorn.png'),
        (2904, 'assets/operators/avatars/Camille.png', 'assets/operators/skills/camille/sanguine-downpour.png', 'https://static.icy-veins.com/images/arknights-endfield/tooling/operators/battle-skills/camille/sanguine-downpour.png'),
        (3001, 'assets/operators/avatars/Liino.png', 'assets/operators/skills/liino/starry-heart-throb.svg', 'pre-release-local-vector'),
        (3002, 'assets/operators/avatars/Liino.png', 'assets/operators/skills/liino/dazzling-focus.svg', 'pre-release-local-vector'),
        (3003, 'assets/operators/avatars/Liino.png', 'assets/operators/skills/liino/delightful-harmonics.svg', 'pre-release-local-vector'),
        (3004, 'assets/operators/avatars/Liino.png', 'assets/operators/skills/liino/dawnstar-concerto.svg', 'pre-release-local-vector'),
        (900028, 'assets/operators/skills/shared/dive_attack.png', 'assets/operators/skills/shared/dive_attack.png', 'shared-standard-dive-icon'),
        (900029, 'assets/operators/skills/shared/dive_attack.png', 'assets/operators/skills/shared/dive_attack.png', 'shared-standard-dive-icon'),
        (900030, 'assets/operators/skills/shared/dive_attack.png', 'assets/operators/skills/shared/dive_attack.png', 'shared-standard-dive-icon')
) as values_map(skill_id, icon_path, icon_small_path, source_url)
where public.operator_skills.id = values_map.skill_id;

commit;

select id, operator_id, name, icon_small_path
from public.operator_skills
where (id between 2801 and 3004 and operator_id in (28, 29, 30))
   or id in (900028, 900029, 900030)
order by operator_id, slot_index;
