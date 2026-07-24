import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function createInflictionContext() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/inflictionEngine.js", "utf8"), context);
  vm.runInContext(`
    INFLICTION_MECHANICS.cryo_infliction = {
      effectKey: "cryo_infliction",
      name: "Cryo Infliction",
      element: "cryo",
      durationSeconds: 20,
      maxStacks: 4,
      burstKey: "cryo_burst",
      burstName: "Cryo Burst",
      burstAtkMultiplier: 1.6,
      burstHitCount: 1,
      burstCanCrit: true,
      verified: true,
      sourceUrl: "https://endfield.wiki.gg/wiki/Cryo_Infliction"
    };
  `, context);
  return context;
}

test("same-element Infliction reapplication creates a Supabase-configured Arts Burst", () => {
  const context = createInflictionContext();
  const events = [{
    kind: "manual",
    time: 3,
    order: 1,
    sourceOperatorId: 18,
    activeBuffsBefore: [],
    activeBuffs: [],
    activeDebuffsBefore: [{ appliesEffect: "cryo_infliction", currentStacks: 1 }],
    activeDebuffs: [{ appliesEffect: "cryo_infliction", currentStacks: 2 }],
    skillData: {
      id: 1802,
      name: "Onomatopoeia",
      debuffs: [{ appliesEffect: "cryo_infliction", stacksApplied: 1 }]
    }
  }];

  const enriched = context.window.enrichSimulationEventsWithInflictionBursts(events);
  assert.equal(enriched.length, 2);
  assert.equal(enriched[1].kind, "arts-burst");
  assert.equal(enriched[1].skillData.name, "Cryo Burst");
  assert.equal(enriched[1].skillData.damageProfile.atkMultiplier, 1.6);
  assert.equal(enriched[1].skillData.damageProfile.element, "cryo");
  assert.equal(enriched[1].sourceOperatorId, 18);
});

test("first Infliction stack does not create an Arts Burst", () => {
  const context = createInflictionContext();
  const events = [{
    kind: "manual",
    time: 0,
    order: 0,
    activeDebuffsBefore: [],
    activeDebuffs: [{ appliesEffect: "cryo_infliction", currentStacks: 1 }],
    skillData: {
      id: 1802,
      debuffs: [{ appliesEffect: "cryo_infliction", stacksApplied: 1 }]
    }
  }];

  assert.equal(context.window.enrichSimulationEventsWithInflictionBursts(events).length, 1);
});

test("Infliction mechanics migration contains all four types and no client fallback values", () => {
  const migration = fs.readFileSync("supabase/infliction_mechanics.sql", "utf8");
  const clientEngine = fs.readFileSync("endfield/js/logic/inflictionEngine.js", "utf8");
  const supabaseClient = fs.readFileSync("endfield/supabaseClient.js", "utf8");
  const appMain = fs.readFileSync("endfield/js/main.js", "utf8");

  for (const key of ["electric_infliction", "heat_infliction", "cryo_infliction", "nature_infliction"]) {
    assert.match(migration, new RegExp(`'${key}'`));
  }
  assert.match(migration, /duration_seconds[\s\S]*max_stacks[\s\S]*burst_atk_multiplier/);
  assert.match(clientEngine, /const INFLICTION_MECHANICS = Object\.create\(null\)/);
  assert.doesNotMatch(clientEngine, /burstAtkMultiplier:\s*1\.6/);
  assert.doesNotMatch(clientEngine, /durationSeconds:\s*20/);
  assert.match(supabaseClient, /from\(tableName\)[\s\S]*infliction_mechanics/);
  assert.match(supabaseClient, /replaceRegistryObject\(INFLICTION_MECHANICS, databaseMechanics\)/);
  assert.match(appMain, /await hydrateInflictionMechanicsFromSupabase\(\)/);
});

test("Last Rite migration keeps stack-dependent Combo values in Supabase", () => {
  const migration = fs.readFileSync("supabase/last_rite_winters_devourer_mechanics.sql", "utf8");
  assert.match(migration, /"effect": "cryo_infliction"/);
  assert.match(migration, /"damageAtkMultiplierPerStack": 1\.07/);
  assert.match(migration, /"ultimateEnergyBase": 40/);
  assert.match(migration, /"ultimateEnergyPerStack": 15/);
  assert.match(migration, /"valuePercentPerStack": 4/);
  assert.match(migration, /"durationSeconds": 15/);
});

