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

            let isArrowUsed = false;

            // obere Reihe: 0 -> 1 -> 2 -> 3 -> 4
            if (index >= 0 && index <= 3) {
                isArrowUsed = rotation[index] !== null && rotation[index + 1] !== null;
            }

            // Pfeil nach unten: 4 -> 5
            if (index === 4) {
                isArrowUsed = rotation[4] !== null && rotation[5] !== null;
            }

            // untere Reihe: 5 <- 6 <- 7 <- 8 <- 9
            if (index >= 5 && index <= 8) {
                isArrowUsed = rotation[index] !== null && rotation[index + 1] !== null;
            }

            if (!isArrowUsed) {
                arrow.classList.add("is-unused");
            }
            arrow.style.gridColumn = String(slotInfo.arrow.gridColumn);
            arrow.style.gridRow = String(slotInfo.arrow.gridRow);
            container.appendChild(arrow);
        }
    });

    initRotationDragDrop();
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