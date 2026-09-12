import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const loadingCss = fs.readFileSync("endfield/css/loading.css", "utf8");

test("loading screen uses the RotationForge logo and forge presentation", () => {
  assert.match(plannerHtml, /class="app-loading-logo" src="\/favicon-flat\.png" alt="RotationForge"/);
  assert.match(plannerHtml, /Rotation<span>Forge<\/span>/);
  assert.match(plannerHtml, /class="app-loading-progress"/);
  assert.doesNotMatch(plannerHtml, /class="app-loading-logo" src="assets\/header\.png"/);
  assert.match(loadingCss, /\.app-loading-ring\s*\{[^}]*conic-gradient[\s\S]*animation:\s*appLoadingForgeSpin/s);
  assert.match(loadingCss, /rgba\(255,104,0,0\.86\) 54% 61%/);
  assert.doesNotMatch(loadingCss, /rgba\(248,245,70,0\.72\) 54% 61%/);
  assert.match(loadingCss, /\.app-loading-progress span\s*\{[^}]*animation:\s*appLoadingProgress/s);
  assert.match(loadingCss, /@media \(max-width:\s*900px\)/);
});
