import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const mobileCss = fs.readFileSync("endfield/css/mobile.css", "utf8");
const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const accountScript = fs.readFileSync("endfield/js/ui/myRotations.js", "utf8");
const adminScript = fs.readFileSync("endfield/js/ui/adminPanel.js", "utf8");
const layoutCss = fs.readFileSync("endfield/css/layout.css", "utf8");

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

test("desktop navigation reuses the compact header and off-canvas drawer", () => {
  assert.match(layoutCss, /\.mobile-top-actions,\s*\.mobile-top-action\s*\{\s*display:\s*flex/s);
  assert.match(layoutCss, /\.builder-sidebar\s*\{[^}]*position:\s*fixed;[^}]*width:\s*min\(360px,[^}]*transform:\s*translateX\(-105%\)/s);
  assert.match(layoutCss, /body\.mobile-nav-open \.builder-sidebar\s*\{[^}]*transform:\s*translateX\(0\)/s);
  assert.match(layoutCss, /\.app-brand \.account-bar\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(accountScript, /innerWidth\s*>\s*900[\s\S]*closeMobileNav/);
});

test("desktop drawer controls stay positioned and the backdrop keeps its dark hover state", () => {
  assert.match(plannerHtml, /id="mobileNavCloseBtn"[\s\S]*<svg[^>]*>[\s\S]*<path/s);
  assert.match(layoutCss, /\.builder-sidebar > \.mobile-nav-close\s*\{[^}]*position:\s*absolute;[^}]*right:\s*16px;[^}]*top:\s*16px/s);
  assert.match(layoutCss, /\.mobile-nav-backdrop:hover,[\s\S]*background:\s*rgba\(5,7,8,0\.58\)/s);
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
