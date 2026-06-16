import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const communityHtml = fs.readFileSync("endfield/community/index.html", "utf8");
const communityScript = fs.readFileSync("endfield/community/community-page.js", "utf8");
const plannerCommunityScript = fs.readFileSync("endfield/js/ui/communityRotations.js", "utf8");

test("community rotations use a standalone page instead of a planner modal", () => {
  assert.match(plannerHtml, /id="openCommunityRotationsBtn"[^>]+href="community\/"/);
  assert.doesNotMatch(plannerHtml, /id="communityModal"/);
  assert.match(communityHtml, /<body>/);
  assert.match(communityHtml, /id="rotationGrid"/);
  assert.doesNotMatch(communityHtml, /settings-modal|communityModal/);
});

test("community page keeps planner loading and legacy links available", () => {
  assert.match(communityScript, /#setup=\$\{encodeURIComponent\(row\.share_code\)\}/);
  assert.match(communityScript, /increment_community_rotation_like/);
  assert.match(communityScript, /increment_community_rotation_view/);
  assert.match(communityScript, /Community rotation link copied/);
  assert.match(communityHtml, /id="pageToast"/);
  assert.match(plannerCommunityScript, /COMMUNITY_PAGE_PATH = "community\/"/);
  assert.match(plannerCommunityScript, /window\.location\.replace\(getCommunityPageUrl/);
});

test("planner allows anonymous community submissions", () => {
  assert.match(plannerCommunityScript, /!isCommunityAccountSignedIn\(\)\) return "Anonymous"/);
  assert.doesNotMatch(plannerCommunityScript, /Sign in before submitting a rotation/);
  assert.match(plannerCommunityScript, /submitted_by: getCommunityAccountUserId\(\) \|\| null/);
});

test("community skill icons use element colors and ultimate fill modes", () => {
  assert.match(communityScript, /short_type,element_type,icon_path/);
  assert.match(communityScript, /ef-fill-\$\{fillMode\}/);
  assert.match(communityScript, /=== "ultimate" \? "full" : "half"/);
  assert.match(communityScript, /elementType: row\.element_type/);
  assert.match(communityHtml, /style\.css\?v=2/);
  assert.match(communityHtml, /community-page\.js\?v=3/);
});
