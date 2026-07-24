begin;

-- Operator mechanics audit, batch 07B.
-- All operator-specific triggers, thresholds, chances and values are Supabase data.
alter table public.operator_passive_rules
    add column if not exists maximum_potential integer
    check (maximum_potential between 0 and 5);

insert into public.operator_passive_rules (
    game, rule_key, operator_id, name, rule_type, resolution_type,
    minimum_potential, maximum_potential, conditions, trigger, effect,
    cooldown_seconds, priority, enabled, verified, source_url, source_note
) values
-- Estella: Shatter arms a one-use Battle Skill SP refund.
('arknights_endfield','estella_commiseration_lv2',18,'Commiseration','talent','triggered_effect',0,null,
 '{}'::jsonb,'{"effects":["shatter"],"sourceOperatorOnly":true}'::jsonb,
 '{"actionOverride":{"damageProfile":null,"buffs":[{"id":"estella_commiseration_ready","name":"Commiseration","appliesEffect":"estella_commiseration_ready","target":"self","visible":true,"stackable":false,"stacksApplied":1,"maxStacks":1,"consumeOnSkillType":"battle_skill","consumeStacks":1,"onConsume":{"id":"estella_commiseration_sp","name":"Commiseration SP Refund","spRecovery":{"amount":15,"source":"Commiseration"},"damageProfile":null}}]}}'::jsonb,
 0,100,true,true,'https://www.icy-veins.com/arknights-endfield/estella-profile-skills','Talent level 2: after Estella triggers Shatter, her next Battle Skill returns 15 SP; cannot stack.'),
-- Estella P1 modifies the Combo Skill debuff entirely through data.
('arknights_endfield','estella_gallant_chivalry_p1',18,'Gallant Chivalry','potential','action_modifier',1,null,
 '{"skillIds":[1803]}'::jsonb,'{}'::jsonb,
 '{"effectAdjustments":{"physical_susceptibility":{"valuePercentDelta":5,"durationSecondsDelta":3}}}'::jsonb,
 0,101,true,true,'https://www.icy-veins.com/arknights-endfield/estella-profile-skills','Potential 1: Physical Susceptibility +5 percentage points and +3 seconds.'),
('arknights_endfield','estella_stand_your_ground_p5',18,'Stand Your Ground','potential','triggered_effect',5,null,
 '{}'::jsonb,'{"effects":["solidification"],"sourceOperatorOnly":true}'::jsonb,
 '{"actionOverride":{"damageProfile":null,"ultimateEnergyGain":5}}'::jsonb,
 1,102,true,true,'https://www.icy-veins.com/arknights-endfield/estella-profile-skills','Potential 5: applying Solidification grants 5 Ultimate Energy, once per second.'),

-- Laevatain: four Melting Flames grant Heat resistance ignore for 20 seconds.
('arknights_endfield','laevatain_scorching_heart_lv2',1,'Scorching Heart','talent','triggered_effect',0,null,
 '{}'::jsonb,'{"effects":["melting_flames"],"sourceOperatorOnly":true,"minimumEffectStacks":{"effect":"melting_flames","stacks":4}}'::jsonb,
 '{"actionOverride":{"damageProfile":null,"buffs":[{"id":"laevatain_scorching_heart","name":"Scorching Heart","appliesEffect":"laevatain_scorching_heart","target":"self","visible":true,"stackable":false,"durationSeconds":20,"resistanceReductionPercent":15,"elements":["heat"]}]}}'::jsonb,
 20,110,true,true,'https://www.icy-veins.com/arknights-endfield/laevatain-profile-skills','Talent level 2: at 4 Melting Flame stacks, Laevatain ignores 15 Heat Resistance for 20 seconds.'),
