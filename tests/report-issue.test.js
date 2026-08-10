import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const plannerHtml = fs.readFileSync("endfield/index.html", "utf8");
const reportIssueScript = fs.readFileSync("endfield/js/ui/reportIssue.js", "utf8");
const reportIssueSql = fs.readFileSync("supabase/issue_reports.sql", "utf8");
const adminScript = fs.readFileSync("endfield/js/ui/adminPanel.js", "utf8");
const reportIssueStyles = fs.readFileSync("endfield/css/my-rotations.css", "utf8");

function loadReportIssueHelper() {
  const context = {
    console,
    URLSearchParams,
    selectedTeam: [],
    operators: [],
    document: {
      addEventListener: () => {},
      getElementById: () => null
    },
    window: {
      location: { href: "https://rotationforge.gg/endfield" },
      setTimeout: () => {}
    }
  };

  vm.runInNewContext(reportIssueScript, context);
  return context;
}

test("Rotation Builder exposes an account-free report form with sidebar command styling", () => {
  assert.match(plannerHtml, /id="reportIssueBtn" class="sidebar-command" type="button"/);
  assert.match(plannerHtml, /id="reportIssueModal" class="settings-modal my-rotations-modal"/);
  assert.match(plannerHtml, /No account or email address is required/);
  assert.match(plannerHtml, /id="reportIssueDescriptionInput"[^>]*minlength="20"[^>]*maxlength="2000"/);
  assert.match(plannerHtml, /js\/ui\/reportIssue\.js\?v=3/);
  assert.doesNotMatch(plannerHtml, /Arknights-Endfield-Rotation-Tool\/issues\/new/);
});

test("report form fits its actions without a nested scroll area", () => {
  assert.match(plannerHtml, /class="settings-dialog rotation-quick-save-dialog report-issue-dialog"/);
  assert.match(plannerHtml, /class="rotation-quick-save-form report-issue-form"/);
  assert.match(plannerHtml, /css\/style\.css\?v=71/);
  assert.match(reportIssueStyles, /\.settings-dialog\.report-issue-dialog\s*{[^}]*width:\s*min\(860px[^}]*overflow:\s*hidden/s);
  assert.match(reportIssueStyles, /\.report-issue-dialog \.report-issue-form\s*{[^}]*grid-template-columns:\s*repeat\(2/s);
  assert.match(reportIssueStyles, /@media \(max-width: 700px\)[\s\S]*\.report-issue-dialog \.report-issue-form\s*{[^}]*grid-template-columns:\s*1fr/s);
  assert.doesNotMatch(reportIssueStyles, /\.report-issue-dialog \.my-rotations-actions\s*{[^}]*position:\s*sticky/s);
});

test("report modal prevents background scroll and avoids expensive backdrop blur", () => {
  assert.match(reportIssueScript, /document\.documentElement\?\.classList\.add\("report-issue-modal-open"\)/);
  assert.match(reportIssueScript, /document\.documentElement\?\.classList\.remove\("report-issue-modal-open"\)/);
  assert.match(reportIssueScript, /document\.body\?\.classList\.add\("report-issue-modal-open"\)/);
  assert.match(reportIssueScript, /document\.body\?\.classList\.remove\("report-issue-modal-open"\)/);
  assert.match(reportIssueScript, /document\.body\.style\.top = `-\$\{reportIssueState\.scrollY\}px`/);
  assert.match(reportIssueScript, /window\.scrollTo\(\{ top: reportIssueState\.scrollY, left: 0, behavior: "instant" \}\)/);
  assert.match(reportIssueStyles, /html\.report-issue-modal-open,\s*body\.report-issue-modal-open\s*{[^}]*overflow:\s*hidden/s);
  assert.match(reportIssueStyles, /body\.report-issue-modal-open\s*{[^}]*position:\s*fixed/s);
  assert.match(reportIssueStyles, /#reportIssueModal\s*{[^}]*overflow:\s*hidden[^}]*backdrop-filter:\s*none/s);
});

test("anonymous report payload includes page and selected operator context", () => {
  const context = loadReportIssueHelper();
  context.selectedTeam = [7, null, "8", undefined];
  context.operators = [
    { id: "7", name: "Ember" },
    { id: 8, name: "Laevatain" }
  ];

  const payload = context.buildIssueReportPayload({
    reportType: "missing_data",
    description: "The selected gear item is missing from the list.",
    additionalInformation: "Visible on the loadout screen.",
    pageUrl: "https://rotationforge.gg/endfield?leader=ember"
  });

  assert.equal(payload.game, "arknights_endfield");
  assert.equal(payload.report_type, "missing_data");
  assert.equal(payload.page_url, "https://rotationforge.gg/endfield?leader=ember");
  assert.deepEqual(Array.from(payload.team_operator_ids), [7, 8]);
  assert.deepEqual(Array.from(payload.team_operator_names), ["Ember", "Laevatain"]);
});

test("report submission writes only to the anonymous issue report table", () => {
  assert.match(reportIssueScript, /\.from\("issue_reports"\)\.insert\(payload\)/);
  assert.doesNotMatch(reportIssueScript, /github\.com|window\.open\(/);
});

test("issue report migration permits anonymous inserts but keeps reports private", () => {
  assert.match(reportIssueSql, /create table if not exists public\.issue_reports/);
  assert.match(reportIssueSql, /alter table public\.issue_reports enable row level security/);
  assert.match(reportIssueSql, /grant insert on public\.issue_reports to anon, authenticated/);
  assert.match(reportIssueSql, /for insert\s+to anon, authenticated/);
  assert.match(reportIssueSql, /Admins can read issue reports/);
  assert.match(reportIssueSql, /using \(public\.is_app_admin\(\)\)/);
  assert.doesNotMatch(reportIssueSql, /grant select on public\.issue_reports to anon/);
});

test("admin panel lists reports and updates their review status through an admin RPC", () => {
  assert.match(adminScript, /id: "reports"[\s\S]*label: "Reports"/);
  assert.match(adminScript, /function createAdminIssueReportCard/);
  assert.match(adminScript, /function getSafeAdminReportPageUrl/);
  assert.match(adminScript, /url\.protocol === "https:" \|\| url\.protocol === "http:"/);
  assert.match(adminScript, /\.from\("issue_reports"\)/);
  assert.match(adminScript, /client\.rpc\("set_issue_report_status"/);
  assert.match(adminScript, /"pending"/);
  assert.match(adminScript, /"resolved"/);
  assert.match(adminScript, /"dismissed"/);
  assert.match(reportIssueSql, /create or replace function public\.set_issue_report_status/);
  assert.match(reportIssueSql, /if not public\.is_app_admin\(\)/);
  assert.match(reportIssueSql, /grant execute on function public\.set_issue_report_status\(uuid, text, text\) to authenticated/);
});
