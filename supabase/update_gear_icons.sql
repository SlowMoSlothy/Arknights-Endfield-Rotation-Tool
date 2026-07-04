-- Update script to set correct gear icon paths in the database for all 56 gear items.
begin;

update public.gear_items set icon = 'assets/gear/aic_light_gloves.png' where gear_key = 'aic_light_gloves';
update public.gear_items set icon = 'assets/gear/aic_light_armor.png' where gear_key = 'aic_light_armor';
update public.gear_items set icon = 'assets/gear/aic_light_kit.png' where gear_key = 'aic_light_kit';

update public.gear_items set icon = 'assets/gear/aic_heavy_gloves.png' where gear_key = 'aic_heavy_gloves';
update public.gear_items set icon = 'assets/gear/aic_heavy_armor.png' where gear_key = 'aic_heavy_armor';
update public.gear_items set icon = 'assets/gear/aic_heavy_kit.png' where gear_key = 'aic_heavy_kit';

update public.gear_items set icon = 'assets/gear/roving_msgr_gloves.png' where gear_key = 'roving_msgr_gloves';
update public.gear_items set icon = 'assets/gear/roving_msgr_armor.png' where gear_key = 'roving_msgr_armor';
update public.gear_items set icon = 'assets/gear/roving_msgr_kit.png' where gear_key = 'roving_msgr_kit';

update public.gear_items set icon = 'assets/gear/armored_msgr_gloves.png' where gear_key = 'armored_msgr_gloves';
update public.gear_items set icon = 'assets/gear/armored_msgr_armor.png' where gear_key = 'armored_msgr_armor';
update public.gear_items set icon = 'assets/gear/armored_msgr_kit.png' where gear_key = 'armored_msgr_kit';

update public.gear_items set icon = 'assets/gear/mordvolt_resistant_gloves.png' where gear_key = 'mordvolt_resistant_gloves';
update public.gear_items set icon = 'assets/gear/mordvolt_resistant_armor.png' where gear_key = 'mordvolt_resistant_armor';
update public.gear_items set icon = 'assets/gear/mordvolt_resistant_kit.png' where gear_key = 'mordvolt_resistant_kit';

update public.gear_items set icon = 'assets/gear/mordvolt_insulation_gloves.png' where gear_key = 'mordvolt_insulation_gloves';
update public.gear_items set icon = 'assets/gear/mordvolt_insulation_armor.png' where gear_key = 'mordvolt_insulation_armor';
update public.gear_items set icon = 'assets/gear/mordvolt_insulation_kit.png' where gear_key = 'mordvolt_insulation_kit';

update public.gear_items set icon = 'assets/gear/aburrey_legacy_gloves.png' where gear_key = 'aburrey_legacy_gloves';
update public.gear_items set icon = 'assets/gear/aburrey_legacy_armor.png' where gear_key = 'aburrey_legacy_armor';
update public.gear_items set icon = 'assets/gear/aburrey_legacy_kit.png' where gear_key = 'aburrey_legacy_kit';

update public.gear_items set icon = 'assets/gear/catastrophe_gloves.png' where gear_key = 'catastrophe_gloves';
update public.gear_items set icon = 'assets/gear/catastrophe_armor.png' where gear_key = 'catastrophe_armor';
update public.gear_items set icon = 'assets/gear/catastrophe_kit.png' where gear_key = 'catastrophe_kit';

update public.gear_items set icon = 'assets/gear/bonekrusha_armor.png' where gear_key = 'bonekrusha_armor';
update public.gear_items set icon = 'assets/gear/bonekrusha_kit.png' where gear_key = 'bonekrusha_kit';

update public.gear_items set icon = 'assets/gear/eternal_xiranite_gloves.png' where gear_key = 'eternal_xiranite_gloves';
update public.gear_items set icon = 'assets/gear/eternal_xiranite_armor.png' where gear_key = 'eternal_xiranite_armor';
update public.gear_items set icon = 'assets/gear/eternal_xiranite_kit.png' where gear_key = 'eternal_xiranite_kit';

update public.gear_items set icon = 'assets/gear/frontiers_gloves.png' where gear_key = 'frontiers_gloves';
update public.gear_items set icon = 'assets/gear/frontiers_armor.png' where gear_key = 'frontiers_armor';
update public.gear_items set icon = 'assets/gear/frontiers_kit.png' where gear_key = 'frontiers_kit';

update public.gear_items set icon = 'assets/gear/hot_work_gloves.png' where gear_key = 'hot_work_gloves';
update public.gear_items set icon = 'assets/gear/hot_work_armor.png' where gear_key = 'hot_work_armor';
update public.gear_items set icon = 'assets/gear/hot_work_kit.png' where gear_key = 'hot_work_kit';

update public.gear_items set icon = 'assets/gear/lynx_gloves.png' where gear_key = 'lynx_gloves';
update public.gear_items set icon = 'assets/gear/lynx_armor.png' where gear_key = 'lynx_armor';
update public.gear_items set icon = 'assets/gear/lynx_kit.png' where gear_key = 'lynx_kit';

update public.gear_items set icon = 'assets/gear/mi_security_gloves.png' where gear_key = 'mi_security_gloves';
update public.gear_items set icon = 'assets/gear/mi_security_armor.png' where gear_key = 'mi_security_armor';
update public.gear_items set icon = 'assets/gear/mi_security_kit.png' where gear_key = 'mi_security_kit';

update public.gear_items set icon = 'assets/gear/pulser_labs_gloves.png' where gear_key = 'pulser_labs_gloves';
update public.gear_items set icon = 'assets/gear/pulser_labs_armor.png' where gear_key = 'pulser_labs_armor';
update public.gear_items set icon = 'assets/gear/pulser_labs_kit.png' where gear_key = 'pulser_labs_kit';

update public.gear_items set icon = 'assets/gear/swordmancer_gloves.png' where gear_key = 'swordmancer_gloves';
update public.gear_items set icon = 'assets/gear/swordmancer_armor.png' where gear_key = 'swordmancer_armor';
update public.gear_items set icon = 'assets/gear/swordmancer_kit.png' where gear_key = 'swordmancer_kit';

update public.gear_items set icon = 'assets/gear/tide_surge_gloves.png' where gear_key = 'tide_surge_gloves';
update public.gear_items set icon = 'assets/gear/tide_surge_armor.png' where gear_key = 'tide_surge_armor';
update public.gear_items set icon = 'assets/gear/tide_surge_kit.png' where gear_key = 'tide_surge_kit';

update public.gear_items set icon = 'assets/gear/type_50_yinglung_gloves.png' where gear_key = 'type_50_yinglung_gloves';
update public.gear_items set icon = 'assets/gear/type_50_yinglung_armor.png' where gear_key = 'type_50_yinglung_armor';
update public.gear_items set icon = 'assets/gear/type_50_yinglung_kit.png' where gear_key = 'type_50_yinglung_kit';

update public.gear_items set icon = 'assets/gear/aethertech_gloves.png' where gear_key = 'aethertech_gloves';
update public.gear_items set icon = 'assets/gear/aethertech_armor.png' where gear_key = 'aethertech_armor';
update public.gear_items set icon = 'assets/gear/aethertech_kit.png' where gear_key = 'aethertech_kit';

commit;
