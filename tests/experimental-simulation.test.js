import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync("endfield/js/logic/uiSettings.js", "utf8");
function mount(saved) {
    const storage = new Map(saved ? [["uiSettings", JSON.stringify(saved)]] : []);
    const element = () => ({ hidden: false, checked: false, disabled: false, listeners: {},
        classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {},
        addEventListener(name, callback) { this.listeners[name] = callback; } });
    const toggle = element(), hint = element(), switchRoot = element(), simulationSettings = element();
    let normalized = 0;
    const c = { console, document: { documentElement: element(), addEventListener() {},
        getElementById: id => ({ experimentalSimulationToggle: toggle, experimentalSimulationHint: hint })[id] || null,
        querySelectorAll: selector => selector === "[data-experimental-simulation]" ? [switchRoot]
            : selector === "[data-simulation-settings]" ? [simulationSettings] : [] },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
        normalizeSimulationBattleSkillSpTimes: () => { normalized++; },
        renderRotation() {}, renderSkills() {}, initSkillDragDrop() {} };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(source, c);
    c.initUiSettings();
    return { c, storage, toggle, hint, switchRoot, simulationSettings,
        settings: () => vm.runInContext("uiSettings", c), normalized: () => normalized };
}

test("new visitors start in Slot with Simulation and its settings hidden", () => {
    const m = mount();
    assert.equal(m.settings().timelineMode, "slot");
    assert.equal(m.settings().experimentalSimulationEnabled, false);
    assert.equal(m.switchRoot.hidden, true);
    assert.equal(m.simulationSettings.hidden, true);
    assert.equal(m.toggle.checked, false);
    m.c.setTimelineMode("simulation");
    assert.equal(m.settings().timelineMode, "slot");
    assert.equal(m.normalized(), 0);
});

test("the experimental opt-in reveals controls and persists without entering Simulation", () => {
    const m = mount();
    m.toggle.checked = true;
    m.toggle.listeners.change({ target: m.toggle });
    assert.equal(m.switchRoot.hidden, false);
    assert.equal(m.settings().timelineMode, "slot");
    assert.equal(m.simulationSettings.hidden, true);
    assert.equal(JSON.parse(m.storage.get("uiSettings")).experimentalSimulationEnabled, true);
    m.c.setTimelineMode("simulation");
    assert.equal(m.settings().timelineMode, "simulation");
    assert.equal(m.simulationSettings.hidden, false);
    assert.equal(m.toggle.disabled, true);
    assert.equal(m.hint.hidden, false);
    assert.equal(m.normalized(), 1);
    m.c.setExperimentalSimulationEnabled(false);
    assert.equal(m.settings().timelineMode, "simulation");
    assert.equal(m.settings().experimentalSimulationEnabled, true);
    m.c.setTimelineMode("slot");
    assert.equal(m.toggle.disabled, false);
    m.c.setExperimentalSimulationEnabled(false);
    assert.equal(m.switchRoot.hidden, true);
    assert.equal(m.simulationSettings.hidden, true);
});

test("legacy saved simulations stay active without losing their settings", () => {
    const m = mount({ timelineMode: "simulation", simulationSpPerSecond: 13, simulationDurationSeconds: 45 });
    assert.equal(m.settings().timelineMode, "simulation");
    assert.equal(m.settings().experimentalSimulationEnabled, true);
    assert.equal(m.settings().simulationSpPerSecond, 13);
    assert.equal(m.settings().simulationDurationSeconds, 45);
    assert.equal(m.switchRoot.hidden, false);
});

test("imported simulation settings reveal the mode without changing share data", () => {
    const m = mount();
    vm.runInContext(fs.readFileSync("endfield/js/logic/shareCode.js", "utf8"), m.c);
    const payload = { uiSettings: { timelineMode: "simulation", simulationSpPerSecond: 9 }, rotation: [{ id: 42, time: 3.5 }] };
    const before = JSON.stringify(payload);
    m.c.applyImportedUiSettings(payload);
    assert.equal(m.settings().timelineMode, "simulation");
    assert.equal(m.settings().experimentalSimulationEnabled, true);
    assert.equal(m.switchRoot.hidden, false);
    assert.equal(JSON.stringify(payload), before);
});
