import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("endfield/js/ui/damageInputs.js", "utf8");
function setup() {
    const c = { selectedTeam: [1, 2, null, null], operators: [{ id: 1, name: "One", baseAtk: 200 }, { id: 2, name: "Two", baseAtk: 300 }],
        operatorLoadouts: { 1: { weapon: { key: "w" } } }, weapons: [{ key: "w", baseAtk: 100 }],
        getSelectedEnemy: () => ({ name: "Dummy", combatProfile: {} }), getEnemyCombatProfile: () => ({ defense: 100 }) };
    vm.createContext(c);
    vm.runInContext(source, c);
    return c;
}

test("mixed teams identify only operators with missing weapons", () => {
    const c = setup();
    const issues = c.getCurrentDamageInputIssues();
    assert.equal(issues.loadoutIssues.length, 1);
    assert.equal(issues.loadoutIssues[0].id, 2);
    assert.equal(c.getSimulationDamageInputIssue({ sourceOperatorId: 1 }), "");
    assert.equal(c.getSimulationDamageInputIssue({ skillData: { operatorId: 2 } }), "No weapon equipped");
});

test("missing ATK data is distinguished from an unequipped weapon and from a real zero damage event", () => {
    const c = setup();
    assert.equal(c.getSimulationDamageInputIssue({ sourceOperatorId: 1, damageBreakdown: { finalDamage: 0 } }), "");
    c.operators[0].baseAtk = null;
    assert.equal(c.getSimulationDamageInputIssue({ sourceOperatorId: 1 }), "Operator ATK is missing");
    c.operators[0].baseAtk = 200;
    c.weapons[0].baseAtk = null;
    assert.equal(c.getSimulationDamageInputIssue({ sourceOperatorId: 1 }), "Weapon ATK is missing");
});

test("enemy assumptions preserve recorded zeros and flag each missing element", () => {
    const c = setup();
    c.getSelectedEnemy = () => ({ name: "Enemy", combatProfile: { defense: 0, resistanceMultipliers: { heat: 0, physical: 1 } } });
    const issues = c.getCurrentDamageInputIssues();
    assert.equal(issues.assumptions.length, 1);
    assert.doesNotMatch(issues.assumptions[0], /physical|heat/);
    assert.match(issues.assumptions[0], /cryo, electric, nature, aether/);
    assert.equal(issues.enemyVerified, false);
});

test("fully recorded verified enemy inputs have no assumptions", () => {
    const c = setup();
    c.getSelectedEnemy = () => ({ combatProfile: { defense: 0, verified: true,
        resistanceMultipliers: { physical: 1, heat: 1, cryo: 1, electric: 1, nature: 1, aether: 1 } } });
    assert.equal(c.getCurrentDamageInputIssues().assumptions.length, 0);
    assert.equal(c.getCurrentDamageInputIssues().enemyVerified, true);
});

test("warning renders without a damage summary and opens the affected loadout", () => {
    const c = setup();
    let panel, opened;
    const element = () => ({ children: [], setAttribute() {}, appendChild(child) { this.children.push(child); },
        append(...children) { this.children.push(...children); }, addEventListener(name, fn) { this[name] = fn; } });
    c.document = {
        querySelector: selector => selector === "#skillList" ? { insertAdjacentElement(position, node) { assert.equal(position, "beforebegin"); panel = node; } } : null,
        createElement: element
    };
    c.openOperatorLoadoutModal = id => { opened = id; };
    c.mountSimulationDamageInputs();
    assert.match(panel.children[0].textContent, /Loadout incomplete/);
    assert.equal(panel.children[1].textContent, "View details");
    let handedOff = false;
    const details = c.createSimulationDamageInputDetails(c.getCurrentDamageInputIssues(), () => { handedOff = true; });
    const list = details.children[2];
    list.children[0].children[1].click();
    assert.equal(handedOff, true);
    assert.equal(opened, 2);
});
