let mobilePlacementSlotIndex = null;
let mobilePointerGesture = null;
let mobileUndoPending = null;
const mobileRotationUndo = [];
function isCompactMobilePlanner() { return typeof window !== "undefined" && window.innerWidth <= 700; }
function mobileRotationSnapshot() {
    return JSON.stringify({rotation, operatorUltimateStates});
}
function beginMobileRotationEdit() {
    if (isCompactMobilePlanner() && mobileUndoPending === null) mobileUndoPending = mobileRotationSnapshot();
}
function commitMobileRotationEdit() {
    if (mobileUndoPending !== null) {
        const after = mobileRotationSnapshot();
        if (after !== mobileUndoPending) {
            mobileRotationUndo.push({before: mobileUndoPending, after});
            if (mobileRotationUndo.length > 20) mobileRotationUndo.shift();
        }
        mobileUndoPending = null;
    }
    updateMobileUndoButton();
}
function updateMobileUndoButton() {
    const button = document.getElementById("mobileUndoBtn");
    if (button) button.disabled = !mobileRotationUndo.length
        || mobileRotationUndo.at(-1).after !== mobileRotationSnapshot();
}
function undoMobileRotationEdit() {
    const last = mobileRotationUndo.at(-1);
    if (!last || last.after !== mobileRotationSnapshot()) return;
    mobileRotationUndo.pop();
    const previous = JSON.parse(last.before);
    rotation = previous.rotation;
    operatorUltimateStates = previous.operatorUltimateStates;
    selectedSkill = null;
    mobilePlacementSlotIndex = null;
    localStorage.setItem("rotation", JSON.stringify(rotation));
    localStorage.setItem("operatorUltimateStates", JSON.stringify(operatorUltimateStates));
    renderRotation();
    refreshSkillsAfterRotationChange();
    updateMobileUndoButton();
    setMobilePlacementHint("Last change undone");
}
function setMobilePlacementHint(message) {
    const hint = document.getElementById("mobilePlacementHint");
    if (hint) hint.textContent = message;
}
function placeMobileTapSkill(action) {
    if (!getSkillById(action.id)) return;
    if (typeof isSimulationTimelineMode === "function" && isSimulationTimelineMode()) {
        const time = rotation.reduce((end, entry, index) => {
            if (!entry) return end;
            const skill = getSkillById(entry.id);
            const start = Number.isFinite(Number(entry.time)) ? Number(entry.time) : index;
            return Math.max(end, start + (Number(skill?.durationSeconds) || 1));
        }, 0);
        placeSkillAtSimulationTime(action.id, time);
    } else {
        const target = mobilePlacementSlotIndex;
        const index = target !== null && target >= 0 && target < rotation.length
            ? target : rotation.reduce((last, entry, i) => entry ? i + 1 : last, 0);
        placeSkillInSlot(index, action.id, target !== null || !rotation[index]);
    }
    mobilePlacementSlotIndex = null;
    selectedSkill = null;
    closeSlotMenu();
    updateSelectedUI();
    updateSelectedSlotsUI();
    const skill = getSkillById(action.id);
    setMobilePlacementHint(`${skill?.name || "Skill"} placed · Undo available`);
}

let selectedSkill = null;
let activeSlotMenuIndex = null;
let tapInputInitialized = false;
let activeTooltipUid = null;

function getSelectedTapActionKey(action) {
    if (!action) return "";
    if (action.actionType === BASIC_ATTACK_ACTION_TYPE) return `${BASIC_ATTACK_ACTION_TYPE}:${action.operatorId}`;
    return `skill:${action.id}`;
}

function getTapActionFromSkillElement(skillEl) {
    if (skillEl.dataset.actionType === BASIC_ATTACK_ACTION_TYPE) {
        const operatorId = parseInt(skillEl.dataset.operatorId, 10);
        if (Number.isNaN(operatorId) || !getBasicAttackByOperatorId(operatorId)) return null;
        return {
            actionType: BASIC_ATTACK_ACTION_TYPE,
            operatorId
        };
    }

    const id = parseInt(skillEl.dataset.id, 10);
    if (!id) return null;

    return {
        actionType: "skill",
        id
    };
}

function placeSelectedActionInSlot(index, replaceExisting = false) {
    if (!selectedSkill) return;

    if (selectedSkill.actionType === BASIC_ATTACK_ACTION_TYPE) {
        return;
    }

    placeSkillInSlot(index, selectedSkill.id, replaceExisting);
}

