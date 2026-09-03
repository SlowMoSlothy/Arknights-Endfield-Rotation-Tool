import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const skillsPanelScript = fs.readFileSync("endfield/js/ui/skillsPanel.js", "utf8");
const skillsStyles = fs.readFileSync("endfield/css/skills.css", "utf8");
const mobileStyles = fs.readFileSync("endfield/css/mobile.css", "utf8");

test("operator skill rows expose a visible owner label and element accent", () => {
  assert.match(skillsPanelScript, /operator-owned-skill-row/);
  assert.match(skillsPanelScript, /operator-skill-owner/);
  assert.match(skillsPanelScript, /operator-element-\$\{operatorElement/);
  assert.match(skillsStyles, /\.operator-skill-owner\s*\{/);
  assert.match(skillsStyles, /var\(--element-color/);
});

test("planner skill icons use the compact size on desktop and mobile", () => {
  assert.match(skillsStyles, /\.skill-small\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;/s);
  assert.match(mobileStyles, /\.skill-small\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;/s);
});

test("desktop operator cards use the available skills panel width", () => {
  assert.match(skillsStyles, /@media \(min-width: 1100px\)[\s\S]*\.operators-skills-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(148px, 260px\)\)[^}]*justify-content:\s*space-between[^}]*width:\s*100%/s);
  assert.match(skillsStyles, /@media \(min-width: 1100px\)[\s\S]*\.operator-skill-wrapper\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/s);
});
