import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const script = fs.readFileSync("endfield/js/ui/onboarding.js", "utf8");
function createContext() {
    const storage = new Map();
    const elements = new Map();
    const element = () => ({ hidden: true, value: "", textContent: "", disabled: false, attributes: {}, children: [],
        setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; },
        addEventListener() {}, focus() {}, scrollIntoView() {}, replaceChildren() { this.children = []; },
        appendChild(child) { this.children.push(child); }, querySelector() { return this.number ||= element(); }
    });
    const context = {
        console, crypto: { randomUUID: () => "test-uid" },
        localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
        document: { getElementById: id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, createElement: element },
        selectedTeam: [99, null, null, null], rotation: [{ id: 999, uid: "original", time: 3 }],
        operatorLoadouts: { 99: { weapon: { key: "original" } } }, operatorUltimateStates: { 99: true },
        uiSettings: { timelineMode: "slot", simulationSpPerSecond: 3, simulationFocusMode: true }, selectedEnemyId: "original-enemy",
        selectedSkill: { id: 999 }, activeSlotIndex: 2,
        operators: ["endministrator", "chen_qianyu", "perlica", "wulfgard"].map((slug, index) => ({
            id: index + 1, slug, name: slug, weaponType: index < 2 ? "sword" : "arts_unit",
            skills: [{ id: index + 11, shortType: "BS", name: "Battle" }]
        })),
        weapons: [{ key: "sword", weaponType: "sword", baseAtk: 100 }, { key: "arts", weaponType: "arts_unit", baseAtk: 100 }],
        GEAR_DATABASE: { gloves: [{ key: "gloves" }], armor: [{ key: "armor" }], kits: [{ key: "kit" }] },
        enemies: [{ id: "dummy" }], resolveEnemyId: () => "dummy",
        isWeaponCompatibleWithOperator: (weapon, operator) => weapon.weaponType === operator.weaponType,
        normalizeOperatorLoadouts: value => value,
        setSelectedEnemy: value => { context.selectedEnemyId = value; },
        isSimulationTimelineMode: () => context.uiSettings.timelineMode === "simulation",
        saveTeam() {}, saveOperatorLoadouts() {}, saveUiSettings() {}, applyUiSettings() {},
        saveRotation() {}, renderTeamSlots() {}, renderOperatorList() {}, renderEnemySkillBar() {}, showBuilderScreen() {},
        placeSkillInSlot: (index, id) => { context.rotation.splice(index, 0, { id }); }
    };
    vm.createContext(context);
    vm.runInContext(script, context);
    return { context, storage, elements };
}
const plain = value => JSON.parse(JSON.stringify(value));

test("guide tracks team, first skill and actual publication without requiring equipment", () => {
    const { context: c } = createContext();
    assert.deepEqual(plain(c.getPlannerGuideProgress([null], [null]).complete), [false, false, false]);
    assert.deepEqual(plain(c.getPlannerGuideProgress([1, 2, null], []).complete), [true, false, false]);
    assert.deepEqual(plain(c.getPlannerGuideProgress([1, null], [{ id: 11 }]).complete), [true, true, false]);
    assert.deepEqual(plain(c.getPlannerGuideProgress([1, null], [{ id: 11 }], true).complete), [true, true, true]);
});

test("example resolves real skill IDs without equipment or simulation timing", () => {
    const { context: c } = createContext();
    const before = JSON.stringify([c.operators, c.weapons, c.GEAR_DATABASE]);
    const example = c.createPlannerGuideExample(c.operators);
    assert.deepEqual(plain(example.rotation), [11, 12, 13, 14].map(id => ({ id })));
    assert.equal(example.loadouts, undefined);
    assert.equal(JSON.stringify([c.operators, c.weapons, c.GEAR_DATABASE]), before);
});

test("unavailable operators or Battle Skills leave the draft and storage untouched", () => {
    for (const missing of ["operators", "skills"]) {
        const { context: c, storage } = createContext();
        const before = plain(c.capturePlannerGuideSetup());
        if (missing === "operators") c.operators[0].isVisible = false;
        if (missing === "skills") c.operators[0].skills = [];
        c.loadPlannerGuideExample();
        assert.deepEqual(plain(c.capturePlannerGuideSetup()), before);
        assert.equal(storage.size, 0);
    }
});

