import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync("endfield/community/community-page.js", "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));
const emptyResult = () => ({ data: { items: [], rotation_count: 0, simulation_count: 0 } });
const populatedResult = () => ({ data: { items: [{ short_code: "ABC123", title: "An opener", share_type: "rotation", operator_ids: [1] }], rotation_count: 1, simulation_count: 0 } });

function mount({ rpc = async () => emptyResult(), missingClient = false, tableError = "" } = {}) {
    const elements = new Map();
    function element(tag = "div") {
        return { tag, textContent: "", value: "", hidden: true, disabled: false, children: [], listeners: {}, attributes: {}, dataset: {},
            classList: { toggle() {} }, setAttribute(key, value) { this.attributes[key] = value; },
            replaceChildren(...children) { this.children = children; }, appendChild(child) { this.children.push(child); },
            add(child) { this.children.push(child); },
            addEventListener(name, callback) { this.listeners[name] = callback; }, reset() {} };
    }
    for (const id of ["rotationGrid", "emptyState", "rotationCount", "rotationStatus", "rotationTabCount", "simulationTabCount",
        "refreshRotations", "searchInput", "operatorFilter", "elementFilter", "classFilter", "sortSelect", "resetFilters", "communityToolbar"]) elements.set(id, element());
    const tabs = ["rotation", "simulation"].map(type => Object.assign(element("button"), { dataset: { shareType: type } }));
    let calls = 0, reloads = 0;
    const c = { URL, URLSearchParams, Option: class { constructor(text, value) { this.text = text; this.value = value; } },
        console: { error() {} }, history: { replaceState() {} },
        location: { href: "https://rotationforge.gg/endfield/community/", search: "", reload: () => { reloads++; } },
        document: { getElementById: id => elements.get(id), createElement: element,
            querySelectorAll: selector => selector === "[data-share-type]" ? tabs : [] },
        supabaseClient: missingClient ? null : {
            from(table) { return { select() {
                const query = Promise.resolve({ data: table === "operators" ? [{ id: 1, name: "Perlica", element_type: "electric", operator_class: "Caster" }] : [],
                    error: tableError === table ? new Error("Unavailable table") : null });
                query.eq = () => query;
                return query;
            } }; },
            rpc: (...args) => { calls++; return rpc(...args); }
        } };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(source, c);
    // Cards are covered separately; this suite exercises the loading and rendering state machine.
    c.card = share => Object.assign(element("article"), { textContent: share.title });
    const get = id => elements.get(id);
    const retry = () => get("rotationGrid").children[0].children.find(child => child.tag === "button");
    return { c, get, tabs, retry, calls: () => calls, reloads: () => reloads };
}

function assertLoadError(m) {
    assert.equal(m.get("rotationCount").textContent, "Public shares");
    assert.equal(m.get("rotationStatus").textContent, "Could not load public shares");
    assert.equal(m.get("rotationTabCount").textContent, "—");
    assert.equal(m.get("simulationTabCount").textContent, "—");
    assert.equal(m.get("emptyState").hidden, true);
    assert.equal(m.get("rotationGrid").attributes["aria-busy"], "false");
    assert.equal(m.get("rotationGrid").children[0].attributes.role, "alert");
    assert.equal(m.retry().textContent, "Try again");
    assert.equal(m.retry().type, "button");
}

test("a load error survives finally, filtering and tab changes without displaying zero rotations", async () => {
    const m = mount({ rpc: async () => ({ error: new Error("Database unavailable") }) });
    assert.equal(m.get("rotationTabCount").textContent, "—");
    assert.equal(m.get("refreshRotations").disabled, true);
    assert.equal(m.get("rotationGrid").attributes["aria-busy"], "true");
    await tick();
    assertLoadError(m);
    m.tabs[1].listeners.click();
    assertLoadError(m);
    m.get("searchInput").listeners.input({ target: { value: "test" } });
    assertLoadError(m);
    assert.equal(m.get("refreshRotations").disabled, false);
});

test("Try again transitions through loading and restores real results without duplicate requests", async () => {
    let finish, attempts = 0;
    const m = mount({ rpc: async () => ++attempts === 1 ? { error: new Error("offline") } : new Promise(resolve => { finish = resolve; }) });
    await tick();
    const retry = m.retry();
    retry.listeners.click();
    retry.listeners.click();
    assert.equal(m.calls(), 2);
    assert.equal(m.get("refreshRotations").disabled, true);
    assert.equal(m.get("rotationStatus").textContent, "Loading rotations and simulations");
    finish(populatedResult());
    await tick();
    assert.equal(m.get("rotationCount").textContent, "1 Rotation");
    assert.equal(m.get("rotationTabCount").textContent, 1);
    assert.equal(m.get("rotationGrid").children[0].tag, "article");
    assert.equal(m.get("rotationGrid").children[0].textContent, "An opener");
    assert.equal(m.get("refreshRotations").disabled, false);
    assert.equal(m.get("emptyState").hidden, true);
});

test("a genuinely empty successful response still displays zero rotations", async () => {
    const m = mount();
    await tick();
    assert.equal(m.get("rotationCount").textContent, "0 Rotations");
    assert.equal(m.get("rotationTabCount").textContent, 0);
    assert.equal(m.get("rotationStatus").textContent, "Public planner shares");
    assert.equal(m.get("emptyState").hidden, false);
    assert.equal(m.get("rotationGrid").children.length, 0);
});

test("a missing client displays the same persistent error and retries the page scripts", async () => {
    const m = mount({ missingClient: true });
    await tick();
    assertLoadError(m);
    m.c.render();
    assertLoadError(m);
    m.retry().listeners.click();
    assert.equal(m.reloads(), 1);
    assert.equal(m.calls(), 0);
});

test("table errors, network rejection and malformed responses cannot masquerade as empty results", async () => {
    for (const options of [{ tableError: "operators" }, { tableError: "operator_skills" },
        { rpc: async () => { throw new Error("Network failure"); } },
        { rpc: async () => ({ data: null }) }, { rpc: async () => ({ data: { items: [] } }) }]) {
        const m = mount(options);
        await tick();
        assertLoadError(m);
    }
});

test("a failed refresh replaces stale cards with an error, and a later retry recovers", async () => {
    let fail = false;
    const m = mount({ rpc: async () => fail ? { error: new Error("offline") } : populatedResult() });
    await tick();
    assert.equal(m.get("rotationCount").textContent, "1 Rotation");
    fail = true;
    await m.c.loadData();
    assertLoadError(m);
    fail = false;
    m.retry().listeners.click();
    await tick();
    assert.equal(m.get("rotationCount").textContent, "1 Rotation");
    assert.equal(m.get("rotationGrid").children[0].tag, "article");
});
