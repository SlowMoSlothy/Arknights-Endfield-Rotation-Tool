import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function createContext({ team, rules, potential = 0, intellect = 0, will = 0 }) {
  const context = {
    window: {},
    console,
    selectedTeam: team,
    operatorPassiveRules: rules,
    operators: [
      { id: 1, name: "Laevatain", elementType: "heat" },
      { id: 2, name: "Akekuri", elementType: "heat" },
      { id: 10, name: "Alesh", elementType: "cryo" },
      { id: 18, name: "Estella", elementType: "physical" },
      { id: 27, name: "Mi Fu", elementType: "physical" },
      { id: 28, name: "Arcane", elementType: "nature" },
      { id: 17, name: "Ember", elementType: "heat" }
    ],
    getOperatorLoadout: () => ({ operatorPotential: potential }),
    getOperatorSimulationLoadoutStats: () => ({ intellect, will })
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/operatorPassiveEngine.js", "utf8"), context);
  return context;
}

test("attribute variants select database overrides from current loadout stats", () => {
  const skill = {
    id: 2802,
    operatorId: 28,
    damageProfile: { atkMultiplier: 5, element: "nature" },
    attributeVariants: [
      { key: "intellect", condition: { leftStat: "intellect", comparison: "gte", rightStat: "will" }, actionOverride: { damageProfile: { atkMultiplier: 5 } } },
      { key: "will", condition: { leftStat: "will", comparison: "gt", rightStat: "intellect" }, actionOverride: { damageProfile: { atkMultiplier: 3 }, debuffs: [{ appliesEffect: "pull" }] } }
    ]
  };

  const intellectContext = createContext({ team: [28], rules: [], intellect: 176, will: 121 });
  const willContext = createContext({ team: [28], rules: [], intellect: 100, will: 180 });
  assert.equal(intellectContext.window.resolveSimulationAttributeVariant(skill, 28).attributeVariantKey, "intellect");
  const resolvedWill = willContext.window.resolveSimulationAttributeVariant(skill, 28);
  assert.equal(resolvedWill.attributeVariantKey, "will");
  assert.equal(resolvedWill.damageProfile.atkMultiplier, 3);
  assert.equal(resolvedWill.debuffs[0].appliesEffect, "pull");
});

test("Akekuri's Supabase talent rule scales Combo SP recovery from Intellect", () => {
  const context = createContext({
    team: [2],
    intellect: 120,
    rules: [{
      ruleKey: "akekuri-cheer",
      operatorId: 2,
      name: "Cheer of Victory",
      resolutionType: "action_modifier",
      conditions: { skillIds: [203] },
      effect: { spRecoveryStatScaling: { stat: "intellect", perPoints: 10, percentPerStep: 1.5, maxPercent: 75 } },
      enabled: true
    }]
  });

  const [event] = context.window.resolveSimulationOperatorPassives([{
    time: 2,
    sourceOperatorId: 2,
    skillData: { id: 203, operatorId: 2, name: "Flash and Dash", spRecovery: { amount: 15 } }
  }]);

  assert.equal(event.skillData.spRecovery.passiveBonusPercent, 18);
  assert.equal(event.skillData.spRecovery.amount, 17.7);
  assert.equal(event.operatorPassiveModifiers[0], "akekuri-cheer");
});

test("Ember's attacked trigger creates a talent proc carrying the database buff", () => {
  const context = createContext({
    team: [17],
    rules: [{
      ruleKey: "ember-attacked",
      operatorId: 17,
      name: "Pay the Ferric Price",
      ruleType: "talent",
      resolutionType: "triggered_effect",
      trigger: { effects: ["operator_attacked"], controlledOperatorOnly: true },
      effect: { actionOverride: { buffs: [{ appliesEffect: "ember_atk", atkPercent: 9 }] } },
      enabled: true
    }]
  });

  const events = context.window.resolveSimulationOperatorPassives([{
    time: 3,
    order: 1,
    sourceOperatorId: null,
    skillData: { name: "Enemy Attack", debuffs: [{ appliesEffect: "operator_attacked" }] }
  }]);

  assert.equal(events.length, 2);
  assert.equal(events[1].operatorPassiveRuleId, "ember-attacked");
  assert.equal(events[1].sourceOperatorId, 17);
  assert.equal(events[1].skillData.buffs[0].atkPercent, 9);
});

test("potential rules stay disabled until the selected operator reaches the required Potential", () => {
  const rule = {
    ruleKey: "akekuri-p1",
    operatorId: 2,
    name: "Positive Feedback",
    ruleType: "potential",
    resolutionType: "triggered_effect",
    minimumPotential: 1,
    trigger: { effects: ["sp_recovery"], sourceOperatorOnly: true },
    effect: { actionOverride: { buffs: [{ appliesEffect: "akekuri_atk", atkPercent: 10 }] } },
    enabled: true
  };
  const trigger = [{
    time: 1,
    sourceOperatorId: 2,
    skillData: { operatorId: 2, buffs: [{ appliesEffect: "sp_recovery" }] }
  }];

  assert.equal(createContext({ team: [2], rules: [rule], potential: 0 })
    .window.resolveSimulationOperatorPassives(trigger).length, 1);
  assert.equal(createContext({ team: [2], rules: [rule], potential: 1 })
    .window.resolveSimulationOperatorPassives(trigger).length, 2);
});

test("Mi Fu's World Splitter modifier waits for an active enemy condition", () => {
  const context = createContext({ team: [27], rules: [{
    ruleKey: "mi-fu-stern-crackdown", operatorId: 27, resolutionType: "action_modifier",
    conditions: { skillIds: [2706], enemyEffectsAny: ["physical_susceptibility", "stagger"] },
    effect: { damageMultiplier: 1.2 }, enabled: true
  }] });
  const event = { sourceOperatorId: 27, skillData: { id: 2706, damageProfile: { atkMultiplier: 4 } } };
  assert.equal(context.window.resolveSimulationOperatorPassiveActionModifiers([event])[0].skillData.damageProfile.atkMultiplier, 4);
  const modified = context.window.resolveSimulationOperatorPassiveActionModifiers([{
    ...event, activeDebuffsBefore: [{ appliesEffect: "physical_susceptibility" }]
  }])[0];
  assert.equal(modified.skillData.damageProfile.atkMultiplier, 4.8);
});

test("Alesh Rare Fin uses a deterministic expected-value model scaled by Intellect", () => {
  const context = createContext({ team: [10], intellect: 120, rules: [{
    ruleKey: "alesh-rare-fin", operatorId: 10, name: "Veteran Angler", resolutionType: "action_modifier",
    conditions: { skillIds: [1003] }, effect: { randomVariant: {
      baseChancePercent: 10,
      chanceStatScaling: { stat: "intellect", perPoints: 10, percentPerStep: 0.5, maxPercent: 30 },
      baseAtkMultiplier: 3, variantAtkMultiplier: 4.8, baseSpRecovery: 15, variantBonusSpRecovery: 10
    } }, enabled: true
  }] });
  const [event] = context.window.resolveSimulationOperatorPassiveActionModifiers([{
    sourceOperatorId: 10, skillData: { id: 1003, damageProfile: { atkMultiplier: 3 } }
  }]);
  assert.equal(event.skillData.damageProfile.variantChancePercent, 16);
  assert.equal(event.skillData.damageProfile.atkMultiplier, 3.288);
  assert.equal(event.skillData.spRecovery.amount, 16.6);
});

test("Laevatain's state rule procs only after the fourth Melting Flame", () => {
  const context = createContext({ team: [1], rules: [{
    ruleKey: "laevatain-four-flames", operatorId: 1, name: "Scorching Heart", resolutionType: "triggered_effect",
    trigger: { effects: ["melting_flames"], sourceOperatorOnly: true, minimumEffectStacks: { effect: "melting_flames", stacks: 4 } },
    effect: { actionOverride: { buffs: [{ appliesEffect: "scorching_heart" }] } }, enabled: true
  }] });
  const makeEvent = stacks => ({
    time: stacks, sourceOperatorId: 1, skillData: { buffs: [{ appliesEffect: "melting_flames" }] },
    activeBuffs: [{ appliesEffect: "melting_flames", currentStacks: stacks }]
  });
  assert.equal(context.window.resolveSimulationOperatorPassiveStateProcs([makeEvent(3)]).length, 0);
  assert.equal(context.window.resolveSimulationOperatorPassiveStateProcs([makeEvent(4)]).length, 1);
});

test("maximum Potential lets a replacement passive supersede its base version", () => {
  const rules = [{
    ruleKey: "base-shield", operatorId: 27, resolutionType: "triggered_effect",
    minimumPotential: 0, maximumPotential: 2,
    trigger: { skillIds: [2703], sourceOperatorOnly: true },
    effect: { actionOverride: { sustainProfile: { shield: { durationSeconds: 10 } } } }, enabled: true
  }];
  const event = [{ sourceOperatorId: 27, skillData: { id: 2703 } }];
  assert.equal(createContext({ team: [27], rules, potential: 2 }).window.resolveSimulationOperatorPassives(event).length, 2);
  assert.equal(createContext({ team: [27], rules, potential: 3 }).window.resolveSimulationOperatorPassives(event).length, 1);
});

test("Batch 07B keeps operator-specific mechanics in the Supabase migration", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_07b_passives.sql", "utf8");
  const engine = fs.readFileSync("endfield/js/logic/operatorPassiveEngine.js", "utf8");

  assert.match(migration, /estella_commiseration_lv2/);
  assert.match(migration, /laevatain_scorching_heart_lv2/);
  assert.match(migration, /alesh_veteran_angler_lv2/);
  assert.match(migration, /mi_fu_stern_crackdown_lv2/);
  assert.match(migration, /"minimumEffectStacks":\{"effect":"melting_flames","stacks":4\}/);
  assert.doesNotMatch(engine, /Estella|Laevatain|Alesh|Mi Fu|melting_flames|physical_susceptibility/);
});

