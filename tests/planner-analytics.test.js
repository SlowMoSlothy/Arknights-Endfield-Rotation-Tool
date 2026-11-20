import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const collector = fs.readFileSync("endfield/js/logic/plannerAnalytics.js", "utf8");
const shares = fs.readFileSync("endfield/js/logic/shareCode.js", "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));

function mount({ host = "rotationforge.gg", search = "", dnt, gpc, fetchResult } = {}) {
    const requests = [], timers = new Map(), listeners = {};
    let sequence = 0;
    const context = {
        URLSearchParams, crypto: { randomUUID }, location: { hostname: host, search },
        navigator: { doNotTrack: dnt, globalPrivacyControl: gpc },
        SUPABASE_URL: "https://example.supabase.co", SUPABASE_KEY: "sb_publishable_test",
        uiSettings: { timelineMode: "slot" },
        console: { info() {} },
        setTimeout: callback => { timers.set(++sequence, callback); return sequence; },
        clearTimeout: id => timers.delete(id),
        addEventListener: (name, callback) => { listeners[name] = callback; },
        document: { visibilityState: "visible", addEventListener: (name, callback) => { listeners[name] = callback; } },
        fetch: (url, options) => { requests.push({ url, options, body: JSON.parse(options.body) }); return fetchResult ? fetchResult() : Promise.resolve({ ok: true }); }
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(collector, context);
    return { context, requests, listeners, timers };
}

test("milestones deduplicate per page load and transmit only fixed anonymous fields", () => {
    const { context: c, requests, listeners, timers } = mount({ search: "?leader=secret#private" });
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
    for (const event of body.p_events) assert.deepEqual(Object.keys(event).sort(), ["entry_kind", "event_name", "mode"]);
    assert.equal(options.keepalive, true);
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    assert.deepEqual(Object.keys(options.headers).sort(), ["Content-Type", "apikey"]);
    assert.doesNotMatch(options.body, /secret|private|email/);
    listeners.pagehide();
    assert.equal(requests.length, 1);
    const second = mount();
    second.listeners.pagehide();
    assert.notEqual(second.requests[0].body.p_visit_id, body.p_visit_id);
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
        c.document.visibilityState = "hidden";
        assert.doesNotThrow(listeners.visibilitychange);
        await tick();
        assert.doesNotThrow(() => c.trackPlannerEvent("share_published"));
        listeners.pagehide();
        assert.equal(requests.length, 1);
    }
});

test("restoring and loading an example never fabricate manual placement milestones", () => {
    const { context: c, requests, listeners } = mount();
    c.markPlannerReady("shared");
    c.trackPlannerEvent("example_loaded");
    listeners.pagehide();
    assert.deepEqual(requests[0].body.p_events.map(event => event.event_name), ["builder_opened", "builder_ready", "example_loaded"]);
});

test("an empty operator catalog is a loading failure, not a successful ready event", () => {
    const { context: c, requests, listeners } = mount();
    c.markPlannerReady("new", false);
    listeners.pagehide();
    assert.deepEqual(requests[0].body.p_events.map(event => event.event_name), ["builder_opened", "builder_failed"]);
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
    assert.deepEqual(events, ["share_published"]);
});

test("database errors, network rejection and invalid share responses count as failure", async () => {
    for (const rpc of [async () => ({ error: new Error("RLS denied") }), async () => { throw new Error("Network failure"); }, async () => ({ data: { short_code: "bad" } })]) {
        const { c, events } = shareContext(rpc);
        await assert.rejects(c.createStoredBuildShare({ title: "Test build" }));
        assert.deepEqual(events, ["share_failed"]);
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
    const element = tag => ({ tag, children: [], value: "", listeners: {},
        append(...children) { this.children.push(...children); }, appendChild(child) { this.children.push(child); },
        addEventListener(name, callback) { this.listeners[name] = callback; } });
    const c = { document: { createElement: element },
        createAdminTextElement: (tag, className, textContent) => Object.assign(element(tag), { className, textContent }),
        adminPanelState: { isAdmin: true, activeTab: "usage" },
        getAdminSupabaseClient: () => ({ rpc }), renderAdminReviewList() {} };
    vm.createContext(c);
    vm.runInContext(reportScript, c);
    return { c, root: element("div") };
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
    const table = section.children.find(child => child.tag === "table");
    const body = table.children.find(child => child.tag === "tbody");
    const published = body.children.find(row => row.children[0].textContent === "Published successfully");
    assert.equal(published.children[1].textContent, "1");
    assert.equal(published.children[2].textContent, "10.0%");
    const period = section.children[0].children[0].children[0];
    period.value = "30";
    period.listeners.change();
    await tick();
    assert.deepEqual(calls.at(-1), { name: "get_planner_funnel", params: { p_days: 30, p_entry_kind: "all" } });
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
