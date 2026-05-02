window.exportImage = exportImage;
window.confirmTeam = confirmTeam;
window.backToSelection = backToSelection;
window.clearRotation = clearRotation;

const originalApplySkillDebuffsAndGetActiveState = window.applySkillDebuffsAndGetActiveState;

window.applySkillDebuffsAndGetActiveState = function patchedApplySkillDebuffsAndGetActiveState(
    skillData,
    activeBuffMetaState,
    activeBuffStackState,
    debuffStackState,
    debuffMetaState,
    buffStackState,
    buffMetaState
) {
    if (Array.isArray(skillData?.consumeDebuffs)) {
        skillData.consumeDebuffs.forEach(effectName => {
            const key = normalizeDebuffKey({ id: effectName });
            delete debuffStackState[key];
            delete debuffMetaState[key];
        });
    }

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

loadOperatorUltimateStates();
loadTeam();
loadRotation();
renderTeamSlots();
renderOperatorList();

initUiSettings();
initEnemyPanel();