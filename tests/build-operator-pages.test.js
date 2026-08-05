import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildBasicAttackConfig,
  createSupabaseClient,
  createIndexPage,
  createOperatorPage,
  fetchBasicAttackSequences,
  fetchBasicAttackFormVariants,
  fetchSkillsForOperators,
  filterVisibleOperators,
  getBasicAttackTimeline,
  groupBasicAttackSequences,
  normalizeAssetPath,
  validateOperators,
  writeGeneratedOutput
} from "../tools/build-operator-pages.js";

const checkedInOperatorIndex = fs.readFileSync("endfield/operators/index.html", "utf8");
const actionTimingMigration = fs.readFileSync("supabase/operator_action_timings.sql", "utf8");
const operatorSharesScript = fs.readFileSync("endfield/js/ui/operatorShares.js", "utf8");

test("checked-in operator index contains no unresolved merge conflicts", () => {
  assert.doesNotMatch(checkedInOperatorIndex, /^(?:<<<<<<<|=======|>>>>>>>)/m);
  assert.doesNotMatch(checkedInOperatorIndex, /\uFFFD/);
  assert.match(checkedInOperatorIndex, /Open Rotation Tool ↗/);
  assert.match(checkedInOperatorIndex, /class="tile-stars">★★★★/);
  assert.match(checkedInOperatorIndex, /class="tile-chips"/);
  assert.match(checkedInOperatorIndex, /class="tile-chip tile-element-chip element-heat"/);
});

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
    raw_data: {},
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

