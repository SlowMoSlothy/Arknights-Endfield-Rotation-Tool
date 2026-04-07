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

                if (skillData.debuff && skillData.debuff.icon) {
                    const debuff = document.createElement("img");
                    debuff.className = "skill-debuff";
                    debuff.src = skillData.debuff.icon;
                    debuff.alt = skillData.debuff.name || "Debuff";
                    debuff.title = skillData.debuff.name || "Debuff";

                    skillDiv.appendChild(debuff);
                }
                
                const removeBtn = document.createElement("div");
                removeBtn.className = "remove-btn";
                removeBtn.textContent = "×";
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    rotation[index] = null;
                    compactRotation();
                    trimTrailingEmptyRows();
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
    const map = [];
    const rows = Math.ceil(rotation.length / 5);

    for (let row = 0; row < rows; row++) {
        const isReverse = row % 2 === 1;

        for (let col = 0; col < 5; col++) {
            const slotIndex = row * 5 + col;
            if (slotIndex >= rotation.length) break;

            const visualCol = isReverse ? 4 - col : col;
            const gridColumn = visualCol * 2 + 1;
            const gridRow = row * 2 + 1;

            let arrow = null;
            const hasNextSlot = slotIndex + 1 < rotation.length;
            const isLastInRow = col === 4;

            if (hasNextSlot) {
                if (!isLastInRow) {
                    arrow = {
                        text: isReverse ? "←" : "→",
                        gridColumn: isReverse ? gridColumn - 1 : gridColumn + 1,
                        gridRow
                    };
                } else {
                    arrow = {
                        text: "↓",
                        gridColumn,
                        gridRow: gridRow + 1
                    };
                }
            }

            map.push({
                gridColumn,
                gridRow,
                arrow
            });
        }
    }

    return map;
}