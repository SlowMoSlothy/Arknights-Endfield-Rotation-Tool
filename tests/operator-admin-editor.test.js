import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/operator_admin_editor.sql", "utf8");
const adminScript = fs.readFileSync("endfield/js/ui/adminPanel.js", "utf8");
const adminStyles = fs.readFileSync("endfield/css/admin.css", "utf8");

test("operator editor writes catalog fields through an admin-only RPC", () => {
  assert.match(migration, /update_operator_profile\(integer, jsonb\)/i);
  assert.match(migration, /if not public\.is_app_admin\(\)/i);
  assert.match(migration, /update public\.operators as op/i);
  assert.match(migration, /grant execute on function public\.update_operator_profile\(integer, jsonb\) to authenticated/i);
});

test("operator editor validates core catalog data in the database", () => {
  assert.match(migration, /normalized_slug !~ '\^\[a-z0-9\]/i);
  assert.match(migration, /normalized_star not between 1 and 6/i);
  assert.match(migration, /Class, element, and weapon type are required/i);
  assert.match(migration, /existing\.game = 'arknights_endfield'/i);
});

test("admin panel exposes editable operator fields and saves the profile", () => {
  assert.match(adminScript, /function renderAdminOperatorEditor/);
  assert.match(adminScript, /function validateAdminOperatorEditor/);
  assert.match(adminScript, /client\.rpc\("update_operator_profile"/);
  assert.match(adminScript, /createAdminBatkInput\("Weapon type"/);
  assert.match(adminScript, /createAdminBatkInput\("Visible"/);
});

test("operator editor is responsive and retains compact visibility toggles", () => {
  assert.match(adminStyles, /\.admin-operator-fields\s*\{[^}]*repeat\(4, minmax\(0, 1fr\)\)/s);
  assert.match(adminStyles, /\.admin-operator-visibility-grid\s*\{[^}]*repeat\(auto-fill, 100px\)/s);
  assert.match(adminStyles, /@media \(max-width: 520px\)[\s\S]*\.admin-operator-fields\s*\{[^}]*grid-template-columns: 1fr/s);
});
