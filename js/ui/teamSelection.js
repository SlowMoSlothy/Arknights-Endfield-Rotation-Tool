function backToSelection() {
    document.getElementById("selectionScreen").style.display = "block";
    document.getElementById("builderScreen").style.display = "none";
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
    initTapInput();
}
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

function getOperatorMainElement(op) {
    return op?.elementType || "neutral";
}

function renderOperatorList() {
    const grid = document.getElementById("operatorList");
    if (!grid) return;

    grid.innerHTML = "";

    operators.forEach(op => {
        const isSelected = selectedTeam.includes(op.id);
        const elementType = getOperatorMainElement(op);

        const card = document.createElement("div");
        card.className = `operator-card operator-element-${elementType}`;

        if (isSelected) {
            card.classList.add("disabled");
            card.classList.add("selected");
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
function highlightActiveSlot() {
    const slots = document.querySelectorAll(".team-slot");
    slots.forEach((slot, index) => {
        slot.style.borderColor = index === activeSlotIndex ? "#00ffcc" : "#555";
    });
}