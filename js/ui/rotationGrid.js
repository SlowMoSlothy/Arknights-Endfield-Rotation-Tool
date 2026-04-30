function getShortSkillType(type) {
    const value = (type || "").toLowerCase();
    if (value.includes("final") || value === "fs") return "FS";
    if (value.includes("battle") || value === "bs") return "BS";
    if (value.includes("combo") || value === "cs") return "CS";
    if (value.includes("ultimate") || value === "ult") return "Ult";
    return type || "";
}

function getVisibleRotationDebuffs(skillData) {
    return (skillData?.debuffs || []).filter(x => x.visible !== false);
}

function getVisibleRotationBuffs(skillData) {
    return (skillData?.buffs || []).filter(x => x.visible !== false);
}

function createEffectTray(items, type) {
    if (!items.length) return null;
    const tray = document.createElement('div');
    tray.className = `rotation-${type}-tray`;

    items.forEach(effect => {
        const item = document.createElement('div');
        item.className = `rotation-${type}-item`;
        item.title = type === 'buff' ? getBuffDisplayName(effect) : getDebuffDisplayName(effect);

        const iconPath = type === 'buff' ? resolveBuffIcon(effect) : resolveDebuffIcon(effect);

        if (iconPath) {
            const img = document.createElement('img');
            img.className = `rotation-${type}-icon`;
            img.src = iconPath;
            img.alt = item.title;
            item.appendChild(img);
        } else {
            const fallback = document.createElement('span');
            fallback.className = `rotation-${type}-fallback`;
            fallback.textContent = item.title.slice(0,2).toUpperCase();
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
                if (skillData.elementType) skillDiv.classList.add(`ef-element-${skillData.elementType}`);
                if (entry.autoInserted) skillDiv.classList.add("auto-inserted");

                const buffTray = createEffectTray(getVisibleRotationBuffs(skillData), 'buff');
                if (buffTray) skillDiv.appendChild(buffTray);

                const inner = document.createElement("div");
                inner.className = "rotation-skill-composite";

                inner.innerHTML = `
                    <img class="rotation-skill-portrait" src="${skillData.icon}" alt="${skillData.name}" draggable="false">
                    <div class="rotation-skill-type-badge">${skillData.shortType || getShortSkillType(skillData.type)}</div>
                    <div class="rotation-skill-glyph-badge"><img src="${skillData.iconSmall}" alt="${skillData.type || 'Skill'}" draggable="false"></div>
                `;

                skillDiv.appendChild(inner);

                const debuffTray = createEffectTray(getVisibleRotationDebuffs(skillData), 'debuff');
                if (debuffTray) skillDiv.appendChild(debuffTray);

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
    initTapInput();
    renderEnemyEffects();
    renderOperatorBuffs();
}
