import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const weaponLoadoutScript = fs.readFileSync("endfield/js/logic/weaponLoadout.js", "utf8");
const weaponPassiveEngineScript = fs.readFileSync("endfield/js/logic/weaponPassiveEngine.js", "utf8");
const weaponPassiveSimulationScript = fs.readFileSync("endfield/js/logic/weaponPassiveSimulation.js", "utf8");
const weaponPassiveIntegrationScript = fs.readFileSync("endfield/js/logic/weaponPassiveIntegration.js", "utf8");
const weaponAtkChartScript = fs.readFileSync("endfield/js/ui/weaponAtkChart.js", "utf8");
const damageBreakdownScript = fs.readFileSync("endfield/js/logic/damageBreakdown.js", "utf8");
const rotationGridScript = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
const shareCodeScript = fs.readFileSync("endfield/js/logic/shareCode.js", "utf8");
const skillsPanelScript = fs.readFileSync("endfield/js/ui/skillsPanel.js", "utf8");
const supabaseClientScript = fs.readFileSync("endfield/supabaseClient.js", "utf8");
const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const loadoutCss = fs.readFileSync("endfield/loadout.css", "utf8");
const atkChartCss = fs.readFileSync("endfield/atk-chart.css", "utf8");

function createLocalStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function createWeaponContext() {
  const context = {
    console,
    localStorage: createLocalStorage(),
    selectedTeam: [8, null, null, null],
    operators: [
      { id: 8, name: "Antal", weaponType: "arts_unit", baseAtk: 300, mainAttribute: "Intellect", skills: [] },
      { id: 12, name: "Ardelia", weaponType: "arts_unit", baseAtk: 320, mainAttribute: "Intellect", skills: [] },
      { id: 10, name: "Alesh", weaponType: "sword", skills: [] }
    ],
    weapons: [
      { key: "lone_barge", name: "Lone Barge", weaponType: "arts_unit", rarity: 6, baseAtk: 510, baseStatsLevel: 90, passiveName: "Test Passive" },
      { key: "finishing_call", name: "Finishing Call", weaponType: "arts_unit", rarity: 5, baseAtk: 411, baseStatsLevel: 90 },
      { key: "wave_tide", name: "Wave Tide", weaponType: "sword", rarity: 4, baseAtk: 341, baseStatsLevel: 90 }
    ],
    weaponEssenceProfiles: [
      {
        weaponKey: "lone_barge", primaryLabel: "Intellect", primaryValues: [10, 20, 30, 40, 50, 60, 70, 80, 90], primaryIsPercent: false,
        secondaryLabel: "Attack", secondaryValues: [1, 2, 3, 4, 5, 6, 7, 8, 9], secondaryIsPercent: true,
        skillName: "Test Passive", skillDescriptions: ["Rank 1", "Rank 2", "Rank 3", "Rank 4"],
        primaryBaseRanks: [1, 2, 2, 3, 3], secondaryBaseRanks: [1, 1, 2, 2, 3],
        primaryMaxEssence: 6, secondaryMaxEssence: 6, skillMaxEssence: 4
      },
      {
        weaponKey: "finishing_call", primaryLabel: "Intellect", primaryValues: [10, 20, 30], primaryIsPercent: false,
        secondaryLabel: null, secondaryValues: [], secondaryIsPercent: false,
        skillName: "Test Passive", skillDescriptions: ["Rank 1", "Rank 2"],
        primaryBaseRanks: [1, 1, 1, 2, 2], secondaryBaseRanks: [0, 0, 0, 0, 0],
        primaryMaxEssence: 1, secondaryMaxEssence: 0, skillMaxEssence: 2
      }
    ],
    operatorLoadouts: {},
    uiSettings: {
      timelineMode: "simulation",
      simulationSpPerSecond: 8,
      simulationDurationSeconds: null,
      simulationDamageMode: "expected"
    }
  };
  context.window = context;
  context.isSimulationTimelineMode = () => context.uiSettings.timelineMode === "simulation";

  vm.createContext(context);
  vm.runInContext(weaponPassiveEngineScript, context);
  vm.runInContext(weaponLoadoutScript, context);
  return context;
}

function createWeaponPassiveContext() {
  const context = {
    console,
    selectedTeam: [1, 2, null, null],
    uiSettings: { timelineMode: "simulation" },
    getOperatorSimulationLoadoutStats(operatorId) {
      const loadouts = {
        1: {
          operatorId: 1,
          weaponKey: "sundered_prince",
          weaponName: "Sundered Prince",
          weaponIcon: "sundered.png",
          totalAtk: 500,
          passive: { name: "Crusher: Princely Deterrence", rank: 1 }
        },
        2: {
          operatorId: 2,
          weaponKey: "wave_tide",
          weaponName: "Wave Tide",
          weaponIcon: "wave.png",
          totalAtk: 400,
          passive: { name: "Pursuit: Unending Cycle", rank: 1 }
        }
      };
      return loadouts[operatorId] || null;
    },
    getSimulationEventOperatorId: event => event.sourceOperatorId,
    getSimulationOperatorName: operatorId => operatorId === 1 ? "Mi Fu" : "Pogranichnik",
    isComboSkillData: skill => skill?.shortType === "CS",
    isBattleSkillData: skill => skill?.shortType === "BS",
    isUltimateSkillData: skill => skill?.shortType === "Ult"
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponPassiveEngineScript, context);
  vm.runInContext(weaponPassiveSimulationScript, context);
  return context;
}

function createCustomWeaponPassiveContext(loadouts, selectedTeam = Object.keys(loadouts).map(Number)) {
  const context = {
    console,
    selectedTeam,
    uiSettings: { timelineMode: "simulation" },
    getOperatorSimulationLoadoutStats: operatorId => loadouts[operatorId] || null,
    getSimulationEventOperatorId: event => event.sourceOperatorId,
    getSimulationOperatorName: operatorId => `Operator ${operatorId}`,
    isComboSkillData: skill => skill?.shortType === "CS",
    isBattleSkillData: skill => skill?.shortType === "BS",
    isUltimateSkillData: skill => skill?.shortType === "Ult"
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponPassiveEngineScript, context);
  vm.runInContext(weaponPassiveSimulationScript, context);
  return context;
}

test("weapon Potential and Essence allocations stay attached when switching operators", () => {
  const context = createWeaponContext();

  assert.equal(context.setEquippedWeaponForOperator(8, "lone_barge"), true);
  assert.equal(context.setWeaponPotentialForOperator(8, 5), true);
  assert.equal(context.setWeaponEssenceForOperator(8, "primary", 4), true);
  assert.equal(context.setWeaponEssenceForOperator(8, "skill", 2), true);
  context.selectedTeam[0] = 12;
  assert.equal(context.setEquippedWeaponForOperator(12, "finishing_call"), true);
  context.selectedTeam[0] = 8;

  assert.equal(context.getEquippedWeaponKey(8), "lone_barge");
  assert.equal(context.getEquippedWeaponPotential(8), 5);
  assert.deepEqual(JSON.parse(JSON.stringify(context.getEquippedWeaponEssence(8))), { primary: 4, secondary: 0, skill: 2 });
  assert.equal(context.getEquippedWeaponKey(12), "finishing_call");

  const activation = context.getWeaponActivationState(8);
  assert.equal(activation.primary.rank, 7);
  assert.equal(activation.primary.value, 70);
  assert.equal(activation.skill.rank, 3);
  assert.equal(activation.skill.description, "Rank 3");

  const saved = JSON.parse(context.localStorage.getItem("operatorLoadouts"));
  assert.equal(saved[8].weapon.key, "lone_barge");
  assert.equal(saved[8].weapon.potential, 5);
  assert.equal(saved[8].weapon.essence.primary, 4);
  assert.equal(saved[8].weapon.essence.skill, 2);
  assert.equal(saved[12].weapon.key, "finishing_call");
});

