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