test("example backup survives repeated loads and reloads and restores the entire setup", () => {
    const { context: c, storage } = createContext();
    c.uiSettings.timelineMode = "simulation";
    const before = plain(c.capturePlannerGuideSetup());
    c.loadPlannerGuideExample();
    assert.equal(c.uiSettings.timelineMode, "slot");
    assert.equal(c.rotation.length, 4);
    c.loadPlannerGuideExample();
    const { context: reloaded, storage: reloadedStorage } = createContext();
    for (const [key, value] of storage) reloadedStorage.set(key, value);
    reloaded.restorePlannerGuideSetup();
    assert.deepEqual(plain(reloaded.capturePlannerGuideSetup()), before);
    assert.equal(reloadedStorage.size, 0);
});

test("storage failure prevents replacing the current draft", () => {
    const { context: c } = createContext();
    const before = plain(c.capturePlannerGuideSetup());
    c.localStorage.setItem = () => { const error = new Error("full"); error.name = "QuotaExceededError"; throw error; };
    c.loadPlannerGuideExample();
    assert.deepEqual(plain(c.capturePlannerGuideSetup()), before);
    assert.match(c.document.getElementById("plannerGuideStatus").textContent, /protect your current setup/);
});

test("first skill works without equipment in either mode and never duplicates the rotation", () => {
    for (const mode of ["slot", "simulation"]) {
        const { context: c } = createContext();
        c.selectedTeam = [1, null, null, null];
        c.rotation = [null];
        c.operatorLoadouts = {};
        c.uiSettings.timelineMode = mode;
        c.document.getElementById("plannerGuideSkill").value = "11";
        c.placePlannerGuideFirstSkill();
        assert.equal(c.rotation.filter(Boolean).length, 1);
        assert.equal(c.rotation.find(Boolean).id, 11);
        if (mode === "simulation") assert.equal(c.rotation[0].time, 0);
        c.placePlannerGuideFirstSkill();
        assert.equal(c.rotation.filter(Boolean).length, 1);
    }
});

test("example stays in Slot and preserves existing loadouts even when other catalogs fail", () => {
    const { context: c } = createContext();
    const before = plain(c.operatorLoadouts);
    c.weapons = []; c.GEAR_DATABASE = {}; c.enemies = [];
    c.loadPlannerGuideExample();
    assert.equal(c.uiSettings.timelineMode, "slot");
    assert.deepEqual(plain(c.operatorLoadouts), before);
    assert.equal(c.rotation.length, 4);
});

test("publication completes the guide only for the submitted draft", () => {
    const { context: c } = createContext();
    c.initPlannerGuide();
    assert.match(c.document.getElementById("plannerGuideProgress").textContent, /2 of 3/);
    const submitted = c.getPlannerGuideShareSignature();
    c.rotation.push({ id: 11 });
    c.markPlannerGuidePublished(submitted);
    assert.match(c.document.getElementById("plannerGuideProgress").textContent, /2 of 3/);
    c.markPlannerGuidePublished();
    assert.match(c.document.getElementById("plannerGuideProgress").textContent, /Ready/);
    c.rotation.push({ id: 12 });
    c.refreshPlannerGuide();
    assert.match(c.document.getElementById("plannerGuideProgress").textContent, /2 of 3/);
});

test("fresh planners expand the guide; existing rotations and dismissed guides stay collapsed", () => {
    for (const mode of ["fresh", "existing", "dismissed"]) {
        const { context: c, storage } = createContext();
        if (mode !== "existing") c.rotation = [null];
        if (mode === "dismissed") storage.set("rotationforge.plannerGuide.dismissed.v1", "1");
        c.initPlannerGuide();
        assert.equal(c.document.getElementById("plannerGuideBody").hidden, mode !== "fresh");
        assert.equal(c.document.getElementById("plannerGuide").hidden, mode !== "fresh");
        assert.equal(c.document.getElementById("plannerGuideActions").hidden, false);
    }
});
