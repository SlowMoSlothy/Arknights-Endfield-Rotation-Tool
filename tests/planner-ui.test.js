import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const layoutCss = fs.readFileSync("endfield/css/layout.css", "utf8");
const rotationCss = fs.readFileSync("endfield/css/rotation.css", "utf8");
const rotationGridScript = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
const weaponAtkChartScript = fs.readFileSync("endfield/js/ui/weaponAtkChart.js", "utf8");
const uiSettingsScript = fs.readFileSync("endfield/js/logic/uiSettings.js", "utf8");

test("planner exposes a visible timeline mode switch in the rotation toolbar", () => {
  assert.match(plannerHtml, /class="rotation-actions"[^>]*aria-label="Rotation actions"/);
  assert.match(plannerHtml, /class="rotation-mode-switch"[^>]*aria-label="Rotation mode"/);
  assert.match(plannerHtml, /class="rotation-mode-switch-btn"[^>]*data-setting="timelineMode"[\s\S]*data-value="simulation"/);
  assert.match(plannerHtml, /class="rotation-mode-switch-btn"[^>]*data-setting="timelineMode"[\s\S]*data-value="slot"/);
  assert.doesNotMatch(plannerHtml, /Rotation Mode/);
  assert.doesNotMatch(plannerHtml, /class="settings-option-btn settings-mode-btn"[^>]*data-setting="timelineMode"/);
});

