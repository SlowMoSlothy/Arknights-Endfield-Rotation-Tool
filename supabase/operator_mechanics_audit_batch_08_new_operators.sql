begin;

-- Operator mechanics audit, batch 08: Arcane, Camille and Liino.
-- All operator-specific numbers, trigger conditions and attribute branches live here.
-- Liino is explicitly pre-release as of 2026-07-22; no unverified multiplier is invented.

insert into public.operators (
    id, game, slug, name, star, operator_class, element_type, weapon_type,
    icon_path, can_enter_ultimate_state, sort_order, raw_data
) values
(
    28, 'arknights_endfield', 'arcane', 'Arcane', 6, 'Caster', 'nature', 'Arts Unit',
    'assets/operators/avatars/Arcane.png', false, 28,
    '{
      "id":28,"name":"Arcane","star":6,"operatorClass":"Caster","elementType":"nature","weaponType":"Arts Unit",
      "icon":"assets/operators/avatars/Arcane.png","iconSourceUrl":"https://static.icy-veins.com/images/arknights-endfield/operators/arcane.png","mainAttribute":"Intellect","secondaryAttribute":"Will",
      "stats":{"level90":{"hp":5495,"attack":315,"strength":91,"agility":93,"intellect":176,"will":121}},
      "basicAttack":{"name":"Artillery Interdiction","sequences":[
        {"kind":"normal","sequenceIndex":1,"hitCount":1,"duration":1,"atkMultiplierTotal":0.42},
        {"kind":"normal","sequenceIndex":2,"hitCount":1,"duration":1,"atkMultiplierTotal":0.48},
        {"kind":"normal","sequenceIndex":3,"hitCount":1,"duration":1,"atkMultiplierTotal":0.75},
        {"kind":"normal","sequenceIndex":4,"hitCount":1,"duration":1,"atkMultiplierTotal":0.80},
        {"kind":"final_strike","sequenceIndex":5,"hitCount":1,"duration":1,"atkMultiplierTotal":1.06,"staggerMultiplier":0.17,"emits":["final_strike"],"endsCycle":true}
      ]},
      "dataStatus":"live","verified":true
    }'::jsonb
),
(
    29, 'arknights_endfield', 'camille', 'Camille', 6, 'Vanguard', 'heat', 'Polearm',
    'assets/operators/avatars/Camille.png', false, 29,
    '{
      "id":29,"name":"Camille","star":6,"operatorClass":"Vanguard","elementType":"heat","weaponType":"Polearm",
      "icon":"assets/operators/avatars/Camille.png","iconSourceUrl":"https://static.icy-veins.com/images/arknights-endfield/operators/camille.png","mainAttribute":"Agility","secondaryAttribute":"Intellect",
      "stats":{"level90":{"hp":5495,"attack":315,"strength":102.3,"agility":160.9,"intellect":129.2,"will":92}},
      "basicAttack":{"name":"Sanguine Absolution","sequences":[
        {"kind":"normal","sequenceIndex":1,"hitCount":1,"duration":1,"atkMultiplierTotal":0.56},
        {"kind":"normal","sequenceIndex":2,"hitCount":1,"duration":1,"atkMultiplierTotal":0.45},
        {"kind":"normal","sequenceIndex":3,"hitCount":1,"duration":1,"atkMultiplierTotal":0.68},
        {"kind":"normal","sequenceIndex":4,"hitCount":1,"duration":1,"atkMultiplierTotal":0.77},
        {"kind":"final_strike","sequenceIndex":5,"hitCount":1,"duration":1,"atkMultiplierTotal":1.13,"staggerMultiplier":0.18,"emits":["final_strike"],"endsCycle":true}
      ]},
      "dataStatus":"live","verified":true
    }'::jsonb
),
(
    30, 'arknights_endfield', 'liino', 'Liino', 6, 'Supporter', 'electric', 'Polearm',
    'assets/operators/avatars/Liino.png', false, 30,
    '{
      "id":30,"name":"Liino","star":6,"operatorClass":"Supporter","elementType":"electric","weaponType":"Polearm",
      "icon":"assets/operators/avatars/Liino.png","iconSourceUrl":"https://endfieldtools.dev/assets/images/endfield/charsplash/splash_chr_liino.png","dataStatus":"pre_release","releaseDate":"2026-08-09","verified":false,
      "sourceNote":"Public descriptions are available, but exact rank-12 multipliers and durations were not published as of 2026-07-22."
    }'::jsonb
)
on conflict (id) do update set
    game=excluded.game, slug=excluded.slug, name=excluded.name, star=excluded.star,
    operator_class=excluded.operator_class, element_type=excluded.element_type,
    weapon_type=excluded.weapon_type, icon_path=excluded.icon_path,
    can_enter_ultimate_state=excluded.can_enter_ultimate_state,
    sort_order=excluded.sort_order, raw_data=excluded.raw_data, updated_at=now();

