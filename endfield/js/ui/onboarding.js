const PLANNER_GUIDE_DISMISSED_KEY = "rotationforge.plannerGuide.dismissed.v1";
const PLANNER_GUIDE_BACKUP_KEY = "rotationforge.plannerGuide.backup.v1";
let plannerGuideInitialized = false;
let plannerGuideSkillSignature = "";
let plannerGuidePublishedSignature = "";

function getPlannerGuideProgress(team, entries, published = false) {
    const members = team.filter(id => id !== null && id !== undefined);
    const complete = [members.length > 0, entries.some(Boolean), published];
    return { members, complete, current: complete.indexOf(false) };
}

function getPlannerGuideShareSignature() {
    return JSON.stringify([selectedTeam, rotation, uiSettings.timelineMode]);
}

function markPlannerGuidePublished(signature = getPlannerGuideShareSignature()) {
    plannerGuidePublishedSignature = signature;
    refreshPlannerGuide();
}

function getPlannerGuideBattleSkill(operator) {
    return operator?.skills?.find(skill => String(skill.shortType).toLowerCase() === "bs"
        || String(skill.type).toLowerCase() === "battle skill");
}

// Resolve against the loaded catalogs rather than duplicating combat stats or numeric IDs.
function createPlannerGuideExample(catalog) {
    const slugs = ["endministrator", "chen_qianyu", "perlica", "wulfgard"];
    const members = slugs.map(slug => catalog.find(operator => operator.slug === slug && operator.isVisible !== false));
    if (members.some(operator => !operator || !getPlannerGuideBattleSkill(operator))) {
        throw new Error("The example's operators or Battle Skills are unavailable. You can still build your own team.");
    }
    return {
        team: members.map(operator => operator.id),
        rotation: members.map(operator => ({ id: getPlannerGuideBattleSkill(operator).id })),
        names: members.map(operator => operator.name)
    };
}