test("an operator can switch directly between compatible weapons", () => {
  const context = createWeaponContext();

  assert.equal(context.setEquippedWeaponForOperator(8, "lone_barge"), true);
  assert.equal(context.getEquippedWeaponKey(8), "lone_barge");

  assert.equal(context.setEquippedWeaponForOperator(8, "finishing_call"), true);
  assert.equal(context.getEquippedWeaponKey(8), "finishing_call");
  assert.equal(context.getEquippedWeapon(8).name, "Finishing Call");

  const saved = JSON.parse(context.localStorage.getItem("operatorLoadouts"));
  assert.equal(saved[8].weapon.key, "finishing_call");
});
test("legacy weapon-only local storage migrates to the extensible loadout format", () => {
  const context = createWeaponContext();
  context.localStorage.setItem("operatorWeaponLoadouts", JSON.stringify({ 8: "lone_barge" }));

  context.loadOperatorLoadouts();

  assert.equal(context.getEquippedWeaponKey(8), "lone_barge");
  assert.equal(context.getEquippedWeaponPotential(8), 1);
  assert.deepEqual(JSON.parse(JSON.stringify(context.getEquippedWeaponEssence(8))), { primary: 0, secondary: 0, skill: 0 });
  assert.equal(context.localStorage.getItem("operatorWeaponLoadouts"), null);
  assert.equal(JSON.parse(context.localStorage.getItem("operatorLoadouts"))[8].weapon.key, "lone_barge");
});

test("operators can equip only weapons matching their weapon type", () => {
  const context = createWeaponContext();

  assert.equal(context.setEquippedWeaponForOperator(8, "wave_tide"), false);
  assert.equal(context.getEquippedWeaponKey(8), null);
  assert.deepEqual(
    Array.from(context.getCompatibleWeaponsForOperator(8), weapon => weapon.key),
    ["lone_barge", "finishing_call"]
  );
});

