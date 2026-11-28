import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const fixture = JSON.parse(fs.readFileSync('tests/fixtures/slot-conditional-effects.json', 'utf8'));
function context() {
  const ctx = vm.createContext({ console, crypto: { randomUUID: () => 'test-uid' },
    window: { addEventListener() {} }, ARTS_REACTIONS: [],
    selectedTeam: fixture.operators.map(operator => operator.id), rotation: [],
    operators: structuredClone(fixture.operators).map(operator => ({ ...operator,
      skills: structuredClone(fixture.skills.filter(skill => skill.operatorId === operator.id)) })) });
  for (const file of ['data/buffRegistry.js', 'data/debuffRegistry.js', 'logic/reactionEngine.js',
    'logic/comboEngine.js', 'logic/inflictionEngine.js', 'logic/battlefieldResourceEngine.js', 'ui/rotationGrid.js']) {
    vm.runInContext(fs.readFileSync(`endfield/js/${file}`, 'utf8'), ctx);
  }
  ctx.registryRows = fixture.buffs;
  vm.runInContext('registryRows.forEach(row => BUFF_REGISTRY[row.id] = row)', ctx);
  ctx.skills = new Map(fixture.skills.map(skill => [skill.id, structuredClone(skill)]));
  ctx.getSkillById = id => ctx.skills.get(id);
  ctx.getOperatorBySkillId = id => ctx.operators.find(operator => operator.id === ctx.skills.get(id)?.operatorId);
  const node = () => ({ classList: { add() {}, remove() {} }, dataset: {},
    appendChild() {}, setAttribute() {}, addEventListener() {} });
  ctx.document = { getElementById: node, createElement: node, documentElement: node() };
  for (const name of ['removeBasicAttackEntriesFromRotation', 'initRotationDragDrop', 'initTapInput',
    'renderEnemyEffects', 'renderOperatorBuffs', 'updateRotationActionStates']) ctx[name] = () => {};
  ctx.isSimulationTimelineMode = () => false;
  ctx.getTimelineBasicAttackData = () => ({});
  ctx.getTimelineSecondsPerSlot = () => 1;
  ctx.createRotationTimelineConnector = node;
  ctx.createRotationTimelineStep = () => {
    ctx.trays.push({ buff: [], debuff: [] });
    return { step: node(), skillSlot: node() };
  };
  ctx.createEffectTray = (effects, kind) => {
    ctx.trays.at(-1)[kind] = Array.from(effects, effect => ({ ...effect }));
    return null;
  };
  const resolve = ctx.resolveSlotModeSkillData;
  ctx.resolveSlotModeSkillData = (...args) => {
    const resolved = resolve(...args);
    ctx.resolved.push(resolved);
    return resolved;
  };
  return ctx;
}
const effect = (id, stacks = 1) => ({ id, appliesEffect: id, visible: true, persistsForCombo: true,
  stackable: true, maxStacks: 10, stacksApplied: stacks });
function seed(ctx, debuffs = {}, buffs = {}) {
  const id = 999991;
  ctx.skills.set(id, { id, operatorId: 1, type: 'Battle Skill',
    debuffs: Object.entries(debuffs).map(([key, stacks]) => effect(key, stacks)),
    buffs: Object.entries(buffs).map(([key, stacks]) => effect(key, stacks)) });
  return id;
}
function render(ctx, ids) {
  ctx.trays = []; ctx.resolved = [];
  ctx.rotation = ids.map(id => ({ id }));
  ctx.renderRotation();
  return ctx.trays;
}
const count = (tray, key, kind = 'debuff') => tray[kind].find(effect => effect.id === key)?.currentStacks || 0;
function simulate(ctx, ids) {
  return ctx.enrichSimulationSkillEventsWithEffects(ids.map((id, index) => ({
    kind: 'manual', time: index / 10, order: index, sourceOperatorId: ctx.skills.get(id).operatorId,
    skillData: ctx.skills.get(id)
  })));
}

test('Wulfgard consumes the prior reaction without incorrectly adding Heat Infliction in Slot and Simulation', () => {
  for (const reaction of [null, 'combustion', 'electrification']) {
    const ctx = context(), start = seed(ctx, reaction ? { [reaction]: 1 } : {});
    const trays = render(ctx, [start, 2402]);
    assert.equal(count(trays[1], 'heat_infliction'), reaction ? 0 : 1, reaction);
    if (reaction) assert.equal(count(trays[1], reaction), 0);
    const event = simulate(ctx, [start, 2402]).at(-1);
    assert.equal(event.activeDebuffs.some(effect => effect.id === 'heat_infliction'), !reaction, reaction);
    const combo = reaction ? { [reaction]: 1 } : {};
    ctx.applySkillEffectsToComboMap(ctx.skills.get(2402), combo);
    assert.equal(Number(combo.heat_infliction || 0), reaction ? 0 : 1);
  }
});