test("Winter's Devourer resolves three consumed stacks into dynamic combat values", () => {
  const source = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
  const start = source.indexOf("function getSimulationScalingEffectStacks");
  const end = source.indexOf("\nfunction enrichSimulationSkillEventsWithEffects", start);
  assert.ok(start >= 0 && end > start);

  const context = {
    normalizeRotationConsumeKey: value => String(value || "").trim().toLowerCase().replace(/\s+/g, "_")
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  const skill = context.applySimulationConsumedEffectScaling({
    damageProfile: { atkMultiplier: 1.42 },
    debuffs: [{ id: "cryo_susceptibility" }],
    consumedEffectScaling: {
      effect: "cryo_infliction",
      damageAtkMultiplierPerStack: 1.07,
      ultimateEnergyBase: 40,
      ultimateEnergyPerStack: 15,
      effectValues: [{
        effect: "cryo_susceptibility",
        valuePercentPerStack: 4,
        durationSeconds: 15
      }]
    }
  }, [{ id: "cryo_infliction", currentStacks: 3 }]);

  assert.equal(skill.damageProfile.atkMultiplier, 4.63);
  assert.equal(skill.ultimateEnergyGain, 85);
  assert.equal(skill.debuffs[0].valuePercent, 12);
  assert.equal(skill.debuffs[0].durationSeconds, 15);
  assert.equal(skill.consumedEffectState.stacks, 3);
});

test("Batch 05 resolves Pogranichnik's sequence, damage, and SP from consumed Vulnerability", () => {
  const source = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
  const start = source.indexOf("function getSimulationScalingEffectStacks");
  const end = source.indexOf("\nfunction enrichSimulationSkillEventsWithEffects", start);
  const context = {
    normalizeRotationConsumeKey: value => String(value || "").trim().toLowerCase().replace(/\s+/g, "_")
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);

  const skill = context.applySimulationConsumedEffectScaling({
    damageProfile: { atkMultiplier: 1.62, hitCount: 3 },
    triggerEffectScaling: {
      effect: "vulnerable_consumed",
      stackSource: "trigger",
      maxStacks: 4,
      variantsByStacks: {
        "4": {
          damageProfile: { atkMultiplier: 2.28, hitCount: 3 },
          damageSequences: [
            { sequenceIndex: 1, atkMultiplier: 0.42 },
            { sequenceIndex: 2, atkMultiplier: 0.54 },
            { sequenceIndex: 3, atkMultiplier: 1.32, enhanced: true }
          ],
          spRecovery: 35,
          ultimateEnergyGain: 10
        }
      }
    }
  }, [], { vulnerable_consumed: 4 });

  assert.equal(skill.damageProfile.atkMultiplier, 2.28);
  assert.equal(skill.damageSequences.length, 3);
  assert.equal(skill.damageSequences[2].enhanced, true);
  assert.equal(skill.spRecovery, 35);
  assert.equal(skill.ultimateEnergyGain, 10);
  assert.equal(skill.consumedEffectState.stacks, 4);
});

test("Batch 05 sums Rossi's consumed Infliction stacks for sequence 2", () => {
  const source = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
  const start = source.indexOf("function getSimulationScalingEffectStacks");
  const end = source.indexOf("\nfunction enrichSimulationSkillEventsWithEffects", start);
  const context = {
    normalizeRotationConsumeKey: value => String(value || "").trim().toLowerCase().replace(/\s+/g, "_")
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);

  const skill = context.applySimulationConsumedEffectScaling({
    damageProfile: { atkMultiplier: 2 },
    consumedEffectScaling: {
      effects: ["heat_infliction", "electric_infliction", "cryo_infliction", "nature_infliction"],
      stackAggregation: "sum",
      maxStacks: 4,
      damageAtkMultiplierPerStack: 0.8,
      damageSequences: [
        { sequenceIndex: 1, baseAtkMultiplier: 0.67 },
        { sequenceIndex: 2, baseAtkMultiplier: 1.33, atkMultiplierPerStack: 0.8 }
      ]
    }
  }, [
    { id: "heat_infliction", currentStacks: 2 },
    { id: "cryo_infliction", currentStacks: 1 }
  ]);

  assert.equal(skill.damageProfile.atkMultiplier, 4.4);
  assert.equal(skill.damageSequences[0].atkMultiplier, 0.67);
  assert.ok(Math.abs(skill.damageSequences[1].atkMultiplier - 3.73) < 0.000001);
  assert.equal(skill.consumedEffectState.stacks, 3);
});

test("Batch 05 keeps operator-specific stack tables in Supabase", () => {
  const migration = fs.readFileSync("supabase/operator_mechanics_audit_batch_05.sql", "utf8");
  assert.match(migration, /"triggerEffectScaling"/);
  assert.match(migration, /"effect":"vulnerable_consumed"/);
  assert.match(migration, /"spRecovery":35/);
  assert.match(migration, /"damageAtkMultiplierPerStack":0\.8/);
  assert.match(migration, /"stackAggregation":"sum"/);
});

test("Gilberta snapshots Vulnerability into her five-second field value", () => {
  const source = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
  const start = source.indexOf("function getSimulationScalingEffectStacks");
  const end = source.indexOf("\nfunction enrichSimulationSkillEventsWithEffects", start);
  const context = {
    normalizeRotationConsumeKey: value => String(value || "").trim().toLowerCase().replace(/\s+/g, "_")
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);

  const skill = context.applySimulationConsumedEffectScaling({
    debuffs: [{ id: "arts_susceptibility", valuePercent: 18, durationSeconds: 5 }],
    activeEffectScaling: {
      effect: "vulnerable",
      effectValues: [{ effect: "arts_susceptibility", baseValuePercent: 18, valuePercentPerStack: 1.8, durationSeconds: 5 }]
    }
  }, [{ id: "vulnerable", currentStacks: 3 }]);

  assert.ok(Math.abs(skill.debuffs[0].valuePercent - 23.4) < 0.000001);
  assert.equal(skill.debuffs[0].durationSeconds, 5);
});

test("Lifeng's Ultimate gains its additional hit while Link is active", () => {
  const source = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
  const start = source.indexOf("function getSimulationScalingEffectStacks");
  const end = source.indexOf("\nfunction enrichSimulationSkillEventsWithEffects", start);
  const context = {
    normalizeRotationConsumeKey: value => String(value || "").trim().toLowerCase().replace(/\s+/g, "_")
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);

  const linked = context.applySimulationConsumedEffectScaling({
    damageProfile: { atkMultiplier: 3.56, hitCount: 2 },
    activeEffectScaling: {
      effect: "link",
      variantsByStacks: {
        1: {
          damageProfile: { atkMultiplier: 6.23, hitCount: 3 },
          damageSequences: [{ atkMultiplier: 1.78 }, { atkMultiplier: 1.78 }, { atkMultiplier: 2.67 }]
        }
      }
    }
  }, [{ id: "link", currentStacks: 1 }]);

  assert.equal(linked.damageProfile.atkMultiplier, 6.23);
  assert.equal(linked.damageProfile.hitCount, 3);
  assert.equal(linked.damageSequences.length, 3);
});

test("Arts Bursts remain damage events and are not rendered as skills or timed buffs", () => {
  const rotationGrid = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
  const inflictionEngine = fs.readFileSync("endfield/js/logic/inflictionEngine.js", "utf8");

  assert.match(rotationGrid, /event\?\.kind !== "arts-burst"[\s\S]*getSimulationSkillLane/);
  assert.match(rotationGrid, /event\?\.kind === "arts-burst"\) return "trigger"/);
  assert.doesNotMatch(inflictionEngine, /kind:\s*"arts-burst"[\s\S]{0,500}durationSeconds/);
});

