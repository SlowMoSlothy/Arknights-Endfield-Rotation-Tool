import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = file => fs.readFileSync(`endfield/${file}`, 'utf8');
function element(tag = 'div') {
    return { tag, children: [], listeners: {}, value: '', textContent: '', style: {}, classList: { add() {}, remove() {} },
        append(...nodes) { this.children.push(...nodes); }, appendChild(node) { this.children.push(node); },
        setAttribute() {}, addEventListener(name, fn) { this.listeners[name] = fn; }, reset() {} };
}
const all = root => [root, ...root.children.flatMap(all)];
function mount() {
    const fields = new Map(), writes = [], loads = [], messages = [];
    const ctx = vm.createContext({ URL, URLSearchParams, TextEncoder, btoa, atob, Date,
        console: { error() {} }, selectedTeam: [1, null, 35, null], operatorUltimateStates: { 35: true },
        rotation: [{ id: 101 }, null, { id: 3502, autoInserted: true }],
        uiSettings: { timelineMode: 'slot', simulationSpPerSecond: 8 },
        operators: [{ id: 1, name: 'Laevatain' }, { id: 35, name: 'Kay' }],
        document: { createElement: element, getElementById: id => fields.get(id), addEventListener() {} },
        location: { href: 'https://rotationforge.gg/endfield/', origin: 'https://rotationforge.gg',
            pathname: '/endfield/', protocol: 'https:' }, setTimeout() {}, confirm: () => true,
        DEFAULT_BASIC_ATTACK_HITS: 3, DEFAULT_BASIC_ATTACK_FINAL_HITS: 1, BASIC_ATTACK_ACTION_TYPE: 'basicAttack',
        isBasicAttackEntry: entry => entry?.type === 'basicAttack',
        getSelectedEnemy: () => ({ id: 'training_dummy' }),
        getSkillById: id => [{ id: 101, operatorId: 1, name: 'Flaming Cinders', type: 'Final Strike', shortType: 'FS', iconSmall: 'assets/known.png' },
            { id: 3502, operatorId: 35, name: 'Really Heavy Bash', type: 'Battle Skill', shortType: 'BS' }].find(skill => skill.id === id),
        supabaseClient: { from: name => ({ insert: async payload => { writes.push({ name, payload }); return {}; } }) }
    });
    ctx.window = ctx;
    for (const file of ['js/logic/shareCode.js', 'js/ui/reportRotation.js', 'js/ui/reportIssue.js', 'js/ui/adminPanel.js']) {
        vm.runInContext(source(file), ctx);
    }
    ctx.applyBuildShareCode = async code => loads.push(code);
    ctx.closeAdminPanel = () => { ctx.closed = true; };
    ctx.setAdminReviewStatus = (message, kind) => messages.push({ message, kind });
    return { ctx, fields, writes, loads, messages };
}

test('capture freezes the submitted steps, team order and original encoded build independently of later edits', () => {
    const { ctx } = mount(), snapshot = ctx.ReportRotation.capture();
    assert.ok(snapshot);
    assert.deepEqual(Array.from(snapshot.rotation, action => action.id), [101, 3502]);
    assert.equal(snapshot.rotation[1].autoInserted, true);
    const code = snapshot.share_code, decoded = ctx.parseBuildShareCode(code);
    assert.deepEqual(Array.from(decoded.team), [1, 0, 35, 0], 'Empty team positions keep the share format zero sentinel');
    assert.equal(decoded.rotation[1], null, 'The exact setup keeps empty slots even when the step preview omits them');
    assert.equal(decoded.operatorUltimateStates[35], true);
    ctx.rotation[0].id = 3502; ctx.selectedTeam[0] = 35;
    assert.equal(snapshot.rotation[0].id, 101);
    assert.equal(snapshot.team[0].id, 1);
    assert.equal(snapshot.share_code, code);
});

test('Simulation capture keeps Basic Attacks, time zero, skill times, enemy and loadout settings', () => {
    const { ctx } = mount();
    ctx.uiSettings = { timelineMode: 'simulation', simulationSpPerSecond: 10.5, simulationDurationSeconds: 40, simulationDamageMode: 'critical' };
    ctx.rotation = [{ type: 'basicAttack', operatorId: 35, hitCount: 3, finalHitCount: 1, time: 0 }, { id: 3502, time: 9.2 }];
    ctx.getSelectedEnemy = () => ({ id: 'custom_enemy' });
    ctx.getShareableOperatorLoadouts = () => ({ 35: { weapon: { key: 'sweet_deal', potential: 2, essence: { primary: 1, secondary: 2, skill: 3 } }, armor: { key: 'armor_test' } } });
    const snapshot = ctx.ReportRotation.capture();
    assert.ok(snapshot);
    assert.equal(snapshot.mode, 'simulation');
    assert.equal(snapshot.rotation[0].actionType, 'basicAttack');
    assert.equal(snapshot.rotation[0].time, 0);
    assert.equal(snapshot.rotation[1].time, 9.2);
    const decoded = ctx.parseBuildShareCode(snapshot.share_code);
    assert.equal(decoded.enemyId, 'custom_enemy');
    assert.equal(decoded.operatorLoadouts[35].weapon.key, 'sweet_deal');
    assert.equal(decoded.operatorLoadouts[35].weapon.potential, 2);
    assert.equal(decoded.operatorLoadouts[35].armor.key, 'armor_test');
    assert.equal(decoded.uiSettings.simulationSpPerSecond, 10.5);
    assert.equal(decoded.uiSettings.simulationDurationSeconds, 40);
});

