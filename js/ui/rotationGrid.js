function getShortSkillType(type) {
    const value = (type || "").toLowerCase();

    if (value.includes("final") || value === "fs") return "FS";
    if (value.includes("battle") || value === "bs") return "BS";
    if (value.includes("combo") || value === "cs") return "CS";
    if (value.includes("ultimate") || value === "ult") return "Ult";

    return type || "";
}

function getVisibleRotationDebuffs(skillData) {
    return (skillData?.debuffs || []).filter(debuff => debuff.visible !== false);
}

function cloneDebuffWithRotationStack(debuffData, stackState) {
    const key = normalizeDebuffKey(debuffData);
    const registryEntry = DEBUFF_REGISTRY?.[key];
    const isStackable = debuffData?.stackable === true || registryEntry?.stackable === true;

    if (!isStackable) {
        return { ...debuffData };
    }

    const maxStacks = Number(debuffData?.maxStacks || registryEntry?.maxStacks || 4);
    const stacksApplied = Number(debuffData?.stacksApplied || debuffData?.stackCount || 1);
    const safeApplied = Number.isFinite(stacksApplied) ? stacksApplied : 1;
    const safeMax = Number.isFinite(maxStacks) ? maxStacks : 4;

    const previousStack = stackState[key] || 0;
    const nextStack = Math.max(1, Math.min(previousStack + safeApplied, safeMax));

    stackState[key] = nextStack;

    return {
        ...debuffData,
        stackCount: nextStack,
        currentStacks: nextStack,
        stacks: nextStack
    };
}

function createRotationDebuffTray(skillData, stackState) {
    const debuffs = getVisibleRotationDebuffs(skillData)
        .map(debuffData => cloneDebuffWithRotationStack(debuffData, stackState));

    if (debuffs.length === 0) return null;

    const tray = document.createElement("div");
    tray.className = "rotation-debuff-tray";

    debuffs.forEach(debuffData => {
        const item = document.createElement("div");
        item.className = "rotation-debuff-item";
        item.title = getDebuffDisplayName(debuffData);

        const resolvedIcon = resolveDebuffIcon(debuffData);

        if (resolvedIcon) {
            const icon = document.createElement("img");
            icon.className = "rotation-debuff-icon";
            icon.src = resolvedIcon;
            icon.alt = getDebuffDisplayName(debuffData);
            item.appendChild(icon);
        } else {
            const fallback = document.createElement("span");
            fallback.className = "rotation-debuff-fallback";
            fallback.textContent = getDebuffDisplayName(debuffData).trim().slice(0, 2).toUpperCase();
            item.appendChild(fallback);
        }

        tray.appendChild(item);
    });

    return tray;
}

function renderRotation() {
    const container = document.getElementById("rotationDropZone");
    if (!container) return;

    container.innerHTML = "";

    const slotMap = getSnakeSlotMap();
    const rotationDebuffStackState = {};

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

                const debuffTray = createRotationDebuffTray(skillData, rotationDebuffStackState);
                if (debuffTray) {
                    skillDiv.appendChild(debuffTray);
                }

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

            container.appendChild(arrow);
        }
    });

    initRotationDragDrop();
    initTapInput();
    renderEnemyEffects();
    renderOperatorBuffs();
}