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
  context.getSkillById = (skillId) => context.operators
    .flatMap(operator => operator.skills)
    .find(skill => skill.id === skillId);
  context.getOperatorBySkillId = (skillId) => context.operators
    .find(operator => operator.skills.some(skill => skill.id === skillId));

  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/comboEngine.js", "utf8"), context);

  return context;
}

test("consumed-effect triggers retain the consumed stack count", () => {
  const context = createComboEngineContext();
  const effectMap = {};

  context.addConsumedDebuffTriggersForSkill(
    { consumeDebuffs: ["vulnerable"] },
    effectMap,
    { vulnerable: 4 }
  );

  assert.equal(effectMap.vulnerable_consumed, 4);
});

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

test("Mi Fu physical-status resolver applies Vulnerable first and Crush only when stacks exist", () => {
  const context = createComboEngineContext();
  const move2 = {
    id: 2705,
    type: "Battle Skill",
    physicalStatusResolution: {
      vulnerableEffect: "vulnerable",
      statusEffect: "crush",
      consumeAllVulnerable: true,
      vulnerableApplication: { name: "Vulnerable", maxStacks: 4 },
      statusApplication: { name: "Crush" },
      damageAtkMultiplierByStacks: { 1: 3, 2: 4.5, 3: 6, 4: 7.5 }
    }
  };

  const firstApplication = context.resolveSimulationPhysicalStatusSkill(move2, {});
  assert.equal(firstApplication.physicalStatusState.convertedToVulnerable, true);
  assert.equal(firstApplication.debuffs[0].appliesEffect, "vulnerable");
  assert.deepEqual(Array.from(firstApplication.consumeDebuffs), []);

  const crushApplication = context.resolveSimulationPhysicalStatusSkill(move2, { vulnerable: 2 });
  assert.equal(crushApplication.physicalStatusState.consumedStacks, 2);
  assert.equal(crushApplication.debuffs[0].appliesEffect, "crush");
  assert.equal(crushApplication.consumeDebuffs[0].effect, "vulnerable");

  const effectMap = { vulnerable: 2 };
  context.applySkillEffectsToComboMap(move2, effectMap, true, false, effectMap);
  assert.equal(effectMap.vulnerable, undefined);
});

test("Rossi Battle Skill converts the first Lift to Vulnerable and can self-trigger her Combo Skill", () => {
  const context = createComboEngineContext();
  const camilleBs = {
    id: 2902,
    operatorId: 29,
    type: "Battle Skill",
    debuffs: [{
      appliesEffect: "heat_infliction",
      persistsForCombo: true,
      stackable: true,
      stacksApplied: 1,
      maxStacks: 4
    }]
  };
  const rossiBs = {
    id: 502,
    operatorId: 5,
    type: "Battle Skill",
    debuffs: [{ appliesEffect: "lift", persistsForCombo: false }],
    physicalStatusResolution: {
      vulnerabilityMode: "stack",
      vulnerableEffect: "vulnerable",
      statusEffect: "lift",
      vulnerableApplication: { name: "Vulnerable", maxStacks: 4 },
      statusApplication: { name: "Lift" }
    }
  };
  const rossiCs = {
    id: 503,
    operatorId: 5,
    type: "Combo Skill",
    allowSelfTrigger: true,
    comboTriggerMode: "all",
    comboTriggers: [
      { effect: "vulnerable", minStacks: 1 },
      { anyOf: [{ effect: "heat_infliction", minStacks: 1 }] }
    ]
  };

  context.selectedTeam = [29, 5];
  context.operators = [
    { id: 29, skills: [camilleBs] },
    { id: 5, skills: [rossiBs, rossiCs] }
  ];

  const effectMap = {};
  context.applySkillEffectsToComboMap(camilleBs, effectMap, true, false, effectMap);
  context.applySkillEffectsToComboMap(rossiBs, effectMap, true, false, effectMap);

  assert.equal(effectMap.heat_infliction, 1);
  assert.equal(effectMap.vulnerable, 1);
  assert.equal(effectMap.lift, undefined);
  assert.deepEqual(
    Array.from(context.getComboSkillsFromEffects(effectMap, 5).map(skill => skill.id)),
    [503]
  );

  const stackedLift = context.resolveSimulationPhysicalStatusSkill(rossiBs, { vulnerable: 1 });
  assert.deepEqual(
    Array.from(stackedLift.debuffs.map(effect => effect.appliesEffect)),
    ["lift", "vulnerable"]
  );
  assert.deepEqual(Array.from(stackedLift.consumeDebuffs), []);
});

