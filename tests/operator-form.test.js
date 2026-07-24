import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function createContext() {
  const context = {
    console,
    window: {},
    operatorUltimateStates: {},
    operators: [{
      id: 9,
      name: "Zhuang",
      icon: "zhuang.png",
      elementType: "electric",
      basicAttack: {
        hitCount: 1,
        cycleDuration: 1,
        sequences: [{
          sequenceIndex: 1,
          kind: "final_strike",
          hitCount: 1,
          hitTimings: [0.8],
          duration: 1,
          atkMultiplierTotal: 0.48,
          emits: ["final_strike"]
        }]
      },
      skills: []
    }],
    operatorForms: [{
      formKey: "empyrean_of_truth",
      operatorId: 9,
      name: "Empyrean of Truth",
      activationSkillId: 904,
      durationSeconds: 25,
      priority: 100,
      enabled: true
    }],
    operatorFormActionVariants: [{
      formKey: "empyrean_of_truth",
      operatorId: 9,
      actionKey: "basic_attack",
      priority: 100,
      enabled: true,
      actionOverride: {
        hitCount: 1,
        cycleDuration: 2,
        sequences: [{
          sequenceIndex: 1,
          kind: "final_strike",
          hitCount: 1,
          hitTimings: [1.5],
          duration: 2,
          atkMultiplierTotal: 1.34,
          emits: ["final_strike"]
        }]
      }
    }, {
      formKey: "empyrean_of_truth",
      operatorId: 9,
      actionKey: "skill:902",
      priority: 100,
      enabled: true,
      actionOverride: {
        damageMultiplier: 36,
        firstUsePerActivation: { sp_cost: 0, consumeDebuffs: [] }
      }
    }]
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/operatorStateEngine.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/basicAttack.js", "utf8"), context);
  return context;
}

function createPlacementContext() {
  const noop = () => {};
  const skills = {
    902: { id: 902, operatorId: 9, type: "Battle Skill", shortType: "BS", sp_cost: 100 },
    904: { id: 904, operatorId: 9, type: "Ultimate", shortType: "Ult", energy: 240 }
  };
  const context = {
    console,
    window: { addEventListener: noop },
    document: { addEventListener: noop },
    localStorage: { getItem: () => null, setItem: noop },
    crypto: { randomUUID: () => "test" },
    setTimeout: noop,
    clearTimeout: noop,
    requestAnimationFrame: noop,
    cancelAnimationFrame: noop,
    uiSettings: { simulationSpPerSecond: 10 },
    ARTS_REACTIONS: [{
      id: "electrification",
      triggerEffect: "electric_infliction",
      requiresAny: ["heat_infliction", "cryo_infliction", "nature_infliction"],
      appliesEffect: "arts_reaction",
      reactionEffect: "electrification",
      persistsForCombo: false
    }, {
      id: "corrosion",
      triggerEffect: "nature_infliction",
      requiresAny: ["electric_infliction", "heat_infliction", "cryo_infliction"],
      appliesEffect: "arts_reaction",
      reactionEffect: "corrosion",
      persistsForCombo: false
    }],
    DEBUFF_REGISTRY: {
      arts_reaction: { name: "Arts Reaction" },
      electrification: { name: "Electrification" },
      corrosion: { name: "Corrosion" }
    },
    selectedTeam: [9],
    operators: [{ id: 9, name: "Zhuang" }],
    operatorUltimateStates: {},
    rotation: [
      { uid: "ult", id: 904, time: 6.7 },
      { uid: "first-bs", id: 902, time: 8 }
    ],
    operatorForms: [{
      formKey: "empyrean_of_truth",
      operatorId: 9,
      name: "Empyrean of Truth",
      activationSkillId: 904,
      durationSeconds: 25,
      priority: 100,
      enabled: true
    }],
    operatorFormActionVariants: [{
      formKey: "empyrean_of_truth",
      operatorId: 9,
      actionKey: "skill:902",
      priority: 100,
      enabled: true,
      actionOverride: {
        firstUsePerActivation: { sp_cost: 0, spCost: 0, consumeDebuffs: [] }
      }
    }],
    getRotationActionData: entry => skills[entry.id],
    normalizeDebuffKey: effect => effect?.appliesEffect || effect?.id || effect?.name,
    getSkillById: id => skills[id],
    getOperatorBySkillId: id => Object.values(skills).some(skill => skill.id === id) ? { id: 9 } : null,
    getTimelineBasicAttackData: () => ({ hasBasicAttackConfig: false }),
    getTimelineSecondsPerSlot: () => 1,
    getBattleSkillSpCost: skill => Number(skill?.sp_cost ?? skill?.spCost)
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/operatorStateEngine.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8"), context);
  return context;
}

test("operator form intervals activate at the Ultimate and expire after the Supabase duration", () => {
  const context = createContext();
  const intervals = context.buildOperatorFormIntervals([{
    time: 5,
    order: 0,
    sourceOperatorId: 9,
    skillData: { id: 904, operatorId: 9 }
  }], 40);

  assert.equal(intervals.length, 1);
  assert.equal(intervals[0].start, 5);
  assert.equal(intervals[0].end, 30);
  assert.equal(context.getActiveOperatorForm(9, 29.9, intervals).formKey, "empyrean_of_truth");
  assert.equal(context.getActiveOperatorForm(9, 30, intervals), null);
});

test("basic attacks are split into base, form, and base segments", () => {
  const context = createContext();
  const intervals = context.buildOperatorFormIntervals([{
    time: 5,
    order: 0,
    sourceOperatorId: 9,
    skillData: { id: 904, operatorId: 9 }
  }], 35);
  const segments = context.getBasicAttackFormSegments(9, 35, intervals);

  assert.deepEqual(JSON.parse(JSON.stringify(segments.map(segment => [segment.start, segment.end]))), [[0, 5], [5, 30], [30, 35]]);
  assert.equal(segments[0].attackData.cycleDuration, 1);
  assert.equal(segments[1].attackData.cycleDuration, 2);
  assert.equal(segments[1].attackData.formKey, "empyrean_of_truth");
  assert.equal(segments[1].attackData.hitTimings[0].time, 1.5);
  assert.equal(segments[1].attackData.hitTimings[0].atkMultiplierTotal, 1.34);
  assert.equal(segments[2].attackData.cycleDuration, 1);
});

test("firstUsePerActivation only changes the first resolved form action", () => {
  const context = createContext();
  const intervals = context.buildOperatorFormIntervals([{
    time: 5,
    sourceOperatorId: 9,
    skillData: { id: 904, operatorId: 9 }
  }], 35);
  const baseSkill = { id: 902, operatorId: 9, sp_cost: 100, consumeDebuffs: ["electrification"] };
  const first = context.resolveOperatorFormAction(baseSkill, 9, 6, intervals, { activationUseIndex: 1 });
  const second = context.resolveOperatorFormAction(baseSkill, 9, 8, intervals, { activationUseIndex: 2 });

  assert.equal(first.damageMultiplier, 36);
  assert.equal(first.sp_cost, 0);
  assert.deepEqual(Array.from(first.consumeDebuffs), []);
  assert.equal(second.sp_cost, 100);
  assert.deepEqual(Array.from(second.consumeDebuffs), ["electrification"]);
});

test("drop snapping resolves the first Ultimate Battle Skill before checking SP", () => {
  const context = createPlacementContext();
  const resolved = context.getResolvedSimulationSkillForPlacement(1, 8, 1);

  assert.equal(resolved.sp_cost, 0);
  assert.equal(context.getSnappedSimulationEntryTime(1, 8, 1), 8);
});

test("only the first Battle Skill in one Ultimate activation is free", () => {
  const context = createPlacementContext();
  context.rotation.push({ uid: "second-bs", id: 902, time: 9 });

  assert.equal(context.getResolvedSimulationSkillForPlacement(1, 8, 1).sp_cost, 0);
  assert.equal(context.getResolvedSimulationSkillForPlacement(2, 9, 1).sp_cost, 100);
});

test("Zhuang's Ultimate Electric Infliction reacts with existing Nature as Electrification", () => {
  const context = createPlacementContext();
  const stacks = { nature_infliction: 1, electric_infliction: 1 };
  const metadata = {
    nature_infliction: { lastAppliedOrder: 1 },
    electric_infliction: { lastAppliedOrder: 2 }
  };

  assert.equal(context.resolveLatestElementalReactionForRotation(stacks, metadata), true);
  assert.equal(stacks.electrification, 1);
  assert.equal(stacks.corrosion, undefined);
  assert.equal(stacks.electric_infliction, undefined);
  assert.equal(stacks.nature_infliction, undefined);
});

test("basic attack interval timings are accumulated within each sequence", () => {
  const context = createContext();
  const sequences = context.normalizeBasicAttackSequences({
    hitTimingMode: "intervals",
    sequences: [{
      sequenceIndex: 1,
      duration: 0.667,
      hitCount: 2,
      hitTimings: [0.3, 0.083],
      atkMultiplierTotal: 0.36
    }]
  });

  assert.deepEqual(Array.from(sequences[0].hitTimings), [0.3, 0.383]);
  assert.equal(sequences[0].duration, 0.667);
  assert.equal(sequences[0].hitTimingMode, "intervals");
});

test("operator form migration keeps all mechanics in Supabase rows", () => {
  const migration = fs.readFileSync("supabase/operator_form_mechanics.sql", "utf8");
  assert.match(migration, /create table if not exists public\.operator_forms/);
  assert.match(migration, /create table if not exists public\.operator_form_action_variants/);
  assert.match(migration, /'empyrean_of_truth'/);
  assert.match(migration, /'skill:902'/);
  assert.match(migration, /'skill:903'/);
  assert.match(migration, /"firstUsePerActivation"/);
  assert.match(migration, /"hitTimingMode":"intervals"/);
  assert.match(migration, /"hitTimings":\[0\.3,0\.083\]/);
  assert.match(migration, /"battlefieldResource"/);
  assert.match(migration, /"atkMultiplierTotal":1\.5/);
  assert.match(migration, /"damageMultiplier":540/);
});
