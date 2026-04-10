function initSkillDragDrop() {
    skillSourceSortables.forEach(sortable => sortable.destroy());
    skillSourceSortables = [];

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

            onStart: (evt) => {
                setTimeout(() => {
                    const ghost = document.querySelector(".drag-ghost img");
                    const largeIcon = evt.item.dataset.largeIcon;

                    if (ghost && largeIcon) {
                        ghost.src = largeIcon;
                    }
                }, 0);
            }
        });

        skillSourceSortables.push(sortable);
    });
}

function initRotationDragDrop() {
    slotSortables.forEach(sortable => sortable.destroy());
    slotSortables = [];

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

            delay: 120,
            delayOnTouchOnly: true,
            touchStartThreshold: 4,

            onFilter: (evt) => {
                const removeBtn = evt.target.closest(".remove-btn");
                if (!removeBtn) return;

                const removeIndex = parseInt(removeBtn.dataset.index, 10);
                if (Number.isNaN(removeIndex)) return;

                rotation[removeIndex] = null;
                compactRotation();
                trimTrailingEmptyRows();
                saveRotation();
            },

            onMove: () => {
                document
                    .querySelectorAll(".rotation-slot")
                    .forEach(s => s.classList.remove("drag-hover"));

                slot.classList.add("drag-hover");
                return true;
            },

            onEnd: () => {
                document
                    .querySelectorAll(".rotation-slot")
                    .forEach(s => s.classList.remove("drag-hover"));
            },

            onAdd: (evt) => {
                const draggedUid = evt.item.dataset.uid;
                const draggedId = parseInt(evt.item.dataset.id, 10);

                evt.item.remove();

                // Bereits existierenden Skill innerhalb der Rotation verschieben
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
                        ensureExtraSlots();
                        saveRotation();
                        return;
                    }
                }

                // Neuer Skill aus der Skill-Liste
                if (!draggedId) return;

                rotation[index] = {
                    uid: crypto.randomUUID(),
                    id: draggedId
                };

                const insertedSkillData = getSkillById(draggedId);
                const sourceOperator = getOperatorBySkillId(draggedId);

                // Combo-Skills anhand aller Debuff-Effekte eines Skills
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

                ensureExtraSlots();
                saveRotation();
            }
        });

        slotSortables.push(sortable);
    });
}