test("Rossi perfect Combo raises Vulnerable from one to three and triggers Mi Fu Combo", () => {
  const context = createComboEngineContext();
  const rossiCs = {
    id: 503,
    operatorId: 5,
    type: "Combo Skill",
    debuffs: [{
      appliesEffect: "vulnerable",
      persistsForCombo: true,
      stackable: true,
      stacksApplied: 2,
      maxStacks: 4
    }]
  };
  const miFuCs = {
    id: 2703,
    operatorId: 27,
    type: "Combo Skill",
    comboTriggerMode: "all",
    comboTriggers: [{ effect: "vulnerable", minStacks: 3 }]
  };

  context.selectedTeam = [5, 27];
  context.operators = [
    { id: 5, skills: [rossiCs] },
    { id: 27, skills: [miFuCs] }
  ];

  const effectMap = { vulnerable: 1 };
  context.applySkillEffectsToComboMap(rossiCs, effectMap, true, false, effectMap);

  assert.equal(effectMap.vulnerable, 3);
  assert.deepEqual(
    Array.from(context.getComboSkillsFromEffects(effectMap, 5).map(skill => skill.id)),
    [2703]
  );
});

test("Batch 08C keeps Rossi's Lift conversion and self-trigger in Supabase", () => {
  const migration = fs.readFileSync(
    "supabase/operator_mechanics_audit_batch_08c_rossi_camille_combo.sql",
    "utf8"
  );

  assert.match(migration, /operator_id = 5[\s\S]*id = 502/);
  assert.match(migration, /"vulnerabilityMode": "stack"/);
  assert.match(migration, /"statusEffect": "lift"/);
  assert.match(migration, /operator_id = 5[\s\S]*id = 503/);
  assert.match(migration, /"allowSelfTrigger": true/);
});

test("Batch 08D stores Rossi's Slot Mode perfect timing exclusively in Supabase", () => {
  const migration = fs.readFileSync(
    "supabase/operator_mechanics_audit_batch_08d_rossi_mifu_combo.sql",
    "utf8"
  );

  assert.match(migration, /skill\.operator_id = 5[\s\S]*skill\.id = 503/);
  assert.match(migration, /effect->>'appliesEffect' = 'vulnerable'/);
  assert.match(migration, /jsonb_set\(effect, '\{stacksApplied\}', '2'::jsonb/);
  assert.match(migration, /'slotModePerfectTiming', true/);
  assert.doesNotMatch(fs.readFileSync("endfield/js/logic/comboEngine.js", "utf8"), /slotModePerfectTiming/);
});

test("Batch 08E restores Rossi's missing Battle Skill prerequisite in Supabase", () => {
  const migration = fs.readFileSync(
    "supabase/operator_mechanics_audit_batch_08e_rossi_combo_prerequisite.sql",
    "utf8"
  );

  assert.match(migration, /skill\.operator_id = 5[\s\S]*skill\.id = 502/);
  assert.match(migration, /'\{physicalStatusResolution\}'/);
  assert.match(migration, /"vulnerabilityMode": "stack"/);
  assert.match(migration, /"vulnerableEffect": "vulnerable"/);
  assert.match(migration, /"statusEffect": "lift"/);
  assert.match(migration, /"stacksApplied": 1/);
  assert.match(migration, /skill\.operator_id = 5[\s\S]*skill\.id = 503/);
  assert.match(migration, /'\{allowSelfTrigger\}'/);
});

test("Mi Fu batch 07C keeps Level-12 values and Qingbo conditions in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_07c_mi_fu.sql", "utf8");

  assert.match(migration, /where id = 2702[^;]*operator_id = 27/s);
  assert.match(migration, /"damageMultiplier":150/);
  assert.match(migration, /"damageMultiplier":200/);
  assert.match(migration, /"damageMultiplier":600/);
  assert.match(migration, /"damageMultiplier":250/);
  assert.match(migration, /"damageMultiplier":700/);
  assert.match(migration, /"requiresConsumedVulnerableStacks":3/);
  assert.match(migration, /"damageAtkMultiplierByStacks":\{"1":3\.0,"2":4\.5,"3":6\.0,"4":7\.5\}/);
  assert.match(migration, /"artsIntensityScaling":true/);
  assert.match(migration, /"operatorLevelScaling":true/);
});