test('empty, malformed, unavailable or excessive rotations fail safely without blocking a report', () => {
    const { ctx } = mount();
    for (const rotation of [[], [null], [{ id: 'invalid' }], Array.from({ length: 241 }, () => ({ id: 101 }))]) {
        ctx.rotation = rotation;
        assert.equal(ctx.ReportRotation.capture(), null);
        const payload = ctx.buildIssueReportPayload({ description: 'This is a report about a broken rotation.' });
        assert.equal(payload.rotation_snapshot, null);
    }
    ctx.rotation = [{ id: 101 }]; ctx.createBuildShareCode = () => { throw new Error('broken encoder'); };
    assert.equal(ctx.ReportRotation.capture(), null);
});

test('the preview shows every step and time, uses catalog icons only, and treats report names as text', () => {
    const { ctx } = mount(), snapshot = ctx.ReportRotation.capture();
    snapshot.rotation[0].name = '<img src=x onerror=alert(1)>';
    snapshot.rotation[0].iconSmall = 'https://untrusted.invalid/track';
    snapshot.rotation[1].id = 999999; snapshot.rotation[1].name = '';
    snapshot.rotation[1].time = 0;
    const preview = ctx.ReportRotation.preview(snapshot), nodes = all(preview);
    assert.equal(nodes.filter(node => node.tag === 'li').length, 2);
    assert.ok(nodes.some(node => node.textContent === '<img src=x onerror=alert(1)>'));
    assert.ok(nodes.some(node => node.textContent === 'Unknown skill (#999999)'));
    assert.ok(nodes.some(node => node.tag === 'small' && node.textContent.includes('0s')));
    assert.deepEqual(nodes.filter(node => node.tag === 'img').map(node => node.src), ['assets/known.png']);
    assert.match(ctx.ReportRotation.preview(null).textContent, /No rotation was attached/);
    assert.match(ctx.ReportRotation.preview({ version: 999 }).textContent, /could not be read/);
    assert.equal(ctx.ReportRotation.normalize({ ...snapshot, share_code: 'javascript:alert(1)' }), null);
});

test('submission captures the current rotation when Send is pressed and inserts it only into the private report', async () => {
    const { ctx, fields, writes } = mount();
    fields.set('reportIssueDescriptionInput', { value: 'The following action applies an unexpected debuff.' });
    ctx.rotation.push({ id: 101 });
    await ctx.submitReportIssue({ preventDefault() {} });
    assert.equal(writes.length, 1);
    assert.equal(writes[0].name, 'issue_reports');
    assert.equal(writes[0].payload.rotation_snapshot.rotation.length, 3);
    assert.equal(writes[0].payload.rotation_snapshot.rotation[2].id, 101);
});

test('a failed attachment is disclosed while the report itself can still be sent', async () => {
    const { ctx, fields, writes } = mount();
    fields.set('reportIssueDescriptionInput', { value: 'This invalid rotation prevents an action from rendering.' });
    const status = element(); fields.set('reportIssueStatus', status);
    ctx.rotation = [{ id: 'broken' }];
    await ctx.submitReportIssue({ preventDefault() {} });
    assert.equal(writes.length, 1);
    assert.equal(writes[0].payload.rotation_snapshot, null);
    assert.match(status.textContent, /rotation could not be attached/);
});

test('admin loads the captured setup after confirmation, not the reporter URL or current draft', async () => {
    const { ctx, loads, messages } = mount(), snapshot = ctx.ReportRotation.capture();
    const row = { rotation_snapshot: snapshot, page_url: 'https://untrusted.invalid/' };
    ctx.rotation = [{ id: 101 }];
    ctx.confirm = () => false;
    await ctx.loadAdminReportRotation(row);
    assert.equal(loads.length, 0);
    ctx.confirm = () => true;
    await ctx.loadAdminReportRotation(row);
    assert.deepEqual(loads, [snapshot.share_code]);
    assert.equal(ctx.closed, true);
    ctx.closed = false; ctx.applyBuildShareCode = async () => { throw new Error('invalid code'); };
    await ctx.loadAdminReportRotation(row);
    assert.equal(ctx.closed, false);
    assert.equal(messages.at(-1).kind, 'is-error');
});

test('admin cards offer the attached steps and load action, while old reports remain usable', () => {
    const { ctx } = mount();
    const row = { id: 'report-1', report_type: 'bug', status: 'pending', description: 'Unexpected debuff', rotation_snapshot: ctx.ReportRotation.capture() };
    const nodes = all(ctx.createAdminIssueReportCard(row));
    assert.ok(nodes.some(node => node.textContent === 'Load reported rotation'));
    assert.ok(nodes.some(node => node.tag === 'details' && node.className === 'admin-report-rotation'));
    delete row.rotation_snapshot;
    const legacy = all(ctx.createAdminIssueReportCard(row));
    assert.ok(legacy.some(node => /No rotation was attached/.test(node.textContent)));
    assert.equal(legacy.some(node => node.textContent === 'Load reported rotation'), false);
});
