-- Basic operator seed for Supabase.
-- This inserts only the operator rows. For skills + raw_data, run:
-- node tools/exportOperatorsForSupabase.js --stdout

begin;

insert into public.operators (
    id,
    game,
    slug,
    name,
    star,
    operator_class,
    element_type,
    weapon_type,
    icon_path,
    can_enter_ultimate_state,
    sort_order
) values
    (12, 'arknights_endfield', 'ardelia', 'Ardelia', 6, 'Supporter', 'nature', 'arts_unit', 'assets/operators/avatars/Ardelia.png', false, 1),
    (8, 'arknights_endfield', 'antal', 'Antal', 4, 'Supporter', 'electric', 'arts_unit', 'assets/operators/avatars/Antal.png', false, 2),
    (10, 'arknights_endfield', 'alesh', 'Alesh', 5, 'Vanguard', 'physical', 'sword', 'assets/operators/avatars/Alesh.png', false, 3),
    (14, 'arknights_endfield', 'chen_qianyu', 'Chen Qianyu', 5, 'Guard', 'physical', 'sword', 'assets/operators/avatars/Chen.png', false, 4),
    (13, 'arknights_endfield', 'catcher', 'Catcher', 4, 'Defender', 'physical', 'great_sword', 'assets/operators/avatars/Catcher.png', false, 5),
    (16, 'arknights_endfield', 'da_pan', 'Da Pan', 5, 'Striker', 'physical', 'great_sword', 'assets/operators/avatars/Dapan.png', false, 6),
    (17, 'arknights_endfield', 'ember', 'Ember', 6, 'Defender', 'heat', 'great_sword', 'assets/operators/avatars/Ember.png', false, 7),
    (18, 'arknights_endfield', 'estella', 'Estella', 4, 'Guard', 'cryo', 'polearm', 'assets/operators/avatars/Estella.png', false, 8),
    (19, 'arknights_endfield', 'fluorite', 'Fluorite', 4, 'Caster', 'nature', 'handcannon', 'assets/operators/avatars/Fluorite.png', false, 9),
    (20, 'arknights_endfield', 'last_rite', 'Last Rite', 6, 'Striker', 'cryo', 'great_sword', 'assets/operators/avatars/Last_Rite.png', false, 10),
    (21, 'arknights_endfield', 'lifeng', 'Lifeng', 6, 'Guard', 'physical', 'polearm', 'assets/operators/avatars/Lifeng.png', false, 11),
    (23, 'arknights_endfield', 'snowshine', 'Snowshine', 5, 'Defender', 'cryo', 'great_sword', 'assets/operators/avatars/Snowshine.png', false, 12),
    (24, 'arknights_endfield', 'wulfgard', 'Wulfgard', 5, 'Caster', 'heat', 'handcannon', 'assets/operators/avatars/Wulfgard.png', false, 13),
    (25, 'arknights_endfield', 'xaihi', 'Xaihi', 5, 'Supporter', 'cryo', 'arts_unit', 'assets/operators/avatars/Xaihi.png', false, 14),
    (22, 'arknights_endfield', 'pogranichnik', 'Pogranichnik', 6, 'Vanguard', 'physical', 'sword', 'assets/operators/avatars/Pogranichnik.png', false, 15),
    (9, 'arknights_endfield', 'zhuang', 'Zhuang', 6, 'Striker', 'electric', 'arts_unit', 'assets/operators/avatars/Zhuang.png', true, 16),
    (7, 'arknights_endfield', 'avywenna', 'Avywenna', 5, 'Striker', 'electric', 'polearm', 'assets/operators/avatars/Avywenna.png', false, 17),
    (6, 'arknights_endfield', 'arclight', 'Arclight', 5, 'Vanguard', 'electric', 'sword', 'assets/operators/avatars/Arclight.png', false, 18),
    (1, 'arknights_endfield', 'laevatain', 'Laevatain', 6, 'Striker', 'heat', 'sword', 'assets/operators/avatars/Laevatain.png', false, 19),
    (2, 'arknights_endfield', 'akekuri', 'Akekuri', 4, 'Vanguard', 'heat', 'sword', 'assets/operators/avatars/Akekuri.png', false, 20),
    (3, 'arknights_endfield', 'endministrator', 'Endministrator', 6, 'Guard', 'physical', 'sword', 'assets/operators/avatars/Endmin.png', false, 21),
    (4, 'arknights_endfield', 'perlica', 'Perlica', 5, 'Caster', 'electric', 'arts_unit', 'assets/operators/avatars/Perlica.png', false, 22),
    (5, 'arknights_endfield', 'rossi', 'Rossi', 6, 'Guard', 'physical', 'sword', 'assets/operators/avatars/Rossi.png', false, 23),
    (15, 'arknights_endfield', 'tangtang', 'Tangtang', 6, 'Caster', 'cryo', 'handcannon', 'assets/operators/avatars/Tangtang.png', false, 24),
    (11, 'arknights_endfield', 'gilberta', 'Gilberta', 6, 'Supporter', 'nature', 'arts_unit', 'assets/operators/avatars/Gilberta.png', false, 25),
    (26, 'arknights_endfield', 'yvonne', 'Yvonne', 6, 'Caster', 'cryo', 'handcannon', 'assets/operators/avatars/Yvonne.png', false, 26)
on conflict (id) do update set
    game = excluded.game,
    slug = excluded.slug,
    name = excluded.name,
    star = excluded.star,
    operator_class = excluded.operator_class,
    element_type = excluded.element_type,
    weapon_type = excluded.weapon_type,
    icon_path = excluded.icon_path,
    can_enter_ultimate_state = excluded.can_enter_ultimate_state,
    sort_order = excluded.sort_order,
    updated_at = now();

commit;