test("weapon rarity renders as stars instead of a numeric star label", () => {
  const context = createWeaponContext();
  assert.equal(context.getWeaponRarityStars(context.weapons[0]), "\u2605\u2605\u2605\u2605\u2605\u2605");
  assert.equal(context.getWeaponRarityStars(context.weapons[1]), "\u2605\u2605\u2605\u2605\u2605");
  assert.doesNotMatch(weaponLoadoutScript, /\$\{Number\(weapon\.rarity\)[^\n]*-star/);
});

test("weapon Potential and Essence allocations are shared only in Simulation Mode", () => {
  const context = createWeaponContext();
  context.rotation = [{ id: 801, type: "skill", time: 0 }];
  context.operatorUltimateStates = {};
  context.DEFAULT_SIMULATION_SP_PER_SECOND = 8;
  context.BASIC_ATTACK_ACTION_TYPE = "basic_attack";
  context.btoa = value => Buffer.from(value, "binary").toString("base64");
  context.atob = value => Buffer.from(value, "base64").toString("binary");

  vm.runInContext(shareCodeScript, context);
  context.setEquippedWeaponForOperator(8, "lone_barge");
  context.setWeaponPotentialForOperator(8, 5);
  context.setWeaponEssenceForOperator(8, { primary: 4, secondary: 3, skill: 2 });
  context.getSelectedEnemy = () => ({ id: "boss_dummy" });

  const simulationCode = context.createBuildShareCode();
  const simulationPayload = context.parseBuildShareCode(simulationCode);
  assert.doesNotMatch(simulationCode, /^AERT\d+:/);
  const displayCode = context.getDisplayBuildShareCode(simulationCode);
  assert.doesNotMatch(displayCode, /^AERT\d+:/);
  assert.equal(context.decodeShareBytes(displayCode)[0], 10);
  assert.equal(context.parseBuildShareCode(displayCode).v, 10);
  context.location = { protocol: "https:", origin: "https://rotationforge.gg", pathname: "/endfield/" };
  const shareLink = context.createBuildShareLink();
  assert.match(shareLink, /^https:\/\/rotationforge\.gg\/endfield\/#setup=/);
  assert.doesNotMatch(shareLink, /AERT\d+/);
  assert.equal(simulationPayload.operatorLoadouts[8].weapon.key, "lone_barge");
  assert.equal(simulationPayload.operatorLoadouts[8].weapon.potential, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(simulationPayload.operatorLoadouts[8].weapon.essence)), { primary: 4, secondary: 3, skill: 2 });
  assert.equal(simulationPayload.enemyId, "boss_dummy");
  assert.equal(simulationPayload.uiSettings.simulationDamageMode, "expected");

  context.uiSettings.simulationDamageMode = "critical";
  assert.equal(context.parseBuildShareCode(context.createBuildShareCode()).uiSettings.simulationDamageMode, "critical");
  context.uiSettings.simulationDamageMode = "normal";
  assert.equal(context.parseBuildShareCode(context.createBuildShareCode()).uiSettings.simulationDamageMode, "normal");
  context.uiSettings.simulationDamageMode = "expected";

  const v9Bytes = context.createCompactShareBytesV9();
  assert.equal(context.parseBuildShareCode(`AERT9:${context.encodeShareBytes(v9Bytes)}`).v, 9);

  const v8Bytes = context.createCompactShareBytes();
  const v8DisplayCode = context.encodeShareBytes([8, ...v8Bytes]);
  assert.ok(simulationCode.length < v8DisplayCode.length, `${simulationCode.length} should be shorter than ${v8DisplayCode.length}`);
  assert.equal(context.parseBuildShareCode(`AERT8:${context.encodeShareBytes(v8Bytes)}`).v, 8);
  const legacyV7Bytes = [...v8Bytes];
  legacyV7Bytes.splice(-3, 3);
  const legacyV7Payload = context.parseBuildShareCode(`AERT7:${context.encodeShareBytes(legacyV7Bytes)}`);
  assert.equal(legacyV7Payload.v, 7);
  assert.equal(legacyV7Payload.operatorLoadouts[8].weapon.essence, 5);

  context.uiSettings.timelineMode = "slot";
  assert.equal(context.setEquippedWeaponForOperator(12, "finishing_call"), false);
  const slotCode = context.createBuildShareCode();
  const slotPayload = context.parseBuildShareCode(slotCode);
  assert.deepEqual(JSON.parse(JSON.stringify(slotPayload.operatorLoadouts)), {});

  const v8SlotBytes = context.createCompactShareBytes();
  const legacyV6Payload = context.parseBuildShareCode(`AERT6:${context.encodeShareBytes(v8SlotBytes)}`);
  assert.equal(legacyV6Payload.v, 6);
  assert.deepEqual(JSON.parse(JSON.stringify(legacyV6Payload.operatorWeaponLoadouts)), {});

  const legacyV5Bytes = [...v8SlotBytes];
  legacyV5Bytes.pop();
  const legacyV5Payload = context.parseBuildShareCode(`AERT5:${context.encodeShareBytes(legacyV5Bytes)}`);
  assert.equal(legacyV5Payload.v, 5);
  assert.equal(legacyV5Payload.operatorWeaponLoadouts, undefined);
});

test("packed share keys round-trip weapon names containing digits", () => {
  const context = createWeaponContext();
  context.btoa = value => Buffer.from(value, "binary").toString("base64");
  context.atob = value => Buffer.from(value, "base64").toString("binary");
  vm.runInContext(shareCodeScript, context);

  const bytes = [];
  context.writePackedShareKey(bytes, "tarr_11");
  assert.equal(context.readPackedShareKey({ bytes, index: 0 }), "tarr_11");
});
test("Essence allocations clamp to the activation profile caps", () => {
  const context = createWeaponContext();
  context.setEquippedWeaponForOperator(8, "lone_barge");
  context.setWeaponPotentialForOperator(8, 1);
  context.setWeaponEssenceForOperator(8, { primary: 99, secondary: 99, skill: 99 });

  assert.deepEqual(JSON.parse(JSON.stringify(context.getEquippedWeaponEssence(8))), { primary: 6, secondary: 6, skill: 3 });
  const activation = context.getWeaponActivationState(8);
  assert.equal(activation.primary.rank, 7);
  assert.equal(activation.secondary.rank, 7);
  assert.equal(activation.skill.rank, 4);

  context.setWeaponPotentialForOperator(8, 5);
  assert.equal(context.getWeaponActivationState(8).primary.rank, 9);
});
test("Simulation combat stats combine operator ATK, weapon ATK and Essence bonuses", () => {
  const context = createWeaponContext();
  context.setEquippedWeaponForOperator(8, "lone_barge");
  context.setWeaponPotentialForOperator(8, 5);
  context.setWeaponEssenceForOperator(8, { primary: 4, secondary: 3, skill: 2 });

  const stats = context.getOperatorSimulationLoadoutStats(8);
  assert.equal(stats.operatorBaseAtk, 300);
  assert.equal(stats.weaponBaseAtk, 510);
  assert.equal(stats.atkPercentBonus, 6);
  assert.equal(stats.totalAtk, 858.6);
  assert.deepEqual(JSON.parse(JSON.stringify(stats.mainAttributeBonus)), { label: "Intellect", value: 70, isPercent: false });
  assert.deepEqual(JSON.parse(JSON.stringify(stats.passive)), { name: "Test Passive", rank: 3, description: "Rank 3" });
});

test("Simulation combat stats include Crit Rate from weapon Essence", () => {
  const context = createWeaponContext();
  const profile = context.weaponEssenceProfiles.find(item => item.weaponKey === "lone_barge");
  profile.secondaryLabel = "Crit Rate";
  profile.secondaryValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  profile.secondaryIsPercent = true;
  context.setEquippedWeaponForOperator(8, "lone_barge");
  context.setWeaponPotentialForOperator(8, 1);
  context.setWeaponEssenceForOperator(8, { primary: 0, secondary: 3, skill: 0 });

  const stats = context.getOperatorSimulationLoadoutStats(8);
  assert.equal(stats.baseCritRatePercent, 5);
  assert.equal(stats.critRateBonusPercent, 4);
  assert.equal(stats.critRatePercent, 9);
  assert.equal(stats.critDamagePercent, 50);
});
test("Simulation combat stats combine operator Crit bases with weapon and Essence bonuses", () => {
  const context = createWeaponContext();
  const operator = context.operators.find(item => item.id === 8);
  const weapon = context.weapons.find(item => item.key === "lone_barge");
  const profile = context.weaponEssenceProfiles.find(item => item.weaponKey === "lone_barge");
  operator.baseCritRatePercent = 8;
  operator.baseCritDamagePercent = 60;
  weapon.critRateBonusPercent = 2;
  weapon.critDamageBonusPercent = 10;
  profile.secondaryLabel = "Crit Rate";
  profile.secondaryValues = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  profile.secondaryIsPercent = true;
  context.setEquippedWeaponForOperator(8, "lone_barge");
  context.setWeaponEssenceForOperator(8, { primary: 0, secondary: 3, skill: 0 });

  const stats = context.getOperatorSimulationLoadoutStats(8);
  assert.equal(stats.baseCritRatePercent, 8);
  assert.equal(stats.baseCritDamagePercent, 60);
  assert.equal(stats.critRateBonusPercent, 6);
  assert.equal(stats.critDamageBonusPercent, 10);
  assert.equal(stats.critRatePercent, 14);
  assert.equal(stats.critDamagePercent, 70);
});
test("Simulation combat stats expose elemental DMG bonuses from weapon Essence", () => {
  const context = createWeaponContext();
  const profile = context.weaponEssenceProfiles.find(item => item.weaponKey === "lone_barge");
  profile.secondaryLabel = "Physical DMG Bonus";
  profile.secondaryValues = [4, 6, 8, 10, 12, 14, 16, 18, 20];
  profile.secondaryIsPercent = true;
  context.setEquippedWeaponForOperator(8, "lone_barge");
  context.setWeaponPotentialForOperator(8, 1);
  context.setWeaponEssenceForOperator(8, { primary: 0, secondary: 2, skill: 0 });

  const stats = context.getOperatorSimulationLoadoutStats(8);
  assert.equal(stats.elementDamageBonuses.physical, 8);
  assert.equal(stats.elementDamageBonuses.heat, 0);
  assert.equal(stats.allDamageBonusPercent, 0);
});
test("Simulation still applies weapon ATK when no Essence profile exists", () => {
  const context = createWeaponContext();
  context.setEquippedWeaponForOperator(8, "finishing_call");
  context.weaponEssenceProfiles = [];

  const stats = context.getOperatorSimulationLoadoutStats(8);
  assert.equal(stats.operatorBaseAtk, 300);
  assert.equal(stats.weaponBaseAtk, 411);
  assert.equal(stats.totalAtk, 711);
  assert.equal(stats.mainAttributeBonus, null);
});
test("verified weapon passives add static ATK bonuses by activation rank", () => {
  const context = createWeaponContext();
  context.weapons.push({
    key: "tarr_11", name: "Tarr 11", weaponType: "arts_unit", rarity: 4,
    baseAtk: 283, passiveName: "Assault: Armament Prep"
  });
  context.weaponEssenceProfiles.push({
    weaponKey: "tarr_11", primaryLabel: null, primaryValues: [], primaryIsPercent: false,
    secondaryLabel: null, secondaryValues: [], secondaryIsPercent: false,
    skillName: "Assault: Armament Prep", skillDescriptions: ["R1", "R2", "R3", "R4"],
    primaryBaseRanks: [0, 0, 0, 0, 0], secondaryBaseRanks: [0, 0, 0, 0, 0],
    primaryMaxEssence: 0, secondaryMaxEssence: 0, skillMaxEssence: 4
  });
  context.setEquippedWeaponForOperator(8, "tarr_11");
  context.setWeaponEssenceForOperator(8, "skill", 2);

  const stats = context.getOperatorSimulationLoadoutStats(8);
  assert.equal(stats.passiveStaticBonuses.flatAtk, 17);
  assert.equal(stats.flatAtkBonus, 17);
  assert.equal(stats.totalAtk, 600);
});

test("verified weapon rules expose static and timed elemental damage bonuses", () => {
  const context = createWeaponPassiveContext();

  const exemplarStatic = context.getWeaponPassiveStaticBonuses("exemplar", 2);
  assert.equal(exemplarStatic.elementDamageBonuses.physical, 12);
  assert.equal(exemplarStatic.verified, true);

  const exemplarTrigger = context.getWeaponPassiveTriggerEffects("exemplar", 2, "battle_skill")[0];
  assert.equal(exemplarTrigger.elementDamageBonuses.physical, 12);
  assert.equal(exemplarTrigger.duration, 30);
  assert.equal(exemplarTrigger.maxStacks, 3);

  const scatheStatic = context.getWeaponPassiveStaticBonuses("forgeborn_scathe", 3);
  assert.equal(scatheStatic.elementDamageBonuses.heat, 22.4);
  const scatheTrigger = context.getWeaponPassiveTriggerEffects("forgeborn_scathe", 2, "ultimate")[0];
  assert.equal(scatheTrigger.skillDamageBonuses.basicAttack, 90);
  assert.equal(context.getWeaponPassiveStaticBonuses("artzy_tyrannical", 1).elementDamageBonuses.cryo, 16);
  assert.equal(context.getWeaponPassiveStaticBonuses("brigands_calling", 2).elementDamageBonuses.cryo, 19.2);
  assert.equal(context.getWeaponPassiveStaticBonuses("aspirant", 3).skillDamageBonuses.ultimate, 22.4);
});

test("conditional passive rules require their declared effect transitions", () => {
  const context = createWeaponPassiveContext();
  assert.equal(context.getWeaponPassiveTriggerEffects(
    "flickers_in_the_mist", 1, "buff_gained", { gainedBuffKeys: [] }
  ).length, 0);
  assert.equal(context.getWeaponPassiveTriggerEffects(
    "flickers_in_the_mist", 1, "buff_gained", { gainedBuffKeys: ["electric_amp"] }
  )[0].elementDamageBonuses.electric, 5.5);
  assert.equal(context.getWeaponPassiveTriggerEffects(
    "rapid_ascent", 1, "battle_skill", { enemyEffectKeysBefore: ["stagger"] }
  ).length, 2);
});

test("Electric Amp grants separately timed Flickers in the Mist stacks", () => {
  const context = createCustomWeaponPassiveContext({
    1: {
      operatorId: 1,
      weaponKey: "flickers_in_the_mist",
      weaponName: "Flickers in the Mist",
      totalAtk: 500,
      passive: { name: "Efficacy: Overlapping Flickers", rank: 1 }
    }
  });
  const events = [{
    time: 1,
    order: 0,
    sourceOperatorId: 1,
    skillData: { shortType: "BS" },
    activeBuffsBefore: [],
    activeBuffs: [{ id: "electric_amp", currentStacks: 1 }]
  }, {
    time: 2,
    order: 1,
    sourceOperatorId: 1,
    skillData: { shortType: "BS" },
    activeBuffsBefore: [{ id: "electric_amp", currentStacks: 1 }],
    activeBuffs: [{ id: "electric_amp", currentStacks: 2 }]
  }, {
    time: 3,
    order: 2,
    sourceOperatorId: 1,
    skillData: { shortType: "BS" },
    activeBuffsBefore: [{ id: "electric_amp", currentStacks: 2 }],
    activeBuffs: [{ id: "electric_amp", currentStacks: 2 }]
  }];

  const result = context.enrichSimulationSkillEventsWithWeaponPassives(events, [], 1, 40);
  assert.equal(result.events[2].weaponPassiveStateBefore.effects.length, 2);
  assert.deepEqual(
    Array.from(result.events[2].weaponPassiveStateBefore.effects, effect => effect.expiresAt),
    [31, 32]
  );
});

test("Lift stores Physical DMG stacks for Aspirant and consumes them on the next Ultimate", () => {
  const context = createCustomWeaponPassiveContext({
    1: {
      operatorId: 1,
      weaponKey: "aspirant",
      weaponName: "Aspirant",
      totalAtk: 500,
      passive: { name: "Twilight: Imposing Peak", rank: 1 }
    }
  });
  const events = [{
    time: 1,
    order: 0,
    sourceOperatorId: 1,
    skillData: { shortType: "CS" },
    activeDebuffsBefore: [],
    activeDebuffs: [{ id: "lift" }]
  }, {
    time: 2,
    order: 1,
    sourceOperatorId: 1,
    skillData: { shortType: "Ult" },
    activeDebuffsBefore: [{ id: "lift" }],
    activeDebuffs: [{ id: "lift" }]
  }, {
    time: 3,
    order: 2,
    sourceOperatorId: 1,
    skillData: { shortType: "BS" },
    activeDebuffsBefore: [{ id: "lift" }],
    activeDebuffs: [{ id: "lift" }]
  }];

  const result = context.enrichSimulationSkillEventsWithWeaponPassives(events, [], 1, 40);
  assert.equal(result.events[1].weaponPassiveStateBefore.effects[0].elementDamageBonuses.physical, 12);
  assert.equal(result.events[1].weaponPassiveStateAfter.effects.length, 0);
  assert.equal(result.events[2].weaponPassiveStateBefore.effects.length, 0);
});

test("team reactions can activate a listening Umbral Torch passive", () => {
  const context = createCustomWeaponPassiveContext({
    1: { operatorId: 1, weaponKey: "none", weaponName: "None", totalAtk: 400, passive: { name: "None", rank: 1 } },
    2: {
      operatorId: 2,
      weaponKey: "umbral_torch",
      weaponName: "Umbral Torch",
      totalAtk: 500,
      passive: { name: "Infliction: Covetous Buildup", rank: 1 }
    }
  });
  const events = [{
    time: 1,
    order: 0,
    sourceOperatorId: 1,
    skillData: { shortType: "BS" },
    activeDebuffsBefore: [],
    activeDebuffs: [{ id: "combustion" }]
  }, {
    time: 2,
    order: 1,
    sourceOperatorId: 2,
    skillData: { shortType: "BS" },
    activeDebuffsBefore: [{ id: "combustion" }],
    activeDebuffs: [{ id: "combustion" }]
  }];

  const result = context.enrichSimulationSkillEventsWithWeaponPassives(events, [], 1, 30);
  const effect = result.events[1].weaponPassiveStateBefore.effects[0];
  assert.equal(effect.elementDamageBonuses.heat, 8);
  assert.equal(effect.elementDamageBonuses.nature, 8);
  assert.equal(effect.sourceOperatorId, 2);
});

test("Rapid Ascent applies its Physical and Stagger bonuses to the triggering skill", () => {
  const context = createCustomWeaponPassiveContext({
    1: {
      operatorId: 1,
      weaponKey: "rapid_ascent",
      weaponName: "Rapid Ascent",
      totalAtk: 1000,
      passive: { name: "Twilight: Azure Clouds", rank: 1 }
    }
  });
  context.getSelectedEnemy = () => ({ name: "Staggered Dummy" });
  vm.runInContext(damageBreakdownScript, context);
  const event = {
    time: 1,
    order: 0,
    sourceOperatorId: 1,
    skillData: {
      shortType: "BS",
      elementType: "physical",
      damageProfile: { atkMultiplier: 1, verified: true }
    },
    activeDebuffsBefore: [{ id: "stagger" }],
    activeDebuffs: [{ id: "stagger" }]
  };

  context.enrichSimulationSkillEventsWithWeaponPassives([event], [], 1, 5);
  const breakdown = context.getSimulationDamageBreakdown(event);
  assert.equal(event.weaponPassiveStateBefore.effects.length, 2);
  assert.equal(breakdown.outgoing.totalPercent, 50);
  assert.equal(breakdown.preMitigationDamage, 1500);
});

test("Brigand's Calling adds a timed Arts damage-taken effect to the enemy", () => {
  const context = createCustomWeaponPassiveContext({
    1: {
      operatorId: 1,
      weaponKey: "brigands_calling",
      weaponName: "Brigand's Calling",
      totalAtk: 1000,
      passive: { name: "Detonate: Brigand's Bane", rank: 1 }
    }
  });
  context.getSelectedEnemy = () => ({ name: "Training Dummy" });
  context.getEnemyCombatProfile = () => ({ defense: 0, resistanceMultipliers: { cryo: 1 } });
  vm.runInContext(damageBreakdownScript, context);
  const events = [{
    time: 1,
    order: 0,
    sourceOperatorId: 1,
    skillData: { shortType: "BS" },
    activeDebuffsBefore: [],
    activeDebuffs: [{ id: "arts_susceptibility" }]
  }, {
    time: 2,
    order: 1,
    sourceOperatorId: 1,
    skillData: {
      shortType: "BS",
      elementType: "cryo",
      damageProfile: { atkMultiplier: 1, verified: true }
    },
    activeDebuffsBefore: [{ id: "arts_susceptibility" }],
    activeDebuffs: [{ id: "arts_susceptibility" }]
  }];

  context.enrichSimulationSkillEventsWithWeaponPassives(events, [], 1, 30);
  const weaponDebuff = events[1].activeDebuffsBefore.find(effect => effect.target === "enemy");
  const breakdown = context.getSimulationDamageBreakdown(events[1]);
  assert.equal(weaponDebuff.elementDamageTakenBonuses.arts, 6);
  assert.equal(breakdown.mitigation.increasedDamageTakenPercent, 6);
  assert.equal(breakdown.finalDamage, 1060);
});

test("Sundered Prince doubles its Final Strike ATK buff for the controlled operator", () => {
  const context = createWeaponPassiveContext();
  const result = context.enrichSimulationSkillEventsWithWeaponPassives([], [1], 1, 10);

  assert.equal(result.passiveEvents.length, 1);
  assert.equal(result.passiveEvents[0].weaponPassiveActivations[0].atkPercent, 20);
  assert.equal(result.passiveEvents[0].weaponPassiveStateAfter.effectiveAtk, 600);
  assert.equal(result.passiveEvents[0].weaponPassiveStateAfter.effects[0].expiresAt, 9);
  const miFuTimeline = result.atkTimeline.find(item => item.operatorId === 1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(miFuTimeline.points)),
    [
      { time: 0, value: 500 },
      { time: 1, value: 600 },
      { time: 9, value: 500 },
      { time: 10, value: 500 }
    ]
  );
});

