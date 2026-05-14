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

function getRotationBuffKey(effect) {
    return normalizeBuffKey({
        id: effect?.appliesEffect || effect?.id || effect?.name
    });
}

function getNextRotationEffectOrder(stackState) {
    if (!Object.prototype.hasOwnProperty.call(stackState, "__effectOrder")) {
        Object.defineProperty(stackState, "__effectOrder", {
            value: 0,
            writable: true,
            enumerable: false
        });
    }

    stackState.__effectOrder += 1;
    return stackState.__effectOrder;
}

function clearOtherExclusiveInflictions(activeKey, stackState, metaState) {
    if (!EXCLUSIVE_INFLICTIONS.has(activeKey)) return;
    EXCLUSIVE_INFLICTIONS.forEach(key => {
        if (key !== activeKey) {
            delete stackState[key];
            delete metaState[key];
        }
    });
}

function addDebuffToRotationState(effect, stackState, metaState) {
    const key = getRotationDebuffKey(effect);
    if (!key) return;
    const registryEntry = DEBUFF_REGISTRY?.[key];
    const isStackable = effect?.stackable === true || registryEntry?.stackable === true;
    const maxStacks = Number(effect?.maxStacks || registryEntry?.maxStacks || 4);
    const stacksApplied = Number(effect?.stacksApplied || effect?.stackCount || 1);
    stackState[key] = isStackable ? Math.max(1, Math.min((stackState[key] || 0) + stacksApplied, maxStacks)) : 1;
    metaState[key] = {
        ...effect,
        id: key,
        appliesEffect: key,
        stackable: isStackable,
        maxStacks,
        lastAppliedOrder: getNextRotationEffectOrder(stackState)
    };
}

function addBuffToRotationState(effect, stackState, metaState) {
    const key = getRotationBuffKey(effect);
    if (!key) return;
    const registryEntry = BUFF_REGISTRY?.[key];
    const isStackable = effect?.stackable === true || registryEntry?.stackable === true;
    const maxStacks = Number(effect?.maxStacks || registryEntry?.maxStacks || 4);
    const stacksApplied = Number(effect?.stacksApplied || effect?.stackCount || 1);
    stackState[key] = isStackable ? Math.max(1, Math.min((stackState[key] || 0) + stacksApplied, maxStacks)) : 1;
    metaState[key] = {
        ...effect,
        id: key,
        appliesEffect: key,
        stackable: isStackable,
        maxStacks
    };
}

function applyConsumeInflictionToBuff(skillData, debuffStackState, debuffMetaState, buffStackState, buffMetaState) {
    const config = skillData?.consumeInflictionToBuff;
    if (!config) return;
    const inflictionKey = normalizeDebuffKey({
        id: config.infliction
    });
    const consumedStacks = Number(debuffStackState[inflictionKey] || 0);
    if (consumedStacks <= 0) return;
    delete debuffStackState[inflictionKey];
    delete debuffMetaState[inflictionKey];
    addBuffToRotationState({
        id: config.grantBuff,
        name: config.buffName || config.grantBuff,
        appliesEffect: config.grantBuff,
        persistsForCombo: true,
        visible: config.visible !== false,
        stackable: config.stackable !== false,
        stacksApplied: consumedStacks * Number(config.ratio || 1),
        maxStacks: Number(config.maxStacks || 4),
        iconBase: config.iconBase
    }, buffStackState, buffMetaState);
}

function normalizeRotationConsumeKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function skillConsumesRotationBuff(skillData, buff) {
    if (!buff.consumeOnSkillType) return false;
    const consumeKey = normalizeRotationConsumeKey(buff.consumeOnSkillType);
    const skillTypeKey = normalizeRotationConsumeKey(skillData.type);
    if (consumeKey === skillTypeKey) return true;
    const allEffects = [...(Array.isArray(skillData.debuffs) ? skillData.debuffs : []), ...(Array.isArray(skillData.buffs) ? skillData.buffs : [])];
    return allEffects.some(effect => normalizeRotationConsumeKey(effect?.id) === consumeKey || normalizeRotationConsumeKey(effect?.appliesEffect) === consumeKey || normalizeRotationConsumeKey(effect?.name) === consumeKey);
}

