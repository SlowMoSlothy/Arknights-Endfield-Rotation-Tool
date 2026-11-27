import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync('endfield/js/ui/recentFixes.js','utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function element(tag = 'div') {
    return {tag, children: [], attributes: {}, listeners: {}, hidden: false, textContent: '',
        append(...nodes) { this.children.push(...nodes); }, appendChild(node) { this.children.push(node); },
        replaceChildren(...nodes) { this.children = nodes; }, setAttribute(key,value) { this.attributes[key]=value; },
        addEventListener(key,fn) { this.listeners[key]=fn; }};
}
const all = root => root.children.flatMap(child=>[child,...all(child)]);
const entry = (title,time) => ({entry_key:title,title,summary:'The reported issue was corrected.',thank_you:'Thank you to the anonymous reporter!',fixed_at:time});
function mount(rpc, {observer = false} = {}) {
    const root = element(), status = element(), retry = element('button'), saved = element('article');
    saved.textContent = 'Previously published Si fix'; root.appendChild(saved);
    const ids = new Map([['recentFixesEntries',root],['recentFixesStatus',status],['recentFixesRetry',retry]]);
    const calls = [], observations = [];
    const ctx = {Intl, Date, document: {getElementById:id=>ids.get(id),createElement:element},
        supabaseClient: {rpc: (...args) => {calls.push(args);return rpc(...args);}}};
    ctx.window = ctx;
    if (observer) ctx.IntersectionObserver = class {
        constructor(callback) {this.callback=callback;observations.push(this);}
        observe(target) {this.target=target;} disconnect() {this.disconnected=true;}
    };
    vm.createContext(ctx); vm.runInContext(source,ctx);
    return {ctx,root,status,retry,saved,calls,observations};
}

test('public history groups all fixes from the same Berlin calendar day, newest first', async () => {
    const rows = [entry('Earlier','2026-11-25T12:00:00Z'),entry('Near midnight','2026-11-26T23:10:00Z'),entry('Si','2026-11-27T20:00:00Z')];
    const m=mount(async()=>({data:rows})); await tick();
    assert.equal(m.calls[0][0],'list_recent_fixes');
    const latest = m.root.children[0];
    assert.equal(latest.attributes['aria-label'],'27 Nov 2026');
    assert.deepEqual(all(latest).filter(node=>node.tag==='h4').map(node=>node.textContent),['Si','Near midnight']);
    assert.equal(all(latest).find(node=>node.tag==='time').dateTime,'2026-11-27');
    assert.equal(all(latest).filter(node=>node.className==='planner-fix-thanks').length,2);
    const older = m.root.children[1];
    assert.equal(older.tag,'details');
    assert.equal(older.children[0].textContent,'Earlier fixes (1)');
    assert.equal(older.children[1].attributes['aria-label'],'25 Nov 2026');
    assert.equal(m.status.hidden,true);
});

test('history loads near the section, preserves fallback on failure, and retries without raw error disclosure', async () => {
    let offline=true;
    const m=mount(async()=>offline ? {error:{message:'PRIVATE DATABASE ERROR'}} : {data:[entry('Recovered','2026-11-27T12:00:00Z')]},{observer:true});
    assert.equal(m.calls.length,0);
    m.observations[0].callback([{isIntersecting:false}]); await tick();
    assert.equal(m.calls.length,0);
    m.observations[0].callback([{isIntersecting:true}]); await tick();
    assert.equal(m.observations[0].disconnected,true);
    assert.equal(m.root.children[0],m.saved);
    assert.equal(m.retry.hidden,false);
    assert.equal(m.status.textContent.includes('PRIVATE'),false);
    offline=false; await m.retry.listeners.click();
    assert.equal(m.retry.hidden,true);
    assert.equal(all(m.root).some(node=>node.textContent==='Recovered'),true);
});

test('admin-triggered refresh wins over an older in-flight request and ordinary requests deduplicate', async () => {
    const pending=[];
    const m=mount(()=>new Promise(resolve=>pending.push(resolve)),{observer:true});
    const first=m.ctx.RecentFixes.refresh();
    assert.equal(m.ctx.RecentFixes.refresh(),first);
    await tick();
    const second=m.ctx.RecentFixes.refresh({force:true}); await tick();
    pending[1]({data:[entry('New fix','2026-11-27T12:00:00Z')]}); await second;
    pending[0]({data:[entry('Stale response','2026-11-26T12:00:00Z')]}); await first;
    assert.equal(all(m.root).some(node=>node.textContent==='New fix'),true);
    assert.equal(all(m.root).some(node=>node.textContent==='Stale response'),false);
});

test('a missing client or malformed response can recover while all public text is rendered literally', async () => {
    const m=mount(async()=>({data:{wrong:'shape'}}),{observer:true});
    const originalClient=m.ctx.supabaseClient;
    m.ctx.supabaseClient=null;
    await m.ctx.RecentFixes.refresh();
    assert.equal(m.root.children[0],m.saved);
    m.ctx.supabaseClient=originalClient;
    await m.ctx.RecentFixes.refresh();
    assert.equal(m.root.children[0],m.saved);
    m.ctx.supabaseClient.rpc=async()=>({data:[entry('<img src=x onerror=alert(1)>','2026-11-27T12:00:00Z')]});
    await m.ctx.RecentFixes.refresh();
    assert.equal(all(m.root).find(node=>node.tag==='h4').textContent,'<img src=x onerror=alert(1)>');
    assert.equal(all(m.root).some(node=>node.tag==='img'),false);
});
