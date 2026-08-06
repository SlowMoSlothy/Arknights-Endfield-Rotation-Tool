import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync("supabase/basic_attack_admin_editor.sql", "utf8");
const adminScript = fs.readFileSync("endfield/js/ui/adminPanel.js", "utf8");
const adminStyles = fs.readFileSync("endfield/css/admin.css", "utf8");

test("BATK admin migration replaces a complete profile through an admin-only RPC", () => {
  assert.match(migration, /replace_operator_basic_attack_profile\(integer, text, jsonb\)/i);
  assert.match(migration, /if not public\.is_app_admin\(\)/i);
  assert.match(migration, /delete from public\.operator_basic_attack_sequences/i);
  assert.match(migration, /insert into public\.operator_basic_attack_sequences/i);
  assert.match(migration, /grant execute on function public\.replace_operator_basic_attack_profile\(integer, text, jsonb\) to authenticated/i);
});

test("BATK admin migration validates forms, timings, multipliers, and cycle endings", () => {
  assert.match(migration, /normalized_form_key !~ '\^\[a-z0-9\]/i);
  assert.match(migration, /Timing mode must be absolute or intervals/i);
  assert.match(migration, /absolute hit timing after its duration/i);
  assert.match(migration, /interval timings exceed its duration/i);
  assert.match(migration, /hit multipliers must match its hit count/i);
  assert.match(migration, /Exactly one sequence must end the BATK cycle/i);
});

test("admin panel exposes a database-backed BATK editor with form profiles and live preview", () => {
  assert.match(adminScript, /id: "batk"/);
  assert.match(adminScript, /\.from\("operator_basic_attack_sequences"\)/);
  assert.match(adminScript, /loadAdminBatkEditor/);
  assert.match(adminScript, /new_form/);
  assert.match(adminScript, /id = "adminBatkPreview"/);
  assert.match(adminScript, /replace_operator_basic_attack_profile/);
  assert.match(adminScript, /profile_data: payload/);
});

test("BATK editor stays compact and responsive", () => {
  assert.match(adminStyles, /\.admin-batk-sequence-grid\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(adminStyles, /\.admin-batk-preview\s*\{[^}]*overflow-x: auto/s);
  assert.match(adminStyles, /@media \(max-width: 520px\)[\s\S]*\.admin-batk-toolbar/s);
});