test('Lifeng checks Vulnerability before applying his new stack in Slot and combo detection', () => {
  for (const stacks of [0, 1, 4]) {
    const ctx = context(), start = seed(ctx, stacks ? { vulnerable: stacks } : {});
    const trays = render(ctx, [start, 2102]);
    assert.equal(count(trays[1], 'physical_susceptibility'), stacks ? 0 : 1);
    assert.equal(count(trays[1], 'vulnerable'), Math.min(4, stacks + 1));
    const combo = stacks ? { vulnerable: stacks } : {};
    ctx.applySkillEffectsToComboMap(ctx.skills.get(2102), combo);
    assert.equal(Number(combo.physical_susceptibility || 0), stacks ? 0 : 1);
  }
});

test('Laevatain replaces the normal effects only at four Melting Flames, and spends them once', () => {
  for (const stacks of [0, 3, 4]) {
    const ctx = context(), start = seed(ctx, {}, { melting_flames: stacks });
    // Omit the zero-stack seed effect, whose stacksApplied defaults to one.
    if (!stacks) ctx.skills.get(start).buffs = [];
    const trays = render(ctx, [start, 102]);
    assert.equal(count(trays[1], 'combustion'), stacks === 4 ? 1 : 0);
    assert.equal(count(trays[1], 'heat_infliction'), stacks === 4 ? 0 : 1);
    assert.equal(count(trays[1], 'melting_flames', 'buff'), stacks === 4 ? 0 : stacks + 1);
    const combo = { melting_flames: stacks };
    ctx.applySkillEffectsToComboMap(ctx.skills.get(102), combo);
    assert.equal(Number(combo.combustion || 0), stacks === 4 ? 1 : 0);
    assert.equal(Number(combo.heat_infliction || 0), stacks === 4 ? 0 : 1);
    assert.equal(Number(combo.melting_flames || 0), stacks === 4 ? 0 : stacks + 1);
    ctx.rotation = [start, 102].map(id => ({ id }));
    const persistent = ctx.collectPersistentEffectsFromRotationUpToIndex(1);
    assert.equal(Number(persistent.melting_flames || 0), stacks === 4 ? 0 : stacks + 1);
  }
});

test('Last Rite applies conditional Cryo Infliction on the final strike that consumes Hypothermic Perfusion', () => {
  const ctx = context(), start = seed(ctx, {}, { hypothermic_perfusion: 1 });
  const trays = render(ctx, [2001, start, 2001, 2001]);
  assert.equal(count(trays[0], 'cryo_infliction'), 0);
  assert.equal(count(trays[2], 'cryo_infliction'), 1);
  assert.equal(count(trays[2], 'hypothermic_perfusion', 'buff'), 0);
  assert.equal(count(trays[3], 'cryo_infliction'), 1);
});

test('Laevatain retains the consumed-stack state when rebuilding Combo chains', () => {
  const ctx = context(), start = seed(ctx, {}, { melting_flames: 4 });
  ctx.selectedTeam = [1];
  ctx.rotation = [start, 102].map(id => ({ id }));
  ctx.insertComboChain(102, 1);
  assert.equal(Number(ctx.collectPersistentEffectsFromRotationUpToIndex(1).melting_flames || 0), 0);
  ctx.rotation.push({ id: 103 });
  const state = ctx.collectPersistentEffectsFromRotationUpToIndex(2);
  assert.equal(state.melting_flames, 1, 'Seethe grants one new stack after Bash consumed four');
  assert.equal(state.combustion, 1);
  assert.equal(state.heat_infliction, undefined);
});

test('Xaihi Crystal charges disappear after exactly two Final Strikes', () => {
  const ctx = context();
  const trays = render(ctx, [2502, 101, 101, 101]);
  assert.deepEqual(trays.map(tray => count(tray, 'auxiliary_crystal', 'buff')), [2, 1, 0, 0]);
});

test('Lifeng Link persists on Final Strike and is fully consumed by Battle Skill', () => {
  const ctx = context(), start = seed(ctx, {}, { link: 4 });
  const trays = render(ctx, [start, 101, 2102]);
  assert.equal(count(trays[1], 'link', 'buff'), 4);
  assert.equal(count(trays[2], 'link', 'buff'), 0);
});

test('conditions combine buff thresholds with the target state before consumption', () => {
  for (const stacks of [1, 2]) for (const marked of [false, true]) {
    const ctx = context(), start = seed(ctx, marked ? { focus: 1 } : {}, { atk_up: stacks });
    ctx.skills.set(999992, { id: 999992, operatorId: 1, type: 'Battle Skill',
      consumeDebuffs: ['focus'], debuffs: [effect('heat_infliction')],
      conditionalDebuffs: [{ requiresBuffStacks: { buff: 'atk_up', minStacks: 2 },
        requiresEffect: 'focus', skipNormalDebuffs: true, debuffs: [effect('combustion')] }] });
    const tray = render(ctx, [start, 999992])[1], matches = marked && stacks >= 2;
    assert.equal(count(tray, 'combustion'), matches ? 1 : 0);
    assert.equal(count(tray, 'heat_infliction'), matches ? 0 : 1);
    const state = { atk_up: stacks, ...(marked ? { focus: 1 } : {}) };
    ctx.applySkillEffectsToComboMap(ctx.skills.get(999992), state);
    assert.equal(Number(state.combustion || 0), matches ? 1 : 0);
    assert.equal(Number(state.heat_infliction || 0), matches ? 0 : 1);
  }
});

