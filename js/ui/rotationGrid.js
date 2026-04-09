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
                if (entry.autoInserted) {
                    skillDiv.classList.add("auto-inserted");
                }
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

            arrow.style.gridColumn = String(slotInfo.arrow.gridColumn);
            arrow.style.gridRow = String(slotInfo.arrow.gridRow);

            const currentEntry = rotation[index];
            let isUsed = false;

            // obere Reihe
            if (index >= 0 && index <= 3) {
                isUsed = rotation[index] !== null && rotation[index + 1] !== null;
            }

            // Pfeil nach unten
            if (index === 4) {
                isUsed = rotation[4] !== null && rotation[5] !== null;
            }

            // untere Reihe
            if (index >= 5 && index <= 8) {
                isUsed = rotation[index] !== null && rotation[index + 1] !== null;
            }

            if (!isUsed) {
                arrow.classList.add("is-unused");
            }

            // Debuff schon anzeigen, sobald der aktuelle Skill existiert
            if (currentEntry) {
                const skillData = getSkillById(currentEntry.id);

                if (skillData && skillData.debuffs && skillData.debuffs.length > 0) {
                    const debuffWrap = document.createElement("div");
                    debuffWrap.className = "arrow-effects";

                    skillData.debuffs.forEach(debuffData => {
                        const debuffItem = document.createElement("div");
                        debuffItem.className = "arrow-effect";

                        if (debuffData.icon) {
                            const debuffIcon = document.createElement("img");
                            debuffIcon.className = "arrow-effect-icon";
                            debuffIcon.src = debuffData.icon;
                            debuffIcon.alt = debuffData.name || "Effect";
                            debuffIcon.title = debuffData.name || "Effect";
                            debuffItem.appendChild(debuffIcon);
                        }

                        if (debuffData.name) {
                            const debuffLabel = document.createElement("div");
                            debuffLabel.className = "arrow-effect-label";
                            debuffLabel.textContent = debuffData.name;
                            debuffItem.appendChild(debuffLabel);
                        }

                        debuffWrap.appendChild(debuffItem);
                    });

                    arrow.appendChild(debuffWrap);
                }
            }

            container.appendChild(arrow);
        }
    });

    initRotationDragDrop();
}
