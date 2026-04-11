let selectedSkill = null;
let tapInputInitialized = false;

function initTapInput() {
    if (tapInputInitialized) return;
    tapInputInitialized = true;

    document.addEventListener("pointerup", handleTapInput, { passive: false });
}

function handleTapInput(e) {
    // Remove-Button nicht über Tap-to-place behandeln
    if (e.target.closest(".remove-btn")) {
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
        updateSelectedUI();
        updateSelectedSlotsUI();
        return;
    }

    const slotEl = e.target.closest(".rotation-slot");
    if (slotEl) {
        if (!selectedSkill) return;

        e.preventDefault();
        e.stopPropagation();

        const index = parseInt(slotEl.dataset.index, 10);
        if (Number.isNaN(index)) return;

        placeSkillInSlot(index, selectedSkill.id);

        selectedSkill = null;
        updateSelectedUI();
        updateSelectedSlotsUI();
    }
}

function placeSkillInSlot(index, skillId) {
    rotation[index] = {
        uid: crypto.randomUUID(),
        id: skillId
    };

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