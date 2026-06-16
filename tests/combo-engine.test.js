import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function createComboEngineContext() {
  const context = {
    console,
    crypto: { randomUUID: () => "test-uid" },
    BUFF_REGISTRY: {},
    selectedTeam: [27, 24, 5, 11],
    rotation: [],
    operators: [],
    resolveArtsReactions: (effectMap) => effectMap
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/comboEngine.js", "utf8"), context);

  return context;
}

test("Mi Fu move 2 keeps vulnerable below the consume threshold so Rossi CS can trigger", () => {
  const context = createComboEngineContext();

  const miFuMove2 = {
    id: 2705,
    type: "Battle Skill",
    consumeDebuffs: ["vulnerable"],
    requiresConsumedVulnerableStacks: 3,
    debuffs: [
      {
        appliesEffect: "vulnerable",
        persistsForCombo: true,
        stackable: true,
        stacksApplied: 1,
        maxStacks: 4
      }
    ]
  };
  const rossiCs = {
    id: 503,
    type: "Combo Skill",
    allowSelfTrigger: true,
    comboTriggerMode: "all",
    comboTriggers: [
      { effect: "vulnerable", minStacks: 1 },
      { anyOf: [{ effect: "heat_infliction", minStacks: 1 }] }
    ]
  };
  const rossiUlt = {
    id: 504,
    type: "Ultimate",
    debuffs: [
      {
        appliesEffect: "heat_infliction",
        persistsForCombo: true,
        stackable: true,
        stacksApplied: 1,
        maxStacks: 4
      }
    ]
  };
  const wulfgardCs = {
    id: 2403,
    type: "Combo Skill",
    comboTriggerMode: "any",
    allowSelfTrigger: true,
    comboTriggers: [{ effect: "heat_infliction", minStacks: 1 }]
  };

  context.operators = [
    { id: 27, skills: [miFuMove2] },
    { id: 24, skills: [wulfgardCs] },
    { id: 5, skills: [rossiCs, rossiUlt] },
    { id: 11, skills: [] }
  ];

  const effectMap = {};
  context.applySkillEffectsToComboMap(miFuMove2, effectMap, true, false, effectMap);
  assert.equal(effectMap.vulnerable, 1);

  context.applySkillEffectsToComboMap(rossiUlt, effectMap, true, false, effectMap);
  const comboSkillIds = Array.from(context.getComboSkillsFromEffects(effectMap, 5).map(skill => skill.id));

  assert.deepEqual(comboSkillIds, [2403, 503]);
});

test("Mi Fu move 2 consumes vulnerable when the threshold is reached", () => {
  const context = createComboEngineContext();
  const miFuMove2 = {
    id: 2705,
    type: "Battle Skill",
    consumeDebuffs: ["vulnerable"],
    requiresConsumedVulnerableStacks: 3
  };
  const effectMap = { vulnerable: 3 };

  context.removeConsumedDebuffsFromEffectMap(miFuMove2, effectMap);

  assert.equal(effectMap.vulnerable, undefined);
});
