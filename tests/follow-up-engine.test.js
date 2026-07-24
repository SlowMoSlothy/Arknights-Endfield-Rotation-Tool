import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function createContext() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/followUpEngine.js", "utf8"), context);
  return context;
}

function rossiSkill() {
  return {
    id: 503,
    operatorId: 5,
    name: "Moment of Blazing Shadow",
    consumeDebuffs: ["arts_infliction"],
    debuffs: [{ appliesEffect: "vulnerable", stacksApplied: 1 }],
    manualSequence: {
      autoComplete: true,
      automaticDelaySeconds: 1.817,
      maxFollowUpDelaySeconds: 3,
      manualFollowUpCountsAsPerfect: false,
      perfectTimingWindow: { targetSeconds: 1.817, startSeconds: 1.767, endSeconds: 1.867 },
      stages: [
        { stage: 1, actionOverride: { damageProfile: { atkMultiplier: 0.67 }, consumeDebuffs: [], debuffs: [] } },
        {
          stage: 2,
          actionOverride: {
            damageProfile: { atkMultiplier: 1.33 },
            consumeDebuffs: ["arts_infliction"],
            debuffs: [{ appliesEffect: "vulnerable", stacksApplied: 1 }]
          },
          perfectActionOverride: { debuffs: [{ appliesEffect: "vulnerable", stacksApplied: 2 }] }
        }
      ]
    }
  };
}

test("Rossi's first sequence does not consume Infliction and automatically completes sequence 2", () => {
  const context = createContext();
  const resolved = context.window.resolveSimulationManualSequences([{
    kind: "auto", time: 2, order: 1, sourceOperatorId: 5, skillData: rossiSkill()
  }]);

  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].sequenceStage, 1);
  assert.deepEqual(Array.from(resolved[0].skillData.consumeDebuffs), []);
  assert.equal(resolved[1].sequenceStage, 2);
  assert.equal(resolved[1].time, 3.817);
  assert.equal(resolved[1].perfectTiming, false);
  assert.equal(resolved[1].skillData.debuffs[0].stacksApplied, 1);
});

test("a manual Rossi recast replaces automatic sequence 2 and counts as perfect", () => {
  const context = createContext();
  const skill = rossiSkill();
  const resolved = context.window.resolveSimulationManualSequences([
    { kind: "auto", time: 2, order: 1, sourceOperatorId: 5, skillData: skill },
    { kind: "manual", time: 3.8, order: 2, sourceOperatorId: 5, skillData: skill }
  ]);

  assert.equal(resolved.length, 2);
  assert.equal(resolved[1].time, 3.8);
  assert.equal(resolved[1].perfectTiming, true);
  assert.equal(resolved[1].skillData.debuffs[0].stacksApplied, 2);
});

test("Fluorite's bomb moves damage and Nature Infliction to a delayed proc", () => {
  const context = createContext();
  const skill = {
    id: 1902,
    operatorId: 19,
    name: "Tiny Surprise",
    damageProfile: { atkMultiplier: 1.87 },
    debuffs: [{ appliesEffect: "nature_infliction" }],
    delayedFollowUp: {
      delaySeconds: 3.65,
      detonateOnSkillIds: [1904],
      earlyDetonationDamageMultiplier: 1.3,
      initialActionOverride: { damageProfile: null, debuffs: [{ appliesEffect: "slow" }] },
      followUpActionOverride: {
        name: "Improvised Explosive",
        damageProfile: { atkMultiplier: 1.87 },
        debuffs: [{ appliesEffect: "nature_infliction" }]
      }
    }
  };
  const resolved = context.window.resolveSimulationDelayedFollowUps([{
    kind: "manual", time: 1, order: 1, sourceOperatorId: 19, skillData: skill
  }]);

  assert.equal(resolved.length, 2);
  assert.equal(resolved[0].skillData.damageProfile, null);
  assert.equal(resolved[0].skillData.debuffs[0].appliesEffect, "slow");
  assert.equal(resolved[1].time, 4.65);
  assert.equal(resolved[1].skillData.name, "Improvised Explosive");
  assert.equal(resolved[1].skillData.debuffs[0].appliesEffect, "nature_infliction");
});