test("combo triggers loaded from Supabase accept legacy string and object JSON shapes", () => {
  const context = createComboEngineContext();
  const stringTrigger = {
    id: 303,
    type: "Combo Skill",
    comboTriggers: "combo_skill"
  };
  const objectTrigger = {
    id: 1303,
    type: "Combo Skill",
    comboTriggers: {
      anyOf: [
        { effect: "enemy_skill_charging", minStacks: 1 },
        { effect: "operator_attacked_low_hp", minStacks: 1 }
      ]
    }
  };

  context.selectedTeam = [3, 13];
  context.operators = [
    { id: 3, skills: [stringTrigger] },
    { id: 13, skills: [objectTrigger] }
  ];

  assert.deepEqual(
    Array.from(context.getComboSkillsFromEffects({ combo_skill: 1 }, 99), skill => skill.id),
    [303]
  );
  assert.deepEqual(
    Array.from(context.getComboSkillsFromEffects({ operator_attacked_low_hp: 1 }, 99), skill => skill.id),
    [1303]
  );
});

test("operator mechanics audit keeps corrected Combo conditions in Supabase SQL", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_01.sql", "utf8");

  assert.match(migration, /"effect":"combo_skill"/);
  assert.match(migration, /"effect":"operator_attacked_low_hp"[^\n]*"hpBelowPercent":40/);
  assert.match(migration, /"effect":"arts_burst"/);
  assert.match(migration, /"effect":"finisher"/);
  assert.match(migration, /operator_id = 19 and id = 1902/);
  assert.match(migration, /operator_id = 19 and id = 1903/);
});

test("Supabase combat events trigger HP-band Combos without persisting as debuffs", () => {
  const context = createComboEngineContext();
  const attackedBelow40 = {
    id: 900003,
    type: "Combat Event",
    shortType: "EVT",
    debuffs: [
      { appliesEffect: "operator_attacked", persistsForCombo: false, transientTrigger: true },
      { appliesEffect: "operator_attacked_below_60", persistsForCombo: false, transientTrigger: true },
      { appliesEffect: "operator_attacked_below_40", persistsForCombo: false, transientTrigger: true }
    ]
  };
  const ember = {
    id: 1703,
    type: "Combo Skill",
    comboTriggers: [{ effect: "operator_attacked", minStacks: 1 }]
  };
  const snowshine = {
    id: 2303,
    type: "Combo Skill",
    comboTriggers: [{ effect: "operator_attacked_below_60", minStacks: 1 }]
  };
  const catcher = {
    id: 1303,
    type: "Combo Skill",
    comboTriggers: { anyOf: [{ effect: "operator_attacked_below_40", minStacks: 1 }] }
  };

  context.selectedTeam = [17, 23, 13];
  context.operators = [
    { id: 17, skills: [ember] },
    { id: 23, skills: [snowshine] },
    { id: 13, skills: [catcher] }
  ];

  const currentEffects = context.collectEffectsFromSkill(attackedBelow40, {});
  assert.deepEqual(
    Object.keys(currentEffects).sort(),
    ["operator_attacked", "operator_attacked_below_40", "operator_attacked_below_60"]
  );
  assert.deepEqual(
    Array.from(context.getComboSkillsFromEffects(currentEffects, 99), skill => skill.id),
    [1703, 2303, 1303]
  );

  const persistentEffects = {};
  context.applySkillEffectsToComboMap(attackedBelow40, persistentEffects, true, false, persistentEffects);
  assert.deepEqual(Object.keys(persistentEffects), []);
});

test("batch 02 stores combat events and HP thresholds in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_02.sql", "utf8");

  assert.match(migration, /create table if not exists public\.simulation_trigger_events/);
  assert.match(migration, /operator_attacked_below_40/);
  assert.match(migration, /operator_attacked_below_60/);
  assert.match(migration, /enemy_skill_charging/);
  assert.match(migration, /stagger_node_hit/);
  assert.match(migration, /operator_id = 17 and id = 1703/);
  assert.match(migration, /operator_id = 23 and id = 2303/);
});

test("Arts Burst is exposed as a generic transient Combo trigger", () => {
  const context = createComboEngineContext();
  const burst = {
    id: "electric-burst-test",
    type: "Arts Burst",
    shortType: "BURST"
  };
  const tangtang = {
    id: 1503,
    type: "Combo Skill",
    comboTriggerMode: "any",
    allowSelfTrigger: true,
    comboTriggers: [
      { effect: "cryo_infliction", minStacks: 1 },
      { effect: "arts_burst", minStacks: 1 }
    ]
  };

  context.selectedTeam = [15];
  context.operators = [{ id: 15, skills: [tangtang] }];

  const burstEffects = context.collectEffectsFromSkill(burst, {});
  assert.equal(burstEffects.arts_burst, 1);
  assert.deepEqual(
    Array.from(context.getComboSkillsFromEffects(burstEffects, 99), skill => skill.id),
    [1503]
  );
});

