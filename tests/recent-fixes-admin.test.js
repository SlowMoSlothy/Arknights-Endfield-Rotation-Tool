import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=fs.readFileSync('endfield/js/ui/adminPanel.js','utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function element(tag) {
    return {tag,children:[],listeners:{},append(...nodes){this.children.push(...nodes);},appendChild(node){this.children.push(node);},
        addEventListener(key,fn){this.listeners[key]=fn;},setAttribute(){}};
}
const all=root=>root.children.flatMap(child=>[child,...all(child)]);
function mount(rpc) {
    const calls=[],messages=[],refreshes=[];
    const ctx={console:{error(){}},URL,document:{createElement:element,getElementById:()=>null},prompt:()=> 'INTERNAL NOTE',
        window:{RecentFixes:{refresh:async options=>refreshes.push(options)}}};
    vm.createContext(ctx); vm.runInContext(source,ctx);
    const state=vm.runInContext('adminPanelState',ctx);
    state.reports=[{id:'report-1',report_type:'bug',status:'pending',description:'PRIVATE DESCRIPTION',additional_information:'PRIVATE DEBUG',review_note:'PRIVATE NOTE'}];
    ctx.getAdminSupabaseClient=()=>({rpc:async(name,args)=>{calls.push({name,args});return rpc(name,args);}});
    ctx.renderAdminReviewList=()=>{}; ctx.refreshAdminNotificationCount=()=>{};
    ctx.setAdminReviewStatus=(text,kind)=>messages.push({text,kind});
    return {ctx,state,calls,messages,refreshes};
}

test('public copy defaults exclude private report data and edits survive card rerenders',()=>{
    const m=mount(async()=>({}));
    const editor=m.ctx.createAdminReportFixEditor(m.state.reports[0],false);
    const fields=all(editor).filter(node=>['input','textarea'].includes(node.tag));
    assert.equal(fields[0].value,'Planner issue fixed');
    assert.equal(fields[1].value,'Fixed an issue reported by a community member.');
    assert.equal(JSON.stringify(fields.map(node=>node.value)).includes('PRIVATE'),false);
    fields[0].value='Si · Brushwork Realm'; fields[0].listeners.input();
    const rebuilt=m.ctx.createAdminReportFixEditor(m.state.reports[0],true);
    assert.equal(all(rebuilt).find(node=>node.tag==='input').value,'Si · Brushwork Realm');
    assert.equal(all(rebuilt).find(node=>node.tag==='input').disabled,true);
});

test('resolving sends only public copy, ignores duplicate clicks and refreshes the public history after success',async()=>{
    let finish;
    const m=mount(()=>new Promise(resolve=>{finish=resolve;}));
    const draft=m.ctx.getAdminReportFixDraft(m.state.reports[0]);
    draft.title='Si · Brushwork Realm'; draft.summary='The missing Infliction now appears in Slot mode.';
    const first=m.ctx.setAdminIssueReportStatus('report-1','resolved');
    await m.ctx.setAdminIssueReportStatus('report-1','resolved');
    assert.equal(m.calls.length,1);
    assert.equal(m.calls[0].name,'resolve_issue_report_with_fix');
    assert.equal(JSON.stringify(m.calls).includes('PRIVATE'),false);
    finish({data:[{id:'report-1',status:'resolved',review_note:'PRIVATE NOTE'}]}); await first;
    assert.equal(m.state.reports[0].status,'resolved');
    assert.equal(m.state.reports[0].review_note,'PRIVATE NOTE');
    assert.equal(m.refreshes.length,1);
    assert.equal(m.refreshes[0].force,true);
    assert.match(m.messages.at(-1).text,/published in Recent fixes/);
});

test('failed or unconfirmed publication keeps the report pending and preserves its public draft',async()=>{
    for(const response of [{error:{code:'PGRST202',message:'missing'}},{data:[]},{data:[{id:'another-report',status:'resolved'}]}]){
        const m=mount(async()=>response);
        m.ctx.getAdminReportFixDraft(m.state.reports[0]).title='Keep this draft';
        await m.ctx.setAdminIssueReportStatus('report-1','resolved');
        assert.equal(m.state.reports[0].status,'pending');
        assert.equal(m.refreshes.length,0);
        assert.equal(m.state.reportActionIds.size,0);
        assert.equal(m.ctx.getAdminReportFixDraft(m.state.reports[0]).title,'Keep this draft');
        assert.equal(m.messages.at(-1).kind,'is-error');
        if(response.error)assert.match(m.messages.at(-1).text,/recent_fixes.sql/);
    }
});

test('restore and dismiss use the existing status RPC and refresh the public history',async()=>{
    const m=mount(async(name,args)=>({data:[{id:'report-1',status:args.report_status}]}));
    for(const status of ['dismissed','pending'])await m.ctx.setAdminIssueReportStatus('report-1',status);
    assert.equal(m.calls.every(call=>call.name==='set_issue_report_status'),true);
    assert.equal(m.calls[0].args.admin_review_note,'INTERNAL NOTE');
    assert.equal(m.calls[1].args.admin_review_note,'');
    assert.equal(m.refreshes.length,2);
});
