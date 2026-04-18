function cleanupDragArtifacts() {
    document.querySelectorAll(".drag-ghost, .sortable-fallback, .sortable-ghost, .sortable-chosen, .sortable-drag").forEach(el => {
        el.remove();
    });

    document.querySelectorAll(".rotation-slot").forEach(slot => {
        slot.classList.remove("drag-hover");
    });

    document.body.classList.remove("drag-in-progress");
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

function collectSkillEffectsWithStacks(skillData) {
    const effectMap = {};

    if (!skillData) return effectMap;

    const allEffects = [
        ...(Array.isArray(skillData.debuffs) ? skillData.debuffs : []),
        ...(Array.isArray(skillData.buffs) ? skillData.buffs : [])
    ];

    allEffects.forEach(effect => {
        if (!effect.appliesEffect) return;

        const amount = effect.stackable ? (effect.stacksApplied || 1) : 1;

        if (!effectMap[effect.appliesEffect]) {
            effectMap[effect.appliesEffect] = 0;
        }

        effectMap[effect.appliesEffect] += amount;

        if (effect.maxStacks) {
            effectMap[effect.appliesEffect] = Math.min(
                effectMap[effect.appliesEffect],
                effect.maxStacks
            );
        }
    });

    return effectMap;
}
function getComboSkillsFromEffects(effectMap, sourceOperatorId) {
    const activeOperators = operators.filter(op => selectedTeam.includes(op.id));
    const result = [];
    const seen = new Set();

    for (const op of activeOperators) {
        if (op.id === sourceOperatorId) continue;

        for (const skill of op.skills) {
            const triggers = Array.isArray(skill.comboTriggers)
                ? skill.comboTriggers
                : (skill.comboTrigger ? [{ effect: skill.comboTrigger, minStacks: 1 }] : []);

            const matches = triggers.some(trigger => {
                if (typeof trigger === "string") {
                    return (effectMap[trigger] || 0) >= 1;
                }

                const effectName = trigger.effect;
                const minStacks = trigger.minStacks || 1;
                return (effectMap[effectName] || 0) >= minStacks;
            });

            if (matches && !seen.has(skill.id)) {
                result.push(skill);
                seen.add(skill.id);
            }
        }
    }

    return result;
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

        const effectMap = collectSkillEffectsWithStacks(currentSkillData);
        const comboSkills = getComboSkillsFromEffects(effectMap, sourceOperator.id);

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

function beginDrag() {
    isDraggingSkill = true;
    document.body.classList.add("drag-in-progress");
}

function endDrag() {
    isDraggingSkill = false;

    requestAnimationFrame(() => {
        cleanupDragArtifacts();
    });
}

function initSkillDragDrop() {
    skillSourceSortables.forEach(sortable => sortable.destroy());
    skillSourceSortables = [];

    cleanupDragArtifacts();

    const skillRows = document.querySelectorAll("#skillList .skill-row");

    skillRows.forEach((row) => {
        const sortable = new Sortable(row, {
            group: {
                name: "skills",
                pull: "clone",
                put: false
            },
            sort: false,
            draggable: ".skill-small",
            forceFallback: true,
            fallbackOnBody: true,
            fallbackClass: "drag-ghost",
            removeCloneOnHide: true,

            delay: 120,
            delayOnTouchOnly: true,
            touchStartThreshold: 4,
            fallbackTolerance: 8,

            onStart: () => {
                beginDrag();

                setTimeout(() => {
                    const ghost = document.querySelector(".drag-ghost, .sortable-fallback");
                    if (ghost) {
                        ghost.classList.add("neutral-drag-preview");
                    }
                }, 0);
            },

            onEnd: () => {
                endDrag();
            },

            onUnchoose: () => {
                cleanupDragArtifacts();
            }
        });

        skillSourceSortables.push(sortable);
    });
}

function initRotationDragDrop() {
    slotSortables.forEach(sortable => sortable.destroy());
    slotSortables = [];

    cleanupDragArtifacts();

    const slots = document.querySelectorAll(".rotation-slot");

    slots.forEach((slot, index) => {
        const sortable = new Sortable(slot, {
            group: {
                name: "skills",
                pull: true,
                put: true
            },
            sort: false,
            draggable: ".rotation-skill",
            filter: ".remove-btn",
            preventOnFilter: true,
            forceFallback: true,
            fallbackOnBody: true,
            removeCloneOnHide: true,

            delay: 120,
            delayOnTouchOnly: true,
            touchStartThreshold: 4,
            fallbackTolerance: 8,

            onStart: () => {
                beginDrag();
                
                setTimeout(() => {
                    const ghost = document.querySelector(".drag-ghost, .sortable-fallback");
                    if (ghost) {
                        ghost.classList.add("neutral-drag-preview");
                    }
                }, 0);
            },

            onFilter: (evt) => {
    const removeBtn = evt.target.closest(".remove-btn");
    if (!removeBtn) return;
    
    const removeIndex = parseInt(removeBtn.dataset.index, 10);
    if (Number.isNaN(removeIndex)) return;
    
    rotation[removeIndex] = null;
    
    compactRotation();
    
    // 🔥 WICHTIG: immer mindestens 1 freien Slot behalten
    ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
    
    saveRotation();
},

            onMove: (evt) => {
                document.querySelectorAll(".rotation-slot").forEach(s => s.classList.remove("drag-hover"));

                const targetSlot = evt.to?.classList?.contains("rotation-slot")
                    ? evt.to
                    : evt.to?.closest?.(".rotation-slot");

                if (targetSlot) {
                    targetSlot.classList.add("drag-hover");
                }

                return true;
            },

            onEnd: () => {
                endDrag();
            },

            onUnchoose: () => {
                cleanupDragArtifacts();
            },

            onAdd: (evt) => {
                const draggedUid = evt.item.dataset.uid;
                const draggedId = parseInt(evt.item.dataset.id, 10);

                evt.item.remove();

                if (draggedUid) {
                    const oldIndex = rotation.findIndex(item => item && item.uid === draggedUid);

                    if (oldIndex !== -1) {
                        const movedItem = rotation[oldIndex];
                        rotation.splice(oldIndex, 1);

                        let insertIndex = index;
                        if (oldIndex < index) {
                            insertIndex--;
                        }

                        rotation.splice(insertIndex, 0, movedItem);

                        compactRotation();
                        ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
                        saveRotation();
                        return;
                    }
                }

                if (!draggedId) return;

                rotation[index] = {
                    uid: crypto.randomUUID(),
                    id: draggedId
                };

                insertComboChain(draggedId, index);

                compactRotation();
                ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
                saveRotation();
            }
        });

        slotSortables.push(sortable);
    });
}