test("operator page builds exclude rows hidden by the admin visibility flag", () => {
  const visible = operator({ id: 1, slug: "visible", is_visible: true });
  const hidden = operator({ id: 2, slug: "hidden", is_visible: false });
  const legacy = operator({ id: 3, slug: "legacy" });

  assert.deepEqual(filterVisibleOperators([visible, hidden, legacy]), [visible, legacy]);
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

test("action timing migration normalizes BATKs and known delayed skill timings", () => {
  assert.match(actionTimingMigration, /create table if not exists public\.operator_basic_attack_sequences/);
  assert.match(actionTimingMigration, /operator_form_action_variants/);
  assert.match(actionTimingMigration, /delayedFollowUp,delaySeconds/);
  assert.match(actionTimingMigration, /manualSequence,automaticDelaySeconds/);
  assert.match(actionTimingMigration, /Public read operator basic attack sequences/);
  assert.match(actionTimingMigration, /operator_basic_attack_sequences_set_updated_at/);
});

test("fetchBasicAttackFormVariants loads enabled Basic Attack overrides", async () => {
  const calls = [];
  const query = {
    select() {
      return this;
    },
    eq(column, value) {
      calls.push({ type: "eq", column, value });
      return this;
    },
    in(column, values) {
      calls.push({ type: "in", column, values });
      return this;
    },
    order() {
      return this;
    },
    async range() {
      return {
        data: [{ operator_id: 9, form_key: "empyrean_of_truth", action_key: "basic_attack" }],
        error: null
      };
    }
  };
  const supabase = {
    from(table) {
      assert.equal(table, "operator_form_action_variants");
      return query;
    }
  };

  const variants = await fetchBasicAttackFormVariants(supabase, [9]);

  assert.equal(variants.length, 1);
  assert.deepEqual(
    calls.filter((call) => call.type === "eq"),
    [
      { type: "eq", column: "game", value: "arknights_endfield" },
      { type: "eq", column: "action_key", value: "basic_attack" },
      { type: "eq", column: "enabled", value: true }
    ]
  );
  assert.deepEqual(calls.find((call) => call.type === "in"), {
    type: "in",
    column: "operator_id",
    values: [9]
  });
});

test("fetchBasicAttackSequences loads normalized BATK rows", async () => {
  const calls = [];
  const query = {
    select() {
      return this;
    },
    eq(column, value) {
      calls.push({ type: "eq", column, value });
      return this;
    },
    in(column, values) {
      calls.push({ type: "in", column, values });
      return this;
    },
    order() {
      return this;
    },
    async range() {
      return {
        data: [{
          operator_id: 9,
          form_key: "base",
          attack_name: "Jolting Arts",
          sequence_index: 1,
          duration_seconds: 0.667,
          hit_count: 2,
          hit_timings: [0.3, 0.383]
        }],
        error: null
      };
    }
  };
  const supabase = {
    from(table) {
      assert.equal(table, "operator_basic_attack_sequences");
      return query;
    }
  };

  const rows = await fetchBasicAttackSequences(supabase, [9]);

  assert.equal(rows.length, 1);
  assert.deepEqual(calls.find((call) => call.type === "eq"), {
    type: "eq",
    column: "game",
    value: "arknights_endfield"
  });
  assert.deepEqual(calls.find((call) => call.type === "in"), {
    type: "in",
    column: "operator_id",
    values: [9]
  });
});

test("normalized BATK rows create separate base and form configurations", () => {
  const shared = {
    operator_id: 9,
    attack_name: "Jolting Arts",
    hit_timing_mode: "absolute",
    hit_multipliers: [],
    atk_multiplier_total: 1,
    stagger_multiplier: 0,
    ends_cycle: false,
    emits: [],
    verified: true,
    updated_at: "2026-07-26T12:00:00.000Z"
  };
  const rows = [
    {
      ...shared,
      form_key: "base",
      sequence_index: 1,
      duration_seconds: 0.667,
      cycle_duration_seconds: 1,
      hit_count: 2,
      hit_timings: [0.3, 0.383]
    },
    {
      ...shared,
      form_key: "empyrean_of_truth",
      attack_name: "Jolting Arts · Empyrean of Truth",
      sequence_index: 1,
      duration_seconds: 0.8,
      cycle_duration_seconds: 0.8,
      hit_count: 1,
      hit_timings: [0.6]
    }
  ];

  const base = buildBasicAttackConfig([rows[0]]);
  const grouped = groupBasicAttackSequences(rows);

  assert.equal(base.name, "Jolting Arts");
  assert.equal(base.updatedAt, "2026-07-26T12:00:00.000Z");
  assert.deepEqual(base.sequences[0].hitTimings, [0.3, 0.383]);
  assert.equal(grouped.baseByOperator.get(9).cycleDuration, 1);
  assert.equal(
    grouped.formsByOperator.get(9)[0].action_override.name,
    "Jolting Arts · Empyrean of Truth"
  );
});

test("normalized BATK config takes precedence over legacy operator raw_data", () => {
  const timeline = getBasicAttackTimeline(operator({
    basicAttack: {
      name: "Normalized BATK",
      sequences: [{ duration: 0.5, hitCount: 1, hitTimings: [0.25] }]
    },
    raw_data: {
      basicAttack: {
        name: "Legacy BATK",
        sequences: [{ duration: 2, hitCount: 1, hitTimings: [1] }]
      }
    }
  }));

  assert.equal(timeline.name, "Normalized BATK");
  assert.equal(timeline.totalDuration, 0.5);
});

test("BATK timeline displays its latest Supabase update date", () => {
  const entry = operator({
    basicAttack: {
      name: "Current BATK",
      updatedAt: "2026-07-26T12:00:00.000Z",
      sequences: [{ duration: 1, hitCount: 1, hitTimings: [0.5] }]
    }
  });

  const page = createOperatorPage(entry, [entry], new Map());

  assert.match(page, /<span>Last updated<\/span><strong>26 Jul 2026, 12:00 UTC<\/strong>/);
  assert.match(page, /class="batk-updated"/);
});

test("generated pages use placeholders when an operator image is missing", () => {
  const entry = operator({ icon_path: "" });
  const page = createOperatorPage(entry, [entry], new Map());
  const index = createIndexPage([entry]);

  assert.match(page, /portrait-placeholder/);
  assert.match(page, /class="portrait-media"/);
  assert.match(page, /src="\/favicon-flat\.png"/);
  assert.doesNotMatch(page, /property="og:image"/);
  assert.doesNotMatch(page, /src="\/endfield\/"/);
  assert.match(index, /avatar-placeholder/);
  assert.match(index, /<span class="mark"><img src="\/favicon-flat\.png" alt=""><\/span>/);
  assert.doesNotMatch(index, />RF</);
  assert.match(index, /class="tile-avatar-frame"/);
  assert.match(index, /\.tile-avatar-frame\{[^}]*aspect-ratio:1/);
  assert.match(index, /\.tile-avatar-frame:before/);
  assert.match(index, /\.tile-avatar-frame:after/);
  assert.match(index, /backdrop-filter:blur\(10px\) saturate\(130%\)/);
  assert.doesNotMatch(index, /Arknights: Endfield Rotation Tool/);
  assert.doesNotMatch(index, /class="tool-name"/);
  assert.doesNotMatch(index, /<a href="https:\/\/rotationforge\.gg\/endfield\/operators\/">Operators<\/a>/);
  assert.match(index, /class="nav-cta"/);
  assert.match(index, /\.operator-index \.nav,\.operator-index \.page\{width:min\(1120px/);
  assert.match(index, /class="operator-toolbar"/);
  assert.match(index, /name="search"/);
  assert.match(index, /name="class"/);
  assert.match(index, /name="element"/);
  assert.match(index, /name="rarity"/);
  assert.match(index, /name="sort"/);
  assert.match(index, /data-name="mi fu"/);
  assert.match(index, /data-class="supporter"/);
  assert.match(index, /class="tile-chip tile-class-chip"/);
  assert.match(index, /class="tile-chip tile-element-chip element-nature"/);
  assert.match(index, /\.tile-chips\{display:flex;flex-wrap:nowrap/);
  assert.match(index, />Supporter<\/span><\/span>/);
  assert.match(index, />Nature<\/span><\/span>/);
  assert.match(index, /\.tile-element-chip\.element-heat\{--element-color:#ff6b4a/);
  assert.doesNotMatch(index, /<p>Supporter · Nature<\/p>/);
  assert.match(index, /id="operator-count">1 Operator/);
  assert.match(index, /No operators match the selected filters/);
  assert.match(index, /new Intl\.Collator/);
  assert.doesNotMatch(index, /src="\/endfield\/"/);
});

test("operator pages render the compact rotation overview without redundant fields", () => {
  const entry = operator({
    raw_data: {
      basicAttack: {
        name: "Measured Combo",
        cycleDuration: 2.5,
        timingVerified: true,
        sequences: [
          { sequenceIndex: 1, duration: 0.75, hitCount: 2, hitTimings: [0.25, 0.5] },
          { sequenceIndex: 2, duration: 1.25, hitCount: 1, hitTimings: [0.75] },
          { sequenceIndex: 3, kind: "final_strike", duration: 0.5, hitCount: 1, hitTimings: [0.25] }
        ]
      }
    }
  });
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
  assert.match(page, /backdrop-filter:blur\(15px\) saturate\(135%\)/);
  assert.match(page, /\.operator-page \.top\{z-index:100\}/);
  assert.match(page, /\.operator-page \.portrait-card\{z-index:0;isolation:isolate\}/);
  assert.match(page, /\.portrait-media:before/);
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
  assert.match(page, /href="#batk">BATK/);
  assert.match(page, /data-operator-share-browser data-operator-id="1" data-operator-name="Mi Fu"/);
  assert.match(page, /data-share-type="rotation"/);
  assert.match(page, /data-share-count="rotation"/);
  assert.match(page, /data-share-type="simulation"/);
  assert.match(page, /data-share-count="simulation"/);
  assert.match(page, /id="operator-share-results" hidden/);
  assert.match(page, /js\/ui\/operatorShares\.js\?v=2/);
  assert.match(page, /\.operator-share-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(page, /id="batk"/);
  assert.match(page, /<h2>Measured Combo<\/h2>/);
  assert.match(page, /<span>Total duration<\/span><strong>2\.5s<\/strong>/);
  assert.match(page, /SEQ 1: 0\.75s/);
  assert.match(page, /SEQ 2: 1\.25s/);
  assert.match(page, /FS: 0\.5s/);
  assert.match(page, /--segment-duration:0\.75/);
  assert.match(page, /class="batk-segment-duration">0\.75s<\/strong>/);
  assert.match(page, /class="batk-segment-body"/);
  assert.match(page, /class="batk-hit-track"/);
  assert.match(page, /SEQ 1 hit 1: 0\.25s/);
  assert.match(page, /SEQ 1 hit 2: 0\.5s/);
  assert.match(page, /class="batk-hit is-left-edge" style="left:33\.333%"/);
  assert.match(page, /class="batk-hit-tooltip"/);
  assert.match(page, /\.batk-track-scroll\{padding-top:64px;margin-top:-64px\}/);
  assert.match(page, /class="batk-mobile-hint" aria-hidden="true"><span>Swipe timeline<\/span>/);
  assert.match(page, /\.operator-page \.batk-track-scroll\{scroll-snap-type:x proximity/);
  assert.match(page, /\.operator-page \.batk-track-scroll::-webkit-scrollbar\{height:6px\}/);
  assert.match(page, /\.operator-page \.batk-track\{min-width:560px;height:108px\}/);
  assert.match(page, /<small>BATK TIME<\/small><strong>0\.25s<\/strong>/);
  assert.match(page, /tabindex="0" aria-label="SEQ 2 hit 1: 0\.75s from sequence start, 1\.5s from BATK start"/);
  assert.doesNotMatch(page, /class="batk-segment"[^>]* title=/);
  assert.match(page, /class="batk-segment"[^>]* aria-label="SEQ 1: 0\.75s"/);
  assert.match(page, /style="left:33\.333%"/);
  assert.doesNotMatch(page, /class="batk-sequence-list"/);
  assert.match(page, /class="batk-status is-verified"/);
  assert.match(page, /class="batk-title-row"/);
  assert.match(page, /data-label="Verified"/);
  assert.ok(page.indexOf('id="stats"') < page.indexOf('id="batk"'));
  assert.match(page, /href="#related">Related/);
  assert.match(page, /id="related"/);
  assert.match(page, /class="related-avatar-frame"/);
  assert.match(page, /\.operator-page \.related-avatar-frame/);
  assert.match(page, /\.operator-page \.related-avatar-frame:before/);
  assert.match(page, /backdrop-filter:blur\(9px\) saturate\(130%\)/);
  assert.match(page, /name="twitter:card" content="summary_large_image"/);
  assert.match(page, /property="og:image:alt"/);
  assert.match(page, /"@type":"WebPage"/);
  assert.match(page, /a:focus-visible/);
  assert.doesNotMatch(page, /Arknights: Endfield Rotation Tool/);
  assert.doesNotMatch(page, /class="tool-name"/);
  assert.doesNotMatch(page, /Back to Operator Database/);
  assert.doesNotMatch(page, /Open Rotation Tool/);
  assert.doesNotMatch(page, /class="nav-links"/);
  assert.doesNotMatch(page, /<section class="meta-strip">/);
  assert.doesNotMatch(page, /<span class="stat-label">Ultimate<\/span>/);
  assert.doesNotMatch(page, /-webkit-line-clamp/);
});

test("operator share browser loads live counts and safe public share cards", () => {
  assert.match(operatorSharesScript, /rpc\("get_operator_share_summary"/);
  assert.match(operatorSharesScript, /rpc\("list_operator_shares"/);
  assert.match(operatorSharesScript, /p_operator_id:\s*operatorId/);
  assert.match(operatorSharesScript, /open\.href = `\/endfield\/#share=/);
  assert.match(operatorSharesScript, /list\.replaceChildren/);
  assert.doesNotMatch(operatorSharesScript, /innerHTML/);
});

test("BATK timing falls back to summed sequence durations and supports missing data", () => {
  const timeline = getBasicAttackTimeline(operator({
    raw_data: {
      basicAttack: {
        sequences: [
          { label: "A1", durationSeconds: 0.4 },
          { label: "A2", durationSeconds: 0.6 }
        ]
      }
    }
  }));

  assert.equal(timeline.totalDuration, 1);
  assert.deepEqual(timeline.sequences, [
    { label: "A1", duration: 0.4, hitCount: 0, hitTimings: [], timingComplete: false },
    { label: "A2", duration: 0.6, hitCount: 0, hitTimings: [], timingComplete: false }
  ]);
  assert.equal(timeline.verified, false);

  const page = createOperatorPage(operator(), [operator()], new Map());
  assert.match(page, /id="batk"/);
  assert.match(page, /No Basic Attack sequence timing is available/);
  assert.match(page, /class="batk-status is-unverified"/);
  assert.match(page, /data-label="Not verified"/);
});

test("operator pages render an additional Ultimate-form BATK timeline", () => {
  const entry = operator({
    id: 9,
    slug: "zhuang",
    name: "Zhuang",
    raw_data: {
      basicAttack: {
        name: "Jolting Arts",
        cycleDuration: 1,
        timingVerified: true,
        sequences: [
          { label: "FS", kind: "final_strike", duration: 1, hitCount: 1, hitTimings: [0.8] }
        ]
      }
    }
  });
  const formVariants = new Map([[
    9,
    [{
      form_key: "empyrean_of_truth",
      action_override: {
        name: "Jolting Arts Â· Empyrean of Truth",
        cycleDuration: 3,
        timingVerified: false,
        sequences: [
          { label: "SEQ 1", duration: 0.8, hitCount: 1, hitTimings: [0.6] },
          { label: "SEQ 2", duration: 1, hitCount: 1, hitTimings: [0.75] },
          { label: "FS", kind: "final_strike", duration: 1.2, hitCount: 1, hitTimings: [1] }
        ]
      }
    }]
  ]]);

  const page = createOperatorPage(entry, [entry], new Map(), formVariants);

  assert.match(page, /Ultimate form BATK/);
  assert.match(page, /Jolting Arts · Empyrean of Truth/);
  assert.match(page, /<span>Total duration<\/span><strong>3s<\/strong>/);
  assert.match(page, /class="panel batk-section batk-form-section"/);
  assert.equal((page.match(/class="panel batk-section/g) || []).length, 2);
  assert.match(page, /class="batk-status is-unverified"/);
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
    assert.match(fs.readFileSync(sitemapPath, "utf8"), /endfield\/community\//);
    assert.deepEqual(
      fs.readdirSync(root).filter((name) => name.includes(".tmp-") || name.includes(".backup-")),
      []
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
