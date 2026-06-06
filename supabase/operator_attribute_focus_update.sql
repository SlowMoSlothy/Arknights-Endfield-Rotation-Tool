-- Operator main/secondary attribute update for Supabase.
-- Run after supabase/schema.sql and after importing operator rows.
--
-- Source basis:
-- - Current operators: Endfield Talos Wiki operator infoboxes.
-- - Mi Fu: Prydwen special-program summary confirms Main Attribute only;
--   Secondary Attribute was not published in the source used here.
--
-- Values are stored both as direct columns and in raw_data so existing
-- app code that reads raw_data.mainAttribute / raw_data.secondaryAttribute
-- can use the data before a dedicated mapper update.

begin;

alter table public.operators add column if not exists main_attribute text;
alter table public.operators add column if not exists secondary_attribute text;

with operator_attribute_source (
    slug,
    name,
    main_attribute,
    secondary_attribute,
    source_url,
    source_note
) as (
    values
        ('ardelia', 'Ardelia', 'Intellect', 'Will', 'https://endfield.wiki.gg/wiki/Ardelia', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('antal', 'Antal', 'Intellect', 'Strength', 'https://endfield.wiki.gg/wiki/Antal', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('alesh', 'Alesh', 'Strength', 'Intellect', 'https://endfield.wiki.gg/wiki/Alesh', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('chen_qianyu', 'Chen Qianyu', 'Agility', 'Strength', 'https://endfield.wiki.gg/wiki/Chen_Qianyu', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('catcher', 'Catcher', 'Strength', 'Will', 'https://endfield.wiki.gg/wiki/Catcher', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('da_pan', 'Da Pan', 'Strength', 'Will', 'https://endfield.wiki.gg/wiki/Da_Pan', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('ember', 'Ember', 'Strength', 'Will', 'https://endfield.wiki.gg/wiki/Ember', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('estella', 'Estella', 'Will', 'Strength', 'https://endfield.wiki.gg/wiki/Estella', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('fluorite', 'Fluorite', 'Agility', 'Intellect', 'https://endfield.wiki.gg/wiki/Fluorite', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('last_rite', 'Last Rite', 'Strength', 'Will', 'https://endfield.wiki.gg/wiki/Last_Rite', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('lifeng', 'Lifeng', 'Agility', 'Strength', 'https://endfield.wiki.gg/wiki/Lifeng', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('snowshine', 'Snowshine', 'Strength', 'Will', 'https://endfield.wiki.gg/wiki/Snowshine', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('wulfgard', 'Wulfgard', 'Strength', 'Agility', 'https://endfield.wiki.gg/wiki/Wulfgard', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('xaihi', 'Xaihi', 'Will', 'Intellect', 'https://endfield.wiki.gg/wiki/Xaihi', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('pogranichnik', 'Pogranichnik', 'Will', 'Agility', 'https://endfield.wiki.gg/wiki/Pogranichnik', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('zhuang', 'Zhuang', 'Will', 'Intellect', 'https://endfield.wiki.gg/wiki/Zhuang_Fangyi', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('avywenna', 'Avywenna', 'Will', 'Agility', 'https://endfield.wiki.gg/wiki/Avywenna', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('arclight', 'Arclight', 'Agility', 'Intellect', 'https://endfield.wiki.gg/wiki/Arclight', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('laevatain', 'Laevatain', 'Intellect', 'Strength', 'https://endfield.wiki.gg/wiki/Laevatain', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('akekuri', 'Akekuri', 'Agility', 'Intellect', 'https://endfield.wiki.gg/wiki/Akekuri', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('endministrator', 'Endministrator', 'Agility', 'Strength', 'https://endfield.wiki.gg/wiki/Endministrator', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('perlica', 'Perlica', 'Intellect', 'Will', 'https://endfield.wiki.gg/wiki/Perlica', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('rossi', 'Rossi', 'Agility', 'Intellect', 'https://endfield.wiki.gg/wiki/Rossi', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('tangtang', 'Tangtang', 'Agility', 'Strength', 'https://endfield.wiki.gg/wiki/Tangtang', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('gilberta', 'Gilberta', 'Will', 'Intellect', 'https://endfield.wiki.gg/wiki/Gilberta', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('yvonne', 'Yvonne', 'Intellect', 'Agility', 'https://endfield.wiki.gg/wiki/Yvonne', 'Endfield Talos Wiki operator infobox, checked 2026-06-03'),
        ('mi_fu', 'Mi Fu', 'Strength', null, 'https://blog.prydwen.gg/2026/05/22/arknights-endfield-special-program-sketches-of-lost-heirlooms-summary/', 'Prydwen special-program summary confirms Main Attribute only; Secondary Attribute not published in source, checked 2026-06-03')
)
update public.operators as op
set
    main_attribute = src.main_attribute,
    secondary_attribute = src.secondary_attribute,
    raw_data = jsonb_strip_nulls(
        coalesce(op.raw_data, '{}'::jsonb) ||
        jsonb_build_object(
            'mainAttribute', src.main_attribute,
            'secondaryAttribute', src.secondary_attribute,
            'attributeSourceUrl', src.source_url,
            'attributeSourceNote', src.source_note
        )
    ),
    updated_at = now()
from operator_attribute_source as src
where op.game = 'arknights_endfield'
  and op.slug = src.slug;

commit;

select
    slug,
    name,
    main_attribute,
    secondary_attribute
from public.operators
where game = 'arknights_endfield'
order by sort_order, name;
