import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function mount(leaderElement = 'cryo') {
    const ctx = vm.createContext({window: {addEventListener() {}}, structuredClone,
        selectedTeam: [1, 33, null, null], operators: [{id: 1, elementType: leaderElement}, {id: 33, elementType: 'cryo'}],
        ARTS_REACTIONS: [], rotation: []});
    for (const file of ['supabaseClient.js', 'js/data/debuffRegistry.js', 'js/data/buffRegistry.js',
        'js/logic/reactionEngine.js', 'js/logic/siMechanics.js', 'js/logic/comboEngine.js', 'js/ui/rotationGrid.js']) {
        vm.runInContext(fs.readFileSync(`endfield/${file}`, 'utf8'), ctx);
    }
    const skills = ctx.getPlannerSkillRows({id: 33, slug: 'si'}, []).map(ctx.mapDatabaseSkill);
    ctx.getSkillById = id => skills.find(skill => skill.id === id);
    return {ctx, skill: action => skills.find(skill => skill.siAction === action)};
}

test('Brushwork Realm applies one visible Infliction in Slot mode, chosen by team position 01', () => {
    for (const leader of ['cryo', 'heat', 'physical', 'electric', 'nature']) {
        const {ctx, skill} = mount(leader);
        const original = JSON.stringify(skill('brushwork'));
        const resolved = ctx.resolveSlotModeSkillData(skill('brushwork'), {});
        const stackState = {}, metaState = {};
        const active = ctx.applySkillDebuffsAndGetActiveState(resolved, {}, {}, stackState, metaState, {}, {});
        const infliction = leader === 'heat' ? 'heat_infliction' : 'cryo_infliction';
        assert.equal(stackState[infliction], 1, `${leader} leader`);
        assert.equal(active.find(effect => effect.id === infliction)?.visible, true);
        assert.equal(active.find(effect => effect.id === infliction)?.currentStacks, 1);
        assert.equal(active.filter(effect => effect.id.endsWith('_infliction')).length, 1);
        assert.equal(stackState.immobilization, 1);
        assert.equal(resolved.damageProfile.element, 'cryo');
        assert.equal(JSON.stringify(skill('brushwork')), original, 'Resolving effects must not mutate the stored skill');
    }
});

test('the next two Battle Skill stages retain the stack and do not apply Infliction again', () => {
    const {ctx, skill} = mount();
    const stacks = {}, meta = {};
    for (const action of ['brushwork', 'initial_stroke', 'final_stroke']) {
        const resolved = ctx.resolveSlotModeSkillData(skill(action), stacks);
        ctx.applySkillDebuffsAndGetActiveState(resolved, {}, {}, stacks, meta, {}, {});
        assert.equal(stacks.cryo_infliction, 1, action);
    }
});

test('combo detection sees Brushwork Infliction and its later consumption', () => {
    for (const leader of ['heat', 'cryo']) {
        const {ctx, skill} = mount(leader);
        const key = `${leader}_infliction`;
        ctx.rotation = [{id: skill('brushwork').id}];
        const state = ctx.collectPersistentEffectsFromRotationUpToIndex(0);
        assert.equal(state[key], 1);
        assert.equal(ctx.collectEffectsFromSkill(skill('brushwork'))[key], 1);
        const consumer = {id: 99, type: 'Battle Skill', consumeDebuffs: [key]};
        const triggers = ctx.collectEffectsFromSkill(consumer, state);
        assert.equal(triggers[`${key}_consumed`], 1);
        ctx.applySkillEffectsToComboMap(consumer, state);
        assert.equal(state[key], undefined);
    }
});

test('re-resolving Brushwork is idempotent and replacing the leader switches its Infliction', () => {
    const {ctx, skill} = mount('heat');
    const original = skill('brushwork');
    original.debuffs = [{id: 'artful_intent', appliesEffect: 'artful_intent'}];
    const heat = ctx.resolveSiTeamSkill(original, ctx.selectedTeam, ctx.operators);
    const repeated = ctx.resolveSiTeamSkill(heat, ctx.selectedTeam, ctx.operators);
    assert.equal(repeated.debuffs.filter(effect => effect.id === 'heat_infliction').length, 1);
    assert.equal(repeated.debuffs.filter(effect => effect.id === 'immobilization').length, 1);
    ctx.selectedTeam = [33, 1, null, null];
    const cryo = ctx.resolveSlotModeSkillData(repeated, {});
    assert.equal(cryo.debuffs.filter(effect => effect.id === 'cryo_infliction').length, 1);
    assert.equal(cryo.debuffs.some(effect => effect.id === 'heat_infliction'), false);
    assert.equal(cryo.debuffs.filter(effect => effect.id === 'artful_intent').length, 1);
    const effects = {};
    ctx.applySkillEffectsToComboMap(cryo, effects);
    assert.equal(effects.cryo_infliction, 1, 'Already-resolved simulation skills must not count twice');
});

test('Simulation retains one stack across the three Battle Skill stages', () => {
    for (const leader of ['heat', 'cryo']) {
        const {ctx, skill} = mount(leader);
        const events = ['brushwork', 'initial_stroke', 'final_stroke'].map((action, index) => ({
            kind: 'manual', time: index / 4, order: index, sourceOperatorId: 33, skillData: skill(action)
        }));
        const resolved = ctx.enrichSimulationSkillEventsWithEffects(events);
        assert.equal(resolved.length, 3);
        resolved.forEach(event => assert.equal(
            event.activeDebuffs.find(effect => effect.id === `${leader}_infliction`)?.currentStacks, 1));
    }
});