test("Fluorite's Ultimate detonates the bomb early with Supabase-configured 30% boost", () => {
  const context = createContext();
  const bombSkill = {
    id: 1902,
    operatorId: 19,
    name: "Tiny Surprise",
    delayedFollowUp: {
      delaySeconds: 3,
      detonateOnSkillIds: [1904],
      earlyDetonationDamageMultiplier: 1.3,
      initialActionOverride: { damageProfile: null, debuffs: [] },
      followUpActionOverride: { name: "Improvised Explosive", damageProfile: { atkMultiplier: 1.87 } }
    }
  };
  const resolved = context.window.resolveSimulationDelayedFollowUps([
    { kind: "manual", time: 1, order: 1, sourceOperatorId: 19, skillData: bombSkill },
    { kind: "manual", time: 2, order: 2, sourceOperatorId: 19, skillData: { id: 1904, operatorId: 19, name: "Apex Prankster" } }
  ]);
  const explosion = resolved.find(event => event.skillData?.name === "Improvised Explosive");

  assert.equal(explosion.time, 2);
  assert.equal(explosion.detonatedEarly, true);
  assert.ok(Math.abs(explosion.skillData.damageProfile.atkMultiplier - 2.431) < 0.000001);
});

test("a team Dive ends a configured field early and emits additional Supabase actions", () => {
  const context = createContext();
  const ultimate = {
    id: 1504,
    operatorId: 15,
    name: "Field Ultimate",
    delayedFollowUp: {
      delaySeconds: 4,
      detonatorScope: "team",
      detonateOnEmittedEffects: ["dive_attack"],
      initialActionOverride: { damageProfile: { atkMultiplier: 3.2 } },
      followUpActionOverride: { name: "Normal Wave", damageProfile: { atkMultiplier: 4 } },
      earlyFollowUpActionOverride: { name: "Early Wave", damageProfile: { atkMultiplier: 7 } },
      earlyAdditionalActions: [{ actionOverride: { name: "Converted Waterspouts", damageProfile: { atkMultiplier: 4.8 } } }]
    }
  };
  const resolved = context.window.resolveSimulationDelayedFollowUps([
    { kind: "manual", time: 2, order: 1, sourceOperatorId: 15, skillData: ultimate },
    { kind: "manual", time: 4.5, order: 2, sourceOperatorId: 3, skillData: { id: 900003, operatorId: 3, formActionKey: "dive_attack" } }
  ]);

  const earlyWave = resolved.find(event => event.skillData?.name === "Early Wave");
  const waterspouts = resolved.find(event => event.skillData?.name === "Converted Waterspouts");
  assert.equal(earlyWave.time, 4.5);
  assert.equal(earlyWave.sourceOperatorId, 15);
  assert.equal(earlyWave.skillData.damageProfile.atkMultiplier, 7);
  assert.equal(waterspouts.time, 4.5);
  assert.equal(waterspouts.sourceOperatorId, 15);
  assert.equal(resolved.some(event => event.skillData?.name === "Normal Wave"), false);
});

test("Tangtang batch stores level-12 values and Dive trigger only in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_05d_tangtang.sql", "utf8");
  const engine = fs.readFileSync("endfield/js/logic/followUpEngine.js", "utf8");

  assert.match(migration, /"detonateOnEmittedEffects":\["dive_attack"\]/);
  assert.match(migration, /"detonatorScope":"team"/);
  assert.match(migration, /"atkMultiplier":7\.0/);
  assert.match(migration, /"atkMultiplier":14\.4/);
  assert.match(migration, /"skillLevel":12/);
  assert.doesNotMatch(engine, /Tangtang|OLDEN STARE|1504|dive_attack/);
});

test("Batch 05B stores operator mechanics in Supabase and keeps the client generic", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_05b.sql", "utf8");
  const engine = fs.readFileSync("endfield/js/logic/followUpEngine.js", "utf8");

  assert.match(migration, /"manualSequence"/);
  assert.match(migration, /"delayedFollowUp"/);
  assert.match(migration, /"earlyDetonationDamageMultiplier":1\.3/);
  assert.match(migration, /"delaySeconds":3\.65/);
  assert.match(migration, /"targetSeconds":1\.817/);
  assert.doesNotMatch(engine, /Rossi|Fluorite|503|1902|1904/);
});