function getTapActionLane(action) {
    return action?.actionType === BASIC_ATTACK_ACTION_TYPE ? "batk" : "skill";
}

function canPlaceTapActionInSlot(action, slotEl) {
    const lane = slotEl?.dataset?.lane;
    return !lane || (lane === "skill" && getTapActionLane(action) === "skill");
}

function getTapSimulationActionLane(action) {
    if (!action || action.actionType === BASIC_ATTACK_ACTION_TYPE) return "batk";
    const skill = getSkillById(action.id);
    if (!skill) return "battle";
    return typeof getSimulationSkillLane === "function"
        ? getSimulationSkillLane(skill)
        : (String(skill.shortType || "").toLowerCase() === "cs" ? "combo" : "battle");
}

function canPlaceTapActionOnSimulationTrack(action, track) {
    return action?.actionType !== BASIC_ATTACK_ACTION_TYPE
        && track?.dataset?.skillLane === getTapSimulationActionLane(action);
}

function toggleMobileTooltip(skillEl) {
    const uid = skillEl.dataset.uid;

    document.querySelectorAll(".rotation-skill").forEach(el => {
        el.classList.remove("tooltip-open");
    });

    if (activeTooltipUid === uid) {
        activeTooltipUid = null;
        return;
    }

    skillEl.classList.add("tooltip-open");
    activeTooltipUid = uid;
}

function closeMobileTooltip() {
    activeTooltipUid = null;
    document.querySelectorAll(".rotation-skill").forEach(el => {
        el.classList.remove("tooltip-open");
    });
}

function initTapInput() {
    if (tapInputInitialized) return;
    tapInputInitialized = true;

    document.addEventListener("pointerdown", event => {
        mobilePointerGesture = {id: event.pointerId, x: event.clientX, y: event.clientY, moved: false};
    }, {passive: true});
    document.addEventListener("pointermove", event => {
        if (mobilePointerGesture?.id === event.pointerId
            && Math.hypot(event.clientX - mobilePointerGesture.x, event.clientY - mobilePointerGesture.y) > 8) mobilePointerGesture.moved = true;
    }, {passive: true});
    document.addEventListener("pointercancel", () => { mobilePointerGesture = {moved: true}; });
    document.addEventListener("pointerup", handleTapInput, { passive: false });
}

