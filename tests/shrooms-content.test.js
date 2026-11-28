import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { kaySkills, kayResources, miminoSkills, miminoResources } from '../tools/data/shrooms-rotation-profiles.js';
import { shroomsContent, buildShroomsContentSql } from '../tools/build-shrooms-content.js';
import { weaponImage, safeUrl } from '../tools/build-weapon-pages.js';

const skill = id => structuredClone([...kaySkills, ...miminoSkills].find(skill => skill.id === id));
function context() {
  const ctx = { console, window: { addEventListener() {} }, selectedTeam: [35, 36, 1],
    BUFF_REGISTRY: {}, DEBUFF_REGISTRY: {}, ARTS_REACTIONS: [], rotation: [],
    crypto: { randomUUID: () => 'test-uid' },
    operators: [{ id: 35, comboResources: kayResources, skills: structuredClone(kaySkills) },
      { id: 36, comboResources: miminoResources, skills: structuredClone(miminoSkills) }],
    getSkillById: skill
  };
  ctx.getOperatorBySkillId = id => ctx.operators.find(op => op.skills.some(skill => skill.id === id));
  vm.createContext(ctx);
  for (const file of ['data/buffRegistry.js', 'data/debuffRegistry.js', 'logic/reactionEngine.js',
    'logic/comboEngine.js', 'logic/inflictionEngine.js', 'logic/weaponPassiveEngine.js',
    'logic/weaponPassiveSimulation.js', 'ui/rotationGrid.js']) {
    vm.runInContext(fs.readFileSync(`endfield/js/${file}`, 'utf8'), ctx);
  }
  return ctx;
}
const trigger = (effect, time, order = 0) => ({ time, order, sourceOperatorId: 1,
  skillData: { id: 100, operatorId: 1, name: effect, type: 'Battle Skill',
    debuffs: [{ appliesEffect: effect, persistsForCombo: true, transientTrigger: true }] } });

