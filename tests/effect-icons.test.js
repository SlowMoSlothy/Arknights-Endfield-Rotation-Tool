import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { imageExtension } from '../tools/sync-effect-icons.js';
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
        assert.match(resolver({id: 'proc-instance', appliesEffect: 'steel_oath', icon: 'assets/buffs/steel_oath_5.png'}), /icon_battle_pograni_buff\.(png|webp)$/);
        assert.match(resolver({id: 'heat_amp', icon: 'missing.png'}), /icon_battle_affix_fire_enhance\.(png|webp)$/);
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

test('archived original artwork matches its source checksum, format and reviewed runtime mapping', () => {
    const catalog = JSON.parse(fs.readFileSync('tools/data/original-effect-icons.json', 'utf8'));
    const assets = new Map();
    for (const asset of catalog.assets) {
        assert.ok(!assets.has(asset.sourcePath), 'duplicate source asset');
        const bytes = fs.readFileSync(`endfield/${asset.localPath}`);
        assert.equal(bytes.length, asset.bytes, asset.localPath);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.localPath);
        assert.ok(asset.localPath.endsWith(`.${imageExtension(bytes)}`), asset.localPath);
        assets.set(asset.sourcePath, asset);
    }
    const c = context();
    const runtime = JSON.parse(vm.runInContext('JSON.stringify(PLANNER_EFFECT_ICONS)', c));
    for (const [key, entry] of Object.entries(mapping)) {
        assert.deepEqual(runtime[key], { ...(entry.stackIcons ? { stackIcons: entry.stackIcons } : { icon: entry.icon }),
            ...(entry.stackSegments ? { stackSegments: entry.stackSegments } : {}) });
        if (entry.sourceFile) {
            const asset = [...assets.values()].find(a => a.sourcePath.endsWith('/' + entry.sourceFile));
            assert.ok(asset, key);
            assert.equal(entry.icon, asset.localPath, key);
        }
    }
    assert.throws(() => imageExtension(Buffer.from('<html>Access denied</html>')));
});

test('operator statuses override unrelated skill glyphs and enemy panel uses the same canonical resolver', () => {
    const c = context();
    vm.runInContext(fs.readFileSync('endfield/js/ui/enemyPanel.js', 'utf8'), c);
    const statuses = {
        firefang_vesperwings: 'icon_battle_camille_normal_skill_bat',
        focus: 'icon_battle_antal_buff',
        imprisonment: 'icon_battle_buff_lizhiyan_combo_seal',
        artful_intent: 'icon_battle_buff_jsspsi_inkmark',
        weakness: 'icon_battle_affix_weak'
    };
    for (const [key, sprite] of Object.entries(statuses)) {
        const effect = { id: 'proc-instance', appliesEffect: key, icon: 'assets/operators/skills/rossi/ult_small.png' };
        assert.ok(c.resolveDebuffIcon(effect).includes(sprite), key);
        assert.equal(c.getEffectIcon(effect), c.resolveDebuffIcon(effect), key);
    }
    assert.equal(c.resolveDebuffIcon({ id: 'weakness' }), c.resolveDebuffIcon({ id: 'weaken' }));
    assert.equal(c.getEffectIcon({ id: 'gloompurger_array' }), null);
});

test('Infliction and Vulnerability add exactly one contour quarter per stack without changing combat data', () => {
    const c = context();
    const node = () => ({ attributes: {}, children: [],
        setAttribute(key, value) { this.attributes[key] = value; },
        appendChild(child) { this.children.push(child); } });
    c.document = { createElementNS: (namespace, tag) => {
        assert.equal(namespace, 'http://www.w3.org/2000/svg');
        assert.ok(['svg', 'circle'].includes(tag));
        return node();
    } };
    for (const key of ['heat_infliction', 'cryo_infliction', 'electric_infliction', 'nature_infliction', 'vulnerable']) {
        for (const count of [1, 2, 3, 4, 999, NaN, -1, 1.8]) {
            const effect = { id: 'proc-instance', appliesEffect: key, stackCount: count };
            const before = JSON.stringify(effect);
            const children = [];
            const classes = [];
            const container = { style: {}, classList: { add: name => classes.push(name) }, appendChild: child => children.push(child) };
            c.appendPlannerEffectStackBadge(container, effect, 'debuff');
            assert.equal(children.length, 1, key);
            const stack = Number.isFinite(count) ? Math.max(1, Math.min(Math.floor(count), 4)) : 1;
            assert.equal(children[0].children.length, stack, key);
            assert.equal(children[0].attributes['aria-label'], `${stack} of 4 stacks`, key);
            assert.deepEqual(classes, ['planner-effect-with-stack-ring']);
            for (const [index, arc] of children[0].children.entries()) {
                assert.equal(arc.attributes['stroke-dasharray'], '80 280');
                assert.equal(arc.attributes.transform, `rotate(${-135 + index * 90} 16 16)`);
            }
            assert.equal(JSON.stringify(effect), before);
            assert.ok(c.resolveDebuffIcon(effect).startsWith('assets/ui/effects/original/'), key);
        }
    }
});
