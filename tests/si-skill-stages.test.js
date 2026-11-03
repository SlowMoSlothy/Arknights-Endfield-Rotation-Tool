import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function planner(simulation=false) {
    const context=vm.createContext({window:{},structuredClone,
        isSimulationTimelineMode:()=>simulation,
        getRotationEntryTime:(entry,index,seconds)=>Number.isFinite(Number(entry.time))?Number(entry.time):index*seconds,
        getTimelineSecondsPerSlot:()=>1,
        getEnemySkillById:()=>null});
    vm.runInContext('let rotation=[]; let operators=[]; let simulationTriggerEvents=[]; let selectedSkill=null;',context);
    for(const file of ['endfield/supabaseClient.js','endfield/js/logic/siMechanics.js','endfield/js/ui/skillsPanel.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
    vm.runInContext('operators=[{id:33,skills:getPlannerSkillRows({id:33,slug:"si"},[]).map(mapDatabaseSkill)}]; simulationTriggerEvents=getSiCombatEvents();',context);
    const set=entries=>{context.entries=entries;vm.runInContext('rotation=entries;',context);};
    const si=()=>vm.runInContext('operators[0]',context);
    const active=()=>context.resolveSiRotationBattleSkillState(si()).skill.id;
    return {context,set,si,active};
}
test('Si shows four icons and one Battle Skill automatically advances through all three stages',()=>{
    const p=planner();
    assert.equal(p.context.getDisplaySkillsForOperator(p.si()).length,4);
    assert.equal(p.active(),3302);
    p.set([{id:3302}]);assert.equal(p.active(),3305);
    p.set([{id:3302},{id:3305}]);assert.equal(p.active(),3306);
    p.set([{id:3302},{id:3305},{id:3306}]);assert.equal(p.active(),3302);
});
test('deletion, reorder and imported stale stage IDs are normalized and remain stable on a second pass',()=>{
    const p=planner();const entries=[{id:3306},{id:3302},{id:3302},{id:3305}];p.set(entries);
    assert.equal(p.context.normalizeQingboMovesInRotation(),true);
    assert.deepEqual(entries.map(e=>e.id),[3302,3305,3306,3302]);
    assert.equal(p.context.normalizeQingboMovesInRotation(),false);
    entries.splice(0,1);p.context.normalizeQingboMovesInRotation();
    assert.deepEqual(entries.map(e=>e.id),[3302,3305,3306]);
    p.set([]);assert.equal(p.active(),3302);
});
test('Simulation uses timestamps, expires the mark at 20 seconds, and ignores unrelated skills as stages',()=>{
    const p=planner(true);const entries=[{id:3306,time:22},{id:3302,time:0},{id:3305,time:1}];p.set(entries);
    p.context.normalizeSiBattleSkillStagesInRotation();
    assert.equal(entries[0].id,3302);assert.equal(p.active(),3305);
    p.set([{id:3302,time:0},{id:3304,time:20}]);assert.equal(p.active(),3302);
    p.set([{id:3302,time:0},{id:3304,time:19.9}]);assert.equal(p.active(),3305);
    p.set([{id:3302,time:0},{id:3305,time:1},{id:3303,time:2}]);assert.equal(p.active(),3306);
});
test('slot mode follows the action order without assuming one second per slot',()=>{
    const p=planner();p.set([{id:3302},...Array.from({length:30},()=>({id:3304}))]);assert.equal(p.active(),3305);
});
test('drawn host transfer keeps Final Stroke, an undrawn drop returns to Brushwork',()=>{
    const p=planner(true);
    p.set([{id:3302,time:0},{id:3305,time:1},{id:99003301,time:2}]);assert.equal(p.active(),3306);
    p.set([{id:3302,time:0},{id:99003301,time:2}]);assert.equal(p.active(),3302);
    p.set([{id:3302,time:0},{id:3305,time:1},{id:99003302,time:2},{id:99003303,time:3}]);assert.equal(p.active(),3306);
});
test('selection follows the staged source without changing unrelated operators or Mi Fu grouping',()=>{
    const p=planner();p.set([{id:3302}]);vm.runInContext('selectedSkill={id:3302};',p.context);
    p.context.getDisplaySkillsForOperator(p.si());assert.equal(vm.runInContext('selectedSkill.id',p.context),3305);
    const other={id:99,skills:[{id:99,name:'Other',type:'Battle Skill'}]};
    assert.equal(p.context.getDisplaySkillsForOperator(other)[0].skill.id,99);
    const mifu={id:27,skills:[{id:2702},{id:2705},{id:2706},{id:2704}]};
    const result=p.context.getDisplaySkillsForOperator(mifu);
    assert.equal(result.length,2);assert.equal(result[0].switchGroup.length,3);
});
