import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const collector = fs.readFileSync("endfield/js/logic/plannerAnalytics.js", "utf8");
const shares = fs.readFileSync("endfield/js/logic/shareCode.js", "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));

function mount({ host = "rotationforge.gg", search = "", dnt, gpc, fetchResult, userAgent = "", uaMobile, maxTouchPoints = 0,
    session = null, getSession, rpc = async () => ({ data: false }) } = {}) {
    const requests = [], timers = new Map(), delays = new Map(), listeners = {}, rpcCalls = [];
    let sequence = 0;
    const context = {
        URLSearchParams, crypto: { randomUUID }, location: { hostname: host, search },
        navigator: { doNotTrack: dnt, globalPrivacyControl: gpc, userAgent, maxTouchPoints,
            userAgentData: uaMobile === undefined ? undefined : { mobile: uaMobile } },
        SUPABASE_URL: "https://example.supabase.co", SUPABASE_KEY: "sb_publishable_test",
        uiSettings: { timelineMode: "slot" },
        console: { info() {} },
        setTimeout: (callback, delay) => { timers.set(++sequence, callback); delays.set(sequence, delay); return sequence; },
        clearTimeout: id => timers.delete(id),
        addEventListener: (name, callback) => { listeners[name] = callback; },
        document: { visibilityState: "visible", addEventListener: (name, callback) => { listeners[name] = callback; } },
        fetch: (url, options) => { requests.push({ url, options, body: JSON.parse(options.body) }); return fetchResult ? fetchResult() : Promise.resolve({ ok: true }); },
        supabaseClient: {
            auth: { getSession: getSession || (async () => ({ data: { session } })),
                onAuthStateChange: callback => { listeners.auth = callback; } },
            rpc: (name, args) => { rpcCalls.push({ name, args }); return rpc(name, args); }
        }
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(collector, context);
    return { context, requests, listeners, timers, rpcCalls,
        runAuthChecks() {
            for (const [id, callback] of [...timers]) {
                if (delays.get(id) !== 0) continue;
                timers.delete(id);
                callback();
            }
        } };
}

test("milestones deduplicate per page load and transmit only fixed anonymous fields", async () => {
    const { context: c, requests, listeners, timers } = mount({ search: "?leader=secret#private" });
    await tick();
    c.markPlannerReady("restored");
    for (let i = 0; i < 20; i++) c.trackPlannerEvent("first_skill_placed");
    c.trackPlannerEvent("private title or email");
    c.uiSettings.timelineMode = "simulation";
    c.trackPlannerEvent("share_opened");
    listeners.pagehide();
    assert.equal(timers.size, 0);
    assert.equal(requests.length, 1);
    const { options, body } = requests[0];
    assert.deepEqual(body.p_events.map(event => event.event_name), ["builder_opened", "builder_ready", "first_skill_placed", "share_opened"]);
    assert.equal(body.p_events[1].entry_kind, "restored");
    assert.equal(body.p_events[3].mode, "simulation");
    assert.deepEqual(Object.keys(body).sort(), ["p_events", "p_visit_id"]);
    for (const event of body.p_events) assert.deepEqual(Object.keys(event).sort(), ["device_type", "entry_kind", "event_name", "mode"]);
    assert.equal(options.keepalive, true);
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.deepEqual(Object.keys(options.headers).sort(), ["Content-Type", "apikey"]);
    assert.doesNotMatch(options.body, /secret|private|email/);
    listeners.pagehide();
    assert.equal(requests.length, 1);
    const second = mount();
    await tick();
    second.listeners.pagehide();
    assert.notEqual(second.requests[0].body.p_visit_id, body.p_visit_id);
});

test("device groups cover phones, tablets, desktop browsers and unavailable hints without transmitting browser details", async () => {
    for (const [options, expected] of [
        [{ userAgent: "Mozilla/5.0 (Linux; Android 14; secret-model) Mobile Safari/537.36", uaMobile: true }, "mobile"],
        [{ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile" }, "mobile"],
        [{ userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) Mobile" }, "tablet"],
        [{ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605", maxTouchPoints: 5 }, "tablet"],
        [{ userAgent: "Mozilla/5.0 (Linux; Android 14) Safari/537.36", uaMobile: false }, "tablet"],
        [{ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", maxTouchPoints: 10 }, "desktop"],
        [{ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)" }, "desktop"],
        [{ userAgent: "Mozilla/5.0 (X11; Linux x86_64)" }, "desktop"],
        [{ userAgent: "Mozilla/5.0 (X11; CrOS x86_64)" }, "desktop"],
        [{ uaMobile: true }, "mobile"], [{}, "unknown"], [{ userAgent: "privacy-browser", uaMobile: false }, "unknown"]
    ]) {
        const m = mount(options);
        await tick();
        m.context.markPlannerReady("new");
        m.listeners.pagehide();
        for (const event of m.requests[0].body.p_events) assert.equal(event.device_type, expected);
        assert.doesNotMatch(m.requests[0].options.body, /userAgent|secret-model|maxTouchPoints|Mozilla|Safari|Windows NT/);
    }
});

test("the device group stays fixed for all later steps in the same visit", async () => {
    const m = mount({ userAgent: "Mozilla/5.0 (iPhone) Mobile" });
    await tick();
    m.listeners.pagehide();
    m.context.navigator.userAgent = "Mozilla/5.0 (Windows NT 10.0)";
    m.context.markPlannerReady("new");
    m.context.trackPlannerEvent("share_opened");
    m.listeners.pagehide();
    assert.equal(m.requests.length, 2);
    assert.ok(m.requests.every(request => request.body.p_events.every(event => event.device_type === "mobile")));
});

test("all twelve milestones fit a single batch and retain only the first fixed failure category per visit", async () => {
    const m = mount();
    await tick();
    m.context.markPlannerReady("new");
    for (const name of ["builder_failed", "team_selected", "first_skill_placed", "share_opened", "share_invalid", "share_cancelled", "share_submitted", "share_published", "example_loaded"]) m.context.trackPlannerEvent(name, { private: "secret title" });
    m.context.trackPlannerEvent("share_failed", { failure_kind: "network", message: "secret token" });
    m.context.trackPlannerEvent("share_failed", { failure_kind: "database" });
    m.context.trackPlannerEvent("share_invalid");
    m.listeners.pagehide();
    const batch = m.requests[0].body.p_events;
    assert.equal(batch.length, 12);
    assert.equal(batch.find(event => event.event_name === "share_failed").failure_kind, "network");
    assert.equal(batch.filter(event => event.event_name === "share_invalid").length, 1);
    assert.doesNotMatch(m.requests[0].options.body, /secret|message|token|private/);
    const invalid = mount(); await tick();
    invalid.context.trackPlannerEvent("share_failed", { failure_kind: "raw private error text" });
    invalid.listeners.pagehide();
    assert.equal(invalid.requests[0].body.p_events.at(-1).failure_kind, "unknown");
});

test("local previews, privacy signals and the owner opt-out never send analytics", () => {
    for (const options of [{ host: "localhost" }, { host: "127.0.0.1" }, { host: "preview.example" }, { dnt: "1" }, { gpc: true }, { search: "?usage=off" }]) {
        const { context: c, requests, listeners, timers } = mount(options);
        c.markPlannerReady("new");
        c.trackPlannerEvent("share_published");
        listeners.pagehide();
        assert.equal(requests.length, 0);
        assert.equal(timers.size, 0);
    }
});

test("a hidden page flushes its queue, and failed telemetry never blocks the builder", async () => {
    for (const fetchResult of [() => Promise.reject(new Error("offline")), () => Promise.resolve({ ok: false }), () => { throw new Error("blocked"); }]) {
        const { context: c, requests, listeners } = mount({ fetchResult });
        await tick();
        c.document.visibilityState = "hidden";
        assert.doesNotThrow(listeners.visibilitychange);
        await tick();
        assert.doesNotThrow(() => c.trackPlannerEvent("share_published"));
        listeners.pagehide();
        assert.equal(requests.length, 1);
    }
});

test("restoring and loading an example never fabricate manual placement milestones", async () => {
    const { context: c, requests, listeners } = mount();
    await tick();
    c.markPlannerReady("shared");
    c.trackPlannerEvent("example_loaded");
    listeners.pagehide();
    assert.deepEqual(requests[0].body.p_events.map(event => event.event_name), ["builder_opened", "builder_ready", "example_loaded"]);
});

test("an empty operator catalog is a loading failure, not a successful ready event", async () => {
    const { context: c, requests, listeners } = mount();
    await tick();
    c.markPlannerReady("new", false);
    listeners.pagehide();
    assert.deepEqual(requests[0].body.p_events.map(event => event.event_name), ["builder_opened", "builder_failed"]);
});

test("events wait for the initial session and admin role before any pagehide flush", async () => {
    let resolveSession, resolveRole;
    const m = mount({
        getSession: () => new Promise(resolve => { resolveSession = resolve; }),
        rpc: () => new Promise(resolve => { resolveRole = resolve; })
    });
    m.context.markPlannerReady("new");
    m.listeners.pagehide();
    assert.equal(m.requests.length, 0);
    resolveSession({ data: { session: { user: { id: "ordinary-user" } } } });
    await tick();
    m.listeners.pagehide();
    assert.equal(m.requests.length, 0);
    resolveRole({ data: false });
    await tick();
    m.listeners.pagehide();
    assert.deepEqual(m.requests[0].body.p_events.map(event => event.event_name), ["builder_opened", "builder_ready"]);
});

test("an already signed-in admin never sends analytics, including after signing out", async () => {
    const m = mount({ session: { user: { id: "admin" } }, rpc: async () => ({ data: true }) });
    m.context.markPlannerReady("new");
    m.listeners.pagehide();
    await tick();
    m.context.trackPlannerEvent("share_published");
    m.listeners.auth("SIGNED_OUT", null);
    m.runAuthChecks();
    await tick();
    m.listeners.pagehide();
    assert.equal(m.requests.length, 0);
    assert.deepEqual(m.rpcCalls.map(call => call.name), ["is_app_admin"]);
    assert.equal(m.timers.size, 0);
});

test("signing in as admin excludes the whole current visit and drops unsent events", async () => {
    const m = mount({ rpc: async name => name === "is_app_admin" ? { data: true } : {} });
    await tick();
    m.listeners.pagehide();
    const visit = m.requests[0].body.p_visit_id;
    m.context.markPlannerReady("restored");
    m.listeners.auth("SIGNED_IN", { user: { id: "admin" } });
    m.context.trackPlannerEvent("first_skill_placed");
    m.listeners.pagehide();
    assert.equal(m.requests.length, 1);
    assert.equal(m.rpcCalls.length, 0, "RPC must not execute inside the auth callback");
    m.runAuthChecks();
    await tick();
    assert.deepEqual(m.rpcCalls.map(call => call.name), ["is_app_admin", "exclude_planner_visit"]);
    assert.equal(m.rpcCalls[1].args.p_visit_id, visit);
    assert.deepEqual(Object.keys(m.rpcCalls[1].args), ["p_visit_id"]);
    m.listeners.pagehide();
    assert.equal(m.requests.length, 1);
});

test("an admin sign-in still excludes sent batches after a telemetry network failure", async () => {
    const m = mount({ fetchResult: () => Promise.reject(new Error("connection lost after sending")),
        rpc: async name => name === "is_app_admin" ? { data: true } : {} });
    await tick();
    m.listeners.pagehide();
    await tick();
    m.listeners.auth("SIGNED_IN", { user: { id: "admin" } });
    m.runAuthChecks();
    await tick();
    assert.equal(m.rpcCalls[1].name, "exclude_planner_visit");
    assert.equal(m.rpcCalls[1].args.p_visit_id, m.requests[0].body.p_visit_id);
});

test("failed auth or role checks stop collection without affecting the builder", async () => {
    for (const options of [
        { getSession: async () => ({ error: new Error("unavailable") }) },
        { session: {}, rpc: async () => ({ error: new Error("unavailable") }) },
        { session: {}, rpc: async () => { throw new Error("offline"); } }
    ]) {
        const m = mount(options);
        await tick();
        assert.doesNotThrow(() => m.context.markPlannerReady("new"));
        m.listeners.pagehide();
        assert.equal(m.requests.length, 0);
    }
});

test("a stale non-admin check cannot resume tracking after an admin sign-in", async () => {
    let resolveOldRole;
    let count = 0;
    const m = mount({ session: {}, rpc: async () => ++count === 1
        ? new Promise(resolve => { resolveOldRole = resolve; }) : { data: true } });
    await tick();
    m.listeners.auth("SIGNED_IN", { user: { id: "admin" } });
    m.runAuthChecks();
    await tick();
    resolveOldRole({ data: false });
    await tick();
    m.listeners.pagehide();
    assert.equal(m.requests.length, 0);
});

test("a stale failed role check cannot disable a newer non-admin session", async () => {
    let rejectOldRole;
    let count = 0;
    const m = mount({ session: {}, rpc: () => ++count === 1
        ? new Promise((_resolve, reject) => { rejectOldRole = reject; }) : Promise.resolve({ data: false }) });
    await tick();
    m.listeners.auth("SIGNED_IN", { user: { id: "ordinary-user" } });
    m.runAuthChecks();
    await tick();
    rejectOldRole(new Error("old request failed"));
    await tick();
    m.context.markPlannerReady("new");
    m.listeners.pagehide();
    assert.equal(m.requests.length, 1);
    assert.equal(m.requests[0].body.p_events.length, 2);
});

function shareContext(rpc) {
    const events = [];
    const c = { console: { error() {} }, supabaseClient: { rpc }, trackPlannerEvent: name => events.push(name),
        selectedTeam: [1, null], hasCreatedRotation: () => true, alert() {},
        navigator: { clipboard: { writeText: async () => { throw new Error("Clipboard denied"); } } } };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(shares, c);
    c.getDisplayBuildShareCode = () => "test-payload";
    c.getCurrentBuildShareType = () => "rotation";
    c.getStoredShareMetadata = () => ({});
    c.requestBuildShareMetadata = async () => ({ title: "Test build", description: "" });
    return { c, events };
}

test("a published share counts even when clipboard access is denied", async () => {
    const { c, events } = shareContext(async () => ({ data: { short_code: "ABC123", share_type: "rotation" } }));
    assert.equal(await c.copyBuildShareCode(), true);
    assert.deepEqual(events, ["share_submitted", "share_published"]);
});

test("database errors, network rejection and invalid share responses count as failure", async () => {
    for (const rpc of [async () => ({ error: new Error("RLS denied") }), async () => { throw new Error("Network failure"); }, async () => ({ data: { short_code: "bad" } })]) {
        const { c, events } = shareContext(rpc);
        await assert.rejects(c.createStoredBuildShare({ title: "Test build" }));
        assert.deepEqual(events, ["share_submitted", "share_failed"]);
    }
});

test("manual placement is measured after save, while restoring storage is not", () => {
    const events = [];
    const c = { crypto: { randomUUID }, rotation: [null], selectedSkill: null,
        getSkillById: id => ({ id }), getMappedSkillIdForOperatorState: id => id,
        handleUltimateStateToggle() {}, insertComboChain() {}, compactRotation() {}, ensureSlotCount() {},
        saveRotation: () => events.push("saved"), trackPlannerEvent: name => events.push(name) };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(fs.readFileSync("endfield/js/logic/tapInput.js", "utf8"), c);
    c.placeSkillInSlot(0, 42);
    assert.deepEqual(events, ["saved", "first_skill_placed"]);
    assert.equal(c.rotation[0].id, 42);
});

const reportScript = fs.readFileSync("endfield/js/ui/plannerAnalyticsReport.js", "utf8");
function reportContext(rpc = async () => ({ data: { counts: {} } })) {
    const element = tag => ({ tag, children: [], value: "", listeners: {}, attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; }, focus() { this.focused = true; },
        append(...children) { this.children.push(...children); }, appendChild(child) { this.children.push(child); },
        addEventListener(name, callback) { this.listeners[name] = callback; } });
    const root = element("div");
    const c = { document: { createElement: element, getElementById: id => findReportNode(root, node => node.id === id) },
        createAdminTextElement: (tag, className, textContent) => Object.assign(element(tag), { className, textContent }),
        adminPanelState: { isAdmin: true, activeTab: "usage" },
        getAdminSupabaseClient: () => ({ rpc }), renderAdminReviewList() {} };
    vm.createContext(c);
    vm.runInContext(reportScript, c);
    return { c, root };
}
function findReportNode(node, predicate) {
    if (predicate(node)) return node;
    for (const child of node.children || []) { const match = findReportNode(child, predicate); if (match) return match; }
}

test("the usage report renders percentages, empty state and usable period/cohort controls", async () => {
    const calls = [];
    const { c, root } = reportContext(async (name, params) => {
        calls.push({ name, params: JSON.parse(JSON.stringify(params)) });
        return { data: { counts: { builder_opened: 10, first_skill_placed: 3, share_published: 1 } } };
    });
    await c.fetchPlannerAnalyticsReport();
    c.renderPlannerAnalyticsReport(root);
    const section = root.children[0];
    const table = findReportNode(section, child => child.tag === "table");
    const body = table.children.find(child => child.tag === "tbody");
    const published = body.children.find(row => row.children[0].textContent === "Published successfully");
    assert.equal(published.children[1].textContent, "1");
    assert.equal(published.children[2].textContent, "10.0%");
    const period = section.children[0].children[0].children[0];
    period.value = "30";
    period.listeners.change();
    await tick();
    assert.deepEqual(calls.at(-1), { name: "get_planner_funnel", params: { p_days: 30, p_entry_kind: "all", p_device_type: "all" } });
    const empty = reportContext();
    await empty.c.fetchPlannerAnalyticsReport();
    empty.c.renderPlannerAnalyticsReport(empty.root);
    const text = node => [node.textContent || "", ...node.children.map(text)].join(" ");
    assert.match(text(empty.root), /No measured visits/);
    assert.doesNotMatch(text(empty.root), /NaN|Infinity/);
});

test("stale report requests cannot overwrite another tab or a signed-out state", async () => {
    for (const leave of [c => { c.adminPanelState.activeTab = "reports"; }, c => { c.adminPanelState.isAdmin = false; }]) {
        let resolve;
        const { c } = reportContext(() => new Promise(done => { resolve = done; }));
        const fetching = c.fetchPlannerAnalyticsReport();
        leave(c);
        resolve({ data: { counts: { builder_opened: 99 } } });
        await fetching;
        assert.equal(vm.runInContext("plannerAnalyticsReport.data", c), null);
    }
});

test("device tabs keep period and cohort filters, show cohort totals and support keyboard navigation", async () => {
    const calls = [];
    const m = reportContext(async (name, params) => {
        calls.push({ name, params: { ...params } });
        return { data: { counts: { builder_opened: params.p_device_type === "mobile" ? 3 : 7 },
            devices: { mobile: 3, tablet: 1, desktop: 2, unknown: 1 }, reset_at: "2026-11-26T12:00:00Z" } };
    });
    m.c.renderAdminReviewList = () => { m.root.children = []; m.c.renderPlannerAnalyticsReport(m.root); };
    await m.c.fetchPlannerAnalyticsReport();
    const tabs = () => findReportNode(m.root, node => node.attributes?.role === "tablist").children;
    assert.deepEqual(tabs().map(button => button.children[1].textContent), ["7", "3", "1", "2", "1"]);
    const toolbar = m.root.children[0].children[0];
    const [period, cohort] = toolbar.children.map(label => label.children[0]);
    period.value = "30"; period.listeners.change(); await tick();
    cohort.value = "new"; cohort.listeners.change(); await tick();
    tabs()[1].listeners.click(); await tick();
    assert.deepEqual(calls.at(-1).params, { p_days: 30, p_entry_kind: "new", p_device_type: "mobile" });
    assert.equal(tabs()[1].attributes["aria-selected"], "true");
    assert.equal(tabs()[1].tabIndex, 0);
    assert.equal(tabs()[1].focused, true);
    assert.equal(tabs()[0].tabIndex, -1);
    const panel = findReportNode(m.root, node => node.attributes?.role === "tabpanel");
    assert.equal(panel.attributes["aria-labelledby"], tabs()[1].id);
    assert.match(findReportNode(panel, node => node.className === "planner-usage-reset-date").textContent, /Statistics restarted/);
    let prevented = false;
    tabs()[1].listeners.keydown({ key: "ArrowRight", preventDefault() { prevented = true; } }); await tick();
    assert.equal(prevented, true);
    assert.equal(calls.at(-1).params.p_device_type, "tablet");
    tabs()[2].listeners.keydown({ key: "End", preventDefault() {} }); await tick();
    assert.equal(calls.at(-1).params.p_device_type, "unknown");
    tabs()[4].listeners.keydown({ key: "Home", preventDefault() {} }); await tick();
    assert.equal(calls.at(-1).params.p_device_type, "all");
});

test("device tabs remain usable during loading and errors, and stale responses cannot replace the selected device", async () => {
    const pending = [];
    const m = reportContext((_name, params) => new Promise(resolve => { pending.push({ resolve, device: params.p_device_type }); }));
    m.c.renderAdminReviewList = () => { m.root.children = []; m.c.renderPlannerAnalyticsReport(m.root); };
    const first = m.c.fetchPlannerAnalyticsReport();
    let tabs = findReportNode(m.root, node => node.attributes?.role === "tablist");
    assert.equal(tabs.children[0].children[1].textContent, "—");
    assert.match(findReportNode(m.root, node => node.attributes?.role === "status").textContent, /Loading usage/);
    assert.equal(findReportNode(m.root, node => node.tag === "table"), undefined);
    tabs.children[1].listeners.click();
    assert.equal(pending[1].device, "mobile");
    pending[1].resolve({ error: new Error("missing migration") }); await tick();
    assert.match(findReportNode(m.root, node => node.attributes?.role === "alert").textContent, /planner_analytics_devices.sql/);
    tabs = findReportNode(m.root, node => node.attributes?.role === "tablist");
    assert.equal(tabs.children[1].attributes["aria-selected"], "true");
    assert.equal(findReportNode(m.root, node => node.tag === "table"), undefined);
    pending[0].resolve({ data: { counts: { builder_opened: 99 } } }); await first;
    assert.equal(vm.runInContext("plannerAnalyticsReport.data", m.c), null);
    const retry = findReportNode(m.root, node => node.textContent === "Try again");
    retry.listeners.click();
    assert.equal(pending[2].device, "mobile");
    pending[2].resolve({ data: { counts: { builder_opened: 3 }, devices: { mobile: 3 } } }); await tick();
    assert.equal(vm.runInContext("plannerAnalyticsReport.data.counts.builder_opened", m.c), 3);
    assert.equal(findReportNode(m.root, node => node.attributes?.role === "alert"), undefined);
});

test("signing out clears cached device statistics before rendering the report again", async () => {
    const m = reportContext(async () => ({ data: { counts: { builder_opened: 7 }, devices: { desktop: 7 } } }));
    await m.c.fetchPlannerAnalyticsReport();
    m.c.adminPanelState.isAdmin = false;
    m.c.renderPlannerAnalyticsReport(m.root);
    assert.equal(m.root.children.length, 0);
    assert.equal(vm.runInContext("plannerAnalyticsReport.data", m.c), null);
});

test("the report explains publication milestones and renders fixed failure categories with the selected filters", async () => {
    const m = reportContext(async () => ({ data: {
        counts: { builder_opened: 10, share_opened: 6, share_submitted: 5, share_invalid: 2, share_cancelled: 1, share_failed: 3 },
        failure_counts: { network: 2, unknown: 1 }, publishing_started_at: "2026-11-26T15:00:00Z"
    } }));
    await m.c.fetchPlannerAnalyticsReport();
    m.c.renderPlannerAnalyticsReport(m.root);
    const row = label => findReportNode(m.root, node => node.tag === "tr" && node.children[0]?.textContent === label);
    assert.equal(row("Publication send attempted").children[1].textContent, "5");
    assert.equal(row("Share form input invalid").children[1].textContent, "2");
    assert.equal(row("Share form closed without sending").children[1].textContent, "1");
    assert.equal(row("Network problem").children[1].textContent, "2");
    assert.equal(row("Database problem").children[1].textContent, "0");
    assert.equal(row("Other / legacy").children[1].textContent, "1");
    assert.ok(findReportNode(m.root, node => /Additional publication tracking enabled/.test(node.textContent || "")));
    assert.ok(findReportNode(m.root, node => /first recorded publication failure/.test(node.textContent || "")));
});