('arknights_endfield','laevatain_re_ignition_lv2',1,'Re-Ignition','talent','triggered_effect',0,null,
 '{}'::jsonb,'{"effects":["operator_attacked_below_40"],"controlledOperatorOnly":true}'::jsonb,
 '{"actionOverride":{"damageProfile":null,"buffs":[{"id":"laevatain_re_ignition","name":"Re-Ignition","appliesEffect":"laevatain_re_ignition","target":"self","visible":true,"durationSeconds":8,"protectionPercent":90}],"sustainProfile":{"verified":true,"protectionPercent":90,"treatments":[{"name":"Re-Ignition Regeneration","target":"self","maxHpMultiplier":0.05,"intervalSeconds":1,"durationSeconds":8,"tickCount":8}]}}}'::jsonb,
 120,111,true,true,'https://www.icy-veins.com/arknights-endfield/laevatain-profile-skills','Talent level 2: below 40% HP, 90% Protection and 5% max HP recovery per second for 8 seconds; 120-second cooldown.'),
('arknights_endfield','laevatain_fearless_blaze_p2',1,'Fearless Blaze','potential','action_modifier',2,null,
 '{"skillTypes":["normal","basic_attack"]}'::jsonb,'{}'::jsonb,
 '{"damageMultiplier":1.15}'::jsonb,0,112,true,true,'https://www.icy-veins.com/arknights-endfield/laevatain-profile-skills','Potential 2: Basic Attack damage +15%.'),

-- Alesh: Rare Fin is represented as deterministic expected value, with Intellect scaling.
('arknights_endfield','alesh_veteran_angler_lv2',10,'Veteran Angler','talent','action_modifier',0,null,
 '{"skillIds":[1003]}'::jsonb,'{}'::jsonb,
 '{"randomVariant":{"baseChancePercent":10,"chanceStatScaling":{"stat":"intellect","perPoints":10,"percentPerStep":0.5,"maxPercent":30,"rounding":"floor"},"baseAtkMultiplier":3.0,"variantAtkMultiplier":4.8,"baseSpRecovery":15,"variantBonusSpRecovery":10}}'::jsonb,
 0,120,true,true,'https://www.icy-veins.com/arknights-endfield/alesh-profile-skills','Combo Skill Rare Fin: 10% base chance; +0.5 percentage points per 10 Intellect, capped at +30. Simulator uses expected damage and SP.'),
('arknights_endfield','alesh_flash_frozen_lv2',10,'Flash-frozen','talent','triggered_effect',0,null,
 '{}'::jsonb,'{"effects":["solidification","originium_crystals"]}'::jsonb,
 '{"actionOverride":{"damageProfile":null,"ultimateEnergyGain":4}}'::jsonb,
 3,121,true,true,'https://www.icy-veins.com/arknights-endfield/alesh-profile-skills','Talent level 2: nearby Solidification or Originium Crystals grants 4 Ultimate Energy; 3-second cooldown.'),
('arknights_endfield','alesh_flash_frozen_self_lv2',10,'Flash-frozen: Self Solidification','talent','triggered_effect',0,null,
 '{}'::jsonb,'{"effects":["solidification"],"sourceOperatorOnly":true}'::jsonb,
 '{"actionOverride":{"damageProfile":null,"ultimateEnergyGain":8}}'::jsonb,
 3,122,true,true,'https://www.icy-veins.com/arknights-endfield/alesh-profile-skills','Additional 8 Ultimate Energy when the Solidification was applied by Alesh.'),
('arknights_endfield','alesh_fish_king_p1',10,'Fish King','potential','action_modifier',1,null,
 '{"skillIds":[1002]}'::jsonb,'{}'::jsonb,
 '{"spRecoveryFlatBonus":10}'::jsonb,0,123,true,true,'https://www.icy-veins.com/arknights-endfield/alesh-profile-skills','Potential 1: Battle Skill restores an additional 10 SP.'),

-- Mi Fu: deterministic talent and Potential rules.
('arknights_endfield','mi_fu_stern_crackdown_lv2',27,'Stern Crackdown','talent','action_modifier',0,null,
 '{"skillIds":[2706],"enemyEffectsAny":["physical_susceptibility","stagger"]}'::jsonb,'{}'::jsonb,
 '{"damageMultiplier":1.2}'::jsonb,0,130,true,true,'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills','Talent level 2: World Splitter deals 1.2x damage to targets with Physical Susceptibility or Stagger.'),
