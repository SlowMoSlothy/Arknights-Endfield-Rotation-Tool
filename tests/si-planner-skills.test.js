import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({ window: {}, structuredClone });
vm.runInContext(fs.readFileSync('endfield/supabaseClient.js', 'utf8'), context);
const resolve = (op, rows = []) => context.getPlannerSkillRows(op, rows);
test('catalog-only Si has usable source-backed skills and existing icons', () => {
    const rows = resolve({id: 33, slug: 'si'});
    assert.equal(rows.length, 7);
    assert.deepEqual(Array.from(rows.slice(0, 4), row => row.short_type), ['FS', 'BS', 'CS', 'Ult']);
    for (const row of rows) {
        assert.ok(fs.existsSync(`endfield/${row.icon_small_path}`));
        const skill = context.mapDatabaseSkill(row);
        assert.equal(skill.operatorId, 33);
        assert.equal(skill.elementType, 'cryo');
        assert.ok(skill.name && skill.description);
    }
    assert.equal(rows[1].energy, 100);
    assert.equal(rows[2].cooldown, 15);
    assert.equal(rows[3].energy, 80);
    assert.equal(rows[4].raw_data.sp_cost, 15);
    assert.equal(rows[5].raw_data.sp_cost, 0);
});
test('database skills take precedence and fallback remains isolated to Si', () => {
    const authored = [{id: 3302, name: 'Admin edit'}];
    assert.equal(resolve({id: 33, slug: 'si'}, authored), authored);
    assert.equal(resolve({id: 32, slug: 'purrchena'}).length, 0);
    assert.equal(resolve({id: 33, slug: 'other'}).length, 0);
    const rows = resolve({id: 33, slug: 'si'});
    rows[0].raw_data.skillRank = 1;
    assert.equal(resolve({id: 33, slug: 'si'})[0].raw_data.skillRank, 12);
});

test('Si Dive Attack has the rank-12 Cryo multiplier and shared Dive icon', () => {
    const dive = resolve({id:33,slug:'si'}).map(context.mapDatabaseSkill).find(skill => skill.siAction === 'dive_attack');
    assert.equal(dive.type, 'Dive Attack');
    assert.equal(dive.normalAttackDamage, true);
    assert.equal(dive.emits[0], 'dive_attack');
    assert.equal(dive.damageProfile.atkMultiplier, 1.8);
    assert.equal(dive.damageProfile.element, 'cryo');
    assert.equal(dive.iconSmall, 'assets/operators/skills/shared/dive_attack.png');
    assert.ok(fs.existsSync('endfield/' + dive.iconSmall));
});
