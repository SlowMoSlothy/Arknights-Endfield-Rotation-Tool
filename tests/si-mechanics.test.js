import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = vm.createContext({ window: {}, structuredClone });
for (const path of ['endfield/supabaseClient.js', 'endfield/js/logic/siMechanics.js', 'endfield/js/logic/damageBreakdown.js']) {
    vm.runInContext(fs.readFileSync(path, 'utf8'), ctx);
}
const skill = action => ctx.getPlannerSkillRows({id:33,slug:'si'}, []).map(ctx.mapDatabaseSkill).find(s => s.siAction === action);
const action = (name, time, extra = {}) => ({time, sourceOperatorId:33, skillData:skill(name), ...extra});
const hit = (time, value = 1000) => ({time, sourceOperatorId:1, skillData:{}, damageBreakdown:{status:'verified',preMitigationDamage:value*2,finalDamage:value,criticalHitDamage:value*1.5,expectedFinalDamage:value*1.2}});
test('Artful Intent records team and basic damage, expires before equal-time hits, never re-mitigates or re-crits', () => {
    const events = [action('brushwork',0),hit(1),{...hit(10),kind:'basic-attack'},hit(20)];
    const [burst] = ctx.createSiRecordedDamageEvents(events,30);
    assert.equal(burst.time,20);
    assert.equal(burst.damageBreakdown.finalDamage,260);
    assert.equal(burst.damageBreakdown.criticalHitDamage,390);
    assert.equal(burst.damageBreakdown.expectedFinalDamage,312);
    assert.equal(burst.damageBreakdown.canCrit,false);
    assert.equal(ctx.getSimulationDisplayedDamage(burst.damageBreakdown,'critical'),390);
    assert.equal(ctx.getSimulationDamageBreakdown(burst),burst.damageBreakdown);
    assert.equal(ctx.createSiRecordedDamageEvents([...events,burst],30)[0].damageBreakdown.finalDamage,260);
});
test('Final Stroke needs an Inksoul and detonates once without extending the mark', () => {
    const events = [action('brushwork',0),hit(1),action('final_stroke',2),action('initial_stroke',3),hit(4),action('final_stroke',5),hit(6)];
    const bursts = ctx.createSiRecordedDamageEvents(events,30);
    assert.equal(bursts.length,1);
    assert.equal(bursts[0].time,5);
    assert.equal(bursts[0].damageBreakdown.finalDamage,260);
    assert.equal(ctx.createSiRecordedDamageEvents(events.slice(0,5),19).length,0);
    assert.equal(ctx.createSiRecordedDamageEvents(events.slice(0,5),30)[0].time,20);
});
test('unaffordable casts do not create marks or Inksouls; missing enemy mitigation stays unknown', () => {
    assert.equal(ctx.createSiRecordedDamageEvents([action('brushwork',0,{spState:{affordable:false}}),hit(1)],30).length,0);
    const unavailable=hit(1);unavailable.damageBreakdown.finalDamage=null;
    const [burst]=ctx.createSiRecordedDamageEvents([action('brushwork',0),unavailable,action('initial_stroke',2,{spState:{affordable:false}}),action('final_stroke',3)],30);
    assert.equal(burst.time,20);
    assert.equal(burst.damageBreakdown.finalDamage,null);
});
test('team position 01 selects Heat infliction while Brushwork damage remains Cryo', () => {
    for (const element of ['heat','cryo','physical']) {
        const resolved=ctx.resolveSiTeamSkill(skill('brushwork'),[1],[{id:1,elementType:element}]);
        assert.equal(resolved.debuffs[0].id,element==='heat'?'heat_infliction':'cryo_infliction');
        assert.equal(resolved.damageProfile.element,'cryo');
    }
});
test('Ultimate grants 36% Amp for 12s only to its corresponding element', () => {
    const buffs=skill('ultimate').buffs;
    const event={sourceOperatorId:1,skillData:{type:'Battle Skill'},activeBuffsBefore:buffs};
    for (const element of ['heat','cryo','nature','physical']) {
        const result=ctx.getSimulationOutgoingDamageBonuses(event,element);
        assert.ok(Math.abs(result.multiplier-(['heat','cryo'].includes(element)?1.36:1)) < 1e-9);
    }
});
test('Combo scales its 750% base with the highest consumed stack count', () => {
    const combo=skill('combo');
    assert.equal(combo.triggerEffectScaling.stackAggregation,'max');
    assert.equal(combo.triggerEffectScaling.stackSource,'trigger');
    const source=fs.readFileSync('endfield/js/ui/rotationGrid.js', 'utf8');
    ctx.normalizeRotationConsumeKey=value=>String(value || '').trim().toLowerCase();
    vm.runInContext(source.slice(source.indexOf('function getSimulationScalingEffectStacks'), source.indexOf('\nfunction enrichSimulationSkillEventsWithEffects')), ctx);
    const result=ctx.applySimulationConsumedEffectScaling(combo,[],{cryo_infliction_consumed:2,heat_infliction_consumed:4});
    assert.equal(result.damageProfile.atkMultiplier,11.5);
    assert.equal(skill('final_strike').damageProfile.atkMultiplier,1.44);
});

