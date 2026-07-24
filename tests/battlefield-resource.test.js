import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function createContext() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/battlefieldResourceEngine.js", "utf8"), context);
  return context;
}

function createLevel12BattleSkill(overrides = {}) {
  return {
    id: 902,
    operatorId: 9,
    consumeDebuffs: ["electrification"],
    damageProfile: {
      atkMultiplier: 0.45,
      hitCount: 1,
      element: "electric"
    },
    buffs: [{
      id: "electric_amp",
      appliesEffect: "electric_amp",
      electricDamageBonusPercent: 18
    }],
    battlefieldResource: {
      resourceKey: "sunderblades",
      name: "Sunderblades",
      ownerOperatorId: 9,
      maxStacks: 9,
      durationSeconds: 36,
      creation: {
        consumedEffect: "electrification",
        baseStacks: 1,
        stacksPerConsumedStack: 1,
        maxStacksPerUse: 3,
        fallbackStacks: 1,
        fallbackWhenBelowStacks: 3
      },
      strikes: {
        useAllActiveStacks: true,
        atkMultiplierPerStrike: 0.45,
        bonusAtkMultiplierPerConsumedStack: 0.09,
        finalStrikeMultiplier: 6
      },
      ultimateEnergyPerStrike: 6,
      progressiveBuff: {
        effect: "electric_amp",
        baseValue: 18,
        valuePerStrike: 2,
        valueField: "electricDamageBonusPercent",
        durationSeconds: 5,
        target: "self"
      }
    },
    ...overrides
  };
}

test("Level 12 Mantra creates Sunderblades from Electrification and resolves all Thunder Strikes", () => {
  const context = createContext();
  const state = {};
  const result = context.resolveBattlefieldResourceSkill(
    createLevel12BattleSkill(),
    [{ id: "electrification", currentStacks: 2 }],
    1,
    state
  );

  assert.equal(result.skillData.battlefieldResourceState.createdStacks, 3);
  assert.equal(result.skillData.battlefieldResourceState.strikeCount, 3);
  assert.deepEqual(
    Array.from(result.skillData.battlefieldResourceState.after.stackExpiresAt),
    [37, 37, 37]
  );
  assert.equal(result.skillData.battlefieldResourceState.perStrikeMultiplier, 0.63);
  assert.ok(Math.abs(result.skillData.damageProfile.atkMultiplier - 5.04) < 0.000001);
  assert.equal(result.skillData.damageProfile.hitCount, 3);
  assert.equal(result.skillData.ultimateEnergyGain, 18);
  assert.equal(result.skillData.buffs[0].electricDamageBonusPercent, 24);
});

test("Sunderblades persist between casts, cap at nine, and expire individually", () => {
  const context = createContext();
  const state = {};
  const skill = createLevel12BattleSkill();
  context.resolveBattlefieldResourceSkill(skill, [{ id: "electrification", currentStacks: 2 }], 0, state);
  const second = context.resolveBattlefieldResourceSkill(skill, [{ id: "electrification", currentStacks: 1 }], 2, state);
  const afterExpiry = context.resolveBattlefieldResourceSkill(skill, [], 39, state);

  assert.equal(second.skillData.battlefieldResourceState.createdStacks, 2);
  assert.equal(second.skillData.battlefieldResourceState.strikeCount, 5);
  assert.equal(second.skillData.damageProfile.atkMultiplier, 5.4);
  assert.equal(afterExpiry.skillData.battlefieldResourceState.before.stacks, 0);
  assert.equal(afterExpiry.skillData.battlefieldResourceState.createdStacks, 1);
  assert.equal(afterExpiry.skillData.battlefieldResourceState.strikeCount, 1);
});

test("first Ultimate Mantra guarantees three Sunderblades without consuming Electrification", () => {
  const context = createContext();
  const state = {};
  const base = createLevel12BattleSkill();
  const ultimateSkill = {
    ...base,
    consumeDebuffs: [],
    battlefieldResource: {
      ...base.battlefieldResource,
      creation: { ...base.battlefieldResource.creation, guaranteedStacks: 3 },
      strikes: {
        ...base.battlefieldResource.strikes,
        atkMultiplierPerStrike: 0.81,
        bonusAtkMultiplierPerConsumedStack: 0.18
      }
    }
  };
  const result = context.resolveBattlefieldResourceSkill(
    ultimateSkill,
    [{ id: "electrification", currentStacks: 4 }],
    5,
    state
  );

  assert.equal(result.skillData.battlefieldResourceState.consumedEffectStacks, 0);
  assert.equal(result.skillData.battlefieldResourceState.createdStacks, 3);
  assert.equal(result.skillData.battlefieldResourceState.strikeCount, 3);
  assert.ok(Math.abs(result.skillData.damageProfile.atkMultiplier - 6.48) < 0.000001);
});