function consumeRotationBuffsForSkill(skillData, stackState, metaState) {
    Object.entries(metaState).forEach(([buffId, buff]) => {
        const registryEntry = BUFF_REGISTRY?.[buffId];
        const consumeOnSkillType = buff.consumeOnSkillType || registryEntry?.consumeOnSkillType;

        if (!consumeOnSkillType) return;

        const mergedBuff = {
            ...registryEntry,
            ...buff,
            consumeOnSkillType,
            consumeStacks: buff.consumeStacks ?? registryEntry?.consumeStacks,
            onFullyConsumedEffect: buff.onFullyConsumedEffect ?? registryEntry?.onFullyConsumedEffect
        };

        if (!skillConsumesRotationBuff(skillData, mergedBuff)) return;

        const amount = Number(mergedBuff.consumeStacks || 1);

        stackState[buffId] = Number(stackState[buffId] || 0) - amount;

        if (stackState[buffId] <= 0) {
            delete stackState[buffId];
            delete metaState[buffId];
        }
    });
}

function consumeSpecificBuffStacks(config, stackState, metaState) {
    if (!config?.buff) return;
    const key = normalizeRotationConsumeKey(config.buff);
    const amount = Number(config.amount || 1);
    if (!stackState[key]) return;
    stackState[key] -= amount;
    if (stackState[key] <= 0) {
        delete stackState[key];
        delete metaState[key];
    }
}

function getActiveBuffsFromRotationState(stackState, metaState) {
    return Object.entries(stackState).filter(([, amount]) => amount > 0).map(([key, amount]) => ({
        ...(metaState[key] || {
            id: key
        }),
        id: key,
        appliesEffect: key,
        stackCount: amount,
        currentStacks: amount,
        stacks: amount
    }));
}

function getMatchedConditionalRules(skillData, activeBuffMetaState, activeBuffStackState) {
    if (!Array.isArray(skillData?.conditionalDebuffs)) return [];
    return skillData.conditionalDebuffs.filter(rule => hasRequiredRotationBuff(rule, activeBuffMetaState, activeBuffStackState));
}

function shouldSkipNormalBuffs(skillData, activeBuffMetaState, activeBuffStackState) {
    return getMatchedConditionalRules(skillData, activeBuffMetaState, activeBuffStackState).some(rule => rule.skipNormalBuffs === true);
}

function shouldSkipNormalDebuffs(skillData, activeBuffMetaState, activeBuffStackState) {
    return getMatchedConditionalRules(skillData, activeBuffMetaState, activeBuffStackState).some(rule => rule.skipNormalDebuffs === true);
}

function applySkillBuffsAndGetActiveState(skillData, stackState, metaState, activeBuffMetaState = metaState, activeBuffStackState = stackState) {
    consumeRotationBuffsForSkill(skillData, stackState, metaState);
    if (!shouldSkipNormalBuffs(skillData, activeBuffMetaState, activeBuffStackState)) {
        getVisibleRotationBuffs(skillData).forEach(effect => {
            if (effect.persistsForCombo !== false) addBuffToRotationState(effect, stackState, metaState);
        });
    }
    return getActiveBuffsFromRotationState(stackState, metaState);
}

function hasRequiredRotationBuff(rule, activeBuffMetaState, activeBuffStackState) {
    if (rule?.requiresBuffStacks) {
        const key = normalizeRotationConsumeKey(rule.requiresBuffStacks.buff);
        return Number(activeBuffStackState[key] || 0) >= Number(rule.requiresBuffStacks.minStacks || 1);
    }
    const requiredList = Array.isArray(rule?.requiresBuff) ? rule.requiresBuff : [rule?.requiresBuff];
    return requiredList.every(buffName => Boolean(activeBuffMetaState[normalizeRotationConsumeKey(buffName)]));
}

