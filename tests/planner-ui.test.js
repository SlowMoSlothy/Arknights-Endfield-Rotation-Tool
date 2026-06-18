import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const layoutCss = fs.readFileSync("endfield/css/layout.css", "utf8");
const rotationCss = fs.readFileSync("endfield/css/rotation.css", "utf8");
const rotationGridScript = fs.readFileSync("endfield/js/ui/rotationGrid.js", "utf8");
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

test("simulation cursor toolbar stays compact on desktop and only wraps on narrow screens", () => {
  assert.match(rotationCss, /\.rotation-sim-cursor-toolbar\s*\{[\s\S]*grid-template-columns:\s*max-content minmax\(240px, 1fr\) max-content/);
  assert.match(rotationCss, /\.rotation-sim-cursor-controls\s*\{[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(rotationCss, /@media \(max-width:\s*760px\)\s*\{[\s\S]*\.rotation-sim-cursor-controls\s*\{[\s\S]*flex-wrap:\s*wrap/);
});

test("simulation playback keeps the cursor centered in the visible track", () => {
  assert.match(rotationGridScript, /const playbackFollowOptions = \{[\s\S]*scrollTrack:\s*true[\s\S]*scrollTrackAlign:\s*"center"[\s\S]*scrollTrackInstant:\s*true/);
  assert.match(rotationGridScript, /setCursorTime\(simulationCursorTime, playbackFollowOptions\)/);
  assert.match(rotationGridScript, /setCursorTime\(nextTime, playbackFollowOptions\)/);
  assert.match(rotationGridScript, /align:\s*options\.scrollTrackAlign \|\| \(simulationCursorPlaybackTimer \? "center" : undefined\)/);
});
