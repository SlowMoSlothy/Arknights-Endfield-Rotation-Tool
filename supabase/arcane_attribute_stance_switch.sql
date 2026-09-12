begin;

-- Refresh the released INT/WILL descriptions while preserving all other skill data.
update public.operator_skills as skill
set raw_data = jsonb_set(coalesce(skill.raw_data, '{}'::jsonb), '{attributeVariants}', variants.data, true),
    updated_at = now()
from (
    values
      (2802, '[{"key":"intellect","label":"Array Arcana: INT","condition":{"leftStat":"intellect","comparison":"gte","rightStat":"will"},"actionOverride":{"description":"Array Arcana: INT deals 500% ATK as Nature DMG and applies Nature Infliction.","damageMultiplier":500,"damageProfile":{"atkMultiplier":5.0}}},{"key":"will","label":"Array Arcana: WILL","condition":{"leftStat":"will","comparison":"gt","rightStat":"intellect"},"actionOverride":{"description":"Array Arcana: WILL deals 300% ATK as Nature DMG, applies Nature Infliction, and pulls enemies toward the center.","damageMultiplier":300,"damageProfile":{"atkMultiplier":3.0},"debuffs":[{"id":"nature_infliction","name":"Nature Infliction","appliesEffect":"nature_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"pull","name":"Pull","appliesEffect":"pull","persistsForCombo":false,"visible":true}]}}]'::jsonb),
      (2803, '[{"key":"intellect","label":"Array Arcana: INT","condition":{"leftStat":"intellect","comparison":"gte","rightStat":"will"},"actionOverride":{"description":"INT form: 13s cooldown. Requires Nature Infliction or 2 stacks of another Arts Infliction; applies 4s Imprisonment and 4% Arts Susceptibility.","cooldown":13}},{"key":"will","label":"Array Arcana: WILL","condition":{"leftStat":"will","comparison":"gt","rightStat":"intellect"},"actionOverride":{"description":"WILL form: 19s cooldown. Requires 1 stack of any Arts Infliction; applies 6s Imprisonment and 12% Arts Susceptibility.","cooldown":19,"comboTriggerMode":"any","comboTriggers":[{"effect":"nature_infliction","minStacks":1},{"effect":"heat_infliction","minStacks":1},{"effect":"cryo_infliction","minStacks":1},{"effect":"electric_infliction","minStacks":1}],"debuffs":[{"id":"imprisonment","name":"Imprisonment","appliesEffect":"imprisonment","durationSeconds":6,"persistsForCombo":false,"visible":true},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","valuePercent":12,"durationSeconds":6,"persistsForCombo":true,"visible":true}]}}]'::jsonb),
      (2804, '[{"key":"intellect","label":"Array Arcana: INT","condition":{"leftStat":"intellect","comparison":"gte","rightStat":"will"},"actionOverride":{"description":"INT form: the second cast deals 1440% Nature DMG, applies Corrosion for 15s, and grants the team 24% Arts DMG.","secondCast":{"damageProfile":{"atkMultiplier":14.4,"element":"nature","verified":true},"debuffs":[{"id":"corrosion","name":"Corrosion","appliesEffect":"corrosion","durationSeconds":15,"visible":true,"persistsForCombo":true}],"buffs":[{"id":"gloompurge_arts_amp","name":"Gloompurge Arts Amp","appliesEffect":"gloompurge_arts_amp","target":"team","artsDamagePercent":24,"visible":true}]}}},{"key":"will","label":"Array Arcana: WILL","condition":{"leftStat":"will","comparison":"gt","rightStat":"intellect"},"actionOverride":{"description":"WILL form: the second cast deals 360% Nature DMG, duplicates the current Arts Infliction, and applies 12.8% Nature and Cryo Susceptibility for 10s.","secondCast":{"damageProfile":{"atkMultiplier":3.6,"element":"nature","verified":true},"duplicateCurrentArtsInfliction":true,"debuffs":[{"id":"nature_susceptibility","name":"Nature Susceptibility","appliesEffect":"nature_susceptibility","valuePercent":12.8,"durationSeconds":10,"visible":true,"persistsForCombo":true},{"id":"cryo_susceptibility","name":"Cryo Susceptibility","appliesEffect":"cryo_susceptibility","valuePercent":12.8,"durationSeconds":10,"visible":true,"persistsForCombo":true}]}}}]'::jsonb)
) as variants(skill_id, data)
where skill.id = variants.skill_id
  and skill.operator_id = 28;

-- Keep the original in-game glyphs in sync with the selected Arcane form.
update public.operator_skills as skill
set raw_data = jsonb_set(
      skill.raw_data,
      '{attributeVariants}',
      (
        select jsonb_agg(
          jsonb_set(
            variant #- '{actionOverride,icon}',
            '{actionOverride,iconSmall}', to_jsonb(
              case variant ->> 'key'
                when 'will' then icon_paths.will_icon
                else icon_paths.int_icon
              end
            ), true
          ) order by ordinal
        )
        from jsonb_array_elements(skill.raw_data -> 'attributeVariants') with ordinality as entry(variant, ordinal)
      ),
      true
    ),
    updated_at = now()
from (
  values
    (2802, 'assets/operators/skills/arcane/jadecrushing-grid-int.png', 'assets/operators/skills/arcane/jadecrushing-grid-will.png'),
    (2803, 'assets/operators/skills/arcane/yinglung-stance-iv-int.png', 'assets/operators/skills/arcane/yinglung-stance-iv-will.png'),
    (2804, 'assets/operators/skills/arcane/gloompurge-int.png', 'assets/operators/skills/arcane/gloompurge-will.png')
) as icon_paths(skill_id, int_icon, will_icon)
where skill.id = icon_paths.skill_id
  and skill.operator_id = 28;

commit;

select id, name, raw_data -> 'attributeVariants' as attribute_variants
from public.operator_skills
where operator_id = 28
order by slot_index;
