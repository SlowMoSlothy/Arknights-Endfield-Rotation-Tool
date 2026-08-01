import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/operator_visibility_admin.sql", "utf8");
const schema = fs.readFileSync("supabase/schema.sql", "utf8");
const adminScript = fs.readFileSync("endfield/js/ui/adminPanel.js", "utf8");
const adminStyles = fs.readFileSync("endfield/css/admin.css", "utf8");
const plannerLoader = fs.readFileSync("endfield/supabaseClient.js", "utf8");
const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");

test("operator visibility migration is rerunnable and preserves existing public operators", () => {
  assert.match(migration, /add column if not exists is_visible boolean not null default true/i);
  assert.match(schema, /is_visible boolean not null default true/i);
  assert.match(migration, /public\.is_app_admin\(\)/);
  assert.match(migration, /set_operator_visibility/);
  assert.match(migration, /revoke all on function public\.set_operator_visibility/);
  assert.match(migration, /grant execute on function public\.set_operator_visibility\(integer, boolean\) to authenticated/);
});

test("admin panel controls operator visibility through the secured Supabase RPC", () => {
  assert.match(adminScript, /id: "operators"/);
  assert.match(adminScript, /\.from\("operators"\)/);
  assert.match(adminScript, /client\.rpc\("set_operator_visibility"/);
  assert.match(adminScript, /setAdminOperatorVisibility\(operator\.id, !isVisible\)/);
  assert.match(adminScript, /aria-checked/);
});

test("admin session header displays the Supabase username instead of the email address", () => {
  assert.match(plannerHtml, /id="adminUserName"/);
  assert.doesNotMatch(plannerHtml, /id="adminUserEmail"/);
  assert.match(adminScript, /\.from\("user_profiles"\)/);
  assert.match(adminScript, /\.select\("username"\)/);
  assert.match(adminScript, /adminPanelState\.username \|\| getAdminFallbackUsername\(\)/);
});

test("operator visibility cards reuse the compact selectable operator-card grid", () => {
  assert.match(adminScript, /classList\.toggle\("is-operators"/);
  assert.match(adminScript, /operator-card operator-element-/);
  assert.match(adminScript, /setAttribute\("role", "switch"\)/);
  assert.match(adminStyles, /\.admin-review-list\.is-operators\s*\{[^}]*repeat\(auto-fill, 100px\)/s);
  assert.match(adminStyles, /@media \(max-width: 520px\)[\s\S]*repeat\(auto-fill, 86px\)/);
});

test("planner excludes hidden operators while treating legacy rows as visible", () => {
  assert.match(plannerLoader, /row\.is_visible !== false/);
  assert.match(plannerLoader, /isVisible: row\.is_visible !== false/);
});