function applyConditionalDebuffsToRotationState(skillData, activeBuffMetaState, activeBuffStackState, debuffStackState, debuffMetaState, buffStackState, buffMetaState) {
    const matchedRules = getMatchedConditionalRules(skillData, activeBuffMetaState, activeBuffStackState);
    matchedRules.forEach(rule => {
        if (!Array.isArray(rule.debuffs)) return;
        if (rule.consumeBuffStacks) consumeSpecificBuffStacks(rule.consumeBuffStacks, buffStackState, buffMetaState);
        rule.debuffs.forEach(effect => {
            if (effect.persistsForCombo !== false) addDebuffToRotationState(effect, debuffStackState, debuffMetaState);
        });
    });
}

function applyMatchingInflictionToRotationState(skillData, stackState, metaState) {
    const config = skillData?.matchingInfliction;
    if (!config || !Array.isArray(config.candidateEffects)) return;
    const minStacks = Number(config.minStacks || 1);
    const matchingEffect = config.candidateEffects.find(effectName => (stackState[normalizeDebuffKey({
        id: effectName
    })] || 0) >= minStacks);
    if (!matchingEffect) return;
    addDebuffToRotationState({
        id: matchingEffect,
        name: matchingEffect,
        appliesEffect: matchingEffect,
        persistsForCombo: true,
        visible: true,
        stackable: true,
        stacksApplied: Number(config.stacksApplied || 1),
        maxStacks: Number(config.maxStacks || 4)
    }, stackState, metaState);
}

function consumeAllDebuffStacks(effectName, stackState, metaState) {
    const key = normalizeDebuffKey({
        id: effectName
    });
    delete stackState[key];
    delete metaState[key];
}

const ROTATION_ELEMENTAL_INFLICTION_EFFECTS = [
    "electric_infliction",
    "heat_infliction",
    "cryo_infliction",
    "nature_infliction"
];

const ROTATION_LATEST_ELEMENT_REACTIONS = {
    cryo_infliction: "solidification",
    heat_infliction: "combustion",
    nature_infliction: "corrosion"
};

const ROTATION_ARTS_REACTION_EFFECTS = [
    "arts_reaction",
    "combustion",
    "corrosion",
    "solidification"
];

const ROTATION_LATEST_REACTION_OWN_EFFECTS = {
    cryo_infliction: "solidification",
    heat_infliction: "combustion",
    nature_infliction: "corrosion"
};

function resolveRotationArtsReactionsWithFullConsume(stackState, metaState) {
    if (!Array.isArray(ARTS_REACTIONS)) return;
    let didResolve = true;
    let safetyCounter = 0;
    while (didResolve && safetyCounter < 20) {
        didResolve = false;
        safetyCounter++;
        if (resolveLatestElementalReactionForRotation(stackState, metaState)) {
            didResolve = true;
            continue;
        }
        for (const reaction of ARTS_REACTIONS) {
            const canResolve = reaction.requires.every(effectName => (stackState[normalizeDebuffKey({
                id: effectName
            })] || 0) > 0);
            if (!canResolve) continue;
            reaction.requires.forEach(effectName => consumeAllDebuffStacks(effectName, stackState, metaState));
            ROTATION_ARTS_REACTION_EFFECTS.forEach(effectName => consumeAllDebuffStacks(effectName, stackState, metaState));
            [reaction.appliesEffect, reaction.reactionEffect].forEach(effectName => {
                if (!effectName) return;
                addDebuffToRotationState({
                    id: effectName,
                    name: DEBUFF_REGISTRY?.[effectName]?.name || reaction.name || effectName,
                    appliesEffect: effectName,
                    persistsForCombo: reaction.persistsForCombo,
                    visible: true,
                    stackable: DEBUFF_REGISTRY?.[effectName]?.stackable === true,
                    maxStacks: DEBUFF_REGISTRY?.[effectName]?.maxStacks || 1
                }, stackState, metaState);
            });
            didResolve = true;
        }
    }
}

