import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const mobileCss = fs.readFileSync("endfield/css/mobile.css", "utf8");

test("mobile builder menu shows every action in a compact icon grid", () => {
  assert.match(mobileCss, /\.builder-sidebar\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)[^}]*overflow:\s*visible/s);
  assert.match(mobileCss, /\.sidebar-command\s*\{[^}]*min-height:\s*58px;[^}]*grid-template-rows:\s*27px minmax\(18px, auto\)[^}]*place-items:\s*center/s);
  assert.match(mobileCss, /\.sidebar-command-icon\s*\{[^}]*width:\s*27px;[^}]*height:\s*27px/s);
  assert.match(mobileCss, /\.sidebar-command-label\s*\{[^}]*font-size:\s*8px;[^}]*text-align:\s*center[^}]*-webkit-line-clamp:\s*2/s);
});
