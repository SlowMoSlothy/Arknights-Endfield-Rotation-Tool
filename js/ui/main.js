let rotation = new Array(10).fill(null);
let selectedTeam = [null, null, null, null];
let activeSlotIndex = null;
let skillSourceSortables = [];
let slotSortables = [];

function renderTeamSlots() {
    const container = document.getElementById("teamSlots");
    if (!container) return;

    container.innerHTML = "";

    selectedTeam.forEach((opId, index) => {
        const slot = document.createElement("div");
        slot.className = "team-slot";

        if (!opId) {
            slot.classList.add("empty");
        } else {
            const op = operators.find(o => o.id === opId);
            if (op) {
                const img = document.createElement("img");
                img.src = op.icon;
                img.alt = op.name;
                slot.appendChild(img);

                const remove = document.createElement("div");
                remove.className = "slot-remove";
                remove.textContent = "×";

                remove.onclick = (e) => {
                    e.stopPropagation();
                    selectedTeam[index] = null;
                    saveTeam();
                    clearRotation();
                    renderTeamSlots();
                    renderOperatorList();
                };

                slot.appendChild(remove);
            }
        }

        slot.onclick = () => {
            activeSlotIndex = index;
            highlightActiveSlot();
        };

        container.appendChild(slot);
    });

    highlightActiveSlot();
}

function highlightActiveSlot() {
    const slots = document.querySelectorAll(".team-slot");
    slots.forEach((slot, index) => {
        slot.style.borderColor = index === activeSlotIndex ? "#00ffcc" : "#555";
    });
}

function renderSelectedOperators() {
    const container = document.getElementById("selectedOperators");
    if (!container) return;

    container.innerHTML = "";

    selectedTeam
        .filter(id => id !== null)
        .forEach(id => {
            const op = operators.find(o => o.id === id);
            if (!op) return;

            const item = document.createElement("div");
            item.className = "team-preview-operator";

            const img = document.createElement("img");
            img.src = op.icon;
            img.alt = op.name;

            const name = document.createElement("div");
            name.textContent = op.name;

            item.appendChild(img);
            item.appendChild(name);
            container.appendChild(item);
        });
}

function getSkillById(id) {
    for (const op of operators) {
        const skill = op.skills.find(s => s.id === id);
        if (skill) return { ...skill, operator: op.name };
    }
    return null;
}

function saveTeam() {
    localStorage.setItem("team", JSON.stringify(selectedTeam));
}

function loadTeam() {
    const saved = localStorage.getItem("team");
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        selectedTeam = [null, null, null, null];

        if (Array.isArray(parsed)) {
            parsed.slice(0, 4).forEach((id, index) => {
                selectedTeam[index] = id ?? null;
            });
        }
    } catch (error) {
        console.error("Team konnte nicht geladen werden:", error);
        selectedTeam = [null, null, null, null];
    }
}

function confirmTeam() {
    const team = selectedTeam.filter(x => x !== null);

    if (team.length === 0) {
        alert("Bitte mindestens einen Operator wählen!");
        return;
    }

    saveTeam();

    document.getElementById("selectionScreen").style.display = "none";
    document.getElementById("builderScreen").style.display = "block";

    renderSelectedOperators();
    renderSkills();
    renderRotation();
    initSkillDragDrop();
}

function backToSelection() {
    document.getElementById("selectionScreen").style.display = "block";
    document.getElementById("builderScreen").style.display = "none";
}

function renderOperatorList() {
    const grid = document.getElementById("operatorList");
    if (!grid) return;

    grid.innerHTML = "";

    operators.forEach(op => {
        const isSelected = selectedTeam.includes(op.id);

        const card = document.createElement("div");
        card.className = "operator-card";

        if (isSelected) {
            card.classList.add("disabled");
            card.title = "Bereits im Team";
        }

        const img = document.createElement("img");
        img.src = op.icon;
        img.alt = op.name;

        const name = document.createElement("div");
        name.className = "operator-name";
        name.textContent = op.name;

        card.appendChild(img);
        card.appendChild(name);

        if (!isSelected) {
            card.onclick = () => {
                if (activeSlotIndex === null) return;

                const oldOpId = selectedTeam[activeSlotIndex];
                selectedTeam[activeSlotIndex] = op.id;
                saveTeam();

                if (oldOpId !== op.id) {
                    clearRotation();
                }

                renderTeamSlots();
                renderOperatorList();
            };
        }

        grid.appendChild(card);
    });
}

function renderSkills() {
    const list = document.getElementById("skillList");
    if (!list) return;

    list.innerHTML = "";

    const activeOperators = operators.filter(op => selectedTeam.includes(op.id));

    activeOperators.forEach(op => {
        const opRow = document.createElement("div");
        opRow.className = "operator-row";

        const opImg = document.createElement("img");
        opImg.src = op.icon;
        opImg.alt = op.name;
        opImg.className = "operator-icon";

        const opName = document.createElement("div");
        opName.textContent = op.name;

        opRow.appendChild(opImg);
        opRow.appendChild(opName);
        list.appendChild(opRow);

        const skillRow = document.createElement("div");
        skillRow.className = "skill-row";

        op.skills.forEach(skill => {
            const div = document.createElement("div");
            div.className = "skill skill-small";
            div.dataset.id = String(skill.id);
            div.dataset.largeIcon = skill.icon;

            const img = document.createElement("img");
            img.src = skill.iconSmall || skill.icon;
            img.alt = skill.name;
            img.draggable = false;

            div.appendChild(img);
            skillRow.appendChild(div);
        });

        list.appendChild(skillRow);
    });
}

