window.exportImage = exportImage;
window.copyBuildShareCode = copyBuildShareCode;
window.copyBuildShareLink = copyBuildShareLink;
window.loadBuildShareCode = loadBuildShareCode;
window.confirmTeam = confirmTeam;
window.backToSelection = backToSelection;
window.clearRotation = clearRotation;
window.createNewRotation = createNewRotation;

const originalApplySkillDebuffsAndGetActiveState = window.applySkillDebuffsAndGetActiveState;
const rotationQuickSaveState = {
    destination: "my",
    submitting: false
};

function closeRotationSaveMenu() {
    const host = document.getElementById("saveRotationMenuHost");
    const menu = document.getElementById("rotationSaveMenu");
    const button = document.getElementById("saveRotationMenuBtn");

    if (menu) menu.hidden = true;
    if (host) host.classList.remove("is-menu-open");
    if (button) button.setAttribute("aria-expanded", "false");
}

function toggleRotationSaveMenu(event) {
    event?.stopPropagation();

    if (typeof hasCreatedRotation === "function" && !hasCreatedRotation()) return;

    const host = document.getElementById("saveRotationMenuHost");
    const menu = document.getElementById("rotationSaveMenu");
    const button = document.getElementById("saveRotationMenuBtn");
    if (!menu || !button) return;

    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    button.setAttribute("aria-expanded", willOpen ? "true" : "false");
    if (host) host.classList.toggle("is-menu-open", willOpen);
}

function saveRotationInMyRotations() {
    closeRotationSaveMenu();
    openRotationQuickSaveModal("my");
}

function saveRotationInCommunity() {
    closeRotationSaveMenu();
    openRotationQuickSaveModal("community");
}

function getRotationQuickSaveConfig(destination) {
    if (destination === "community") {
        return {
            destination: "community",
            title: "Submit to Community",
            intro: "Submit this rotation for Community review. It becomes public after Admin approval.",
            button: "Submit for Review",
            saving: "Submitting rotation...",
            success: "Submitted for review. It will appear after approval."
        };
    }

    return {
        destination: "my",
        title: "Save to My Rotations",
        intro: "Save this rotation privately so you can load or submit it later.",
        button: "Save Rotation",
        saving: "Saving rotation...",
        success: "Rotation saved in My Rotations."
    };
}

function setRotationQuickSaveStatus(text, className = "") {
    const status = document.getElementById("rotationQuickSaveStatus");
    if (!status) return;

    status.className = `my-rotations-status${className ? ` ${className}` : ""}`;
    status.textContent = text;
}

function promptRotationSaveSignIn() {
    closeRotationQuickSaveModal();
    alert("Please sign in to save rotations.");
    if (typeof openMyRotationsModal === "function") {
        openMyRotationsModal({ mode: "signIn" });
    }
}

function openRotationQuickSaveModal(destination = "my") {
    if (typeof hasCreatedRotation === "function" && !hasCreatedRotation()) return;

    if (typeof isMyAccountSignedIn !== "function" || !isMyAccountSignedIn()) {
        promptRotationSaveSignIn();
        return;
    }

    const config = getRotationQuickSaveConfig(destination);
    rotationQuickSaveState.destination = config.destination;

    const modal = document.getElementById("rotationQuickSaveModal");
    const title = document.getElementById("rotationQuickSaveTitle");
    const intro = document.getElementById("rotationQuickSaveIntro");
    const titleInput = document.getElementById("rotationQuickSaveTitleInput");
    const descriptionInput = document.getElementById("rotationQuickSaveDescriptionInput");
    const submitButton = document.getElementById("submitRotationQuickSaveBtn");
    if (!modal) return;

    if (title) title.textContent = config.title;
    if (intro) intro.textContent = config.intro;
    if (titleInput) titleInput.value = "";
    if (descriptionInput) descriptionInput.value = "";
    if (submitButton) submitButton.textContent = config.button;
    setRotationQuickSaveStatus("");

    modal.classList.add("open");
    window.setTimeout(() => titleInput?.focus(), 0);
}

function closeRotationQuickSaveModal() {
    const modal = document.getElementById("rotationQuickSaveModal");
    if (!modal) return;

    modal.classList.remove("open");
}

async function submitRotationQuickSave(event) {
    event.preventDefault();
    if (rotationQuickSaveState.submitting) return;

    if (typeof isMyAccountSignedIn !== "function" || !isMyAccountSignedIn()) {
        promptRotationSaveSignIn();
        return;
    }

    const config = getRotationQuickSaveConfig(rotationQuickSaveState.destination);
    const values = {
        title: document.getElementById("rotationQuickSaveTitleInput")?.value || "",
        description: document.getElementById("rotationQuickSaveDescriptionInput")?.value || ""
    };
    const submitButton = document.getElementById("submitRotationQuickSaveBtn");

    rotationQuickSaveState.submitting = true;
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = config.saving;
    }
    setRotationQuickSaveStatus(config.saving);

    try {
        if (config.destination === "community") {
            if (typeof submitCurrentRotationToCommunity !== "function") {
                throw new Error("Community Rotations is not available right now.");
            }
            await submitCurrentRotationToCommunity(values);
        } else {
            if (typeof saveCurrentRotationToMyRotations !== "function") {
                throw new Error("My Rotations is not available right now.");
            }
            await saveCurrentRotationToMyRotations(values);
        }

        setRotationQuickSaveStatus(config.success, "is-success");
        window.setTimeout(closeRotationQuickSaveModal, 650);
    } catch (error) {
        console.error("Quick rotation save failed:", error);
        setRotationQuickSaveStatus(error.message || "This rotation could not be saved.", "is-error");
    } finally {
        rotationQuickSaveState.submitting = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = config.button;
        }
    }
}

function initRotationSaveMenu() {
    document.addEventListener("click", event => {
        const host = document.getElementById("saveRotationMenuHost");
        if (!host || host.contains(event.target)) return;
        closeRotationSaveMenu();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeRotationSaveMenu();
            closeRotationQuickSaveModal();
        }
    });

    const quickSaveForm = document.getElementById("rotationQuickSaveForm");
    const quickSaveCancel = document.getElementById("cancelRotationQuickSaveBtn");
    const quickSaveClose = document.getElementById("closeRotationQuickSaveModalBtn");
    const quickSaveModal = document.getElementById("rotationQuickSaveModal");

    if (quickSaveForm) quickSaveForm.addEventListener("submit", submitRotationQuickSave);
    if (quickSaveCancel) quickSaveCancel.addEventListener("click", closeRotationQuickSaveModal);
    if (quickSaveClose) quickSaveClose.addEventListener("click", closeRotationQuickSaveModal);
    if (quickSaveModal) {
        quickSaveModal.addEventListener("click", event => {
            if (event.target === quickSaveModal) closeRotationQuickSaveModal();
        });
    }
}

window.closeRotationSaveMenu = closeRotationSaveMenu;
window.toggleRotationSaveMenu = toggleRotationSaveMenu;
window.saveRotationInMyRotations = saveRotationInMyRotations;
window.saveRotationInCommunity = saveRotationInCommunity;
window.openRotationQuickSaveModal = openRotationQuickSaveModal;
window.closeRotationQuickSaveModal = closeRotationQuickSaveModal;

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
        initRotationSaveMenu();
        if (typeof initCommunityRotations === "function") initCommunityRotations();
        if (typeof initOperatorGallery === "function") initOperatorGallery();
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
