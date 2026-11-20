import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const startup = fs.readFileSync("endfield/js/logic/builderStartup.js", "utf8");
const settings = fs.readFileSync("endfield/js/logic/uiSettings.js", "utf8");
const clientScript = fs.readFileSync("endfield/supabaseClient.js", "utf8");
const core = ["DebuffRegistry", "BuffRegistry", "ReactionRules", "EffectGroups", "OperatorForms", "Gear", "Operators", "EnemyDatabase"];
const simulation = ["InflictionMechanics", "SimulationTriggerEvents", "SimulationActionRules", "OperatorPassiveRules"];
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
function mount() {
    const started = [], requests = new Map(), logs = [], marks = [];
    let now = 100;
    const c = { console: { error() {}, info: (...args) => logs.push(args) },
        performance: { now: () => now, mark: name => marks.push(name), measure: name => marks.push(name) },
        updateSettingsUi() {} };
    c.window = c;
    for (const name of [...core, ...simulation]) {
        requests.set(name, deferred());
        c[`hydrate${name}FromSupabase`] = () => { started.push(name); return requests.get(name).promise; };
    }
    vm.createContext(c);
    vm.runInContext(startup, c);
    return { c, started, requests, logs, marks, time: value => { now = value; } };
}

test("core catalogs start concurrently and finish before restoration; Simulation remains untouched", async () => {
    const m = mount();
    const loading = m.c.hydratePlannerCoreData();
    assert.equal(m.c.hydratePlannerCoreData(), loading);
    await tick();
    assert.deepEqual(m.started, core);
    let finished = false;
    loading.then(() => { finished = true; });
    for (const name of core.filter(name => name !== "Gear")) m.requests.get(name).resolve(true);
    await tick();
    assert.equal(finished, false);
    m.requests.get("Gear").resolve(true);
    await loading;
    assert.equal(m.c.getSimulationDataLoadStatus(), "idle");
    assert.deepEqual(m.started, core);
});

test("Simulation data loads on demand once, with shared in-flight requests", async () => {
    const m = mount();
    assert.deepEqual(m.started, []);
    const first = m.c.ensureSimulationDataLoaded();
    assert.equal(m.c.ensureSimulationDataLoaded(), first);
    assert.equal(m.c.getSimulationDataLoadStatus(), "loading");
    await tick();
    assert.deepEqual(m.started, simulation);
    for (const name of simulation) m.requests.get(name).resolve(true);
    await first;
    assert.equal(m.c.getSimulationDataLoadStatus(), "ready");
    await m.c.ensureSimulationDataLoaded();
    assert.deepEqual(m.started, simulation);
});

test("a failed Simulation batch waits for all requests and supports a clean retry", async () => {
    const m = mount();
    const first = m.c.ensureSimulationDataLoaded();
    await tick();
    m.requests.get(simulation[0]).reject(new Error("offline"));
    await tick();
    assert.equal(m.c.getSimulationDataLoadStatus(), "loading");
    assert.equal(m.c.ensureSimulationDataLoaded(), first);
    const rejected = assert.rejects(first, /offline/);
    for (const name of simulation.slice(1)) m.requests.get(name).resolve(true);
    await rejected;
    assert.equal(m.c.getSimulationDataLoadStatus(), "error");
    for (const name of simulation) m.requests.set(name, deferred());
    const retry = m.c.ensureSimulationDataLoaded();
    await tick();
    for (const name of simulation) m.requests.get(name).resolve(true);
    await retry;
    assert.equal(m.c.getSimulationDataLoadStatus(), "ready");
    assert.equal(m.started.length, 8);
});

