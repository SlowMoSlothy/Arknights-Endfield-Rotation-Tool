window.exportImage = exportImage;
window.copyBuildShareCode = copyBuildShareCode;
window.copyBuildShareLink = copyBuildShareLink;
window.loadBuildShareCode = loadBuildShareCode;
window.confirmTeam = confirmTeam;
window.backToSelection = backToSelection;
window.clearRotation = clearRotation;
window.createNewRotation = createNewRotation;

const originalApplySkillDebuffsAndGetActiveState = window.applySkillDebuffsAndGetActiveState;

function setAppLoading(isLoading) {
    const loadingScreen = document.getElementById("appLoadingScreen");
    document.body.classList.toggle("app-loading", isLoading);

    if (!loadingScreen) return;

    if (isLoading) {
        loadingScreen.hidden = false;
        loadingScreen.classList.remove("is-hidden");
        loadingScreen.setAttribute("aria-busy", "true");
        return;
    }

    loadingScreen.classList.add("is-hidden");
    loadingScreen.setAttribute("aria-busy", "false");
    window.setTimeout(() => {
        loadingScreen.hidden = true;
    }, 260);
}

function getVisibleTransientDebuffsForCurrentSkill(skillData) {
    return (skillData?.debuffs || [])
        .filter(effect => effect.visible !== false && effect.persistsForCombo === false)
        .map(effect => {
            const key = normalizeDebuffKey({
                id: effect.appliesEffect || effect.id || effect.name
            });

            return {
                ...effect,
                id: key,
                appliesEffect: key,
                stackCount: 1,
                currentStacks: 1,
                stacks: 1
            };
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
    if (Array.isArray(skillData?.consumeDebuffs)) {
        skillData.consumeDebuffs.forEach(effectName => {
            const key = normalizeDebuffKey({ id: effectName });
            delete debuffStackState[key];
            delete debuffMetaState[key];
        });
    }

    const activeDebuffs = originalApplySkillDebuffsAndGetActiveState(
        skillData,
        activeBuffMetaState,
        activeBuffStackState,
        debuffStackState,
        debuffMetaState,
        buffStackState,
        buffMetaState
    );

    const transientDebuffs = getVisibleTransientDebuffsForCurrentSkill(skillData);
    const activeKeys = new Set(activeDebuffs.map(effect => normalizeDebuffKey(effect)));
    const missingTransientDebuffs = transientDebuffs.filter(effect => !activeKeys.has(normalizeDebuffKey(effect)));

    return [
        ...activeDebuffs,
        ...missingTransientDebuffs
    ];
};

async function initApp() {
    setAppLoading(true);

    try {
        if (typeof hydrateOperatorsFromSupabase === "function") {
            await hydrateOperatorsFromSupabase();
        }

        loadOperatorUltimateStates();
        loadTeam();
        loadRotation();
        loadBuildShareCodeFromUrl();

        renderTeamSlots();
        renderOperatorList();

        initUiSettings();
        initEnemyPanel();
        if (typeof initCommunityRotations === "function") initCommunityRotations();
        if (typeof initMyRotations === "function") initMyRotations();
        if (typeof initAdminPanel === "function") initAdminPanel();

        // Direkt den Rotation Builder anzeigen
        showBuilderScreen();
    } catch (error) {
        console.error("App initialization failed:", error);
    } finally {
        setAppLoading(false);
    }
}

initApp();
