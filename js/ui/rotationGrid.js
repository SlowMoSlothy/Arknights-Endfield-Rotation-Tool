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

function getRotationDebuffKey(effect) {
    return normalizeDebuffKey({
        id: effect?.appliesEffect || effect?.id || effect?.name
    });
}

function addDebuffToRotationState(effect, stackState, metaState) {
    const key = getRotationDebuffKey(effect);
    if (!key) return;

    const registryEntry = DEBUFF_REGISTRY?.[key];
    const isStackable = effect?.stackable === true || registryEntry?.stackable === true;
    const maxStacks = Number(effect?.maxStacks || registryEntry?.maxStacks || 4);
    const stacksApplied = Number(effect?.stacksApplied || effect?.stackCount || 1);

    const safeMax = Number.isFinite(maxStacks) ? maxStacks : 4;
    const safeApplied = Number.isFinite(stacksApplied) ? stacksApplied : 1;

    if (isStackable) {
        stackState[key] = Math.max(1, Math.min((stackState[key] || 0) + safeApplied, safeMax));
    } else {
        stackState[key] = 1;
    }

    metaState[key] = {
        ...effect,
        id: key,
        appliesEffect: key,
        stackable: isStackable,
        maxStacks: safeMax
    };
}

function consumeAllDebuffStacks(effectName, stackState, metaState) {
    const key = normalizeDebuffKey({ id: effectName });
    if (!key) return;

    delete stackState[key];
    delete metaState[key];
}

function resolveRotationArtsReactionsWithFullConsume(stackState, metaState) {
    if (!Array.isArray(ARTS_REACTIONS)) return;

    let didResolve = true;
    let safetyCounter = 0;
    const MAX_REACTION_LOOPS = 20;

    while (didResolve && safetyCounter < MAX_REACTION_LOOPS) {
        didResolve = false;
        safetyCounter++;

        for (const reaction of ARTS_REACTIONS) {
            const canResolve = reaction.requires.every(effectName => {
                const key = normalizeDebuffKey({ id: effectName });
                return (stackState[key] || 0) > 0;
            });

            if (!canResolve) continue;

            reaction.requires.forEach(effectName => {
                consumeAllDebuffStacks(effectName, stackState, metaState);
            });

            didResolve = true;
        }
    }
}

function getActiveDebuffsFromRotationState(stackState, metaState) {
    return Object.entries(stackState)
        .filter(([, amount]) => amount > 0)
        .map(([key, amount]) => ({
            ...(metaState[key] || { id: key }),
            id: key,
            appliesEffect: key,
            stackCount: amount,
            currentStacks: amount,
            stacks: amount
        }));
}

function applySkillDebuffsAndGetActiveState(skillData, stackState, metaState) {
    getVisibleRotationDebuffs(skillData).forEach(effect => {
        if (effect.persistsForCombo === false) return;
        addDebuffToRotationState(effect, stackState, metaState);
    });

    resolveRotationArtsReactionsWithFullConsume(stackState, metaState);

    return getActiveDebuffsFromRotationState(stackState, metaState);
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
    const rotationDebuffStackState = {};
    const rotationDebuffMetaState = {};

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
                skillDiv.dataset.id = String(entry.id);
                skillDiv.dataset.uid = entry.uid;

                const buffTray = createEffectTray(getVisibleRotationBuffs(skillData), 'buff');
                if (buffTray) skillDiv.appendChild(buffTray);

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

                const activeDebuffs = applySkillDebuffsAndGetActiveState(
                    skillData,
                    rotationDebuffStackState,
                    rotationDebuffMetaState
                );

                const debuffTray = createEffectTray(activeDebuffs, 'debuff');
                if (debuffTray) skillDiv.appendChild(debuffTray);

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
            const isUsed = nextIndex < rotation.length && currentEntry !== null && rotation[nextIndex] !== null;
            if (!isUsed) arrow.classList.add("is-unused");

            container.appendChild(arrow);
        }
    });

    initRotationDragDrop();
    initTapInput();
    renderEnemyEffects();
    renderOperatorBuffs();
}
