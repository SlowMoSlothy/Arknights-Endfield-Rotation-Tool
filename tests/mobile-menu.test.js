import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const mobileCss = fs.readFileSync("endfield/css/mobile.css", "utf8");
const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const accountScript = fs.readFileSync("endfield/js/ui/myRotations.js", "utf8");
const adminScript = fs.readFileSync("endfield/js/ui/adminPanel.js", "utf8");

test("mobile navigation uses a header trigger and off-canvas menu", () => {
  assert.match(plannerHtml, /id="mobileNavToggle"[^>]*aria-controls="builderSidebar"/s);
  assert.match(plannerHtml, /id="builderSidebar" class="builder-sidebar"/);
  assert.match(plannerHtml, /id="mobileNavBackdrop"/);
  assert.match(mobileCss, /\.builder-sidebar\s*\{[^}]*position:\s*fixed;[^}]*height:\s*100dvh;[^}]*transform:\s*translateX\(-105%\)/s);
  assert.match(mobileCss, /body\.mobile-nav-open \.builder-sidebar\s*\{[^}]*transform:\s*translateX\(0\)/s);
  assert.match(accountScript, /document\.body\.classList\.add\("mobile-nav-open"\)/);
  assert.match(accountScript, /document\.body\.classList\.remove\("mobile-nav-open"\)/);
  assert.match(accountScript, /classList\.contains\("admin-page-open"\)[\s\S]*closeAdminPanel\(\)/);
});

test("mobile header exposes profile and admin notifications", () => {
  assert.match(plannerHtml, /id="mobileNotificationBtn"/);
  assert.match(plannerHtml, /id="mobileNotificationBadge"/);
  assert.match(plannerHtml, /id="mobileProfileButton"/);
  assert.match(accountScript, /if \(myRotationsState\.session\) openProfileModal\(\)/);
  assert.match(adminScript, /document\.getElementById\("mobileNotificationBadge"\)/);
  assert.match(plannerHtml, /id="adminMobileCloseBtn"/);
  assert.match(adminScript, /mobileNotificationButton\.addEventListener\("click", toggleAdminPanel\)/);
  assert.match(adminScript, /mobileCloseButton\.addEventListener\("click", closeAdminPanel\)/);
  assert.match(adminScript, /function toggleAdminPanel\(\)[\s\S]*!panel\.hidden[\s\S]*closeAdminPanel\(\)[\s\S]*openAdminPanel\(\)/);
});