function getSnakeSlotMap() {
    return [
        { gridColumn: 1, gridRow: 1, arrow: { text: "→", gridColumn: 2, gridRow: 1 } },
        { gridColumn: 3, gridRow: 1, arrow: { text: "→", gridColumn: 4, gridRow: 1 } },
        { gridColumn: 5, gridRow: 1, arrow: { text: "→", gridColumn: 6, gridRow: 1 } },
        { gridColumn: 7, gridRow: 1, arrow: { text: "→", gridColumn: 8, gridRow: 1 } },
        { gridColumn: 9, gridRow: 1, arrow: { text: "↓", gridColumn: 9, gridRow: 2 } },

        { gridColumn: 9, gridRow: 3, arrow: { text: "←", gridColumn: 8, gridRow: 3 } },
        { gridColumn: 7, gridRow: 3, arrow: { text: "←", gridColumn: 6, gridRow: 3 } },
        { gridColumn: 5, gridRow: 3, arrow: { text: "←", gridColumn: 4, gridRow: 3 } },
        { gridColumn: 3, gridRow: 3, arrow: { text: "←", gridColumn: 2, gridRow: 3 } },
        { gridColumn: 1, gridRow: 3, arrow: null }
    ];
}

function renderRotation() {
    const container = document.getElementById("rotationDropZone");
    if (!container) return;

    container.innerHTML = "";

    const slotMap = getSnakeSlotMap();

    slotMap.forEach((slotInfo, index) => {
        const slot = document.createElement("div");
        slot.className = "rotation-slot";
        slot.dataset.index = index;
        slot.style.gridColumn = String(slotInfo.gridColumn);
        slot.style.gridRow = String(slotInfo.gridRow);

        const entry = rotation[index];

        if (entry) {
            const skillData = getSkillById(entry.id);

            if (skillData) {
                const skillDiv = document.createElement("div");
                skillDiv.className = "skill rotation-skill";
                skillDiv.dataset.id = String(entry.id);
                skillDiv.dataset.uid = entry.uid;

                const inner = document.createElement("div");
                inner.className = "skill-inner";

                const img = document.createElement("img");
                img.src = skillData.icon;
                img.alt = skillData.name;
                img.draggable = false;

                inner.appendChild(img);
                skillDiv.appendChild(inner);

                const removeBtn = document.createElement("div");
                removeBtn.className = "remove-btn";
                removeBtn.textContent = "×";
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    rotation[index] = null;
                    saveRotation();
                };

                skillDiv.appendChild(removeBtn);

                const tooltip = document.createElement("div");
                tooltip.className = "tooltip";
                tooltip.innerHTML = `
                    <b>${skillData.name}</b><br>
                    <i>${skillData.operator}</i><br>
                    CD: ${skillData.cooldown}s<br>
                    Energy: ${skillData.energy}
                `;
                skillDiv.appendChild(tooltip);

                slot.appendChild(skillDiv);
            }
        }

        container.appendChild(slot);

        if (slotInfo.arrow) {
            const arrow = document.createElement("div");
            arrow.className = "rotation-arrow";
            arrow.textContent = slotInfo.arrow.text;
            arrow.style.gridColumn = String(slotInfo.arrow.gridColumn);
            arrow.style.gridRow = String(slotInfo.arrow.gridRow);
            container.appendChild(arrow);
        }
    });

    initRotationDragDrop();
}

function clearRotation() {
    rotation = new Array(10).fill(null);
    localStorage.removeItem("rotation");
    renderRotation();
}

function saveRotation() {
    localStorage.setItem("rotation", JSON.stringify(rotation));
    renderRotation();
}

function loadRotation() {
    const saved = localStorage.getItem("rotation");
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            rotation = new Array(10).fill(null);
            parsed.slice(0, 10).forEach((entry, index) => {
                rotation[index] = entry ?? null;
            });
        }
    } catch (error) {
        console.error("Rotation konnte nicht geladen werden:", error);
        rotation = new Array(10).fill(null);
    }
}

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

            onAdd: (evt) => {
                const draggedUid = evt.item.dataset.uid;
                const draggedId = parseInt(evt.item.dataset.id, 10);

                evt.item.remove();

                if (draggedUid) {
                    const oldIndex = rotation.findIndex(item => item && item.uid === draggedUid);

                    if (oldIndex !== -1) {
                        const temp = rotation[index];
                        rotation[index] = rotation[oldIndex];
                        rotation[oldIndex] = temp;
                        saveRotation();
                        return;
                    }
                }

                if (!draggedId) return;

                rotation[index] = {
                    uid: crypto.randomUUID(),
                    id: draggedId
                };

                saveRotation();
            }
        });

        slotSortables.push(sortable);
    });
}

function exportImage() {
    const element = document.getElementById("rotation");
    if (!element) return;

    element.classList.add("export-mode");

    html2canvas(element, {
        backgroundColor: "#121212",
        scale: 2,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "rotation.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        element.classList.remove("export-mode");
    }).catch(error => {
        console.error("Export fehlgeschlagen:", error);
        element.classList.remove("export-mode");
    });
}

window.exportImage = exportImage;
window.confirmTeam = confirmTeam;
window.backToSelection = backToSelection;
window.clearRotation = clearRotation;

loadTeam();
loadRotation();
renderTeamSlots();
renderOperatorList();