function handleTapInput(e) {
    const moved = mobilePointerGesture?.moved;
    mobilePointerGesture = null;
    if (isCompactMobilePlanner() && (moved || (typeof isDraggingSkill !== "undefined" && isDraggingSkill))) return;
    const basicPoint = e.target.closest(".rotation-basic-point");
    if (basicPoint) {
        e.preventDefault();
        e.stopPropagation();

        const value = parseInt(basicPoint.dataset.point, 10);
        if (Number.isNaN(value)) return;

        if (leaderAttackSelectionStep === "start") {
            leaderAttackStart = value;

            if (leaderAttackStart > leaderAttackEnd) {
                leaderAttackEnd = leaderAttackStart;
            }

            leaderAttackSelectionStep = "end";
        } else {
            leaderAttackEnd = value;

            if (leaderAttackStart > leaderAttackEnd) {
                const temp = leaderAttackStart;
                leaderAttackStart = leaderAttackEnd;
                leaderAttackEnd = temp;
            }

            leaderAttackSelectionStep = "start";
        }

        saveRotation();
        return;
    }

    const menuBtn = e.target.closest(".slot-action-btn");
    if (menuBtn) {
        e.preventDefault();
        e.stopPropagation();

        const action = menuBtn.dataset.action;
        const index = parseInt(menuBtn.dataset.index, 10);
        if (Number.isNaN(index)) return;

        if (action === "remove") {
            beginMobileRotationEdit();
            mobilePlacementSlotIndex = null;
            rotation[index] = null;
            compactRotation();
            if (typeof normalizeQingboMovesInRotation === "function") {
                normalizeQingboMovesInRotation();
            }
            trimTrailingEmptyRows();
            closeSlotMenu();
            saveRotation();
            if (typeof refreshSkillsAfterRotationChange === "function") {
                refreshSkillsAfterRotationChange();
            }
            return;
        }

        if (action === "replace") {
            if (selectedSkill) {
                placeSelectedActionInSlot(index, true);
                selectedSkill = null;
                closeSlotMenu();
                updateSelectedUI();
                updateSelectedSlotsUI();
            }
            return;
        }

        if (action === "cancel") {
            closeSlotMenu();
            return;
        }
    }

    if (e.target.closest(".rotation-slot-action, .remove-btn")) {
        return;
    }

    const mobileSlot = isCompactMobilePlanner() && e.target.closest(".rotation-slot");
    if (mobileSlot) {
        e.preventDefault();
        e.stopPropagation();
        mobilePlacementSlotIndex = Number(mobileSlot.dataset.index);
        selectedSkill = null;
        if (rotation[mobilePlacementSlotIndex]) openSlotMenu(mobilePlacementSlotIndex);
        else closeSlotMenu();
        updateSelectedSlotsUI();
        setMobilePlacementHint(`Slot ${mobilePlacementSlotIndex + 1}: tap a skill to ${rotation[mobilePlacementSlotIndex] ? "replace" : "insert"}`);
        return;
    }

    const rotationSkillEl = e.target.closest(".rotation-skill");
    if (rotationSkillEl && window.innerWidth <= 900) {
        e.preventDefault();
        e.stopPropagation();
        toggleMobileTooltip(rotationSkillEl);
        return;
    }

    if (rotationSkillEl) return;

    const skillEl = e.target.closest(".skill-small");
    if (skillEl) {
        e.preventDefault();
        e.stopPropagation();

        if (skillEl.dataset.longPressConsumed === "true") {
            delete skillEl.dataset.longPressConsumed;
            return;
        }
        if (e.target.closest(".qingbo-switch-btn, .operator-attribute-variant-btn")) return;
        const action = getTapActionFromSkillElement(skillEl);
        if (!action) return;
        if (isCompactMobilePlanner() && action.actionType !== BASIC_ATTACK_ACTION_TYPE) {
            placeMobileTapSkill(action);
            return;
        }
        if (action.actionType === BASIC_ATTACK_ACTION_TYPE) {
            selectedSkill = null;
            closeSlotMenu();
            updateSelectedUI();
            updateSelectedSlotsUI();
            return;
        }
        const actionKey = getSelectedTapActionKey(action);

        if (selectedSkill && getSelectedTapActionKey(selectedSkill) === actionKey) {
            selectedSkill = null;
            updateSelectedUI();
            updateSelectedSlotsUI();
            return;
        }

        selectedSkill = action;
        closeSlotMenu();
        updateSelectedUI();
        updateSelectedSlotsUI();
        return;
    }

    const simulationTrack = e.target.closest(".rotation-sim-skill-drop-track");
    if (simulationTrack && selectedSkill) {
        e.preventDefault();
        e.stopPropagation();
        if (!canPlaceTapActionOnSimulationTrack(selectedSkill, simulationTrack)) return;
        if (typeof placeSkillOnSimulationTrack === "function"
            && placeSkillOnSimulationTrack(selectedSkill.id, simulationTrack, e)) {
            selectedSkill = null;
            closeSlotMenu();
            updateSelectedUI();
            updateSelectedSlotsUI();
        }
        return;
    }

    const slotEl = e.target.closest(".rotation-slot");
    if (slotEl) {
        const index = parseInt(slotEl.dataset.index, 10);
        if (Number.isNaN(index)) return;

        const hasSkill = !!rotation[index];

        if (selectedSkill) {
            e.preventDefault();
            e.stopPropagation();

            if (!canPlaceTapActionInSlot(selectedSkill, slotEl)) {
                return;
            }

            placeSelectedActionInSlot(index, true);

            selectedSkill = null;
            closeSlotMenu();
            updateSelectedUI();
            updateSelectedSlotsUI();
            return;
        }

        if (hasSkill) {
            e.preventDefault();
            e.stopPropagation();

            if (activeSlotMenuIndex === index) {
                closeSlotMenu();
            } else {
                openSlotMenu(index);
            }
            return;
        }

        closeSlotMenu();
        return;
    }

    closeSlotMenu();
    closeMobileTooltip();
}

function placeSkillInSlot(index, skillId, replaceExisting = false) {
    const originalSkill = getSkillById(skillId);
    if (!originalSkill) return;
    beginMobileRotationEdit();

    let finalSkillId = skillId;
    if (!originalSkill?.togglesUltimateState) {
        finalSkillId = getMappedSkillIdForOperatorState(skillId);
    }

    if (replaceExisting) {
        rotation[index] = {
            uid: crypto.randomUUID(),
            id: finalSkillId
        };
    } else {
        rotation.splice(index, 0, {
            uid: crypto.randomUUID(),
            id: finalSkillId
        });
    }

    handleUltimateStateToggle(skillId);

    insertComboChain(finalSkillId, index);

    compactRotation();
    if (typeof normalizeQingboMovesInRotation === "function") {
        normalizeQingboMovesInRotation();
    }
    ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
    saveRotation();
    if (typeof refreshSkillsAfterRotationChange === "function") {
        refreshSkillsAfterRotationChange();
    }
}