test("Batch 08 keeps new operator mechanics and pre-release uncertainty in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_08_new_operators.sql", "utf8");
  const iconPatch = fs.readFileSync("supabase/operator_mechanics_audit_batch_08_skill_icons.sql", "utf8");
  const engine = fs.readFileSync("endfield/js/logic/operatorPassiveEngine.js", "utf8");

  assert.match(migration, /'arcane', 'Arcane'/);
  assert.match(migration, /'camille', 'Camille'/);
  assert.match(migration, /'liino', 'Liino'/);
  assert.match(migration, /"attributeVariants"/);
  assert.match(migration, /camille_hunter_pursuit/);
  assert.match(migration, /"dataStatus":"pre_release"/);
  assert.match(migration, /3003[\s\S]*"comboTriggerMode":"all"/);
  assert.match(migration, /skills\/arcane\/jadecrushing-grid\.png/);
  assert.match(migration, /skills\/camille\/heartstake-thorn\.png/);
  assert.match(iconPatch, /jsonb_build_object/);
  assert.match(iconPatch, /where public\.operator_skills\.id = values_map\.skill_id/);
  assert.match(iconPatch, /900028, 'assets\/operators\/skills\/shared\/dive_attack\.png'/);
  assert.doesNotMatch(migration, /shared\/dive_attack\.svg/);
  assert.doesNotMatch(engine, /Arcane|Camille|Liino|Jadecrushing|Hunter Pursuit|Vocalist Stance/);
});
