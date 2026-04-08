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
            forceFallback: true,
            fallbackOnBody: true,

            onMove: () => {
                document.querySelectorAll(".rotation-slot").forEach(s => s.classList.remove("drag-hover"));
                slot.classList.add("drag-hover");
                return true;
            },

            onEnd: () => {
                document.querySelectorAll(".rotation-slot").forEach(s => s.classList.remove("drag-hover"));
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
                        ensureExtraSlots();
                        saveRotation();
                        return;
                    }
                }
                
                if (!draggedId) return;

                rotation[index] = {
                    uid: crypto.randomUUID(),
                    id: draggedId
                };

                const insertedSkillData = getSkillById(draggedId);
                const sourceOperator = getOperatorBySkillId(draggedId);

                if (insertedSkillData && insertedSkillData.appliesEffect && sourceOperator) {
                    const comboSkill = getComboSkillFromSelectedTeam(
                        insertedSkillData.appliesEffect,
                        sourceOperator.id
                    );

                    if (comboSkill) {
                        const comboIndex = index + 1;

                        // nicht doppelt einfügen
                        if (!rotation[comboIndex] || rotation[comboIndex].id !== comboSkill.id) {
                            rotation.splice(comboIndex, 0, {
                                uid: crypto.randomUUID(),
                                id: comboSkill.id,
                                autoInserted: true
                            });
                        }
                    }
                }

                ensureExtraSlots();
                saveRotation();
            }
        });

        slotSortables.push(sortable);
    });
}