test('Fluorite adds only matching Cryo or Nature Infliction at the two-stack threshold', () => {
  for (const id of [1903, 1904]) for (const key of ['cryo_infliction', 'nature_infliction']) {
    for (const stacks of [1, 2, 4]) {
      const ctx = context(), start = seed(ctx, { [key]: stacks });
      const trays = render(ctx, [start, id]);
      assert.equal(count(trays[1], key), stacks < 2 ? stacks : Math.min(4, stacks + 1));
      assert.equal(count(trays[1], key === 'cryo_infliction' ? 'nature_infliction' : 'cryo_infliction'), 0);
    }
  }
});

test('Antal copies an existing configured effect without inventing a missing one', () => {
  for (const key of [null, 'nature_infliction', 'vulnerable']) {
    const ctx = context(), start = seed(ctx, key ? { [key]: 1 } : {});
    const trays = render(ctx, [start, 803]);
    if (key) assert.equal(count(trays[1], key), 2);
    else assert.equal(trays[1].debuff.length, 0);
  }
});

test('Tangtang consumes zero, one or two Whirlpools and resolves the matching susceptibility', () => {
  for (const pools of [0, 1, 2, 3]) {
    const ctx = context(), ids = [...Array(pools).fill(1503), 1502, 1502];
    const trays = render(ctx, ids), first = ctx.resolved[pools], second = ctx.resolved[pools + 1];
    const consumed = Math.min(2, pools);
    assert.equal(first.battlefieldResourceState?.consumedResourceStacks, consumed);
    assert.equal(trays[pools].debuff.find(effect => effect.id === 'arts_susceptibility')?.valuePercent || 0, consumed * 5);
    assert.equal(second.battlefieldResourceState?.consumedResourceStacks, 0);
    assert.equal(second.debuffs.some(effect => effect.id === 'arts_susceptibility'), false);
    const sim = simulate(ctx, ids);
    assert.equal(sim[pools].skillData.battlefieldResourceState.consumedResourceStacks, consumed);
  }
});

test('Zhuang uses consumed Electric Infliction for Electrification stacks and the resulting Sunderblade buff', () => {
  for (const stacks of [1, 2, 3, 4]) {
    const ctx = context(), start = seed(ctx, { electric_infliction: stacks });
    const trays = render(ctx, [start, 903, 902]);
    assert.equal(count(trays[1], 'electrification'), stacks);
    assert.equal(count(trays[1], 'electric_infliction'), 0);
    assert.equal(count(trays[2], 'electrification'), 0);
    assert.equal(trays[2].buff.find(effect => effect.id === 'electric_amp')?.electricDamageBonusPercent,
      18 + Math.min(3, 1 + stacks) * 2);
    const sim = simulate(ctx, [start, 903, 902]);
    assert.equal(sim[1].activeDebuffs.find(effect => effect.id === 'electrification').currentStacks, stacks);
  }
});

test('redrawing or deleting Tangtang resource actions recalculates the outcome without changing the stored profile', () => {
  const ctx = context(), original = JSON.stringify(ctx.skills.get(1502));
  for (let i = 0; i < 2; i++) {
    const trays = render(ctx, [1503, 1503, 1502]);
    assert.equal(trays[2].debuff.find(effect => effect.id === 'arts_susceptibility')?.valuePercent, 10);
  }
  const trays = render(ctx, [1502]);
  assert.equal(count(trays[0], 'arts_susceptibility'), 0);
  assert.equal(JSON.stringify(ctx.skills.get(1502)), original);
});

test('Mimino cannot detonate a missing device, and the attached device is consumed once', () => {
  const ctx = context();
  render(ctx, [3605, 3602, 3605, 3605]);
  assert.equal(ctx.resolved[0].comboResourceResolution.unavailable, true);
  assert.equal(ctx.resolved[2].comboResourceResolution.after.mimino_device, 0);
  assert.equal(ctx.resolved[3].comboResourceResolution.unavailable, true);
});

test('Argent Flow only adds Vulnerability when Bolt Rush actually consumes Electric Infliction', () => {
  for (const stacks of [0, 1, 4]) {
    const ctx = context(), start = seed(ctx, stacks ? { electric_infliction: stacks } : {});
    const trays = render(ctx, [start, 3405]);
    assert.equal(count(trays[1], 'vulnerable'), stacks ? 1 : 0);
    assert.equal(count(trays[1], 'electric_infliction'), 0);
    assert.equal(trays[1].debuff.find(effect => effect.id === 'electrification')?.statusLevel, 1 + stacks);
  }
});

test('Pogranichnik uses the consumed Vulnerability trigger to consume the matching Steel Oath sequences', () => {
  const ctx = context(), start = seed(ctx, { vulnerable: 4, steel_oath: 5 });
  const trays = render(ctx, [start, 2705, 2203]);
  assert.equal(count(trays[1], 'steel_oath'), 4);
  assert.equal(count(trays[2], 'steel_oath'), 1);
});