test("weapon passive buffs affect later events and expire on schedule", () => {
  const context = createWeaponPassiveContext();
  const comboEvent = { time: 2, order: 0, sourceOperatorId: 2, skillData: { id: 20, shortType: "CS" } };
  const duringBuff = { time: 10, order: 1, sourceOperatorId: 2, skillData: { id: 21, shortType: "BS" } };
  const afterBuff = { time: 23, order: 2, sourceOperatorId: 2, skillData: { id: 22, shortType: "BS" } };
  const result = context.enrichSimulationSkillEventsWithWeaponPassives(
    [comboEvent, duringBuff, afterBuff],
    [],
    1
  );

  assert.equal(result.events[0].weaponPassiveActivations[0].atkPercent, 12);
  assert.equal(result.events[0].weaponPassiveStateAfter.effectiveAtk, 448);
  assert.equal(result.events[1].weaponPassiveStateBefore.effectiveAtk, 448);
  assert.equal(result.events[2].weaponPassiveStateBefore.effectiveAtk, 400);
});
test("damage breakdown calculates transparent pre-mitigation damage", () => {
  const context = { console, window: null, getSelectedEnemy: () => ({ name: "Training Dummy" }) };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(damageBreakdownScript, context);
  const breakdown = context.getSimulationDamageBreakdown({
    weaponPassiveStateBefore: { effectiveAtk: 600 },
    loadoutState: { totalAtk: 500 },
    skillData: {
      id: 42,
      name: "Test Skill",
      elementType: "heat",
      damageProfile: {
        atkMultiplier: 2.5,
        flatDamage: 10,
        hitCount: 5,
        verified: true
      }
    }
  });

  assert.equal(breakdown.attack, 600);
  assert.equal(breakdown.preMitigationDamage, 1510);
  assert.equal(breakdown.averageDamagePerHit, 302);
  assert.equal(breakdown.finalDamage, null);
  assert.equal(breakdown.enemyMitigationAvailable, false);
});

