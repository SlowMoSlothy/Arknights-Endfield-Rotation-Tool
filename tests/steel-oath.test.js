import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function context() {
    const c=vm.createContext({ARTS_REACTIONS:[],EXCLUSIVE_INFLICTIONS:new Set()});
    for(const file of ['endfield/js/data/buffRegistry.js','endfield/js/data/debuffRegistry.js','endfield/js/logic/comboEngine.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
    const source=fs.readFileSync('endfield/js/ui/rotationGrid.js','utf8');
    vm.runInContext(source.slice(0,source.indexOf('function escapeEffectTooltipText')),c);
    const start=source.indexOf('function getSimulationScalingVariant('),end=source.indexOf('\nfunction ',start+1);
    vm.runInContext(source.slice(start,end),c);
    return c;
}
const status=key=>({id:key,appliesEffect:key,visible:true,persistsForCombo:false});
const oath={id:'steel_oath',appliesEffect:'steel_oath',visible:true,persistsForCombo:true,stackable:true,maxStacks:5,stacksApplied:5};
function apply(c,skill,state,meta,triggers={}) {return c.applySkillDebuffsAndGetActiveState(skill,{},{},state,meta,{},{},triggers);}
test('screenshot sequence shows 5, 5, 4, 3 and a fresh ultimate restores 5',()=>{
    const c=context(),s={},m={};
    const skills=[{id:2204,debuffs:[status('push'),oath]},{id:3302,debuffs:[{id:'cryo_infliction',appliesEffect:'cryo_infliction',visible:true,persistsForCombo:true}]},{id:1402,debuffs:[status('lift')]},{id:1403,debuffs:[status('lift')]}];
    assert.deepEqual(skills.map(skill=>{apply(c,skill,s,m);return s.steel_oath;}),[5,5,4,3]);
    apply(c,skills[0],s,m);assert.equal(s.steel_oath,5);
});
test('only new physical statuses consume oath, not vulnerable, damage, displacement or repeated rendering',()=>{
    const c=context(),s={steel_oath:5},m={steel_oath:{...oath}};
    for(const key of ['vulnerable','cryo_infliction','push','pull','stagger','final_strike'])apply(c,{id:9,debuffs:[status(key)]},s,m);
    assert.equal(s.steel_oath,5);
    for(const key of ['lift','knock_down','crush','breach'])apply(c,{id:9,debuffs:[status(key),status(key)]},s,m);
    assert.equal(s.steel_oath,1);
    c.getActiveDebuffsFromRotationState(s,m);c.getActiveDebuffsFromRotationState(s,m);assert.equal(s.steel_oath,1);
    apply(c,{id:9,debuffs:[status('breach')]},s,m);assert.equal(s.steel_oath,undefined);assert.equal(m.steel_oath,undefined);
    apply(c,{id:9,debuffs:[status('lift')]},s,m);assert.equal(s.steel_oath,undefined);
});
test('Pog combo consumes 1/2/3 sequences including the enhanced three-sequence variant',()=>{
    const c=context();
    const skill={id:2203,damageProfile:{hitCount:1},triggerEffectScaling:{maxStacks:4,variantsByStacks:Object.fromEntries([1,2,3,4].map(n=>[n,{damageSequences:Array.from({length:Math.min(3,n)},()=>({})),damageProfile:{hitCount:Math.min(3,n)}}]))}};
    for(const n of [1,2,3,4]){
        const s={steel_oath:5},m={steel_oath:{...oath}};apply(c,skill,s,m,{vulnerable_consumed:n});assert.equal(s.steel_oath,5-Math.min(3,n));
    }
    const s={steel_oath:2},m={steel_oath:{...oath}};apply(c,{id:2203,damageSequences:[{},{},{}]},s,m);assert.equal(s.steel_oath,undefined);
});
test('slot consumption returns the vulnerable trigger context needed for Pog combo',()=>{
    const c=context(),s={vulnerable:4},m={vulnerable:{}};
    const trigger=c.consumeSlotModeSkillDebuffs({consumeDebuffs:['vulnerable']},s,m);
    assert.equal(trigger.vulnerable_consumed,4);assert.equal(s.vulnerable,undefined);
    const oathState={steel_oath:5},oathMeta={steel_oath:{...oath,appliedStackTimes:[0,0,0,0,0]}};
    apply(c,{id:2203,damageProfile:{hitCount:3}},oathState,oathMeta,trigger);
    assert.equal(oathState.steel_oath,2);assert.equal(oathMeta.steel_oath.appliedStackTimes.length,2);
});
test('conditional statuses and physical-status conversion are respected',()=>{
    const c=context(),s={steel_oath:5},m={steel_oath:{...oath}};
    apply(c,{debuffs:[status('vulnerable')],conditionalDebuffs:[{requiresEffect:'absent',debuffs:[status('lift')]}]},s,m);assert.equal(s.steel_oath,5);
    apply(c,{debuffs:[],conditionalDebuffs:[{noneOf:'absent',debuffs:[status('lift')]}]},s,m);assert.equal(s.steel_oath,4);
});
test('a status converted to Vulnerable does not spend oath; an applied status does',()=>{
    const c=context(),s={steel_oath:5},m={steel_oath:{...oath}};
    const skill={physicalStatusResolution:{statusEffect:'lift'},debuffs:[]};
    apply(c,c.resolveSimulationPhysicalStatusSkill(skill,{}),s,m);assert.equal(s.steel_oath,5);
    apply(c,c.resolveSimulationPhysicalStatusSkill(skill,{vulnerable:1}),s,m);assert.equal(s.steel_oath,4);
});
