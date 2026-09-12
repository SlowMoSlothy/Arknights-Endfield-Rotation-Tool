import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const landingHtml = fs.readFileSync("index.html", "utf8");

test("landing page prioritizes tools and moves repetitive highlights below them", () => {
  const heroIndex = landingHtml.indexOf('<section class="hero"');
  const toolsIndex = landingHtml.indexOf('<section id="tools"');
  const highlightsIndex = landingHtml.indexOf('<section class="feature-grid"');

  assert.ok(heroIndex > 0);
  assert.ok(heroIndex < toolsIndex);
  assert.ok(toolsIndex > 0);
  assert.ok(highlightsIndex > toolsIndex);
});

test("mobile landing page keeps the hero first and hides repetitive highlights", () => {
  assert.doesNotMatch(landingHtml, /#tools\s*\{[^}]*order:\s*-2/s);
  assert.match(landingHtml, /@media \(max-width:\s*760px\)[\s\S]*\.feature-grid\s*\{[^}]*display:\s*none/s);
});

test("landing page uses concise non-repetitive header copy", () => {
  assert.match(landingHtml, /Combat Rotation Tools/);
  assert.match(landingHtml, /Forge the perfect rotation\./);
  assert.match(landingHtml, /Build your team, plan every skill, and share the result\./);
  assert.match(landingHtml, /<h2 id="tools-title">Choose your tool<\/h2>/);
  assert.doesNotMatch(landingHtml, /RotationForge Tools/);
  assert.doesNotMatch(landingHtml, /Available tools/);
});
