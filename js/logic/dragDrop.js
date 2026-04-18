function cleanupDragArtifacts() {
    document.querySelectorAll(".drag-ghost, .sortable-fallback, .sortable-ghost, .sortable-chosen, .sortable-drag").forEach(el => {
        el.remove();
    });

    document.querySelectorAll(".rotation-slot").forEach(slot => {
        slot.classList.remove("drag-hover");
    });

    document.body.classList.remove("drag-in-progress");
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