function readPlannerGuideValue(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

function setPlannerGuideStatus(message) {
    document.getElementById("plannerGuideStatus").textContent = message;
}

function setPlannerGuideExpanded(expanded) {
    document.getElementById("plannerGuide").hidden = !expanded;
    document.getElementById("plannerGuideToggle").setAttribute("aria-expanded", String(expanded));
    document.getElementById("plannerGuideBody").hidden = !expanded;
    try {
        if (expanded) localStorage.removeItem(PLANNER_GUIDE_DISMISSED_KEY);
        else localStorage.setItem(PLANNER_GUIDE_DISMISSED_KEY, "1");
    } catch { /* The guide also works without preference storage. */ }
}

function refreshPlannerGuide() {
    if (!plannerGuideInitialized) return;
    const progress = getPlannerGuideProgress(selectedTeam, rotation,
        plannerGuidePublishedSignature === getPlannerGuideShareSignature());
    const completed = progress.complete.filter(Boolean).length;
    document.getElementById("plannerGuideProgress").textContent = completed === 3
        ? "Ready — keep exploring your rotation" : `${completed} of 3 steps complete`;
    progress.complete.forEach((done, index) => {
        const step = document.getElementById(`plannerGuideStep${index + 1}`);
        step.querySelector(".planner-guide-number").textContent = done ? `${index + 1} · Complete` : `0${index + 1}`;
        if (progress.current === index) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
    });
    const skills = progress.members.map(id => operators.find(operator => operator.id === id))
        .map(operator => ({ operator, skill: getPlannerGuideBattleSkill(operator) })).filter(item => item.skill);
    const skillSelect = document.getElementById("plannerGuideSkill");
    const signature = JSON.stringify(skills.map(item => [item.skill.id, item.operator.name, item.skill.name]));
    if (signature !== plannerGuideSkillSignature) {
        const previous = skillSelect.value;
        skillSelect.replaceChildren();
        skills.forEach(({ operator, skill }) => {
            const option = document.createElement("option");
            option.value = String(skill.id);
            option.textContent = `${operator.name} — ${skill.name}`;
            skillSelect.appendChild(option);
        });
        if (skills.some(item => String(item.skill.id) === previous)) skillSelect.value = previous;
        plannerGuideSkillSignature = signature;
    }
    skillSelect.disabled = !progress.complete[0] || progress.complete[1] || skills.length === 0;
    const placeButton = document.getElementById("plannerGuidePlace");
    placeButton.disabled = !progress.complete[1] && (!progress.complete[0] || skills.length === 0);
    placeButton.textContent = progress.complete[1] ? "View timeline" : "Add first skill";
    document.getElementById("plannerGuideShare").disabled = !progress.complete[1]
        || (typeof isBuildSharePublishing === "function" && isBuildSharePublishing());
    document.getElementById("plannerGuideRestore").hidden = !readPlannerGuideValue(PLANNER_GUIDE_BACKUP_KEY);
}

function focusPlannerGuideTimeline() {
    const timeline = document.getElementById("rotationDropZone");
    timeline.setAttribute("tabindex", "-1");
    timeline.focus({ preventScroll: true });
    const publishActions = document.getElementById("rotationPublishActions");
    const destination = publishActions && !publishActions.hidden ? publishActions : timeline;
    destination.scrollIntoView({ block: "start", behavior: "auto" });
}

function placePlannerGuideFirstSkill() {
    if (rotation.some(Boolean)) { focusPlannerGuideTimeline(); return; }
    const progress = getPlannerGuideProgress(selectedTeam, rotation);
    if (!progress.complete[0]) return;
    const skillId = Number(document.getElementById("plannerGuideSkill").value);
    const skill = selectedTeam.map(id => operators.find(operator => operator.id === id))
        .map(getPlannerGuideBattleSkill).find(item => item?.id === skillId);
    if (!skill) return;
    if (isSimulationTimelineMode()) {
        rotation = [{ id: skill.id, uid: crypto.randomUUID(), time: 0 }];
        saveRotation();
        if (typeof refreshSkillsAfterRotationChange === "function") refreshSkillsAfterRotationChange();
    } else {
        placeSkillInSlot(0, skill.id);
    }
    setPlannerGuideStatus("Your first skill is on the timeline. Add more skills, rearrange their order, then publish your rotation.");
    if (typeof trackPlannerEvent === "function") trackPlannerEvent("first_skill_placed");
    focusPlannerGuideTimeline();
}

function capturePlannerGuideSetup() {
    return JSON.parse(JSON.stringify({
        version: 1, team: selectedTeam, rotation, loadouts: operatorLoadouts,
        ultimateStates: operatorUltimateStates, settings: uiSettings, enemyId: selectedEnemyId
    }));
}

function applyPlannerGuideSetup(setup) {
    selectedTeam = setup.team;
    rotation = setup.rotation;
    operatorLoadouts = setup.loadouts;
    operatorUltimateStates = setup.ultimateStates;
    uiSettings = setup.settings;
    activeSlotIndex = null;
    selectedSkill = null;
    setSelectedEnemy(setup.enemyId);
    saveTeam();
    saveOperatorLoadouts();
    saveUiSettings();
    applyUiSettings();
    saveRotation();
    renderTeamSlots();
    renderOperatorList();
    renderEnemySkillBar();
    showBuilderScreen();
}

function loadPlannerGuideExample() {
    let previous;
    let applied = false;
    try {
        const example = createPlannerGuideExample(operators);
        previous = capturePlannerGuideSetup();
        // Never replace an earlier backup when the example is loaded a second time.
        if (!localStorage.getItem(PLANNER_GUIDE_BACKUP_KEY)) {
            localStorage.setItem(PLANNER_GUIDE_BACKUP_KEY, JSON.stringify(previous));
        }
        const setup = {
            team: example.team,
            rotation: example.rotation.map(entry => ({ ...entry, uid: crypto.randomUUID() })),
            loadouts: previous.loadouts, ultimateStates: {}, enemyId: previous.enemyId,
            settings: { ...uiSettings, timelineMode: "slot" }
        };
        applied = true;
        applyPlannerGuideSetup(setup);
        if (typeof trackPlannerEvent === "function") trackPlannerEvent("example_loaded");
        setPlannerGuideStatus(`Example loaded: ${example.names.join(", ")}. Rearrange the four Battle Skills or add more skills, then share your version. Use “Restore my previous setup” to return to your draft.`);
    } catch (error) {
        if (applied && previous) {
            try { applyPlannerGuideSetup(previous); } catch { /* The persistent backup remains available. */ }
        }
        setPlannerGuideStatus(applied
            ? "The example could not be opened. Your previous setup is backed up; use Restore my previous setup if needed."
            : error.name === "QuotaExceededError" || error.name === "SecurityError"
                ? "The example needs local storage to protect your current setup. Enable browser storage or build your own team below."
                : error.message);
    }
    refreshPlannerGuide();
}

async function restorePlannerGuideSetup() {
    try {
        const setup = JSON.parse(localStorage.getItem(PLANNER_GUIDE_BACKUP_KEY));
        if (setup?.version !== 1 || !Array.isArray(setup.team) || !Array.isArray(setup.rotation)
            || !setup.loadouts || !setup.settings || !setup.ultimateStates || typeof setup.enemyId !== "string") {
            throw new Error("Invalid backup");
        }
        if (setup.settings.timelineMode === "simulation" && typeof ensureSimulationDataLoaded === "function") {
            await ensureSimulationDataLoaded();
        }
        applyPlannerGuideSetup(setup);
        localStorage.removeItem(PLANNER_GUIDE_BACKUP_KEY);
        setPlannerGuideExpanded(true);
        setPlannerGuideStatus("Your previous team, equipment, rotation and settings have been restored.");
    } catch {
        setPlannerGuideExpanded(true);
        setPlannerGuideStatus("The previous setup could not be restored. Its local backup has been kept.");
    }
    refreshPlannerGuide();
}

function initPlannerGuide() {
    if (plannerGuideInitialized || !document.getElementById("plannerGuide")) return;
    plannerGuideInitialized = true;
    document.getElementById("plannerGuideActions").hidden = false;
    const expanded = !readPlannerGuideValue(PLANNER_GUIDE_DISMISSED_KEY) && !rotation.some(Boolean);
    document.getElementById("plannerGuide").hidden = !expanded;
    document.getElementById("plannerGuideBody").hidden = !expanded;
    document.getElementById("plannerGuideToggle").setAttribute("aria-expanded", String(expanded));
    document.getElementById("plannerGuideToggle").addEventListener("click", () => {
        setPlannerGuideExpanded(document.getElementById("plannerGuideBody").hidden);
    });
    document.getElementById("plannerGuideDismiss").addEventListener("click", () => {
        setPlannerGuideExpanded(false);
        document.getElementById("plannerGuideToggle").focus();
    });
    document.getElementById("plannerGuideTeam").addEventListener("click", () => openTeamSelectionModal());
    document.getElementById("plannerGuideShare").addEventListener("click", () => copyBuildShareLink());
    document.getElementById("plannerGuidePlace").addEventListener("click", placePlannerGuideFirstSkill);
    document.getElementById("plannerGuideExample").addEventListener("click", loadPlannerGuideExample);
    document.getElementById("plannerGuideRestore").addEventListener("click", restorePlannerGuideSetup);
    refreshPlannerGuide();
}