('arknights_endfield','mi_fu_vigilant_fury_lv2',27,'Vigilant Fury','talent','triggered_effect',0,2,
 '{}'::jsonb,'{"skillIds":[2703],"sourceOperatorOnly":true}'::jsonb,
 '{"actionOverride":{"damageProfile":null,"sustainProfile":{"verified":true,"shield":{"name":"Vigilant Fury","target":"self","maxHpMultiplier":0.30,"durationSeconds":10}}}}'::jsonb,
 60,131,true,true,'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills','Talent level 2: Combo Skill grants a 30% max-HP shield for 10 seconds; 60-second cooldown.'),
('arknights_endfield','mi_fu_complete_warmup_p3',27,'Complete Warmup','potential','triggered_effect',3,null,
 '{}'::jsonb,'{"skillIds":[2703],"sourceOperatorOnly":true}'::jsonb,
 '{"actionOverride":{"damageProfile":null,"buffs":[{"id":"mi_fu_complete_warmup","name":"Complete Warmup","appliesEffect":"mi_fu_complete_warmup","target":"self","visible":true,"durationSeconds":20,"atkPercent":6}],"sustainProfile":{"verified":true,"shield":{"name":"Vigilant Fury","target":"self","maxHpMultiplier":0.30,"durationSeconds":15}}}}'::jsonb,
 45,132,true,true,'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills','Potential 3 replaces the base shield rule: duration 15 seconds, cooldown 45 seconds, and +6% ATK for 20 seconds.'),
('arknights_endfield','mi_fu_restless_watch_p1',27,'Restless Watch','potential','action_modifier',1,null,
 '{"skillIds":[2703]}'::jsonb,'{}'::jsonb,
 '{"cooldownDeltaSeconds":-2,"effectAdjustments":{"physical_susceptibility":{"valuePercentDelta":5,"durationSecondsDelta":4}}}'::jsonb,
 0,133,true,true,'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills','Potential 1: Combo cooldown -2 seconds; Physical Susceptibility +5 percentage points and +4 seconds.'),
('arknights_endfield','mi_fu_qi_thrice_refined_p4',27,'Qi Thrice-Refined','potential','action_modifier',4,null,
 '{"skillIds":[2704]}'::jsonb,'{}'::jsonb,
 '{"ultimateEnergyCostMultiplier":0.85}'::jsonb,0,134,true,true,'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills','Potential 4: Ultimate Energy cost -15%.'),
('arknights_endfield','mi_fu_pugilist_stockade_bs_p5',27,'Pugilist of the Stockade','potential','action_modifier',5,null,
 '{"skillIds":[2702,2705,2706]}'::jsonb,'{}'::jsonb,
 '{"damageMultiplier":1.1}'::jsonb,0,135,true,true,'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills','Potential 5: all three Qingbo Triplex Battle Skill moves deal 1.1x damage.'),
('arknights_endfield','mi_fu_pugilist_stockade_ult_p5',27,'Pugilist of the Stockade','potential','action_modifier',5,null,
 '{"skillIds":[2704]}'::jsonb,'{}'::jsonb,
 '{"staggerBonus":5}'::jsonb,0,136,true,true,'https://www.icy-veins.com/arknights-endfield/mi-fu-profile-skills','Potential 5: Ultimate Stagger +5.')
on conflict (game, rule_key) do update set
    operator_id=excluded.operator_id, name=excluded.name, rule_type=excluded.rule_type,
    resolution_type=excluded.resolution_type, minimum_potential=excluded.minimum_potential,
    maximum_potential=excluded.maximum_potential, conditions=excluded.conditions,
    trigger=excluded.trigger, effect=excluded.effect, cooldown_seconds=excluded.cooldown_seconds,
    priority=excluded.priority, enabled=excluded.enabled, verified=excluded.verified,
    source_url=excluded.source_url, source_note=excluded.source_note, updated_at=now();

commit;

select rule_key, operator_id, rule_type, resolution_type, minimum_potential, maximum_potential, verified
from public.operator_passive_rules
where game='arknights_endfield' and priority between 100 and 136
order by priority, rule_key;
