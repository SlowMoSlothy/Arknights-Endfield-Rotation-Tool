let selectedSkill = null;

function initTapInput() {
    initSkillTap();
    initSlotTap();
}

function initSkillTap() {
    document.querySelectorAll(".skill-small").forEach(el => {
        el.addEventListener("click", () => {
            const id = parseInt(el.dataset.id, 10);

            if (!id) return;

            // gleiche Auswahl -> abwählen
            if (selectedSkill && selectedSkill.id === id) {
                selectedSkill = null;
                updateSelectedUI();
                return;
            }

            selectedSkill = {
                id: id
            };

            updateSelectedUI();
        });
    });
}

function initSlotTap() {
    document.querySelectorAll(".rotation-slot").forEach(slot => {
        slot.addEventListener("click", () => {
            if (!selectedSkill) return;

            const index = parseInt(slot.dataset.index, 10);
            if (Number.isNaN(index)) return;

            placeSkillInSlot(index, selectedSkill.id);

            selectedSkill = null;
            updateSelectedUI();
        });
    });
}

function placeSkillInSlot(index, skillId) {
    rotation[index] = {
        uid: crypto.randomUUID(),
        id: skillId
    };

    const skillData = getSkillById(skillId);
    const sourceOperator = getOperatorBySkillId(skillId);

    // Combo Logik (deine bestehende)
    if (
        skillData &&
        skillData.debuffs &&
        skillData.debuffs.length > 0 &&
        sourceOperator
    ) {
        const effects = skillData.debuffs
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

        if (selectedSkill && selectedSkill.id === id) {
            el.classList.add("selected");
        } else {
            el.classList.remove("selected");
        }
    });
}