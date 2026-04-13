function formatTooltipDescription(text) {
    if (!text) return "";

    return text
        .replaceAll(
            "[icon=heat]",
            '<img class="tooltip-inline-icon" src="assets/debuffs/heat_1.png" alt="Heat">'
        )
        .replaceAll(
            "[icon=lift]",
            '<img class="tooltip-inline-icon" src="assets/debuffs/lift.png" alt="Lift">'
        )
        .replace(/\[heat\](.*?)\[\/heat\]/g, '<span class="tt-heat">$1</span>')
        .replace(/\[lift\](.*?)\[\/lift\]/g, '<span class="tt-lift">$1</span>')
        .replace(/\[buff\](.*?)\[\/buff\]/g, '<span class="tt-buff">$1</span>')
        .replace(/\[debuff\](.*?)\[\/debuff\]/g, '<span class="tt-debuff">$1</span>')
        .replace(/\[combo\](.*?)\[\/combo\]/g, '<span class="tt-combo">$1</span>');
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

                const removeBtn = document.createElement("button");
                removeBtn.className = "remove-btn";
                removeBtn.type = "button";
                removeBtn.textContent = "×";
                removeBtn.setAttribute("aria-label", "Remove skill");
                removeBtn.dataset.index = String(index);

                removeBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });

                skillDiv.appendChild(removeBtn);

                const tooltip = document.createElement("div");
                tooltip.className = "tooltip";
                tooltip.innerHTML = `
    <div class="tooltip-title">${skillData.name}</div>
    <div class="tooltip-operator">${skillData.operator}</div>
    <div class="tooltip-line">Type: ${skillData.type || "-"}</div>
    <div class="tooltip-line">CD: ${skillData.cooldown}s</div>
    <div class="tooltip-line">Energy: ${skillData.energy}</div>
    <div class="tooltip-description">${formatTooltipDescription(skillData.description)}</div>
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

            if (index >= 0 && index <= 3) {
                isUsed = rotation[index] !== null && rotation[index + 1] !== null;
            }

            if (index === 4) {
                isUsed = rotation[4] !== null && rotation[5] !== null;
            }

            if (index >= 5 && index <= 8) {
                isUsed = rotation[index] !== null && rotation[index + 1] !== null;
            }

            if (!isUsed) {
                arrow.classList.add("is-unused");
            }

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

                        debuffWrap.appendChild(debuffItem);
                    });

                    arrow.appendChild(debuffWrap);
                }
            }

            container.appendChild(arrow);
        }
    });

    initRotationDragDrop();
    initTapInput();
    renderEnemyEffects();
    renderOperatorBuffs();
}