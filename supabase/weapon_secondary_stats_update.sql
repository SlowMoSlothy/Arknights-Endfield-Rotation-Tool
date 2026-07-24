-- KORREKTUR: base_atk auf korrekte Level-90-Werte setzen (Quelle: Icy-Veins)
-- Außerdem: secondary_value und secondary_is_percent Spalten hinzufügen (falls noch nicht vorhanden)
-- Run in Supabase SQL Editor

alter table public.weapons add column if not exists secondary_value numeric;
alter table public.weapons add column if not exists secondary_is_percent boolean not null default false;

-- Korrekte Level-90 base_atk Werte (Quelle: icy-veins.com)
-- ★★★★★★ 6-Sterne Waffen
update public.weapons set base_atk = 510 where weapon_key = 'forgeborn_scathe';
update public.weapons set base_atk = 505 where weapon_key = 'artzy_tyrannical';
update public.weapons set base_atk = 505 where weapon_key = 'brigands_calling';
update public.weapons set base_atk = 500 where weapon_key = 'exemplar';
update public.weapons set base_atk = 500 where weapon_key = 'grand_vision';
update public.weapons set base_atk = 495 where weapon_key = 'former_finery';
update public.weapons set base_atk = 495 where weapon_key = 'rapid_ascent';
update public.weapons set base_atk = 495 where weapon_key = 'valiant';
update public.weapons set base_atk = 495 where weapon_key = 'thunderberge';
update public.weapons set base_atk = 490 where weapon_key = 'sundered_prince';
update public.weapons set base_atk = 490 where weapon_key = 'thermite_cutter';
update public.weapons set base_atk = 490 where weapon_key = 'umbral_torch';
update public.weapons set base_atk = 490 where weapon_key = 'flickers_in_the_mist';

-- ★★★★★ 5-Sterne Waffen
update public.weapons set base_atk = 411 where weapon_key = 'aspirant';
update public.weapons set base_atk = 411 where weapon_key = 'fortmaker';
update public.weapons set base_atk = 411 where weapon_key = 'obj_arts_identifier';
update public.weapons set base_atk = 411 where weapon_key = 'obj_edge_of_lightness';
update public.weapons set base_atk = 411 where weapon_key = 'obj_razorhorn';

-- ★★★★ 4-Sterne Waffen
update public.weapons set base_atk = 341 where weapon_key = 'howling_guard';
update public.weapons set base_atk = 341 where weapon_key = 'industry_01';
update public.weapons set base_atk = 341 where weapon_key = 'wave_tide';

-- HINWEIS: Die Essence-Substats (INT +156, ATK +39% etc.) werden jetzt direkt aus der
-- weapon_essence_profiles-Tabelle gelesen und müssen hier NICHT gesetzt werden.
-- secondary_value bleibt vorhanden aber wird nicht für die Anzeige verwendet.
