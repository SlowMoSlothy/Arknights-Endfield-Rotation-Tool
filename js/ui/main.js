let rotation = [];
let selectedTeam = [null, null, null, null];
let activeSlotIndex = null;
let skillSourceSortables = [];
let rotationSortable = null;

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

function getSkillById(id) {
    for (const op of operators) {
        const skill = op.skills.find(s => s.id === id);
        if (skill) {
            return { ...skill, operator: op.name };
        }
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

    renderSkills();
    initSkillDragDrop();
    renderRotation();
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

                selectedTeam[activeSlotIndex] = op.id;
                saveTeam();
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

function buildRotationSequence() {
    const sequence = [];
    const chunkSize = 5;

    for (let i = 0; i < rotation.length; i += chunkSize) {
        const rowItems = rotation.slice(i, i + chunkSize);
        const isReverse = (i / chunkSize) % 2 === 1;
        const displayItems = isReverse ? [...rowItems].reverse() : rowItems;

        displayItems.forEach((entry, index) => {
            sequence.push({
                type: "skill",
                entry,
                rowIndex: Math.floor(i / chunkSize),
                reverse: isReverse
            });

            if (index < displayItems.length - 1) {
                sequence.push({
                    type: "arrow",
                    direction: isReverse ? "left" : "right"
                });
            }
        });

        if (i + chunkSize < rotation.length) {
            sequence.push({ type: "arrow", direction: "down" });
        }
    }

    return sequence;
}

function renderRotation() {
    const container = document.getElementById("rotationDropZone");
    if (!container) return;

    container.innerHTML = "";

    const sequence = buildRotationSequence();

    sequence.forEach(item => {
        if (item.type === "skill") {
            const skillData = getSkillById(item.entry.id);
            if (!skillData) return;

            const skillDiv = document.createElement("div");
            skillDiv.className = "skill rotation-skill";
            skillDiv.dataset.id = String(item.entry.id);
            skillDiv.dataset.uid = item.entry.uid;

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
                rotation = rotation.filter(s => s.uid !== item.entry.uid);
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

            container.appendChild(skillDiv);
        } else {
            const arrow = document.createElement("div");
            arrow.className = `rotation-arrow ${item.direction}`;
            arrow.textContent =
                item.direction === "right" ? "→" :
                    item.direction === "left" ? "←" : "↓";

            container.appendChild(arrow);
        }
    });

    initRotationDragDrop();
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
        rotation = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Rotation konnte nicht geladen werden:", error);
        rotation = [];
    }
}

function initSkillDragDrop() {
    skillSourceSortables.forEach(sortable => sortable.destroy());
    skillSourceSortables = [];

    const skillRows = document.querySelectorAll("#skillList .skill-row");

    onStart: (evt) => {
        setTimeout(() => {
            const ghost = document.querySelector(".drag-ghost img");
            const largeIcon = evt.item.dataset.largeIcon;

            if (ghost && largeIcon) {
                ghost.src = largeIcon;
            }
        }, 0);
    }
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
            removeCloneOnHide: true
        });
        skillSourceSortables.push(sortable);
    });
}

function initRotationDragDrop() {
    const rotationZone = document.getElementById("rotationDropZone");
    if (!rotationZone) return;

    if (rotationSortable) {
        rotationSortable.destroy();
    }

    rotationSortable = new Sortable(rotationZone, {
        group: {
            name: "skills",
            pull: false,
            put: true
        },
        animation: 150,
        draggable: ".rotation-skill",
        filter: ".rotation-arrow",
        forceFallback: true,
        fallbackOnBody: true,
        swapThreshold: 0.65,

        onAdd: (evt) => {
            const skillId = parseInt(evt.item.dataset.id, 10);
            evt.item.remove();

            if (!skillId) return;

            const dropIndex = getRotationIndexFromDomIndex(evt.newIndex);

            rotation.splice(dropIndex, 0, {
                uid: crypto.randomUUID(),
                id: skillId
            });

            saveRotation();
        },

        onUpdate: () => {
            const skillEls = Array.from(rotationZone.querySelectorAll(".rotation-skill"));

            const newRotation = skillEls
                .map(el => {
                    const uid = el.dataset.uid;
                    return rotation.find(r => r.uid === uid);
                })
                .filter(Boolean);

            rotation = newRotation;
            saveRotation();
        }
    });
}

function getRotationIndexFromDomIndex(domIndex) {
    const zone = document.getElementById("rotationDropZone");
    const children = Array.from(zone.children).slice(0, domIndex);
    return children.filter(el => el.classList.contains("rotation-skill")).length;
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

loadTeam();
loadRotation();
renderTeamSlots();
renderOperatorList();