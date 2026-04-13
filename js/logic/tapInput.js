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

function handleTapInput(e) {
    // Menübuttons
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

    // Remove-Button normal ignorieren, das erledigt Sortable
    if (e.target.closest(".remove-btn")) {
        return;
    }

    // Skill auswählen
    const rotationSkillEl = e.target.closest(".rotation-skill");
if (rotationSkillEl && window.innerWidth <= 900) {
    // Remove-Button weiterhin normal behandeln
    if (e.target.closest(".remove-btn")) {
        return;
    }

    e.preventDefault();
    e.stopPropagation();

    toggleMobileTooltip(rotationSkillEl);
    return;
}
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

    // Slot antippen
    const slotEl = e.target.closest(".rotation-slot");
    if (slotEl) {
        const index = parseInt(slotEl.dataset.index, 10);
        if (Number.isNaN(index)) return;

        const hasSkill = !!rotation[index];

        // Wenn Skill ausgewählt ist -> direkt einsetzen/ersetzen
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

        // Ohne ausgewählten Skill: Menü nur bei belegtem Slot öffnen
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

    // Klick außerhalb schließt Menü
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

    const insertedSkillData = getSkillById(skillId);
    const sourceOperator = getOperatorBySkillId(skillId);

    if (
        insertedSkillData &&
        insertedSkillData.debuffs &&
        insertedSkillData.debuffs.length > 0 &&
        sourceOperator
    ) {
        const effects = insertedSkillData.debuffs
            .map(d => d.appliesEffect)
            .filter(Boolean);

        const comboSkills = getComboSkillsFromEffects(effects, sourceOperator.id);

        let insertOffset = 1;

        comboSkills.forEach(comboSkill => {
            const comboIndex = index + insertOffset;

            const alreadyThere =
                rotation[comboIndex] &&
                rotation[comboIndex].id === comboSkill.id;

            if (!alreadyThere) {
                rotation.splice(comboIndex, 0, {
                    uid: crypto.randomUUID(),
                    id: comboSkill.id,
                    autoInserted: true
                });
                insertOffset++;
            }
        });
    }

    compactRotation();
    ensureExtraSlots();
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