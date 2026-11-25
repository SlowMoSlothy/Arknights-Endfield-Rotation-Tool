import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function portraitContext() {
    const context = vm.createContext({window: {}, console});
    vm.runInContext(fs.readFileSync('endfield/js/data/operatorPortraits.js', 'utf8'), context);
    return context;
}

test('portrait paths upgrade legacy avatars without replacing skill glyphs', () => {
    const {resolveOperatorPortraitAsset: resolve} = portraitContext();
    assert.equal(resolve('assets/operators/avatars/Perlica.png'), 'assets/operators/avatars/refined/Perlica.png');
    assert.equal(resolve('/endfield/assets/operators/avatars/Liino.svg?v=old'), 'assets/operators/avatars/refined/Liino.png');
    assert.equal(resolve('assets/operators/skills/perlica/bs_small.png'), 'assets/operators/skills/perlica/bs_small.png');
    assert.equal(resolve('assets/ui/elements/electric.webp'), 'assets/ui/elements/electric.webp');
    assert.equal(resolve('assets/operators/avatars/Unknown.png'), 'assets/operators/avatars/Unknown.png');
});

test('planner skills use prepared large portraits while retaining their small glyphs', () => {
    const context = portraitContext();
    vm.runInContext(fs.readFileSync('endfield/supabaseClient.js', 'utf8'), context);
    const source = {id: 'perlica-bs', icon_path: 'assets/operators/avatars/Perlica.png', icon_small_path: 'assets/operators/skills/perlica/bs_small.png', raw_data: {}};
    const before = JSON.stringify(source);
    const skill = context.mapDatabaseSkill(source);
    assert.equal(skill.icon, 'assets/operators/avatars/refined/Perlica.png');
    assert.equal(skill.iconSmall, source.icon_small_path);
    assert.equal(JSON.stringify(source), before);
});