delete from public.operator_skills where operator_id in (28, 29, 30);

insert into public.operator_skills (
    id, operator_id, slot_index, name, skill_type, short_type, cooldown, energy,
    element_type, icon_path, icon_small_path, description, combo_trigger,
    combo_trigger_mode, atk_multiplier, flat_damage, hit_count, damage_element,
    damage_verified, damage_source_url, raw_data
) values
-- Arcane
(2801,28,1,'Artillery Interdiction','Final Strike','FS',null,null,'nature','assets/operators/avatars/Arcane.png','assets/operators/skills/arcane/artillery-interdiction.png',
 'Performs Nature basic attacks. The finisher deals 900% ATK and the controlled Final Strike deals 17 Stagger.',null,null,9.00,0,1,'nature',true,
 'https://www.icy-veins.com/arknights-endfield/arcane-profile-skills',
 '{"skillRank":12,"damageMultiplier":900,"stagger":17,"debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}]}'::jsonb),
(2802,28,2,'Jadecrushing Grid','Battle Skill','BS',null,100,'nature','assets/operators/avatars/Arcane.png','assets/operators/skills/arcane/jadecrushing-grid.png',
 'Deals Nature DMG and applies Nature Infliction. Its damage and Pull behavior depend on whether Intellect or Will is higher.',null,null,5.00,0,1,'nature',true,
 'https://www.icy-veins.com/arknights-endfield/arcane-profile-skills',
 '{
   "skillRank":12,"sp_cost":100,"stagger":10,
   "damageProfile":{"atkMultiplier":5.0,"flatDamage":0,"hitCount":1,"element":"nature","verified":true},
   "debuffs":[{"id":"nature_infliction","name":"Nature Infliction","appliesEffect":"nature_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4}],
   "attributeVariants":[
     {"key":"intellect","label":"Intellect Stance","condition":{"leftStat":"intellect","comparison":"gte","rightStat":"will"},"actionOverride":{"damageMultiplier":500,"damageProfile":{"atkMultiplier":5.0}}},
     {"key":"will","label":"Will Stance","condition":{"leftStat":"will","comparison":"gt","rightStat":"intellect"},"actionOverride":{"damageMultiplier":300,"damageProfile":{"atkMultiplier":3.0},"debuffs":[{"id":"nature_infliction","name":"Nature Infliction","appliesEffect":"nature_infliction","persistsForCombo":true,"visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4},{"id":"pull","name":"Pull","appliesEffect":"pull","persistsForCombo":false,"visible":true}]}}
   ]
 }'::jsonb),
(2803,28,3,'Yinglung Stance IV','Combo Skill','CS',13,0,'nature','assets/operators/avatars/Arcane.png','assets/operators/skills/arcane/yinglung-stance-iv.png',
 'Attribute-dependent Combo Skill. Intellect and Will variants use different trigger sets and imprisonment durations.','Attribute-dependent Arts Infliction','all',0.80,0,1,'nature',true,
 'https://www.icy-veins.com/arknights-endfield/arcane-profile-skills',
 '{
   "skillRank":12,"damageProfile":{"atkMultiplier":0.8,"flatDamage":0,"hitCount":1,"element":"nature","verified":true},"stagger":5,"ultimateEnergyGain":10,"allowSelfTrigger":true,
   "comboTriggerMode":"any","comboTriggers":[{"effect":"nature_infliction","minStacks":1},{"effect":"heat_infliction","minStacks":2},{"effect":"cryo_infliction","minStacks":2},{"effect":"electric_infliction","minStacks":2}],
   "debuffs":[{"id":"imprisonment","name":"Imprisonment","appliesEffect":"imprisonment","durationSeconds":4,"persistsForCombo":false,"visible":true},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","valuePercent":4,"durationSeconds":4,"persistsForCombo":true,"visible":true}],
   "attributeVariants":[
     {"key":"intellect","condition":{"leftStat":"intellect","comparison":"gte","rightStat":"will"},"actionOverride":{"cooldown":13}},
     {"key":"will","condition":{"leftStat":"will","comparison":"gt","rightStat":"intellect"},"actionOverride":{"cooldown":19,"comboTriggerMode":"any","comboTriggers":[{"effect":"nature_infliction","minStacks":1},{"effect":"heat_infliction","minStacks":1},{"effect":"cryo_infliction","minStacks":1},{"effect":"electric_infliction","minStacks":1}],"debuffs":[{"id":"imprisonment","name":"Imprisonment","appliesEffect":"imprisonment","durationSeconds":6,"persistsForCombo":false,"visible":true},{"id":"arts_susceptibility","name":"Arts Susceptibility","appliesEffect":"arts_susceptibility","valuePercent":12,"durationSeconds":6,"persistsForCombo":true,"visible":true}]}}
   ]
 }'::jsonb),
(2804,28,4,'Gloompurge','Ultimate','Ult',20,100,'nature','assets/operators/avatars/Arcane.png','assets/operators/skills/arcane/gloompurge.png',
 'Creates Gloompurger Array for 20 seconds. Controlled Final Strikes or Finishers can trigger up to two Cluster Strikes; the second cast becomes Gloompurge Arcana.',null,null,1.80,0,1,'nature',true,
 'https://www.icy-veins.com/arknights-endfield/arcane-profile-skills',
 '{
   "skillRank":12,"damageProfile":{"atkMultiplier":1.8,"flatDamage":0,"hitCount":1,"element":"nature","verified":true},"stagger":10,
   "buffs":[{"id":"gloompurger_array","name":"Gloompurger Array","appliesEffect":"gloompurger_array","target":"team","durationSeconds":20,"visible":true,"persistsForCombo":false}],
   "clusterStrike":{"triggerEffects":["final_strike"],"maxTriggers":2,"damageProfile":{"atkMultiplier":3.6,"element":"nature","verified":true}},
   "attributeVariants":[
     {"key":"intellect","condition":{"leftStat":"intellect","comparison":"gte","rightStat":"will"},"actionOverride":{"secondCast":{"damageProfile":{"atkMultiplier":14.4,"element":"nature","verified":true},"debuffs":[{"id":"corrosion","name":"Corrosion","appliesEffect":"corrosion","durationSeconds":15,"visible":true,"persistsForCombo":true}],"buffs":[{"id":"gloompurge_arts_amp","name":"Gloompurge Arts Amp","appliesEffect":"gloompurge_arts_amp","target":"team","artsDamagePercent":24,"visible":true}]}}},
     {"key":"will","condition":{"leftStat":"will","comparison":"gt","rightStat":"intellect"},"actionOverride":{"secondCast":{"damageProfile":{"atkMultiplier":3.6,"element":"nature","verified":true},"duplicateCurrentArtsInfliction":true,"debuffs":[{"id":"nature_susceptibility","name":"Nature Susceptibility","appliesEffect":"nature_susceptibility","valuePercent":12.8,"durationSeconds":10,"visible":true,"persistsForCombo":true},{"id":"cryo_susceptibility","name":"Cryo Susceptibility","appliesEffect":"cryo_susceptibility","valuePercent":12.8,"durationSeconds":10,"visible":true,"persistsForCombo":true}]}}}
   ]
 }'::jsonb),
(900028,28,90,'Dive Attack','Dive Attack','DIVE',null,null,'nature','assets/operators/skills/shared/dive_attack.png','assets/operators/skills/shared/dive_attack.png',
 'Universal Level-12 Dive Attack.',null,null,1.80,0,1,'nature',true,'https://www.icy-veins.com/arknights-endfield/arcane-profile-skills',
 '{"skillRank":12,"isDiveAttack":true,"damageMultiplier":180,"damageProfile":{"atkMultiplier":1.8,"flatDamage":0,"hitCount":1,"element":"nature","verified":true}}'::jsonb),

-- Camille
(2901,29,1,'Sanguine Absolution','Final Strike','FS',null,null,'heat','assets/operators/avatars/Camille.png','assets/operators/skills/camille/sanguine-absolution.png',
 'Performs Heat basic attacks. The finisher deals 900% ATK and the controlled Final Strike deals 18 Stagger.',null,null,9.00,0,1,'heat',true,
 'https://www.icy-veins.com/arknights-endfield/camille-profile-skills','{"skillRank":12,"damageMultiplier":900,"stagger":18,"debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}]}'::jsonb),
(2902,29,2,'Blazing Exorcism','Battle Skill','BS',null,100,'heat','assets/operators/avatars/Camille.png','assets/operators/skills/camille/blazing-exorcism.png',
 'Deals Heat DMG, applies Heat Infliction and marks enemies with Firefang Vesperwings for 45 seconds.',null,null,2.00,0,1,'heat',true,
 'https://www.icy-veins.com/arknights-endfield/camille-profile-skills',
 '{"skillRank":12,"sp_cost":100,"damageProfile":{"atkMultiplier":2.0,"flatDamage":0,"hitCount":1,"element":"heat","verified":true},"stagger":10,"debuffs":[{"id":"heat_infliction","name":"Heat Infliction","appliesEffect":"heat_infliction","visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"persistsForCombo":true},{"id":"firefang_vesperwings","name":"Firefang Vesperwings","appliesEffect":"firefang_vesperwings","durationSeconds":45,"visible":true,"persistsForCombo":true},{"id":"weakness","name":"Weakness","appliesEffect":"weakness","valuePercent":7,"durationSeconds":45,"visible":true,"persistsForCombo":true},{"id":"heat_susceptibility","name":"Heat Susceptibility","appliesEffect":"heat_susceptibility","valuePercent":7,"durationSeconds":45,"visible":true,"persistsForCombo":true}]}'::jsonb),
(2903,29,3,'Heartstake Thorn','Combo Skill','CS',18,0,'heat','assets/operators/avatars/Camille.png','assets/operators/skills/camille/heartstake-thorn.png',
 'Triggers when Heat Infliction is consumed or absorbed. Hitting Firefang Vesperwings also creates a 100% delayed explosion.','Heat Infliction consumed or absorbed','any',3.00,0,1,'heat',true,
 'https://www.icy-veins.com/arknights-endfield/camille-profile-skills',
 '{"skillRank":12,"damageProfile":{"atkMultiplier":3.0,"flatDamage":0,"hitCount":1,"element":"heat","verified":true},"stagger":10,"spRecovery":{"amount":20,"source":"Heartstake Thorn"},"ultimateEnergyGain":10,"comboTriggerMode":"any","comboTriggers":[{"effect":"heat_infliction_consumed","minStacks":1},{"effect":"heat_infliction_absorbed","minStacks":1}],"allowSelfTrigger":true,"firefangExplosion":{"damageProfile":{"atkMultiplier":1.0,"element":"heat","verified":true}}}'::jsonb),
(2904,29,4,'Sanguine Downpour','Ultimate','Ult',20,130,'heat','assets/operators/avatars/Camille.png','assets/operators/skills/camille/sanguine-downpour.png',
 'Deals Heat DMG, applies Heat Infliction, recovers 40 SP, and transforms Blazing Exorcism into Hunter Pursuit for 15 seconds.',null,null,6.00,0,1,'heat',true,
 'https://www.icy-veins.com/arknights-endfield/camille-profile-skills',
 '{"skillRank":12,"damageProfile":{"atkMultiplier":6.0,"flatDamage":0,"hitCount":1,"element":"heat","verified":true},"stagger":15,"spRecovery":{"amount":40,"source":"Sanguine Downpour"},"debuffs":[{"id":"heat_infliction","name":"Heat Infliction","appliesEffect":"heat_infliction","visible":true,"stackable":true,"stacksApplied":1,"maxStacks":4,"persistsForCombo":true}]}'::jsonb),
(900029,29,90,'Dive Attack','Dive Attack','DIVE',null,null,'heat','assets/operators/skills/shared/dive_attack.png','assets/operators/skills/shared/dive_attack.png',
 'Universal Level-12 Dive Attack.',null,null,1.80,0,1,'heat',true,'https://www.icy-veins.com/arknights-endfield/camille-profile-skills',
 '{"skillRank":12,"isDiveAttack":true,"damageMultiplier":180,"damageProfile":{"atkMultiplier":1.8,"flatDamage":0,"hitCount":1,"element":"heat","verified":true}}'::jsonb),

-- Liino (pre-release: descriptive mechanics only)
(3001,30,1,'Starry Heart Throb','Final Strike','FS',null,null,'electric','assets/operators/avatars/Liino.png','assets/operators/skills/liino/starry-heart-throb.svg',
 'Liino basic and Final Strike action. Exact rank-12 values are not yet published.',null,null,null,0,1,'electric',false,'https://www.prydwen.gg/arknights-endfield/characters/liino','{"preRelease":true,"verified":false,"debuffs":[{"id":"final_strike","name":"Final Strike","appliesEffect":"final_strike","persistsForCombo":false,"visible":false}]}'::jsonb),
(3002,30,2,'Dazzling Focus','Battle Skill','BS',null,null,'electric','assets/operators/avatars/Liino.png','assets/operators/skills/liino/dazzling-focus.svg',
 'Deals Electric DMG and enters Vocalist Stance, buffing and healing nearby allies while periodically attacking. Exact values are pending release.',null,null,null,0,1,'electric',false,'https://www.prydwen.gg/arknights-endfield/characters/liino',
 '{"preRelease":true,"verified":false,"buffs":[{"id":"liino_vocalist_stance","name":"Vocalist Stance","appliesEffect":"liino_vocalist_stance","target":"team","visible":true,"persistsForCombo":true,"durationVerified":false}]}'::jsonb),
(3003,30,3,'Delightful Harmonics','Combo Skill','CS',null,0,'electric','assets/operators/avatars/Liino.png','assets/operators/skills/liino/delightful-harmonics.svg',
 'While Vocalist Stance is active, triggers when an Arts Reaction is applied or consumed. Exact values are pending release.','Vocalist Stance plus Arts Reaction','all',null,0,1,'electric',false,'https://www.prydwen.gg/arknights-endfield/characters/liino',
 '{"preRelease":true,"verified":false,"comboTriggerMode":"all","comboTriggers":[{"effect":"liino_vocalist_stance","minStacks":1},{"anyOf":[{"effect":"combustion","minStacks":1},{"effect":"corrosion","minStacks":1},{"effect":"electrification","minStacks":1},{"effect":"solidification","minStacks":1},{"effect":"arts_reaction","minStacks":1}]}],"allowSelfTrigger":true}'::jsonb),
(3004,30,4,'Dawnstar Concerto','Ultimate','Ult',null,null,'electric','assets/operators/avatars/Liino.png','assets/operators/skills/liino/dawnstar-concerto.svg',
 'Heals the team, enters Cosmovoice Stance, deals Electric DMG and forcibly applies Electrification. Exact values are pending release.',null,null,null,0,1,'electric',false,'https://www.prydwen.gg/arknights-endfield/characters/liino',
 '{"preRelease":true,"verified":false,"buffs":[{"id":"liino_cosmovoice_stance","name":"Cosmovoice Stance","appliesEffect":"liino_cosmovoice_stance","target":"team","visible":true,"persistsForCombo":false,"durationVerified":false}],"debuffs":[{"id":"electrification","name":"Electrification","appliesEffect":"electrification","visible":true,"persistsForCombo":true}]}'::jsonb),
(900030,30,90,'Dive Attack','Dive Attack','DIVE',null,null,'electric','assets/operators/skills/shared/dive_attack.png','assets/operators/skills/shared/dive_attack.png',
 'Pre-release Dive Attack placeholder; exact multiplier is pending release.',null,null,null,0,1,'electric',false,'https://endfieldtools.dev/characters/liino/',
 '{"preRelease":true,"verified":false,"isDiveAttack":true}'::jsonb)
on conflict (id) do update set
    operator_id=excluded.operator_id, slot_index=excluded.slot_index, name=excluded.name,
    skill_type=excluded.skill_type, short_type=excluded.short_type, cooldown=excluded.cooldown,
    energy=excluded.energy, element_type=excluded.element_type, icon_path=excluded.icon_path,
    icon_small_path=excluded.icon_small_path, description=excluded.description,
    combo_trigger=excluded.combo_trigger, combo_trigger_mode=excluded.combo_trigger_mode,
    atk_multiplier=excluded.atk_multiplier, flat_damage=excluded.flat_damage,
    hit_count=excluded.hit_count, damage_element=excluded.damage_element,
    damage_verified=excluded.damage_verified, damage_source_url=excluded.damage_source_url,
    raw_data=excluded.raw_data, updated_at=now();

-- Camille's Ultimate temporarily replaces the Battle Skill with the zero-SP Combo Skill Hunter Pursuit.
insert into public.operator_forms (
    game, form_key, operator_id, name, activation_skill_id, duration_seconds,
    priority, icon_path, visible, enabled, verified, source_url, source_note, raw_data
) values (
    'arknights_endfield','camille_hunter_pursuit',29,'Hunter Pursuit',2904,15,
    100,'assets/operators/avatars/Camille.png',true,true,true,
    'https://www.icy-veins.com/arknights-endfield/camille-profile-skills',
    'Sanguine Downpour changes Blazing Exorcism to Hunter Pursuit for 15 seconds.',
    '{"consumedOnFirstBattleSkill":true}'::jsonb
)
on conflict (game, operator_id, form_key) do update set
    name=excluded.name, activation_skill_id=excluded.activation_skill_id,
    duration_seconds=excluded.duration_seconds, priority=excluded.priority,
    icon_path=excluded.icon_path, visible=excluded.visible, enabled=excluded.enabled,
    verified=excluded.verified, source_url=excluded.source_url,
    source_note=excluded.source_note, raw_data=excluded.raw_data, updated_at=now();

insert into public.operator_form_action_variants (
    game, form_key, operator_id, action_key, action_override, priority,
    enabled, verified, source_url, source_note, raw_data
) values (
    'arknights_endfield','camille_hunter_pursuit',29,'skill:2902',
    '{
      "name":"Hunter Pursuit","type":"Combo Skill","shortType":"CS","sp_cost":0,"spCost":0,"energy":0,
      "damageMultiplier":500,"damageProfile":{"atkMultiplier":5.0,"flatDamage":0,"hitCount":1,"element":"heat","verified":true},
      "stagger":20,"spRecovery":{"amount":40,"source":"Hunter Pursuit"},"freeFormCast":true,
      "firstUsePerActivation":{"sp_cost":0,"spCost":0,"energy":0,"freeFormCast":true}
    }'::jsonb,
    100,true,true,'https://www.icy-veins.com/arknights-endfield/camille-profile-skills',
    'Hunter Pursuit is treated as a Combo Skill and costs no SP.','{}'::jsonb
)
on conflict (game, operator_id, form_key, action_key) do update set
    action_override=excluded.action_override, priority=excluded.priority,
    enabled=excluded.enabled, verified=excluded.verified,
    source_url=excluded.source_url, source_note=excluded.source_note,
    raw_data=excluded.raw_data, updated_at=now();

-- The 100% Firefang explosion is conditionally folded into Heartstake Thorn's damage.
insert into public.operator_passive_rules (
    game, rule_key, operator_id, name, rule_type, resolution_type,
    minimum_potential, conditions, trigger, effect, cooldown_seconds,
    priority, enabled, verified, source_url, source_note, raw_data
) values (
    'arknights_endfield','camille_firefang_vesperwings_explosion',29,'Firefang Vesperwings','talent','action_modifier',0,
    '{"skillIds":[2903],"enemyEffectsAny":["firefang_vesperwings"]}'::jsonb,'{}'::jsonb,
    '{"damageMultiplier":1.3333333333333333}'::jsonb,0,20,true,true,
    'https://www.icy-veins.com/arknights-endfield/camille-profile-skills',
    'Adds the verified 100% delayed explosion to the 300% Heartstake Thorn total while the mark is active.',
    '{"baseAtkMultiplier":3.0,"explosionAtkMultiplier":1.0}'::jsonb
)
on conflict (game, rule_key) do update set
    operator_id=excluded.operator_id, name=excluded.name, rule_type=excluded.rule_type,
    resolution_type=excluded.resolution_type, minimum_potential=excluded.minimum_potential,
    conditions=excluded.conditions, trigger=excluded.trigger, effect=excluded.effect,
    cooldown_seconds=excluded.cooldown_seconds, priority=excluded.priority,
    enabled=excluded.enabled, verified=excluded.verified, source_url=excluded.source_url,
    source_note=excluded.source_note, raw_data=excluded.raw_data, updated_at=now();

commit;

select o.id, o.name, o.raw_data->>'dataStatus' as data_status,
       count(s.id) as skills, count(s.id) filter (where s.damage_verified) as verified_damage_profiles
from public.operators o
left join public.operator_skills s on s.operator_id=o.id
where o.id in (28,29,30)
group by o.id, o.name, o.raw_data->>'dataStatus'
order by o.id;