test("damage timeline retains Arts Burst metadata for the element chip and tooltip", () => {
  const context = {
    window: {},
    document: {},
    console,
    getSimulationOperatorName: () => "Last Rite",
    getSimulationDisplayedDamage: breakdown => breakdown.expectedFinalDamage
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/ui/weaponAtkChart.js", "utf8"), context);

  const timeline = context.buildSimulationDamageTimeline([{
    kind: "arts-burst",
    time: 4.2,
    sourceOperatorId: 18,
    triggerSourceName: "Onomatopoeia",
    skillData: {
      name: "Cryo Burst",
      elementType: "cryo",
      damageProfile: { element: "cryo", atkMultiplier: 1.6 }
    },
    damageBreakdown: {
      status: "verified",
      preMitigationDamage: 1600,
      expectedFinalDamage: 1440,
      atkMultiplier: 1.6,
      element: "cryo"
    }
  }]);

  const burst = timeline[0].points[1].events[0];
  assert.equal(burst.kind, "arts-burst");
  assert.equal(burst.element, "cryo");
  assert.equal(burst.atkMultiplier, 1.6);
  assert.equal(burst.triggerSourceName, "Onomatopoeia");
  const chartCss = fs.readFileSync("endfield/atk-chart.css", "utf8");
  const chartSource = fs.readFileSync("endfield/js/ui/weaponAtkChart.js", "utf8");
  assert.match(chartCss, /rotation-sim-arts-burst-chip\[data-element="cryo"\]/);
  assert.match(chartCss, /transform:\s*translate\(-9\.5px,\s*-50%\)/);
  assert.match(chartSource, /chip\.style\.left\s*=\s*`\$\{Math\.max\(0,\s*Math\.min\(width,/);
});
