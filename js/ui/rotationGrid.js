function getShortSkillType(type) {
    const value = (type || "").toLowerCase();

    if (value.includes("final") || value === "fs") return "FS";
    if (value.includes("battle") || value === "bs") return "BS";
    if (value.includes("combo") || value === "cs") return "CS";
    if (value.includes("ultimate") || value === "ult") return "Ult";

    return type || "";
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

                if (skillData.elementType) {
                    skillDiv.classList.add(`ef-element-${skillData.elementType}`);
                }

                if (skillData.elementType) {
                    skillDiv.classList.add(`ef-element-${skillData.elementType}`);
                }

                if (entry.autoInserted) {
                    skillDiv.classList.add("auto-inserted");
                }

                skillDiv.dataset.id = String(entry.id);
                skillDiv.dataset.uid = entry.uid;

                const inner = document.createElement("div");
                inner.className = "rotation-skill-composite";

                const portrait = document.createElement("img");
                portrait.className = "rotation-skill-portrait";
                portrait.src = skillData.icon;
                portrait.alt = skillData.name;
                portrait.draggable = false;

                const typeBadge = document.createElement("div");
                typeBadge.className = "rotation-skill-type-badge";
                typeBadge.textContent = skillData.shortType || getShortSkillType(skillData.type);

                const glyphBadge = document.createElement("div");
                glyphBadge.className = "rotation-skill-glyph-badge";

                const glyph = document.createElement("img");
                glyph.src = skillData.iconSmall;
                glyph.alt = skillData.type || "Skill";
                glyph.draggable = false;

                glyphBadge.appendChild(glyph);

                inner.appendChild(portrait);
                inner.appendChild(typeBadge);
                inner.appendChild(glyphBadge);

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
            const nextIndex = index + 1;

            let isUsed = false;
            if (nextIndex < rotation.length) {
                isUsed = currentEntry !== null && rotation[nextIndex] !== null;
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
                        if (debuffData.visible === false) return;

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