const originalApplySkillDebuffsAndGetActiveState = window.applySkillDebuffsAndGetActiveState;

function consumeVisibleRotationDebuffsForSkill(skillData, debuffStackState, debuffMetaState) {
    if (!Array.isArray(skillData?.consumeDebuffs)) return;

    skillData.consumeDebuffs.forEach(effectName => {
        const key = normalizeDebuffKey({ id: effectName });
        delete debuffStackState[key];
        delete debuffMetaState[key];
    });
}

window.applySkillDebuffsAndGetActiveState = function patchedApplySkillDebuffsAndGetActiveState(
    skillData,
    activeBuffMetaState,
    activeBuffStackState,
    debuffStackState,
    debuffMetaState,
    buffStackState,
    buffMetaState
) {
    consumeVisibleRotationDebuffsForSkill(skillData, debuffStackState, debuffMetaState);

    return originalApplySkillDebuffsAndGetActiveState(
        skillData,
        activeBuffMetaState,
        activeBuffStackState,
        debuffStackState,
        debuffMetaState,
        buffStackState,
        buffMetaState
    );
};