test("Zhuang migration stores Level 12 and Sunderblade rules in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_form_mechanics.sql", "utf8");
  assert.match(migration, /"atkMultiplierTotal":1\.5/);
  assert.match(migration, /"atkMultiplierTotal":2\.1/);
  assert.match(migration, /"atkMultiplierTotal":3\.0/);
  assert.match(migration, /"atkMultiplierPerStrike":0\.45/);
  assert.match(migration, /"atkMultiplierPerStrike":0\.81/);
  assert.match(migration, /"finalStrikeMultiplier":6/);
  assert.match(migration, /"damageProfile":\{"atkMultiplier":5\.4/);
  assert.match(migration, /"guaranteedStacks":3/);
});

test("Tangtang converts two persistent Whirlpools into three Waterspouts and 40 returned SP", () => {
  const context = createContext();
  const state = {};
  const combo = {
    id: 1503,
    operatorId: 15,
    battlefieldResource: {
      resourceKey: "whirlpool",
      ownerOperatorId: 15,
      maxStacks: 2,
      durationSeconds: 30,
      creation: { guaranteedStacks: 1, maxStacksPerUse: 1 }
    }
  };
  const battle = {
    id: 1502,
    operatorId: 15,
    battlefieldResource: {
      resourceKey: "whirlpool",
      ownerOperatorId: 15,
      maxStacks: 2,
      durationSeconds: 30,
      consumption: { consumeAllActive: true },
      outcomesByConsumedStacks: {
        2: { actionOverride: { damageProfile: { atkMultiplier: 4.79, hitCount: 4 }, spRecovery: 40 } }
      }
    }
  };

  context.resolveBattlefieldResourceSkill(combo, [], 0, state);
  context.resolveBattlefieldResourceSkill(combo, [], 10, state);
  const result = context.resolveBattlefieldResourceSkill(battle, [], 12, state);

  assert.equal(result.skillData.battlefieldResourceState.before.stacks, 2);
  assert.equal(result.skillData.battlefieldResourceState.consumedResourceStacks, 2);
  assert.equal(result.skillData.battlefieldResourceState.after.stacks, 0);
  assert.equal(result.skillData.damageProfile.atkMultiplier, 4.79);
  assert.equal(result.skillData.spRecovery, 40);
});

test("expired Whirlpools are not converted", () => {
  const context = createContext();
  const state = {};
  const base = {
    operatorId: 15,
    battlefieldResource: {
      resourceKey: "whirlpool",
      ownerOperatorId: 15,
      maxStacks: 2,
      durationSeconds: 30,
      creation: { guaranteedStacks: 1 }
    }
  };
  context.resolveBattlefieldResourceSkill(base, [], 0, state);
  const result = context.resolveBattlefieldResourceSkill({
    ...base,
    battlefieldResource: {
      ...base.battlefieldResource,
      creation: {},
      consumption: { consumeAllActive: true }
    }
  }, [], 31, state);

  assert.equal(result.skillData.battlefieldResourceState.before.stacks, 0);
  assert.equal(result.skillData.battlefieldResourceState.consumedResourceStacks, 0);
});

test("Link resolves different multiplicative values for Battle Skills and Ultimates", () => {
  const context = createContext();
  const link = {
    id: "link",
    currentStacks: 3,
    skillValueByStacks: {
      valueField: "multiplicativeDamageBonusPercent",
      maxStacks: 4,
      valuesBySkillType: {
        battle_skill: { 1: 30, 2: 45, 3: 60, 4: 75 },
        ultimate: { 1: 20, 2: 30, 3: 40, 4: 50 }
      }
    }
  };
  const battle = context.resolveSimulationSkillScopedBuffValues({ type: "Battle Skill" }, [link])[0];
  const ultimate = context.resolveSimulationSkillScopedBuffValues({ type: "Ultimate" }, [link])[0];

  assert.equal(battle.multiplicativeDamageBonusPercent, 60);
  assert.equal(ultimate.multiplicativeDamageBonusPercent, 40);
});

test("Batch 05C stores field resources and Link tables in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_05c.sql", "utf8");
  assert.match(migration, /"resourceKey":"whirlpool"/);
  assert.match(migration, /"durationSeconds":30/);
  assert.match(migration, /"spRecovery":40/);
  assert.match(migration, /"baseValuePercent":18/);
  assert.match(migration, /"valuePercentPerStack":1\.8/);
  assert.match(migration, /"multiplicativeDamageBonusPercent"/);
  assert.match(migration, /"Link Additional Hit"/);
});