function resolveLatestElementalReactionForRotation(stackState, metaState) {
    const latestInfliction = Object.keys(ROTATION_LATEST_ELEMENT_REACTIONS)
        .filter(key => (stackState[key] || 0) > 0)
        .sort((left, right) => Number(metaState[right]?.lastAppliedOrder || 0) - Number(metaState[left]?.lastAppliedOrder || 0))[0];

    if (!latestInfliction) return false;

    const latestOrder = Number(metaState[latestInfliction]?.lastAppliedOrder || 0);
    const previousInflictionKeys = ROTATION_ELEMENTAL_INFLICTION_EFFECTS
        .concat(ROTATION_ARTS_REACTION_EFFECTS.filter(key => key !== "arts_reaction"))
        .filter(key => {
        return key !== latestInfliction
            && key !== ROTATION_LATEST_REACTION_OWN_EFFECTS[latestInfliction]
            && (stackState[key] || 0) > 0
            && Number(metaState[key]?.lastAppliedOrder || 0) < latestOrder;
    });

    if (previousInflictionKeys.length === 0) return false;

    ROTATION_ELEMENTAL_INFLICTION_EFFECTS
        .concat(ROTATION_ARTS_REACTION_EFFECTS)
        .forEach(effectName => consumeAllDebuffStacks(effectName, stackState, metaState));
    ["arts_reaction", ROTATION_LATEST_ELEMENT_REACTIONS[latestInfliction]].forEach(effectName => {
        addDebuffToRotationState({
            id: effectName,
            name: DEBUFF_REGISTRY?.[effectName]?.name || effectName,
            appliesEffect: effectName,
            persistsForCombo: false,
            visible: true,
            stackable: DEBUFF_REGISTRY?.[effectName]?.stackable === true,
            maxStacks: DEBUFF_REGISTRY?.[effectName]?.maxStacks || 1
        }, stackState, metaState);
    });

    return true;
}

function getActiveDebuffsFromRotationState(stackState, metaState) {
    return Object.entries(stackState).filter(([, amount]) => amount > 0).map(([key, amount]) => ({
        ...(metaState[key] || {
            id: key
        }),
        id: key,
        appliesEffect: key,
        stackCount: amount,
        currentStacks: amount,
        stacks: amount
    }));
}

function applySkillDebuffsAndGetActiveState(skillData, activeBuffMetaState, activeBuffStackState, debuffStackState, debuffMetaState, buffStackState, buffMetaState) {
    if (!shouldSkipNormalDebuffs(skillData, activeBuffMetaState, activeBuffStackState)) {
        getVisibleRotationDebuffs(skillData).forEach(effect => {
            if (effect.persistsForCombo !== false) addDebuffToRotationState(effect, debuffStackState, debuffMetaState);
        });
    }
    applyConditionalDebuffsToRotationState(skillData, activeBuffMetaState, activeBuffStackState, debuffStackState, debuffMetaState, buffStackState, buffMetaState);
    applyConsumeInflictionToBuff(skillData, debuffStackState, debuffMetaState, buffStackState, buffMetaState);
    applyMatchingInflictionToRotationState(skillData, debuffStackState, debuffMetaState);
    resolveRotationArtsReactionsWithFullConsume(debuffStackState, debuffMetaState);
    return getActiveDebuffsFromRotationState(debuffStackState, debuffMetaState);
}

function escapeEffectTooltipText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function ensureGlobalEffectTooltip() {
    let tooltip = document.getElementById("globalEffectTooltip");

    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "globalEffectTooltip";
        tooltip.className = "global-tooltip";
        document.body.appendChild(tooltip);
    }

    return tooltip;
}