test("damage breakdown applies enemy defense, resistance and susceptibility", () => {
  const context = {
    console,
    window: null,
    getSelectedEnemy: () => ({ name: "Armored Dummy" }),
    getEnemyCombatProfile: () => ({
      defense: 100,
      resistanceMultipliers: { physical: 0.8 }
    })
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(damageBreakdownScript, context);
  const breakdown = context.getSimulationDamageBreakdown({
    loadoutState: { totalAtk: 1000 },
    activeDebuffsBefore: [{
      id: "physical_susceptibility",
      valuePercent: 5,
      stacks: 1
    }],
    skillData: {
      elementType: "physical",
      damageProfile: { atkMultiplier: 2, verified: true }
    }
  });

  assert.equal(context.getSimulationDefenseMultiplier(100), 0.5);
  assert.equal(breakdown.preMitigationDamage, 2000);
  assert.equal(breakdown.mitigation.susceptibilityPercent, 5);
  assert.equal(breakdown.mitigation.resistanceMultiplier, 0.8);
  assert.equal(breakdown.finalDamage, 840);
  assert.equal(breakdown.critRatePercent, 5);
  assert.equal(breakdown.critDamagePercent, 50);
  assert.equal(breakdown.criticalHitDamage, 1260);
  assert.equal(breakdown.expectedFinalDamage, 861);
  assert.equal(breakdown.enemyMitigationAvailable, true);
});

test("damage mitigation resolves susceptibility and resistance reduction from the debuff registry", () => {
  const context = {
    console,
    window: null,
    DEBUFF_REGISTRY: {
      cryo_susceptibility: { name: "Cryo Susceptibility", susceptibilityPercent: 12 },
      cryo_resistance_down: { name: "Cryo Resistance Down", resistanceReductionPercent: 8 }
    },
    getSelectedEnemy: () => ({ name: "Cryo Dummy" }),
    getEnemyCombatProfile: () => ({ defense: 0, resistanceMultipliers: { cryo: 0.7 } })
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(damageBreakdownScript, context);

  const breakdown = context.getSimulationDamageBreakdown({
    loadoutState: { totalAtk: 1000 },
    activeDebuffsBefore: [
      { id: "cryo_susceptibility" },
      { id: "cryo_resistance_down" }
    ],
    skillData: {
      elementType: "cryo",
      damageProfile: { atkMultiplier: 1, verified: true }
    }
  });

  assert.equal(breakdown.mitigation.susceptibilityPercent, 12);
  assert.equal(breakdown.mitigation.resistanceMultiplier, 0.78);
  assert.equal(breakdown.finalDamage, 873);
});

test("damage breakdown applies loadout, timed buff and stacked passive element bonuses", () => {
  const context = {
    console,
    window: null,
    BUFF_REGISTRY: {
      physical_focus: {
        name: "Physical Focus",
        physicalDamageDealtPercent: 10,
        durationSeconds: 10,
        icon: "assets/test/physical-focus.png",
        verified: true
      }
    },
    resolveBuffIcon: effect => effect.icon || "",
    getSelectedEnemy: () => ({ name: "Training Dummy" }),
    getEnemyCombatProfile: () => ({ defense: 0, resistanceMultipliers: { physical: 0.8 } })
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(damageBreakdownScript, context);

  const breakdown = context.getSimulationDamageBreakdown({
    time: 5,
    sourceOperatorId: 8,
    loadoutState: {
      totalAtk: 1000,
      allDamageBonusPercent: 5,
      elementDamageBonuses: { physical: 15 }
    },
    activeBuffsBefore: [{ id: "physical_focus", sourceOperatorId: 8, appliedAt: 2 }],
    weaponPassiveStateBefore: {
      effectiveAtk: 1000,
      effects: [{
        name: "Stacked Physical Passive",
        physicalDamageBonusPercent: 4,
        stacks: 2,
        verified: true
      }]
    },
    skillData: {
      shortType: "BS",
      elementType: "physical",
      damageProfile: { atkMultiplier: 1, verified: true }
    }
  });

  assert.equal(breakdown.rawSkillDamage, 1000);
  assert.equal(breakdown.outgoing.totalPercent, 38);
  assert.equal(breakdown.preMitigationDamage, 1380);
  assert.equal(breakdown.mitigation.resistanceMultiplier, 0.8);
  assert.equal(breakdown.finalDamage, 1104);
  assert.deepEqual(
    Array.from(breakdown.outgoing.sources, source => source.valuePercent),
    [5, 15, 10, 8]
  );
  const timedSource = breakdown.effectContext.outgoingSources.find(source => source.name === "Physical Focus");
  assert.equal(timedSource.icon, "assets/test/physical-focus.png");
  assert.equal(timedSource.startedAt, 2);
  assert.equal(timedSource.expiresAt, 12);
  assert.equal(timedSource.remainingSeconds, 7);
});

test("damage context explains inactive weapon conditions", () => {
  const context = {
    console,
    window: null,
    getSelectedEnemy: () => ({ name: "Training Dummy" }),
    getEnemyCombatProfile: () => ({ defense: 0, resistanceMultipliers: { physical: 1 } }),
    getWeaponPassiveRule: () => ({
      verified: true,
      sourceUrl: "https://example.test/weapon",
      triggers: [{
        id: "staggered-battle-skill",
        type: "battle_skill",
        conditions: { enemyHasAnyEffectBefore: ["stagger"] },
        appliesToTriggeringEvent: true
      }]
    }),
    getWeaponPassiveTriggerLabel: type => type === "battle_skill" ? "Battle Skill" : type
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(damageBreakdownScript, context);
  const breakdown = context.getSimulationDamageBreakdown({
    time: 3,
    sourceOperatorId: 8,
    loadoutState: {
      totalAtk: 1000,
      weaponKey: "rapid_ascent",
      weaponName: "Rapid Ascent",
      weaponIcon: "assets/weapons/rapid-ascent.png",
      passive: { name: "Pursuit" }
    },
    weaponPassiveStateBefore: { effectiveAtk: 1000, effects: [] },
    activeDebuffsBefore: [],
    skillData: {
      shortType: "BS",
      elementType: "physical",
      damageProfile: { atkMultiplier: 1, verified: true }
    }
  });

  assert.equal(breakdown.effectContext.inactiveRequirements.length, 1);
  assert.equal(breakdown.effectContext.inactiveRequirements[0].name, "Pursuit");
  assert.match(breakdown.effectContext.inactiveRequirements[0].reason, /enemy has stagger/);
});

test("timed simulation effects expire before later events", () => {
  assert.match(rotationGridScript, /appliedStackTimes/);
  assert.match(rotationGridScript, /activeStackTimes/);
  assert.match(rotationGridScript, /event\.time < Number\(appliedAt\) \+ durationSeconds/);
  assert.match(rotationGridScript, /rotationDebuffMetaState/);
  assert.match(rotationGridScript, /debuffs: Array\.isArray\(event\.skillData\?\.debuffs\)/);
});

test("damage breakdown applies a self-only Crit buff to expected damage", () => {
  const context = {
    console,
    window: null,
    BUFF_REGISTRY: {
      rossi_crit_buff: {
        name: "Crit Rate / Crit DMG",
        critRatePercent: 15,
        critDamagePercent: 30,
        target: "self"
      }
    },
    getSelectedEnemy: () => ({ name: "Training Dummy" }),
    getEnemyCombatProfile: () => ({ defense: 0, resistanceMultipliers: { physical: 1 } })
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(damageBreakdownScript, context);

  const event = {
    sourceOperatorId: 5,
    loadoutState: { totalAtk: 1000, critRatePercent: 5, critDamagePercent: 50 },
    activeBuffsBefore: [{ id: "rossi_crit_buff", sourceOperatorId: 5 }],
    skillData: { elementType: "physical", damageProfile: { atkMultiplier: 1, verified: true } }
  };
  const buffed = context.getSimulationDamageBreakdown(event);
  const otherOperator = context.getSimulationDamageBreakdown({ ...event, sourceOperatorId: 6 });
  const cannotCrit = context.getSimulationDamageBreakdown({
    ...event,
    skillData: { elementType: "physical", damageProfile: { atkMultiplier: 1, verified: true, canCrit: false } }
  });

  assert.equal(buffed.critRatePercent, 20);
  assert.equal(buffed.critDamagePercent, 80);
  assert.equal(buffed.criticalHitDamage, 1800);
  assert.equal(buffed.expectedFinalDamage, 1160);
  assert.equal(otherOperator.expectedFinalDamage, 1025);
  assert.equal(cannotCrit.expectedFinalDamage, 1000);
  assert.equal(cannotCrit.critRatePercent, 0);
});

test("damage display mode selects normal, expected or critical damage", () => {
  const context = { console, window: null, uiSettings: { simulationDamageMode: "expected" } };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(damageBreakdownScript, context);
  const breakdown = {
    status: "verified",
    preMitigationDamage: 900,
    finalDamage: 600,
    expectedFinalDamage: 750,
    criticalHitDamage: 1200,
    canCrit: true
  };

  assert.equal(context.getSimulationDisplayedDamage(breakdown), 750);
  context.uiSettings.simulationDamageMode = "normal";
  assert.equal(context.getSimulationDisplayedDamage(breakdown), 600);
  context.uiSettings.simulationDamageMode = "critical";
  assert.equal(context.getSimulationDisplayedDamage(breakdown), 1200);
  assert.equal(context.getSimulationDisplayedDamage({ ...breakdown, canCrit: false }), 600);
});

test("damage breakdown refuses to invent missing skill multipliers", () => {
  const context = { console, window: null };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(damageBreakdownScript, context);
  const breakdown = context.getSimulationDamageBreakdown({
    loadoutState: { totalAtk: 700 },
    skillData: { id: 43, name: "Unknown Skill", elementType: "physical" }
  });

  assert.equal(breakdown.status, "missing-profile");
  assert.equal(breakdown.attack, 700);
  assert.equal(breakdown.message, "No verified multiplier in the database");
});

test("damage timeline accumulates skill damage per operator", () => {
  const context = { console, window: null, getSimulationOperatorName: id => `Operator ${id}` };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponAtkChartScript, context);
  const timeline = context.buildSimulationDamageTimeline([
    { time: 1, sourceOperatorId: 8, skillData: { name: "First" }, damageBreakdown: { status: "verified", preMitigationDamage: 120 } },
    { time: 2, sourceOperatorId: 8, skillData: { name: "Second" }, damageBreakdown: { status: "verified", preMitigationDamage: 80 } },
    { time: 2, sourceOperatorId: 9, skillData: { name: "Other" }, damageBreakdown: { status: "verified", preMitigationDamage: 50 } },
    { time: 3, sourceOperatorId: 8, skillData: { name: "Unknown" }, damageBreakdown: { status: "missing-profile" } }
  ]);

  assert.equal(timeline.length, 2);
  assert.deepEqual(Array.from(timeline[0].points, point => point.value), [0, 120, 200]);
  assert.equal(timeline[0].points[2].damage, 80);
  assert.equal(timeline[0].points[2].events[0].skillName, "Second");
  assert.equal(timeline[1].points[1].value, 50);
});

test("damage summary reports team totals, DPS, strongest hit and operator shares", () => {
  const context = { console, window: null, Intl, getSimulationDamageMode: () => "expected" };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponAtkChartScript, context);
  const summary = context.buildSimulationDamageSummary([
    {
      operatorId: 1,
      operatorName: "Mi Fu",
      points: [
        { time: 0, damage: 0 },
        { time: 1, damage: 100, events: [{ skillName: "First", damage: 100 }] },
        { time: 4, damage: 300, events: [{ skillName: "Finisher", damage: 300 }] }
      ]
    },
    {
      operatorId: 2,
      operatorName: "Rossi",
      points: [
        { time: 0, damage: 0 },
        { time: 2, damage: 200, events: [{ skillName: "Combo", damage: 200 }] }
      ]
    }
  ]);

  assert.equal(summary.totalDamage, 600);
  assert.equal(summary.durationSeconds, 4);
  assert.equal(summary.dps, 150);
  assert.equal(summary.strongestHit.skillName, "Finisher");
  assert.ok(Math.abs(summary.operators[0].sharePercent - (400 / 6)) < 0.0001);
  assert.ok(Math.abs(summary.operators[1].sharePercent - (200 / 6)) < 0.0001);
  assert.equal(summary.damageMode, "expected");
});

test("damage summary compares current loadouts with a saved baseline", () => {
  const context = { console, window: null, Intl };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponAtkChartScript, context);
  const comparison = context.buildSimulationDamageComparison(
    {
      totalDamage: 600,
      dps: 150,
      operators: [
        { operatorId: 1, totalDamage: 400 },
        { operatorId: 2, totalDamage: 200 }
      ]
    },
    {
      totalDamage: 500,
      dps: 125,
      operators: [
        { operatorId: 1, totalDamage: 350 },
        { operatorId: 2, totalDamage: 150 }
      ]
    }
  );

  assert.equal(comparison.totalDamageDelta, 100);
  assert.equal(comparison.dpsDelta, 25);
  assert.deepEqual(Array.from(comparison.operators, item => item.damageDelta), [50, 50]);
});

test("damage tooltip keeps a transparent breakdown for its timeline marker", () => {
  const context = { console, window: null, Intl, formatSimulationDamageMultiplier: value => `${value * 100}% ATK` };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponAtkChartScript, context);
  const data = context.buildSimulationDamageTooltipData("Mi Fu", {
    time: 1.5,
    damage: 1335,
    value: 2100,
    events: [{
      skillName: "Qingbo Triplex",
      damage: 1335,
      breakdown: {
        status: "verified",
        attack: 856,
        atkMultiplier: 1.2,
        rawSkillDamage: 1027,
        outgoing: { totalPercent: 30, sources: [{ name: "Weapon", valuePercent: 30 }] },
        enemyName: "Training Target",
        mitigation: { effectiveDefense: 100, resistanceMultiplier: 0.8, susceptibilityPercent: 5 },
        finalDamage: 1200,
        expectedFinalDamage: 1335,
        canCrit: true,
        critRatePercent: 20,
        critDamagePercent: 50,
        criticalHitDamage: 1800
      }
    }]
  });

  assert.equal(data.operatorName, "Mi Fu");
  assert.equal(data.events[0].scaling, "120% ATK");
  assert.equal(data.events[0].outgoingSources[0].valueLabel, "+30% DMG");
  assert.equal(data.events[0].expectedDamage, 1335);
  assert.equal(data.events[0].verified, true);
});

test("damage tooltip placement keeps the hovered marker clickable", () => {
  const context = { console, window: null, Intl };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponAtkChartScript, context);
  const marker = { left: 780, right: 790, top: 390, bottom: 400, width: 10, height: 10 };
  const tooltip = { width: 390, height: 520 };
  const viewport = { width: 1280, height: 720 };
  const placement = context.getSimulationDamageTooltipPlacement(marker, tooltip, viewport);
  const tooltipRect = {
    left: placement.left,
    right: placement.left + tooltip.width,
    top: placement.top,
    bottom: placement.top + tooltip.height
  };
  const overlaps = !(
    tooltipRect.right <= marker.left
    || tooltipRect.left >= marker.right
    || tooltipRect.bottom <= marker.top
    || tooltipRect.top >= marker.bottom
  );

  assert.equal(placement.placement, "right");
  assert.equal(overlaps, false);
});

