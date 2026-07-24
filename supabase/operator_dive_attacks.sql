-- Universal Dive Attack actions for every currently stored Endfield operator.
-- Gameplay values stay in Supabase; the client only classifies the action through
-- the generic normalAttackDamage and formActionKey fields.

begin;

insert into public.operator_skills (
    id,
    operator_id,
    slot_index,
    name,
    skill_type,
    short_type,
    cooldown,
    energy,
    element_type,
    icon_path,
    icon_small_path,
    description,
    combo_trigger,
    combo_trigger_mode,
    atk_multiplier,
    flat_damage,
    hit_count,
    damage_element,
    damage_verified,
    damage_source_url,
    raw_data
)
select
    900000 + operator.id,
    operator.id,
    99,
    'Dive Attack',
    'Dive Attack',
    'Dive',
    0,
    0,
    operator.element_type,
    'assets/operators/skills/shared/dive_attack.png',
    'assets/operators/skills/shared/dive_attack.png',
    'A Basic Attack performed in mid-air. Deals ' || initcap(operator.element_type) || ' DMG to nearby enemies.',
    null,
    null,
    1.8,
    0,
    1,
    operator.element_type,
    true,
    'https://endfield.wiki.gg/wiki/' || replace(
        case when operator.id = 9 then 'Zhuang Fangyi' else operator.name end,
        ' ', '_'
    ),
    jsonb_build_object(
        'id', 900000 + operator.id,
        'operatorId', operator.id,
        'name', 'Dive Attack',
        'type', 'Dive Attack',
        'shortType', 'Dive',
        'cooldown', 0,
        'energy', 0,
        'sp_cost', 0,
        'elementType', operator.element_type,
        'icon', 'assets/operators/skills/shared/dive_attack.png',
        'iconSmall', 'assets/operators/skills/shared/dive_attack.png',
        'description', 'A Basic Attack performed in mid-air. Deals ' || initcap(operator.element_type) || ' DMG to nearby enemies.',
        'damageMultiplier', 180,
        'damageProfile', jsonb_build_object(
            'atkMultiplier', 1.8,
            'flatDamage', 0,
            'hitCount', 1,
            'element', operator.element_type,
            'verified', true,
            'sourceUrl', 'https://endfield.wiki.gg/wiki/' || replace(
                case when operator.id = 9 then 'Zhuang Fangyi' else operator.name end,
                ' ', '_'
            ),
            'canCrit', true
        ),
        'skillLevel', 12,
        'normalAttackDamage', true,
        'formActionKey', 'dive_attack',
        'emits', jsonb_build_array('dive_attack'),
        'debuffs', jsonb_build_array(jsonb_build_object(
            'id', 'dive_attack',
            'name', 'Dive Attack',
            'appliesEffect', 'dive_attack',
            'persistsForCombo', false,
            'visible', false
        )),
        'sourceNote', 'Level 12 Dive ATK multiplier. All currently audited operators use the shared 80%-to-180% progression.'
    )
from public.operators as operator
where operator.game = 'arknights_endfield'
on conflict (id) do update set
    operator_id = excluded.operator_id,
    slot_index = excluded.slot_index,
    name = excluded.name,
    skill_type = excluded.skill_type,
    short_type = excluded.short_type,
    cooldown = excluded.cooldown,
    energy = excluded.energy,
    element_type = excluded.element_type,
    icon_path = excluded.icon_path,
    icon_small_path = excluded.icon_small_path,
    description = excluded.description,
    combo_trigger = excluded.combo_trigger,
    combo_trigger_mode = excluded.combo_trigger_mode,
    atk_multiplier = excluded.atk_multiplier,
    flat_damage = excluded.flat_damage,
    hit_count = excluded.hit_count,
    damage_element = excluded.damage_element,
    damage_verified = excluded.damage_verified,
    damage_source_url = excluded.damage_source_url,
    raw_data = excluded.raw_data,
    updated_at = now();

commit;

-- Verification:
-- select operator_id, name, short_type, atk_multiplier, damage_element, icon_small_path
-- from public.operator_skills
-- where skill_type = 'Dive Attack'
-- order by operator_id;
