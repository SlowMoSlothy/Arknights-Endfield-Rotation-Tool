import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createSupabaseClient,
  createIndexPage,
  createOperatorPage,
  fetchSkillsForOperators,
  normalizeAssetPath,
  validateOperators,
  writeGeneratedOutput
} from "../tools/build-operator-pages.js";

function operator(overrides = {}) {
  return {
    id: 1,
    game: "arknights_endfield",
    slug: "mi_fu",
    name: "Mi Fu",
    star: 5,
    operator_class: "supporter",
    element_type: "nature",
    icon_path: "assets/operators/mi_fu.webp",
    weapon_type: "arts_unit",
    main_attribute: "intellect",
    secondary_attribute: "will",
    base_hp: 100,
    base_atk: 20,
    base_stats_level: 1,
    base_strength: 10,
    base_agility: 11,
    base_intellect: 15,
    base_will: 14,
    sort_order: 1,
    ...overrides
  };
}

test("normalizeAssetPath handles empty and rooted asset paths", () => {
  assert.equal(normalizeAssetPath(null), "");
  assert.equal(normalizeAssetPath(" / "), "");
  assert.equal(normalizeAssetPath("/assets/test.webp"), "/endfield/assets/test.webp");
});

test("createSupabaseClient reports missing environment variables clearly", () => {
  assert.throws(
    () => createSupabaseClient({}),
    /SUPABASE_URL, SUPABASE_ANON_KEY/
  );
});

test("validateOperators rejects unsafe and duplicate slugs", () => {
  assert.throws(
    () => validateOperators([operator({ slug: "../../index" })]),
    /Ungültiger Operator-Slug/
  );
  assert.throws(
    () => validateOperators([operator(), operator({ id: 2 })]),
    /Doppelter Operator-Slug/
  );
});

test("fetchSkillsForOperators filters by operator IDs and paginates results", async () => {
  const calls = [];
  const pages = [
    Array.from({ length: 1000 }, (_, index) => ({ id: index + 1, operator_id: 1 })),
    [{ id: 1001, operator_id: 1 }]
  ];
  const query = {
    select() {
      return this;
    },
    in(column, values) {
      calls.push({ type: "in", column, values });
      return this;
    },
    order() {
      return this;
    },
    async range(from, to) {
      calls.push({ type: "range", from, to });
      return { data: pages.shift(), error: null };
    }
  };
  const supabase = {
    from(table) {
      assert.equal(table, "operator_skills");
      return query;
    }
  };

  const skills = await fetchSkillsForOperators(supabase, [1, 2]);

  assert.equal(skills.length, 1001);
  assert.deepEqual(calls[0], {
    type: "in",
    column: "operator_id",
    values: [1, 2]
  });
  assert.deepEqual(
    calls.filter((call) => call.type === "range"),
    [
      { type: "range", from: 0, to: 999 },
      { type: "range", from: 1000, to: 1999 }
    ]
  );
});

test("generated pages use placeholders when an operator image is missing", () => {
  const entry = operator({ icon_path: "" });
  const page = createOperatorPage(entry, [entry], new Map());
  const index = createIndexPage([entry]);

  assert.match(page, /portrait-placeholder/);
  assert.doesNotMatch(page, /property="og:image"/);
  assert.doesNotMatch(page, /src="\/endfield\/"/);
  assert.match(index, /avatar-placeholder/);
  assert.doesNotMatch(index, /src="\/endfield\/"/);
});

test("operator pages render the compact rotation overview without redundant fields", () => {
  const entry = operator();
  const skills = new Map([
    [
      entry.id,
      [
        {
          id: 1,
          operator_id: entry.id,
          slot_index: 1,
          name: "Opening Move",
          skill_type: "battle_skill",
          short_type: "bs",
          cooldown: 12,
          energy: null,
          element_type: "nature",
          description: "Starts the rotation.",
          raw_data: { sp_cost: 100 }
        }
      ]
    ]
  ]);

  const page = createOperatorPage(entry, [entry], skills);

  assert.match(page, /<span class="operator-name">Mi Fu<\/span><span class="rotation-guide-label">Rotation Guide<\/span>/);
  assert.match(page, /class="hero-stats"/);
  assert.match(page, /Mi Fu Rotation Overview/);
  assert.match(page, /fetchpriority="high"/);
  assert.match(page, /Database ID: OPERATOR_MI_FU/);
  assert.doesNotMatch(page, /Back to Operator Database/);
  assert.doesNotMatch(page, /Open Rotation Tool/);
  assert.doesNotMatch(page, /<section class="meta-strip">/);
  assert.doesNotMatch(page, />Ultimate</);
});

test("writeGeneratedOutput replaces output and sitemap without leaving temporary files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rotationforge-operators-"));
  const outputDir = path.join(root, "operators");
  const sitemapPath = path.join(root, "sitemap.xml");
  const entry = operator();

  try {
    fs.mkdirSync(outputDir);
    fs.writeFileSync(path.join(outputDir, "old.html"), "old", "utf8");
    fs.writeFileSync(sitemapPath, "old sitemap", "utf8");

    writeGeneratedOutput({
      operators: [entry],
      skillsByOperator: new Map(),
      outputDir,
      sitemapPath
    });

    assert.equal(fs.existsSync(path.join(outputDir, "old.html")), false);
    assert.equal(fs.existsSync(path.join(outputDir, "index.html")), true);
    assert.equal(fs.existsSync(path.join(outputDir, "mi_fu", "index.html")), true);
    assert.match(fs.readFileSync(sitemapPath, "utf8"), /mi_fu/);
    assert.deepEqual(
      fs.readdirSync(root).filter((name) => name.includes(".tmp-") || name.includes(".backup-")),
      []
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
