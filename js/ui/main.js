let rotation = [];
let selectedTeam = [null, null, null, null];
let activeSlotIndex = null;

function renderTeamSlots() {
    const container = document.getElementById("teamSlots");
    container.innerHTML = "";

    selectedTeam.forEach((opId, index) => {

        const slot = document.createElement("div");
        slot.className = "team-slot";

        
        if (!opId) {
            slot.classList.add("empty");
        } else {
            const op = operators.find(o => o.id === opId);

            const img = document.createElement("img");
            img.src = op.icon;
            slot.appendChild(img);

            // ❌ entfernen
            const remove = document.createElement("div");
            remove.className = "slot-remove";
            remove.textContent = "×";

            remove.onclick = (e) => {
                e.stopPropagation();
                selectedTeam[index] = null;
                renderTeamSlots();
                renderOperatorList();
            };

            slot.appendChild(remove);
        }

        // Slot auswählen
        slot.onclick = () => {
            activeSlotIndex = index;
            highlightActiveSlot();
        };

        container.appendChild(slot);
    });
}
// Skill suchen
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

    if (saved) {
        const parsed = JSON.parse(saved);

        // sicherstellen, dass es 4 Slots gibt
        selectedTeam = [null, null, null, null];

        parsed.forEach((id, index) => {
            if (index < 4) {
                selectedTeam[index] = id;
            }
        });
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
}
function backToSelection() {
    document.getElementById("selectionScreen").style.display = "block";
    document.getElementById("builderScreen").style.display = "none";
}

function renderOperatorList() {
    const grid = document.getElementById("operatorList");
    grid.innerHTML = "";

    operators.forEach(op => {

        const isSelected = selectedTeam.includes(op.id);

        const card = document.createElement("div");
        card.className = "operator-card";

        if (isSelected) {
            card.classList.add("disabled");
            card.title="Bereits im Team"
        }

        const img = document.createElement("img");
        img.src = op.icon;

        const name = document.createElement("div");
        name.className = "operator-name";
        name.textContent = op.name;

        card.appendChild(img);
        card.appendChild(name);

        // ❌ Blockieren wenn schon im Team
        if (!isSelected) {
            card.onclick = () => {
                if (activeSlotIndex === null) return;

                selectedTeam[activeSlotIndex] = op.id;

                renderTeamSlots();
                renderOperatorList();
            };
        }

        grid.appendChild(card);
    });
}

// Skills anzeigen
function renderSkills() {
    const list = document.getElementById("skillList");
    list.innerHTML = "";

    const activeOperators = operators.filter(op =>
        selectedTeam.includes(op.id)
    );

    activeOperators.forEach(op => {

        // 🧑 Operator Kopf
        const opRow = document.createElement("div");
        opRow.className = "operator-row";

        const opImg = document.createElement("img");
        opImg.src = op.icon;
        opImg.className = "operator-icon";

        const opName = document.createElement("div");
        opName.textContent = op.name;

        opRow.appendChild(opImg);
        opRow.appendChild(opName);

        list.appendChild(opRow);

        // 🔹 Skills darunter
        const skillRow = document.createElement("div");
        skillRow.className = "skill-row";

        op.skills.forEach(skill => {

            const div = document.createElement("div");
            div.className = "skill skill-small";

            div.setAttribute("data-id", skill.id);

            const img = document.createElement("img");
            img.src = skill.iconSmall; // 🔥 kleines Icon

            div.appendChild(img);
            skillRow.appendChild(div);
        });

        list.appendChild(skillRow);
    });
}

// Grid rendern
function renderRotationGrid() {
    const container = document.getElementById("rotationDropZone");
    container.innerHTML = "";

    rotation.forEach(entry => {

        const skillData = getSkillById(entry.id);

        const skillDiv = document.createElement("div");
        skillDiv.className = "skill";
        skillDiv.dataset.id = entry.id;
        skillDiv.dataset.uid = entry.uid;

        const img = document.createElement("img");
        img.src = skillData.icon;

        skillDiv.appendChild(img);

        container.appendChild(skillDiv);
    });
}

// Drag & Drop
function initDragDrop() {
    new Sortable(document.getElementById("skillList"), {
        group: {
            name: "skills",
            pull: "clone",
            put: false
        },
        sort: false,

        draggable: ".skill-small",
        forceFallback: true,
    });

    new Sortable(document.getElementById("rotationDropZone"), {
        group: {
            name: "skills",
            pull: false,
            put: true
        },
        animation: 150,
        onMove: () => {
            console.log("MOVE OK");
        },
        onAdd: (evt) => {

            console.log("DROP:", evt.item);
            console.log("ID:", evt.item.dataset.id);
            const skillId = parseInt(evt.item.dataset.id);

            // 🔥 Wichtig: Element entfernen (weil clone!)
            evt.item.remove();

            // 👉 in Rotation einfügen
            rotation.push({
                uid: crypto.randomUUID(),
                id: skillId
            });

            saveRotation();
        },
        onUpdate: saveRotation
    });
}

// Speichern
function saveRotation() {
    const items = document.querySelectorAll("#rotationDropZone .skill");

    rotation = Array.from(items).map(el => ({
        uid: el.dataset.uid,
        id: parseInt(el.dataset.id)
    }));

    localStorage.setItem("rotation", JSON.stringify(rotation));
    renderRotationGrid();
}

// Laden
function loadRotation() {
    const saved = localStorage.getItem("rotation");
    if (!saved) return;

    rotation = JSON.parse(saved);
    renderRotationGrid();
}

// Export
function exportImage() {
    const element = document.getElementById("rotation");

    element.classList.add("export-mode");

    html2canvas(element, {
        backgroundColor: "#121212",
        scale: 2
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "rotation.png";
        link.href = canvas.toDataURL();
        link.click();

        element.classList.remove("export-mode");
    });
}

window.exportImage = exportImage;

// Init
loadTeam();
renderTeamSlots();
renderOperatorList();
initDragDrop();
loadRotation();