test("ATK chart renders temporary buffs as discrete steps", () => {
  const context = { console, window: null };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponAtkChartScript, context);
  const path = context.createSimulationAtkStepPath([
    { time: 0, value: 100 },
    { time: 12.5, value: 110 },
    { time: 20, value: 100 }
  ], 2400, 120, value => 200 - value);

  assert.equal(path, "M 0 100 H 1500 V 90 H 2400 V 100");
  assert.doesNotMatch(path, / L /);
});

test("damage chart renders damage only as event impulses", () => {
  const context = { console, window: null };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponAtkChartScript, context);
  const path = context.createSimulationDamageImpulsePath([
    { time: 0, damage: 0 },
    { time: 1, damage: 573 },
    { time: 2, damage: 762 }
  ], 120, damage => 1000 - damage, 1000);

  assert.equal(path, "M 120 1000 V 427 M 240 1000 V 238");
  assert.doesNotMatch(path, / H /);
});

test("chart numbers use readable thousands separators", () => {
  const context = { console, window: null, Intl };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(weaponAtkChartScript, context);

  assert.equal(context.formatSimulationChartNumber(1335, 0), "1,335");
  assert.equal(context.formatSimulationChartNumber(1026), "1,026");
  assert.equal(context.formatSimulationChartNumber(855.8), "855.8");
});

