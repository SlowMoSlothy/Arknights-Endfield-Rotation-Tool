import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const reactionRules = [{
  id: "electrification",
  triggerEffect: "electric_infliction",
  requiresAny: ["heat_infliction", "cryo_infliction", "nature_infliction"],
  appliesEffect: "arts_reaction",
  reactionEffect: "electrification"
}, {
  id: "corrosion",
  triggerEffect: "nature_infliction",
  requiresAny: ["electric_infliction", "heat_infliction", "cryo_infliction"],
  appliesEffect: "arts_reaction",
  reactionEffect: "corrosion"
}];

function createContext() {
  const context = { console, ARTS_REACTIONS: reactionRules };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("endfield/js/logic/reactionEngine.js", "utf8"), context);
  return context;
}

test("the newly applied Electric Infliction determines Electrification", () => {
  const result = createContext().resolveArtsReactions(
    { nature_infliction: 1, electric_infliction: 1 },
    ["electric_infliction"]
  );

  assert.equal(result.electrification, 1);
  assert.equal(result.corrosion, undefined);
});

test("the newly applied Nature Infliction determines Corrosion", () => {
  const result = createContext().resolveArtsReactions(
    { electric_infliction: 1, nature_infliction: 1 },
    ["nature_infliction"]
  );

  assert.equal(result.corrosion, 1);
  assert.equal(result.electrification, undefined);
});

test("reaction trigger order migration remains exclusively Supabase-configured", () => {
  const migration = fs.readFileSync("supabase/reaction_trigger_order.sql", "utf8");
  const fallback = fs.readFileSync("endfield/js/data/reactionRules.js", "utf8");

  for (const [trigger, reaction] of [
    ["electric_infliction", "electrification"],
    ["heat_infliction", "combustion"],
    ["cryo_infliction", "solidification"],
    ["nature_infliction", "corrosion"]
  ]) {
    assert.match(migration, new RegExp(`"triggerEffect":"${trigger}"`));
    assert.match(migration, new RegExp(`"reactionEffect":"${reaction}"`));
  }
  assert.match(fallback, /const ARTS_REACTIONS = \[\]/);
});
