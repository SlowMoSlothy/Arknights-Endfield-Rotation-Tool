import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const mapping = JSON.parse(fs.readFileSync('tools/data/effect-icon-map.json', 'utf8')).effects;
function context() {
    const c = vm.createContext({});
    for (const file of ['effectIcons', 'buffRegistry', 'debuffRegistry']) {
        vm.runInContext(fs.readFileSync(`endfield/js/data/${file}.js`, 'utf8'), c);
    }
    return c;
}
test('every registered status has an explicit icon or no-icon decision and all images exist', () => {
    const c = context();
    for (const registry of ['BUFF_REGISTRY', 'DEBUFF_REGISTRY']) {
        for (const key of Object.keys(vm.runInContext(registry, c))) assert.ok(key in mapping, key);
    }
    for (const [key, entry] of Object.entries(mapping)) {
        for (const path of entry.stackIcons || [entry.icon]) {
            if (path) assert.ok(fs.existsSync(`endfield/${path}`), `${key}: ${path}`);
        }
    }
});
test('canonical status beats stale database paths and arbitrary instance IDs in both resolvers', () => {
    const c = context();
    for (const resolver of [c.resolveBuffIcon, c.resolveDebuffIcon]) {
        assert.match(resolver({id: 'proc-instance', appliesEffect: 'steel_oath', icon: 'assets/buffs/steel_oath_5.png'}), /icon_battle_pograni_buff.png$/);
        assert.match(resolver({id: 'heat_amp', icon: 'missing.png'}), /icon_battle_affix_fire_enhance.png$/);
        assert.equal(resolver({id: 'unknown', icon: 'missing.png'}), null);
        assert.equal(resolver({id: 'arts_reaction', icon: 'missing.png'}), null);
    }
});
test('stack artwork resolves all stacks, clamps invalid inputs and does not mutate combat data', () => {
    const c = context();
    for (const [key, entry] of Object.entries(mapping)) {
        if (!entry.stackIcons) continue;
        for (let n = 1; n <= entry.stackIcons.length; n++) {
            const effect = {id:key, stackCount:n};
            assert.equal(c.resolvePlannerEffectIcon(effect), entry.stackIcons[n-1]);
            assert.deepEqual(effect, {id:key, stackCount:n});
        }
        assert.equal(c.resolvePlannerEffectIcon({id:key, stacks:NaN}), entry.stackIcons[0]);
        assert.equal(c.resolvePlannerEffectIcon({id:key, stacks:999}), entry.stackIcons.at(-1));
    }
});
test('unavailable runtime images hide cleanly while leaving their effect container and details intact', () => {
    const c = context();
    let error;
    const image = {addEventListener:(name, callback)=>{assert.equal(name, 'error');error=callback;}};
    const item = {hidden:false, style:{}, title:'Steel Oath'};
    c.guardPlannerEffectImage(image, item);
    error();
    assert.equal(item.style.display, 'none');
    assert.equal(item.title, 'Steel Oath');
});

test("all operator effect keys from the checked live catalog have an explicit decision", () => {
    const keys = ["arts_infliction_consumed", "arts_susceptibility", "auxiliary_crystal", "breach", "combustion", "corrosion", "crush", "cryo_amp", "cryo_burst", "cryo_infliction", "cryo_susceptibility", "dive_attack", "electric_amp", "electric_infliction", "electric_susceptibility", "electrification", "electrification_consumed", "final_strike", "firefang_vesperwings", "focus", "gloompurge_arts_amp", "gloompurger_array", "heat_amp", "heat_followup", "heat_infliction", "heat_susceptibility", "hp_treatment", "hypothermic_perfusion", "imprisonment", "knock_down", "lift", "liino_cosmovoice_stance", "liino_vocalist_stance", "link", "melting_flames", "nature_burst_damage_taken", "nature_infliction", "nature_susceptibility", "olden_stare", "originium_crystal", "originium_crystal_consumed", "physical_susceptibility", "protection", "pull", "push", "rossi_crit_buff", "shield", "slow", "solidification", "sp_recovery", "stagger", "steel_oath", "vulnerable", "weaken", "weakness", "yvonne_next_attack_final_strike"];
    for (const key of keys) assert.ok(key in mapping, key);
});
