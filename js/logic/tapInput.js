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

    document.addEventListener("pointerup", handleTapInput, { passive: false });
}

function handleTapInput(e) {
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
            rotation[index] = null;
            compactRotation();
            trimTrailingEmptyRows();
            closeSlotMenu();
            saveRotation();
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

    if (e.target.closest(".remove-btn")) {
        return;
    }

    const rotationSkillEl = e.target.closest(".rotation-skill");
    if (rotationSkillEl && window.innerWidth <= 900) {
        e.preventDefault();
        e.stopPropagation();
        toggleMobileTooltip(rotationSkillEl);
        return;
    }

    const skillEl = e.target.closest(".skill-small");
    if (skillEl) {
        e.preventDefault();
        e.stopPropagation();

        const action = getTapActionFromSkillElement(skillEl);
        if (!action) return;
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
    ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
    saveRotation();
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
}

function updateSelectedSlotsUI() {
    document.querySelectorAll(".rotation-slot").forEach(slot => {
        const canPlace = !!selectedSkill && canPlaceTapActionInSlot(selectedSkill, slot);
        slot.classList.toggle("tap-target", canPlace);
        slot.classList.toggle("tap-target-blocked", !!selectedSkill && !canPlace);
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
