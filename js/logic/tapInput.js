let selectedSkill = null;
let activeSlotMenuIndex = null;
let tapInputInitialized = false;
let activeTooltipUid = null;


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

function collectSkillEffects(skillData) {
    if (!skillData) return [];

    const debuffEffects = Array.isArray(skillData.debuffs)
        ? skillData.debuffs.map(d => d.appliesEffect).filter(Boolean)
        : [];

    const buffEffects = Array.isArray(skillData.buffs)
        ? skillData.buffs.map(b => b.appliesEffect).filter(Boolean)
        : [];

    return [...new Set([...debuffEffects, ...buffEffects])];
}

function insertComboChain(startSkillId, startIndex) {
    const queue = [{ skillId: startSkillId, insertAfterIndex: startIndex }];
    const alreadyInsertedIds = new Set([startSkillId]);

    const MAX_CHAIN_LENGTH = 20;
    let chainCount = 0;

    while (queue.length > 0) {
        if (chainCount >= MAX_CHAIN_LENGTH) {
            console.warn("Combo chain stopped: maximum chain length reached.");
            break;
        }

        const current = queue.shift();
        const currentSkillData = getSkillById(current.skillId);
        const sourceOperator = getOperatorBySkillId(current.skillId);

        if (!currentSkillData || !sourceOperator) continue;

        const effects = collectSkillEffects(currentSkillData);
        if (effects.length === 0) continue;

        const comboSkills = getComboSkillsFromEffects(effects, sourceOperator.id);

        let insertOffset = 1;

        comboSkills.forEach(comboSkill => {
            if (alreadyInsertedIds.has(comboSkill.id)) return;

            const comboIndex = current.insertAfterIndex + insertOffset;

            rotation.splice(comboIndex, 0, {
                uid: crypto.randomUUID(),
                id: comboSkill.id,
                autoInserted: true
            });

            alreadyInsertedIds.add(comboSkill.id);

            queue.push({
                skillId: comboSkill.id,
                insertAfterIndex: comboIndex
            });

            insertOffset++;
            chainCount++;
        });
    }
}

function handleTapInput(e) {
    if (isDraggingSkill) {
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
                placeSkillInSlot(index, selectedSkill.id, true);
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

        const id = parseInt(skillEl.dataset.id, 10);
        if (!id) return;

        if (selectedSkill && selectedSkill.id === id) {
            selectedSkill = null;
            updateSelectedUI();
            updateSelectedSlotsUI();
            return;
        }

        selectedSkill = { id };
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

            placeSkillInSlot(index, selectedSkill.id, true);
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
    if (replaceExisting) {
        rotation[index] = {
            uid: crypto.randomUUID(),
            id: skillId
        };
    } else {
        rotation.splice(index, 0, {
            uid: crypto.randomUUID(),
            id: skillId
        });
    }

    insertComboChain(skillId, index);

    compactRotation();
    ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
    saveRotation();
}

function updateSelectedUI() {
    document.querySelectorAll(".skill-small").forEach(el => {
        const id = parseInt(el.dataset.id, 10);
        el.classList.toggle("selected", !!selectedSkill && selectedSkill.id === id);
    });
}

function updateSelectedSlotsUI() {
    document.querySelectorAll(".rotation-slot").forEach(slot => {
        slot.classList.toggle("tap-target", !!selectedSkill);
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