test("startup timings are local diagnostics with ready/failed status", () => {
    const m = mount();
    m.c.uiSettings = { timelineMode: "slot" };
    m.c.startBuilderStartupMeasurement();
    m.time(375);
    m.c.finishBuilderStartupMeasurement(true);
    assert.equal(m.c.rotationForgeStartupMetrics.initializationMs, 275);
    assert.equal(m.c.rotationForgeStartupMetrics.navigationToReadyMs, 375);
    assert.equal(m.c.rotationForgeStartupMetrics.status, "ready");
    assert.ok(m.marks.includes("rotationforge.builder.initialization"));
    m.c.finishBuilderStartupMeasurement(false);
    assert.equal(m.c.rotationForgeStartupMetrics.status, "failed");
});

function mountSettings() {
    const c = { console: { error() {} }, localStorage: { setItem() {} },
        document: { documentElement: { classList: { add() {}, remove() {}, toggle() {} } }, querySelectorAll: () => [], getElementById: () => null },
        renderRotation() {}, renderSkills() {}, initSkillDragDrop() {} };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(settings, c);
    c.setExperimentalSimulationEnabled(true);
    return { c, mode: () => vm.runInContext("uiSettings.timelineMode", c) };
}

test("switching to Simulation waits for data, and choosing Slot cancels a pending switch", async () => {
    for (const cancel of [false, true]) {
        const { c, mode } = mountSettings();
        const data = deferred();
        c.ensureSimulationDataLoaded = () => data.promise;
        const switching = c.setTimelineMode("simulation");
        assert.equal(mode(), "slot");
        if (cancel) await c.setTimelineMode("slot");
        data.resolve(true);
        await switching;
        assert.equal(mode(), cancel ? "slot" : "simulation");
    }
});

test("a failed mode switch preserves Slot and can be retried", async () => {
    const { c, mode } = mountSettings();
    c.ensureSimulationDataLoaded = async () => { throw new Error("offline"); };
    assert.equal(await c.setTimelineMode("simulation"), false);
    assert.equal(mode(), "slot");
    c.ensureSimulationDataLoaded = async () => true;
    await c.setTimelineMode("simulation");
    assert.equal(mode(), "simulation");
});

test("operator, weapon and Essence loads start together and combine only after all finish", async () => {
    const c = { console: { error() {}, info() {} }, operators: [], weapons: [], weaponEssenceProfiles: [], useSupabaseOperators: true };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(clientScript, c);
    const started = [], operators = deferred(), weapons = deferred(), essence = deferred();
    c.loadOperatorsFromSupabase = () => { started.push("operators"); return operators.promise; };
    c.loadWeaponsFromSupabase = () => { started.push("weapons"); return weapons.promise; };
    c.loadWeaponEssenceProfilesFromSupabase = () => { started.push("essence"); return essence.promise; };
    const loading = c.hydrateOperatorsFromSupabase();
    assert.deepEqual(started, ["operators", "weapons", "essence"]);
    operators.resolve([{ id: 1 }]);
    weapons.resolve([{ key: "weapon" }]);
    await tick();
    assert.equal(c.operators.length, 0);
    essence.resolve([{ weaponKey: "weapon", name: "profile" }]);
    await loading;
    assert.equal(c.operators[0].id, 1);
    assert.equal(c.weapons[0].essenceProfile.name, "profile");
});

test("gear catalogs load in parallel without mutating defaults before both are ready", async () => {
    const c = { console: { info() {} }, GEAR_DATABASE: { armor: [{ key: "default" }] }, SET_BONUS_DATABASE: {} };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(clientScript, c);
    const sets = deferred(), items = deferred(), started = [];
    c.loadGearSetsFromSupabase = () => { started.push("sets"); return sets.promise; };
    c.loadGearItemsFromSupabase = () => { started.push("items"); return items.promise; };
    const loading = c.hydrateGearFromSupabase();
    assert.deepEqual(started, ["sets", "items"]);
    sets.resolve([{ set_key: "set", name: "A set" }]);
    await tick();
    assert.equal(c.GEAR_DATABASE.armor[0].key, "default");
    items.resolve([{ key: "armor", category: "armor" }]);
    await loading;
    assert.equal(c.GEAR_DATABASE.armor[0].key, "armor");
});

