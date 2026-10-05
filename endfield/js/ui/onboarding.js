const PLANNER_GUIDE_DISMISSED_KEY = "rotationforge.plannerGuide.dismissed.v1";
const PLANNER_GUIDE_BACKUP_KEY = "rotationforge.plannerGuide.backup.v1";
let plannerGuideInitialized = false;
let plannerGuideSkillSignature = "";

function getPlannerGuideProgress(team, loadouts, entries) {
    const members = team.filter(id => id !== null && id !== undefined);
    const missingWeapons = members.filter(id => !loadouts[String(id)]?.weapon?.key);
    const complete = [members.length > 0, members.length > 0 && missingWeapons.length === 0, entries.some(Boolean)];
    return { members, missingWeapons, complete, current: complete.indexOf(false) };
}

function getPlannerGuideBattleSkill(operator) {
    return operator?.skills?.find(skill => String(skill.shortType).toLowerCase() === "bs"
        || String(skill.type).toLowerCase() === "battle skill");
}

// Resolve against the loaded catalogs rather than duplicating combat stats or numeric IDs.
function createPlannerGuideExample(catalog, weaponCatalog, gearCatalog) {
    const slugs = ["endministrator", "chen_qianyu", "perlica", "wulfgard"];
    const members = slugs.map(slug => catalog.find(operator => operator.slug === slug && operator.isVisible !== false));
    if (members.some(operator => !operator || !getPlannerGuideBattleSkill(operator))) {
        throw new Error("The example's operators or Battle Skills are unavailable. You can still build your own team.");
    }
    const loadouts = {};
    members.forEach(operator => {
        const compatible = weaponCatalog.filter(weapon => isWeaponCompatibleWithOperator(weapon, operator) && Number(weapon.baseAtk) > 0);
        compatible.sort((a, b) => Number(a.rarity || 0) - Number(b.rarity || 0) || String(a.key).localeCompare(String(b.key)));
        const weapon = compatible[0];
        if (!weapon) throw new Error("The example's weapons are unavailable. Please try again after reloading the planner.");
        const loadout = { operatorPotential: 0, weapon: { key: weapon.key, potential: 1, essence: { primary: 0, secondary: 0, skill: 0 } } };
        for (const [slot, category] of [["gloves", "gloves"], ["armor", "armor"], ["kit1", "kits"], ["kit2", "kits"]]) {
            const gear = [...(gearCatalog[category] || [])].sort((a, b) =>
                Number(a.rarity || 0) - Number(b.rarity || 0)
                || Number(b.mainStat === operator.mainAttribute) - Number(a.mainStat === operator.mainAttribute)
                || String(a.key).localeCompare(String(b.key)))[0];
            if (!gear) throw new Error("The example's gear is unavailable. You can still configure equipment yourself.");
            loadout[slot] = { key: gear.key };
        }
        loadouts[String(operator.id)] = loadout;
    });
    return {
        team: members.map(operator => operator.id),
        loadouts,
        // Space the four Battle Skills far enough apart for normal SP regeneration.
        rotation: members.map((operator, index) => ({ id: getPlannerGuideBattleSkill(operator).id, time: index * 15 })),
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
    const progress = getPlannerGuideProgress(selectedTeam, operatorLoadouts, rotation);
    const completed = progress.complete.filter(Boolean).length;
    document.getElementById("plannerGuideProgress").textContent = completed === 3
        ? "Ready — keep exploring your rotation" : `${completed} of 3 steps complete`;
    progress.complete.forEach((done, index) => {
        const step = document.getElementById(`plannerGuideStep${index + 1}`);
        step.querySelector(".planner-guide-number").textContent = done ? `${index + 1} · Complete` : `0${index + 1}`;
        if (progress.current === index) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
    });
    const equipmentButton = document.getElementById("plannerGuideEquipment");
    equipmentButton.disabled = !progress.complete[0];
    const nextOperator = operators.find(operator => operator.id === progress.missingWeapons[0]);
    equipmentButton.textContent = nextOperator ? `Equip ${nextOperator.name}`
        : progress.complete[0] ? "Review equipment" : "Equip a weapon";
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
    skillSelect.disabled = !progress.complete[1] || progress.complete[2] || skills.length === 0;
    const placeButton = document.getElementById("plannerGuidePlace");
    placeButton.disabled = !progress.complete[2] && (!progress.complete[1] || skills.length === 0);
    placeButton.textContent = progress.complete[2] ? "View timeline" : "Add first skill";
    document.getElementById("plannerGuideRestore").hidden = !readPlannerGuideValue(PLANNER_GUIDE_BACKUP_KEY);
}

function focusPlannerGuideTimeline() {
    const timeline = document.getElementById("rotationDropZone");
    timeline.setAttribute("tabindex", "-1");
    timeline.focus({ preventScroll: true });
    timeline.scrollIntoView({ block: "start", behavior: "auto" });
}

function openPlannerGuideEquipment() {
    const progress = getPlannerGuideProgress(selectedTeam, operatorLoadouts, rotation);
    const id = progress.missingWeapons[0] ?? progress.members[0];
    if (id === undefined) return;
    // Loadouts are only supported in Simulation mode in the existing planner.
    if (!isSimulationTimelineMode()) setTimelineMode("simulation");
    openOperatorLoadoutModal(id);
}

function placePlannerGuideFirstSkill() {
    if (rotation.some(Boolean)) { focusPlannerGuideTimeline(); return; }
    const progress = getPlannerGuideProgress(selectedTeam, operatorLoadouts, rotation);
    if (!progress.complete[1]) return;
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
    setPlannerGuideStatus("Your first skill is on the timeline. Add another skill, inspect an event, or try a different timing.");
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
        const example = createPlannerGuideExample(operators, weapons, GEAR_DATABASE);
        const dummy = enemies.find(enemy => enemy.id === resolveEnemyId("training_dummy"));
        if (!dummy) throw new Error("The training enemy is unavailable. You can still build your own rotation.");
        previous = capturePlannerGuideSetup();
        // Never replace an earlier backup when the example is loaded a second time.
        if (!localStorage.getItem(PLANNER_GUIDE_BACKUP_KEY)) {
            localStorage.setItem(PLANNER_GUIDE_BACKUP_KEY, JSON.stringify(previous));
        }
        const loadouts = normalizeOperatorLoadouts(example.loadouts);
        const setup = {
            team: example.team,
            rotation: example.rotation.map(entry => ({ ...entry, uid: crypto.randomUUID() })),
            loadouts: { ...operatorLoadouts, ...loadouts }, ultimateStates: {}, enemyId: dummy.id,
            settings: { ...uiSettings, timelineMode: "simulation", simulationSpPerSecond: 8,
                simulationDurationSeconds: 60, simulationDamageMode: "expected", simulationTimelineZoom: 1,
                simulationFocusMode: false, simulationQuickSkillsCollapsed: false, simulationFocusControlsCollapsed: false }
        };
        applied = true;
        applyPlannerGuideSetup(setup);
        setPlannerGuideStatus(`Example loaded: ${example.names.join(", ")}. Four equipped operators, one Battle Skill each at 0s, 15s, 30s and 45s. Inspect the events and experiment with their timing. Automatic combos may wait for their cooldown. Use “Restore my previous setup” to return to your draft.`);
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

function restorePlannerGuideSetup() {
    try {
        const setup = JSON.parse(localStorage.getItem(PLANNER_GUIDE_BACKUP_KEY));
        if (setup?.version !== 1 || !Array.isArray(setup.team) || !Array.isArray(setup.rotation)
            || !setup.loadouts || !setup.settings || !setup.ultimateStates || typeof setup.enemyId !== "string") {
            throw new Error("Invalid backup");
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
    document.getElementById("plannerGuideEquipment").addEventListener("click", openPlannerGuideEquipment);
    document.getElementById("plannerGuidePlace").addEventListener("click", placePlannerGuideFirstSkill);
    document.getElementById("plannerGuideExample").addEventListener("click", loadPlannerGuideExample);
    document.getElementById("plannerGuideRestore").addEventListener("click", restorePlannerGuideSetup);
    refreshPlannerGuide();
}
