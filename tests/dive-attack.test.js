import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const migration = fs.readFileSync("supabase/operator_dive_attacks.sql", "utf8");

test("Dive Attack migration creates one Level 12 action for every Supabase operator", () => {
  assert.match(migration, /from public\.operators as operator/);
  assert.match(migration, /where operator\.game = 'arknights_endfield'/);
  assert.match(migration, /'Dive Attack'/);
  assert.match(migration, /'damageMultiplier', 180/);
  assert.match(migration, /'atkMultiplier', 1\.8/);
  assert.match(migration, /'normalAttackDamage', true/);
  assert.match(migration, /'formActionKey', 'dive_attack'/);
  assert.match(migration, /assets\/operators\/skills\/shared\/dive_attack\.png/);
});

test("form action keys can be supplied by Supabase for Dive Attack variants", () => {
  const context = { window: {}, operatorUltimateStates: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/operatorStateEngine.js", "utf8"), context);

  assert.equal(context.getOperatorFormActionKey({
    id: 900009,
    formActionKey: "dive_attack",
    type: "Dive Attack"
  }), "dive_attack");
});

test("Dive Attack is classified as Normal Attack damage from Supabase metadata", () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/damageBreakdown.js", "utf8"), context);

  assert.equal(context.getSimulationSkillDamageTypeKey({
    type: "Dive Attack",
    shortType: "Dive",
    normalAttackDamage: true
  }), "basicAttack");
});

test("generated Dive Attack icon exists as an RGBA PNG", () => {
  const iconPath = "endfield/assets/operators/skills/shared/dive_attack.png";
  const icon = fs.statSync(iconPath);
  const bytes = fs.readFileSync(iconPath);
  assert.ok(icon.isFile());
  assert.ok(icon.size > 0);
  assert.equal(bytes[25], 6, "PNG color type must be RGBA");
});
