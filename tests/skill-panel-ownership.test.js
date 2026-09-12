import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const skillsPanelScript = fs.readFileSync("endfield/js/ui/skillsPanel.js", "utf8");
const skillsStyles = fs.readFileSync("endfield/css/skills.css", "utf8");
const rotationStyles = fs.readFileSync("endfield/css/rotation.css", "utf8");
const mobileStyles = fs.readFileSync("endfield/css/mobile.css", "utf8");

test("operator skill rows expose a visible owner label and element accent", () => {
  assert.match(skillsPanelScript, /operator-owned-skill-row/);
  assert.match(skillsPanelScript, /operator-skill-owner/);
  assert.match(skillsPanelScript, /operator-element-\$\{operatorElement/);
  assert.match(skillsStyles, /\.operator-skill-owner\s*\{/);
  assert.match(skillsStyles, /\.operator-skill-owner\s*\{[^}]*top:\s*auto[^}]*bottom:\s*calc\(100% - 1px\)[^}]*width:\s*calc\(100% - 16px\)[^}]*justify-content:\s*center/s);
  assert.match(skillsStyles, /var\(--element-color/);
});

test("attribute-dependent operators expose a persisted INT/WILL skill switch", () => {
  assert.match(skillsPanelScript, /createOperatorAttributeVariantControl/);
  assert.match(skillsPanelScript, /getOperatorAttributeVariantSelection/);
  assert.match(skillsPanelScript, /setOperatorAttributeVariantSelection/);
  assert.match(skillsStyles, /\.operator-attribute-variant-btn\.active/);
  assert.match(skillsStyles, /\.operator-skill-owner:has\(\.operator-attribute-variant\)[^}]*width:\s*calc\(100% - 16px\)[^}]*top:\s*auto[^}]*bottom:\s*calc\(100% - 1px\)[^}]*pointer-events:\s*none/s);
  assert.match(skillsStyles, /\.operator-attribute-variant\s*\{[^}]*pointer-events:\s*auto/s);
  assert.match(mobileStyles, /\.operator-skill-owner:has\(\.operator-attribute-variant\)[^}]*top:\s*auto[^}]*bottom:\s*calc\(100% - 1px\)/s);
});

test("operator skill rows are centered below the visible avatar area", () => {
  assert.match(skillsStyles, /\.operator-owned-skill-row\s*\{[^}]*width:\s*calc\(100% - 8px\)[^}]*align-self:\s*center/s);
  assert.match(skillsStyles, /\.operator-skill-wrapper\.leader \.operator-owned-skill-row\s*\{[^}]*translateX\(8px\)/s);
  assert.match(skillsStyles, /\.operator-skill-card\.leader \.skill-row\s*\{[^}]*left:\s*auto/s);
});

test("mobile skill icons use a larger tap-friendly size", () => {
  assert.match(mobileStyles, /#rotationBuilderPanel \.skill-small,[\s\S]*--ef-size:\s*26px/);
  assert.match(mobileStyles, /\.skill-row\s*\{[^}]*width:\s*calc\(100% - 10px\)[^}]*height:\s*38px/s);
});

test("planner skill icons stay compact on desktop and become tap-friendly on mobile", () => {
  assert.match(skillsStyles, /\.skill-small\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;/s);
  assert.match(rotationStyles, /#rotationBuilderPanel \.skill-small\s*\{[^}]*width:\s*26px;[^}]*height:\s*26px;/s);
  assert.match(mobileStyles, /\.skill-small\s*\{[^}]*width:\s*26px;[^}]*height:\s*26px;/s);
});

test("desktop operator cards use the available skills panel width", () => {
  assert.match(skillsStyles, /@media \(min-width: 1100px\)[\s\S]*\.operators-skills-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(148px, 260px\)\)[^}]*justify-content:\s*space-between[^}]*width:\s*100%/s);
  assert.match(skillsStyles, /@media \(min-width: 1100px\)[\s\S]*\.operator-skill-wrapper\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0/s);
});
