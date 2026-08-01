import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/operator_visibility_admin.sql", "utf8");
const schema = fs.readFileSync("supabase/schema.sql", "utf8");
const adminScript = fs.readFileSync("endfield/js/ui/adminPanel.js", "utf8");
const adminStyles = fs.readFileSync("endfield/css/admin.css", "utf8");
const plannerLoader = fs.readFileSync("endfield/supabaseClient.js", "utf8");

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
  assert.match(adminScript, /Hide operator/);
  assert.match(adminScript, /Show operator/);
});

test("operator visibility cards use a compact responsive grid", () => {
  assert.match(adminScript, /classList\.toggle\("is-operators"/);
  assert.match(adminStyles, /\.admin-review-list\.is-operators\s*\{[^}]*minmax\(220px, 1fr\)/s);
  assert.match(adminStyles, /@media \(max-width: 520px\)[\s\S]*\.admin-review-list\.is-operators\s*\{\s*grid-template-columns: 1fr/);
});

test("planner excludes hidden operators while treating legacy rows as visible", () => {
  assert.match(plannerLoader, /row\.is_visible !== false/);
  assert.match(plannerLoader, /isVisible: row\.is_visible !== false/);
});