test('version 1.7 includes 2 operators, 3 weapons and a reproducible guarded transaction', async () => {
  const data = await shroomsContent();
  assert.deepEqual(data.operators.map(row => row.name), ['Kay', 'Mimino']);
  assert.equal(data.operators[0].weapon_type, 'polearm');
  assert.equal(data.operators[0].raw_data.operatorCatalogImport.levels.length, 90);
  assert.equal(data.operators[0].raw_data.operatorCatalogDetails.potentials.find(row => row.level === 2).description,
    'Strength +20, Nature DMG Dealt +10%.');
  assert.deepEqual(data.weapons.map(row => row.base_atk), [500, 485, null]);
  assert.equal(data.weapons[2].secondary_value, null);
  assert.equal(data.profiles.length, 2);
  assert.equal(weaponImage(data.weapons[0]), '/endfield/assets/weapons/shrooms/sweet_deal.png');
  assert.equal(safeUrl('assets/weapons/../private.png', true), '');
  for (const profile of data.profiles) {
    assert.equal(profile.skill_descriptions.length, 9);
    assert.ok(profile.skill_descriptions.every(text => !/value unavailable|[{}]/.test(text)));
  }
  for (const row of data.skills) {
    assert.ok(fs.existsSync(`endfield/${row.icon_small_path}`));
    assert.equal(row.flat_damage, 0); assert.equal(row.hit_count, 1);
  }
  for (const row of data.skills.filter(row => row.operator_id === 36)) {
    assert.equal(row.atk_multiplier, null); assert.equal(row.cooldown, null);
    assert.equal(row.energy, null); assert.equal(row.damage_verified, false);
  }
  const sql = await buildShroomsContentSql();
  assert.equal(fs.readFileSync('supabase/content_update_2026_11_25.sql', 'utf8'), sql);
  assert.match(sql, /lock table public.operators, public.operator_skills, public.weapons/);
  assert.match(sql, /raise exception 'Weapon identity occupied/);
  assert.doesNotMatch(sql, /on conflict|delete from|update public\./i);
});

test('Kay needs a weapon and a fresh Infliction or Burst; exhausted weapons stay at zero', () => {
  const ctx = context(), state = ctx.createInitialComboResourceState();
  assert.equal(state.kay_weapons, 3);
  const effects = { ...state, nature_infliction: 1 };
  assert.equal(ctx.getComboSkillsFromEffects(effects, 1, { battle_skill: 1 }).length, 0);
  assert.equal(ctx.getComboSkillsFromEffects(effects, 1, { nature_infliction: 1 })[0].id, 3503);
  for (let i = 0; i < 3; i++) {
    const resolved = ctx.resolveComboResourceSkill(skill(3503), state);
    ctx.applyComboResourceUpdates(resolved, state);
    assert.equal(state.kay_weapons, 2 - i);
  }
  assert.equal(state.kay_dropped_weapons, 3);
  assert.equal(ctx.getComboSkillsFromEffects({ ...state, arts_burst: 1 }, 1).length, 0);
  assert.equal(ctx.resolveComboResourceSkill(skill(3503), state).comboResourceResolution.unavailable, true);
});

test('salvage restores weapons and builds stacks; Battle Skill consumes stacks and forces Combustion at three', () => {
  const ctx = context(), state = { ...ctx.createInitialComboResourceState(), kay_weapons: 0, kay_dropped_weapons: 3 };
  const pickup = ctx.resolveComboResourceSkill(skill(3505), state);
  ctx.applyComboResourceUpdates(pickup, state);
  assert.equal(state.kay_weapons, 1); assert.equal(state.kay_hot_edgy_naives, 1);
  const bash = ctx.resolveComboResourceSkill(skill(3502), state);
  assert.equal(bash.damageProfile.atkMultiplier, 6);
  assert.equal(bash.debuffs.find(effect => effect.id === 'combustion').durationSeconds, 5);
  ctx.applyComboResourceUpdates(bash, state);
  assert.equal(state.kay_weapons, 3); assert.equal(state.kay_dropped_weapons, 0);
  assert.equal(state.kay_hot_edgy_naives, 0);
  assert.equal(ctx.resolveComboResourceSkill(skill(3502), state).damageProfile.atkMultiplier, 3);
  assert.equal(ctx.resolveComboResourceSkill(skill(3505), state).comboResourceResolution.unavailable, true);
  assert.equal(skill(3502).damageProfile.atkMultiplier, 3);
});

test('Slot mode tracks Kay resources separately from enemy effects and forces Combustion only at three', () => {
  for (const count of [0, 1, 2, 3]) {
    const ctx = context(), resources = ctx.createInitialComboResourceState();
    const stacks = {}, meta = {}, buffs = {}, buffMeta = {};
    const resolve = id => {
      const resolved = ctx.resolveSlotModeSkillData(skill(id), stacks, resources);
      const active = ctx.applySkillDebuffsAndGetActiveState(resolved, {}, {}, stacks, meta, buffs, buffMeta);
      return { resolved, active };
    };
    for (let i = 0; i < count; i++) resolve(3503);
    const { resolved, active } = resolve(3502);
    assert.equal(resolved.comboResourceResolution.captured.hot, count);
    assert.equal(resolved.damageProfile.atkMultiplier, 3 + count);
    assert.equal(active.some(effect => effect.id === 'combustion'), count === 3);
    assert.equal(active.find(effect => effect.id === 'nature_infliction')?.currentStacks, 1);
    assert.equal(resources.kay_weapons, 3);
    assert.equal(resources.kay_dropped_weapons, 0);
    assert.equal(resources.kay_hot_edgy_naives, 0);
    assert.equal(Object.keys(stacks).some(key => key.startsWith('kay_')), false);
    assert.equal(resolve(3502).resolved.debuffs.some(effect => effect.id === 'combustion'), false,
      'The next Bash cannot reuse the consumed stacks');
  }
});

test('Slot mode includes explicit pickups and does not grant a stack for an unavailable pickup', () => {
  const ctx = context(), resources = ctx.createInitialComboResourceState();
  for (const id of [3505, 3503, 3505, 3505, 3503, 3503]) {
    ctx.resolveSlotModeSkillData(skill(id), {}, resources);
  }
  assert.equal(resources.kay_hot_edgy_naives, 1);
  assert.equal(resources.kay_dropped_weapons, 2);
  const bash = ctx.resolveSlotModeSkillData(skill(3502), {}, resources);
  assert.equal(bash.comboResourceResolution.captured.hot, 3);
  assert.equal(bash.debuffs.find(effect => effect.id === 'combustion')?.durationSeconds, 5);
  assert.equal(resources.kay_hot_edgy_naives, 0);
  assert.equal(skill(3502).debuffs.some(effect => effect.id === 'combustion'), false);
});

test('the rendered Slot rotation shows Kay Combustion after salvaging three Weapons, including on redraw', () => {
  const ctx = context(), trays = [];
  const node = () => ({ classList: { add() {}, remove() {} }, dataset: {},
    appendChild() {}, setAttribute() {}, addEventListener() {} });
  ctx.document = { getElementById: () => node(), createElement: node, documentElement: node() };
  for (const name of ['removeBasicAttackEntriesFromRotation', 'initRotationDragDrop', 'initTapInput',
    'renderEnemyEffects', 'renderOperatorBuffs', 'updateRotationActionStates']) ctx[name] = () => {};
  ctx.isSimulationTimelineMode = () => false;
  ctx.getTimelineBasicAttackData = () => ({});
  ctx.getTimelineSecondsPerSlot = () => 1;
  ctx.createRotationTimelineStep = () => ({ step: node(), skillSlot: node() });
  ctx.createRotationTimelineConnector = node;
  ctx.createEffectTray = (effects, kind) => {
    if (kind === 'debuff') trays.push(Array.from(effects, effect => effect.id));
    return null;
  };
  ctx.rotation = [3503, 3503, 3503, 3502].map(id => ({ id }));
  for (let i = 0; i < 2; i++) {
    trays.length = 0;
    ctx.renderRotation();
    assert.equal(trays.length, 4);
    assert.equal(trays.slice(0, 3).some(ids => ids.includes('combustion')), false);
    assert.ok(trays[3].includes('combustion'));
    assert.ok(trays[3].includes('nature_infliction'));
  }
  ctx.rotation.splice(0, 1);
  trays.length = 0;
  ctx.renderRotation();
  assert.equal(trays.length, 3);
  assert.equal(trays[2].includes('combustion'), false, 'Deleting a throw must recalculate the Bash outcome');
});

test('Simulation retains forced Combustion for five seconds without requiring Heat Infliction', () => {
  const ctx = context();
  const neutral = { id: 101, operatorId: 1, type: 'Battle Skill' };
  const events = [3503, 3503, 3503, 3502, 3502].map((id, index) => ({
    kind: 'manual', time: index * 6, order: index, sourceOperatorId: 35, skillData: skill(id)
  }));
  events.splice(4, 0, ...[22.9, 23].map(time => ({
    kind: 'manual', time, order: 0, sourceOperatorId: 1, skillData: neutral
  })));
  const resolved = ctx.enrichSimulationSkillEventsWithEffects(events);
  const bash = resolved.find(event => event.time === 18);
  assert.equal(bash.skillData.comboResourceResolution.captured.hot, 3);
  assert.equal(bash.skillData.comboResourceResolution.after.kay_hot_edgy_naives, 0);
  assert.equal(bash.activeDebuffs.find(effect => effect.id === 'combustion')?.durationSeconds, 5);
  assert.ok(bash.activeDebuffs.some(effect => effect.id === 'nature_infliction'));
  assert.ok(resolved.find(event => event.time === 22.9).activeDebuffs.some(effect => effect.id === 'combustion'));
  assert.equal(resolved.find(event => event.time === 23).activeDebuffs.some(effect => effect.id === 'combustion'), false);
  assert.equal(resolved.find(event => event.time === 24).skillData.debuffs.some(effect => effect.id === 'combustion'), false);
});

test('automatic timeline enforces six-second cooldown, weapon exhaustion and manual recovery', () => {
  const ctx = context();
  const events = [0, 1, 6, 12, 18].map(time => trigger('nature_infliction', time));
  events.push({ time: 20, order: 0, sourceOperatorId: 35, skillData: skill(3502) });
  const auto = ctx.collectSimulationFinalStrikeComboSkills(1, [], events).filter(event => event.kind === 'auto');
  assert.deepEqual(Array.from(auto, event => event.time), [0, 6, 12, 20]);
  assert.deepEqual(Array.from(auto, event => event.skillData.comboResourceResolution.after.kay_weapons), [2, 1, 0, 2]);
});

test('Slot mode inserts Kay automatically and retains weapon spending without reacting to stale Infliction', () => {
  const ctx = context(), nature = trigger('nature_infliction', 0).skillData;
  const neutral = { id: 101, operatorId: 1, type: 'Battle Skill' };
  ctx.operators.push({ id: 1, skills: [nature, neutral] });
  ctx.getSkillById = id => [...ctx.operators.flatMap(operator => operator.skills)].find(skill => skill.id === id);
  ctx.rotation = [{ id: nature.id }];
  ctx.insertComboChain(nature.id, 0);
  assert.equal(ctx.rotation[1].id, 3503); assert.equal(ctx.rotation[1].autoInserted, true);
  assert.equal(ctx.collectPersistentEffectsFromRotationUpToIndex(1).kay_weapons, 2);
  ctx.rotation.push(...Array.from({ length: 6 }, () => ({ id: neutral.id })));
  const length = ctx.rotation.length;
  ctx.insertComboChain(neutral.id, length - 1);
  assert.equal(ctx.rotation.length, length);
});

test('Mimino needs the attached device and a new matching status, consumes the device and self-triggers on Ultimate', () => {
  const ctx = context(); ctx.selectedTeam = [36, 1];
  for (const effect of ['lift', 'knock_down', 'solidification', 'immobilization', 'immobilize']) {
    assert.equal(ctx.getComboSkillsFromEffects({ [effect]: 1, mimino_device: 0 }, 1).length, 0);
    assert.equal(ctx.getComboSkillsFromEffects({ [effect]: 1, mimino_device: 1 }, 1, { battle_skill: 1 }).length, 0);
    assert.equal(ctx.getComboSkillsFromEffects({ [effect]: 1, mimino_device: 1 }, 1, { [effect]: 1 })[0].id, 3603);
  }
  const events = [{ time: 0, order: 0, sourceOperatorId: 36, skillData: skill(3602) },
    { time: 1, order: 0, sourceOperatorId: 36, skillData: skill(3604) }, trigger('lift', 5)];
  const auto = ctx.collectSimulationFinalStrikeComboSkills(1, [], events).filter(event => event.kind === 'auto');
  assert.equal(auto.length, 1); assert.equal(auto[0].skillData.id, 3603);
  assert.equal(auto[0].skillData.comboResourceResolution.after.mimino_device, 0);
  const detonated = ctx.resolveComboResourceSkill(skill(3605), { mimino_device: 0 });
  assert.equal(detonated.debuffs.length, 0);
});

test('Kay forced Nature Burst deals an extra burst without applying or requiring Infliction', () => {
  const ctx = context();
  vm.runInContext('INFLICTION_MECHANICS.nature_infliction = {element:"nature",maxStacks:4,burstKey:"nature_burst",burstAtkMultiplier:1.6,burstHitCount:1}', ctx);
  const events = ctx.enrichSimulationEventsWithInflictionBursts([{ time: 0, sourceOperatorId: 35, skillData: skill(3503), activeDebuffsBefore: [] }]);
  assert.equal(events.length, 2); assert.equal(events[1].kind, 'arts-burst');
  assert.equal(events[1].skillData.damageProfile.atkMultiplier, 1.6);
  assert.equal(events[1].inflictionBurst.burstKey, 'nature_burst');
  assert.equal(ctx.collectEffectsFromSkill(skill(3503), { kay_weapons: 3 }).nature_infliction, undefined);
});

test('new weapon passives use all nine ranks and require actual SP recovery or the correct Burst', () => {
  const ctx = context();
  assert.equal(ctx.getWeaponPassiveStaticBonuses('sweet_deal', 9).ultimateGainEfficiencyPercent, 50.4);
  assert.equal(ctx.getWeaponPassiveStaticBonuses('raid_comet', 9).elementDamageBonuses.nature, 19.6);
  const options = { skillTriggerType: 'combo_skill', appliedEffectKeys: ['arts_burst', 'nature_burst'] };
  assert.equal(ctx.getWeaponPassiveTriggerEffects('sweet_deal', 9, 'sp_recovery', options)[0].atkPercent, 5.6);
  assert.equal(ctx.getWeaponPassiveTriggerEffects('sweet_deal', 9, 'sp_recovery', {}) .length, 0);
  assert.equal(ctx.getWeaponPassiveTriggerEffects('raid_comet', 9, 'effect_applied', options)[0].elementDamageBonuses.nature, 33.6);
  assert.equal(ctx.getWeaponPassiveTriggerEffects('raid_comet', 9, 'effect_applied', { appliedEffectKeys: ['cryo_burst'] }).length, 0);
  const actual = ctx.getSimulationWeaponPassiveTriggerContext({ skillData: skill(3503), sourceOperatorId: 35 });
  assert.ok(actual.appliedEffectKeys.includes('nature_burst'));
});

test('Sweet Deal SP stacks have independent expiry and a 0.1-second trigger interval', () => {
  const ctx = context(); ctx.selectedTeam = [35];
  ctx.getOperatorSimulationLoadoutStats = id => ({ operatorId: id, weaponKey: 'sweet_deal',
    weaponName: 'Sweet Deal', totalAtk: 100, passive: { name: 'Sweetening Function', rank: 9 } });
  const events = [0, 0.05, 0.1, 1].map(time => ({ time, sourceOperatorId: 35, skillData: skill(3503),
    spRecoveryState: { applied: 12 } }));
  const resolved = ctx.enrichSimulationSkillEventsWithWeaponPassives(events, [], 35, 40);
  const atkEffects = resolved.atkSource.effectHistory.filter(effect => effect.atkPercent > 0);
  assert.equal(atkEffects.length, 3);
  assert.deepEqual(Array.from(atkEffects, effect => effect.startedAt), [0, 0.1, 1]);
  assert.deepEqual(Array.from(atkEffects, effect => effect.expiresAt), [30, 30.1, 31]);
});