test("a Simulation import waits before resolving combat-event IDs or replacing the draft", async () => {
    for (const fail of [false, true]) {
        const data = deferred();
        let loaded = false;
        const c = { console, crypto: { randomUUID }, selectedTeam: [5], rotation: [{ id: 11 }],
            operators: [{ id: 1 }, { id: 5 }], uiSettings: { timelineMode: "slot" }, BASIC_ATTACK_ACTION_TYPE: "basicAttack",
            localStorage: { setItem() {} }, saveTeam() {}, saveUiSettings() {}, applyUiSettings() {}, compactRotation() {}, ensureSlotCount() {},
            ensureSimulationDataLoaded: async () => { await data.promise; loaded = true; },
            getSkillById: id => loaded ? { id } : null };
        c.window = c;
        vm.createContext(c);
        vm.runInContext(fs.readFileSync("endfield/js/logic/shareCode.js", "utf8"), c);
        c.parseBuildShareCode = () => ({ team: [1], rotation: [{ id: 999, time: 0 }], uiSettings: { timelineMode: "simulation" } });
        const importing = c.applyBuildShareCode("test");
        assert.equal(c.selectedTeam[0], 5);
        assert.equal(c.rotation[0].id, 11);
        if (fail) {
            const rejected = assert.rejects(importing, /offline/);
            data.reject(new Error("offline"));
            await rejected;
            assert.equal(c.selectedTeam[0], 5);
            assert.equal(c.rotation[0].id, 11);
        } else {
            data.resolve(true);
            await importing;
            assert.equal(c.selectedTeam[0], 1);
            assert.equal(c.rotation[0].id, 999);
            assert.equal(c.rotation[0].time, 0);
        }
    }
});

test("app startup restores saved Simulation only after the core and Simulation barriers", async () => {
    for (const mode of ["slot", "simulation"]) {
        const coreData = deferred(), simulationData = deferred(), calls = [];
        const c = { console: { error() {} }, URL,
            document: { body: { classList: { toggle() {} } }, getElementById: () => null, addEventListener() {} },
            location: { href: "https://rotationforge.gg/endfield/" }, operators: [{ id: 1 }], selectedTeam: [null], rotation: [null], uiSettings: { timelineMode: "slot" },
            startBuilderStartupMeasurement() {}, finishBuilderStartupMeasurement() {},
            hydratePlannerCoreData: () => coreData.promise,
            ensureSimulationDataLoaded: () => { calls.push("simulation"); return simulationData.promise; },
            loadUiSettings: () => { c.uiSettings.timelineMode = mode; },
            loadOperatorUltimateStates() {}, loadTeam() {}, loadOperatorLoadouts: () => calls.push("loadouts"), loadRotation: () => calls.push("rotation"),
            loadBuildShareCodeFromUrl: async () => false, renderTeamSlots() {}, renderOperatorList() {}, initUiSettings() {}, initEnemyPanel() {},
            showBuilderScreen: () => calls.push("render"),
            exportImage() {}, copyBuildShareCode() {}, copyBuildShareLink() {}, loadBuildShareCode() {}, confirmTeam() {}, backToSelection() {}, clearRotation() {}, createNewRotation() {} };
        c.window = c;
        vm.createContext(c);
        vm.runInContext(fs.readFileSync("endfield/js/main.js", "utf8").replace(/initApp\(\);\s*$/, "window.startupPromise = initApp();"), c);
        assert.deepEqual(calls, []);
        coreData.resolve();
        await tick();
        if (mode === "simulation") {
            assert.deepEqual(calls, ["simulation"]);
            simulationData.resolve(true);
        }
        await c.startupPromise;
        assert.deepEqual(calls, mode === "simulation" ? ["simulation", "loadouts", "rotation", "render"] : ["loadouts", "rotation", "render"]);
    }
});
