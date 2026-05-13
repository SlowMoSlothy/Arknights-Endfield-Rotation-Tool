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
    icon_path,
    can_enter_ultimate_state,
    sort_order
) values
    (12, 'arknights_endfield', 'ardelia', 'Ardelia', 6, 'Supporter', 'nature', 'assets/operators/avatars/Ardelia.png', false, 1),
    (8, 'arknights_endfield', 'antal', 'Antal', 4, 'Supporter', 'electric', 'assets/operators/avatars/Antal.png', false, 2),
    (10, 'arknights_endfield', 'alesh', 'Alesh', 5, 'Vanguard', 'physical', 'assets/operators/avatars/Alesh.png', false, 3),
    (14, 'arknights_endfield', 'chen_qianyu', 'Chen Qianyu', 5, 'Guard', 'physical', 'assets/operators/avatars/Chen.png', false, 4),
    (13, 'arknights_endfield', 'catcher', 'Catcher', 4, 'Defender', 'physical', 'assets/operators/avatars/Catcher.png', false, 5),
    (16, 'arknights_endfield', 'da_pan', 'Da Pan', 5, 'Striker', 'physical', 'assets/operators/avatars/Dapan.png', false, 6),
    (17, 'arknights_endfield', 'ember', 'Ember', 6, 'Defender', 'heat', 'assets/operators/avatars/Ember.png', false, 7),
    (18, 'arknights_endfield', 'estella', 'Estella', 4, 'Guard', 'cryo', 'assets/operators/avatars/Estella.png', false, 8),
    (19, 'arknights_endfield', 'fluorite', 'Fluorite', 4, 'Caster', 'nature', 'assets/operators/avatars/Fluorite.png', false, 9),
    (20, 'arknights_endfield', 'last_rite', 'Last Rite', 6, 'Striker', 'cryo', 'assets/operators/avatars/Last_Rite.png', false, 10),
    (21, 'arknights_endfield', 'lifeng', 'Lifeng', 6, 'Guard', 'physical', 'assets/operators/avatars/Lifeng.png', false, 11),
    (23, 'arknights_endfield', 'snowshine', 'Snowshine', 5, 'Defender', 'cryo', 'assets/operators/avatars/Snowshine.png', false, 12),
    (24, 'arknights_endfield', 'wulfgard', 'Wulfgard', 5, 'Caster', 'heat', 'assets/operators/avatars/Wulfgard.png', false, 13),
    (25, 'arknights_endfield', 'xaihi', 'Xaihi', 5, 'Supporter', 'cryo', 'assets/operators/avatars/Xaihi.png', false, 14),
    (22, 'arknights_endfield', 'pogranichnik', 'Pogranichnik', 6, 'Vanguard', 'physical', 'assets/operators/avatars/Pogranichnik.png', false, 15),
    (9, 'arknights_endfield', 'zhuang', 'Zhuang', 6, 'Striker', 'electric', 'assets/operators/avatars/Zhuang.png', true, 16),
    (7, 'arknights_endfield', 'avywenna', 'Avywenna', 5, 'Striker', 'electric', 'assets/operators/avatars/Avywenna.png', false, 17),
    (6, 'arknights_endfield', 'arclight', 'Arclight', 5, 'Vanguard', 'electric', 'assets/operators/avatars/Arclight.png', false, 18),
    (1, 'arknights_endfield', 'laevatain', 'Laevatain', 6, 'Striker', 'heat', 'assets/operators/avatars/Laevatain.png', false, 19),
    (2, 'arknights_endfield', 'akekuri', 'Akekuri', 4, 'Vanguard', 'heat', 'assets/operators/avatars/Akekuri.png', false, 20),
    (3, 'arknights_endfield', 'endministrator', 'Endministrator', 6, 'Guard', 'physical', 'assets/operators/avatars/Endmin.png', false, 21),
    (4, 'arknights_endfield', 'perlica', 'Perlica', 5, 'Caster', 'electric', 'assets/operators/avatars/Perlica.png', false, 22),
    (5, 'arknights_endfield', 'rossi', 'Rossi', 6, 'Guard', 'physical', 'assets/operators/avatars/Rossi.png', false, 23),
    (15, 'arknights_endfield', 'tangtang', 'Tangtang', 6, 'Caster', 'cryo', 'assets/operators/avatars/Tangtang.png', false, 24),
    (11, 'arknights_endfield', 'gilberta', 'Gilberta', 6, 'Supporter', 'nature', 'assets/operators/avatars/Gilberta.png', false, 25),
    (26, 'arknights_endfield', 'yvonne', 'Yvonne', 6, 'Caster', 'cryo', 'assets/operators/avatars/Yvonne.png', false, 26)
on conflict (id) do update set
    game = excluded.game,
    slug = excluded.slug,
    name = excluded.name,
    star = excluded.star,
    operator_class = excluded.operator_class,
    element_type = excluded.element_type,
    icon_path = excluded.icon_path,
    can_enter_ultimate_state = excluded.can_enter_ultimate_state,
    sort_order = excluded.sort_order,
    updated_at = now();

commit;
