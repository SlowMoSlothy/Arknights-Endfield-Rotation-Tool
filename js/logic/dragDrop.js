function cleanupDragArtifacts() {
    document.querySelectorAll(".drag-ghost, .sortable-fallback, .neutral-drag-preview").forEach(el => {
        el.remove();
    });

    document.querySelectorAll(".sortable-ghost, .sortable-chosen, .sortable-drag").forEach(el => {
        el.classList.remove("sortable-ghost", "sortable-chosen", "sortable-drag", "neutral-drag-preview");
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

    setTimeout(cleanupDragArtifacts, 80);
}

function hydrateDragPreview(previewEl, sourceEl) {
    if (!previewEl) return;

    previewEl.classList.add("neutral-drag-preview");

    const skillId = parseInt(sourceEl?.dataset?.id || previewEl.dataset.id, 10);
    const skillData = Number.isNaN(skillId) ? null : getSkillById(skillId);
    if (!skillData || previewEl.querySelector(".ef-skill-icon")) return;

    previewEl.innerHTML = "";
    previewEl.dataset.id = String(skillId);
    if (sourceEl?.dataset?.uid) previewEl.dataset.uid = sourceEl.dataset.uid;
    previewEl.appendChild(createSkillIcon(skillData, { size: "small", useSmallIcon: true }));
}

function scheduleDragPreviewHydration(sourceEl, attempts = 8) {
    const hydrate = (remaining) => {
        const ghost = document.querySelector(".drag-ghost, .sortable-fallback");
        if (ghost) {
            hydrateDragPreview(ghost, sourceEl);
            return;
        }

        if (remaining > 0) {
            requestAnimationFrame(() => hydrate(remaining - 1));
        }
    };

    requestAnimationFrame(() => hydrate(attempts));
}

function handleDragStart(evt) {
    beginDrag();
    scheduleDragPreviewHydration(evt.item);
}

function createSourceSortable(target) {
    return new Sortable(target, {
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
        onStart: handleDragStart,
        onEnd: endDrag,
        onUnchoose: cleanupDragArtifacts
    });
}

function initSkillDragDrop() {
    skillSourceSortables.forEach(sortable => sortable.destroy());
    skillSourceSortables = [];

    cleanupDragArtifacts();

    document.querySelectorAll("#skillList .skill-row").forEach(row => {
        skillSourceSortables.push(createSourceSortable(row));
    });
}

function initEnemySkillDragDrop() {
    const enemyBar = document.getElementById("enemySkillBar");
    if (!enemyBar) return;

    if (enemySkillSourceSortable) {
        enemySkillSourceSortable.destroy();
    }

    enemySkillSourceSortable = createSourceSortable(enemyBar);
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
            onStart: handleDragStart,
            onFilter: (evt) => {
                const removeBtn = evt.target.closest(".remove-btn");
                if (!removeBtn) return;
                const removeIndex = parseInt(removeBtn.dataset.index, 10);
                if (Number.isNaN(removeIndex)) return;
                rotation[removeIndex] = null;
                compactRotation();
                if (typeof normalizeQingboMovesInRotation === "function") {
                    normalizeQingboMovesInRotation();
                }
                ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
                saveRotation();
                if (typeof refreshSkillsAfterRotationChange === "function") {
                    refreshSkillsAfterRotationChange();
                }
            },
            onMove: (evt) => {
                document.querySelectorAll(".rotation-slot").forEach(s => s.classList.remove("drag-hover"));
                const targetSlot = evt.to?.classList?.contains("rotation-slot") ? evt.to : evt.to?.closest?.(".rotation-slot");
                if (targetSlot) targetSlot.classList.add("drag-hover");
                return true;
            },
            onEnd: endDrag,
            onUnchoose: cleanupDragArtifacts,
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
                        if (oldIndex < index) insertIndex--;
                        rotation.splice(insertIndex, 0, movedItem);
                        compactRotation();
                        if (typeof normalizeQingboMovesInRotation === "function") {
                            normalizeQingboMovesInRotation();
                        }
                        ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
                        saveRotation();
                        if (typeof refreshSkillsAfterRotationChange === "function") {
                            refreshSkillsAfterRotationChange();
                        }
                        return;
                    }
                }
                if (!draggedId) return;
                const originalSkill = getSkillById(draggedId);
                let finalSkillId = draggedId;
                if (!originalSkill?.togglesUltimateState) {
                    finalSkillId = getMappedSkillIdForOperatorState(draggedId);
                }
                rotation[index] = { uid: crypto.randomUUID(), id: finalSkillId };
                handleUltimateStateToggle(draggedId);
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
        });
        slotSortables.push(sortable);
    });
}