function buildEffectTooltipHtml(displayName, type) {
    const safeName = escapeEffectTooltipText(displayName);
    const safeType = escapeEffectTooltipText(type === "buff" ? "Buff" : "Debuff");

    return `
        <div class="tooltip-card tooltip-element-neutral">
            <div class="tooltip-header">
                <div class="tooltip-title">${safeName}</div>
                <div class="tooltip-accent-line"></div>
            </div>
            <div class="tooltip-type">${safeType}</div>
        </div>
    `;
}

function positionEffectTooltip(targetEl) {
    const tooltip = ensureGlobalEffectTooltip();
    const rect = targetEl.getBoundingClientRect();
    const margin = 8;
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - margin;

    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) left = window.innerWidth - tooltipRect.width - 8;
    if (top < 8) top = rect.bottom + margin;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function showEffectTooltip(targetEl, displayName, type) {
    const tooltip = ensureGlobalEffectTooltip();
    tooltip.innerHTML = buildEffectTooltipHtml(displayName, type);
    tooltip.classList.add("visible");
    requestAnimationFrame(() => positionEffectTooltip(targetEl));
}

function hideEffectTooltip() {
    const tooltip = document.getElementById("globalEffectTooltip");
    if (!tooltip) return;
    tooltip.classList.remove("visible");
}

function attachEffectTooltipEvents(targetEl, displayName, type) {
    targetEl.addEventListener("mouseenter", () => showEffectTooltip(targetEl, displayName, type));
    targetEl.addEventListener("mouseleave", hideEffectTooltip);
    targetEl.addEventListener("mousemove", () => {
        const tooltip = document.getElementById("globalEffectTooltip");
        if (tooltip?.classList.contains("visible")) positionEffectTooltip(targetEl);
    });
}

function createEffectTray(items, type) {
    if (!items.length) return null;
    const tray = document.createElement("div");
    tray.className = `rotation-${type}-tray`;
    if (items.length > 5) tray.classList.add("is-multi-row");
    items.forEach(effect => {
        const item = document.createElement("div");
        item.className = `rotation-${type}-item`;
        const displayName = type === "buff" ? getBuffDisplayName(effect) : getDebuffDisplayName(effect);
        item.title = displayName;
        item.dataset.tooltip = displayName;
        item.setAttribute("aria-label", displayName);
        const iconPath = type === "buff" ? resolveBuffIcon(effect) : resolveDebuffIcon(effect);
        if (iconPath) {
            const img = document.createElement("img");
            img.className = `rotation-${type}-icon`;
            img.src = iconPath;
            img.alt = displayName;
            img.title = displayName;
            img.dataset.tooltip = displayName;
            img.setAttribute("aria-label", displayName);
            item.appendChild(img);
        } else {
            const fallback = document.createElement("span");
            fallback.className = `rotation-${type}-fallback`;
            fallback.textContent = displayName.slice(0, 2).toUpperCase();
            fallback.title = displayName;
            fallback.dataset.tooltip = displayName;
            item.appendChild(fallback);
        }
        attachEffectTooltipEvents(item, displayName, type);
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
    const rotationBuffStackState = {};
    const rotationBuffMetaState = {};
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
                const activeBuffsBeforeSkill = {
                    ...rotationBuffMetaState
                };
                const activeBuffStacksBeforeSkill = {
                    ...rotationBuffStackState
                };
                applySkillBuffsAndGetActiveState(skillData, rotationBuffStackState, rotationBuffMetaState, activeBuffsBeforeSkill, activeBuffStacksBeforeSkill);
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
                const activeDebuffs = applySkillDebuffsAndGetActiveState(skillData, activeBuffsBeforeSkill, activeBuffStacksBeforeSkill, rotationDebuffStackState, rotationDebuffMetaState, rotationBuffStackState, rotationBuffMetaState);
                const activeBuffsAfterEffects = getActiveBuffsFromRotationState(rotationBuffStackState, rotationBuffMetaState);
                const buffTray = createEffectTray(activeBuffsAfterEffects, "buff");
                if (buffTray) skillDiv.appendChild(buffTray);
                const debuffTray = createEffectTray(activeDebuffs, "debuff");
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
    updateRotationActionStates();
}
