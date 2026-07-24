import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function createContext() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/sustainEngine.js", "utf8"), context);
  return context;
}

test("Ember treatment and shield scale from live Will and Max HP", () => {
  const context = createContext();
  const treatment = context.window.resolveSimulationSustainProfile({
    sustainProfile: { treatments: [{ baseTreatment: 675, willMultiplier: 1.58 }] }
  }, { will: 200, maxHp: 6000, treatmentEffectPercent: 20 });
  const shield = context.window.resolveSimulationSustainProfile({
    sustainProfile: { shield: { maxHpMultiplier: 0.25, durationSeconds: 10 } }
  }, { will: 200, maxHp: 6000 });

  assert.ok(Math.abs(treatment.treatments[0].total - 1189.2) < 0.000001);
  assert.equal(shield.shield.amount, 1500);
  assert.equal(shield.shield.durationSeconds, 10);
});

test("Snowshine treatment resolves one initial heal, six HoT ticks and low-HP talent", () => {
  const context = createContext();
  const result = context.window.resolveSimulationSustainProfile({
    sustainProfile: {
      treatments: [
        { name: "Initial", baseTreatment: 216, willMultiplier: 0.5, conditionalTargetHpAtMostPercent: 55, conditionalMultiplier: 1.25 },
        { name: "HoT", baseTreatment: 54, willMultiplier: 0.13, intervalSeconds: 0.5, durationSeconds: 3, conditionalTargetHpAtMostPercent: 55, conditionalMultiplier: 1.25 }
      ]
    }
  }, { will: 108 });

  assert.equal(result.treatments[0].total, 270);
  assert.equal(result.treatments[0].conditionalTotal, 337.5);
  assert.equal(result.treatments[1].tickCount, 6);
  assert.ok(Math.abs(result.treatments[1].total - 408.24) < 0.000001);
  assert.ok(Math.abs(result.treatments[1].conditionalTotal - 510.3) < 0.000001);
});

test("Batch 06 keeps operator sustain formulas in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_06_sustain.sql", "utf8");
  const engine = fs.readFileSync("endfield/js/logic/sustainEngine.js", "utf8");

  assert.match(migration, /"baseTreatment":675,"willMultiplier":1\.58/);
  assert.match(migration, /"maxHpMultiplier":0\.25/);
  assert.match(migration, /"baseTreatment":216,"willMultiplier":0\.5/);
  assert.match(migration, /"intervalSeconds":0\.5,"durationSeconds":3/);
  assert.match(migration, /"conditionalTargetHpAtMostPercent":55,"conditionalMultiplier":1\.25/);
  assert.doesNotMatch(engine, /Ember|Snowshine|675|216|1\.58/);
});

test("Batch 06B resolves Xaihi, Gilberta and Catcher attribute scaling generically", () => {
  const context = createContext();
  const xaihi = context.window.resolveSimulationSustainProfile({
    sustainProfile: { treatments: [{ baseTreatment: 324, willMultiplier: 0.76 }] }
  }, { will: 200 });
  const gilberta = context.window.resolveSimulationSustainProfile({
    sustainProfile: { treatments: [{ baseTreatment: 108, intellectMultiplier: 0.9 }] }
  }, { will: 100, intellect: 150 });
  const catcher = context.window.resolveSimulationSustainProfile({
    sustainProfile: { shield: { baseShield: 810, defenseMultiplier: 5.06, derivedDefenseFromWill: 0.12, durationSeconds: 10 } }
  }, { will: 200, defense: 100 });

  assert.equal(xaihi.treatments[0].total, 476);
  assert.equal(gilberta.treatments[0].total, 243);
  assert.ok(Math.abs(catcher.shield.effectiveDefense - 124) < 0.000001);
  assert.ok(Math.abs(catcher.shield.amount - 1437.44) < 0.000001);
});

test("Batch 06B stores charges, pickup conditions and formulas in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_06b_sustain.sql", "utf8");
  const engine = fs.readFileSync("endfield/js/logic/sustainEngine.js", "utf8");

  assert.match(migration, /"baseTreatment":324,"willMultiplier":0\.76/);
  assert.match(migration, /"onFullyConsumedEffect":"auxiliary_crystal_used_up"/);
  assert.match(migration, /"guaranteedStacks":3/);
  assert.match(migration, /"baseTreatment":63,"willMultiplier":0\.53/);
  assert.match(migration, /"baseShield":810,"defenseMultiplier":5\.06,"derivedDefenseFromWill":0\.12/);
  assert.doesNotMatch(engine, /Xaihi|Ardelia|Gilberta|Catcher|324|810/);
});

test("treatment entries can scale from maximum HP", () => {
  const context = createContext();
  const result = context.window.resolveSimulationTreatmentEntry({
    maxHpMultiplier: 0.05,
    intervalSeconds: 1,
    durationSeconds: 8
  }, { maxHp: 5000 });

  assert.equal(result.perTick, 250);
  assert.equal(result.tickCount, 8);
  assert.equal(result.total, 2000);
});
