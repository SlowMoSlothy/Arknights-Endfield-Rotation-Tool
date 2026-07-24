-- Makes Arts Reactions directional: the newly applied Infliction determines
-- the reaction type. Run once in the Supabase SQL Editor.

begin;

insert into public.reaction_rules (
    reaction_key,
    game,
    name,
    requires_effects,
    applies_effect,
    reaction_effect,
    persists_for_combo,
    sort_order,
    raw_data
) values
    ('electrification', 'arknights_endfield', 'Electrification', array['heat_infliction', 'cryo_infliction', 'nature_infliction'], 'arts_reaction', 'electrification', false, 10, '{"id":"electrification","name":"Electrification","triggerEffect":"electric_infliction","requiresAny":["heat_infliction","cryo_infliction","nature_infliction"],"appliesEffect":"arts_reaction","reactionEffect":"electrification","persistsForCombo":false}'::jsonb),
    ('combustion', 'arknights_endfield', 'Combustion', array['electric_infliction', 'cryo_infliction', 'nature_infliction'], 'arts_reaction', 'combustion', false, 20, '{"id":"combustion","name":"Combustion","triggerEffect":"heat_infliction","requiresAny":["electric_infliction","cryo_infliction","nature_infliction"],"appliesEffect":"arts_reaction","reactionEffect":"combustion","persistsForCombo":false}'::jsonb),
    ('solidification', 'arknights_endfield', 'Solidification', array['electric_infliction', 'heat_infliction', 'nature_infliction'], 'arts_reaction', 'solidification', false, 30, '{"id":"solidification","name":"Solidification","triggerEffect":"cryo_infliction","requiresAny":["electric_infliction","heat_infliction","nature_infliction"],"appliesEffect":"arts_reaction","reactionEffect":"solidification","persistsForCombo":false}'::jsonb),
    ('corrosion', 'arknights_endfield', 'Corrosion', array['electric_infliction', 'heat_infliction', 'cryo_infliction'], 'arts_reaction', 'corrosion', false, 40, '{"id":"corrosion","name":"Corrosion","triggerEffect":"nature_infliction","requiresAny":["electric_infliction","heat_infliction","cryo_infliction"],"appliesEffect":"arts_reaction","reactionEffect":"corrosion","persistsForCombo":false}'::jsonb)
on conflict (reaction_key) do update set
    game = excluded.game,
    name = excluded.name,
    requires_effects = excluded.requires_effects,
    applies_effect = excluded.applies_effect,
    reaction_effect = excluded.reaction_effect,
    persists_for_combo = excluded.persists_for_combo,
    sort_order = excluded.sort_order,
    raw_data = excluded.raw_data,
    updated_at = now();

commit;