test("Supabase skill mapping exposes structured damage profiles", () => {
  const context = { console, window: {} };
  vm.createContext(context);
  vm.runInContext(supabaseClientScript, context);
  const skill = context.mapDatabaseSkill({
    id: 99,
    operator_id: 8,
    name: "Mapped Skill",
    skill_type: "Battle Skill",
    element_type: "cryo",
    atk_multiplier: 3.2,
    flat_damage: 25,
    hit_count: 4,
    damage_element: "cryo",
    damage_verified: true,
    damage_source_url: "https://example.test/source",
    raw_data: {}
  });

  assert.deepEqual(JSON.parse(JSON.stringify(skill.damageProfile)), {
    atkMultiplier: 3.2,
    flatDamage: 25,
    hitCount: 4,
    element: "cryo",
    verified: true,
    sourceUrl: "https://example.test/source",
    canCrit: true
  });
  assert.equal(skill.operatorId, 8);
});

test("Supabase skill mapping preserves legacy percentage multipliers", () => {
  const context = { console, window: {} };
  vm.createContext(context);
  vm.runInContext(supabaseClientScript, context);
  const skill = context.mapDatabaseSkill({
    id: 2702,
    name: "Qingbo Triplex - Cloudtrapper",
    element_type: "physical",
    atk_multiplier: null,
    raw_data: { damageMultiplier: 67 }
  });

  assert.equal(skill.damageProfile.atkMultiplier, 0.67);
  assert.equal(skill.damageProfile.verified, false);
});
test("simulation integration adds passive events to the log without adding timeline skills", () => {
  const context = createWeaponPassiveContext();
  const comboEvent = { time: 2, order: 0, sourceOperatorId: 2, skillData: { id: 20, shortType: "CS" } };
  context.uiSettings = { simulationDurationSeconds: 4 };
  context.getSimulationSourceOperatorId = skill => skill?.operatorId ?? null;
  context.enrichSimulationSkillEventsWithLoadouts = events => events;
  context.getTimelineBasicAttackData = () => ({ hasBasicAttackConfig: false });
  context.getTimelineSecondsPerSlot = () => 1;
  context.getSimulationFinalStrikeTimes = () => [1];
  context.createSimulationEventLog = events => events;
  context.getSimulationLogTypeKey = () => "skill";
  context.getSimulationLogReason = () => "Manual placement";
  context.getSimulationLogEffectSummary = () => "";
  context.getSimulationLogSpSummary = () => "";
  context.createSimulationSkillInspector = () => null;
  context.renderCalls = 0;
  context.chartMounts = 0;
  context.renderSimulationRotation = () => { context.renderCalls++; };
  context.mountSimulationWeaponAtkChart = () => { context.chartMounts++; };
  vm.runInContext(weaponPassiveIntegrationScript, context);

  const timelineEvents = context.enrichSimulationSkillEventsWithLoadouts([comboEvent]);
  const logEvents = context.createSimulationEventLog(timelineEvents);

  assert.equal(timelineEvents.length, 1);
  assert.equal(logEvents.length, 2);
  assert.equal(logEvents[1].kind, "weapon-passive");
  assert.equal(context.getSimulationLogTypeKey(logEvents[1]), "passive");
  assert.ok(Array.isArray(context.__simulationWeaponAtkTimeline));
  context.renderSimulationRotation();
  assert.equal(context.renderCalls, 1);
  assert.equal(context.chartMounts, 1);
});
test("loadout modal exposes Supabase weapon Essence activation profiles", () => {
  assert.match(skillsPanelScript, /uiSettings\?\.timelineMode === "simulation"/);
  assert.match(skillsPanelScript, /createWeaponLoadoutControl\(op\)/);
  assert.match(plannerHtml, /id="operatorLoadoutModal"/);
  assert.equal((plannerHtml.match(/id="operatorLoadoutModal"/g) || []).length, 1);
  assert.match(plannerHtml, />Essence</);
  assert.match(plannerHtml, /id="loadoutEssenceSlotValue"/);
  assert.match(plannerHtml, />Gloves</);
  assert.match(plannerHtml, />Armor</);
  assert.match(plannerHtml, />Kit 1</);
  assert.match(plannerHtml, />Kit 2</);
  assert.match(loadoutCss, /\.loadout-essence-profile/);
  assert.match(loadoutCss, /\.loadout-potential-options/);
  assert.match(loadoutCss, /\.loadout-activation-stepper/);
  assert.match(loadoutCss, /\.loadout-potential-options button[^}]*place-items: center/);
  assert.match(loadoutCss, /\.loadout-weapon-atk-badge/);
  assert.match(loadoutCss, /\.loadout-detail-row\.is-attack/);
  assert.match(loadoutCss, /\.loadout-attack-breakdown/);
  assert.match(loadoutCss, /\.loadout-weapon-list[^}]*padding: 3px/);
  assert.match(weaponLoadoutScript, /attack\.className = "loadout-weapon-atk-badge"/);
  assert.match(weaponLoadoutScript, /createLoadoutAttackBreakdown/);
  assert.match(weaponLoadoutScript, /classList\.add\(\.\.\.String\(className\)/);
  assert.match(loadoutCss, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(loadoutCss, /\.rotation-sim-loadout-summary[^}]*overflow: hidden/);
  assert.match(loadoutCss, /\.loadout-weapon-icon\.has-image img/);
  assert.match(weaponLoadoutScript, /createLoadoutWeaponIcon\("compact", weapon\)/);
  assert.match(weaponLoadoutScript, /weaponIcon: weapon\.icon/);
  assert.match(weaponLoadoutScript, /icon\.classList\.add\("has-image"\)[\s\S]*image\.src = weapon\.icon/);
  assert.match(weaponLoadoutScript, /setWeaponPotentialForOperator/);
  assert.match(weaponLoadoutScript, /getOperatorSimulationLoadoutStats/);
  assert.match(weaponLoadoutScript, /function refreshOperatorLoadoutSurfaces\(\)[\s\S]*renderRotation\(\)/);
  assert.match(weaponLoadoutScript, /attackBeforePercent/);
  assert.match(plannerHtml, /weaponPassiveEngine\.js/);
  assert.match(plannerHtml, /weaponPassiveSimulation\.js/);
  assert.match(plannerHtml, /weaponPassiveIntegration\.js/);
  assert.match(plannerHtml, /weaponAtkChart\.js/);
  assert.match(plannerHtml, /damageBreakdown\.js/);
  assert.match(plannerHtml, /atk-chart\.css/);
  assert.match(weaponAtkChartScript, /createSimulationWeaponAtkChart/);
  assert.match(weaponAtkChartScript, /rotation-sim-atk-tooltip/);
  assert.match(weaponAtkChartScript, /buildSimulationDamageTimeline/);
  assert.match(weaponAtkChartScript, /createSimulationDamageChart/);
  assert.match(weaponAtkChartScript, /pinSimulationDamageTooltip/);
  assert.match(weaponAtkChartScript, /marker\.addEventListener\("pointerdown", event => \{/);
  assert.match(weaponAtkChartScript, /event\.preventDefault\(\);\s+event\.stopPropagation\(\);\s+pinSimulationDamageTooltip/);
  assert.match(weaponAtkChartScript, /if \(!force && simulationDamageTooltipPinned\) return;/);
  assert.match(weaponAtkChartScript, /hideSimulationDamageTooltip\(true\)/);
  assert.doesNotMatch(weaponAtkChartScript, /point\.value, 0\)\} total\)`/);
  assert.match(atkChartCss, /\.rotation-sim-atk-line/);
  assert.match(atkChartCss, /\.rotation-sim-damage-line/);
  assert.match(atkChartCss, /\.rotation-sim-damage-tooltip/);
  assert.match(atkChartCss, /\.rotation-sim-damage-hit\.is-pinned/);
  assert.match(atkChartCss, /\.rotation-sim-body\.has-atk-chart/);
  assert.match(damageBreakdownScript, /Pre-mitigation DMG/);
  const damageMigration = fs.readFileSync("supabase/skill_damage_profiles.sql", "utf8");
  assert.match(damageMigration, /atk_multiplier numeric/);
  assert.match(damageMigration, /damage_verified boolean/);
  const generatedDamageProfiles = fs.readFileSync("supabase/skill_damage_multipliers_wiki_gg.sql", "utf8");
  assert.match(generatedDamageProfiles, /base_skill_name/);
  assert.match(generatedDamageProfiles, /sum\(atk_multiplier\) filter \(where include_in_total\)/);
  assert.match(generatedDamageProfiles, /raw_data->>'damageMultiplier'/);
  assert.match(supabaseClientScript, /baseAtk: row\.base_atk/);
  assert.match(fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8"), /createSimulationLoadoutSummary/);
  assert.match(supabaseClientScript, /from\("weapon_essence_profiles"\)/);
  assert.match(supabaseClientScript, /mapDatabaseWeaponEssenceProfile/);
  assert.match(supabaseClientScript, /assets\/weapons\/\$\{weaponKey\}\.png/);
  const weaponIconFiles = fs.readdirSync("endfield/assets/weapons").filter(file => file.endsWith(".png"));
  assert.equal(weaponIconFiles.length, 29);
  weaponIconFiles.forEach(file => assert.ok(fs.statSync(`endfield/assets/weapons/${file}`).size > 100));
  assert.doesNotMatch(loadoutCss, /\.loadout-essence-btn/);
});
