import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ URL, module: { exports: {} } });
vm.runInContext(fs.readFileSync(new URL('../endfield/js/data/enemyDatabase.js', import.meta.url), 'utf8'), context);
const { normalize } = context.module.exports;

test('enemy profiles preserve unknown values and real zero multipliers', () => {
    const profile = normalize({ name: ' Enemy ', hp: '', defense: 0, resistances: { heat: 0, cryo: '0.5' } });
    assert.equal(profile.name, 'Enemy');
    assert.equal(profile.hp, null);
    assert.equal(profile.defense, 0);
    assert.equal(profile.resistances.heat, 0);
    assert.equal(profile.resistances.cryo, 0.5);
    assert.equal(profile.resistances.nature, null);
    assert.equal(profile.is_visible, false);
});

test('enemy editor rejects invalid combat values and unsafe source links', () => {
    for (const input of [{ name: '' }, { hp: -1 }, { defense: Infinity }, { resistances: { heat: 'bad' } }, { source_url: 'javascript:alert(1)' }, { category: 'invalid' }]) {
        assert.throws(() => normalize({ name: 'Enemy', ...input }));
    }
});

test('enemy ability descriptions cannot be silently dropped without a name', () => {
    assert.throws(() => normalize({ name: 'Enemy', skills: [{ name: '', description: 'Attack' }] }));
    const value = normalize({ name: 'Enemy', skills: [{ name: ' Hit ', description: ' Physical ' }] });
    assert.equal(value.skills[0].name, 'Hit');
    assert.equal(value.skills[0].description, 'Physical');
});
