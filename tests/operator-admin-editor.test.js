import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/operator_admin_editor.sql", "utf8");
const adminScript = fs.readFileSync("endfield/js/ui/adminPanel.js", "utf8");
const adminStyles = fs.readFileSync("endfield/css/admin.css", "utf8");
const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");

test("operator editor writes catalog fields through an admin-only RPC", () => {
  assert.match(migration, /update_operator_profile\(integer, jsonb\)/i);
  assert.match(migration, /if not public\.is_app_admin\(\)/i);
  assert.match(migration, /update public\.operators as op/i);
  assert.match(migration, /grant execute on function public\.update_operator_profile\(integer, jsonb\) to authenticated/i);
});

test("operator editor validates core catalog data in the database", () => {
  assert.match(migration, /normalized_slug !~ '\^\[a-z0-9\]/i);
  assert.match(migration, /normalized_star not in \(4, 5, 6\)/i);
  assert.match(migration, /normalized_class not in \('Caster', 'Defender', 'Guard', 'Striker', 'Supporter', 'Vanguard'\)/i);
  assert.match(migration, /normalized_element not in \('physical', 'heat', 'electric', 'cryo', 'nature'\)/i);
  assert.match(migration, /normalized_weapon not in \('arts_unit', 'great_sword', 'handcannon', 'polearm', 'sword'\)/i);
  assert.match(migration, /normalized_main_attribute not in \('Strength', 'Agility', 'Intellect', 'Will'\)/i);
  assert.match(migration, /normalized_secondary_attribute not in \('Strength', 'Agility', 'Intellect', 'Will'\)/i);
  assert.match(migration, /Main and secondary attribute must be different/i);
  assert.match(migration, /raw_data = coalesce\(op\.raw_data, '\{\}'::jsonb\) \|\| jsonb_build_object/i);
  assert.match(migration, /existing\.game = 'arknights_endfield'/i);
});

test("admin panel exposes editable operator fields and saves the profile", () => {
  assert.match(adminScript, /function renderAdminOperatorEditor/);
  assert.match(adminScript, /function validateAdminOperatorEditor/);
  assert.match(adminScript, /client\.rpc\("update_operator_profile"/);
  assert.match(adminScript, /createAdminBatkInput\("Weapon type"/);
  assert.match(adminScript, /createAdminBatkInput\("Visible"/);
});

test("operator stars, classes, elements, and weapons use fixed dropdown options", () => {
  assert.match(adminScript, /ADMIN_OPERATOR_STAR_OPTIONS/);
  assert.match(adminScript, /ADMIN_OPERATOR_CLASS_OPTIONS/);
  assert.match(adminScript, /ADMIN_OPERATOR_ELEMENT_OPTIONS/);
  assert.match(adminScript, /ADMIN_OPERATOR_WEAPON_OPTIONS/);
  assert.match(adminScript, /createAdminBatkInput\("Class"[\s\S]*select: ADMIN_OPERATOR_CLASS_OPTIONS/);
  assert.match(adminScript, /createAdminBatkInput\("Element"[\s\S]*select: ADMIN_OPERATOR_ELEMENT_OPTIONS/);
  assert.match(adminScript, /createAdminBatkInput\("Weapon type"[\s\S]*select: ADMIN_OPERATOR_WEAPON_OPTIONS/);
});

test("operator main and secondary attributes use fixed distinct dropdown values", () => {
  assert.match(adminScript, /ADMIN_OPERATOR_ATTRIBUTE_OPTIONS/);
  assert.match(adminScript, /createAdminBatkInput\("Main attribute"[\s\S]*select: ADMIN_OPERATOR_ATTRIBUTE_OPTIONS/);
  assert.match(adminScript, /createAdminBatkInput\("Secondary attribute"[\s\S]*select: ADMIN_OPERATOR_ATTRIBUTE_OPTIONS/);
  assert.match(adminScript, /Main and secondary attribute must be different/);
  assert.match(adminScript, /mainAttribute: String\(rawData\.mainAttribute/);
});

test("operator editor is responsive and retains compact visibility toggles", () => {
  assert.match(adminStyles, /\.admin-operator-fields\s*\{[^}]*repeat\(4, minmax\(0, 1fr\)\)/s);
  assert.match(adminStyles, /\.admin-operator-visibility-grid\s*\{[^}]*repeat\(auto-fill, 100px\)/s);
  assert.match(adminStyles, /@media \(max-width: 520px\)[\s\S]*\.admin-operator-fields\s*\{[^}]*grid-template-columns: 1fr/s);
});

test("admin control renders as an in-page workspace instead of a modal", () => {
  assert.match(plannerHtml, /id="adminPanelView" class="admin-page"/);
  assert.doesNotMatch(plannerHtml, /id="adminModal"/);
  assert.match(adminScript, /document\.body\.classList\.add\("admin-page-open"\)/);
  assert.match(adminStyles, /body\.admin-page-open #builderScreen/);
});
