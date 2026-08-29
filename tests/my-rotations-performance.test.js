import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const myRotationsScript = fs.readFileSync("endfield/js/ui/myRotations.js", "utf8");
const myRotationsStyles = fs.readFileSync("endfield/css/my-rotations.css", "utf8");

test("My Rotations locks the background at its current scroll position", () => {
  assert.match(myRotationsScript, /document\.documentElement\?\.classList\.add\("my-rotations-modal-open"\)/);
  assert.match(myRotationsScript, /document\.body\?\.classList\.remove\("my-rotations-modal-open"\)/);
  assert.match(myRotationsScript, /document\.body\.style\.top = `-\$\{myRotationsState\.modalScrollY\}px`/);
  assert.match(myRotationsScript, /window\.scrollTo\(\{ top: myRotationsState\.modalScrollY, left: 0, behavior: "instant" \}\)/);
  assert.match(myRotationsStyles, /body\.my-rotations-modal-open\s*{[^}]*position:\s*fixed/s);
});

test("My Rotations uses one contained scroll area without backdrop blur", () => {
  assert.match(myRotationsStyles, /#myRotationsModal\s*{[^}]*overflow:\s*hidden[^}]*backdrop-filter:\s*none/s);
  assert.match(myRotationsStyles, /#myRotationsModal \.my-rotations-dialog,[\s\S]*backdrop-filter:\s*none/s);
  assert.match(myRotationsStyles, /\.my-rotations-list\s*{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior:\s*contain[^}]*contain:\s*layout paint/s);
  assert.match(myRotationsStyles, /\.my-rotation-card\s*{[^}]*contain:\s*layout paint/s);
  assert.match(plannerHtml, /css\/style\.css\?v=\d+/);
  assert.match(plannerHtml, /js\/ui\/myRotations\.js\?v=2/);
});