test("timeline mode switch has active styling and accessible pressed state", () => {
  assert.match(rotationCss, /\.rotation-mode-switch\s*\{/);
  assert.match(rotationCss, /\.rotation-mode-switch-btn\.active\s*\{/);
  assert.match(uiSettingsScript, /btn\.setAttribute\("aria-pressed", String\(isActive\)\)/);
});

test("sticky header stays above planner toolbar controls while scrolling", () => {
  assert.match(layoutCss, /\.top\s*\{[\s\S]*z-index:\s*120/);
  assert.match(rotationCss, /\.rotation-actions\s*\{[\s\S]*z-index:\s*40/);
});

test("simulation cursor toolbar uses a dedicated readout row and only wraps controls on narrow screens", () => {
  assert.match(rotationCss, /\.rotation-sim-cursor-toolbar\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) max-content/);
  assert.match(rotationCss, /\.rotation-sim-cursor-readout\s*\{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(rotationCss, /\.rotation-sim-cursor-controls\s*\{[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(rotationCss, /@media \(max-width:\s*760px\)\s*\{[\s\S]*\.rotation-sim-cursor-controls\s*\{[\s\S]*flex-wrap:\s*wrap/);
});

test("simulation playback keeps the cursor centered in the visible track", () => {
  assert.match(rotationGridScript, /const playbackFollowOptions = \{[\s\S]*scrollTrack:\s*true[\s\S]*scrollTrackAlign:\s*"center"[\s\S]*scrollTrackInstant:\s*true/);
  assert.match(rotationGridScript, /setCursorTime\(simulationCursorTime, playbackFollowOptions\)/);
  assert.match(rotationGridScript, /setCursorTime\(nextTime, playbackFollowOptions\)/);
  assert.match(rotationGridScript, /align:\s*options\.scrollTrackAlign \|\| \(simulationCursorPlaybackTimer \? "center" : undefined\)/);
});

test("simulation renders duration-aware buff and debuff tracks", () => {
  assert.match(rotationGridScript, /function buildSimulationEffectIntervals\(events, type, durationSeconds, weaponEffectHistory = \[\]\)/);
  assert.match(rotationGridScript, /activeBuffsBefore[\s\S]*activeDebuffsBefore/);
  assert.match(rotationGridScript, /const expectedEnd = toSimulationEffectTimelineNumber\(interval\.expectedEnd\)/);
  assert.match(rotationGridScript, /expectedEnd \?\? requestedEnd/);
  assert.match(rotationGridScript, /window\.__simulationWeaponAtkSource\?\.effectHistory/);
  assert.match(rotationGridScript, /createSimulationEffectTimelineTrack\([\s\S]*"buff"/);
  assert.match(rotationGridScript, /createSimulationEffectTimelineTrack\([\s\S]*"debuff"/);
  assert.match(rotationGridScript, /function createSimulationEffectInspector\(interval, type\)/);
  assert.match(rotationGridScript, /inspectorEventsByKey/);
  assert.match(rotationGridScript, /createSimulationEffectInspector\(interval, type\)/);
  assert.match(rotationGridScript, /attachSimulationInspector\(/);
  assert.doesNotMatch(rotationGridScript, /bar\.title\s*=/);
  assert.match(rotationCss, /\.rotation-sim-effect-track\.is-buff/);
  assert.match(rotationCss, /\.rotation-sim-effect-track\.is-debuff/);
});

test("simulation loads generic battlefield resources and exposes them in the inspector", () => {
  const html = fs.readFileSync("endfield/index.html", "utf8");
  const rotationGrid = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
  const rotationCss = fs.readFileSync("endfield/css/rotation.css", "utf8");
  assert.match(html, /js\/logic\/battlefieldResourceEngine\.js/);
  assert.match(rotationGrid, /resolveBattlefieldResourceSkill/);
  assert.match(rotationGrid, /"Battlefield Resource"/);
  assert.match(rotationGrid, /buildSimulationBattlefieldResourceIntervals/);
  assert.match(rotationGrid, /createSimulationBattlefieldResourceIcon/);
  assert.match(rotationGrid, /rotation-sim-resource-cell/);
  assert.match(rotationCss, /\.rotation-sim-resource-grid/);
  assert.match(rotationCss, /\.rotation-sim-resource-cell\.is-filled/);
});

test("simulation lets a newly applied stack satisfy a total-stack Combo trigger", () => {
  assert.match(rotationGridScript, /getFinalStrikeEventEffectMap\(sourceOperatorId, contextEffectMap = \{\}\)/);
  assert.match(rotationGridScript, /getFinalStrikeEventEffectMap\(event\.sourceOperatorId, persistentEffectMap\)/);
  assert.match(rotationGridScript, /getSimulationConsumedBuffProcContext\(event\.skillData, persistentEffectMap\)/);
  assert.match(rotationGridScript, /addSimulationEffectsToMap\(currentEffects, consumedProcContext\.effects\)/);
  assert.match(rotationGridScript, /removeConsumedDebuffsFromEffectMap\(chainComboSkill, chainEffectMap\)/);
  assert.match(rotationGridScript, /currentTriggerMap\[effectName\][\s\S]*Math\.max\(1, resolvedAmount\)/);
  assert.match(rotationGridScript, /sourceOperatorId: resolvedComboOperatorId/);
});

test("simulation resolves consumed-effect scaling from Supabase skill data", () => {
  assert.match(rotationGridScript, /function applySimulationConsumedEffectScaling\(skillData, activeDebuffsBefore = \[\], triggerEffectMap = \{\}\)/);
  assert.match(rotationGridScript, /damageAtkMultiplierPerStack/);
  assert.match(rotationGridScript, /ultimateEnergyPerStack/);
  assert.match(rotationGridScript, /valuePercentPerStack/);
  assert.match(rotationGridScript, /consumedEffectState:[\s\S]*stacks: consumedStacks/);
});

test("simulation track chooser persists visibility and keeps injected charts aligned", () => {
  assert.match(rotationGridScript, /SIMULATION_TRACK_VISIBILITY_STORAGE_KEY/);
  assert.match(rotationGridScript, /function openSimulationTrackModal\(\)/);
  assert.match(rotationGridScript, /function applySimulationTrackLayout\(/);
  assert.match(rotationGridScript, /rotation-sim-track-button/);
  assert.match(weaponAtkChartScript, /chart\.dataset\.simulationTrack = "atk"/);
  assert.match(weaponAtkChartScript, /chart\.dataset\.simulationTrack = "damage"/);
  assert.match(weaponAtkChartScript, /applySimulationTrackLayout\(labels, body\)/);
  assert.match(rotationCss, /\.simulation-track-option/);
});