test("Supabase action rules turn the next basic attack into a Final Strike and consume the pending effect", () => {
  const context = createComboEngineContext();
  const rules = [{
    ruleKey: "next_attack_final_strike",
    actionType: "basic_attack_hit",
    conditions: { allOf: [{ effect: "yvonne_next_attack_final_strike", minStacks: 1 }] },
    consumedEffects: [{ effect: "yvonne_next_attack_final_strike", amount: 1 }],
    emittedEffects: [{ effect: "final_strike", amount: 1 }],
    actionOverride: "final_strike",
    priority: 10,
    stopAfterMatch: true
  }];

  const first = context.resolveSimulationActionRules(
    rules,
    { actionType: "basic_attack_hit" },
    { yvonne_next_attack_final_strike: 1, solidification: 1 }
  );
  assert.equal(first.emittedEffects.final_strike, 1);
  assert.equal(first.effectMap.yvonne_next_attack_final_strike, undefined);
  assert.equal(first.effectMap.solidification, 1);
  assert.equal(first.actionOverride, "final_strike");

  const second = context.resolveSimulationActionRules(
    rules,
    { actionType: "basic_attack_hit" },
    first.effectMap
  );
  assert.deepEqual(Object.keys(second.emittedEffects), []);
});

test("Supabase Finisher action rule consumes Stagger and emits a transient Finisher", () => {
  const context = createComboEngineContext();
  const rules = [{
    ruleKey: "finisher_from_stagger",
    actionType: "basic_attack_hit",
    conditions: { allOf: [{ effect: "stagger", minStacks: 1 }] },
    consumedEffects: [{ effect: "stagger", amount: 1 }],
    emittedEffects: [{ effect: "finisher", amount: 1 }],
    actionOverride: "finisher",
    priority: 20,
    stopAfterMatch: true
  }];

  const resolved = context.resolveSimulationActionRules(
    rules,
    { actionType: "basic_attack_hit" },
    { stagger: 1, electric_infliction: 2 }
  );
  assert.equal(resolved.emittedEffects.finisher, 1);
  assert.equal(resolved.effectMap.stagger, undefined);
  assert.equal(resolved.effectMap.electric_infliction, 2);
});

test("auto-inserted Combo chains follow the selected team from left to right", () => {
  const context = createComboEngineContext();
  const firstSlotCombo = {
    id: 103,
    type: "Combo Skill",
    comboTriggers: [{ effect: "second_wave", minStacks: 1 }]
  };
  const secondSlotCombo = {
    id: 203,
    type: "Combo Skill",
    comboTriggers: [{ effect: "second_wave", minStacks: 1 }]
  };
  const startSkill = {
    id: 302,
    type: "Battle Skill",
    debuffs: [{ appliesEffect: "first_wave", persistsForCombo: true }]
  };
  const lastSlotCombo = {
    id: 303,
    type: "Combo Skill",
    allowSelfTrigger: true,
    comboTriggers: [{ effect: "first_wave", minStacks: 1 }],
    debuffs: [{ appliesEffect: "second_wave", persistsForCombo: true }]
  };

  context.selectedTeam = [1, 2, 3];
  context.operators = [
    { id: 1, skills: [firstSlotCombo] },
    { id: 2, skills: [secondSlotCombo] },
    { id: 3, skills: [startSkill, lastSlotCombo] }
  ];
  context.rotation = [{ uid: "manual", id: startSkill.id }];

  context.insertComboChain(startSkill.id, 0);

  assert.deepEqual(
    Array.from(context.rotation, entry => entry.id),
    [302, 103, 203, 303]
  );
});

test("batch 04 stores action conditions and Zhuang's Finisher trigger in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_04.sql", "utf8");

  assert.match(migration, /create table if not exists public\.simulation_action_rules/);
  assert.match(migration, /next_attack_final_strike/);
  assert.match(migration, /yvonne_next_attack_final_strike/);
  assert.match(migration, /finisher_from_stagger/);
  assert.match(migration, /enemy_staggered/);
  assert.match(migration, /"effect":"finisher"/);
  assert.match(migration, /where operator_id = 9 and id = 903/);
});
