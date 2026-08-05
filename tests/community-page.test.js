import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const communityHtml = fs.readFileSync("endfield/community/index.html", "utf8");
const communityScript = fs.readFileSync("endfield/community/community-page.js", "utf8");
const shortShareMigration = fs.readFileSync("supabase/rotation_share_codes.sql", "utf8");

test("Discover is a standalone directory linked from the planner", () => {
  assert.match(plannerHtml, /id="openCommunityRotationsBtn"[^>]+href="community\/"/);
  assert.match(plannerHtml, /sidebar-command-label">Discover</);
  assert.doesNotMatch(plannerHtml, /onclick="saveRotationInCommunity\(\)"/);
  assert.match(communityHtml, /<h1 id="pageTitle">Rotations &amp; Simulations<\/h1>/);
  assert.match(communityHtml, /id="rotationGrid"/);
  assert.match(communityHtml, /style\.css\?v=4/);
  assert.match(communityHtml, /community-page\.js\?v=5/);
});

test("Discover separates rotation and simulation shares", () => {
  assert.match(communityHtml, /id="rotationTab"[\s\S]*data-share-type="rotation"/);
  assert.match(communityHtml, /id="simulationTab"[\s\S]*data-share-type="simulation"/);
  assert.match(communityScript, /share\.share_type === discoverState\.type/);
  assert.match(communityScript, /#share=\$\{encodeURIComponent\(share\.short_code\)\}/);
  assert.match(communityScript, /mode-chip mode-\$\{share\.share_type\}/);
  assert.match(communityScript, /item\.setAttribute\("role", "link"\)/);
  assert.match(communityScript, /event\.target\.closest\("a, button, input, select, textarea"\)/);
  assert.match(communityScript, /window\.location\.href = plannerUrl\(share\)/);
  assert.match(communityScript, /resolve_rotation_share/);
  assert.match(communityScript, /actions\.slice\(0, 6\)/);
  assert.match(communityScript, /item\.addEventListener\("pointerenter", preview\.load\)/);
  assert.match(communityScript, /classList\.contains\("is-preview-open"\)/);
});

test("Discover reads public short shares through a restricted RPC", () => {
  assert.match(shortShareMigration, /create or replace function public\.list_public_rotation_shares/);
  assert.match(shortShareMigration, /where share\.is_public/);
  assert.match(shortShareMigration, /share\.expires_at is null or share\.expires_at > now\(\)/);
  assert.match(shortShareMigration, /'rotation_count'/);
  assert.match(shortShareMigration, /'simulation_count'/);
  assert.match(shortShareMigration, /grant execute on function public\.list_public_rotation_shares\(integer\) to anon, authenticated/);
  assert.match(shortShareMigration, /legacy-community:/);
  assert.match(communityScript, /rpc\("list_public_rotation_shares", \{ p_limit: 500 \}\)/);
  assert.doesNotMatch(communityScript, /from\("community_rotations"\)/);
});

test("Discover exposes useful team and metadata filters", () => {
  assert.match(communityHtml, /id="searchInput"/);
  assert.match(communityHtml, /id="operatorFilter"/);
  assert.match(communityHtml, /id="elementFilter"/);
  assert.match(communityHtml, /id="classFilter"/);
  assert.match(communityScript, /share\.author_name/);
  assert.match(communityScript, /share\.description/);
  assert.match(communityScript, /share\.short_code/);
  assert.match(communityScript, /list\(share\.operator_ids\)/);
});
