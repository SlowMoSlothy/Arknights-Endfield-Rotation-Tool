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

    document.querySelectorAll(".rotation-sim-skill-drop-track").forEach(track => {
        track.classList.remove("is-drop-target");
    });

    cleanupSimulationDropGuide();
    removeSimulationDropGuideListeners();
    stopSimulationDragAutoScroll();
    document.body.classList.remove("drag-in-progress");
}

function beginDrag() {
    isDraggingSkill = true;
    document.body.classList.add("drag-in-progress");
    addSimulationDropGuideListeners();
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

    const actionType = sourceEl?.dataset?.actionType || previewEl.dataset.actionType;
    if (actionType === BASIC_ATTACK_ACTION_TYPE) {
        const operatorId = parseInt(sourceEl?.dataset?.operatorId || previewEl.dataset.operatorId, 10);
        const attackData = Number.isNaN(operatorId) ? null : getBasicAttackByOperatorId(operatorId);
        if (!attackData || previewEl.querySelector(".basic-attack-icon")) return;

        previewEl.innerHTML = "";
        previewEl.dataset.actionType = BASIC_ATTACK_ACTION_TYPE;
        previewEl.dataset.operatorId = String(operatorId);
        if (sourceEl?.dataset?.uid) previewEl.dataset.uid = sourceEl.dataset.uid;
        previewEl.appendChild(createBasicAttackIcon(attackData, {
            size: "small",
            extraClasses: ["drag-basic-attack-icon"]
        }));
        return;
    }

    const skillId = parseInt(sourceEl?.dataset?.id || previewEl.dataset.id, 10);
    const skillData = Number.isNaN(skillId) ? null : getSkillById(skillId);
    if (!skillData || previewEl.querySelector(".ef-skill-icon")) return;

    previewEl.innerHTML = "";
    previewEl.dataset.id = String(skillId);
    previewEl.dataset.skillType = skillData.shortType || getShortSkillType(skillData.type);
    previewEl.dataset.skillName = skillData.name || "Skill";
    if (sourceEl?.dataset?.uid) previewEl.dataset.uid = sourceEl.dataset.uid;
    previewEl.appendChild(createSkillIcon(skillData, { size: "small", useSmallIcon: true }));
    const typeLabel = document.createElement("span");
    typeLabel.className = "neutral-drag-preview-type";
    typeLabel.textContent = previewEl.dataset.skillType;
    previewEl.appendChild(typeLabel);
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

function getDraggedActionLane(item) {
    return item?.dataset?.actionType === BASIC_ATTACK_ACTION_TYPE ? "batk" : "skill";
}

function getSimulationDropTime(track, event) {
    const rect = track.getBoundingClientRect();
    const clientX = event?.clientX ?? rect.left;
    const pixelsPerSecond = typeof getSimulationPixelsPerSecond === "function"
        ? getSimulationPixelsPerSecond()
        : SIMULATION_PIXELS_PER_SECOND;
    const rawSeconds = (clientX - rect.left + track.scrollLeft) / pixelsPerSecond;
    return typeof roundSimulationTime === "function"
        ? roundSimulationTime(rawSeconds)
        : Math.max(0, Math.round(rawSeconds * 10) / 10);
}

function cleanupSimulationDropGuide() {
    document.querySelectorAll(".rotation-sim-drop-guide").forEach(guide => guide.remove());
    document.querySelectorAll(".rotation-sim-skill-drop-track").forEach(track => {
        track.classList.remove("is-drop-target");
    });
}

let simulationDragAutoScrollState = null;

function stopSimulationDragAutoScroll() {
    if (simulationDragAutoScrollState?.frameId) {
        cancelAnimationFrame(simulationDragAutoScrollState.frameId);
    }
    simulationDragAutoScrollState = null;
}

function updateSimulationDragAutoScroll(event) {
    const scrollArea = document.querySelector(".rotation-sim-track-scroll");
    if (!scrollArea || !isDraggingSkill) {
        stopSimulationDragAutoScroll();
        return;
    }

    const rect = scrollArea.getBoundingClientRect();
    const edgeSize = Math.min(96, Math.max(48, rect.width * 0.12));
    const maxSpeed = 18;
    let velocity = 0;

    if (event.clientX < rect.left + edgeSize) {
        velocity = -maxSpeed * (1 - Math.max(0, event.clientX - rect.left) / edgeSize);
    } else if (event.clientX > rect.right - edgeSize) {
        velocity = maxSpeed * (1 - Math.max(0, rect.right - event.clientX) / edgeSize);
    }

    if (Math.abs(velocity) < 0.2) {
        stopSimulationDragAutoScroll();
        return;
    }

    if (!simulationDragAutoScrollState) {
        simulationDragAutoScrollState = {
            scrollArea,
            velocity,
            frameId: null
        };
    } else {
        simulationDragAutoScrollState.scrollArea = scrollArea;
        simulationDragAutoScrollState.velocity = velocity;
    }

    const tick = () => {
        if (!simulationDragAutoScrollState || !isDraggingSkill) {
            stopSimulationDragAutoScroll();
            return;
        }

        const { scrollArea: activeScrollArea, velocity: activeVelocity } = simulationDragAutoScrollState;
        const before = activeScrollArea.scrollLeft;
        activeScrollArea.scrollLeft = Math.max(0, before + activeVelocity);

        if (activeScrollArea.scrollLeft === before) {
            stopSimulationDragAutoScroll();
            return;
        }

        simulationDragAutoScrollState.frameId = requestAnimationFrame(tick);
    };

    if (!simulationDragAutoScrollState.frameId) {
        simulationDragAutoScrollState.frameId = requestAnimationFrame(tick);
    }
}

function getSimulationDropTrackFromPoint(event) {
    const clientX = event?.clientX;
    const clientY = event?.clientY;
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;

    const elements = typeof document.elementsFromPoint === "function"
        ? document.elementsFromPoint(clientX, clientY)
        : [document.elementFromPoint(clientX, clientY)].filter(Boolean);

    return elements
        .map(element => element.closest?.(".rotation-sim-skill-drop-track"))
        .find(Boolean) || null;
}

function updateSimulationDropGuide(track, event) {
    if (track?.dataset?.skillLane !== "battle") {
        cleanupSimulationDropGuide();
        return;
    }

    const body = track.closest(".rotation-sim-body");
    if (!body) return;

    document.querySelectorAll(".rotation-sim-skill-drop-track").forEach(candidate => {
        candidate.classList.toggle("is-drop-target", candidate === track);
    });

    let guide = body.querySelector(".rotation-sim-drop-guide");
    if (!guide) {
        guide = document.createElement("div");
        guide.className = "rotation-sim-drag-guide rotation-sim-drop-guide";
        body.appendChild(guide);
    }

    const time = getSimulationDropTime(track, event);
    const pixelsPerSecond = typeof getSimulationPixelsPerSecond === "function"
        ? getSimulationPixelsPerSecond()
        : SIMULATION_PIXELS_PER_SECOND;
    if (typeof updateSimulationDragGuide === "function") {
        updateSimulationDragGuide(guide, time, pixelsPerSecond);
    } else {
        guide.style.left = `${time * pixelsPerSecond}px`;
        guide.dataset.time = `${time}s`;
    }
}

function updateSimulationDropGuideFromEvent(event) {
    if (!isDraggingSkill) return;
    updateSimulationDragAutoScroll(event);
    const track = getSimulationDropTrackFromPoint(event);
    if (!track) {
        cleanupSimulationDropGuide();
        return;
    }
    updateSimulationDropGuide(track, event);
}

function addSimulationDropGuideListeners() {
    removeSimulationDropGuideListeners();
    document.addEventListener("pointermove", updateSimulationDropGuideFromEvent, true);
    document.addEventListener("mousemove", updateSimulationDropGuideFromEvent, true);
    document.addEventListener("dragover", updateSimulationDropGuideFromEvent, true);
}

function removeSimulationDropGuideListeners() {
    document.removeEventListener("pointermove", updateSimulationDropGuideFromEvent, true);
    document.removeEventListener("mousemove", updateSimulationDropGuideFromEvent, true);
    document.removeEventListener("dragover", updateSimulationDropGuideFromEvent, true);
}

function canPlaceDraggedActionInSlot(item, slot) {
    const lane = slot?.dataset?.lane;
    return !lane || (lane === "skill" && getDraggedActionLane(item) === "skill");
}

function createSourceSortable(target) {
    return new Sortable(target, {
        group: {
            name: "skills",
            pull: "clone",
            put: false
        },
        sort: false,
        draggable: ".skill-small:not(.basic-attack-small)",
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

    const legacySimulationTrack = document.getElementById("rotationSimulationSkillTrack");
    const simulationTracks = Array.from(document.querySelectorAll(".rotation-sim-skill-drop-track"));
    if (legacySimulationTrack && !simulationTracks.includes(legacySimulationTrack)) {
        simulationTracks.push(legacySimulationTrack);
    }

    if (simulationTracks.length) {
        simulationTracks.forEach(simulationTrack => {
            const sortable = new Sortable(simulationTrack, {
                group: {
                    name: "skills",
                    pull: false,
                    put: true
                },
                sort: false,
                draggable: ".rotation-sim-sortable-source-only",
                filter: ".remove-btn, .rotation-sim-nudge",
                preventOnFilter: true,
                forceFallback: true,
                fallbackOnBody: true,
                onStart: handleDragStart,
                onFilter: (evt) => {
                    const removeBtn = evt.target.closest(".remove-btn");
                    if (!removeBtn) return;
                    const removeIndex = parseInt(removeBtn.dataset.index, 10);
                    if (Number.isNaN(removeIndex)) return;
                    if (typeof removeRotationEntryAtIndex === "function") {
                        removeRotationEntryAtIndex(removeIndex);
                    }
                },
                onEnd: endDrag,
                onUnchoose: cleanupDragArtifacts,
                onMove: (evt) => {
                    updateSimulationDropGuide(evt.to || simulationTrack, evt.originalEvent);
                    return true;
                },
                onAdd: (evt) => {
                    const draggedId = parseInt(evt.item.dataset.id, 10);
                    evt.item.remove();
                    if (!draggedId) return;

                    const originalSkill = getSkillById(draggedId);
                    let finalSkillId = draggedId;
                    if (!originalSkill?.togglesUltimateState) {
                        finalSkillId = getMappedSkillIdForOperatorState(draggedId);
                    }

                    const time = getSimulationDropTime(simulationTrack, evt.originalEvent);

                    rotation.push({
                        uid: crypto.randomUUID(),
                        id: finalSkillId,
                        time
                    });
                    const newIndex = rotation.length - 1;
                    if (typeof getSnappedSimulationEntryTime === "function") {
                        rotation[newIndex].time = getSnappedSimulationEntryTime(newIndex, time);
                    }
                    handleUltimateStateToggle(draggedId);
                    compactRotation();
                    if (typeof normalizeQingboMovesInRotation === "function") {
                        normalizeQingboMovesInRotation();
                    }
                    saveRotation();
                    if (typeof refreshSkillsAfterRotationChange === "function") {
                        refreshSkillsAfterRotationChange();
                    }
                }
            });
            slotSortables.push(sortable);
        });
        return;
    }

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
                return canPlaceDraggedActionInSlot(evt.dragged, targetSlot);
            },
            onEnd: endDrag,
            onUnchoose: cleanupDragArtifacts,
            onAdd: (evt) => {
                if (!canPlaceDraggedActionInSlot(evt.item, slot)) {
                    evt.item.remove();
                    renderRotation();
                    return;
                }

                const draggedUid = evt.item.dataset.uid;
                const draggedActionType = evt.item.dataset.actionType;
                const draggedOperatorId = parseInt(evt.item.dataset.operatorId, 10);
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
                if (draggedActionType === BASIC_ATTACK_ACTION_TYPE) {
                    const basicAttackEntry = Number.isNaN(draggedOperatorId)
                        ? null
                        : createBasicAttackRotationEntry(draggedOperatorId);
                    if (!basicAttackEntry) return;

                    rotation[index] = basicAttackEntry;
                    compactRotation();
                    ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
                    saveRotation();
                    return;
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