function placeBasicAttackInSlot(index, operatorId, replaceExisting = false) {
    const basicAttackEntry = createBasicAttackRotationEntry(operatorId);
    if (!basicAttackEntry) return;

    if (replaceExisting) {
        rotation[index] = basicAttackEntry;
    } else {
        rotation.splice(index, 0, basicAttackEntry);
    }

    compactRotation();
    ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
    saveRotation();
}

function updateSelectedUI() {
    document.querySelectorAll(".skill-small").forEach(el => {
        const action = getTapActionFromSkillElement(el);
        el.classList.toggle("selected", !!selectedSkill && getSelectedTapActionKey(selectedSkill) === getSelectedTapActionKey(action));
    });
    const quickHint = document.querySelector(".rotation-quick-skills-heading span");
    if (quickHint) {
        const skill = selectedSkill?.id ? getSkillById(selectedSkill.id) : null;
        quickHint.textContent = skill
            ? `${skill.name}: click the ${getTapSimulationActionLane(selectedSkill)} lane`
            : "Select a skill or drag it to the timeline";
    }
}

function updateSelectedSlotsUI() {
    document.querySelectorAll(".rotation-slot").forEach(slot => {
        const canPlace = !!selectedSkill && canPlaceTapActionInSlot(selectedSkill, slot);
        slot.classList.toggle("tap-target", canPlace || (isCompactMobilePlanner() && Number(slot.dataset.index) === mobilePlacementSlotIndex));
        slot.classList.toggle("tap-target-blocked", !!selectedSkill && !canPlace);
    });
    const simulationSelected = !!selectedSkill && uiSettings?.timelineMode === "simulation";
    document.body.classList.toggle("simulation-tap-active", simulationSelected);
    document.querySelectorAll(".rotation-sim-skill-drop-track").forEach(track => {
        const canPlace = simulationSelected && canPlaceTapActionOnSimulationTrack(selectedSkill, track);
        track.classList.toggle("is-tap-target", canPlace);
        track.classList.toggle("is-invalid-tap-target", simulationSelected && !canPlace);
    });
}

function openSlotMenu(index) {
    activeSlotMenuIndex = index;

    document.querySelectorAll(".rotation-slot").forEach(slot => {
        slot.classList.remove("menu-open");
    });

    const slot = document.querySelector(`.rotation-slot[data-index="${index}"]`);
    if (!slot) return;

    slot.classList.add("menu-open");
    renderSlotActionMenu(slot, index);
}

function closeSlotMenu() {
    activeSlotMenuIndex = null;

    document.querySelectorAll(".rotation-slot").forEach(slot => {
        slot.classList.remove("menu-open");
    });

    document.querySelectorAll(".slot-action-menu").forEach(menu => menu.remove());
}

function renderSlotActionMenu(slot, index) {
    closeExistingMenuOnly();

    const menu = document.createElement("div");
    menu.className = "slot-action-menu";

    const replaceBtn = document.createElement("button");
    replaceBtn.className = "slot-action-btn";
    replaceBtn.type = "button";
    replaceBtn.dataset.action = "replace";
    replaceBtn.dataset.index = String(index);
    replaceBtn.textContent = selectedSkill ? "Replace" : "Select skill first";

    if (!selectedSkill) {
        replaceBtn.disabled = true;
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "slot-action-btn";
    removeBtn.type = "button";
    removeBtn.dataset.action = "remove";
    removeBtn.dataset.index = String(index);
    removeBtn.textContent = "Remove";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "slot-action-btn";
    cancelBtn.type = "button";
    cancelBtn.dataset.action = "cancel";
    cancelBtn.dataset.index = String(index);
    cancelBtn.textContent = "Cancel";

    menu.appendChild(replaceBtn);
    menu.appendChild(removeBtn);
    menu.appendChild(cancelBtn);

    slot.appendChild(menu);
}

function closeExistingMenuOnly() {
    document.querySelectorAll(".slot-action-menu").forEach(menu => menu.remove());
}