const hostEvent = (kind, time, extra = {}) => ({time, skillData:ctx.getSiCombatEvents().find(s => s.siHostEvent === kind), ...extra});
const damageBursts = events => events.filter(e => e.kind === 'si-recorded-damage');
test('a drawn Inksoul transfers across hosts preserving stored damage and the original expiry', () => {
    const result=ctx.createSiRecordedDamageEvents([
        action('brushwork',0), action('initial_stroke',1),hit(2),
        hostEvent('defeat_next',5),hit(6),hostEvent('defeat_next',10),hit(11)
    ],30);
    const transfers=result.filter(e=>e.kind==='si-host-transfer');
    assert.deepEqual(Array.from(transfers,e=>e.targetId),['enemy-2','enemy-3']);
    assert.deepEqual(Array.from(transfers,e=>e.siHostState.remainingSeconds),[15,10]);
    assert.equal(transfers[0].siHostState.recordedDamage.finalDamage,1000);
    assert.equal(transfers[1].siHostState.recordedDamage.finalDamage,2000);
    const [burst]=damageBursts(result);
    assert.equal(burst.time,20);
    assert.equal(burst.targetId,'enemy-3');
    assert.equal(burst.damageBreakdown.finalDamage,390);
});
test('Final Stroke detonates on the new host after transfer', () => {
    const result=ctx.createSiRecordedDamageEvents([action('brushwork',0),action('initial_stroke',1),hit(2),hostEvent('defeat_next',3),hit(4),action('final_stroke',5)],30);
    const [burst]=damageBursts(result);
    assert.equal(burst.time,5);
    assert.equal(burst.targetId,'enemy-2');
    assert.equal(burst.damageBreakdown.finalDamage,260);
});
test('last host death suspends recording, a later enemy resumes it without extending expiry', () => {
    const first=[action('brushwork',0),action('initial_stroke',1),hit(2),hostEvent('defeat_last',3),hit(4),action('final_stroke',5)];
    assert.equal(damageBursts(ctx.createSiRecordedDamageEvents(first,30)).length,0);
    const result=ctx.createSiRecordedDamageEvents([...first,hostEvent('enemy_enters',6),hit(7)],30);
    assert.equal(result.find(e=>e.kind==='si-host-transfer').siHostState.expiresAt,20);
    assert.equal(damageBursts(result)[0].damageBreakdown.finalDamage,260);
    assert.equal(damageBursts(ctx.createSiRecordedDamageEvents([...first,hostEvent('enemy_enters',21),hit(22)],30)).length,0);
});
test('an undrawn Inksoul drops rather than silently transferring or bursting on a dead host', () => {
    const result=ctx.createSiRecordedDamageEvents([action('brushwork',0),hit(1),hostEvent('defeat_next',2),hit(3),action('initial_stroke',4),action('final_stroke',5)],30);
    assert.equal(result.length,1);
    assert.equal(result[0].kind,'si-inksoul-dropped');
    assert.equal(result[0].siHostState.drawn,false);
});
test('only matching hosts and Inksoul receive recording, overlapping damage instances count once', () => {
    const result=ctx.createSiRecordedDamageEvents([
        action('brushwork',0),action('initial_stroke',1),
        {...hit(2),targetId:'unrelated'},
        {...hit(3),targetIds:['enemy-1','inksoul:33'],damageInstanceId:'aoe-1'},
        {...hit(3),targetId:'inksoul:33',damageInstanceId:'aoe-1'},
        hostEvent('defeat_next',4,{defeatedTargetId:'unrelated'}),
        hostEvent('enemy_enters',5),
        {...hit(6),targetId:'enemy-1'}
    ],30);
    assert.equal(result.filter(e=>e.kind==='si-host-transfer').length,0);
    assert.equal(damageBursts(result)[0].targetId,'enemy-1');
    assert.equal(damageBursts(result)[0].damageBreakdown.finalDamage,260);
});
test('expiry happens before an equal-time defeat, and a fresh mark starts a fresh host state', () => {
    const result=ctx.createSiRecordedDamageEvents([
        action('brushwork',0),action('initial_stroke',1),hit(2),hostEvent('defeat_next',20),
        action('brushwork',21),action('initial_stroke',22),hit(23),action('final_stroke',24)
    ],45);
    assert.equal(result.filter(e=>e.kind==='si-host-transfer').length,0);
    assert.deepEqual(Array.from(damageBursts(result),e=>[e.time,e.targetId,e.damageBreakdown.finalDamage]),[[20,'enemy-1',130],[24,'enemy-2',130]]);
});
test('host Combat Events remain usable on database load failure and preserve existing events', async () => {
    const local=vm.createContext({window:{},structuredClone,console:{info(){}}});
    vm.runInContext('let simulationTriggerEvents = [];',local);
    for(const file of ['endfield/supabaseClient.js','endfield/js/logic/siMechanics.js'])vm.runInContext(fs.readFileSync(file,'utf8'),local);
    assert.equal(await local.hydrateSimulationTriggerEventsFromSupabase(),true);
    assert.equal(local.window.simulationTriggerEvents.length,3);
    local.loadSimulationTriggerEventsFromSupabase=async()=>[{id:1,eventKey:'other'}];
    await local.hydrateSimulationTriggerEventsFromSupabase();
    assert.equal(local.window.simulationTriggerEvents.length,4);
    assert.equal(local.window.simulationTriggerEvents[0].eventKey,'other');
    assert.equal(local.getSiCombatEvents(local.window.simulationTriggerEvents).length,4);
});

test('a defeat event cannot invent a host after the last enemy is already gone', () => {
    const result=ctx.createSiRecordedDamageEvents([action('brushwork',0),action('initial_stroke',1),hostEvent('defeat_last',2),hostEvent('defeat_next',3),hit(4),action('final_stroke',5)],30);
    assert.equal(result.filter(e=>e.kind==='si-host-transfer').length,0);
    assert.equal(damageBursts(result).length,0);
});
