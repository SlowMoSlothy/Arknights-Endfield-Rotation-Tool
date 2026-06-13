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
  assert.match(page, /class="portrait-media"/);
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
          name: "Opening Strike",
          skill_type: "final_strike",
          short_type: "fs",
          cooldown: 8,
          energy: null,
          element_type: "nature",
          description: "Starts the rotation.",
          raw_data: {}
        },
        {
          id: 2,
          operator_id: entry.id,
          slot_index: 2,
          name: "Ultimate Finish",
          skill_type: "ultimate",
          short_type: "ult",
          cooldown: 60,
          energy: 100,
          element_type: "nature",
          description: "Finishes the rotation.",
          raw_data: {}
        },
        {
          id: 3,
          operator_id: entry.id,
          slot_index: 3,
          name: "Battle Setup",
          skill_type: "battle_skill",
          short_type: "bs",
          cooldown: 12,
          energy: null,
          element_type: "nature",
          description: "Starts the rotation.",
          raw_data: { sp_cost: 100 }
        },
        {
          id: 4,
          operator_id: entry.id,
          slot_index: 4,
          name: "Combo Burst",
          skill_type: "combo_skill",
          short_type: "cs",
          cooldown: 20,
          energy: null,
          element_type: "nature",
          description: "Triggers the combo.",
          combo_trigger: "final_strike",
          raw_data: {}
        }
      ]
    ]
  ]);

  const relatedEntry = operator({
    id: 2,
    slug: "antal",
    name: "Antal",
    icon_path: "assets/operators/antal.webp",
    sort_order: 2
  });
  const page = createOperatorPage(entry, [entry, relatedEntry], skills);

  assert.match(page, /<span class="operator-name">Mi Fu<\/span><span class="rotation-guide-label">Rotation Guide<\/span>/);
  assert.doesNotMatch(page, /class="hero-stats"/);
  assert.match(page, /Mi Fu Rotation Overview/);
  assert.match(page, /fetchpriority="high"/);
  assert.match(page, /class="portrait-media"/);
  assert.match(page, /aspect-ratio:1/);
  assert.match(page, /object-position:center bottom/);
  assert.match(page, /Database ID: OPERATOR_MI_FU/);
  assert.match(page, /<h2>About Mi Fu<\/h2>/);
  assert.match(page, /<h2>Mi Fu Attributes<\/h2>/);
  assert.match(page, /Values shown at Level 1/);
  assert.match(page, /class="stats-grid attribute-stats"/);
  assert.match(page, /<span class="stat-label">HP<\/span>/);
  assert.match(page, /<span class="stat-label">ATK<\/span>/);
  assert.doesNotMatch(page, /<span class="stat-label">Level<\/span>/);
  assert.match(page, /Key listed skills include Battle Setup, Combo Burst, and Ultimate Finish/);
  assert.doesNotMatch(page, /class="subtitle"/);
  assert.match(page, /class="section-nav"/);
  assert.match(page, /href="#rotation-profile">Overview/);
  assert.match(page, /href="#related">Related/);
  assert.match(page, /id="related"/);
  assert.match(page, /class="related-avatar-frame"/);
  assert.match(page, /\.operator-page \.related-avatar-frame/);
  assert.match(page, /name="twitter:card" content="summary_large_image"/);
  assert.match(page, /property="og:image:alt"/);
  assert.match(page, /"@type":"WebPage"/);
  assert.match(page, /a:focus-visible/);
  assert.match(page, /class="tool-name-short"/);
  assert.doesNotMatch(page, /Back to Operator Database/);
  assert.doesNotMatch(page, /Open Rotation Tool/);
  assert.doesNotMatch(page, /class="nav-links"/);
  assert.doesNotMatch(page, /<section class="meta-strip">/);
  assert.doesNotMatch(page, /<span class="stat-label">Ultimate<\/span>/);
  assert.doesNotMatch(page, /-webkit-line-clamp/);
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
