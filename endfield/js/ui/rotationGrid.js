function getShortSkillType(type) {
    const value = (type || "").toLowerCase();
    if (value.includes("basic") || value === "batk") return "BATK";
    if (value.includes("dive")) return "Dive";
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
    const inflictionMechanic = typeof getInflictionMechanic === "function"
        ? getInflictionMechanic(key)
        : null;
    const isStackable = Boolean(inflictionMechanic) || effect?.stackable === true || registryEntry?.stackable === true;
    const maxStacks = Number(inflictionMechanic?.maxStacks || effect?.maxStacks || registryEntry?.maxStacks || 4);
    const stacksApplied = Number(effect?.stacksApplied || effect?.stackCount || 1);
    const previousStackTimes = Array.isArray(metaState[key]?.appliedStackTimes) ? metaState[key].appliedStackTimes : [];
    const appliedAt = Number(effect?.appliedAt);
    const appliedStackCount = Math.max(1, Math.round(Number(stacksApplied)) || 1);
    const nextStackCount = isStackable
        ? Math.max(1, Math.min((stackState[key] || 0) + stacksApplied, maxStacks))
        : 1;
    const appliedStackTimes = Number.isFinite(appliedAt)
        ? (isStackable
            ? (inflictionMechanic
                ? Array(nextStackCount).fill(appliedAt)
                : [...previousStackTimes, ...Array(appliedStackCount).fill(appliedAt)].slice(-maxStacks))
            : [appliedAt])
        : previousStackTimes;
    stackState[key] = nextStackCount;
    metaState[key] = {
        ...effect,
        id: key,
        appliesEffect: key,
        stackable: isStackable,
        maxStacks,
        durationSeconds: Number(inflictionMechanic?.durationSeconds) || effect?.durationSeconds,
        verified: inflictionMechanic ? inflictionMechanic.verified === true : effect?.verified,
        sourceUrl: inflictionMechanic?.sourceUrl || effect?.sourceUrl,
        lastAppliedOrder: getNextRotationEffectOrder(stackState),
        appliedStackTimes
    };
}

function addBuffToRotationState(effect, stackState, metaState) {
    const key = getRotationBuffKey(effect);
    if (!key) return;
    const registryEntry = BUFF_REGISTRY?.[key];
    const isStackable = effect?.stackable === true || registryEntry?.stackable === true;
    const maxStacks = Number(effect?.maxStacks || registryEntry?.maxStacks || 4);
    const stacksApplied = Number(effect?.stacksApplied || effect?.stackCount || 1);
    const previousStackTimes = Array.isArray(metaState[key]?.appliedStackTimes) ? metaState[key].appliedStackTimes : [];
    const appliedAt = Number(effect?.appliedAt);
    const appliedStackCount = Math.max(1, Math.round(Number(stacksApplied)) || 1);
    const appliedStackTimes = Number.isFinite(appliedAt)
        ? (isStackable
            ? [...previousStackTimes, ...Array(appliedStackCount).fill(appliedAt)].slice(-maxStacks)
            : [appliedAt])
        : previousStackTimes;
    stackState[key] = isStackable ? Math.max(1, Math.min((stackState[key] || 0) + stacksApplied, maxStacks)) : 1;
    metaState[key] = {
        ...effect,
        id: key,
        appliesEffect: key,
        stackable: isStackable,
        maxStacks,
        appliedStackTimes
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
    const consumeKeys = (Array.isArray(buff.consumeOnSkillType) ? buff.consumeOnSkillType : [buff.consumeOnSkillType])
        .map(normalizeRotationConsumeKey)
        .filter(Boolean);
    const skillTypeKey = normalizeRotationConsumeKey(skillData.type);
    const shortTypeKey = normalizeRotationConsumeKey(skillData.shortType);
    if (consumeKeys.includes(skillTypeKey) || consumeKeys.includes(shortTypeKey)) return true;
    const allEffects = [...(Array.isArray(skillData.debuffs) ? skillData.debuffs : []), ...(Array.isArray(skillData.buffs) ? skillData.buffs : [])];
    return allEffects.some(effect => consumeKeys.some(consumeKey => (
        normalizeRotationConsumeKey(effect?.id) === consumeKey
        || normalizeRotationConsumeKey(effect?.appliesEffect) === consumeKey
        || normalizeRotationConsumeKey(effect?.name) === consumeKey
    )));
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

        const amount = mergedBuff.consumeAllStacks === true
            ? Number(stackState[buffId] || 0)
            : Number(mergedBuff.consumeStacks || 1);

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

function hasRequiredRotationConditionalEffects(rule, activeBuffMetaState, activeBuffStackState, debuffMetaState = {}, debuffStackState = {}) {
    const normalizeKey = value => normalizeRotationConsumeKey(value);
    const hasEffect = (effectName, minStacks = 1) => {
        const key = normalizeKey(effectName);
        const buffStacks = Number(activeBuffStackState[key] || 0);
        const debuffStacks = Number(debuffStackState[key] || 0);
        return Math.max(buffStacks, debuffStacks) >= Number(minStacks || 1);
    };

    if (rule?.requiresBuffStacks) {
        const key = normalizeKey(rule.requiresBuffStacks.buff);
        return Number(activeBuffStackState[key] || 0) >= Number(rule.requiresBuffStacks.minStacks || 1);
    }

    if (rule?.requiresEffectStacks) {
        const effectName = rule.requiresEffectStacks.effect || rule.requiresEffectStacks.debuff || rule.requiresEffectStacks.buff;
        if (!hasEffect(effectName, rule.requiresEffectStacks.minStacks)) return false;
    }

    const requiredEffects = [
        ...(Array.isArray(rule?.requiresBuff) ? rule.requiresBuff : [rule?.requiresBuff]),
        ...(Array.isArray(rule?.requiresEffect) ? rule.requiresEffect : [rule?.requiresEffect]),
        ...(Array.isArray(rule?.requiresDebuff) ? rule.requiresDebuff : [rule?.requiresDebuff])
    ].filter(Boolean);

    const hasRequiredEffects = requiredEffects.every(effectName => {
        const key = normalizeKey(effectName);
        return Boolean(activeBuffMetaState[key] || debuffMetaState[key] || hasEffect(key));
    });
    const hasNoExcludedEffects = (Array.isArray(rule?.noneOf) ? rule.noneOf : [rule?.noneOf])
        .filter(Boolean)
        .every(effectName => !hasEffect(effectName));

    return hasRequiredEffects && hasNoExcludedEffects;
}

function getMatchedConditionalRules(skillData, activeBuffMetaState, activeBuffStackState, debuffMetaState = {}, debuffStackState = {}) {
    if (!Array.isArray(skillData?.conditionalDebuffs)) return [];
    return skillData.conditionalDebuffs.filter(rule => {
        if (rule?.requiresEffect || rule?.requiresDebuff || rule?.requiresEffectStacks || rule?.noneOf) {
            return hasRequiredRotationConditionalEffects(rule, activeBuffMetaState, activeBuffStackState, debuffMetaState, debuffStackState);
        }
        return hasRequiredRotationBuff(rule, activeBuffMetaState, activeBuffStackState);
    });
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

function applyConditionalDebuffsToRotationState(
    skillData,
    activeBuffMetaState,
    activeBuffStackState,
    debuffStackState,
    debuffMetaState,
    buffStackState,
    buffMetaState,
    contextDebuffMetaState = debuffMetaState,
    contextDebuffStackState = debuffStackState
) {
    const matchedRules = getMatchedConditionalRules(skillData, activeBuffMetaState, activeBuffStackState, contextDebuffMetaState, contextDebuffStackState);
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
    const resolvedEffectName = typeof getConsumedDebuffEffectName === "function"
        ? getConsumedDebuffEffectName(effectName)
        : (typeof effectName === "string"
            ? effectName
            : effectName?.effect || effectName?.id || effectName?.appliesEffect || effectName?.name);
    const key = normalizeDebuffKey({
        id: resolvedEffectName
    });
    if (!key) return;
    delete stackState[key];
    delete metaState[key];
}

function resolveSlotModeSkillData(skillData, debuffStackState) {
    let resolvedSkillData = skillData;
    if (typeof resolveSimulationAttributeVariant === "function") {
        resolvedSkillData = resolveSimulationAttributeVariant(resolvedSkillData, resolvedSkillData?.operatorId);
    }
    if (typeof resolveSimulationPhysicalStatusSkill === "function") {
        resolvedSkillData = resolveSimulationPhysicalStatusSkill(resolvedSkillData, debuffStackState);
    }
    return resolvedSkillData;
}

function consumeSlotModeSkillDebuffs(skillData, stackState, metaState) {
    (Array.isArray(skillData?.consumeDebuffs) ? skillData.consumeDebuffs : [])
        .forEach(effect => {
            if (
                typeof shouldConsumeDebuffFromEffectMap === "function" &&
                !shouldConsumeDebuffFromEffectMap(skillData, effect, stackState)
            ) return;
            consumeAllDebuffStacks(effect, stackState, metaState);
        });
}

const ROTATION_ELEMENTAL_INFLICTION_EFFECTS = [
    "electric_infliction",
    "heat_infliction",
    "cryo_infliction",
    "nature_infliction"
];

function getRotationArtsReactionRules() {
    return Array.isArray(ARTS_REACTIONS) ? ARTS_REACTIONS : [];
}

function getRotationArtsReactionEffects() {
    return [
        "arts_reaction",
        ...getRotationArtsReactionRules().flatMap(rule => [rule.appliesEffect, rule.reactionEffect])
    ].filter((effectName, index, values) => effectName && values.indexOf(effectName) === index);
}

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
        for (const reaction of getRotationArtsReactionRules().filter(rule => !rule.triggerEffect)) {
            const canResolve = reaction.requires.every(effectName => (stackState[normalizeDebuffKey({
                id: effectName
            })] || 0) > 0);
            if (!canResolve) continue;
            reaction.requires.forEach(effectName => consumeAllDebuffStacks(effectName, stackState, metaState));
            getRotationArtsReactionEffects().forEach(effectName => consumeAllDebuffStacks(effectName, stackState, metaState));
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
    const reaction = getRotationArtsReactionRules()
        .filter(rule => rule.triggerEffect && (stackState[rule.triggerEffect] || 0) > 0)
        .sort((left, right) => Number(metaState[right.triggerEffect]?.lastAppliedOrder || 0)
            - Number(metaState[left.triggerEffect]?.lastAppliedOrder || 0))[0];

    if (!reaction) return false;

    const latestInfliction = reaction.triggerEffect;
    const latestOrder = Number(metaState[latestInfliction]?.lastAppliedOrder || 0);
    const compatibleEffects = Array.isArray(reaction.requiresAny)
        ? reaction.requiresAny
        : ROTATION_ELEMENTAL_INFLICTION_EFFECTS.filter(key => key !== latestInfliction);
    const previousInflictionKeys = compatibleEffects.filter(key => {
        return (stackState[key] || 0) > 0
            && Number(metaState[key]?.lastAppliedOrder || 0) < latestOrder;
    });

    if (previousInflictionKeys.length === 0) return false;

    ROTATION_ELEMENTAL_INFLICTION_EFFECTS
        .concat(getRotationArtsReactionEffects())
        .forEach(effectName => consumeAllDebuffStacks(effectName, stackState, metaState));
    [reaction.appliesEffect || "arts_reaction", reaction.reactionEffect].forEach(effectName => {
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
    const debuffStackStateBeforeSkill = { ...debuffStackState };
    const debuffMetaStateBeforeSkill = { ...debuffMetaState };

    if (!shouldSkipNormalDebuffs(skillData, activeBuffMetaState, activeBuffStackState)) {
        getVisibleRotationDebuffs(skillData).forEach(effect => {
            if (effect.persistsForCombo !== false) addDebuffToRotationState(effect, debuffStackState, debuffMetaState);
        });
    }
    applyConditionalDebuffsToRotationState(
        skillData,
        activeBuffMetaState,
        activeBuffStackState,
        debuffStackState,
        debuffMetaState,
        buffStackState,
        buffMetaState,
        debuffMetaStateBeforeSkill,
        debuffStackStateBeforeSkill
    );
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

function createRotationLaneSlot(index, lane) {
    const slot = document.createElement("div");
    slot.className = lane === "batk"
        ? "rotation-batk-sequence"
        : "rotation-slot rotation-timeline-slot";
    slot.dataset.index = String(index);
    slot.dataset.lane = lane;
    slot.setAttribute("aria-label", `${lane === "batk" ? "BATK hits" : "Skill"} timeline slot ${index + 1}`);
    return slot;
}

function getTimelineBasicAttackData() {
    const leaderId = Array.isArray(selectedTeam) ? selectedTeam[0] : null;
    if (leaderId === null || leaderId === undefined || typeof getBasicAttackByOperatorId !== "function") return null;
    return getBasicAttackByOperatorId(leaderId);
}

function isFinalStrikeSkillData(skillData) {
    const type = String(skillData?.type || skillData?.baseType || "").toLowerCase();
    const shortType = String(skillData?.shortType || "").toLowerCase();
    return type === "final strike" || shortType === "fs";
}

function isFinalBasicAttackHit(attackData, hit) {
    if (hit?.isFinalStrike === true) return true;
    if (Array.isArray(attackData?.sequences) && attackData.sequences.length > 0) return false;
    return Number(hit?.hit || 0) === Number(attackData?.hitCount || 0);
}

function configureBasicAttackHitMarker(marker, attackData, hit) {
    const isFinalStrikeHit = isFinalBasicAttackHit(attackData, hit);
    const label = document.createElement("span");
    label.className = "rotation-batk-hit-label";
    label.textContent = isFinalStrikeHit
        ? "FS"
        : typeof getBasicAttackTimelineHitLabel === "function"
        ? getBasicAttackTimelineHitLabel(hit)
        : String(hit.hit);
    marker.appendChild(label);

    if (isFinalStrikeHit) {
        marker.classList.add("is-final-strike");
        return;
    }

    marker.classList.add("is-needle-label");
    const sequenceHitCount = Math.max(1, Number(hit?.sequenceHitCount) || 1);
    const hitInSequence = Math.max(1, Number(hit?.hitInSequence) || 1);
    const sequenceIndex = Math.max(1, Number(hit?.sequenceIndex) || Number(hit?.hit) || 1);
    const alternatingIndex = sequenceHitCount > 1 ? hitInSequence : sequenceIndex;
    const level = sequenceHitCount > 1
        ? Math.min(2, Math.floor((hitInSequence - 1) / 2))
        : 0;
    marker.classList.add(alternatingIndex % 2 === 1 ? "is-above-line" : "is-below-line");
    marker.classList.add(`is-level-${level}`);
    if (sequenceHitCount > 1) marker.classList.add("is-sequence-subhit");
}

function getOperatorFinalStrikeSkill(operatorId) {
    const operator = Array.isArray(operators)
        ? operators.find(op => Number(op.id) === Number(operatorId))
        : null;
    if (!operator?.skills) return null;
    return operator.skills.find(isFinalStrikeSkillData) || null;
}

function getFinalStrikeEventEffectMap(sourceOperatorId, contextEffectMap = {}) {
    const finalStrikeSkill = getOperatorFinalStrikeSkill(sourceOperatorId);
    if (finalStrikeSkill && typeof collectEffectsFromSkill === "function") {
        return collectEffectsFromSkill(finalStrikeSkill, contextEffectMap);
    }

    return {
        final_strike: 1
    };
}

function getBasicAttackCycleDuration(attackData, secondsPerSlot) {
    const explicitDuration = Number(attackData?.cycleDuration || attackData?.loopDuration || attackData?.sequenceDuration || attackData?.duration);
    if (Number.isFinite(explicitDuration) && explicitDuration > 0) return explicitDuration;

    const animationDuration = Array.isArray(attackData?.animations)
        ? attackData.animations.reduce((total, animation) => total + Math.max(0, Number(animation?.duration) || 0), 0)
        : 0;
    const lastHitTime = Array.isArray(attackData?.hitTimings)
        ? Math.max(0, ...attackData.hitTimings.map(hit => Number(hit?.time ?? hit) || 0))
        : Number(attackData?.totalDuration || 0) || 0;

    return Math.max(secondsPerSlot, animationDuration, lastHitTime, 0.1);
}

function createRepeatedBasicAttackHits(attackData, index, secondsPerSlot) {
    const root = document.createElement("div");
    root.className = "rotation-batk-hit-sequence";
    if (!attackData?.hasBasicAttackConfig || typeof getBasicAttackHitTimeline !== "function") return root;

    const slotDuration = Math.max(0.1, Number(secondsPerSlot || attackData.secondsPerSlot || DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT));
    const slotStart = index * slotDuration;
    const slotEnd = slotStart + slotDuration;
    const cycleDuration = getBasicAttackCycleDuration(attackData, slotDuration);
    const hits = getBasicAttackHitTimeline(attackData);

    for (let cycleStart = 0; cycleStart < slotEnd; cycleStart += cycleDuration) {
        hits.forEach(hit => {
            const absoluteTime = cycleStart + hit.time;
            if (absoluteTime < slotStart || absoluteTime >= slotEnd) return;

            const marker = document.createElement("span");
            marker.className = "rotation-batk-hit-marker";
            if (hit.finalHitCount > 1) marker.classList.add("is-double");
            const isFinalStrikeHit = isFinalBasicAttackHit(attackData, hit);
            configureBasicAttackHitMarker(marker, attackData, hit);
            const markerPosition = ((absoluteTime - slotStart) / slotDuration) * 100;
            marker.style.left = `${Math.round(markerPosition * 1000) / 1000}%`;
            marker.dataset.hit = String(hit.hit);
            marker.title = `BATK ${isFinalStrikeHit ? "Final Strike" : (hit.sequenceLabel || `Hit ${hit.hit}`)}: ${formatBasicAttackSeconds(absoluteTime)}${hit.sequenceHitCount > 1 ? `, hit ${hit.hitInSequence}/${hit.sequenceHitCount}` : ""}`;
            root.appendChild(marker);
        });
    }

    return root;
}

function getTimelineSecondsPerSlot(attackData) {
    return Math.max(
        0.1,
        Number(attackData?.secondsPerSlot || DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT)
        || DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT
    );
}

function createRotationTimelineStep(index, secondsPerSlot = DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT, options = {}) {
    const showSeconds = options.showSeconds !== false;
    const showBasicAttack = options.showBasicAttack !== false;
    const step = document.createElement("div");
    step.className = "rotation-timeline-step";
    step.dataset.index = String(index);

    if (showSeconds) {
        const marker = document.createElement("div");
        marker.className = "rotation-timeline-step-marker";
        const seconds = index * secondsPerSlot;
        marker.textContent = typeof formatBasicAttackSeconds === "function"
            ? formatBasicAttackSeconds(seconds)
            : `${seconds}s`;
        marker.title = `Timeline ${marker.textContent}`;
        step.appendChild(marker);
    } else {
        const stepNumber = document.createElement("div");
        stepNumber.className = "rotation-step-number";
        stepNumber.textContent = String(index + 1);
        stepNumber.setAttribute("aria-hidden", "true");
        step.appendChild(stepNumber);
    }

    const skillSlot = createRotationLaneSlot(index, "skill");
    step.appendChild(skillSlot);

    const batkSlot = showBasicAttack
        ? createRotationLaneSlot(index, "batk")
        : null;
    if (batkSlot) step.appendChild(batkSlot);

    return {
        step,
        skillSlot,
        batkSlot
    };
}

function createSimulationFinalStrikeSkillData(sourceOperatorId) {
    return {
        id: `simulation-final-strike-${Number(sourceOperatorId)}`,
        name: `${getSimulationOperatorName(sourceOperatorId)} Final Strike`,
        type: "Final Strike",
        shortType: "FS",
        sourceOperatorId: Number(sourceOperatorId),
        buffs: [],
        debuffs: []
    };
}

function createSimulationFinalStrikeStateEvents(sourceOperatorId, finalStrikeTimes) {
    return (Array.isArray(finalStrikeTimes) ? finalStrikeTimes : []).map((time, index) => ({
        kind: "final-strike-state",
        time,
        order: index + 0.5,
        sourceOperatorId,
        skillData: createSimulationFinalStrikeSkillData(sourceOperatorId)
    }));
}

function createSimulationActionRuleProcSkillData(rule, sourceOperatorId) {
    const operator = Array.isArray(operators)
        ? operators.find(candidate => Number(candidate.id) === Number(sourceOperatorId))
        : null;
    const emittedEffects = Array.isArray(rule?.emittedEffects) ? rule.emittedEffects : [];
    return {
        id: `simulation-action-${rule?.ruleKey || "rule"}`,
        name: rule?.name || "Triggered Action",
        description: rule?.description || "",
        type: "Triggered Effect",
        shortType: "PROC",
        operator: operator?.name || getSimulationOperatorName(sourceOperatorId),
        operatorId: Number(sourceOperatorId),
        icon: operator?.icon || "",
        iconSmall: operator?.icon || "",
        elementType: operator?.elementType || "neutral",
        buffs: [],
        debuffs: emittedEffects.map(effect => ({
            id: effect.effect || effect.appliesEffect,
            name: effect.name || effect.effect || effect.appliesEffect,
            appliesEffect: effect.effect || effect.appliesEffect,
            persistsForCombo: effect.persistsForCombo === true,
            transientTrigger: effect.transientTrigger !== false,
            visible: effect.visible === true
        }))
    };
}

function createRotationTimelineConnector(index) {
    const connector = document.createElement("div");
    connector.className = "rotation-timeline-connector";
    connector.dataset.index = String(index);
    connector.setAttribute("aria-hidden", "true");

    const line = document.createElement("span");
    line.className = "rotation-arrow-line";
    const head = document.createElement("span");
    head.className = "rotation-arrow-head";

    connector.append(line, head);
    return connector;
}

function createRotationEmptyDropHint() {
    const hint = document.createElement("div");
    hint.className = "rotation-empty-drop-hint";
    hint.setAttribute("aria-hidden", "true");

    const arrow = document.createElement("span");
    arrow.className = "rotation-empty-drop-hint-arrow";

    const text = document.createElement("span");
    text.className = "rotation-empty-drop-hint-text";
    text.textContent = "Drag a skill here to start";

    hint.append(arrow, text);
    return hint;
}

function createRotationTimelineLabel(text, trackKey = "") {
    const label = document.createElement("div");
    label.className = "rotation-timeline-label";
    label.textContent = text;
    if (trackKey) label.dataset.simulationTrack = trackKey;
    return label;
}

function removeBasicAttackEntriesFromRotation() {
    if (!Array.isArray(rotation) || typeof isBasicAttackEntry !== "function") return;
    const filteredRotation = rotation.filter(entry => !isBasicAttackEntry(entry));
    if (filteredRotation.length === rotation.length) return;
    rotation = filteredRotation.length ? filteredRotation : [null];
    if (typeof localStorage !== "undefined") {
        localStorage.setItem("rotation", JSON.stringify(rotation));
    }
}

function removeRotationEntryAtIndex(index, options = {}) {
    const removeIndex = parseInt(index, 10);
    if (!Array.isArray(rotation) || Number.isNaN(removeIndex) || !rotation[removeIndex]) {
        return false;
    }

    rotation[removeIndex] = null;
    compactRotation();

    if (typeof normalizeQingboMovesInRotation === "function") {
        normalizeQingboMovesInRotation();
    }

    if (options.ensureTrailingSlot && typeof ensureSlotCount === "function") {
        ensureSlotCount(rotation.filter(slot => slot !== null).length + 1);
    }

    if (options.trimTrailingEmptyRows && typeof trimTrailingEmptyRows === "function") {
        trimTrailingEmptyRows();
    }

    saveRotation();

    if (typeof refreshSkillsAfterRotationChange === "function") {
        refreshSkillsAfterRotationChange();
    }

    return true;
}

function isSimulationTimelineMode() {
    return uiSettings?.timelineMode === "simulation";
}

const SIMULATION_PIXELS_PER_SECOND = 120;
const SIMULATION_PIXELS_PER_SECOND_BY_DENSITY = {
    compact: 80,
    normal: 120,
    detailed: 160
};
const SIMULATION_TIMELINE_MIN_ZOOM = 0.2;
const SIMULATION_TIMELINE_MAX_ZOOM = 3;
const SIMULATION_TIMELINE_ZOOM_STEP = 0.25;
const SIMULATION_TIME_STEP = 0.1;
const SIMULATION_RULER_MINOR_STEP = 0.1;
const SIMULATION_RULER_HALF_STEP = 0.5;
const SIMULATION_COOLDOWN_COLORS = [
    "#56d8ff",
    "#f8f546",
    "#ff7a66",
    "#9dff8a"
];
const SIMULATION_COOLDOWN_ROWS = 4;
const SIMULATION_COMBO_COOLDOWN_COLORS = SIMULATION_COOLDOWN_COLORS;
const SIMULATION_COMBO_COOLDOWN_ROWS = SIMULATION_COOLDOWN_ROWS;
const SIMULATION_START_SP = 200;
const SIMULATION_MAX_SP = 300;
const SIMULATION_SP_TRACK_HEIGHT = 58;
const SIMULATION_CURSOR_INTERVAL_MS = 100;
const SIMULATION_TRACK_VISIBILITY_STORAGE_KEY = "rotationforge.simulationTrackVisibility.v1";
const SIMULATION_TRACK_DEFINITIONS = [
    { key: "battle", label: "Battle Skills", group: "Actions", description: "Placed Battle Skills and Ultimates." },
    { key: "events", label: "Combat Events", group: "Actions", description: "Manual enemy attacks, HP thresholds and environmental triggers." },
    { key: "combo", label: "Combo Skills", group: "Actions", description: "Triggered Combo Skills." },
    { key: "batk", label: "Basic Attacks", group: "Actions", description: "Basic-attack timing and final strikes." },
    { key: "sp", label: "SP", group: "Resources", description: "SP generation, costs and recovery." },
    { key: "atk", label: "ATK", group: "Resources", description: "Effective ATK for every operator." },
    { key: "damage", label: "DMG", group: "Resources", description: "Damage events across the rotation." },
    { key: "buffs", label: "Buffs", group: "Effects", description: "Active positive effects and their duration." },
    { key: "debuffs", label: "Debuffs", group: "Effects", description: "Active enemy effects and their duration." },
    { key: "comboCooldown", label: "Combo Cooldowns", group: "Cooldowns", description: "Combo Skill cooldown windows." }
];
const SIMULATION_TRACK_ROW_VARIABLES = {
    ruler: "--rotation-sim-row-ruler",
    battle: "--rotation-sim-row-battle",
    events: "--rotation-sim-row-events",
    sp: "--rotation-sim-row-sp",
    atk: "--rotation-sim-row-atk",
    damage: "--rotation-sim-row-damage",
    buffs: "--rotation-sim-row-buffs",
    debuffs: "--rotation-sim-row-debuffs",
    combo: "--rotation-sim-row-combo",
    comboCooldown: "--rotation-sim-row-combo-cooldown",
    batk: "--rotation-sim-row-batk"
};
const SIMULATION_LOG_FILTERS = [
    { key: "all", label: "All" },
    { key: "bs", label: "BS" },
    { key: "cs", label: "CS" },
    { key: "sp", label: "SP" },
    { key: "trigger", label: "Trigger" },
    { key: "cooldown", label: "Cooldown" },
    { key: "warning", label: "Warnings" }
];
const SIMULATION_PROBLEM_CHIPS = [
    { key: "warning", label: "Warnings", type: "warning" },
    { key: "missing-sp", label: "Missing SP", type: "danger" },
    { key: "cooldown", label: "Cooldown blocked", type: "warning" },
    { key: "trigger", label: "Auto triggers", type: "info" },
    { key: "sp", label: "SP changes", type: "info" }
];
let simulationCursorTime = 0;
let simulationCursorPlaybackTimer = null;
let simulationCursorKeyboardHandler = null;
let simulationTimelineZoom = 1;
let expandedSimulationSkillCluster = null;
let simulationTimelineViewportRestore = null;
let simulationFocusResizeObserver = null;
let simulationFocusResizeFrame = null;
let simulationTrackVisibility = null;
let simulationTrackModalPreviousFocus = null;

function getDefaultSimulationTrackVisibility() {
    return Object.fromEntries(SIMULATION_TRACK_DEFINITIONS.map(track => [track.key, true]));
}

function loadSimulationTrackVisibility() {
    if (simulationTrackVisibility) return simulationTrackVisibility;
    const defaults = getDefaultSimulationTrackVisibility();
    try {
        const stored = JSON.parse(localStorage.getItem(SIMULATION_TRACK_VISIBILITY_STORAGE_KEY) || "null");
        simulationTrackVisibility = Object.fromEntries(
            SIMULATION_TRACK_DEFINITIONS.map(track => [track.key, stored?.[track.key] !== false])
        );
    } catch (error) {
        simulationTrackVisibility = defaults;
    }
    return simulationTrackVisibility;
}

function saveSimulationTrackVisibility() {
    try {
        localStorage.setItem(
            SIMULATION_TRACK_VISIBILITY_STORAGE_KEY,
            JSON.stringify(loadSimulationTrackVisibility())
        );
    } catch (error) {
        // Track visibility remains available for the current session.
    }
}

function isSimulationTrackVisible(trackKey) {
    if (trackKey === "ruler") return true;
    return loadSimulationTrackVisibility()[trackKey] !== false;
}

function getSimulationTrackRowToken(element, trackKey) {
    const explicitSize = String(element?.dataset?.simulationTrackSize || "").trim();
    if (explicitSize) return explicitSize;
    const variable = SIMULATION_TRACK_ROW_VARIABLES[trackKey];
    return variable ? `var(${variable})` : "auto";
}

function updateSimulationTrackButtons() {
    const visibility = loadSimulationTrackVisibility();
    const visibleCount = SIMULATION_TRACK_DEFINITIONS.filter(track => visibility[track.key] !== false).length;
    document.querySelectorAll(".rotation-sim-track-button").forEach(button => {
        button.textContent = `Tracks ${visibleCount}/${SIMULATION_TRACK_DEFINITIONS.length}`;
        button.setAttribute(
            "aria-label",
            `Choose visible timeline tracks. ${visibleCount} of ${SIMULATION_TRACK_DEFINITIONS.length} tracks are visible.`
        );
    });
    const count = document.querySelector(".simulation-track-count");
    if (count) count.textContent = `${visibleCount} of ${SIMULATION_TRACK_DEFINITIONS.length} visible`;
}

function applySimulationTrackLayout(labels = document.querySelector(".rotation-sim-labels"), body = document.querySelector(".rotation-sim-body")) {
    [labels, body].filter(Boolean).forEach(parent => {
        const rowElements = Array.from(parent.children).filter(element => element.dataset?.simulationTrack);
        rowElements.forEach(element => {
            element.hidden = !isSimulationTrackVisible(element.dataset.simulationTrack);
        });
        const visibleRows = rowElements.filter(element => !element.hidden);
        parent.style.gridTemplateRows = visibleRows
            .map(element => getSimulationTrackRowToken(element, element.dataset.simulationTrack))
            .join(" ");
    });
    updateSimulationTrackButtons();
}

function refreshSimulationTrackModal() {
    const modal = document.getElementById("simulationTrackModal");
    if (!modal) return;
    const visibility = loadSimulationTrackVisibility();
    modal.querySelectorAll("input[data-simulation-track-toggle]").forEach(input => {
        input.checked = visibility[input.dataset.simulationTrackToggle] !== false;
    });
    updateSimulationTrackButtons();
}

function closeSimulationTrackModal() {
    const modal = document.getElementById("simulationTrackModal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    if (simulationTrackModalPreviousFocus?.isConnected) simulationTrackModalPreviousFocus.focus();
    simulationTrackModalPreviousFocus = null;
}

function ensureSimulationTrackModal() {
    let modal = document.getElementById("simulationTrackModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "simulationTrackModal";
    modal.className = "settings-modal simulation-track-modal";
    modal.setAttribute("aria-hidden", "true");

    const dialog = document.createElement("div");
    dialog.className = "settings-dialog simulation-track-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "simulationTrackModalTitle");

    const header = document.createElement("div");
    header.className = "settings-header";
    const headingWrap = document.createElement("div");
    const eyebrow = document.createElement("span");
    eyebrow.className = "simulation-track-eyebrow";
    eyebrow.textContent = "Timeline layout";
    const title = document.createElement("h2");
    title.id = "simulationTrackModalTitle";
    title.className = "settings-title";
    title.textContent = "Visible tracks";
    headingWrap.append(eyebrow, title);
    const closeButton = document.createElement("button");
    closeButton.className = "settings-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close track selection");
    closeButton.textContent = "\u00d7";
    header.append(headingWrap, closeButton);

    const intro = document.createElement("div");
    intro.className = "simulation-track-intro";
    const introText = document.createElement("p");
    introText.textContent = "Choose which rows are shown. Buff and debuff rows display when an effect starts, refreshes and expires.";
    const count = document.createElement("strong");
    count.className = "simulation-track-count";
    intro.append(introText, count);

    const groups = document.createElement("div");
    groups.className = "simulation-track-groups";
    [...new Set(SIMULATION_TRACK_DEFINITIONS.map(track => track.group))].forEach(groupName => {
        const section = document.createElement("section");
        section.className = "simulation-track-group";
        const groupTitle = document.createElement("h3");
        groupTitle.textContent = groupName;
        const options = document.createElement("div");
        options.className = "simulation-track-options";
        SIMULATION_TRACK_DEFINITIONS.filter(track => track.group === groupName).forEach(track => {
            const option = document.createElement("label");
            option.className = "simulation-track-option";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.dataset.simulationTrackToggle = track.key;
            const indicator = document.createElement("span");
            indicator.className = "simulation-track-toggle";
            indicator.setAttribute("aria-hidden", "true");
            const copy = document.createElement("span");
            copy.className = "simulation-track-option-copy";
            const optionTitle = document.createElement("strong");
            optionTitle.textContent = track.label;
            const description = document.createElement("span");
            description.textContent = track.description;
            copy.append(optionTitle, description);
            option.append(input, indicator, copy);
            input.addEventListener("change", () => {
                loadSimulationTrackVisibility()[track.key] = input.checked;
                saveSimulationTrackVisibility();
                applySimulationTrackLayout();
                refreshSimulationTrackModal();
            });
            options.appendChild(option);
        });
        section.append(groupTitle, options);
        groups.appendChild(section);
    });

    const actions = document.createElement("div");
    actions.className = "simulation-track-actions";
    const showAllButton = document.createElement("button");
    showAllButton.type = "button";
    showAllButton.className = "simulation-track-action is-secondary";
    showAllButton.textContent = "Show all";
    const doneButton = document.createElement("button");
    doneButton.type = "button";
    doneButton.className = "simulation-track-action is-primary";
    doneButton.textContent = "Done";
    actions.append(showAllButton, doneButton);

    dialog.append(header, intro, groups, actions);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    closeButton.addEventListener("click", closeSimulationTrackModal);
    doneButton.addEventListener("click", closeSimulationTrackModal);
    showAllButton.addEventListener("click", () => {
        simulationTrackVisibility = getDefaultSimulationTrackVisibility();
        saveSimulationTrackVisibility();
        applySimulationTrackLayout();
        refreshSimulationTrackModal();
    });
    modal.addEventListener("click", event => {
        if (event.target === modal) closeSimulationTrackModal();
    });
    document.addEventListener("keydown", event => {
        if (!modal.classList.contains("open") || event.key !== "Escape") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        closeSimulationTrackModal();
    }, true);
    return modal;
}

function openSimulationTrackModal() {
    const modal = ensureSimulationTrackModal();
    simulationTrackModalPreviousFocus = document.activeElement;
    refreshSimulationTrackModal();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    modal.querySelector(".settings-close")?.focus();
}

window.applySimulationTrackLayout = applySimulationTrackLayout;
window.openSimulationTrackModal = openSimulationTrackModal;

function updateSimulationFocusStickyOffsets() {
    const root = document.documentElement;
    const nav = document.querySelector(".top");
    const quickSkills = document.querySelector(".rotation-quick-skills:not([hidden])");
    const focusBar = document.querySelector(".rotation-sim-focus-bar");
    const timelineControls = document.querySelector(".rotation-sim-timeline-controls");
    const compactBar = document.querySelector(".rotation-sim-focus-compact-bar");
    const active = root.classList.contains("simulation-timeline-focus");
    const collapsed = active && root.classList.contains("simulation-focus-controls-collapsed");
    const measureHeight = element => element ? Math.ceil(element.getBoundingClientRect().height) : 0;

    root.style.setProperty("--simulation-focus-nav-height", `${collapsed ? 0 : (measureHeight(nav) || 56)}px`);
    root.style.setProperty("--simulation-focus-quick-height", `${active && !collapsed ? measureHeight(quickSkills) : 0}px`);
    root.style.setProperty("--simulation-focus-bar-height", `${active ? measureHeight(focusBar) : 0}px`);
    root.style.setProperty("--simulation-focus-controls-height", `${active && !collapsed ? measureHeight(timelineControls) : 0}px`);
    root.style.setProperty("--simulation-focus-compact-height", `${collapsed ? measureHeight(compactBar) : 0}px`);
}

function scheduleSimulationFocusStickyOffsets() {
    if (simulationFocusResizeFrame !== null) window.cancelAnimationFrame(simulationFocusResizeFrame);
    simulationFocusResizeFrame = window.requestAnimationFrame(() => {
        simulationFocusResizeFrame = null;
        updateSimulationFocusStickyOffsets();
    });
}

function observeSimulationFocusLayout() {
    simulationFocusResizeObserver?.disconnect();
    simulationFocusResizeObserver = null;
    if (typeof ResizeObserver === "undefined") {
        scheduleSimulationFocusStickyOffsets();
        return;
    }

    simulationFocusResizeObserver = new ResizeObserver(scheduleSimulationFocusStickyOffsets);
    [
        document.querySelector(".top"),
        document.querySelector(".rotation-quick-skills:not([hidden])"),
        document.querySelector(".rotation-sim-timeline-controls"),
        document.querySelector(".rotation-sim-focus-compact-bar"),
        document.querySelector(".rotation-sim-focus-bar"),
        document.querySelector(".rotation-sim-cursor-toolbar")
    ].filter(Boolean).forEach(element => simulationFocusResizeObserver.observe(element));
    scheduleSimulationFocusStickyOffsets();
}

window.scheduleSimulationFocusStickyOffsets = scheduleSimulationFocusStickyOffsets;
window.addEventListener("resize", scheduleSimulationFocusStickyOffsets);

function scrollSimulationFocusControlsIntoView() {
    const alignControls = () => {
        const scrollingElement = document.scrollingElement || document.documentElement;
        if (!scrollingElement || !document.documentElement.classList.contains("simulation-timeline-focus")) return;
        scrollingElement.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
        window.scrollTo({ top: 0, left: window.scrollX || 0, behavior: "auto" });
    };

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(alignControls);
    });
    window.setTimeout(alignControls, 120);
}

function setSimulationTimelineFocusMode(enabled) {
    const active = Boolean(enabled) && isSimulationTimelineMode();
    if (typeof uiSettings !== "undefined") {
        uiSettings.simulationFocusMode = active;
        if (typeof saveUiSettings === "function") saveUiSettings();
    }
    document.documentElement.classList.toggle("simulation-timeline-focus", active);
    document.documentElement.classList.toggle(
        "simulation-focus-controls-collapsed",
        active && Boolean(uiSettings?.simulationFocusControlsCollapsed)
    );
    document.querySelectorAll(".rotation-sim-focus-button").forEach(button => {
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
        button.setAttribute("aria-label", active ? "Exit timeline focus" : "Focus timeline");
        button.textContent = active ? "Exit focus" : "Enter focus";
        button.title = active ? "Exit timeline focus (Esc)" : "Focus timeline";
    });
    document.querySelectorAll(".rotation-sim-focus-description").forEach(description => {
        description.textContent = active
            ? "Timeline focus is active. Press Esc or use the button to restore all panels."
            : "Hide menus, combat stats and analysis to give the timeline more room.";
    });
    scheduleSimulationFocusStickyOffsets();
    if (active) scrollSimulationFocusControlsIntoView();
}

function setSimulationFocusControlsCollapsed(collapsed) {
    const active = document.documentElement.classList.contains("simulation-timeline-focus");
    const nextCollapsed = active && Boolean(collapsed);
    if (typeof uiSettings !== "undefined") {
        uiSettings.simulationFocusControlsCollapsed = nextCollapsed;
        if (typeof saveUiSettings === "function") saveUiSettings();
    }
    document.documentElement.classList.toggle("simulation-focus-controls-collapsed", nextCollapsed);
    scheduleSimulationFocusStickyOffsets();
    if (nextCollapsed) scrollSimulationFocusControlsIntoView();
}

function applySimulationLayoutPreferences() {
    simulationTimelineZoom = clampSimulationTimelineZoom(uiSettings?.simulationTimelineZoom ?? 1);
    const focusActive = isSimulationTimelineMode() && Boolean(uiSettings?.simulationFocusMode);
    document.documentElement.classList.toggle("simulation-timeline-focus", focusActive);
    document.documentElement.classList.toggle(
        "simulation-focus-controls-collapsed",
        focusActive && Boolean(uiSettings?.simulationFocusControlsCollapsed)
    );
    scheduleSimulationFocusStickyOffsets();
}

function resetSimulationLayoutPreferences() {
    if (typeof uiSettings !== "undefined") {
        uiSettings.simulationTimelineZoom = 1;
        uiSettings.simulationFocusMode = false;
        uiSettings.simulationFocusControlsCollapsed = false;
        uiSettings.simulationQuickSkillsCollapsed = false;
        if (typeof saveUiSettings === "function") saveUiSettings();
    }
    simulationTimelineZoom = 1;
    expandedSimulationSkillCluster = null;
    document.documentElement.classList.remove("simulation-timeline-focus");
    document.documentElement.classList.remove("simulation-focus-controls-collapsed");
    if (typeof renderSkills === "function") renderSkills();
    renderRotation();
}

function clampSimulationTimelineZoom(value) {
    const zoom = Number(value);
    if (!Number.isFinite(zoom)) return 1;
    return Math.max(SIMULATION_TIMELINE_MIN_ZOOM, Math.min(SIMULATION_TIMELINE_MAX_ZOOM, zoom));
}

function getSimulationBasePixelsPerSecond() {
    const density = uiSettings?.simulationTimelineDensity || "normal";
    return SIMULATION_PIXELS_PER_SECOND_BY_DENSITY[density] || SIMULATION_PIXELS_PER_SECOND;
}

function getSimulationPixelsPerSecond() {
    return getSimulationBasePixelsPerSecond() * simulationTimelineZoom;
}

function setSimulationTimelineZoom(value, options = {}) {
    const nextZoom = clampSimulationTimelineZoom(value);
    const scrollArea = options.scrollArea || document.querySelector(".rotation-sim-track-scroll");
    const oldPixelsPerSecond = getSimulationPixelsPerSecond();
    if (Math.abs(nextZoom - simulationTimelineZoom) < 0.001 && !options.force) return false;

    const labelWidth = Math.max(0, scrollArea?.querySelector(".rotation-sim-labels")?.getBoundingClientRect?.().width || 104);
    const viewportX = Number.isFinite(Number(options.viewportX))
        ? Number(options.viewportX)
        : Math.max(labelWidth, Number(scrollArea?.clientWidth || 0) * 0.5);
    const anchorTime = Number.isFinite(Number(options.anchorTime))
        ? Math.max(0, Number(options.anchorTime))
        : Math.max(0, (Number(scrollArea?.scrollLeft || 0) + viewportX - labelWidth) / oldPixelsPerSecond);

    simulationTimelineZoom = nextZoom;
    if (!options.keepExpandedCluster) expandedSimulationSkillCluster = null;
    if (typeof uiSettings !== "undefined") {
        uiSettings.simulationTimelineZoom = Math.round(nextZoom * 1000) / 1000;
        if (typeof saveUiSettings === "function") saveUiSettings();
    }
    simulationTimelineViewportRestore = options.fit
        ? { scrollLeft: 0 }
        : { anchorTime, viewportX, labelWidth };
    renderRotation();
    return true;
}

function fitSimulationTimelineToViewport(scrollArea, durationSeconds) {
    if (!scrollArea) return false;
    const labelWidth = Math.max(0, scrollArea.querySelector(".rotation-sim-labels")?.getBoundingClientRect?.().width || 104);
    const availableWidth = Math.max(1, scrollArea.clientWidth - labelWidth - 8);
    const fitZoom = availableWidth / (Math.max(0.1, Number(durationSeconds) || 0.1) * getSimulationBasePixelsPerSecond());
    return setSimulationTimelineZoom(fitZoom, { scrollArea, fit: true, force: true });
}

function roundSimulationTime(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.round(number / SIMULATION_TIME_STEP) * SIMULATION_TIME_STEP);
}

function getRotationEntryTime(entry, index, secondsPerSlot) {
    if (Number.isFinite(Number(entry?.time))) return Number(entry.time);
    return index * secondsPerSlot;
}

function isComboSkillData(skillData) {
    const type = String(skillData?.type || "").toLowerCase();
    const shortType = String(skillData?.shortType || "").toLowerCase();
    return type === "combo skill" || shortType === "cs";
}

function isBattleSkillData(skillData) {
    const type = String(skillData?.type || "").toLowerCase();
    const shortType = String(skillData?.shortType || "").toLowerCase();
    return type === "battle skill" || shortType === "bs";
}

function isUltimateSkillData(skillData) {
    const type = String(skillData?.type || "").toLowerCase();
    const shortType = String(skillData?.shortType || "").toLowerCase();
    return type.includes("ultimate") || shortType === "ult" || shortType === "u";
}

function isSimulationTriggerEventData(skillData) {
    const type = String(skillData?.type || "").toLowerCase();
    const shortType = String(skillData?.shortType || "").toLowerCase();
    return skillData?.simulationOnly === true || type === "combat event" || shortType === "evt";
}

function getSimulationSkillLane(skillData) {
    if (isSimulationTriggerEventData(skillData)) return "event";
    if (isComboSkillData(skillData)) return "combo";
    if (isBattleSkillData(skillData)) return "battle";
    return "battle";
}

function getSimulationSpPerSecond() {
    const configuredValue = Number(uiSettings?.simulationSpPerSecond);
    if (Number.isFinite(configuredValue) && configuredValue >= 0) return configuredValue;

    if (typeof DEFAULT_SIMULATION_SP_PER_SECOND !== "undefined") {
        return DEFAULT_SIMULATION_SP_PER_SECOND;
    }

    return 10;
}

function getSimulationBattleSkillSpCost(skillData) {
    if (!isBattleSkillData(skillData)) return null;

    if (typeof getBattleSkillSpCost === "function") {
        return getBattleSkillSpCost(skillData);
    }

    const value = skillData?.sp_cost ?? skillData?.spCost ?? skillData?.sp ?? skillData?.energy;
    const cost = Number(value);
    return Number.isFinite(cost) ? cost : null;
}

function formatSimulationSpValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    if (Math.abs(number - Math.round(number)) < 0.001) return String(Math.round(number));
    return String(Math.round(number * 10) / 10);
}

function getSimulationSpTransaction(before, cost) {
    const available = Math.max(0, Number(before) || 0);
    const required = Math.max(0, Number(cost) || 0);
    const affordable = available + 0.001 >= required;
    return {
        before: available,
        cost: required,
        after: affordable ? available - required : available,
        affordable,
        missing: affordable ? 0 : required - available
    };
}

function normalizeSimulationEffectKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function getSimulationEffectStackCount(event, effectNames, phase = "before") {
    const names = (Array.isArray(effectNames) ? effectNames : [effectNames])
        .map(normalizeSimulationEffectKey)
        .filter(Boolean);
    if (names.length === 0) return 0;

    const effectSources = phase === "after"
        ? [event.activeDebuffs, event.activeBuffs]
        : [event.activeDebuffsBefore, event.activeBuffsBefore, event.activeDebuffs, event.activeBuffs];

    return effectSources.reduce((max, effects) => {
        if (!Array.isArray(effects)) return max;
        return effects.reduce((innerMax, effect) => {
            const key = normalizeSimulationEffectKey(effect?.appliesEffect || effect?.id || effect?.name);
            if (!names.includes(key)) return innerMax;
            const stacks = Number(effect?.currentStacks ?? effect?.stackCount ?? effect?.stacks ?? 1);
            return Math.max(innerMax, Number.isFinite(stacks) ? stacks : 1);
        }, max);
    }, 0);
}

function getSimulationSpRecoveryConfigs(skillData) {
    const configs = [];
    const directValue = skillData?.sp_gain ?? skillData?.spGain ?? skillData?.sp_recovery ?? skillData?.spRecovery;

    if (Array.isArray(directValue)) {
        configs.push(...directValue);
    } else if (directValue !== undefined && directValue !== null) {
        configs.push(directValue);
    }

    const effectRecoveryConfigs = [
        ...(Array.isArray(skillData?.buffs) ? skillData.buffs : []),
        ...(Array.isArray(skillData?.debuffs) ? skillData.debuffs : [])
    ]
        .filter(effect => effect?.appliesEffect === "sp_recovery" || effect?.id === "sp_recovery" || effect?.spRecovery || effect?.sp_gain || effect?.spGain)
        .map(effect => effect.spRecovery ?? effect.sp_gain ?? effect.spGain ?? effect.amount)
        .filter(value => value !== undefined && value !== null);

    configs.push(...effectRecoveryConfigs);
    return configs;
}

function getSimulationStackBasedSpRecovery(config, event) {
    const effectNames = config.effect ?? config.effects ?? config.perStackEffect ?? config.requiresEffect;
    const stacks = getSimulationEffectStackCount(event, effectNames, config.phase || "before");
    const fallbackStacks = Number(config.fallbackStacks || 0);
    const usedStacks = Math.max(stacks, fallbackStacks);

    if (usedStacks <= 0) return 0;

    const amountByStacks = config.amountByStacks || config.amountsByStacks || config.stackAmounts;
    if (amountByStacks) {
        const stackKey = String(Math.min(usedStacks, Number(config.maxStacks || usedStacks)));
        const amount = Number(amountByStacks[stackKey] ?? amountByStacks[usedStacks]);
        return Number.isFinite(amount) ? amount : 0;
    }

    const amountPerStack = Number(config.amountPerStack || config.spPerStack || 0);
    if (!Number.isFinite(amountPerStack) || amountPerStack <= 0) return 0;

    const maxStacks = Number(config.maxStacks || usedStacks);
    return Math.min(usedStacks, maxStacks) * amountPerStack;
}

function getSimulationSkillSpRecovery(skillData, event) {
    const configs = getSimulationSpRecoveryConfigs(skillData);

    return configs.reduce((total, config) => {
        if (typeof config === "number" || typeof config === "string") {
            const amount = Number(config);
            return total + (Number.isFinite(amount) ? amount : 0);
        }

        if (!config || typeof config !== "object") return total;

        if (config.requiresEffect && getSimulationEffectStackCount(event, config.requiresEffect, config.phase || "before") <= 0) {
            return total;
        }

        const stackAmount = getSimulationStackBasedSpRecovery(config, event);
        if (stackAmount > 0) return total + stackAmount;

        const amount = Number(config.amount ?? config.value ?? config.sp ?? config.gain ?? 0);
        return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
}

function createSvgElement(tagName) {
    return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function getSimulationSkillData(entry) {
    return typeof getRotationActionData === "function"
        ? getRotationActionData(entry)
        : getSkillById(entry.id);
}

function getSimulationSourceOperatorId(skillData) {
    if (!skillData?.id || typeof getOperatorBySkillId !== "function") return null;
    return getOperatorBySkillId(skillData.id)?.id ?? null;
}

function getSimulationEventOperatorId(event) {
    const explicitId = Number(event?.sourceOperatorId);
    return Number.isFinite(explicitId) ? explicitId : getSimulationSourceOperatorId(event?.skillData);
}

function getSimulationOperatorName(operatorId) {
    const operator = Array.isArray(operators)
        ? operators.find(op => Number(op.id) === Number(operatorId))
        : null;
    return operator?.name || "Operator";
}

function enrichSimulationSkillEventsWithLoadouts(events) {
    if (typeof getOperatorSimulationLoadoutStats !== "function") return events;

    return events.map(event => {
        const operatorId = getSimulationEventOperatorId(event);
        return {
            ...event,
            loadoutState: operatorId === null ? null : getOperatorSimulationLoadoutStats(operatorId)
        };
    });
}

function formatSimulationLoadoutValue(value, isPercent = false) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "-";
    return `${numericValue > 0 ? "+" : ""}${numericValue}${isPercent ? "%" : ""}`;
}

function createSimulationLoadoutSummary() {
    const loadouts = (Array.isArray(selectedTeam) ? selectedTeam : [])
        .filter(operatorId => operatorId !== null && operatorId !== undefined)
        .map(operatorId => typeof getOperatorSimulationLoadoutStats === "function"
            ? getOperatorSimulationLoadoutStats(operatorId)
            : null)
        .filter(Boolean);
    if (loadouts.length === 0) return null;

    const root = document.createElement("section");
    root.className = "rotation-sim-loadout-summary";
    root.setAttribute("aria-label", "Active simulation loadouts");

    const label = document.createElement("div");
    label.className = "rotation-sim-loadout-summary-label";
    const labelTop = document.createElement("span");
    labelTop.textContent = "Active loadouts";
    const labelTitle = document.createElement("strong");
    labelTitle.textContent = "Combat stats";
    label.append(labelTop, labelTitle);
    root.appendChild(label);

    loadouts.forEach(loadout => {
        const card = document.createElement("div");
        card.className = "rotation-sim-loadout-card";

        const identity = document.createElement("div");
        identity.className = "rotation-sim-loadout-card-identity";
        if (loadout.weaponIcon) {
            const weaponIcon = document.createElement("img");
            weaponIcon.className = "rotation-sim-loadout-weapon-icon";
            weaponIcon.src = loadout.weaponIcon;
            weaponIcon.alt = "";
            weaponIcon.loading = "lazy";
            identity.appendChild(weaponIcon);
        }
        const heading = document.createElement("div");
        const operatorName = document.createElement("strong");
        operatorName.textContent = getSimulationOperatorName(loadout.operatorId);
        const weaponName = document.createElement("span");
        weaponName.textContent = `${loadout.weaponName} / P${loadout.potential}`;
        heading.append(operatorName, weaponName);
        identity.appendChild(heading);

        const stats = document.createElement("div");
        stats.className = "rotation-sim-loadout-card-stats";
        const attack = document.createElement("strong");
        attack.textContent = `${loadout.totalAtk} ATK`;
        stats.appendChild(attack);
        const crit = document.createElement("span");
        const critRatePercent = Number.isFinite(Number(loadout.critRatePercent))
            ? Number(loadout.critRatePercent)
            : 5;
        const critDamagePercent = Number.isFinite(Number(loadout.critDamagePercent))
            ? Number(loadout.critDamagePercent)
            : 50;
        crit.textContent = `CR ${critRatePercent}% / CD +${critDamagePercent}%`;
        crit.title = `Critical Rate ${critRatePercent}% / Critical DMG +${critDamagePercent}%`;
        stats.appendChild(crit);
        if (loadout.mainAttributeBonus) {
            const attribute = document.createElement("span");
            attribute.textContent = `${loadout.mainAttributeBonus.label} ${formatSimulationLoadoutValue(loadout.mainAttributeBonus.value, loadout.mainAttributeBonus.isPercent)}`;
            stats.appendChild(attribute);
        }
        if (loadout.passive?.name) {
            const passive = document.createElement("span");
            passive.textContent = `${loadout.passive.name} R${loadout.passive.rank}`;
            passive.title = loadout.passive.description || loadout.passive.name;
            stats.appendChild(passive);
        }
        card.append(identity, stats);
        root.appendChild(card);
    });

    return root;
}

function addSimulationEffectsToMap(effectMap, effects) {
    Object.entries(effects || {}).forEach(([effectName, amount]) => {
        if (typeof addAmountToEffectMap === "function") {
            addAmountToEffectMap(effectMap, effectName, amount);
        } else {
            effectMap[effectName] = Number(effectMap[effectName] || 0) + Number(amount || 0);
        }
    });
}

function replaceSimulationEffectMap(target, source) {
    Object.keys(target).forEach(key => delete target[key]);
    Object.assign(target, source);
}

function resolveSimulationComboEffectMap(effectMap, latestEffectNames = []) {
    return typeof resolveArtsReactions === "function"
        ? resolveArtsReactions(effectMap, latestEffectNames)
        : effectMap;
}

function getSimulationTriggerEffectMap(currentEffects, persistentEffectMap) {
    const triggerMap = { ...persistentEffectMap };
    addSimulationEffectsToMap(triggerMap, currentEffects);
    return resolveSimulationComboEffectMap(triggerMap, Object.keys(currentEffects || {}));
}

function getSimulationCurrentTriggerEffectMap(currentEffects, persistentEffectMap) {
    const currentTriggerMap = { ...(currentEffects || {}) };
    const resolvedCurrentMap = getSimulationTriggerEffectMap(currentEffects, persistentEffectMap);
    const resolvedPersistentMap = resolveSimulationComboEffectMap({ ...(persistentEffectMap || {}) }, []);

    Object.entries(resolvedCurrentMap).forEach(([effectName, amount]) => {
        const currentAmount = Number(currentEffects?.[effectName] || 0);
        const persistentAmount = Number(resolvedPersistentMap?.[effectName] || 0);
        const resolvedAmount = Number(amount || 0);

        if (currentAmount > 0 || resolvedAmount > persistentAmount) {
            currentTriggerMap[effectName] = Math.max(
                Number(currentTriggerMap[effectName] || 0),
                Math.max(1, resolvedAmount)
            );
        }
    });

    return currentTriggerMap;
}

function getSimulationComboTriggerDefinitions(skillData) {
    if (typeof normalizeComboTriggerDefinitions === "function") {
        return normalizeComboTriggerDefinitions(skillData);
    }

    const configuredTriggers = skillData?.comboTriggers;
    if (Array.isArray(configuredTriggers)) return configuredTriggers;
    if (typeof configuredTriggers === "string" && configuredTriggers.trim()) {
        return [{ effect: configuredTriggers.trim(), minStacks: 1 }];
    }
    if (configuredTriggers && typeof configuredTriggers === "object") {
        return [configuredTriggers];
    }
    return skillData?.comboTrigger
        ? [{ effect: skillData.comboTrigger, minStacks: 1 }]
        : [];
}

function simulationTriggerHasCurrentEffect(trigger, currentEffectMap) {
    if (typeof trigger === "string") return Number(currentEffectMap?.[trigger] || 0) >= 1;
    if (!trigger || typeof trigger !== "object") return false;

    if (Array.isArray(trigger.anyOf)) {
        return trigger.anyOf.some(option => simulationTriggerHasCurrentEffect(option, currentEffectMap));
    }

    if (Array.isArray(trigger.allOf)) {
        return trigger.allOf.some(option => simulationTriggerHasCurrentEffect(option, currentEffectMap));
    }

    if (Array.isArray(trigger.noneOf)) return false;

    const effectName = trigger.effect;
    const minStacks = Number(trigger.minStacks || 1);
    return Number(currentEffectMap?.[effectName] || 0) >= minStacks;
}

function hasSimulationCurrentComboTrigger(skillData, currentEffectMap) {
    if (skillData?.allowPersistentTrigger === true) return true;
    return getSimulationComboTriggerDefinitions(skillData)
        .some(trigger => simulationTriggerHasCurrentEffect(trigger, currentEffectMap));
}

function collectSimulationCurrentTriggerEffectNames(trigger, currentEffectMap, result = []) {
    if (typeof trigger === "string") {
        if (Number(currentEffectMap?.[trigger] || 0) >= 1) result.push(trigger);
        return result;
    }

    if (!trigger || typeof trigger !== "object") return result;

    if (Array.isArray(trigger.anyOf)) {
        trigger.anyOf.forEach(option => collectSimulationCurrentTriggerEffectNames(option, currentEffectMap, result));
        return result;
    }

    if (Array.isArray(trigger.allOf)) {
        trigger.allOf.forEach(option => collectSimulationCurrentTriggerEffectNames(option, currentEffectMap, result));
        return result;
    }

    if (Array.isArray(trigger.noneOf)) return result;

    const effectName = trigger.effect;
    const minStacks = Number(trigger.minStacks || 1);
    if (effectName && Number(currentEffectMap?.[effectName] || 0) >= minStacks) {
        result.push(effectName);
    }

    return result;
}

function getSimulationCurrentTriggerEffectNames(skillData, currentEffectMap) {
    return [...new Set(
        getSimulationComboTriggerDefinitions(skillData)
            .flatMap(trigger => collectSimulationCurrentTriggerEffectNames(trigger, currentEffectMap, []))
    )];
}

function getSimulationComboSkillsFromEffects(effectMap, currentEffectMap, sourceOperatorId) {
    return getComboSkillsFromEffects(effectMap, sourceOperatorId)
        .filter(comboSkill => hasSimulationCurrentComboTrigger(comboSkill, currentEffectMap));
}

function collectSimulationChainEffectsFromSkill(skillData, contextEffectMap = {}) {
    const effectMap = {};
    if (!skillData) return effectMap;

    if (typeof applySkillEffectsToComboMap === "function") {
        applySkillEffectsToComboMap(skillData, effectMap, true, true, contextEffectMap);
        if (typeof addConsumedDebuffTriggersForSkill === "function") {
            addConsumedDebuffTriggersForSkill(skillData, effectMap, contextEffectMap);
        }
    } else if (typeof collectEffectsFromSkill === "function") {
        addSimulationEffectsToMap(effectMap, collectEffectsFromSkill(skillData, contextEffectMap));
    }

    if (typeof addTransientSkillTypeTriggers === "function") {
        addTransientSkillTypeTriggers(skillData, effectMap);
    }

    return effectMap;
}

function applySimulationSkillToPersistentComboState(skillData, persistentEffectMap, latestEffectNames = [], options = {}) {
    if (!skillData) return;

    if (typeof applySkillEffectsToComboMap === "function") {
        applySkillEffectsToComboMap(skillData, persistentEffectMap, true, false, persistentEffectMap);
    }

    if (!options.skipStackConsumption && typeof consumeStackedComboEffectsForSkill === "function") {
        consumeStackedComboEffectsForSkill(skillData, persistentEffectMap, persistentEffectMap);
    }

    const resolvedMap = resolveSimulationComboEffectMap({ ...persistentEffectMap }, latestEffectNames);
    replaceSimulationEffectMap(persistentEffectMap, resolvedMap);
}

function isSimulationComboOnCooldown(comboSkill, time, cooldownState) {
    const cooldown = Number(comboSkill?.cooldown || 0);
    if (cooldown <= 0) return false;
    const lastTriggeredAt = cooldownState[comboSkill.id];
    return lastTriggeredAt !== undefined && time < lastTriggeredAt + cooldown;
}

function getSimulationComboCooldownBlock(comboSkill, time, cooldownState) {
    const cooldown = Number(comboSkill?.cooldown || 0);
    const lastTriggeredAt = cooldownState[comboSkill?.id];
    if (!Number.isFinite(cooldown) || cooldown <= 0 || lastTriggeredAt === undefined) return null;
    const readyAt = lastTriggeredAt + cooldown;
    if (time >= readyAt) return null;

    return {
        lastTriggeredAt,
        cooldown,
        readyAt,
        remaining: Math.max(0, readyAt - time)
    };
}

function markSimulationComboCooldown(comboSkill, time, cooldownState) {
    if (!comboSkill?.id || Number(comboSkill.cooldown || 0) <= 0) return;
    cooldownState[comboSkill.id] = time;
}

function getSimulationMergedEffectMap(...effectMaps) {
    const merged = {};
    effectMaps.forEach(effectMap => addSimulationEffectsToMap(merged, effectMap));
    return merged;
}

function getSimulationConsumedBuffProcContext(skillData, persistentEffectMap) {
    const effects = {};
    const procs = [];
    if (!skillData || typeof skillConsumesComboEffect !== "function") return { effects, procs };

    Object.entries(persistentEffectMap || {}).forEach(([effectName, stacks]) => {
        if (Number(stacks || 0) <= 0 || !skillConsumesComboEffect(skillData, effectName)) return;
        const registryEntry = typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY[effectName] : null;
        const proc = registryEntry?.onConsume;
        if (!proc || typeof proc !== "object" || Array.isArray(proc)) return;

        const procEffects = typeof collectEffectsFromSkill === "function"
            ? collectEffectsFromSkill(proc, persistentEffectMap)
            : {};
        addSimulationEffectsToMap(effects, procEffects);
        procs.push(proc);
    });

    return { effects, procs };
}

function getSimulationSkillEventsForSpSnap(excludedIndex, secondsPerSlot, durationHintSeconds = 0) {
    const excludedNumber = Number(excludedIndex);
    const entries = rotation
        .map((entry, index) => ({ entry, index }))
        .filter(item => item.entry && Number(item.index) !== excludedNumber);
    const manualSkillEvents = getSimulationManualSkillEvents(entries, secondsPerSlot);
    const maxEntryTime = manualSkillEvents.reduce((max, event) => Math.max(max, event.time), 0);
    const maxManualFollowUpTime = manualSkillEvents.reduce((max, event) => {
        const delayedSeconds = Math.max(0, Number(event.skillData?.delayedFollowUp?.delaySeconds) || 0);
        const sequenceSeconds = Math.max(0, Number(event.skillData?.manualSequence?.automaticDelaySeconds) || 0);
        return Math.max(max, Number(event.time) + delayedSeconds, Number(event.time) + sequenceSeconds);
    }, maxEntryTime);
    const timelineBasicAttackData = getTimelineBasicAttackData();
    const firstBasicAttackCycle = timelineBasicAttackData?.hasBasicAttackConfig
        ? getBasicAttackCycleDuration(timelineBasicAttackData, secondsPerSlot)
        : 0;
    const durationSeconds = Math.max(4, Math.ceil(maxEntryTime + 2), Math.ceil(maxManualFollowUpTime + 1), Math.ceil(durationHintSeconds + 2), Math.ceil(firstBasicAttackCycle + 1));
    const leaderId = Array.isArray(selectedTeam) ? selectedTeam[0] : null;
    const formIntervals = window.__simulationOperatorFormIntervals || [];
    const basicAttackSegments = typeof getBasicAttackFormSegments === "function"
        ? getBasicAttackFormSegments(leaderId, durationSeconds, formIntervals)
        : null;
    const finalStrikeTimes = getSimulationFinalStrikeTimes(timelineBasicAttackData, durationSeconds, basicAttackSegments);
    const basicAttackActionEvents = getSimulationBasicAttackActionEvents(
        timelineBasicAttackData,
        durationSeconds,
        leaderId,
        basicAttackSegments
    );
    const autoComboEvents = collectSimulationFinalStrikeComboSkills(
        leaderId,
        finalStrikeTimes,
        typeof prepareSimulationSkillEventsForTriggerPass === "function"
            ? prepareSimulationSkillEventsForTriggerPass(manualSkillEvents)
            : manualSkillEvents,
        basicAttackActionEvents
    );
    const mechanicEvents = [
        ...manualSkillEvents,
        ...autoComboEvents
    ];
    return enrichSimulationSkillEventsWithEffects(
        typeof resolveSimulationFollowUpEvents === "function"
            ? resolveSimulationFollowUpEvents(mechanicEvents)
            : mechanicEvents
    );
}

function getSimulationSpAtTime(events, time, threshold = 100) {
    const sortedEvents = [...events].sort((left, right) => (left.time - right.time) || (left.order - right.order));
    const spPerSecond = getSimulationSpPerSecond();
    let currentSp = SIMULATION_START_SP;
    let lastTime = 0;
    let latestCrossing = null;

    sortedEvents.forEach(event => {
        const eventTime = Math.max(0, Number(event.time) || 0);
        if (eventTime > time) return;

        if (currentSp < threshold && spPerSecond > 0) {
            const crossingTime = lastTime + ((threshold - currentSp) / spPerSecond);
            if (crossingTime <= eventTime) latestCrossing = crossingTime;
        }

        currentSp = Math.min(SIMULATION_MAX_SP, currentSp + Math.max(0, eventTime - lastTime) * spPerSecond);
        lastTime = eventTime;

        const cost = getSimulationBattleSkillSpCost(event.skillData);
        const transaction = cost !== null && cost > 0
            ? getSimulationSpTransaction(currentSp, cost)
            : null;
        if (transaction) currentSp = transaction.after;

        const recovery = getSimulationSkillSpRecovery(event.skillData, event);
        if (recovery > 0 && transaction?.affordable !== false) {
            const beforeRecovery = currentSp;
            currentSp = Math.min(SIMULATION_MAX_SP, currentSp + recovery);
            if (beforeRecovery < threshold && currentSp >= threshold) latestCrossing = eventTime;
        }
    });

    if (currentSp < threshold && spPerSecond > 0) {
        const crossingTime = lastTime + ((threshold - currentSp) / spPerSecond);
        if (crossingTime <= time) latestCrossing = crossingTime;
    }

    const currentAtTime = Math.min(SIMULATION_MAX_SP, currentSp + Math.max(0, time - lastTime) * spPerSecond);
    return {
        sp: currentAtTime,
        latestCrossing
    };
}

function findSimulationNextSpThresholdTime(events, fromTime, threshold = 100) {
    const sortedEvents = [...events]
        .filter(event => Number(event.time) > fromTime)
        .sort((left, right) => (left.time - right.time) || (left.order - right.order));
    const spPerSecond = getSimulationSpPerSecond();
    let state = getSimulationSpAtTime(events, fromTime, threshold);
    let currentSp = state.sp;
    let lastTime = fromTime;

    if (currentSp >= threshold) return fromTime;

    for (const event of sortedEvents) {
        const eventTime = Math.max(0, Number(event.time) || 0);
        if (spPerSecond > 0) {
            const crossingTime = lastTime + ((threshold - currentSp) / spPerSecond);
            if (crossingTime <= eventTime) return crossingTime;
        }

        currentSp = Math.min(SIMULATION_MAX_SP, currentSp + Math.max(0, eventTime - lastTime) * spPerSecond);
        lastTime = eventTime;

        const cost = getSimulationBattleSkillSpCost(event.skillData);
        const transaction = cost !== null && cost > 0
            ? getSimulationSpTransaction(currentSp, cost)
            : null;
        if (transaction) currentSp = transaction.after;

        const recovery = getSimulationSkillSpRecovery(event.skillData, event);
        if (recovery > 0 && transaction?.affordable !== false) {
            currentSp = Math.min(SIMULATION_MAX_SP, currentSp + recovery);
        }
        if (currentSp >= threshold) return eventTime;
    }

    if (spPerSecond <= 0) return fromTime;
    return lastTime + ((threshold - currentSp) / spPerSecond);
}

function getResolvedSimulationSkillForPlacement(index, candidateTime, secondsPerSlot) {
    const entry = rotation[index];
    if (!entry) return null;
    const entries = rotation
        .map((rotationEntry, rotationIndex) => ({
            entry: rotationIndex === Number(index)
                ? { ...rotationEntry, time: candidateTime }
                : rotationEntry,
            index: rotationIndex
        }))
        .filter(item => item.entry);
    const resolvedEvent = getSimulationManualSkillEvents(entries, secondsPerSlot)
        .find(event => Number(event.index) === Number(index));
    return resolvedEvent?.skillData || getSimulationSkillData(entry);
}

function getSnappedSimulationEntryTime(index, value, secondsPerSlot = getTimelineSecondsPerSlot(getTimelineBasicAttackData())) {
    const entry = rotation[index];
    const baseSkillData = entry ? getSimulationSkillData(entry) : null;
    if (!isBattleSkillData(baseSkillData)) return roundSimulationTime(value);

    const candidateTime = roundSimulationTime(value);
    const skillData = getResolvedSimulationSkillForPlacement(index, candidateTime, secondsPerSlot) || baseSkillData;
    const resolvedCost = getSimulationBattleSkillSpCost(skillData);
    const cost = resolvedCost === null ? 100 : Math.max(0, resolvedCost);
    if (cost <= 0) return candidateTime;
    const snapEvents = getSimulationSkillEventsForSpSnap(index, secondsPerSlot, candidateTime + 20);
    const thresholdState = getSimulationSpAtTime(snapEvents, candidateTime, cost);
    const snapTolerance = 0.35;

    if (thresholdState.sp >= cost) {
        if (thresholdState.latestCrossing !== null && Math.abs(candidateTime - thresholdState.latestCrossing) <= snapTolerance) {
            return roundSimulationTime(thresholdState.latestCrossing);
        }
        return candidateTime;
    }

    return roundSimulationTime(findSimulationNextSpThresholdTime(snapEvents, candidateTime, cost));
}

function normalizeSimulationBattleSkillSpTimes() {
    if (!Array.isArray(rotation) || rotation.length === 0) return false;
    const secondsPerSlot = getTimelineSecondsPerSlot(getTimelineBasicAttackData());
    let changed = false;

    rotation.forEach((entry, index) => {
        if (!entry) return;
        const skillData = getSimulationSkillData(entry);
        if (!isBattleSkillData(skillData)) return;

        const currentTime = getRotationEntryTime(entry, index, secondsPerSlot);
        const snappedTime = getSnappedSimulationEntryTime(index, currentTime, secondsPerSlot);
        if (snappedTime <= currentTime + 0.001) return;
        entry.time = snappedTime;
        changed = true;
    });

    if (changed) {
        localStorage.setItem("rotation", JSON.stringify(rotation));
    }
    return changed;
}

function setRotationEntryTime(index, value, options = {}) {
    if (!rotation[index]) return;
    rotation[index].time = options.snapBattleSkill
        ? getSnappedSimulationEntryTime(index, value, options.secondsPerSlot)
        : roundSimulationTime(value);
    if (typeof normalizeQingboMovesInRotation === "function") {
        normalizeQingboMovesInRotation();
    }
    localStorage.setItem("rotation", JSON.stringify(rotation));
    if (typeof refreshSkillsAfterRotationChange === "function") {
        refreshSkillsAfterRotationChange();
    }
}

function createSimulationTimeRuler(durationSeconds, pixelsPerSecond) {
    const ruler = document.createElement("div");
    ruler.className = "rotation-sim-ruler";
    ruler.style.width = `${durationSeconds * pixelsPerSecond}px`;

    const baseline = document.createElement("div");
    baseline.className = "rotation-sim-ruler-line";
    ruler.appendChild(baseline);

    const minorTickCount = Math.round(durationSeconds / SIMULATION_RULER_MINOR_STEP);
    for (let tickIndex = 0; tickIndex <= minorTickCount; tickIndex++) {
        const time = Math.round(tickIndex * SIMULATION_RULER_MINOR_STEP * 10) / 10;
        if (time > durationSeconds) continue;

        const mark = document.createElement("div");
        const isWholeSecond = Math.abs(time - Math.round(time)) < 0.001;
        const halfRemainder = time % SIMULATION_RULER_HALF_STEP;
        const isHalfSecond = !isWholeSecond && (halfRemainder < 0.001 || Math.abs(halfRemainder - SIMULATION_RULER_HALF_STEP) < 0.001);
        mark.className = `rotation-sim-ruler-mark${isHalfSecond ? " is-half-second" : ""}${isWholeSecond ? " is-whole-second" : ""}`;
        mark.style.left = `${time * pixelsPerSecond}px`;
        ruler.appendChild(mark);
    }

    for (let second = 0; second <= Math.ceil(durationSeconds); second++) {
        const tick = document.createElement("div");
        tick.className = "rotation-sim-tick";
        tick.style.left = `${second * pixelsPerSecond}px`;
        tick.textContent = typeof formatBasicAttackSeconds === "function"
            ? formatBasicAttackSeconds(second)
            : `${second}s`;
        ruler.appendChild(tick);
    }

    return ruler;
}

function stopSimulationCursorPlayback() {
    if (!simulationCursorPlaybackTimer) return;
    window.clearInterval(simulationCursorPlaybackTimer);
    simulationCursorPlaybackTimer = null;
}

function clampSimulationCursorTime(value, durationSeconds) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(roundSimulationTime(number), durationSeconds));
}

function getSimulationCursorSortedEvents(events) {
    return [...events]
        .filter(event => event?.skillData)
        .sort((left, right) => (left.time - right.time) || (left.order - right.order));
}

function getSimulationNavigationEventTimes(events, durationSeconds) {
    const times = getSimulationCursorSortedEvents(events)
        .map(event => clampSimulationCursorTime(event.time, durationSeconds))
        .filter(time => Number.isFinite(time));
    const uniqueTimes = [];

    times.forEach(time => {
        if (!uniqueTimes.some(currentTime => Math.abs(currentTime - time) < 0.001)) {
            uniqueTimes.push(time);
        }
    });

    return uniqueTimes;
}

function getSimulationCursorState(events, time) {
    const sortedEvents = getSimulationCursorSortedEvents(events);
    const tolerance = (SIMULATION_TIME_STEP / 2) + 0.001;
    const currentEvents = sortedEvents.filter(event => Math.abs(Number(event.time || 0) - time) <= tolerance);
    const nextEvent = sortedEvents.find(event => Number(event.time || 0) > time + tolerance) || null;
    const latestEvent = sortedEvents
        .filter(event => Number(event.time || 0) <= time + tolerance)
        .at(-1) || null;
    const spState = getSimulationSpAtTime(sortedEvents, time, 0);

    return {
        sp: spState.sp,
        currentEvents,
        nextEvent,
        activeBuffs: latestEvent?.activeBuffs || [],
        activeDebuffs: latestEvent?.activeDebuffs || []
    };
}

function formatSimulationCursorEventSummary(state) {
    if (Array.isArray(state.currentEvents) && state.currentEvents.length > 0) {
        const names = state.currentEvents
            .slice(0, 2)
            .map(event => event.skillData?.name || "Skill");
        const remaining = state.currentEvents.length - names.length;
        return `Now: ${names.join(", ")}${remaining > 0 ? ` +${remaining}` : ""}`;
    }

    if (state.nextEvent) {
        const skillName = state.nextEvent.skillData?.name || "Skill";
        return `Next: ${formatSimulationInspectorSeconds(state.nextEvent.time)} ${skillName}`;
    }

    return "No more events";
}

function createSimulationCursorEffectList(items, type) {
    const list = document.createElement("div");
    list.className = `rotation-sim-cursor-effects is-${type}`;

    if (!Array.isArray(items) || items.length === 0) {
        const empty = document.createElement("span");
        empty.className = "rotation-sim-cursor-empty";
        empty.textContent = "-";
        empty.title = "None";
        list.appendChild(empty);
        return list;
    }

    items.slice(0, 5).forEach(effect => {
        const item = document.createElement("span");
        item.className = "rotation-sim-cursor-effect";
        const displayName = type === "buff" ? getBuffDisplayName(effect) : getDebuffDisplayName(effect);
        const iconPath = type === "buff" ? resolveBuffIcon(effect) : resolveDebuffIcon(effect);
        item.title = displayName;

        if (iconPath) {
            const img = document.createElement("img");
            img.src = iconPath;
            img.alt = displayName;
            item.appendChild(img);
        } else {
            item.textContent = displayName.slice(0, 2).toUpperCase();
        }

        list.appendChild(item);
    });

    if (items.length > 5) {
        const more = document.createElement("span");
        more.className = "rotation-sim-cursor-more";
        more.textContent = `+${items.length - 5}`;
        list.appendChild(more);
    }

    return list;
}

function replaceSimulationCursorEffects(container, items, type) {
    container.replaceChildren(createSimulationCursorEffectList(items, type));
}

function createSimulationCursorStat(label, value = "") {
    const item = document.createElement("div");
    item.className = "rotation-sim-cursor-stat";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement("strong");
    valueElement.textContent = value;

    item.append(labelElement, valueElement);
    return {
        item,
        valueElement
    };
}

function createSimulationCursorIcon(name) {
    const pathMap = {
        start: ["M6 5v14", "M18 6l-8 6 8 6V6z"],
        previous: ["M11 6l-7 6 7 6V6z", "M20 6l-7 6 7 6V6z"],
        stepBack: ["M15 7l-7 5 7 5V7z"],
        play: ["M8 5l11 7-11 7V5z"],
        pause: ["M8 5h4v14H8z", "M14 5h4v14h-4z"],
        stepForward: ["M9 7l7 5-7 5V7z"],
        next: ["M13 6l7 6-7 6V6z", "M4 6l7 6-7 6V6z"],
        end: ["M18 5v14", "M6 6l8 6-8 6V6z"],
        keyboard: ["M4 7h16v10H4V7z", "M7 10h1", "M11 10h1", "M15 10h1", "M7 13h1", "M11 13h6"]
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    (pathMap[name] || pathMap.play).forEach(pathData => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        svg.appendChild(path);
    });

    return svg;
}

function setSimulationCursorButtonIcon(button, iconName, label) {
    if (!button) return;
    if (button.dataset.iconName !== iconName) {
        button.replaceChildren(createSimulationCursorIcon(iconName));
        button.dataset.iconName = iconName;
    }
    button.setAttribute("aria-label", label);
    button.title = button.dataset.shortcutLabel
        ? `${label} (${button.dataset.shortcutLabel})`
        : label;
}

function createSimulationCursorButton(label, className = "", options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `rotation-sim-cursor-button ${className}`.trim();
    const accessibleLabel = options.ariaLabel || options.title || label;
    button.setAttribute("aria-label", accessibleLabel);
    if (options.shortcut) {
        button.dataset.shortcutLabel = options.shortcut;
        button.title = `${accessibleLabel} (${options.shortcut})`;
        button.setAttribute("aria-keyshortcuts", options.keyShortcuts || options.shortcut);
    } else {
        button.title = accessibleLabel;
    }

    if (options.icon) {
        button.classList.add("is-icon");
        button.appendChild(createSimulationCursorIcon(options.icon));
        button.dataset.iconName = options.icon;
    } else {
        button.textContent = label;
    }

    return button;
}

function getSimulationEventSyncKey(event) {
    const skillId = event?.skillData?.id ?? event?.skill?.id ?? event?.entry?.id ?? "skill";
    const order = Number.isFinite(Number(event?.order))
        ? Number(event.order).toFixed(4)
        : "0.0000";
    return [
        getSimulationTimeClusterKey(event?.time),
        event?.kind || "event",
        skillId,
        order
    ].join(":");
}

function getSimulationEventSyncKeys(events) {
    return (Array.isArray(events) ? events : [])
        .filter(Boolean)
        .map(event => getSimulationEventSyncKey(event));
}

function isSimulationProblemEvent(event) {
    return Boolean(event?.problemType);
}

function isSimulationWarningEvent(event) {
    return event?.spState?.affordable === false || isSimulationProblemEvent(event);
}

function scrollSimulationLogRowIntoView(list, row) {
    if (!list || !row) return;
    const visibleTop = list.scrollTop;
    const visibleBottom = visibleTop + list.clientHeight;
    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    const padding = 8;

    if (rowTop < visibleTop + padding) {
        list.scrollTop = Math.max(0, rowTop - padding);
    } else if (rowBottom > visibleBottom - padding) {
        list.scrollTop = rowBottom - list.clientHeight + padding;
    }

    if (typeof list.__rotationUpdateLogScrollbar === "function") {
        list.__rotationUpdateLogScrollbar();
    } else {
        list.dispatchEvent(new Event("scroll"));
    }
}

function findSimulationLogRowByKey(eventKey) {
    return Array.from(document.querySelectorAll(".rotation-sim-log-event[data-event-key]"))
        .find(row => row.dataset.eventKey === eventKey) || null;
}

function focusSimulationLogEvent(eventKey, options = {}) {
    const row = findSimulationLogRowByKey(eventKey);
    if (!row) return;

    if (row.hidden) {
        const allFilter = row
            .closest(".rotation-sim-log")
            ?.querySelector('.rotation-sim-log-filter[data-filter="all"]');
        allFilter?.click();
    }

    scrollSimulationLogRowIntoView(row.closest(".rotation-sim-log-list"), row);
    if (options.focus !== false) row.focus({ preventScroll: true });
}

function scrollSimulationTrackToTime(time, pixelsPerSecond, options = {}) {
    const scrollArea = options.scrollArea || document.querySelector(".rotation-sim-track-scroll");
    if (!scrollArea) return;

    const targetX = Math.max(0, Number(time || 0) * pixelsPerSecond);
    const maxScroll = Math.max(0, scrollArea.scrollWidth - scrollArea.clientWidth);
    const stickyLabelWidth = options.align === "center"
        ? Math.max(0, scrollArea.querySelector(".rotation-sim-labels")?.getBoundingClientRect?.().width || 0)
        : 0;
    const followWidth = Math.max(1, scrollArea.clientWidth - stickyLabelWidth);
    const targetOffset = options.align === "center"
        ? followWidth * 0.5
        : scrollArea.clientWidth * 0.45;
    const nextLeft = Math.max(0, Math.min(maxScroll, targetX - targetOffset));

    if (typeof scrollArea.scrollTo === "function") {
        scrollArea.scrollTo({
            left: nextLeft,
            behavior: options.instant ? "auto" : "smooth"
        });
        if (options.instant) scrollArea.scrollLeft = nextLeft;
    } else {
        scrollArea.scrollLeft = nextLeft;
    }
}

function syncSimulationCursorEvents(currentEvents, options = {}) {
    const activeKeys = new Set(getSimulationEventSyncKeys(currentEvents));
    let firstVisibleLogRow = null;

    document.querySelectorAll(".rotation-sim-log-event[data-event-key]").forEach(row => {
        const isActive = activeKeys.has(row.dataset.eventKey);
        row.classList.toggle("is-cursor-active", isActive);
        if (isActive && !row.hidden && !firstVisibleLogRow) firstVisibleLogRow = row;
    });

    document.querySelectorAll(".rotation-sim-skill[data-event-keys]").forEach(item => {
        const itemKeys = String(item.dataset.eventKeys || "").split("|").filter(Boolean);
        item.classList.toggle("is-cursor-active", itemKeys.some(key => activeKeys.has(key)));
    });

    if (options.autoScroll && firstVisibleLogRow) {
        const list = firstVisibleLogRow.closest(".rotation-sim-log-list");
        if (list && list.dataset.userScrollLock !== "true") {
            scrollSimulationLogRowIntoView(list, firstVisibleLogRow);
        }
    }
}

function attachSimulationTimelineNavigation(body, events, onSelectEvent) {
    if (!body || typeof onSelectEvent !== "function") return;
    body.dataset.timelineNavigation = "true";
    const eventMap = new Map();
    events.forEach(event => {
        eventMap.set(getSimulationEventSyncKey(event), event);
    });
    let lastNavigationKey = null;
    let lastNavigationAt = 0;

    const getTargetEvent = target => {
        const item = target.closest(".rotation-sim-skill[data-event-keys]");
        if (!item || !body.contains(item)) return null;
        const key = String(item.dataset.eventKeys || "").split("|").find(Boolean);
        const event = key ? eventMap.get(key) : null;
        return event ? { item, event, key } : null;
    };

    const selectTargetEvent = event => {
        if ("button" in event && event.button !== 0) return;
        if (event.target.closest("button") || event.target.closest(".rotation-sim-inspector")) return;
        const targetEvent = getTargetEvent(event.target);
        if (!targetEvent || targetEvent.item.__rotationWasDraggedForInspector) return;
        const now = performance.now();
        if (targetEvent.key === lastNavigationKey && now - lastNavigationAt < 80) return;
        lastNavigationKey = targetEvent.key;
        lastNavigationAt = now;
        window.setTimeout(() => {
            onSelectEvent(targetEvent.event, {
                focusLog: true,
                scrollTrack: false,
                source: "timeline"
            });
        }, 0);
    };

    body.addEventListener("pointerup", selectTargetEvent, true);
    body.addEventListener("mouseup", selectTargetEvent, true);
    body.addEventListener("click", selectTargetEvent, true);

    body.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (event.target.closest("button") || event.target.closest(".rotation-sim-inspector")) return;
        const targetEvent = getTargetEvent(event.target);
        if (!targetEvent) return;
        event.preventDefault();
        onSelectEvent(targetEvent.event, {
            focusLog: true,
            scrollTrack: false,
            source: "timeline"
        });
    }, true);
}

function createSimulationCursorController(body, events, durationSeconds, pixelsPerSecond) {
    const toolbar = document.createElement("div");
    toolbar.className = "rotation-sim-cursor-toolbar";

    const controls = document.createElement("div");
    controls.className = "rotation-sim-cursor-controls";
    const startButton = createSimulationCursorButton("Start", "", {
        icon: "start",
        ariaLabel: "Jump to timeline start",
        shortcut: "Home"
    });
    const previousEventButton = createSimulationCursorButton("Previous skill", "", {
        icon: "previous",
        ariaLabel: "Jump to previous skill",
        shortcut: "Shift + Left",
        keyShortcuts: "Shift+ArrowLeft"
    });
    const backButton = createSimulationCursorButton("Back 0.1 seconds", "", {
        icon: "stepBack",
        ariaLabel: "Move 0.1 seconds earlier",
        shortcut: "Left",
        keyShortcuts: "ArrowLeft"
    });
    const playButton = createSimulationCursorButton("Play", "is-primary", {
        icon: "play",
        ariaLabel: "Play timeline",
        shortcut: "Space / K",
        keyShortcuts: "Space K"
    });
    const forwardButton = createSimulationCursorButton("Forward 0.1 seconds", "", {
        icon: "stepForward",
        ariaLabel: "Move 0.1 seconds later",
        shortcut: "Right",
        keyShortcuts: "ArrowRight"
    });
    const nextEventButton = createSimulationCursorButton("Next skill", "", {
        icon: "next",
        ariaLabel: "Jump to next skill",
        shortcut: "Shift + Right",
        keyShortcuts: "Shift+ArrowRight"
    });
    const endButton = createSimulationCursorButton("End", "", {
        icon: "end",
        ariaLabel: "Jump to timeline end",
        shortcut: "End"
    });
    controls.append(
        startButton,
        previousEventButton,
        backButton,
        playButton,
        forwardButton,
        nextEventButton,
        endButton
    );

    const zoomControls = document.createElement("div");
    zoomControls.className = "rotation-sim-zoom-controls";
    zoomControls.setAttribute("aria-label", "Timeline zoom");
    const zoomOutButton = createSimulationCursorButton("-", "rotation-sim-zoom-button", {
        ariaLabel: "Zoom timeline out"
    });
    const zoomValue = document.createElement("span");
    zoomValue.className = "rotation-sim-zoom-value";
    zoomValue.textContent = `${Math.round(simulationTimelineZoom * 100)}%`;
    const fitButton = createSimulationCursorButton("Fit", "rotation-sim-zoom-fit", {
        ariaLabel: "Fit entire timeline"
    });
    const zoomInButton = createSimulationCursorButton("+", "rotation-sim-zoom-button", {
        ariaLabel: "Zoom timeline in"
    });
    zoomControls.append(zoomOutButton, zoomValue, fitButton, zoomInButton);
    controls.appendChild(zoomControls);

    const durationControls = document.createElement("label");
    durationControls.className = "rotation-sim-duration-controls";
    const durationLabel = document.createElement("span");
    durationLabel.textContent = "Length";
    const durationSelect = document.createElement("select");
    durationSelect.className = "rotation-sim-duration-select";
    durationSelect.setAttribute("aria-label", "Timeline duration");
    const configuredDuration = Number(uiSettings?.simulationDurationSeconds);
    const durationOptions = [
        { value: "auto", label: "Auto (20s+)" },
        ...[10, 20, 30, 45, 60].map(seconds => ({ value: String(seconds), label: `${seconds}s` }))
    ];
    if (Number.isFinite(configuredDuration) && configuredDuration > 0 && !durationOptions.some(option => Number(option.value) === configuredDuration)) {
        durationOptions.push({ value: String(configuredDuration), label: `${configuredDuration}s` });
    }
    durationOptions.forEach(optionData => {
        const option = document.createElement("option");
        option.value = optionData.value;
        option.textContent = optionData.label;
        durationSelect.appendChild(option);
    });
    durationSelect.value = Number.isFinite(configuredDuration) && configuredDuration > 0
        ? String(configuredDuration)
        : "auto";
    durationControls.append(durationLabel, durationSelect);
    controls.appendChild(durationControls);

    const shortcutHelp = document.createElement("div");
    shortcutHelp.className = "rotation-sim-shortcuts";
    const shortcutButton = createSimulationCursorButton("Shortcuts", "rotation-sim-shortcuts-button", {
        icon: "keyboard",
        ariaLabel: "Show timeline shortcuts",
        shortcut: "?",
        keyShortcuts: "?"
    });
    shortcutButton.setAttribute("aria-expanded", "false");
    shortcutButton.setAttribute("aria-controls", "rotationTimelineShortcuts");

    const shortcutPanel = document.createElement("div");
    shortcutPanel.id = "rotationTimelineShortcuts";
    shortcutPanel.className = "rotation-sim-shortcuts-panel";
    shortcutPanel.hidden = true;
    shortcutPanel.setAttribute("role", "dialog");
    shortcutPanel.setAttribute("aria-label", "Timeline shortcuts");

    const shortcutHeader = document.createElement("div");
    shortcutHeader.className = "rotation-sim-shortcuts-header";
    const shortcutHeading = document.createElement("strong");
    shortcutHeading.textContent = "Timeline shortcuts";
    const shortcutCloseButton = createSimulationCursorButton("Close", "rotation-sim-shortcuts-close", {
        ariaLabel: "Close timeline shortcuts"
    });
    shortcutCloseButton.textContent = "×";
    shortcutHeader.append(shortcutHeading, shortcutCloseButton);

    const shortcutList = document.createElement("div");
    shortcutList.className = "rotation-sim-shortcuts-list";
    [
        ["← / →", "Move time by 0.1s"],
        ["Shift + ← / →", "Previous / next skill"],
        ["Home / End", "Timeline start / end"],
        ["Space / K", "Play / pause"],
        ["Ctrl + wheel", "Zoom timeline"],
        ["Shift + wheel", "Scroll horizontally"],
        ["Drag empty area", "Move timeline"],
        ["Drag blue marker", "Move time cursor"],
        ["? / Esc", "Open / close this help"]
    ].forEach(([keys, description]) => {
        const row = document.createElement("div");
        row.className = "rotation-sim-shortcuts-row";
        const key = document.createElement("kbd");
        key.textContent = keys;
        const copy = document.createElement("span");
        copy.textContent = description;
        row.append(key, copy);
        shortcutList.appendChild(row);
    });
    shortcutPanel.append(shortcutHeader, shortcutList);
    shortcutHelp.append(shortcutButton, shortcutPanel);
    controls.appendChild(shortcutHelp);

    const focusModeActive = document.documentElement.classList.contains("simulation-timeline-focus");
    const focusBar = document.createElement("div");
    focusBar.className = "rotation-sim-focus-bar";
    const focusCopy = document.createElement("div");
    focusCopy.className = "rotation-sim-focus-copy";
    const focusTitle = document.createElement("strong");
    focusTitle.textContent = "Timeline focus";
    const focusDescription = document.createElement("span");
    focusDescription.className = "rotation-sim-focus-description";
    focusDescription.textContent = focusModeActive
        ? "Timeline focus is active. Press Esc or use the button to restore all panels."
        : "Hide menus, combat stats and analysis to give the timeline more room.";
    focusCopy.append(focusTitle, focusDescription);
    const focusButton = createSimulationCursorButton(focusModeActive ? "Exit focus" : "Enter focus", "rotation-sim-focus-button", {
        ariaLabel: focusModeActive ? "Exit timeline focus" : "Focus timeline"
    });
    focusButton.classList.toggle("is-active", focusModeActive);
    focusButton.setAttribute("aria-pressed", String(focusModeActive));
    focusButton.title = focusModeActive ? "Exit timeline focus (Esc)" : "Focus timeline";
    const focusActions = document.createElement("div");
    focusActions.className = "rotation-sim-focus-actions";
    const trackButton = createSimulationCursorButton("Tracks", "rotation-sim-track-button", {
        ariaLabel: "Choose visible timeline tracks"
    });
    trackButton.title = "Show or hide timeline tracks";
    const resetLayoutButton = createSimulationCursorButton("Reset layout", "rotation-sim-layout-reset", {
        ariaLabel: "Reset simulation layout"
    });
    resetLayoutButton.title = "Reset focus mode, timeline zoom and Quick Skills layout";
    const collapseMenuButton = createSimulationCursorButton("Collapse menu", "rotation-sim-menu-collapse", {
        ariaLabel: "Collapse timeline focus menu"
    });
    collapseMenuButton.title = "Collapse the complete focus menu";
    focusActions.append(trackButton, resetLayoutButton, collapseMenuButton, focusButton);
    focusBar.append(focusCopy, focusActions);

    const compactBar = document.createElement("div");
    compactBar.className = "rotation-sim-focus-compact-bar";
    const compactTitle = document.createElement("strong");
    compactTitle.textContent = "Timeline focus";
    const compactActions = document.createElement("div");
    compactActions.className = "rotation-sim-focus-compact-actions";
    const openMenuButton = createSimulationCursorButton("Open menu", "rotation-sim-menu-open", {
        ariaLabel: "Open timeline focus menu"
    });
    const compactExitButton = createSimulationCursorButton("Exit focus", "rotation-sim-focus-button", {
        ariaLabel: "Exit timeline focus"
    });
    compactActions.append(openMenuButton, compactExitButton);
    compactBar.append(compactTitle, compactActions);
    updateSimulationTrackButtons();

    const timeStat = createSimulationCursorStat("Time");
    const spStat = createSimulationCursorStat("SP");
    const eventStat = createSimulationCursorStat("Event");
    timeStat.item.classList.add("is-time");
    spStat.item.classList.add("is-sp");
    eventStat.item.classList.add("is-event");

    const readout = document.createElement("div");
    readout.className = "rotation-sim-cursor-readout";
    readout.setAttribute("aria-label", "Simulation status");
    readout.append(timeStat.item, spStat.item, eventStat.item);

    const buffStat = document.createElement("div");
    buffStat.className = "rotation-sim-cursor-stat is-effects is-buffs";
    buffStat.title = "Buffs";
    const buffLabel = document.createElement("span");
    buffLabel.textContent = "B";
    const buffValue = document.createElement("div");
    buffValue.className = "rotation-sim-cursor-effect-slot";
    buffStat.append(buffLabel, buffValue);

    const debuffStat = document.createElement("div");
    debuffStat.className = "rotation-sim-cursor-stat is-effects is-debuffs";
    debuffStat.title = "Debuffs";
    const debuffLabel = document.createElement("span");
    debuffLabel.textContent = "D";
    const debuffValue = document.createElement("div");
    debuffValue.className = "rotation-sim-cursor-effect-slot";
    debuffStat.append(debuffLabel, debuffValue);

    const effectsPanel = document.createElement("div");
    effectsPanel.className = "rotation-sim-cursor-effects-panel";
    effectsPanel.setAttribute("aria-label", "Active buffs and debuffs");
    effectsPanel.append(buffStat, debuffStat);

    toolbar.append(controls, readout, effectsPanel);

    const cursor = document.createElement("div");
    cursor.className = "rotation-sim-cursor";

    const line = document.createElement("div");
    line.className = "rotation-sim-cursor-line";
    line.setAttribute("aria-hidden", "true");
    const handle = document.createElement("div");
    handle.className = "rotation-sim-cursor-handle";
    handle.tabIndex = 0;
    handle.setAttribute("role", "slider");
    handle.setAttribute("aria-label", "Timeline time");
    handle.setAttribute("aria-valuemin", "0");
    handle.setAttribute("aria-valuemax", String(durationSeconds));
    const timeBadge = document.createElement("div");
    timeBadge.className = "rotation-sim-cursor-time";
    timeBadge.setAttribute("aria-hidden", "true");
    cursor.append(line, handle, timeBadge);
    body.appendChild(cursor);

    const updatePlayButton = () => {
        const isPlaying = Boolean(simulationCursorPlaybackTimer);
        setSimulationCursorButtonIcon(
            playButton,
            isPlaying ? "pause" : "play",
            isPlaying ? "Pause timeline" : "Play timeline"
        );
        playButton.classList.toggle("is-playing", isPlaying);
    };

    const setCursorTime = (value, options = {}) => {
        simulationCursorTime = clampSimulationCursorTime(value, durationSeconds);
        const x = simulationCursorTime * pixelsPerSecond;
        cursor.style.left = `${x}px`;
        const state = getSimulationCursorState(events, simulationCursorTime);
        const formattedTime = formatSimulationInspectorSeconds(simulationCursorTime);
        timeBadge.textContent = formattedTime;
        handle.setAttribute("aria-valuenow", String(simulationCursorTime));
        handle.setAttribute("aria-valuetext", formattedTime);
        timeStat.valueElement.textContent = formattedTime;
        spStat.valueElement.textContent = `${formatSimulationSpValue(state.sp)} / ${SIMULATION_MAX_SP}`;
        spStat.item.classList.toggle("is-warning", state.sp < 100);
        const eventSummary = formatSimulationCursorEventSummary(state);
        eventStat.valueElement.textContent = eventSummary;
        eventStat.valueElement.title = eventSummary;
        replaceSimulationCursorEffects(buffValue, state.activeBuffs, "buff");
        replaceSimulationCursorEffects(debuffValue, state.activeDebuffs, "debuff");
        syncSimulationEffectTrackCursor(body, simulationCursorTime);
        const syncEvents = Array.isArray(options.extraEvents) && options.extraEvents.length > 0
            ? [...state.currentEvents, ...options.extraEvents]
            : state.currentEvents;
        syncSimulationCursorEvents(syncEvents, {
            autoScroll: Boolean(options.autoScroll || simulationCursorPlaybackTimer)
        });
        if (options.scrollTrack) {
            scrollSimulationTrackToTime(simulationCursorTime, pixelsPerSecond, {
                instant: Boolean(options.scrollTrackInstant),
                align: options.scrollTrackAlign || (simulationCursorPlaybackTimer ? "center" : undefined)
            });
        }
        updatePlayButton();
    };

    const startPlayback = () => {
        if (simulationCursorPlaybackTimer) {
            stopSimulationCursorPlayback();
            updatePlayButton();
            return;
        }

        if (simulationCursorTime >= durationSeconds) setCursorTime(0, { autoScroll: true });
        const playbackFollowOptions = {
            autoScroll: true,
            scrollTrack: true,
            scrollTrackAlign: "center",
            scrollTrackInstant: true
        };

        setCursorTime(simulationCursorTime, playbackFollowOptions);

        simulationCursorPlaybackTimer = window.setInterval(() => {
            const nextTime = clampSimulationCursorTime(simulationCursorTime + SIMULATION_TIME_STEP, durationSeconds);
            setCursorTime(nextTime, playbackFollowOptions);
            if (nextTime >= durationSeconds) {
                stopSimulationCursorPlayback();
                updatePlayButton();
            }
        }, SIMULATION_CURSOR_INTERVAL_MS);
        updatePlayButton();
    };

    const jumpToClosestEvent = (direction) => {
        const eventTimes = getSimulationNavigationEventTimes(events, durationSeconds);
        const tolerance = (SIMULATION_TIME_STEP / 2) + 0.001;
        const targetTime = direction < 0
            ? [...eventTimes].reverse().find(time => time < simulationCursorTime - tolerance)
            : eventTimes.find(time => time > simulationCursorTime + tolerance);
        setCursorTime(targetTime ?? (direction < 0 ? 0 : durationSeconds), {
            autoScroll: true,
            scrollTrack: true,
            scrollTrackInstant: true
        });
    };

    const jumpToStart = () => {
        stopSimulationCursorPlayback();
        setCursorTime(0, { autoScroll: true, scrollTrack: true, scrollTrackInstant: true });
    };

    const jumpToEnd = () => {
        stopSimulationCursorPlayback();
        setCursorTime(durationSeconds, { autoScroll: true, scrollTrack: true, scrollTrackInstant: true });
    };

    const stepCursor = (direction) => {
        stopSimulationCursorPlayback();
        setCursorTime(simulationCursorTime + (SIMULATION_TIME_STEP * direction), {
            autoScroll: true,
            scrollTrack: true,
            scrollTrackInstant: true
        });
    };

    const jumpToPreviousEvent = () => {
        stopSimulationCursorPlayback();
        jumpToClosestEvent(-1);
    };

    const jumpToNextEvent = () => {
        stopSimulationCursorPlayback();
        jumpToClosestEvent(1);
    };

    const setShortcutHelpOpen = isOpen => {
        const nextOpen = Boolean(isOpen);
        shortcutPanel.hidden = !nextOpen;
        shortcutButton.setAttribute("aria-expanded", String(nextOpen));
        shortcutButton.classList.toggle("is-active", nextOpen);
    };

    startButton.addEventListener("click", jumpToStart);
    previousEventButton.addEventListener("click", jumpToPreviousEvent);
    playButton.addEventListener("click", startPlayback);
    backButton.addEventListener("click", () => stepCursor(-1));
    forwardButton.addEventListener("click", () => stepCursor(1));
    nextEventButton.addEventListener("click", jumpToNextEvent);
    endButton.addEventListener("click", jumpToEnd);
    shortcutButton.addEventListener("click", () => setShortcutHelpOpen(shortcutPanel.hidden));
    shortcutCloseButton.addEventListener("click", () => {
        setShortcutHelpOpen(false);
        shortcutButton.focus();
    });
    zoomOutButton.addEventListener("click", () => {
        setSimulationTimelineZoom(simulationTimelineZoom - SIMULATION_TIMELINE_ZOOM_STEP);
    });
    zoomInButton.addEventListener("click", () => {
        setSimulationTimelineZoom(simulationTimelineZoom + SIMULATION_TIMELINE_ZOOM_STEP);
    });
    fitButton.addEventListener("click", () => {
        fitSimulationTimelineToViewport(document.querySelector(".rotation-sim-track-scroll"), durationSeconds);
    });
    durationSelect.addEventListener("change", () => {
        const selectedDuration = Number(durationSelect.value);
        uiSettings.simulationDurationSeconds = durationSelect.value === "auto" || !Number.isFinite(selectedDuration)
            ? null
            : selectedDuration;
        if (typeof saveUiSettings === "function") saveUiSettings();
        simulationTimelineViewportRestore = { scrollLeft: 0 };
        renderRotation();
    });
    focusButton.addEventListener("click", () => {
        setSimulationTimelineFocusMode(!document.documentElement.classList.contains("simulation-timeline-focus"));
    });
    collapseMenuButton.addEventListener("click", () => setSimulationFocusControlsCollapsed(true));
    openMenuButton.addEventListener("click", () => setSimulationFocusControlsCollapsed(false));
    compactExitButton.addEventListener("click", () => setSimulationTimelineFocusMode(false));
    trackButton.addEventListener("click", openSimulationTrackModal);
    resetLayoutButton.addEventListener("click", resetSimulationLayoutPreferences);

    if (simulationCursorKeyboardHandler) {
        document.removeEventListener("keydown", simulationCursorKeyboardHandler);
        simulationCursorKeyboardHandler = null;
    }

    simulationCursorKeyboardHandler = (event) => {
        if (!toolbar.isConnected || !isSimulationTimelineMode()) {
            document.removeEventListener("keydown", simulationCursorKeyboardHandler);
            simulationCursorKeyboardHandler = null;
            return;
        }

        const target = event.target;
        if (
            event.defaultPrevented
            || event.altKey
            || event.ctrlKey
            || event.metaKey
            || target?.closest?.("input, textarea, select, [contenteditable='true']")
        ) {
            return;
        }

        const key = event.key;
        const lowerKey = String(key || "").toLowerCase();
        let handled = true;

        if (key === "Escape" && !shortcutPanel.hidden) {
            setShortcutHelpOpen(false);
            shortcutButton.focus();
        } else if (key === "Escape" && document.documentElement.classList.contains("simulation-timeline-focus")) {
            setSimulationTimelineFocusMode(false);
        } else if (key === "?") {
            const willOpen = shortcutPanel.hidden;
            setShortcutHelpOpen(willOpen);
            (willOpen ? shortcutCloseButton : shortcutButton).focus();
        } else if (key === "Home" && !event.shiftKey) {
            jumpToStart();
        } else if (key === "End" && !event.shiftKey) {
            jumpToEnd();
        } else if (key === "ArrowLeft" && event.shiftKey) {
            jumpToPreviousEvent();
        } else if (key === "ArrowRight" && event.shiftKey) {
            jumpToNextEvent();
        } else if (key === "ArrowLeft") {
            stepCursor(-1);
        } else if (key === "ArrowRight") {
            stepCursor(1);
        } else if (lowerKey === "k" || ((key === " " || key === "Spacebar") && !target?.closest?.("button"))) {
            if (event.repeat) return;
            startPlayback();
        } else {
            handled = false;
        }

        if (handled) {
            event.preventDefault();
        }
    };

    document.addEventListener("keydown", simulationCursorKeyboardHandler);

    const getTimeFromPointer = event => {
        const rect = body.getBoundingClientRect();
        return clampSimulationCursorTime((event.clientX - rect.left) / pixelsPerSecond, durationSeconds);
    };

    const beginCursorDrag = (event, preserveGrabOffset = false) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        stopSimulationCursorPlayback();

        const startClientX = event.clientX;
        const startTime = simulationCursorTime;
        cursor.classList.add("is-dragging");
        if (!preserveGrabOffset) setCursorTime(getTimeFromPointer(event));

        const move = moveEvent => {
            const nextTime = preserveGrabOffset
                ? startTime + ((moveEvent.clientX - startClientX) / pixelsPerSecond)
                : getTimeFromPointer(moveEvent);
            setCursorTime(nextTime);
        };
        const up = () => {
            cursor.classList.remove("is-dragging");
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
            document.removeEventListener("pointercancel", up);
        };

        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
        document.addEventListener("pointercancel", up);
    };

    handle.addEventListener("pointerdown", event => beginCursorDrag(event, true));
    timeBadge.addEventListener("pointerdown", event => beginCursorDrag(event, true));

    body.addEventListener("pointerdown", event => {
        if (event.button !== 0) return;
        if (event.target.closest(".rotation-sim-skill, .rotation-sim-sp-marker, .rotation-batk-hit-marker, button, .rotation-sim-inspector")) return;
        event.preventDefault();
        stopSimulationCursorPlayback();

        const scrollArea = body.closest(".rotation-sim-track-scroll");
        const startX = event.clientX;
        const startScrollLeft = scrollArea?.scrollLeft || 0;
        let isPanning = false;
        let wasCancelled = false;

        const move = moveEvent => {
            const deltaX = moveEvent.clientX - startX;
            if (!isPanning && scrollArea && Math.abs(deltaX) >= 5) {
                isPanning = true;
                scrollArea.classList.add("is-panning");
            }
            if (isPanning) scrollArea.scrollLeft = startScrollLeft - deltaX;
        };
        const cleanup = upEvent => {
            scrollArea?.classList.remove("is-panning");
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", cleanup);
            document.removeEventListener("pointercancel", cancel);
            if (!isPanning && !wasCancelled) setCursorTime(getTimeFromPointer(upEvent));
        };
        const cancel = cancelEvent => {
            wasCancelled = true;
            cleanup(cancelEvent);
        };

        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", cleanup);
        document.addEventListener("pointercancel", cancel);
    });

    setCursorTime(simulationCursorTime);
    return {
        focusBar,
        compactBar,
        toolbar,
        setCursorTime,
        pixelsPerSecond
    };
}

function attachSimulationTimelineViewportControls(scrollArea, durationSeconds) {
    if (!scrollArea) return;

    scrollArea.addEventListener("wheel", event => {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const rect = scrollArea.getBoundingClientRect();
            const viewportX = Math.max(0, Math.min(scrollArea.clientWidth, event.clientX - rect.left));
            const direction = event.deltaY < 0 ? 1 : -1;
            setSimulationTimelineZoom(simulationTimelineZoom + (direction * SIMULATION_TIMELINE_ZOOM_STEP), {
                scrollArea,
                viewportX
            });
            return;
        }

        if (event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
            event.preventDefault();
            scrollArea.scrollLeft += event.deltaY;
        }
    }, { passive: false });

    scrollArea.addEventListener("pointerdown", event => {
        if (event.button !== 1) return;
        event.preventDefault();
        const startX = event.clientX;
        const startScrollLeft = scrollArea.scrollLeft;
        scrollArea.classList.add("is-panning");

        const move = moveEvent => {
            scrollArea.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
        };
        const up = () => {
            scrollArea.classList.remove("is-panning");
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
    });

    scrollArea.dataset.timelineDuration = String(durationSeconds);
}

function createSimulationStackEffects(items, type) {
    if (!Array.isArray(items) || items.length === 0) return null;

    const row = document.createElement("div");
    row.className = `rotation-sim-stack-effects is-${type}`;

    items.forEach(effect => {
        const item = document.createElement("span");
        item.className = "rotation-sim-stack-effect";
        const displayName = type === "buff" ? getBuffDisplayName(effect) : getDebuffDisplayName(effect);
        const iconPath = type === "buff" ? resolveBuffIcon(effect) : resolveDebuffIcon(effect);
        item.title = displayName;

        if (iconPath) {
            const img = document.createElement("img");
            img.src = iconPath;
            img.alt = displayName;
            item.appendChild(img);
        } else {
            item.textContent = displayName.slice(0, 2).toUpperCase();
        }

        row.appendChild(item);
    });

    return row;
}

function createSimulationComboStackFlyout(groupEvents = []) {
    const flyout = document.createElement("div");
    flyout.className = "rotation-sim-cs-stack-flyout";

    groupEvents.forEach(event => {
        const skillData = event.skillData;
        if (!skillData) return;

        const row = document.createElement("div");
        row.className = "rotation-sim-cs-stack-row";
        row.style.setProperty("--sim-cd-color", event.cooldownColor || SIMULATION_COMBO_COOLDOWN_COLORS[0]);

        const iconWrap = document.createElement("div");
        iconWrap.className = "rotation-sim-cs-stack-icon";
        const icon = document.createElement("img");
        icon.src = skillData.iconSmall || skillData.icon;
        icon.alt = skillData.name || "Combo Skill";
        icon.draggable = false;
        iconWrap.appendChild(icon);

        const text = document.createElement("div");
        text.className = "rotation-sim-cs-stack-text";
        const name = document.createElement("strong");
        name.textContent = skillData.name || "Combo Skill";
        const meta = document.createElement("span");
        meta.textContent = `${skillData.shortType || getShortSkillType(skillData.type)} · ${formatBasicAttackSeconds(Number(skillData.cooldown || 0))} CD`;
        text.append(name, meta);

        const effects = document.createElement("div");
        effects.className = "rotation-sim-cs-stack-effects";
        const buffEffects = createSimulationStackEffects(event.activeBuffs || [], "buff");
        const debuffEffects = createSimulationStackEffects(event.activeDebuffs || [], "debuff");
        if (buffEffects) effects.appendChild(buffEffects);
        if (debuffEffects) effects.appendChild(debuffEffects);

        row.append(iconWrap, text, effects);
        flyout.appendChild(row);
    });

    return flyout;
}

function formatSimulationInspectorSeconds(value) {
    return typeof formatBasicAttackSeconds === "function"
        ? formatBasicAttackSeconds(value)
        : `${Math.round(Number(value || 0) * 10) / 10}s`;
}

function formatSimulationInspectorEffectName(effect, type = "debuff") {
    if (!effect) return "";

    if (typeof effect === "string") {
        const key = normalizeSimulationEffectKey(effect);
        const registry = type === "buff"
            ? (typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY[key] : null)
            : (typeof DEBUFF_REGISTRY !== "undefined" ? DEBUFF_REGISTRY[key] : null);
        return registry?.name || key.replace(/_/g, " ");
    }

    const displayName = type === "buff"
        ? (typeof getBuffDisplayName === "function" ? getBuffDisplayName(effect) : effect.name)
        : (typeof getDebuffDisplayName === "function" ? getDebuffDisplayName(effect) : effect.name);
    const stacks = Number(effect.currentStacks ?? effect.stackCount ?? effect.stacks ?? 1);
    const stackText = Number.isFinite(stacks) && stacks > 1 ? ` x${stacks}` : "";
    return `${displayName || effect.name || effect.id || "Effect"}${stackText}`;
}

function getSimulationInspectorEffectText(effects, type = "debuff", maxItems = 4) {
    if (!Array.isArray(effects) || effects.length === 0) return "None";
    const names = effects
        .map(effect => formatSimulationInspectorEffectName(effect, type))
        .filter(Boolean);
    if (names.length === 0) return "None";
    const visibleNames = names.slice(0, maxItems);
    const remaining = names.length - visibleNames.length;
    return remaining > 0 ? `${visibleNames.join(", ")} +${remaining}` : visibleNames.join(", ");
}

function formatSimulationInspectorTriggerNames(effectNames = []) {
    const names = [...new Set(effectNames)]
        .map(effectName => formatSimulationInspectorEffectName(effectName, "debuff"))
        .filter(Boolean);
    return names.length ? names.join(", ") : "Current event";
}

function formatSimulationInspectorTriggerReason(event) {
    const source = event?.triggerSourceName || "timeline event";
    const effectNames = [...new Set(Array.isArray(event?.triggerEffects) ? event.triggerEffects : [])];

    if (effectNames.length === 0) {
        return `Current event from ${source}`;
    }

    return effectNames
        .map(effectName => {
            const key = normalizeSimulationEffectKey(effectName);
            const isConsumed = key.endsWith("_consumed");
            const baseKey = isConsumed ? key.replace(/_consumed$/, "") : key;
            const displayName = formatSimulationInspectorEffectName(baseKey, "debuff");

            if (isConsumed) return `${displayName} consumed by ${source}`;
            if (baseKey === "final_strike") return `${displayName} from ${source}`;
            return `${displayName} applied by ${source}`;
        })
        .join("; ");
}

function appendSimulationInspectorLine(parent, label, value, className = "") {
    if (value === undefined || value === null || value === "") return;

    const row = document.createElement("div");
    row.className = "rotation-sim-inspector-line";
    if (className) row.classList.add(className);

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement("strong");
    valueElement.textContent = value;

    row.append(labelElement, valueElement);
    parent.appendChild(row);
}

function appendSimulationInspectorSection(parent, title, lines) {
    const section = document.createElement("div");
    section.className = "rotation-sim-inspector-section";

    const heading = document.createElement("div");
    heading.className = "rotation-sim-inspector-section-title";
    heading.textContent = title;
    section.appendChild(heading);

    lines.forEach(([label, value, className]) => {
        appendSimulationInspectorLine(section, label, value, className);
    });

    parent.appendChild(section);
}

function createSimulationInspectorHeader(title, meta) {
    const header = document.createElement("div");
    header.className = "rotation-sim-inspector-header";

    const titleElement = document.createElement("strong");
    titleElement.textContent = title;

    const metaElement = document.createElement("span");
    metaElement.textContent = meta;

    header.append(titleElement, metaElement);
    return header;
}

function createSimulationSkillInspector(event) {
    if (!event?.skillData) return null;

    const groupEvents = Array.isArray(event.groupEvents) && event.groupEvents.length > 1
        ? event.groupEvents
        : [event];
    const primaryEvent = groupEvents[0] || event;
    const skillData = primaryEvent.skillData || event.skillData;
    const panel = document.createElement("div");
    panel.className = "rotation-sim-inspector";
    panel.addEventListener("click", clickEvent => clickEvent.stopPropagation());

    const title = groupEvents.length > 1
        ? `Combo stack +${groupEvents.length - 1}`
        : (skillData.name || "Skill event");
    const meta = `${skillData.shortType || getShortSkillType(skillData.type)} - ${formatSimulationInspectorSeconds(primaryEvent.time)}`;
    panel.appendChild(createSimulationInspectorHeader(title, meta));

    appendSimulationInspectorSection(panel, "Event", [
        ["Mode", primaryEvent.kind === "auto" ? "Auto trigger" : "Manual placement"],
        ["Operator", getSimulationOperatorName(getSimulationSourceOperatorId(skillData))],
        ["Cooldown", Number(skillData.cooldown || 0) > 0 ? formatSimulationInspectorSeconds(skillData.cooldown) : "None"]
    ]);

    if (primaryEvent.loadoutState) {
        const loadout = primaryEvent.loadoutState;
        appendSimulationInspectorSection(panel, "Simulation Loadout", [
            ["Weapon", `${loadout.weaponName} / P${loadout.potential}`],
            ["ATK", `${loadout.operatorBaseAtk} + ${loadout.weaponBaseAtk}${loadout.flatAtkBonus ? ` + ${loadout.flatAtkBonus}` : ""}${loadout.atkPercentBonus ? ` + ${loadout.atkPercentBonus}%` : ""} = ${loadout.totalAtk}`],
            ["Crit Rate", `${Number.isFinite(Number(loadout.critRatePercent)) ? Number(loadout.critRatePercent) : 5}%`],
            ["Crit DMG", `+${Number.isFinite(Number(loadout.critDamagePercent)) ? Number(loadout.critDamagePercent) : 50}%`],
            ["Max HP", Number.isFinite(Number(loadout.maxHp)) ? String(Math.round(Number(loadout.maxHp) * 10) / 10) : ""],
            ["Will", Number.isFinite(Number(loadout.will)) ? String(Math.round(Number(loadout.will) * 10) / 10) : ""],
            [loadout.mainAttributeBonus?.label || "Attribute", loadout.mainAttributeBonus ? formatSimulationLoadoutValue(loadout.mainAttributeBonus.value, loadout.mainAttributeBonus.isPercent) : ""],
            ["Passive", loadout.passive?.name ? `${loadout.passive.name} / Rank ${loadout.passive.rank}` : ""]
        ]);
    }

    if (primaryEvent.kind === "auto") {
        appendSimulationInspectorSection(panel, "Trigger", [
            ["Source", primaryEvent.triggerSourceName || "Timeline event"],
            ["Reason", formatSimulationInspectorTriggerReason(primaryEvent)],
            ["Current effect", formatSimulationInspectorTriggerNames(primaryEvent.triggerEffects)]
        ]);
    }

    if (groupEvents.length > 1) {
        const stackSection = document.createElement("div");
        stackSection.className = "rotation-sim-inspector-section";
        const heading = document.createElement("div");
        heading.className = "rotation-sim-inspector-section-title";
        heading.textContent = "Stacked Combo Skills";
        stackSection.appendChild(heading);

        groupEvents.forEach(groupEvent => {
            const row = document.createElement("div");
            row.className = "rotation-sim-inspector-stack-row";
            row.style.setProperty("--sim-cd-color", groupEvent.cooldownColor || SIMULATION_COMBO_COOLDOWN_COLORS[0]);
            const name = document.createElement("strong");
            name.textContent = groupEvent.skillData?.name || "Combo Skill";
            const trigger = document.createElement("span");
            trigger.textContent = formatSimulationInspectorTriggerReason(groupEvent);
            row.append(name, trigger);
            stackSection.appendChild(row);
        });

        panel.appendChild(stackSection);
    }

    if (primaryEvent.spState || primaryEvent.spRecoveryState) {
        const spLines = [];
        if (primaryEvent.spState) {
            spLines.push([
                "Cost",
                `${formatSimulationSpValue(primaryEvent.spState.before)} -> ${formatSimulationSpValue(primaryEvent.spState.after)} (-${formatSimulationSpValue(primaryEvent.spState.cost)})`,
                primaryEvent.spState.affordable ? "" : "is-warning"
            ]);
        }
        if (primaryEvent.spRecoveryState) {
            spLines.push([
                "Recovery",
                `${formatSimulationSpValue(primaryEvent.spRecoveryState.before)} -> ${formatSimulationSpValue(primaryEvent.spRecoveryState.after)} (+${formatSimulationSpValue(primaryEvent.spRecoveryState.applied)})`,
                "is-positive"
            ]);
        }
        appendSimulationInspectorSection(panel, "SP", spLines);
    }

    const sustain = typeof resolveSimulationSustainProfile === "function"
        ? resolveSimulationSustainProfile(skillData, primaryEvent.loadoutState || {})
        : null;
    if (sustain) {
        const sustainLines = [];
        sustain.treatments.forEach(treatment => {
            const roundedTotal = Math.round(treatment.total * 10) / 10;
            const tickLabel = treatment.tickCount > 1
                ? `${Math.round(treatment.perTick * 10) / 10} x${treatment.tickCount} = ${roundedTotal} HP`
                : `${roundedTotal} HP`;
            sustainLines.push([treatment.name, tickLabel, "is-positive"]);
            if (treatment.conditionalTargetHpAtMostPercent !== null && treatment.conditionalMultiplier > 1) {
                sustainLines.push([
                    `At <=${treatment.conditionalTargetHpAtMostPercent}% HP`,
                    `${Math.round(treatment.conditionalTotal * 10) / 10} HP`,
                    "is-positive"
                ]);
            }
        });
        if (sustain.shield) {
            sustainLines.push([
                sustain.shield.name,
                `${Math.round(sustain.shield.amount * 10) / 10} HP / ${sustain.shield.durationSeconds}s`,
                "is-positive"
            ]);
        }
        if (sustain.protectionPercent !== null) {
            sustainLines.push(["Protection", `${sustain.protectionPercent}%`]);
        }
        sustain.conditionalBuffs.forEach(buff => {
            const condition = buff.conditionLabel || "Conditional";
            const value = Number.isFinite(Number(buff.valuePercent)) ? `${buff.valuePercent}%` : "Configured";
            sustainLines.push([condition, `${buff.name || "Buff"} ${value}${buff.durationSeconds ? ` / ${buff.durationSeconds}s` : ""}`]);
        });
        if (sustain.activationCondition?.label) {
            sustainLines.push(["Condition", sustain.activationCondition.label]);
        }
        if (sustainLines.length > 0) appendSimulationInspectorSection(panel, "Sustain", sustainLines);
    }

    const battlefieldState = primaryEvent.battlefieldResourceState || primaryEvent.skillData?.battlefieldResourceState;
    if (battlefieldState?.after) {
        appendSimulationInspectorSection(panel, "Battlefield Resource", [
            [battlefieldState.after.name || "Resource", `${battlefieldState.before?.stacks || 0} -> ${battlefieldState.after.stacks}/${battlefieldState.after.maxStacks}`],
            ["Created", `+${battlefieldState.createdStacks || 0}`],
            ["Thunder Strikes", String(battlefieldState.strikeCount || 0)],
            ["Consumed effect", battlefieldState.consumedEffectStacks > 0
                ? `${battlefieldState.consumedEffect || "Effect"} x${battlefieldState.consumedEffectStacks}`
                : "None"]
        ]);
    }

    if (Array.isArray(skillData.damageSequences) && skillData.damageSequences.length > 0) {
        appendSimulationInspectorSection(panel, "Damage Sequences", skillData.damageSequences.map((sequence, index) => {
            const multiplier = Number(sequence.atkMultiplier);
            const spRecovery = Number(sequence.spRecovery);
            const details = [
                Number.isFinite(multiplier) ? `${Math.round(multiplier * 1000) / 10}% ATK` : "",
                Number.isFinite(spRecovery) && spRecovery > 0 ? `+${spRecovery} SP` : ""
            ].filter(Boolean).join(" · ");
            return [sequence.label || `SEQ ${sequence.sequenceIndex || index + 1}`, details || "Configured"];
        }));
    }

    appendSimulationInspectorSection(panel, "Effects Before", [
        ["Buffs", getSimulationInspectorEffectText(primaryEvent.activeBuffsBefore, "buff")],
        ["Debuffs", getSimulationInspectorEffectText(primaryEvent.activeDebuffsBefore, "debuff")]
    ]);

    appendSimulationInspectorSection(panel, "Effects After", [
        ["Buffs", getSimulationInspectorEffectText(primaryEvent.activeBuffs, "buff")],
        ["Debuffs", getSimulationInspectorEffectText(primaryEvent.activeDebuffs, "debuff")]
    ]);

    return panel;
}

function createSimulationSpMarkerInspector(marker) {
    const panel = document.createElement("div");
    panel.className = "rotation-sim-inspector is-sp-marker";
    panel.addEventListener("click", clickEvent => clickEvent.stopPropagation());

    const title = marker.type === "recovery" ? "SP recovery" : "SP cost";
    panel.appendChild(createSimulationInspectorHeader(title, formatSimulationInspectorSeconds(marker.time)));

    const spLines = [["Skill", marker.name || "Skill"]];
    if (marker.type === "cost" && marker.affordable === false) {
        spLines.push(
            ["Available", `${formatSimulationSpValue(marker.before)} SP`],
            ["Cost", `${formatSimulationSpValue(marker.amount)} SP`],
            ["Missing", `${formatSimulationSpValue(marker.missing)} SP`, "is-warning"]
        );
    } else {
        spLines.push([
            marker.type === "recovery" ? "Recovery" : "Cost",
            `${formatSimulationSpValue(marker.before)} -> ${formatSimulationSpValue(marker.after)} (${getSimulationSpMarkerText(marker)})`,
            marker.type === "recovery" ? "is-positive" : ""
        ]);
    }
    appendSimulationInspectorSection(panel, "SP", spLines);

    const event = marker.event;
    if (event?.kind === "auto") {
        appendSimulationInspectorSection(panel, "Trigger", [
            ["Source", event.triggerSourceName || "Timeline event"],
            ["Reason", formatSimulationInspectorTriggerReason(event)],
            ["Current effect", formatSimulationInspectorTriggerNames(event.triggerEffects)]
        ]);
    }

    return panel;
}

function closeSimulationInspectors(exceptHost = null) {
    document.querySelectorAll(".rotation-sim-inspector-host.is-inspector-open").forEach(host => {
        if (host !== exceptHost) {
            host.classList.remove("is-inspector-open");
            hideFloatingSimulationInspector(host);
        }
    });
}

function hideFloatingSimulationInspector(host) {
    const panel = host?.__simulationInspectorPanel;
    if (!panel) return;
    panel.classList.remove("is-visible");
    host.classList.remove("is-inspector-hover");
}

function cleanupDetachedSimulationInspectors() {
    document.querySelectorAll(".rotation-sim-inspector.is-floating").forEach(panel => panel.remove());
}

function positionFloatingSimulationInspector(host) {
    const panel = host?.__simulationInspectorPanel;
    if (!panel) return;

    const rect = host.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 0;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight || 0;
    const gap = 14;

    panel.classList.add("is-floating", "is-visible");
    panel.classList.remove("is-left");
    panel.style.left = "0px";
    panel.style.top = "0px";

    const panelRect = panel.getBoundingClientRect();
    const placeLeft = rect.right + gap + panelRect.width > viewportWidth - 8 && rect.left > panelRect.width + gap + 8;
    let left = placeLeft ? rect.left - panelRect.width - gap : rect.right + gap;
    let top = rect.top + (rect.height / 2) - (panelRect.height / 2);

    left = Math.max(8, Math.min(left, viewportWidth - panelRect.width - 8));
    top = Math.max(8, Math.min(top, viewportHeight - panelRect.height - 8));

    panel.classList.toggle("is-left", placeLeft);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
}

function toggleSimulationInspector(host) {
    const shouldOpen = !host.classList.contains("is-inspector-open");
    closeSimulationInspectors(host);
    host.classList.toggle("is-inspector-open", shouldOpen);
    if (shouldOpen) {
        positionFloatingSimulationInspector(host);
    } else {
        hideFloatingSimulationInspector(host);
    }
}

function ensureSimulationInspectorCloseHandler() {
    if (window.__rotationSimulationInspectorCloseHandler) return;
    window.__rotationSimulationInspectorCloseHandler = true;

    document.addEventListener("click", event => {
        if (!event.target.closest(".rotation-sim-inspector-host") && !event.target.closest(".rotation-sim-inspector")) {
            closeSimulationInspectors();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeSimulationInspectors();
    });

    window.addEventListener("scroll", () => {
        document.querySelectorAll(".rotation-sim-inspector-host.is-inspector-open").forEach(positionFloatingSimulationInspector);
    }, true);

    window.addEventListener("resize", () => {
        document.querySelectorAll(".rotation-sim-inspector-host.is-inspector-open").forEach(positionFloatingSimulationInspector);
    });
}

function attachSimulationInspector(host, panel, label = "Inspect simulation event") {
    if (!host || !panel) return;

    host.classList.add("rotation-sim-inspector-host");
    if (!host.hasAttribute("tabindex")) host.tabIndex = 0;
    if (!host.hasAttribute("aria-label")) host.setAttribute("aria-label", label);
    panel.classList.add("is-floating");
    document.body.appendChild(panel);
    host.__simulationInspectorPanel = panel;
    ensureSimulationInspectorCloseHandler();

    host.addEventListener("pointerenter", () => {
        host.classList.add("is-inspector-hover");
        positionFloatingSimulationInspector(host);
    });
    host.addEventListener("pointerleave", () => {
        if (!host.classList.contains("is-inspector-open")) {
            hideFloatingSimulationInspector(host);
        }
    });
    host.addEventListener("focus", () => {
        host.classList.add("is-inspector-hover");
        positionFloatingSimulationInspector(host);
    });
    host.addEventListener("blur", () => {
        if (!host.classList.contains("is-inspector-open")) {
            hideFloatingSimulationInspector(host);
        }
    });
    host.addEventListener("pointerup", event => {
        if (event.target.closest("button, input") || event.target.closest(".rotation-sim-inspector")) return;
        if (host.__rotationWasDraggedForInspector) return;
        event.stopPropagation();
        host.__rotationSuppressNextInspectorClick = true;
        window.setTimeout(() => {
            host.__rotationSuppressNextInspectorClick = false;
        }, 0);
        toggleSimulationInspector(host);
    });
    host.addEventListener("click", event => {
        if (event.target.closest("button, input")) return;
        if (host.__rotationSuppressNextInspectorClick) {
            host.__rotationSuppressNextInspectorClick = false;
            return;
        }
        event.stopPropagation();
        toggleSimulationInspector(host);
    });
}

function getSimulationLogElementClass(skillData) {
    const elementType = typeof normalizeSkillElementType === "function"
        ? normalizeSkillElementType(skillData?.elementType)
        : String(skillData?.elementType || "neutral").trim().toLowerCase();
    return `ef-element-${elementType || "neutral"}`;
}

function getSimulationLogTypeKey(event) {
    if (event?.kind === "arts-burst") return "trigger";
    if (event?.kind === "proc") return "trigger";
    if (isComboSkillData(event?.skillData)) return "cs";
    if (isBattleSkillData(event?.skillData)) return "bs";
    return "skill";
}

function getSimulationLogReason(event) {
    if (event?.problemType === "cooldown") {
        const source = event.triggerSourceName || "Trigger";
        return `${source} met the trigger, but this Combo Skill is still on cooldown`;
    }
    if (event?.kind === "auto") return formatSimulationInspectorTriggerReason(event);
    if (event?.kind === "arts-burst") {
        return `Triggered by ${event.triggerSourceName || "same-element Infliction"}`;
    }
    if (event?.kind === "proc") {
        return `Triggered when ${event.consumedEffectName || "an effect"} was consumed`;
    }
    if (event?.spState && event.spState.affordable === false) return "Battle Skill cannot activate here";
    return "Manual placement";
}

function getSimulationLogEffectSummary(event) {
    const buffs = getSimulationInspectorEffectText(event?.activeBuffs, "buff", 2);
    const debuffs = getSimulationInspectorEffectText(event?.activeDebuffs, "debuff", 2);
    const parts = [];
    if (buffs !== "None") parts.push(`Buffs: ${buffs}`);
    if (debuffs !== "None") parts.push(`Debuffs: ${debuffs}`);
    return parts.join(" | ");
}

function getSimulationLogSpSummary(event) {
    const parts = [];

    if (event?.spState) {
        const state = event.spState;
        if (state.affordable === false) {
            parts.push(`-${formatSimulationSpValue(state.cost)} SP unavailable`);
            parts.push(`${formatSimulationSpValue(state.before)} / ${formatSimulationSpValue(state.cost)}`);
        } else {
            parts.push(`-${formatSimulationSpValue(state.cost)} SP`);
            parts.push(`${formatSimulationSpValue(state.before)} -> ${formatSimulationSpValue(state.after)}`);
        }
    }

    if (event?.spRecoveryState) {
        const state = event.spRecoveryState;
        parts.push(`+${formatSimulationSpValue(state.applied)} SP`);
    }

    if (event?.problemType === "cooldown") {
        parts.push(`Ready in ${formatSimulationInspectorSeconds(event.cooldownRemaining || 0)}`);
        parts.push(`Ready at ${formatSimulationInspectorSeconds(event.cooldownReadyAt || 0)}`);
    }

    return parts.join(" | ");
}

function createSimulationLogFilterButton(filter, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rotation-sim-log-filter";
    button.dataset.filter = filter.key;
    button.textContent = filter.label;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => onSelect(filter.key));
    return button;
}

function countSimulationProblemChipEvents(events, key) {
    return events.filter(event => {
        const tags = [
            "all",
            getSimulationLogTypeKey(event),
            event.kind === "auto" || event.kind === "proc" ? "trigger" : "",
            event.problemType || "",
            event.spState || event.spRecoveryState ? "sp" : "",
            event.spState?.affordable === false ? "missing-sp" : "",
            isSimulationWarningEvent(event) ? "warning" : ""
        ].filter(Boolean);
        return tags.includes(key);
    }).length;
}

function createSimulationProblemsBar(events, onSelect) {
    const bar = document.createElement("div");
    bar.className = "rotation-sim-problems";
    bar.setAttribute("aria-label", "Simulation problems");

    const label = document.createElement("span");
    label.className = "rotation-sim-problems-label";
    label.textContent = "Problems";
    bar.appendChild(label);

    const chips = document.createElement("div");
    chips.className = "rotation-sim-problem-chips";

    SIMULATION_PROBLEM_CHIPS.forEach(problem => {
        const count = countSimulationProblemChipEvents(events, problem.key);
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `rotation-sim-problem-chip is-${problem.type}`;
        chip.dataset.filter = problem.key;
        chip.disabled = count === 0;
        chip.innerHTML = `<span>${problem.label}</span><strong>${count}</strong>`;
        chip.addEventListener("click", () => onSelect(problem.key));
        chips.appendChild(chip);
    });

    const totalWarnings = countSimulationProblemChipEvents(events, "warning");
    if (totalWarnings === 0) {
        const clean = document.createElement("span");
        clean.className = "rotation-sim-problem-clean";
        clean.textContent = "No blocking problems";
        chips.appendChild(clean);
    }

    bar.appendChild(chips);
    return bar;
}

function createSimulationLogRow(event, options = {}) {
    const skillData = event?.skillData;
    if (!skillData) return null;

    const typeKey = getSimulationLogTypeKey(event);
    const row = document.createElement("div");
    row.className = [
        "rotation-sim-log-event",
        getSimulationLogElementClass(skillData),
        `is-${typeKey}`,
        event.kind === "auto" ? "is-trigger" : "",
        isSimulationProblemEvent(event) ? "is-problem" : "",
        event.problemType ? `is-${event.problemType}` : "",
        event.spState || event.spRecoveryState ? "has-sp" : "",
        isSimulationWarningEvent(event) ? "is-warning" : ""
    ].filter(Boolean).join(" ");
    row.dataset.filterTags = [
        "all",
        typeKey,
        event.kind === "auto" ? "trigger" : "",
        event.problemType || "",
        event.spState || event.spRecoveryState ? "sp" : "",
        event.spState?.affordable === false ? "missing-sp" : "",
        isSimulationWarningEvent(event) ? "warning" : ""
    ].filter(Boolean).join(" ");
    row.dataset.eventKey = getSimulationEventSyncKey(event);
    row.dataset.eventTime = getSimulationTimeClusterKey(event.time);
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.setAttribute(
        "aria-label",
        `Jump to ${skillData.name || "Skill"} at ${formatSimulationInspectorSeconds(event.time)}`
    );

    const time = document.createElement("span");
    time.className = "rotation-sim-log-time";
    time.textContent = formatSimulationInspectorSeconds(event.time);

    const icon = document.createElement("span");
    icon.className = "rotation-sim-log-icon";
    const portrait = document.createElement("img");
    portrait.src = skillData.icon;
    portrait.alt = skillData.name || "Skill";
    portrait.draggable = false;
    icon.appendChild(portrait);

    const main = document.createElement("span");
    main.className = "rotation-sim-log-main";

    const titleLine = document.createElement("span");
    titleLine.className = "rotation-sim-log-title-line";

    const type = document.createElement("span");
    type.className = "rotation-sim-log-type";
    type.textContent = skillData.shortType || getShortSkillType(skillData.type);

    const name = document.createElement("strong");
    name.className = "rotation-sim-log-name";
    name.textContent = skillData.name || "Skill";

    if (isSimulationWarningEvent(event)) {
        const warning = document.createElement("span");
        warning.className = "rotation-sim-log-warning";
        warning.textContent = event.problemType === "cooldown" ? "Cooldown" : "Missing SP";
        titleLine.append(type, name, warning);
    } else {
        titleLine.append(type, name);
    }

    const operator = document.createElement("span");
    operator.className = "rotation-sim-log-operator";
    operator.textContent = getSimulationOperatorName(getSimulationSourceOperatorId(skillData));

    titleLine.appendChild(operator);

    const reason = document.createElement("span");
    reason.className = "rotation-sim-log-reason";
    reason.textContent = getSimulationLogReason(event);

    main.append(titleLine, reason);

    const effectSummary = getSimulationLogEffectSummary(event);
    if (effectSummary) {
        const effects = document.createElement("span");
        effects.className = "rotation-sim-log-effects";
        effects.textContent = effectSummary;
        main.appendChild(effects);
    }

    const spSummary = getSimulationLogSpSummary(event);
    const sp = document.createElement("span");
    sp.className = "rotation-sim-log-sp";
    sp.textContent = spSummary || "-";

    row.append(time, icon, main, sp);
    if (typeof options.onSelectEvent === "function") {
        row.addEventListener("click", () => options.onSelectEvent(event, {
            focusLog: false,
            source: "log"
        }));
        row.addEventListener("keydown", keyEvent => {
            if (keyEvent.key !== "Enter" && keyEvent.key !== " ") return;
            keyEvent.preventDefault();
            options.onSelectEvent(event, {
                focusLog: false,
                source: "log"
            });
        });
    }
    return row;
}

function createSimulationEventLog(events, width, options = {}) {
    const sortedEvents = [...events]
        .filter(event => event?.skillData)
        .sort((left, right) => (left.time - right.time) || (left.order - right.order));

    const log = document.createElement("section");
    log.className = "rotation-sim-log";
    log.setAttribute("aria-label", "Simulation Log");
    if (width) log.style.width = `${width}px`;

    const header = document.createElement("div");
    header.className = "rotation-sim-log-header";

    const title = document.createElement("div");
    title.className = "rotation-sim-log-title";
    const titleText = document.createElement("strong");
    titleText.textContent = "Simulation Log";
    const count = document.createElement("span");
    count.textContent = `${sortedEvents.length} Events`;
    title.append(titleText, count);

    const filters = document.createElement("div");
    filters.className = "rotation-sim-log-filters";

    const scrollFrame = document.createElement("div");
    scrollFrame.className = "rotation-sim-log-scroll-frame";

    const list = document.createElement("div");
    list.className = "rotation-sim-log-list";
    let userScrollUnlockTimer = null;
    const markUserScrollLock = () => {
        list.dataset.userScrollLock = "true";
        window.clearTimeout(userScrollUnlockTimer);
        userScrollUnlockTimer = window.setTimeout(() => {
            delete list.dataset.userScrollLock;
        }, 1200);
    };

    const scrollRail = document.createElement("div");
    scrollRail.className = "rotation-sim-log-scrollbar";
    scrollRail.setAttribute("aria-hidden", "true");
    const scrollThumb = document.createElement("div");
    scrollThumb.className = "rotation-sim-log-scroll-thumb";
    scrollRail.appendChild(scrollThumb);

    sortedEvents.forEach(event => {
        const row = createSimulationLogRow(event, options);
        if (row) list.appendChild(row);
    });

    const empty = document.createElement("div");
    empty.className = "rotation-sim-log-empty";
    empty.textContent = "No events in this filter";
    empty.hidden = true;
    list.appendChild(empty);

    const updateLogScrollbar = () => {
        const maxScroll = list.scrollHeight - list.clientHeight;
        const hasOverflow = maxScroll > 1;
        scrollRail.classList.toggle("is-hidden", !hasOverflow);
        if (!hasOverflow) {
            scrollThumb.style.height = "100%";
            scrollThumb.style.transform = "translateY(0)";
            return;
        }

        const railHeight = scrollRail.clientHeight || list.clientHeight;
        const thumbHeight = Math.max(30, Math.round((list.clientHeight / list.scrollHeight) * railHeight));
        const thumbTravel = Math.max(1, railHeight - thumbHeight);
        const top = Math.round((list.scrollTop / maxScroll) * thumbTravel);
        scrollThumb.style.height = `${thumbHeight}px`;
        scrollThumb.style.transform = `translateY(${top}px)`;
    };

    list.__rotationUpdateLogScrollbar = updateLogScrollbar;
    list.addEventListener("scroll", updateLogScrollbar);
    list.addEventListener("wheel", markUserScrollLock, { passive: true });
    list.addEventListener("pointerdown", markUserScrollLock);
    if (typeof ResizeObserver !== "undefined") {
        const resizeObserver = new ResizeObserver(updateLogScrollbar);
        resizeObserver.observe(list);
        list.__rotationLogResizeObserver = resizeObserver;
    }

    scrollRail.addEventListener("pointerdown", event => {
        markUserScrollLock();
        if (event.target === scrollThumb) return;
        const railRect = scrollRail.getBoundingClientRect();
        const ratio = (event.clientY - railRect.top) / Math.max(1, railRect.height);
        list.scrollTop = ratio * (list.scrollHeight - list.clientHeight);
        updateLogScrollbar();
    });

    scrollThumb.addEventListener("pointerdown", event => {
        event.preventDefault();
        event.stopPropagation();
        markUserScrollLock();
        const startY = event.clientY;
        const startScrollTop = list.scrollTop;
        const maxScroll = Math.max(1, list.scrollHeight - list.clientHeight);
        const railHeight = scrollRail.clientHeight || list.clientHeight;
        const thumbHeight = scrollThumb.offsetHeight || 30;
        const thumbTravel = Math.max(1, railHeight - thumbHeight);

        const move = moveEvent => {
            const delta = moveEvent.clientY - startY;
            list.scrollTop = startScrollTop + (delta / thumbTravel) * maxScroll;
            updateLogScrollbar();
        };

        const up = () => {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
            window.clearTimeout(userScrollUnlockTimer);
            userScrollUnlockTimer = window.setTimeout(() => {
                delete list.dataset.userScrollLock;
            }, 500);
        };

        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
    });

    const applyFilter = filterKey => {
        const rows = Array.from(list.querySelectorAll(".rotation-sim-log-event"));
        let visibleCount = 0;
        rows.forEach(row => {
            const tags = String(row.dataset.filterTags || "").split(" ");
            const isVisible = filterKey === "all" || tags.includes(filterKey);
            row.hidden = !isVisible;
            if (isVisible) visibleCount++;
        });
        filters.querySelectorAll(".rotation-sim-log-filter").forEach(button => {
            const isActive = button.dataset.filter === filterKey;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        log.querySelectorAll(".rotation-sim-problem-chip").forEach(button => {
            const isActive = button.dataset.filter === filterKey;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        count.textContent = filterKey === "all"
            ? `${sortedEvents.length} Events`
            : `${visibleCount} / ${sortedEvents.length} Events`;
        empty.hidden = visibleCount !== 0;
        window.requestAnimationFrame(updateLogScrollbar);
    };

    SIMULATION_LOG_FILTERS.forEach(filter => {
        filters.appendChild(createSimulationLogFilterButton(filter, applyFilter));
    });

    const problems = createSimulationProblemsBar(sortedEvents, applyFilter);
    header.append(title, filters);
    scrollFrame.append(list, scrollRail);
    log.append(header, problems, scrollFrame);
    applyFilter("all");
    window.requestAnimationFrame(updateLogScrollbar);
    return log;
}

function createSimulationSkillElement(entry, index, skillData, secondsPerSlot, pixelsPerSecond, options = {}) {
    const item = document.createElement("div");
    item.className = "skill rotation-skill rotation-sim-skill";
    if (options.readOnly) item.classList.add("is-auto-event");
    if (Array.isArray(options.extraClasses)) item.classList.add(...options.extraClasses);
    if (skillData.elementType) item.classList.add(`ef-element-${skillData.elementType}`);
    item.dataset.index = String(index);
    item.dataset.id = String(entry.id);
    item.dataset.uid = entry.uid;
    item.dataset.skillLane = getSimulationSkillLane(skillData);
    item.draggable = false;
    const entryTime = getRotationEntryTime(entry, index, secondsPerSlot);
    item.style.left = `${entryTime * pixelsPerSecond}px`;
    const syncEvents = Array.isArray(options.groupEvents) && options.groupEvents.length > 0
        ? options.groupEvents
        : (options.event ? [options.event] : []);
    if (syncEvents.length > 0) {
        item.dataset.eventKeys = getSimulationEventSyncKeys(syncEvents).join("|");
    }

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

    inner.append(portrait, typeBadge, glyphBadge);
    item.appendChild(inner);

    const timeBadge = document.createElement("button");
    timeBadge.className = "rotation-sim-time-badge";
    timeBadge.type = "button";
    timeBadge.setAttribute("aria-label", "Edit skill time");
    timeBadge.textContent = formatBasicAttackSeconds(entryTime);
    item.appendChild(timeBadge);

    if (options.spState) {
        const spState = options.spState;
        item.classList.add("has-sp-cost");
        if (!spState.affordable) item.classList.add("is-sp-invalid");
        item.dataset.spBefore = formatSimulationSpValue(spState.before);
        item.dataset.spAfter = formatSimulationSpValue(spState.after);
        item.dataset.spCost = formatSimulationSpValue(spState.cost);

        const spBadge = document.createElement("div");
        spBadge.className = "rotation-sim-sp-badge";
        spBadge.textContent = spState.affordable
            ? `${formatSimulationSpValue(spState.cost)} SP`
            : `${formatSimulationSpValue(spState.missing)} SP short`;
        spBadge.title = spState.affordable
            ? `SP ${formatSimulationSpValue(spState.before)} -> ${formatSimulationSpValue(spState.after)}`
            : `Not enough SP: ${formatSimulationSpValue(spState.before)} / ${formatSimulationSpValue(spState.cost)}`;
        item.appendChild(spBadge);
    }

    const groupEvents = Array.isArray(options.groupEvents) ? options.groupEvents : [];
    if (groupEvents.length > 1) {
        item.classList.add("is-cs-stack");
        item.style.setProperty("--sim-cd-color", groupEvents[0]?.cooldownColor || SIMULATION_COMBO_COOLDOWN_COLORS[0]);

        const countBadge = document.createElement("div");
        countBadge.className = "rotation-sim-cs-stack-badge";
        countBadge.textContent = `+${groupEvents.length - 1}`;
        countBadge.title = `${groupEvents.length} Combo Skills`;
        item.appendChild(countBadge);

        const colorRail = document.createElement("div");
        colorRail.className = "rotation-sim-cs-stack-colors";
        groupEvents.slice(0, SIMULATION_COMBO_COOLDOWN_ROWS).forEach(event => {
            const swatch = document.createElement("span");
            swatch.style.setProperty("--sim-cd-color", event.cooldownColor || SIMULATION_COMBO_COOLDOWN_COLORS[0]);
            colorRail.appendChild(swatch);
        });
        item.appendChild(colorRail);
        item.appendChild(createSimulationComboStackFlyout(groupEvents));
    }

    attachSimulationInspector(
        item,
        createSimulationSkillInspector(options.event),
        `${skillData.name || "Skill"} event inspector`
    );

    const nudgeLeft = document.createElement("button");
    nudgeLeft.className = "rotation-sim-nudge is-left";
    nudgeLeft.type = "button";
    nudgeLeft.textContent = "-";
    nudgeLeft.setAttribute("aria-label", "Move skill 0.1 seconds earlier");

    const nudgeRight = document.createElement("button");
    nudgeRight.className = "rotation-sim-nudge is-right";
    nudgeRight.type = "button";
    nudgeRight.textContent = "+";
    nudgeRight.setAttribute("aria-label", "Move skill 0.1 seconds later");

    [nudgeLeft, nudgeRight].forEach((button, directionIndex) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const direction = directionIndex === 0 ? -SIMULATION_TIME_STEP : SIMULATION_TIME_STEP;
            setRotationEntryTime(index, getRotationEntryTime(rotation[index], index, secondsPerSlot) + direction, {
                snapBattleSkill: item.dataset.skillLane === "battle",
                secondsPerSlot
            });
            renderRotation();
        });
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove skill");
    removeBtn.dataset.index = String(index);
    removeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeRotationEntryAtIndex(index);
    });

    if (!options.readOnly) {
        attachSimulationTimeEditor(timeBadge, item, index, secondsPerSlot, pixelsPerSecond);
        item.append(nudgeLeft, nudgeRight, removeBtn);
        attachSimulationDrag(item, index, secondsPerSlot, pixelsPerSecond);
    }
    return item;
}

function attachSimulationTimeEditor(timeBadge, item, index, secondsPerSlot, pixelsPerSecond) {
    if (!timeBadge || !item) return;

    const restoreLabel = () => {
        timeBadge.textContent = formatBasicAttackSeconds(getRotationEntryTime(rotation[index], index, secondsPerSlot));
        item.classList.remove("is-time-editing");
    };

    timeBadge.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (timeBadge.querySelector("input")) return;

        const currentTime = getRotationEntryTime(rotation[index], index, secondsPerSlot);
        item.classList.add("is-time-editing");

        const input = document.createElement("input");
        input.className = "rotation-sim-time-input";
        input.type = "text";
        input.inputMode = "decimal";
        input.value = String(Math.round(currentTime * 10) / 10);
        input.setAttribute("aria-label", "Skill time in seconds");
        let editorClosed = false;

        const commit = () => {
            if (editorClosed) return;
            editorClosed = true;
            const value = Number(String(input.value || "").replace(",", ".").replace(/s$/i, "").trim());
            if (!Number.isFinite(value)) {
                restoreLabel();
                return;
            }

            setRotationEntryTime(index, value, {
                snapBattleSkill: item.dataset.skillLane === "battle",
                secondsPerSlot
            });
            renderRotation();
        };

        const cancel = () => {
            if (editorClosed) return;
            editorClosed = true;
            restoreLabel();
        };

        input.addEventListener("pointerdown", inputEvent => inputEvent.stopPropagation());
        input.addEventListener("click", inputEvent => inputEvent.stopPropagation());
        input.addEventListener("keydown", inputEvent => {
            if (inputEvent.key === "Enter") {
                inputEvent.preventDefault();
                commit();
            } else if (inputEvent.key === "Escape") {
                inputEvent.preventDefault();
                cancel();
                timeBadge.focus();
            }
        });
        input.addEventListener("blur", commit);

        timeBadge.replaceChildren(input);
        window.setTimeout(() => {
            input.focus();
            input.select();
        }, 0);
    });
}

function createSimulationDragGuide(body) {
    const guide = document.createElement("div");
    guide.className = "rotation-sim-drag-guide";
    body.appendChild(guide);
    return guide;
}

function updateSimulationDragGuide(guide, time, pixelsPerSecond) {
    if (!guide) return;
    guide.style.left = `${time * pixelsPerSecond}px`;
    guide.dataset.time = typeof formatBasicAttackSeconds === "function"
        ? formatBasicAttackSeconds(time)
        : `${time}s`;
}

function removeSimulationDragGuide(guide) {
    if (guide?.parentNode) guide.parentNode.removeChild(guide);
}

function attachSimulationDrag(item, index, secondsPerSlot, pixelsPerSecond) {
    item.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button, input")) return;
        event.preventDefault();
        const startX = event.clientX;
        const startTime = getRotationEntryTime(rotation[index], index, secondsPerSlot);
        const body = item.closest(".rotation-sim-body");
        const showDragGuide = (item.dataset.skillLane === "battle" || item.dataset.skillLane === "combo") && body;
        let dragGuide = null;
        let hasDragged = false;
        item.__rotationWasDraggedForInspector = false;

        const cleanup = () => {
            document.removeEventListener("pointermove", move, true);
            document.removeEventListener("pointerup", up, true);
            document.removeEventListener("pointercancel", cancel, true);
            removeSimulationDragGuide(dragGuide);
            dragGuide = null;
        };

        const move = (moveEvent) => {
            if (Math.abs(moveEvent.clientX - startX) >= 3) {
                hasDragged = true;
                item.__rotationWasDraggedForInspector = true;
            }
            if (!hasDragged) return;

            const deltaSeconds = (moveEvent.clientX - startX) / pixelsPerSecond;
            const nextTime = roundSimulationTime(startTime + deltaSeconds);
            item.style.left = `${nextTime * pixelsPerSecond}px`;
            if (showDragGuide) {
                if (!dragGuide) dragGuide = createSimulationDragGuide(body);
                dragGuide.classList.toggle("is-combo", item.dataset.skillLane === "combo");
                updateSimulationDragGuide(dragGuide, nextTime, pixelsPerSecond);
            }
            const timeBadge = item.querySelector(".rotation-sim-time-badge");
            if (timeBadge) timeBadge.textContent = formatBasicAttackSeconds(nextTime);
        };

        const up = (upEvent) => {
            cleanup();

            if (!hasDragged) return;

            const deltaSeconds = (upEvent.clientX - startX) / pixelsPerSecond;
            setRotationEntryTime(index, startTime + deltaSeconds, {
                snapBattleSkill: item.dataset.skillLane === "battle",
                secondsPerSlot
            });
            renderRotation();
        };

        const cancel = () => {
            cleanup();
            item.__rotationWasDraggedForInspector = false;
        };

        document.addEventListener("pointermove", move, true);
        document.addEventListener("pointerup", up, true);
        document.addEventListener("pointercancel", cancel, true);
    });
}

function renderSimulationBasicAttack(track, attackData, durationSeconds, pixelsPerSecond, segments = null) {
    const attackSegments = Array.isArray(segments) && segments.length > 0
        ? segments
        : [{ start: 0, end: durationSeconds, attackData }];
    attackSegments.forEach(segment => {
        const segmentAttack = segment.attackData;
        if (!segmentAttack?.hasBasicAttackConfig || typeof getBasicAttackHitTimeline !== "function") return;
        const slotDuration = getTimelineSecondsPerSlot(segmentAttack);
        const cycleDuration = getBasicAttackCycleDuration(segmentAttack, slotDuration);
        const hits = getBasicAttackHitTimeline(segmentAttack);
        const sequences = Array.isArray(segmentAttack.sequences) ? segmentAttack.sequences : [];

        for (let localCycleStart = 0, cycleIndex = 0; segment.start + localCycleStart <= segment.end; localCycleStart += cycleDuration, cycleIndex += 1) {
            const cycleStart = segment.start + localCycleStart;
            const cycleEnd = cycleStart + cycleDuration;
            const visibleCycleEnd = Math.min(cycleEnd, segment.end, durationSeconds);
            if (visibleCycleEnd > cycleStart) {
                const cycleBand = document.createElement("span");
                cycleBand.className = `rotation-sim-batk-cycle${cycleIndex % 2 === 1 ? " is-alternate" : ""}`;
                cycleBand.style.left = `${cycleStart * pixelsPerSecond}px`;
                cycleBand.style.width = `${(visibleCycleEnd - cycleStart) * pixelsPerSecond}px`;
                cycleBand.setAttribute("aria-hidden", "true");
                track.appendChild(cycleBand);
            }

            let sequenceEndOffset = 0;
            sequences.slice(0, -1).forEach(sequence => {
                sequenceEndOffset += Math.max(0, Number(sequence?.duration) || 0);
                const boundaryTime = cycleStart + sequenceEndOffset;
                if (boundaryTime >= visibleCycleEnd - 0.0001) return;
                const boundary = document.createElement("span");
                boundary.className = "rotation-sim-batk-sequence-boundary";
                boundary.style.left = `${boundaryTime * pixelsPerSecond}px`;
                boundary.setAttribute("aria-hidden", "true");
                track.appendChild(boundary);
            });

            if (cycleEnd <= segment.end + 0.0001 && cycleEnd <= durationSeconds + 0.0001) {
                const cycleEndMarker = document.createElement("span");
                cycleEndMarker.className = "rotation-sim-batk-cycle-end";
                cycleEndMarker.style.left = `${cycleEnd * pixelsPerSecond}px`;
                cycleEndMarker.title = `BATK sequence complete: ${formatBasicAttackSeconds(cycleEnd)}`;
                track.appendChild(cycleEndMarker);
            }
        hits.forEach(hit => {
            const absoluteTime = cycleStart + hit.time;
            if (absoluteTime > segment.end + 0.0001 || absoluteTime > durationSeconds + 0.0001) return;
            const marker = document.createElement("span");
            marker.className = "rotation-batk-hit-marker";
            if (segment.form) {
                marker.classList.add("is-form-variant");
                marker.dataset.operatorForm = segment.form.formKey;
            }
            if (hit.finalHitCount > 1) marker.classList.add("is-double");
            const isFinalStrikeHit = isFinalBasicAttackHit(segmentAttack, hit);
            configureBasicAttackHitMarker(marker, segmentAttack, hit);
            marker.style.left = `${absoluteTime * pixelsPerSecond}px`;
            marker.title = `${segment.form ? `${segment.form.name} · ` : ""}BATK ${isFinalStrikeHit ? "Final Strike" : (hit.sequenceLabel || `Hit ${hit.hit}`)}: ${formatBasicAttackSeconds(absoluteTime)}${hit.sequenceHitCount > 1 ? `, hit ${hit.hitInSequence}/${hit.sequenceHitCount}` : ""}`;
            track.appendChild(marker);
        });
        }
    });
}

function collectSimulationFinalStrikeComboSkills(sourceOperatorId, finalStrikeTimes, manualEvents = [], actionEvents = []) {
    if (typeof getComboSkillsFromEffects !== "function") return [];
    const result = [];
    const seen = new Set();
    const blockedSeen = new Set();
    const cooldownState = {};
    const persistentEffectMap = {};
    const manualComboTimeKeys = new Set(
        manualEvents
            .filter(event => isComboSkillData(event.skillData))
            .map(event => `${event.skillData.id}:${event.time}`)
    );
    const timelineEvents = [
        ...manualEvents.map(event => ({
            kind: "skill",
            time: event.time,
            order: event.order,
            skillData: event.skillData,
            sourceOperatorId: getSimulationEventOperatorId(event)
        })),
        ...finalStrikeTimes.map((time, index) => ({
            kind: "final-strike",
            time,
            order: index + 0.5,
            sourceOperatorId,
            skillData: createSimulationFinalStrikeSkillData(sourceOperatorId)
        })),
        ...(Array.isArray(actionEvents) ? actionEvents : [])
    ].sort((left, right) => (left.time - right.time) || (left.order - right.order));

    timelineEvents.forEach(event => {
        if (event.skillData && isComboSkillData(event.skillData)) {
            markSimulationComboCooldown(event.skillData, event.time, cooldownState);
        }

        const actionResolution = event.action && typeof resolveSimulationActionRules === "function"
            ? resolveSimulationActionRules(
                typeof simulationActionRules !== "undefined" ? simulationActionRules : [],
                event.action,
                persistentEffectMap
            )
            : null;
        if (actionResolution) {
            replaceSimulationEffectMap(persistentEffectMap, actionResolution.effectMap);
            actionResolution.matchedRules.forEach((rule, ruleIndex) => {
                result.push({
                    kind: "proc",
                    time: event.time,
                    order: event.order + 0.01 + (ruleIndex / 1000),
                    skillData: createSimulationActionRuleProcSkillData(rule, event.sourceOperatorId),
                    sourceOperatorId: event.sourceOperatorId,
                    triggerSourceName: rule.name || "Action rule",
                    triggerSourceType: "action-rule",
                    triggerEffects: Object.keys(actionResolution.emittedEffects || {}),
                    actionOverride: actionResolution.actionOverride
                });
            });
        }

        const currentEffects = actionResolution
            ? { ...actionResolution.emittedEffects }
            : event.kind === "final-strike"
                ? getFinalStrikeEventEffectMap(event.sourceOperatorId, persistentEffectMap)
                : (typeof collectEffectsFromSkill === "function" ? collectEffectsFromSkill(event.skillData, persistentEffectMap) : {});
        const consumedProcContext = getSimulationConsumedBuffProcContext(event.skillData, persistentEffectMap);
        addSimulationEffectsToMap(currentEffects, consumedProcContext.effects);
        const chainEffectMap = { ...currentEffects };
        const consumedEffectTriggers = {};
        if (event.skillData && typeof consumeStackedComboEffectsForSkill === "function") {
            consumeStackedComboEffectsForSkill(event.skillData, persistentEffectMap, consumedEffectTriggers);
            addSimulationEffectsToMap(chainEffectMap, consumedEffectTriggers);
        }
        const triggeredComboSkills = [];
        const comboQueue = [];
        let chainCount = 0;
        const maxChainLength = 20;

        const triggerComboSkills = (comboSkills, sourceOperatorId, triggerContext = {}) => {
            comboSkills.forEach(baseComboSkill => {
                const baseComboOperatorId = getSimulationSourceOperatorId(baseComboSkill) ?? sourceOperatorId;
                const comboSkill = typeof resolveOperatorFormAction === "function"
                    ? resolveOperatorFormAction(
                        baseComboSkill,
                        baseComboOperatorId,
                        event.time,
                        window.__simulationOperatorFormIntervals || []
                    )
                    : baseComboSkill;
                if (isFinalStrikeSkillData(comboSkill)) return;
                const comboOperatorId = getSimulationSourceOperatorId(comboSkill);
                const resolvedComboOperatorId = comboOperatorId ?? sourceOperatorId;
                const key = `${comboSkill.id}:${event.time}`;
                if (seen.has(key)) return;
                if (manualComboTimeKeys.has(key)) return;
                const cooldownBlock = getSimulationComboCooldownBlock(comboSkill, event.time, cooldownState);
                if (cooldownBlock) {
                    const blockedKey = `cooldown:${comboSkill.id}:${event.time}:${triggerContext.sourceName || ""}`;
                    if (!blockedSeen.has(blockedKey)) {
                        blockedSeen.add(blockedKey);
                        result.push({
                            kind: "problem",
                            problemType: "cooldown",
                            time: event.time,
                            order: event.order + 0.08 + (blockedSeen.size / 1000),
                            skill: comboSkill,
                            skillData: comboSkill,
                            sourceOperatorId: resolvedComboOperatorId,
                            triggerSourceName: triggerContext.sourceName || "Timeline event",
                            triggerSourceType: triggerContext.sourceType || event.kind,
                            triggerSourceOperatorId: triggerContext.sourceOperatorId ?? sourceOperatorId,
                            triggerEffects: getSimulationCurrentTriggerEffectNames(comboSkill, triggerContext.currentTriggerMap || {}),
                            triggerContextEffects: Object.keys(triggerContext.resolvedEffectMap || {}),
                            cooldownStartedAt: cooldownBlock.lastTriggeredAt,
                            cooldownReadyAt: cooldownBlock.readyAt,
                            cooldownRemaining: cooldownBlock.remaining
                        });
                    }
                    return;
                }
                seen.add(key);
                markSimulationComboCooldown(comboSkill, event.time, cooldownState);
                comboQueue.push(comboSkill);
                triggeredComboSkills.push(comboSkill);
                result.push({
                    kind: "auto",
                    time: event.time,
                    order: event.order + 0.1 + (triggeredComboSkills.length / 100),
                    skill: comboSkill,
                    skillData: comboSkill,
                    comboIndex: triggeredComboSkills.length - 1,
                    sourceOperatorId: resolvedComboOperatorId,
                    triggerSourceName: triggerContext.sourceName || "Timeline event",
                    triggerSourceType: triggerContext.sourceType || event.kind,
                    triggerSourceOperatorId: triggerContext.sourceOperatorId ?? sourceOperatorId,
                    triggerEffects: getSimulationCurrentTriggerEffectNames(comboSkill, triggerContext.currentTriggerMap || {}),
                    triggerContextEffects: Object.keys(triggerContext.resolvedEffectMap || {}),
                    triggerEffectMap: { ...(triggerContext.currentTriggerMap || {}) }
                });
            });
        };

        const resolvedEffectMap = getSimulationTriggerEffectMap(chainEffectMap, persistentEffectMap);
        const currentTriggerMap = getSimulationCurrentTriggerEffectMap(chainEffectMap, persistentEffectMap);
        triggerComboSkills(
            getSimulationComboSkillsFromEffects(resolvedEffectMap, currentTriggerMap, event.sourceOperatorId),
            event.sourceOperatorId,
            {
                sourceName: event.kind === "final-strike"
                    ? (consumedProcContext.procs[0]?.name || `${getSimulationOperatorName(event.sourceOperatorId)} Final Strike`)
                    : (actionResolution?.matchedRules[0]?.name || event.skillData?.name || "Manual skill"),
                sourceType: consumedProcContext.procs.length > 0 ? "proc" : event.kind,
                sourceOperatorId: Number(consumedProcContext.procs[0]?.operatorId ?? event.sourceOperatorId),
                currentTriggerMap,
                resolvedEffectMap
            }
        );

        while (comboQueue.length > 0 && chainCount < maxChainLength) {
            const chainComboSkill = comboQueue.shift();
            const sourceOperatorId = getSimulationSourceOperatorId(chainComboSkill);
            const contextEffectMap = getSimulationMergedEffectMap(persistentEffectMap, chainEffectMap);
            const comboEffects = collectSimulationChainEffectsFromSkill(chainComboSkill, contextEffectMap);
            addSimulationEffectsToMap(chainEffectMap, comboEffects);
            if (typeof removeConsumedDebuffsFromEffectMap === "function") {
                removeConsumedDebuffsFromEffectMap(chainComboSkill, chainEffectMap);
            }
            const resolvedChainEffectMap = getSimulationTriggerEffectMap(chainEffectMap, persistentEffectMap);
            const currentChainTriggerMap = getSimulationCurrentTriggerEffectMap(chainEffectMap, persistentEffectMap);
            triggerComboSkills(
                getSimulationComboSkillsFromEffects(resolvedChainEffectMap, currentChainTriggerMap, sourceOperatorId),
                sourceOperatorId,
                {
                    sourceName: chainComboSkill.name || "Combo Skill",
                    sourceType: "combo-chain",
                    sourceOperatorId,
                    currentTriggerMap: currentChainTriggerMap,
                    resolvedEffectMap: resolvedChainEffectMap
                }
            );
            chainCount++;
        }

        if (chainCount >= maxChainLength) {
            console.warn("Simulation combo chain stopped: maximum chain length reached.");
        }

        if (event.skillData) {
            applySimulationSkillToPersistentComboState(
                event.skillData,
                persistentEffectMap,
                Object.keys(currentEffects || {}),
                { skipStackConsumption: true }
            );
        }

        if (Object.keys(consumedProcContext.effects).length > 0) {
            addSimulationEffectsToMap(persistentEffectMap, consumedProcContext.effects);
            replaceSimulationEffectMap(
                persistentEffectMap,
                resolveSimulationComboEffectMap(
                    { ...persistentEffectMap },
                    Object.keys(consumedProcContext.effects)
                )
            );
        }

        triggeredComboSkills.forEach(comboSkill => {
            const comboEffects = collectSimulationChainEffectsFromSkill(comboSkill, persistentEffectMap);
            applySimulationSkillToPersistentComboState(comboSkill, persistentEffectMap, Object.keys(comboEffects || {}));
        });
    });

    return result;
}

function getSimulationCooldownEndTime(entries, secondsPerSlot, autoComboEvents = []) {
    const manualEnd = entries.reduce((max, item) => {
        const skillData = getSimulationSkillData(item.entry);
        if (!isComboSkillData(skillData)) return max;
        return Math.max(max, getRotationEntryTime(item.entry, item.index, secondsPerSlot) + Number(skillData.cooldown || 0));
    }, 0);

    const autoEnd = autoComboEvents.reduce((max, event) => {
        const skillData = event.skillData || event.skill;
        if (!isComboSkillData(skillData)) return max;
        return Math.max(max, event.time + Number(skillData.cooldown || 0));
    }, 0);

    return Math.max(manualEnd, autoEnd);
}

function getSimulationManualSkillEvents(entries, secondsPerSlot) {
    const rawEvents = entries
        .map((item, order) => {
            const skillData = getSimulationSkillData(item.entry);
            if (!skillData || skillData.isBasicAttack || isFinalStrikeSkillData(skillData)) return null;
            const sourceOperatorId = getSimulationSourceOperatorId(skillData);
            return {
                kind: "manual",
                entry: item.entry,
                index: item.index,
                order,
                time: getRotationEntryTime(item.entry, item.index, secondsPerSlot),
                sourceOperatorId,
                skillData
            };
        })
        .filter(Boolean);
    if (typeof buildOperatorFormIntervals !== "function") return rawEvents;

    const formIntervals = buildOperatorFormIntervals(rawEvents);
    window.__simulationOperatorFormIntervals = formIntervals;
    const activationUseCounts = new Map();
    const resolvedEvents = rawEvents
        .sort((left, right) => left.time - right.time || left.order - right.order)
        .map(event => {
            const form = typeof getActiveOperatorForm === "function"
                ? getActiveOperatorForm(event.sourceOperatorId, event.time, formIntervals)
                : null;
            const actionKey = typeof getOperatorFormActionKey === "function"
                ? getOperatorFormActionKey(event.skillData)
                : "";
            const useKey = form && actionKey ? `${form.operatorId}:${form.formKey}:${form.start}:${actionKey}` : "";
            const activationUseIndex = useKey ? (activationUseCounts.get(useKey) || 0) + 1 : 0;
            if (useKey) activationUseCounts.set(useKey, activationUseIndex);
            const skillData = typeof resolveOperatorFormAction === "function"
                ? resolveOperatorFormAction(event.skillData, event.sourceOperatorId, event.time, formIntervals, { activationUseIndex })
                : event.skillData;
            return { ...event, skillData, activeForm: form };
        });
    return typeof attachOperatorFormEffectsToActivationEvents === "function"
        ? attachOperatorFormEffectsToActivationEvents(resolvedEvents, formIntervals)
        : resolvedEvents;
}

function enrichSimulationSkillEventsWithSp(events) {
    const spPerSecond = getSimulationSpPerSecond();
    let currentSp = SIMULATION_START_SP;
    let lastTime = 0;

    [...events]
        .sort((left, right) => (left.time - right.time) || (left.order - right.order))
        .forEach(event => {
            const eventTime = Math.max(0, Number(event.time) || 0);
            const generatedSp = Math.max(0, eventTime - lastTime) * spPerSecond;
            currentSp = Math.min(SIMULATION_MAX_SP, currentSp + generatedSp);
            lastTime = eventTime;

            const cost = getSimulationBattleSkillSpCost(event.skillData);
            let costTransaction = null;
            if (cost !== null && cost > 0) {
                costTransaction = getSimulationSpTransaction(currentSp, cost);
                event.spState = {
                    start: SIMULATION_START_SP,
                    max: SIMULATION_MAX_SP,
                    spPerSecond,
                    ...costTransaction,
                    generated: generatedSp
                };
                currentSp = costTransaction.after;
            }

            const recovery = getSimulationSkillSpRecovery(event.skillData, event);
            if (recovery > 0 && costTransaction?.affordable !== false) {
                const before = currentSp;
                const after = Math.min(SIMULATION_MAX_SP, before + recovery);
                event.spRecoveryState = {
                    start: SIMULATION_START_SP,
                    max: SIMULATION_MAX_SP,
                    spPerSecond,
                    recovery,
                    before,
                    after,
                    applied: after - before
                };
                currentSp = after;
            }
        });

    return events;
}

function enrichSimulationBattleSkillEventsWithSp(events) {
    return enrichSimulationSkillEventsWithSp(events);
}

function getSimulationScalingEffectStacks(config, activeDebuffsBefore = [], triggerEffectMap = {}) {
    const configuredEffects = config?.effects ?? config?.effect;
    const effectKeys = (Array.isArray(configuredEffects) ? configuredEffects : [configuredEffects])
        .map(normalizeRotationConsumeKey)
        .filter(Boolean);
    if (effectKeys.length === 0) return { effectKeys, stacks: 0 };

    const stackSource = config?.stackSource === "trigger"
        ? effectKeys.map(effectKey => Number(triggerEffectMap?.[effectKey] || 0))
        : effectKeys.map(effectKey => {
            const effect = (Array.isArray(activeDebuffsBefore) ? activeDebuffsBefore : []).find(candidate => (
                normalizeRotationConsumeKey(candidate?.appliesEffect || candidate?.id || candidate?.name) === effectKey
            ));
            return Number(effect?.currentStacks ?? effect?.stackCount ?? effect?.stacks ?? 0);
        });
    const finiteStacks = stackSource.map(value => Math.max(0, Number(value) || 0));
    const stacks = config?.stackAggregation === "max"
        ? Math.max(0, ...finiteStacks)
        : finiteStacks.reduce((total, value) => total + value, 0);
    return { effectKeys, stacks };
}

function getSimulationScalingVariant(config, consumedStacks) {
    const variants = config?.variantsByStacks || config?.outcomesByStacks || config?.scalingByStacks;
    if (!variants || typeof variants !== "object" || Array.isArray(variants)) return null;
    const maxConfiguredStacks = Math.max(
        0,
        ...Object.keys(variants).map(Number).filter(Number.isFinite)
    );
    const stackKey = String(Math.min(consumedStacks, Number(config.maxStacks || maxConfiguredStacks || consumedStacks)));
    return variants[stackKey] || variants[String(consumedStacks)] || null;
}

function applySimulationConsumedEffectScaling(skillData, activeDebuffsBefore = [], triggerEffectMap = {}) {
    const config = skillData?.consumedEffectScaling || skillData?.triggerEffectScaling || skillData?.activeEffectScaling;
    if (!config || typeof config !== "object" || Array.isArray(config)) return skillData;

    const { effectKeys, stacks: consumedStacks } = getSimulationScalingEffectStacks(
        config,
        activeDebuffsBefore,
        triggerEffectMap
    );
    if (effectKeys.length === 0) return skillData;
    if (consumedStacks <= 0) return skillData;

    const variant = getSimulationScalingVariant(config, consumedStacks);

    const damagePerStack = Number(config.damageAtkMultiplierPerStack);
    const baseMultiplier = Number(skillData?.damageProfile?.atkMultiplier);
    const variantDamageProfile = variant?.damageProfile && typeof variant.damageProfile === "object"
        ? variant.damageProfile
        : null;
    const damageProfile = variantDamageProfile
        ? { ...(skillData.damageProfile || {}), ...variantDamageProfile }
        : Number.isFinite(damagePerStack) && Number.isFinite(baseMultiplier)
        ? {
            ...skillData.damageProfile,
            atkMultiplier: baseMultiplier + (damagePerStack * consumedStacks)
        }
        : skillData.damageProfile;

    const effectValues = Array.isArray(config.effectValues) ? config.effectValues : [];
    const debuffs = Array.isArray(skillData?.debuffs)
        ? skillData.debuffs.map(effect => {
            const key = normalizeRotationConsumeKey(effect?.appliesEffect || effect?.id || effect?.name);
            const valueConfig = effectValues.find(value => normalizeRotationConsumeKey(value?.effect) === key);
            if (!valueConfig) return effect;
            const valuePercentPerStack = Number(valueConfig.valuePercentPerStack);
            const existingEffect = (Array.isArray(activeDebuffsBefore) ? activeDebuffsBefore : []).find(candidate => (
                normalizeRotationConsumeKey(candidate?.appliesEffect || candidate?.id || candidate?.name) === key
            ));
            const existingStacks = Math.max(0, Number(
                existingEffect?.currentStacks ?? existingEffect?.stackCount ?? existingEffect?.stacks ?? 0
            ) || 0);
            const stacksAppliedPerStack = Number(valueConfig.stacksAppliedPerStack);
            const stacksAppliedWhenExisting = Number(valueConfig.stacksAppliedWhenExisting);
            const calculatedStacks = existingStacks > 0 && Number.isFinite(stacksAppliedWhenExisting)
                ? stacksAppliedWhenExisting
                : (Number.isFinite(stacksAppliedPerStack) ? stacksAppliedPerStack * consumedStacks : Number(effect.stacksApplied));
            return {
                ...effect,
                valuePercent: Number.isFinite(valuePercentPerStack)
                    ? (Number(valueConfig.baseValuePercent) || 0) + valuePercentPerStack * consumedStacks
                    : effect.valuePercent,
                stacksApplied: Number.isFinite(calculatedStacks)
                    ? Math.max(Number(valueConfig.minimumStacksApplied) || 0, Math.min(
                        Number(valueConfig.maxStacks) || Number(effect.maxStacks) || calculatedStacks,
                        calculatedStacks
                    ))
                    : effect.stacksApplied,
                durationSeconds: Number(valueConfig.durationSeconds) > 0
                    ? Number(valueConfig.durationSeconds)
                    : effect.durationSeconds
            };
        })
        : skillData?.debuffs;

    const ultimateEnergyBase = Number(config.ultimateEnergyBase);
    const ultimateEnergyPerStack = Number(config.ultimateEnergyPerStack);
    const variantUltimateEnergy = Number(variant?.ultimateEnergyGain);
    const ultimateEnergyGain = Number.isFinite(variantUltimateEnergy)
        ? variantUltimateEnergy
        : Number.isFinite(ultimateEnergyBase) && Number.isFinite(ultimateEnergyPerStack)
            ? ultimateEnergyBase + (ultimateEnergyPerStack * consumedStacks)
            : skillData.ultimateEnergyGain;
    const variantSpRecovery = Number(variant?.spRecovery);
    const sequenceSource = Array.isArray(variant?.damageSequences)
        ? variant.damageSequences
        : (Array.isArray(config.damageSequences) ? config.damageSequences : skillData.damageSequences);
    const damageSequences = Array.isArray(sequenceSource)
        ? sequenceSource.map(sequence => {
            const baseSequenceMultiplier = Number(sequence.baseAtkMultiplier ?? sequence.atkMultiplier);
            const perStackMultiplier = Number(sequence.atkMultiplierPerStack);
            return {
                ...sequence,
                atkMultiplier: Number.isFinite(baseSequenceMultiplier)
                    ? baseSequenceMultiplier + (Number.isFinite(perStackMultiplier) ? perStackMultiplier * consumedStacks : 0)
                    : sequence.atkMultiplier
            };
        })
        : skillData.damageSequences;

    return {
        ...skillData,
        damageProfile,
        debuffs,
        ultimateEnergyGain,
        spRecovery: Number.isFinite(variantSpRecovery) ? variantSpRecovery : skillData.spRecovery,
        damageSequences,
        consumedEffectState: {
            effect: effectKeys[0],
            effects: effectKeys,
            stacks: consumedStacks
        }
    };
}

function applySimulationActiveEffectExtensions(skillData, activeEffectsBefore = []) {
    const extensions = Array.isArray(skillData?.activeEffectExtensions) ? skillData.activeEffectExtensions : [];
    if (extensions.length === 0) return skillData;
    const extraDebuffs = extensions.flatMap(extension => {
        const effectKey = normalizeRotationConsumeKey(extension?.effect);
        const activeEffect = (Array.isArray(activeEffectsBefore) ? activeEffectsBefore : []).find(effect => (
            normalizeRotationConsumeKey(effect?.appliesEffect || effect?.id || effect?.name) === effectKey
        ));
        if (!activeEffect) return [];
        return [{
            ...activeEffect,
            durationSeconds: Number(extension.durationSeconds) || activeEffect.durationSeconds,
            stacksApplied: Number(activeEffect.currentStacks ?? activeEffect.stackCount ?? activeEffect.stacks ?? 1),
            visible: extension.visible !== false
        }];
    });
    if (extraDebuffs.length === 0) return skillData;
    return {
        ...skillData,
        debuffs: [...(Array.isArray(skillData.debuffs) ? skillData.debuffs : []), ...extraDebuffs]
    };
}

function enrichSimulationSkillEventsWithEffects(events) {
    if (typeof applySkillBuffsAndGetActiveState !== "function" || typeof applySkillDebuffsAndGetActiveState !== "function") {
        return events;
    }

    const rotationDebuffStackState = {};
    const rotationDebuffMetaState = {};
    const rotationBuffStackState = {};
    const rotationBuffMetaState = {};
    const battlefieldResourceState = {};

    const enrichedEvents = [];
    const getEffectStackCount = effect => Math.max(0, Number(
        effect?.currentStacks ?? effect?.stackCount ?? effect?.stacks ?? 1
    ) || 0);
    const getConsumedBuffs = (before, after) => {
        const afterStacks = new Map((Array.isArray(after) ? after : []).map(effect => [
            normalizeRotationConsumeKey(effect?.appliesEffect || effect?.id || effect?.name),
            getEffectStackCount(effect)
        ]));
        return (Array.isArray(before) ? before : []).map(effect => {
            const key = normalizeRotationConsumeKey(effect?.appliesEffect || effect?.id || effect?.name);
            const consumedStacks = Math.max(0, getEffectStackCount(effect) - Number(afterStacks.get(key) || 0));
            return { effect, key, consumedStacks };
        }).filter(item => item.key && item.consumedStacks > 0);
    };
    const createConsumeProcEvent = (sourceEvent, consumed) => {
        const registryEntry = typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY[consumed.key] : null;
        const proc = consumed.effect?.onConsume || registryEntry?.onConsume;
        if (!proc || typeof proc !== "object" || Array.isArray(proc)) return null;

        const sourceOperatorId = Number(proc.operatorId ?? consumed.effect?.sourceOperatorId);
        const skillData = {
            ...proc,
            id: proc.id || `${consumed.key}-consume-proc`,
            name: proc.name || `${consumed.effect?.name || registryEntry?.name || consumed.key} Proc`,
            operatorId: Number.isFinite(sourceOperatorId) ? sourceOperatorId : undefined,
            sourceOperatorId: Number.isFinite(sourceOperatorId) ? sourceOperatorId : undefined,
            buffs: Array.isArray(proc.buffs) ? proc.buffs : [],
            debuffs: Array.isArray(proc.debuffs) ? proc.debuffs : []
        };
        return {
            kind: "proc",
            time: sourceEvent.time,
            order: Number(sourceEvent.order || 0) + 0.001,
            sourceOperatorId: Number.isFinite(sourceOperatorId) ? sourceOperatorId : sourceEvent.sourceOperatorId,
            triggerSourceName: sourceEvent.skillData?.name || "Final Strike",
            consumedEffect: consumed.key,
            consumedEffectName: consumed.effect?.name || registryEntry?.name || consumed.key,
            consumedStacks: consumed.consumedStacks,
            skillData
        };
    };
    const createPhysicalStatusProcEvent = sourceEvent => {
        const skillData = sourceEvent?.skillData || {};
        const config = skillData.physicalStatusResolution;
        const consumedStacks = Math.max(0, Number(skillData.physicalStatusState?.consumedStacks) || 0);
        if (!config || consumedStacks <= 0) return null;

        const multiplierByStacks = config.damageAtkMultiplierByStacks || {};
        const atkMultiplier = Number(multiplierByStacks[String(consumedStacks)] ?? multiplierByStacks[consumedStacks]);
        if (!Number.isFinite(atkMultiplier) || atkMultiplier <= 0) return null;

        const statusName = config.statusName || config.statusApplication?.name || "Physical Status";
        return {
            kind: "physical-status-proc",
            time: sourceEvent.time,
            order: Number(sourceEvent.order || 0) + 0.002,
            sourceOperatorId: sourceEvent.sourceOperatorId,
            triggerSourceName: skillData.name || "Physical Status",
            consumedEffect: config.vulnerableEffect || "vulnerable",
            consumedEffectName: config.vulnerableApplication?.name || "Vulnerable",
            consumedStacks,
            skillData: {
                id: `${skillData.id || "skill"}-${config.statusEffect || "physical-status"}-proc`,
                name: `${statusName} x${consumedStacks}`,
                operatorId: skillData.operatorId,
                sourceOperatorId: sourceEvent.sourceOperatorId,
                shortType: "PROC",
                type: "Physical Status",
                elementType: skillData.elementType || "physical",
                damageType: config.damageType || config.statusEffect || "physicalStatus",
                artsIntensityScaling: config.artsIntensityScaling === true,
                operatorLevelScaling: config.operatorLevelScaling === true,
                staggeredDamageMultiplier: config.staggeredDamageMultiplier,
                damageProfile: {
                    atkMultiplier,
                    flatDamage: 0,
                    hitCount: 1,
                    element: skillData.elementType || "physical",
                    verified: config.verified === true,
                    sourceUrl: config.sourceUrl || ""
                },
                buffs: [],
                debuffs: []
            }
        };
    };

    const processEvent = event => {
            const expireTimedEffects = (stackState, metaState, registry) => {
                Object.entries(metaState).forEach(([effectId, effect]) => {
                    const registryEntry = registry?.[effectId] || null;
                    const durationSeconds = Number(effect?.durationSeconds ?? registryEntry?.durationSeconds);
                    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;

                    const currentStacks = Math.max(0, Number(stackState[effectId]) || 0);
                    const stackTimes = Array.isArray(effect?.appliedStackTimes)
                        ? effect.appliedStackTimes.slice(-currentStacks)
                        : [];
                    if (stackTimes.length > 0) {
                        const activeStackTimes = stackTimes.filter(appliedAt => event.time < Number(appliedAt) + durationSeconds);
                        if (activeStackTimes.length > 0) {
                            stackState[effectId] = activeStackTimes.length;
                            metaState[effectId] = { ...effect, appliedStackTimes: activeStackTimes };
                            return;
                        }
                    } else {
                        const appliedAt = Number(effect?.appliedAt);
                        if (!Number.isFinite(appliedAt) || event.time < appliedAt + durationSeconds) return;
                    }
                    delete stackState[effectId];
                    delete metaState[effectId];
                });
            };
            expireTimedEffects(rotationBuffStackState, rotationBuffMetaState, typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY : null);
            expireTimedEffects(rotationDebuffStackState, rotationDebuffMetaState, typeof DEBUFF_REGISTRY !== "undefined" ? DEBUFF_REGISTRY : null);
            const activeDebuffsBeforeSkill = getActiveDebuffsFromRotationState(rotationDebuffStackState, rotationDebuffMetaState);
            const activeBuffsBeforeSkill = {
                ...rotationBuffMetaState
            };
            const activeBuffListBeforeSkill = getActiveBuffsFromRotationState(rotationBuffStackState, rotationBuffMetaState);
            const resolvedActiveBuffListBeforeSkill = typeof resolveSimulationSkillScopedBuffValues === "function"
                ? resolveSimulationSkillScopedBuffValues(event.skillData, activeBuffListBeforeSkill)
                : activeBuffListBeforeSkill;
            const activeBuffStacksBeforeSkill = {
                ...rotationBuffStackState
            };
            const resourceResolution = typeof resolveBattlefieldResourceSkill === "function"
                ? resolveBattlefieldResourceSkill(event.skillData, activeDebuffsBeforeSkill, event.time, battlefieldResourceState)
                : { skillData: event.skillData, resourceState: battlefieldResourceState };
            const physicalStatusSkillData = typeof resolveSimulationPhysicalStatusSkill === "function"
                ? resolveSimulationPhysicalStatusSkill(resourceResolution.skillData, activeDebuffsBeforeSkill)
                : resourceResolution.skillData;
            const scaledSkillData = applySimulationConsumedEffectScaling(
                physicalStatusSkillData,
                [...activeDebuffsBeforeSkill, ...resolvedActiveBuffListBeforeSkill],
                event.triggerEffectMap || {}
            );
            const extendedSkillData = applySimulationActiveEffectExtensions(scaledSkillData, activeDebuffsBeforeSkill);
            const withTiming = effect => ({
                ...effect,
                sourceOperatorId: event.sourceOperatorId,
                appliedAt: event.time
            });
            const skillDataWithTimedEffects = {
                ...extendedSkillData,
                buffs: Array.isArray(extendedSkillData?.buffs)
                    ? extendedSkillData.buffs.map(withTiming)
                    : extendedSkillData?.buffs,
                debuffs: Array.isArray(extendedSkillData?.debuffs)
                    ? extendedSkillData.debuffs.map(withTiming)
                    : extendedSkillData?.debuffs,
                conditionalDebuffs: Array.isArray(extendedSkillData?.conditionalDebuffs)
                    ? extendedSkillData.conditionalDebuffs.map(rule => ({
                        ...rule,
                        debuffs: Array.isArray(rule.debuffs) ? rule.debuffs.map(withTiming) : rule.debuffs
                    }))
                    : extendedSkillData?.conditionalDebuffs
            };
            (Array.isArray(skillDataWithTimedEffects.consumeDebuffs) ? skillDataWithTimedEffects.consumeDebuffs : [])
                .forEach(effectName => consumeAllDebuffStacks(effectName, rotationDebuffStackState, rotationDebuffMetaState));
            applySkillBuffsAndGetActiveState(skillDataWithTimedEffects, rotationBuffStackState, rotationBuffMetaState, activeBuffsBeforeSkill, activeBuffStacksBeforeSkill);
            const activeDebuffs = applySkillDebuffsAndGetActiveState(
                skillDataWithTimedEffects,
                activeBuffsBeforeSkill,
                activeBuffStacksBeforeSkill,
                rotationDebuffStackState,
                rotationDebuffMetaState,
                rotationBuffStackState,
                rotationBuffMetaState
            );
            const enrichedEvent = {
                ...event,
                skillData: skillDataWithTimedEffects,
                activeBuffsBefore: resolvedActiveBuffListBeforeSkill,
                activeDebuffsBefore: activeDebuffsBeforeSkill,
                activeBuffs: getActiveBuffsFromRotationState(rotationBuffStackState, rotationBuffMetaState),
                activeDebuffs,
                battlefieldResourceState: skillDataWithTimedEffects.battlefieldResourceState || null
            };
            enrichedEvents.push(enrichedEvent);

            if (event.kind !== "physical-status-proc") {
                const physicalStatusProc = createPhysicalStatusProcEvent(enrichedEvent);
                if (physicalStatusProc) processEvent(physicalStatusProc);
            }

            if (event.kind !== "proc") {
                getConsumedBuffs(activeBuffListBeforeSkill, enrichedEvent.activeBuffs).forEach(consumed => {
                    const procEvent = createConsumeProcEvent(event, consumed);
                    if (procEvent) processEvent(procEvent);
                });
            }
        };

    [...events]
        .sort((left, right) => (left.time - right.time) || (left.order - right.order))
        .forEach(processEvent);
    return enrichedEvents.sort((left, right) => (left.time - right.time) || (left.order - right.order));
}

function getSimulationTimeClusterKey(time) {
    return String(Math.round(Number(time || 0) * 100) / 100);
}

function getSimulationTeamCooldownRow(skillData, fallbackRows) {
    const sourceOperatorId = getSimulationSourceOperatorId(skillData);
    const hasSourceOperator = sourceOperatorId !== null && sourceOperatorId !== undefined;
    const teamIndex = hasSourceOperator && Array.isArray(selectedTeam)
        ? selectedTeam.findIndex(operatorId =>
            operatorId !== null &&
            operatorId !== undefined &&
            Number(operatorId) === Number(sourceOperatorId)
        )
        : -1;

    if (teamIndex >= 0) {
        return Math.min(teamIndex, SIMULATION_COOLDOWN_ROWS - 1);
    }

    const fallbackKey = sourceOperatorId ?? skillData?.operator ?? skillData?.id ?? fallbackRows.size;
    if (!fallbackRows.has(fallbackKey)) {
        fallbackRows.set(fallbackKey, Math.min(fallbackRows.size, SIMULATION_COOLDOWN_ROWS - 1));
    }
    return fallbackRows.get(fallbackKey);
}

function assignSimulationCooldownDisplay(events) {
    const fallbackRows = new Map();

    events
        .filter(event => isComboSkillData(event.skillData))
        .sort((left, right) => (left.time - right.time) || (left.order - right.order))
        .forEach(event => {
            const cooldownRow = getSimulationTeamCooldownRow(event.skillData, fallbackRows);
            event.cooldownLane = "combo";
            event.cooldownRow = cooldownRow;
            event.cooldownColor = SIMULATION_COOLDOWN_COLORS[cooldownRow % SIMULATION_COOLDOWN_COLORS.length];
            event.sameTimeComboCount = SIMULATION_COOLDOWN_ROWS;
        });

    return events;
}

function assignSimulationComboCooldownDisplay(events) {
    return assignSimulationCooldownDisplay(events);
}

function getRenderedSimulationSkillEvents(events) {
    const autoGroups = new Map();
    const renderedAutoKeys = new Set();
    const rendered = [];

    events.forEach(event => {
        if (event.kind !== "auto") return;
        const key = getSimulationTimeClusterKey(event.time);
        if (!autoGroups.has(key)) autoGroups.set(key, []);
        autoGroups.get(key).push(event);
    });

    events
        .sort((left, right) => (left.time - right.time) || (left.order - right.order))
        .forEach(event => {
            if (event.kind !== "auto") {
                rendered.push(event);
                return;
            }

            const key = getSimulationTimeClusterKey(event.time);
            const group = autoGroups.get(key) || [event];
            if (renderedAutoKeys.has(key)) return;
            renderedAutoKeys.add(key);

            const sortedGroup = group
                .sort((left, right) => (left.order - right.order) || (Number(left.skillData?.id || 0) - Number(right.skillData?.id || 0)))
                .slice(0, SIMULATION_COMBO_COOLDOWN_ROWS);
            const primary = sortedGroup[0];

            rendered.push({
                ...primary,
                groupEvents: sortedGroup,
                activeBuffs: sortedGroup.length > 1 ? [] : primary.activeBuffs,
                activeDebuffs: sortedGroup.length > 1 ? [] : primary.activeDebuffs
            });
        });

    return rendered;
}

const SIMULATION_SKILL_CLUSTER_WIDTH = 66;
const SIMULATION_SKILL_CLUSTER_SPREAD = 72;
const SIMULATION_SKILL_CLUSTER_MIN_ZOOM_RATIO = 1.55;

function compareSimulationSkillEvents(left, right) {
    const timeDelta = Number(left.time || 0) - Number(right.time || 0);
    if (timeDelta !== 0) return timeDelta;
    const orderDelta = Number(left.order || 0) - Number(right.order || 0);
    if (orderDelta !== 0) return orderDelta;
    return String(left.skillData?.id || "").localeCompare(String(right.skillData?.id || ""));
}

function getSimulationSkillEventEntry(event) {
    const skillId = event.skillData?.id || "skill";
    return event.entry || {
        uid: `auto-final-strike-${skillId}-${event.time}`,
        id: skillId,
        time: event.time,
        autoInserted: true
    };
}

function getSimulationSkillEventIndex(event) {
    const skillId = event.skillData?.id || "skill";
    return event.index ?? `auto-${skillId}-${event.time}`;
}

function getSimulationSkillEventKey(event) {
    const entry = getSimulationSkillEventEntry(event);
    return [
        event.kind || "manual",
        entry.uid || "",
        entry.id || event.skillData?.id || "",
        Number(event.time || 0).toFixed(3),
        event.order ?? ""
    ].join(":");
}

function getSimulationSkillClusters(events, pixelsPerSecond) {
    const clusters = [];
    [...events].sort(compareSimulationSkillEvents).forEach(event => {
        const x = Number(event.time || 0) * pixelsPerSecond;
        const current = clusters[clusters.length - 1];
        if (!current || x - current.endX > SIMULATION_SKILL_CLUSTER_WIDTH) {
            clusters.push({ endX: x, events: [event] });
            return;
        }
        current.events.push(event);
        current.endX = Math.max(current.endX, x);
    });
    return clusters.map(cluster => cluster.events);
}

function getSimulationSkillClusterZoom(events, pixelsPerSecond) {
    const times = [...new Set(events
        .map(event => Number(event.time || 0))
        .filter(Number.isFinite))]
        .sort((left, right) => left - right);
    let minimumGapPixels = Infinity;
    for (let index = 1; index < times.length; index += 1) {
        minimumGapPixels = Math.min(minimumGapPixels, (times[index] - times[index - 1]) * pixelsPerSecond);
    }
    if (!Number.isFinite(minimumGapPixels) || minimumGapPixels <= 0) {
        return simulationTimelineZoom + (SIMULATION_TIMELINE_ZOOM_STEP * 3);
    }
    const ratio = Math.max(
        SIMULATION_SKILL_CLUSTER_MIN_ZOOM_RATIO,
        (SIMULATION_SKILL_CLUSTER_WIDTH + 18) / Math.max(1, minimumGapPixels)
    );
    return simulationTimelineZoom * ratio;
}

function createSimulationSkillEventElement(event, secondsPerSlot, pixelsPerSecond, extraClasses = []) {
    const entry = getSimulationSkillEventEntry(event);
    const index = getSimulationSkillEventIndex(event);
    const isReadOnlyEvent = event.kind === "auto" || event.kind === "proc";
    const classes = event.kind === "auto"
        ? ["auto-inserted", "final-strike-triggered", ...extraClasses]
        : event.kind === "proc"
            ? ["auto-inserted", "triggered-proc", ...extraClasses]
            : extraClasses;
    const element = createSimulationSkillElement(entry, index, event.skillData, secondsPerSlot, pixelsPerSecond, {
        readOnly: isReadOnlyEvent,
        extraClasses: classes,
        activeBuffs: event.activeBuffs,
        activeDebuffs: event.activeDebuffs,
        groupEvents: event.groupEvents,
        spState: event.spState,
        event
    });
    if (event.kind === "auto") {
        element.style.setProperty("--sim-cd-color", event.cooldownColor || SIMULATION_COMBO_COOLDOWN_COLORS[0]);
    }
    return element;
}

function createSimulationSkillClusterPreview(events) {
    const sortedEvents = [...events].sort(compareSimulationSkillEvents);
    const preview = document.createElement("div");
    preview.className = "rotation-sim-skill-cluster-preview";
    preview.setAttribute("aria-hidden", "true");

    const heading = document.createElement("span");
    heading.className = "rotation-sim-skill-cluster-preview-heading";
    heading.textContent = "Click to expand";

    const icons = document.createElement("div");
    icons.className = "rotation-sim-skill-cluster-preview-icons";
    sortedEvents.slice(0, 6).forEach(event => {
        const item = document.createElement("span");
        item.className = "rotation-sim-skill-cluster-preview-item";
        item.title = `${formatSimulationInspectorSeconds(event.time)} - ${event.skillData?.name || "Skill"}`;

        const icon = document.createElement("img");
        icon.src = event.skillData?.icon || "";
        icon.alt = "";
        icon.draggable = false;

        const type = document.createElement("span");
        type.textContent = event.skillData?.shortType || getShortSkillType(event.skillData?.type);
        item.append(icon, type);
        icons.appendChild(item);
    });

    if (sortedEvents.length > 6) {
        const more = document.createElement("span");
        more.className = "rotation-sim-skill-cluster-preview-more";
        more.textContent = `+${sortedEvents.length - 6}`;
        icons.appendChild(more);
    }

    preview.append(heading, icons);
    return preview;
}

function alignSimulationSkillClusterPreview(cluster, preview) {
    const scrollArea = cluster.closest(".rotation-sim-track-scroll");
    if (!scrollArea || !preview) return;

    preview.style.setProperty("--sim-cluster-preview-shift-x", "0px");
    const previewRect = preview.getBoundingClientRect();
    const scrollRect = scrollArea.getBoundingClientRect();
    const gutter = 12;
    const minimumLeft = scrollRect.left + gutter;
    const maximumRight = scrollRect.right - gutter;
    let shiftX = 0;

    if (previewRect.left < minimumLeft) {
        shiftX += minimumLeft - previewRect.left;
    }
    if (previewRect.right + shiftX > maximumRight) {
        shiftX -= (previewRect.right + shiftX) - maximumRight;
    }

    preview.style.setProperty("--sim-cluster-preview-shift-x", `${Math.round(shiftX)}px`);
}

function createSimulationSkillClusterElement(events, pixelsPerSecond) {
    const sortedEvents = [...events].sort(compareSimulationSkillEvents);
    const primary = sortedEvents[0];
    const skillData = primary?.skillData || {};
    const firstTime = Number(primary?.time || 0);
    const lastTime = Number(sortedEvents[sortedEvents.length - 1]?.time || firstTime);
    const eventKeys = sortedEvents.map(getSimulationSkillEventKey);
    const syncEvents = sortedEvents.flatMap(event => (
        Array.isArray(event.groupEvents) && event.groupEvents.length > 0
            ? event.groupEvents
            : [event]
    ));

    const cluster = document.createElement("button");
    cluster.className = "rotation-sim-skill rotation-sim-skill-cluster";
    if (skillData.elementType) cluster.classList.add(`ef-element-${skillData.elementType}`);
    cluster.type = "button";
    cluster.style.left = `${firstTime * pixelsPerSecond}px`;
    cluster.dataset.skillLane = getSimulationSkillLane(skillData);
    cluster.dataset.eventKeys = getSimulationEventSyncKeys(syncEvents).join("|");
    cluster.setAttribute(
        "aria-label",
        `${sortedEvents.length} skills between ${formatSimulationInspectorSeconds(firstTime)} and ${formatSimulationInspectorSeconds(lastTime)}. Click to expand.`
    );

    const inner = document.createElement("div");
    inner.className = "rotation-skill-composite";

    const portrait = document.createElement("img");
    portrait.className = "rotation-skill-portrait";
    portrait.src = skillData.icon || "";
    portrait.alt = skillData.name || "Skill";
    portrait.draggable = false;

    const typeBadge = document.createElement("div");
    typeBadge.className = "rotation-skill-type-badge";
    typeBadge.textContent = skillData.shortType || getShortSkillType(skillData.type);

    const glyphBadge = document.createElement("div");
    glyphBadge.className = "rotation-skill-glyph-badge";
    const glyph = document.createElement("img");
    glyph.src = skillData.iconSmall || skillData.icon || "";
    glyph.alt = skillData.type || "Skill";
    glyph.draggable = false;
    glyphBadge.appendChild(glyph);
    inner.append(portrait, typeBadge, glyphBadge);

    const count = document.createElement("span");
    count.className = "rotation-sim-skill-cluster-count";
    count.textContent = `+${sortedEvents.length - 1}`;

    const timeBadge = document.createElement("span");
    timeBadge.className = "rotation-sim-time-badge";
    timeBadge.textContent = Math.abs(lastTime - firstTime) < 0.001
        ? formatSimulationInspectorSeconds(firstTime)
        : `${formatSimulationInspectorSeconds(firstTime)}-${formatSimulationInspectorSeconds(lastTime)}`;

    const preview = createSimulationSkillClusterPreview(sortedEvents);
    cluster.append(inner, count, timeBadge, preview);
    window.requestAnimationFrame(() => {
        if (cluster.isConnected) alignSimulationSkillClusterPreview(cluster, preview);
    });
    cluster.addEventListener("pointerenter", () => alignSimulationSkillClusterPreview(cluster, preview));
    cluster.addEventListener("focus", () => alignSimulationSkillClusterPreview(cluster, preview));
    cluster.addEventListener("pointerdown", event => event.stopPropagation());
    cluster.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        expandedSimulationSkillCluster = {
            lane: getSimulationSkillLane(skillData),
            eventKeys,
            centerTime: (firstTime + lastTime) * 0.5
        };
        setSimulationTimelineZoom(getSimulationSkillClusterZoom(sortedEvents, pixelsPerSecond), {
            anchorTime: expandedSimulationSkillCluster.centerTime,
            keepExpandedCluster: true,
            force: true
        });
        window.requestAnimationFrame(() => {
            scrollSimulationTrackToTime(
                expandedSimulationSkillCluster?.centerTime ?? firstTime,
                getSimulationPixelsPerSecond(),
                { align: "center" }
            );
        });
    });
    return cluster;
}

function renderExpandedSimulationSkillCluster(skillTrack, events, secondsPerSlot, pixelsPerSecond) {
    const sortedEvents = [...events].sort(compareSimulationSkillEvents);
    const centerTime = Number(expandedSimulationSkillCluster?.centerTime ?? sortedEvents[0]?.time ?? 0);
    const totalSpread = Math.max(0, sortedEvents.length - 1) * SIMULATION_SKILL_CLUSTER_SPREAD;
    const trackWidth = Math.max(
        0,
        Number.parseFloat(skillTrack.style.width) || skillTrack.clientWidth || 0
    );
    const preferredStart = (centerTime * pixelsPerSecond) - (totalSpread * 0.5);
    const maximumStart = Math.max(34, trackWidth - totalSpread - 34);
    const startX = Math.min(maximumStart, Math.max(34, preferredStart));

    sortedEvents.forEach((event, index) => {
        const element = createSimulationSkillEventElement(
            event,
            secondsPerSlot,
            pixelsPerSecond,
            ["is-cluster-expanded"]
        );
        element.style.left = `${startX + (index * SIMULATION_SKILL_CLUSTER_SPREAD)}px`;
        element.dataset.clusterExpanded = "true";
        skillTrack.appendChild(element);
    });
}

function renderSimulationSkillEvents(skillTrack, events, secondsPerSlot, pixelsPerSecond, lane) {
    const laneEvents = events.filter(event => (
        event?.kind !== "arts-burst"
        && getSimulationSkillLane(event.skillData) === lane
    ));
    const renderedEvents = getRenderedSimulationSkillEvents(laneEvents);
    const expandedKeys = expandedSimulationSkillCluster?.lane === lane
        ? new Set(expandedSimulationSkillCluster.eventKeys || [])
        : null;
    const expandedEvents = expandedKeys
        ? renderedEvents.filter(event => expandedKeys.has(getSimulationSkillEventKey(event)))
        : [];

    if (expandedKeys && expandedEvents.length < 2) {
        expandedSimulationSkillCluster = null;
    }

    const expandedEventSet = new Set(expandedEvents);
    const regularEvents = renderedEvents.filter(event => !expandedEventSet.has(event));
    getSimulationSkillClusters(regularEvents, pixelsPerSecond).forEach(clusterEvents => {
        if (clusterEvents.length > 1) {
            skillTrack.appendChild(createSimulationSkillClusterElement(clusterEvents, pixelsPerSecond));
            return;
        }
        skillTrack.appendChild(createSimulationSkillEventElement(
            clusterEvents[0],
            secondsPerSlot,
            pixelsPerSecond
        ));
    });

    if (expandedEvents.length > 1) {
        renderExpandedSimulationSkillCluster(
            skillTrack,
            expandedEvents,
            secondsPerSlot,
            pixelsPerSecond
        );
    }

    return renderedEvents.length;
}

function createSimulationLaneHint(type) {
    const hint = document.createElement("div");
    hint.className = `rotation-sim-lane-hint is-${type}`;
    hint.setAttribute("aria-hidden", "true");

    const arrow = document.createElement("span");
    arrow.className = "rotation-sim-lane-hint-arrow";

    const text = document.createElement("span");
    text.className = "rotation-sim-lane-hint-text";
    text.textContent = type === "battle"
        ? "Drop BS / Ult here"
        : (type === "event" ? "Drop combat events here" : "Drop CS here");

    hint.append(arrow, text);
    return hint;
}

function renderSimulationCooldownTrack(track, events, pixelsPerSecond, lane) {
    events
        .filter(event => event.cooldownLane === lane && Number(event.skillData?.cooldown || 0) > 0)
        .forEach(event => {
            const cooldown = Number(event.skillData.cooldown || 0);
            const line = document.createElement("div");
            line.className = "rotation-sim-cooldown-line";
            line.style.left = `${event.time * pixelsPerSecond}px`;
            line.style.width = `${cooldown * pixelsPerSecond}px`;
            line.style.setProperty("--sim-cd-row", String(Number(event.cooldownRow || 0)));
            line.style.setProperty("--sim-cd-color", event.cooldownColor || SIMULATION_COOLDOWN_COLORS[0]);
            line.title = `${event.skillData.name || "Skill"} CD bis ${formatBasicAttackSeconds(event.time + cooldown)} (${formatBasicAttackSeconds(cooldown)})`;
            track.appendChild(line);
        });
}

function getSimulationSpTimeline(events, durationSeconds) {
    const battleEvents = [...events]
        .filter(event => event.spState || event.spRecoveryState)
        .sort((left, right) => (left.time - right.time) || (left.order - right.order));
    const points = [{
        time: 0,
        sp: SIMULATION_START_SP
    }];
    const markers = [];

    battleEvents.forEach(event => {
        const time = Math.max(0, Number(event.time) || 0);

        if (event.spState) {
            const spState = event.spState;
            points.push({
                time,
                sp: spState.before
            });
            points.push({
                time,
                sp: spState.after
            });
            markers.push({
                type: "cost",
                time,
                before: spState.before,
                after: spState.after,
                amount: spState.cost,
                affordable: spState.affordable,
                missing: spState.missing,
                name: event.skillData?.name || "Battle Skill",
                event
            });
        }

        if (event.spRecoveryState) {
            const recoveryState = event.spRecoveryState;
            points.push({
                time,
                sp: recoveryState.before
            });
            points.push({
                time,
                sp: recoveryState.after
            });
            markers.push({
                type: "recovery",
                time,
                before: recoveryState.before,
                after: recoveryState.after,
                amount: recoveryState.recovery,
                applied: recoveryState.applied,
                affordable: true,
                name: event.skillData?.name || "Skill",
                event
            });
        }
    });

    const lastPoint = points[points.length - 1];
    const endTime = Math.max(durationSeconds, lastPoint.time);
    const endSp = Math.min(
        SIMULATION_MAX_SP,
        Number(lastPoint.sp || 0) + Math.max(0, endTime - lastPoint.time) * getSimulationSpPerSecond()
    );
    points.push({
        time: endTime,
        sp: endSp
    });

    return {
        points,
        markers,
        minSp: Math.min(0, ...points.map(point => Number(point.sp) || 0))
    };
}

function getSimulationSpDisplayDomain(minSp) {
    const hasNegativeSp = Number(minSp) < 0;
    return {
        min: hasNegativeSp ? Math.min(minSp, -40) : 0,
        max: SIMULATION_MAX_SP
    };
}

function getSimulationSpY(sp, domain, height) {
    const topPadding = 8;
    const bottomPadding = 8;
    const range = Math.max(1, domain.max - domain.min);
    const normalized = (domain.max - sp) / range;
    return topPadding + normalized * (height - topPadding - bottomPadding);
}

function createSimulationSpSegment(start, end, domain, height, isNegative) {
    const path = createSvgElement("path");
    path.classList.add("rotation-sim-sp-line");
    if (isNegative) path.classList.add("is-negative");
    const startY = getSimulationSpY(start.sp, domain, height);
    const endY = getSimulationSpY(end.sp, domain, height);
    path.setAttribute("d", `M ${start.x} ${startY} L ${end.x} ${endY}`);
    return path;
}

function appendSimulationSpLineSegments(svg, points, pixelsPerSecond, domain, height) {
    for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1];
        const current = points[index];
        const start = {
            x: previous.time * pixelsPerSecond,
            sp: Number(previous.sp) || 0
        };
        const end = {
            x: current.time * pixelsPerSecond,
            sp: Number(current.sp) || 0
        };

        if ((start.sp >= 0 && end.sp >= 0) || (start.sp < 0 && end.sp < 0)) {
            svg.appendChild(createSimulationSpSegment(start, end, domain, height, start.sp < 0 || end.sp < 0));
            continue;
        }

        const ratio = (0 - start.sp) / (end.sp - start.sp);
        const zeroPoint = {
            x: start.x + (end.x - start.x) * ratio,
            sp: 0
        };

        svg.appendChild(createSimulationSpSegment(start, zeroPoint, domain, height, start.sp < 0));
        svg.appendChild(createSimulationSpSegment(zeroPoint, end, domain, height, end.sp < 0));
    }
}

function appendSimulationSpReference(svg, track, value, className, width, domain, height) {
    const y = getSimulationSpY(value, domain, height);
    const line = createSvgElement("line");
    line.classList.add("rotation-sim-sp-reference", className);
    line.setAttribute("x1", "0");
    line.setAttribute("x2", String(width));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    svg.appendChild(line);

    const label = document.createElement("span");
    label.className = `rotation-sim-sp-scale ${className}`;
    label.style.top = `${y}px`;
    label.textContent = `${value}`;
    track.appendChild(label);
}

function getSimulationSpMarkerText(marker) {
    if (marker.type === "cost" && marker.affordable === false) {
        const missing = Math.max(0, Number(marker.missing) || Number(marker.amount) - Number(marker.before));
        return `${formatSimulationSpValue(missing)} short`;
    }
    return marker.type === "recovery"
        ? `+${formatSimulationSpValue(marker.amount)}`
        : `-${formatSimulationSpValue(marker.amount)}`;
}

function getSimulationSpMarkerLayouts(markers, pixelsPerSecond, domain, height) {
    const placed = [];
    const baseCandidates = [
        { x: 0, y: 0 },
        { x: -24, y: -10 },
        { x: 24, y: 10 },
        { x: 24, y: -10 },
        { x: -24, y: 10 },
        { x: -48, y: 0 },
        { x: 48, y: 0 }
    ];

    return markers.map(marker => {
        const baseX = marker.time * pixelsPerSecond;
        const baseY = getSimulationSpY(marker.after, domain, height);
        const markerWidth = Math.max(34, getSimulationSpMarkerText(marker).length * 7 + 16);
        const markerHeight = 20;
        const candidates = marker.type === "recovery"
            ? baseCandidates
            : [
                baseCandidates[0],
                baseCandidates[2],
                baseCandidates[1],
                baseCandidates[4],
                baseCandidates[3],
                baseCandidates[6],
                baseCandidates[5]
            ];

        const layout = candidates.find(candidate => {
            const x = baseX + candidate.x;
            const y = baseY + candidate.y;
            return !placed.some(existing => {
                return Math.abs(x - existing.x) < ((markerWidth + existing.width) / 2) + 4
                    && Math.abs(y - existing.y) < ((markerHeight + existing.height) / 2) + 4;
            });
        }) || baseCandidates[0];

        const placedLayout = {
            x: baseX + layout.x,
            y: baseY + layout.y,
            width: markerWidth,
            height: markerHeight
        };
        placed.push(placedLayout);
        return placedLayout;
    });
}

function renderSimulationSpTrack(track, events, durationSeconds, pixelsPerSecond) {
    const timeline = getSimulationSpTimeline(events, durationSeconds);
    const width = durationSeconds * pixelsPerSecond;
    const height = SIMULATION_SP_TRACK_HEIGHT;
    const domain = getSimulationSpDisplayDomain(timeline.minSp);

    const svg = createSvgElement("svg");
    svg.classList.add("rotation-sim-sp-svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    appendSimulationSpReference(svg, track, SIMULATION_MAX_SP, "is-max", width, domain, height);
    appendSimulationSpReference(svg, track, 200, "is-sp-200", width, domain, height);
    appendSimulationSpReference(svg, track, 100, "is-sp-100", width, domain, height);
    appendSimulationSpReference(svg, track, 0, "is-zero", width, domain, height);

    appendSimulationSpLineSegments(svg, timeline.points, pixelsPerSecond, domain, height);
    track.appendChild(svg);

    const markerLayouts = getSimulationSpMarkerLayouts(timeline.markers, pixelsPerSecond, domain, height);
    timeline.markers.forEach((marker, index) => {
        const markerElement = document.createElement("div");
        markerElement.className = "rotation-sim-sp-marker";
        if (marker.type === "recovery") markerElement.classList.add("is-recovery");
        if (!marker.affordable) markerElement.classList.add("is-negative");
        markerElement.style.left = `${markerLayouts[index].x}px`;
        markerElement.style.top = `${markerLayouts[index].y}px`;
        markerElement.textContent = getSimulationSpMarkerText(marker);
        attachSimulationInspector(
            markerElement,
            createSimulationSpMarkerInspector(marker),
            `${marker.name || "SP"} inspector`
        );
        track.appendChild(markerElement);
    });
}

function toSimulationEffectTimelineNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function getSimulationEffectTimelineRegistryEntry(effect, type) {
    const rawKey = typeof effect === "string"
        ? effect
        : (effect?.appliesEffect || effect?.id || effect?.name || effect?.passiveName || effect?.effectKey);
    const key = normalizeSimulationEffectKey(rawKey);
    if (!key) return null;
    return type === "buff"
        ? (typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY[key] : null)
        : (typeof DEBUFF_REGISTRY !== "undefined" ? DEBUFF_REGISTRY[key] : null);
}

function getSimulationEffectTimelineIdentity(effect, type) {
    const item = typeof effect === "string" ? { id: effect } : (effect || {});
    const rawKey = item.effectKey || item.appliesEffect || item.id || item.name || item.passiveName;
    const effectKey = normalizeSimulationEffectKey(rawKey) || "effect";
    const sourceOperatorId = toSimulationEffectTimelineNumber(item.sourceOperatorId);
    const targetOperatorId = toSimulationEffectTimelineNumber(item.targetOperatorId);
    // Enemy debuff stacks belong to one shared enemy state. The operator that
    // applied the latest stack may change, but that must not start a second,
    // overlapping interval for the same debuff.
    const sourceKey = type === "debuff"
        ? "shared-enemy"
        : (sourceOperatorId === null ? "source" : `source-${sourceOperatorId}`);
    const targetKey = targetOperatorId !== null
        ? `operator-${targetOperatorId}`
        : normalizeSimulationEffectKey(item.target || (type === "debuff" ? "enemy" : "team"));
    return `${type}:${effectKey}:${sourceKey}:${targetKey}`;
}

function getSimulationEffectTimelineDuration(effect, type) {
    const registryEntry = getSimulationEffectTimelineRegistryEntry(effect, type);
    const duration = toSimulationEffectTimelineNumber(
        effect?.durationSeconds ?? effect?.duration ?? registryEntry?.durationSeconds
    );
    return duration !== null && duration > 0 ? duration : null;
}

function getSimulationEffectTimelineStart(effect, fallbackTime) {
    const stackTimes = Array.isArray(effect?.appliedStackTimes)
        ? effect.appliedStackTimes.map(toSimulationEffectTimelineNumber).filter(value => value !== null)
        : [];
    const explicitTimes = [
        ...stackTimes,
        toSimulationEffectTimelineNumber(effect?.startedAt),
        toSimulationEffectTimelineNumber(effect?.appliedAt)
    ].filter(value => value !== null);
    const start = explicitTimes.length > 0 ? Math.min(...explicitTimes) : Number(fallbackTime) || 0;
    return Math.max(0, start);
}

function getSimulationEffectTimelineExpectedEnd(effect, type, fallbackStart) {
    const expiresAt = toSimulationEffectTimelineNumber(effect?.expiresAt);
    if (expiresAt !== null) return expiresAt;
    const duration = getSimulationEffectTimelineDuration(effect, type);
    if (duration === null) return null;
    const stackTimes = Array.isArray(effect?.appliedStackTimes)
        ? effect.appliedStackTimes.map(toSimulationEffectTimelineNumber).filter(value => value !== null)
        : [];
    if (stackTimes.length > 0) return Math.max(...stackTimes) + duration;
    const appliedAt = toSimulationEffectTimelineNumber(effect?.appliedAt);
    if (appliedAt !== null) return appliedAt + duration;
    const startedAt = toSimulationEffectTimelineNumber(effect?.startedAt);
    if (startedAt !== null) return startedAt + duration;
    return fallbackStart + duration;
}

function getSimulationEffectTimelineName(effect, type) {
    const registryEntry = getSimulationEffectTimelineRegistryEntry(effect, type);
    const fallbackName = type === "buff"
        ? (typeof getBuffDisplayName === "function" ? getBuffDisplayName(effect) : "")
        : (typeof getDebuffDisplayName === "function" ? getDebuffDisplayName(effect) : "");
    return effect?.passiveName
        || effect?.name
        || registryEntry?.name
        || fallbackName
        || String(effect?.appliesEffect || effect?.id || "Effect").replace(/_/g, " ");
}

function getSimulationEffectTimelineIcon(effect, type) {
    if (effect?.weaponIcon) return effect.weaponIcon;
    try {
        return type === "buff"
            ? (typeof resolveBuffIcon === "function" ? resolveBuffIcon(effect) : "")
            : (typeof resolveDebuffIcon === "function" ? resolveDebuffIcon(effect) : "");
    } catch (error) {
        return "";
    }
}

function getSimulationEffectTimelineTarget(effect, type) {
    if (effect?.target === "team") {
        const targetCount = Math.max(0, Number(effect?.targetCount) || 0);
        return targetCount > 1 ? `Team (${targetCount})` : "Team";
    }
    const targetOperatorId = toSimulationEffectTimelineNumber(effect?.targetOperatorId);
    if (targetOperatorId !== null) return getSimulationOperatorName(targetOperatorId);
    if (effect?.target === "enemy" || type === "debuff") return "Enemy";
    const sourceOperatorId = toSimulationEffectTimelineNumber(effect?.sourceOperatorId);
    return sourceOperatorId !== null ? getSimulationOperatorName(sourceOperatorId) : "Team";
}

function closeSimulationEffectTimelineInterval(activeIntervals, intervals, key, closeTime, options = {}) {
    const interval = activeIntervals.get(key);
    if (!interval) return;
    const expectedEnd = toSimulationEffectTimelineNumber(interval.expectedEnd);
    const requestedEnd = Math.max(interval.start, Number(closeTime) || 0);
    const end = Math.max(
        interval.start,
        Math.min(
            requestedEnd,
            expectedEnd ?? requestedEnd
        )
    );
    interval.end = end;
    interval.openEnded = options.timelineEnd === true
        && (expectedEnd === null || expectedEnd > end + 0.001);
    if (end - interval.start >= 0.01) intervals.push(interval);
    activeIntervals.delete(key);
}

function getSimulationEffectTimelineStackCount(effect) {
    const stacks = Number(effect?.currentStacks ?? effect?.stackCount ?? effect?.stacks ?? 1);
    return Math.max(1, Number.isFinite(stacks) ? Math.round(stacks) : 1);
}

function advanceSimulationEffectTimelineExpirations(activeIntervals, intervals, untilTime) {
    activeIntervals.forEach((initialInterval, key) => {
        const duration = getSimulationEffectTimelineDuration(initialInterval.effect, initialInterval.type);
        const stackTimes = Array.isArray(initialInterval.effect?.appliedStackTimes)
            ? initialInterval.effect.appliedStackTimes
                .map(toSimulationEffectTimelineNumber)
                .filter(value => value !== null)
            : [];
        if (duration === null || stackTimes.length !== initialInterval.stackCount) return;

        const expirations = [...new Set(stackTimes
            .map(appliedAt => appliedAt + duration)
            .filter(expiresAt => expiresAt > initialInterval.start + 0.001 && expiresAt <= untilTime + 0.001))]
            .sort((left, right) => left - right);

        expirations.forEach(expiresAt => {
            const current = activeIntervals.get(key);
            if (!current) return;
            const expiredStacks = stackTimes.filter(appliedAt => Math.abs((appliedAt + duration) - expiresAt) <= 0.001).length;
            const nextStackCount = Math.max(0, current.stackCount - expiredStacks);
            closeSimulationEffectTimelineInterval(activeIntervals, intervals, key, expiresAt);
            if (nextStackCount <= 0) return;

            const remainingStackTimes = stackTimes.filter(appliedAt => appliedAt + duration > expiresAt + 0.001);
            const effect = {
                ...current.effect,
                appliedStackTimes: remainingStackTimes,
                currentStacks: nextStackCount,
                stackCount: nextStackCount,
                stacks: nextStackCount
            };
            activeIntervals.set(key, {
                key,
                type: current.type,
                effect,
                start: expiresAt,
                end: null,
                expectedEnd: remainingStackTimes.length > 0
                    ? Math.max(...remainingStackTimes) + duration
                    : expiresAt,
                stackCount: nextStackCount
            });
        });
    });
}

function normalizeSimulationEffectIntervals(intervals, type) {
    const deduplicated = new Map();
    intervals.forEach(interval => {
        const intervalKey = [
            interval.key,
            Math.round(interval.start * 1000),
            Math.round(interval.end * 1000),
            interval.stackCount || 1
        ].join(":");
        const existing = deduplicated.get(intervalKey);
        if (existing) {
            existing.openEnded = existing.openEnded || interval.openEnded;
            return;
        }
        deduplicated.set(intervalKey, interval);
    });

    const uniqueIntervals = Array.from(deduplicated.values());
    if (type !== "buff") return uniqueIntervals;

    const teamGroups = new Map();
    uniqueIntervals.forEach(interval => {
        const targetOperatorId = toSimulationEffectTimelineNumber(interval.effect?.targetOperatorId);
        if (targetOperatorId === null) return;
        const effectKey = normalizeSimulationEffectKey(
            interval.effect?.effectKey
            || interval.effect?.appliesEffect
            || interval.effect?.id
            || interval.effect?.name
            || interval.effect?.passiveName
        ) || "effect";
        const sourceOperatorId = toSimulationEffectTimelineNumber(interval.effect?.sourceOperatorId);
        const groupKey = [
            effectKey,
            sourceOperatorId ?? "source",
            Math.round(interval.start * 1000),
            Math.round(interval.end * 1000),
            interval.stackCount || 1
        ].join(":");
        if (!teamGroups.has(groupKey)) teamGroups.set(groupKey, []);
        teamGroups.get(groupKey).push(interval);
    });

    const groupedIntervals = new Set();
    const mergedIntervals = [];
    teamGroups.forEach(group => {
        const targetIds = [...new Set(group
            .map(interval => toSimulationEffectTimelineNumber(interval.effect?.targetOperatorId))
            .filter(value => value !== null))];
        if (targetIds.length < 2) return;
        group.forEach(interval => groupedIntervals.add(interval));
        const first = group[0];
        mergedIntervals.push({
            ...first,
            key: `${first.key}:team`,
            effect: {
                ...first.effect,
                target: "team",
                targetOperatorId: null,
                targetOperatorIds: targetIds,
                targetCount: targetIds.length
            },
            stackCount: first.stackCount || 1,
            openEnded: group.some(interval => interval.openEnded)
        });
    });

    const groupedResult = [
        ...uniqueIntervals.filter(interval => !groupedIntervals.has(interval)),
        ...mergedIntervals
    ];

    const compactTeamIntervals = new Map();
    const result = [];
    groupedResult.forEach(interval => {
        const target = getSimulationEffectTimelineTarget(interval.effect, type);
        if (!target.startsWith("Team")) {
            result.push(interval);
            return;
        }
        const effectKey = normalizeSimulationEffectKey(
            getSimulationEffectTimelineName(interval.effect, type)
        ) || "effect";
        const groupKey = [
            effectKey,
            Math.round(interval.start * 1000),
            Math.round(interval.end * 1000),
            interval.stackCount || 1
        ].join(":");
        const existing = compactTeamIntervals.get(groupKey);
        const intervalTargetIds = [
            ...(Array.isArray(interval.effect?.targetOperatorIds) ? interval.effect.targetOperatorIds : []),
            toSimulationEffectTimelineNumber(interval.effect?.targetOperatorId)
        ].filter(value => value !== null);
        if (existing) {
            const targetIds = [...new Set([
                ...(existing.effect.targetOperatorIds || []),
                ...intervalTargetIds
            ])];
            existing.effect.targetOperatorIds = targetIds;
            existing.effect.targetCount = Math.max(
                targetIds.length,
                Number(existing.effect.targetCount) || 0,
                Number(interval.effect?.targetCount) || 0
            );
            existing.openEnded = existing.openEnded || interval.openEnded;
            return;
        }
        interval.effect = {
            ...interval.effect,
            target: "team",
            targetOperatorId: null,
            targetOperatorIds: [...new Set(intervalTargetIds)],
            targetCount: Math.max(
                intervalTargetIds.length,
                Number(interval.effect?.targetCount) || 0
            )
        };
        compactTeamIntervals.set(groupKey, interval);
        result.push(interval);
    });

    return result;
}

function syncSimulationEffectTimelineSnapshot(activeIntervals, intervals, effects, type, eventTime, sourceEvent = null) {
    const snapshot = new Map();
    (Array.isArray(effects) ? effects : []).forEach(rawEffect => {
        const effect = typeof rawEffect === "string" ? { id: rawEffect } : rawEffect;
        if (!effect || effect.visible === false) return;
        if (effect.effectKey && effect.weaponKey) return;
        snapshot.set(getSimulationEffectTimelineIdentity(effect, type), effect);
    });

    Array.from(activeIntervals.keys()).forEach(key => {
        if (!snapshot.has(key)) {
            closeSimulationEffectTimelineInterval(activeIntervals, intervals, key, eventTime);
        }
    });

    snapshot.forEach((effect, key) => {
        const start = Math.min(eventTime, getSimulationEffectTimelineStart(effect, eventTime));
        const expectedEnd = getSimulationEffectTimelineExpectedEnd(effect, type, start);
        const stackCount = getSimulationEffectTimelineStackCount(effect);
        const current = activeIntervals.get(key);
        if (current) {
            if (current.stackCount !== stackCount) {
                closeSimulationEffectTimelineInterval(activeIntervals, intervals, key, eventTime);
                activeIntervals.set(key, {
                    key,
                    type,
                    effect,
                    start: eventTime,
                    end: null,
                    expectedEnd,
                    stackCount,
                    sourceEvent
                });
                return;
            }
            current.effect = effect;
            current.expectedEnd = expectedEnd ?? current.expectedEnd;
            if (!current.sourceEvent && sourceEvent) current.sourceEvent = sourceEvent;
            return;
        }
        activeIntervals.set(key, {
            key,
            type,
            effect,
            start,
            end: null,
            expectedEnd,
            stackCount,
            sourceEvent
        });
    });
}

function buildSimulationEffectIntervals(events, type, durationSeconds, weaponEffectHistory = []) {
    const timelineDuration = Math.max(0, Number(durationSeconds) || 0);
    const intervals = [];
    const activeIntervals = new Map();
    [...(Array.isArray(events) ? events : [])]
        .sort((left, right) => (Number(left?.time) || 0) - (Number(right?.time) || 0) || (Number(left?.order) || 0) - (Number(right?.order) || 0))
        .forEach(event => {
            const eventTime = Math.max(0, Number(event?.time) || 0);
            advanceSimulationEffectTimelineExpirations(activeIntervals, intervals, eventTime);
            const before = type === "buff" ? event?.activeBuffsBefore : event?.activeDebuffsBefore;
            const after = type === "buff" ? event?.activeBuffs : event?.activeDebuffs;
            syncSimulationEffectTimelineSnapshot(activeIntervals, intervals, before, type, eventTime);
            syncSimulationEffectTimelineSnapshot(activeIntervals, intervals, after, type, eventTime, event);
        });

    advanceSimulationEffectTimelineExpirations(activeIntervals, intervals, timelineDuration);
    Array.from(activeIntervals.keys()).forEach(key => {
        closeSimulationEffectTimelineInterval(activeIntervals, intervals, key, timelineDuration, { timelineEnd: true });
    });

    (Array.isArray(weaponEffectHistory) ? weaponEffectHistory : []).forEach(effect => {
        const effectType = effect?.target === "enemy" ? "debuff" : "buff";
        if (effectType !== type) return;
        const start = Math.max(0, toSimulationEffectTimelineNumber(effect?.startedAt) ?? 0);
        const end = Math.min(
            timelineDuration,
            Math.max(start, toSimulationEffectTimelineNumber(effect?.expiresAt) ?? start)
        );
        if (end - start < 0.01) return;
        intervals.push({
            key: getSimulationEffectTimelineIdentity(effect, type),
            type,
            effect,
            start,
            end,
            expectedEnd: end,
            stackCount: 1,
            openEnded: false
        });
    });

    return normalizeSimulationEffectIntervals(intervals, type)
        .sort((left, right) => (left.start - right.start) || (left.end - right.end));
}

function buildSimulationBattlefieldResourceIntervals(events, durationSeconds) {
    const timelineDuration = Math.max(0, Number(durationSeconds) || 0);
    const snapshotsByResource = new Map();
    [...(Array.isArray(events) ? events : [])]
        .sort((left, right) => (Number(left?.time) || 0) - (Number(right?.time) || 0) || (Number(left?.order) || 0) - (Number(right?.order) || 0))
        .forEach(event => {
            const state = event?.battlefieldResourceState || event?.skillData?.battlefieldResourceState;
            if (!state?.after?.stateKey) return;
            const stateKey = state.after.stateKey;
            if (!snapshotsByResource.has(stateKey)) snapshotsByResource.set(stateKey, new Map());
            snapshotsByResource.get(stateKey).set(Math.max(0, Number(event.time) || 0), {
                time: Math.max(0, Number(event.time) || 0),
                order: Number(event.order) || 0,
                state,
                sourceEvent: event
            });
        });

    const intervals = [];
    snapshotsByResource.forEach((snapshotMap, stateKey) => {
        const snapshots = [...snapshotMap.values()].sort((left, right) => left.time - right.time || left.order - right.order);
        snapshots.forEach((snapshot, index) => {
            const start = snapshot.time;
            const end = Math.min(timelineDuration, snapshots[index + 1]?.time ?? timelineDuration);
            if (end - start < 0.01) return;
            const expiryTimes = (Array.isArray(snapshot.state.after.stackExpiresAt)
                ? snapshot.state.after.stackExpiresAt
                : [])
                .map(value => value === null || value === undefined ? null : Number(value))
                .filter(value => value === null || Number.isFinite(value));
            const breakpoints = [...new Set([
                ...expiryTimes.filter(value => value !== null && value > start + 0.001 && value < end - 0.001),
                end
            ])].sort((left, right) => left - right);
            let cursor = start;
            breakpoints.forEach(segmentEnd => {
                const stackCount = expiryTimes.filter(value => value === null || value > cursor + 0.001).length;
                if (stackCount > 0 && segmentEnd - cursor >= 0.01) {
                    const resource = snapshot.state.after;
                    intervals.push({
                        key: `buff:battlefield-resource:${stateKey}:${Math.round(cursor * 1000)}:${stackCount}`,
                        type: "buff",
                        start: cursor,
                        end: segmentEnd,
                        expectedEnd: segmentEnd,
                        stackCount,
                        openEnded: segmentEnd >= timelineDuration - 0.001
                            && expiryTimes.some(value => value === null || value > timelineDuration + 0.001),
                        sourceEvent: snapshot.sourceEvent,
                        effect: {
                            id: resource.resourceKey,
                            appliesEffect: resource.resourceKey,
                            name: resource.name,
                            battlefieldResource: true,
                            stateKey,
                            sourceOperatorId: snapshot.sourceEvent?.sourceOperatorId,
                            target: "self",
                            visible: true,
                            stackable: true,
                            currentStacks: stackCount,
                            maxStacks: resource.maxStacks,
                            stackExpiresAt: expiryTimes
                        }
                    });
                }
                cursor = segmentEnd;
            });
        });
    });
    return intervals.sort((left, right) => left.start - right.start || left.end - right.end);
}

function assignSimulationEffectIntervalLanes(intervals) {
    const laneEnds = [];
    intervals.forEach(interval => {
        let lane = laneEnds.findIndex(end => end <= interval.start + 0.001);
        if (lane < 0) lane = laneEnds.length;
        laneEnds[lane] = interval.end;
        interval.lane = lane;
    });
    return Math.max(1, laneEnds.length);
}

function formatSimulationEffectTimelineRange(interval) {
    const duration = Math.max(0, interval.end - interval.start);
    const durationText = formatSimulationInspectorSeconds(duration);
    return interval.openEnded ? `${durationText}, until timeline end` : durationText;
}

function getSimulationEffectInspectorData(effect, type) {
    const registryEntry = getSimulationEffectTimelineRegistryEntry(effect, type) || {};
    return {
        ...registryEntry,
        ...(effect || {})
    };
}

function getSimulationEffectInspectorSummary(effect, type) {
    const data = getSimulationEffectInspectorData(effect, type);
    const summary = String(
        data.effectSummary
        || data.summary
        || data.effectDescription
        || data.description
        || ""
    ).trim();
    const values = [];
    const usedKeys = new Set();
    const readPercent = (label, keys, options = {}) => {
        const key = keys.find(candidate => Number.isFinite(Number(data[candidate])));
        if (!key || usedKeys.has(key)) return;
        usedKeys.add(key);
        const value = Number(data[key]);
        const sign = options.unsigned ? "" : (value >= 0 ? "+" : "");
        values.push(`${sign}${value}% ${label}`);
    };

    readPercent("Crit Rate", ["critRatePercent", "criticalRatePercent", "critRateBonusPercent", "criticalRateBonusPercent"]);
    readPercent("Crit DMG", ["critDamagePercent", "criticalDamagePercent", "critDamageBonusPercent", "criticalDamageBonusPercent"]);
    readPercent("ATK", ["atkPercent", "attackBonusPercent", "activeBuffAtkPercent"]);
    readPercent("All DMG", ["allDamageBonusPercent", "allDamageDealtPercent", "damageBonusPercent"]);
    readPercent("Physical DMG", ["physicalDamageBonusPercent", "physicalDamageDealtPercent"]);
    readPercent("Heat DMG", ["heatDamageBonusPercent", "heatDamageDealtPercent"]);
    readPercent("Cryo DMG", ["cryoDamageBonusPercent", "cryoDamageDealtPercent"]);
    readPercent("Electric DMG", ["electricDamageBonusPercent", "electricDamageDealtPercent"]);
    readPercent("Nature DMG", ["natureDamageBonusPercent", "natureDamageDealtPercent"]);
    readPercent("Arts DMG", ["artsDamageBonusPercent", "artsDamageDealtPercent", "artsDamagePercent"]);
    readPercent("damage taken", ["susceptibilityPercent", "damageTakenPercent", "increasedDamageTakenPercent"]);
    readPercent("DEF reduction", ["defenseReductionPercent"], { unsigned: true });
    readPercent("RES reduction", ["resistanceReductionPercent"], { unsigned: true });
    readPercent("damage reduction", ["protectionPercent"], { unsigned: true });
    readPercent("Max HP as Shield", ["shieldMaxHpPercent"], { unsigned: true });
    readPercent("Treatment Effect", ["treatmentEffectPercent"]);

    if (Number.isFinite(Number(data.valuePercent)) && !usedKeys.has("valuePercent")) {
        const effectKey = normalizeSimulationEffectKey(data.appliesEffect || data.id || data.name);
        if (effectKey.includes("susceptibility")) {
            readPercent("damage taken", ["valuePercent"]);
        } else if (effectKey.includes("protection")) {
            readPercent("damage reduction", ["valuePercent"], { unsigned: true });
        } else if (effectKey.includes("slow")) {
            readPercent("movement speed reduction", ["valuePercent"], { unsigned: true });
        } else {
            readPercent("effect value", ["valuePercent"]);
        }
    }

    if (values.length > 0) return values.join(" · ");
    if (summary) return summary;
    if (data.battlefieldResource) {
        const maxStacks = Number(data.maxStacks);
        return Number.isFinite(maxStacks) && maxStacks > 0
            ? `Stored battlefield resource · up to ${maxStacks} stacks`
            : "Stored battlefield resource";
    }
    if (data.stackable === true || Number(data.maxStacks) > 1) {
        const maxStacks = Number(data.maxStacks);
        return Number.isFinite(maxStacks) && maxStacks > 1
            ? `Stackable effect · up to ${maxStacks} stacks`
            : "Stackable effect";
    }
    return "No detailed effect value is stored yet.";
}

function createSimulationEffectInspector(interval, type) {
    const sourceEvent = interval?.sourceEvent;
    const panel = document.createElement("div");
    panel.classList.add("rotation-sim-inspector", "is-effect-inspector");
    panel.addEventListener("click", event => event.stopPropagation());
    const name = getSimulationEffectTimelineName(interval.effect, type);
    const target = getSimulationEffectTimelineTarget(interval.effect, type);
    const header = createSimulationInspectorHeader(
        name,
        `${interval.effect?.battlefieldResource ? "RESOURCE" : (type === "buff" ? "BUFF" : "DEBUFF")} - ${formatSimulationInspectorSeconds(interval.start)}`
    );
    panel.appendChild(header);

    const summary = document.createElement("p");
    summary.className = "rotation-sim-effect-summary";
    summary.textContent = getSimulationEffectInspectorSummary(interval.effect, type);
    panel.appendChild(summary);

    const stackCount = Math.max(1, Number(interval.stackCount) || 1);
    const effectData = getSimulationEffectInspectorData(interval.effect, type);
    const maxStacks = Math.max(0, Number(effectData.maxStacks) || 0);
    appendSimulationInspectorSection(panel, "Details", [
        ["Target", target],
        ["Duration", formatSimulationEffectTimelineRange(interval)],
        ["Stacks", effectData.stackable === true || stackCount > 1
            ? `${stackCount}${maxStacks > 1 ? ` / ${maxStacks}` : ""}`
            : ""]
    ]);

    if (sourceEvent?.skillData) {
        appendSimulationInspectorSection(panel, "Source", [
            ["Skill", sourceEvent.skillData.name || "Timeline event"],
            ["Operator", getSimulationOperatorName(getSimulationSourceOperatorId(sourceEvent.skillData))],
            ["Applied", formatSimulationInspectorSeconds(sourceEvent.time)]
        ]);
    }

    return panel;
}

function createSimulationBattlefieldResourceIcon(stackCount, maxStacks = 9) {
    const meter = document.createElement("span");
    meter.className = "rotation-sim-resource-meter";
    meter.setAttribute("aria-hidden", "true");
    const grid = document.createElement("span");
    grid.className = "rotation-sim-resource-grid";
    const normalizedMax = Math.max(1, Math.min(9, Math.round(Number(maxStacks) || 9)));
    const normalizedStacks = Math.max(0, Math.min(normalizedMax, Math.round(Number(stackCount) || 0)));
    for (let index = 0; index < 9; index++) {
        const cell = document.createElement("span");
        cell.className = "rotation-sim-resource-cell";
        if (index < normalizedStacks) cell.classList.add("is-filled");
        if (index >= normalizedMax) cell.classList.add("is-unused");
        grid.appendChild(cell);
    }
    const count = document.createElement("span");
    count.className = "rotation-sim-resource-count";
    count.textContent = String(normalizedStacks);
    meter.append(grid, count);
    return meter;
}

function createSimulationEffectTimelineTrack(type, events, durationSeconds, pixelsPerSecond, trackWidth, inspectorEvents = []) {
    const weaponEffectHistory = window.__simulationWeaponAtkSource?.effectHistory || [];
    const intervals = [
        ...buildSimulationEffectIntervals(events, type, durationSeconds, weaponEffectHistory),
        ...(type === "buff" ? buildSimulationBattlefieldResourceIntervals(events, durationSeconds) : [])
    ].sort((left, right) => left.start - right.start || left.end - right.end);
    const inspectorEventsByKey = new Map((Array.isArray(inspectorEvents) ? inspectorEvents : []).map(event => [
        getSimulationEventSyncKey(event),
        event
    ]));
    intervals.forEach(interval => {
        const sourceKey = interval.sourceEvent ? getSimulationEventSyncKey(interval.sourceEvent) : "";
        if (sourceKey && inspectorEventsByKey.has(sourceKey)) {
            interval.sourceEvent = inspectorEventsByKey.get(sourceKey);
        }
    });
    const laneCount = assignSimulationEffectIntervalLanes(intervals);
    const rowHeight = 28;
    const trackHeight = Math.max(48, 12 + (laneCount * rowHeight));
    const trackKey = type === "buff" ? "buffs" : "debuffs";
    const track = document.createElement("div");
    track.className = `rotation-sim-effect-track is-${type}`;
    track.dataset.simulationTrack = trackKey;
    track.dataset.simulationTrackSize = `${trackHeight}px`;
    track.style.width = `${trackWidth}px`;
    track.style.height = `${trackHeight}px`;

    const label = createRotationTimelineLabel(type === "buff" ? "Buffs" : "Debuffs", trackKey);
    label.dataset.simulationTrackSize = `${trackHeight}px`;
    label.title = `${intervals.length} ${type === "buff" ? "buff" : "debuff"} interval${intervals.length === 1 ? "" : "s"}`;

    if (intervals.length === 0) {
        const empty = document.createElement("span");
        empty.className = "rotation-sim-effect-empty";
        empty.textContent = type === "buff" ? "No active buffs" : "No active debuffs";
        track.appendChild(empty);
        return { track, label, intervals, trackHeight };
    }

    intervals.forEach(interval => {
        const width = Math.max(16, (interval.end - interval.start) * pixelsPerSecond);
        const name = getSimulationEffectTimelineName(interval.effect, type);
        const target = getSimulationEffectTimelineTarget(interval.effect, type);
        const bar = document.createElement("div");
        bar.className = "rotation-sim-effect-bar";
        if (interval.effect?.battlefieldResource) bar.classList.add("is-battlefield-resource");
        if (width < 92) bar.classList.add("is-compact");
        if (width < 38) bar.classList.add("is-icon-only");
        if (interval.openEnded) bar.classList.add("is-open-ended");
        bar.style.left = `${interval.start * pixelsPerSecond}px`;
        bar.style.top = `${6 + (interval.lane * rowHeight)}px`;
        bar.style.width = `${width}px`;
        bar.dataset.simulationEffectStart = String(interval.start);
        bar.dataset.simulationEffectEnd = String(interval.end);
        bar.tabIndex = 0;
        bar.setAttribute("role", "button");
        bar.setAttribute("aria-haspopup", "dialog");
        bar.setAttribute(
            "aria-label",
            `${name}, ${target}, ${formatSimulationEffectTimelineRange(interval)}, from ${formatSimulationInspectorSeconds(interval.start)} to ${formatSimulationInspectorSeconds(interval.end)}`
        );

        const iconUrl = getSimulationEffectTimelineIcon(interval.effect, type);
        const iconWrap = document.createElement("span");
        iconWrap.className = "rotation-sim-effect-bar-icon";
        if (interval.effect?.battlefieldResource) {
            iconWrap.classList.add("is-battlefield-resource");
            iconWrap.appendChild(createSimulationBattlefieldResourceIcon(
                interval.stackCount,
                interval.effect?.maxStacks
            ));
        } else if (iconUrl) {
            const icon = document.createElement("img");
            icon.src = iconUrl;
            icon.alt = "";
            icon.loading = "lazy";
            iconWrap.appendChild(icon);
        }
        const copy = document.createElement("span");
        copy.className = "rotation-sim-effect-bar-copy";
        const nameElement = document.createElement("strong");
        nameElement.textContent = interval.effect?.battlefieldResource
            ? name
            : `${name}${interval.stackCount > 1 ? ` x${interval.stackCount}` : ""}`;
        const meta = document.createElement("small");
        meta.textContent = `${target} | ${formatSimulationEffectTimelineRange(interval)}`;
        copy.append(nameElement, meta);
        bar.append(iconWrap, copy);
        attachSimulationInspector(
            bar,
            createSimulationEffectInspector(interval, type),
            `${name} effect inspector`
        );
        track.appendChild(bar);
    });
    return { track, label, intervals, trackHeight };
}

function syncSimulationEffectTrackCursor(body, time) {
    body.querySelectorAll(".rotation-sim-effect-bar").forEach(bar => {
        const start = Number(bar.dataset.simulationEffectStart);
        const end = Number(bar.dataset.simulationEffectEnd);
        bar.classList.toggle(
            "is-cursor-active",
            Number.isFinite(start) && Number.isFinite(end) && time >= start - 0.001 && time < end - 0.001
        );
    });
}

function getSimulationFinalStrikeTimes(attackData, durationSeconds, segments = null) {
    const times = [];
    const attackSegments = Array.isArray(segments) && segments.length > 0
        ? segments
        : [{ start: 0, end: durationSeconds, attackData }];
    attackSegments.forEach(segment => {
        const segmentAttack = segment.attackData;
        if (!segmentAttack?.hasBasicAttackConfig || typeof getBasicAttackHitTimeline !== "function") return;
        const slotDuration = getTimelineSecondsPerSlot(segmentAttack);
        const cycleDuration = getBasicAttackCycleDuration(segmentAttack, slotDuration);
        const finalHit = getBasicAttackHitTimeline(segmentAttack).find(hit => isFinalBasicAttackHit(segmentAttack, hit));
        if (!finalHit) return;
        for (let localCycleStart = 0; segment.start + localCycleStart <= segment.end; localCycleStart += cycleDuration) {
            const cycleStart = segment.start + localCycleStart;
        const absoluteTime = cycleStart + finalHit.time;
            if (absoluteTime <= segment.end + 0.0001 && absoluteTime <= durationSeconds + 0.0001) {
                times.push(Math.round(absoluteTime * 100) / 100);
            }
        }
    });

    return times;
}

function getSimulationBasicAttackActionEvents(attackData, durationSeconds, sourceOperatorId, segments = null) {
    const events = [];
    let order = 0;
    const attackSegments = Array.isArray(segments) && segments.length > 0
        ? segments
        : [{ start: 0, end: durationSeconds, attackData }];
    attackSegments.forEach(segment => {
        const segmentAttack = segment.attackData;
        if (!segmentAttack?.hasBasicAttackConfig || typeof getBasicAttackHitTimeline !== "function") return;
        const slotDuration = getTimelineSecondsPerSlot(segmentAttack);
        const cycleDuration = getBasicAttackCycleDuration(segmentAttack, slotDuration);
        const hits = getBasicAttackHitTimeline(segmentAttack);
        for (let localCycleStart = 0; segment.start + localCycleStart <= segment.end; localCycleStart += cycleDuration) {
            const cycleStart = segment.start + localCycleStart;
        hits.forEach(hit => {
            if (isFinalBasicAttackHit(segmentAttack, hit)) return;
            const absoluteTime = cycleStart + hit.time;
            if (absoluteTime > segment.end + 0.0001 || absoluteTime > durationSeconds + 0.0001) return;
            events.push({
                kind: "basic-attack-hit",
                time: Math.round(absoluteTime * 1000) / 1000,
                order: 0.25 + (order++ / 10000),
                sourceOperatorId,
                action: {
                    actionType: "basic_attack_hit",
                    hit: Number(hit.hit || 1),
                    sequenceIndex: Number(hit.sequenceIndex || hit.hit || 1),
                    hitInSequence: Number(hit.hitInSequence || 1),
                    actorScope: "controlled",
                    formKey: segment.form?.formKey || null
                }
            });
        });
        }
    });

    return events;
}

function renderSimulationRotation() {
    const container = document.getElementById("rotationDropZone");
    if (!container) return;
    stopSimulationCursorPlayback();
    cleanupDetachedSimulationInspectors();
    removeBasicAttackEntriesFromRotation();
    const previousTrackScrollLeft = container.querySelector(".rotation-sim-track-scroll")?.scrollLeft || 0;
    container.innerHTML = "";

    const timelineBasicAttackData = getTimelineBasicAttackData();
    const secondsPerSlot = getTimelineSecondsPerSlot(timelineBasicAttackData);
    const entries = rotation.map((entry, index) => ({ entry, index })).filter(item => item.entry);
    const manualSkillEvents = getSimulationManualSkillEvents(entries, secondsPerSlot);
    const maxEntryTime = manualSkillEvents.reduce((max, event) => Math.max(max, event.time), 0);
    const maxManualFollowUpTime = manualSkillEvents.reduce((max, event) => {
        const delayedSeconds = Math.max(0, Number(event.skillData?.delayedFollowUp?.delaySeconds) || 0);
        const sequenceSeconds = Math.max(0, Number(event.skillData?.manualSequence?.automaticDelaySeconds) || 0);
        return Math.max(max, Number(event.time) + delayedSeconds, Number(event.time) + sequenceSeconds);
    }, maxEntryTime);
    const firstBasicAttackCycle = timelineBasicAttackData?.hasBasicAttackConfig
        ? getBasicAttackCycleDuration(timelineBasicAttackData, secondsPerSlot)
        : 0;
    const configuredDurationSeconds = Number(uiSettings?.simulationDurationSeconds);
    const sharedDurationSeconds = Number.isFinite(configuredDurationSeconds) && configuredDurationSeconds > 0
        ? configuredDurationSeconds
        : 0;
    const naturalDurationSeconds = Math.max(4, Math.ceil(maxEntryTime + 2), Math.ceil(maxManualFollowUpTime + 1), Math.ceil(firstBasicAttackCycle + 1));
    const formIntervals = window.__simulationOperatorFormIntervals || [];
    const maxFormEnd = formIntervals.reduce((max, interval) => Math.max(max, Number(interval.end) || 0), 0);
    const initialDurationSeconds = Math.max(
        naturalDurationSeconds,
        Math.ceil(maxFormEnd),
        sharedDurationSeconds > 0 ? sharedDurationSeconds : 20
    );
    const leaderId = Array.isArray(selectedTeam) ? selectedTeam[0] : null;
    const initialBasicAttackSegments = typeof getBasicAttackFormSegments === "function"
        ? getBasicAttackFormSegments(leaderId, initialDurationSeconds, formIntervals)
        : null;
    const finalStrikeTimes = getSimulationFinalStrikeTimes(timelineBasicAttackData, initialDurationSeconds, initialBasicAttackSegments);
    const basicAttackActionEvents = getSimulationBasicAttackActionEvents(
        timelineBasicAttackData,
        initialDurationSeconds,
        leaderId,
        initialBasicAttackSegments
    );
    const finalStrikeStateEvents = createSimulationFinalStrikeStateEvents(leaderId, finalStrikeTimes);
    const preliminaryEffectEvents = enrichSimulationSkillEventsWithEffects([
        ...(typeof prepareSimulationSkillEventsForTriggerPass === "function"
            ? prepareSimulationSkillEventsForTriggerPass(manualSkillEvents)
            : manualSkillEvents),
        ...finalStrikeStateEvents
    ]);
    const preliminaryBurstEvents = typeof enrichSimulationEventsWithInflictionBursts === "function"
        ? enrichSimulationEventsWithInflictionBursts(preliminaryEffectEvents)
            .filter(event => event?.kind === "arts-burst")
        : [];
    const autoComboEvents = collectSimulationFinalStrikeComboSkills(
        leaderId,
        finalStrikeTimes,
        [
            ...(typeof prepareSimulationSkillEventsForTriggerPass === "function"
                ? prepareSimulationSkillEventsForTriggerPass(manualSkillEvents)
                : manualSkillEvents),
            ...preliminaryBurstEvents
        ],
        basicAttackActionEvents
    );
    const autoSkillEvents = autoComboEvents.filter(event => !isSimulationProblemEvent(event));
    const simulationProblemEvents = autoComboEvents.filter(event => isSimulationProblemEvent(event));
    const cooldownEndTime = getSimulationCooldownEndTime(entries, secondsPerSlot, autoSkillEvents);
    const durationSeconds = Math.max(initialDurationSeconds, Math.ceil(cooldownEndTime + 1));
    const basicAttackSegments = typeof getBasicAttackFormSegments === "function"
        ? getBasicAttackFormSegments(leaderId, durationSeconds, formIntervals)
        : initialBasicAttackSegments;
    const pixelsPerSecond = getSimulationPixelsPerSecond();
    const trackWidth = durationSeconds * pixelsPerSecond;
    const mechanicEvents = [
        ...manualSkillEvents,
        ...autoSkillEvents,
        ...finalStrikeStateEvents
    ];
    const resolvedMechanicEvents = typeof resolveSimulationFollowUpEvents === "function"
        ? resolveSimulationFollowUpEvents(mechanicEvents)
        : mechanicEvents;
    const passiveSourceEvents = resolvedMechanicEvents.map((event, index) => ({
        ...event,
        simulationPassiveSourceIndex: index
    }));
    const preliminaryPassiveEffectEvents = enrichSimulationSkillEventsWithEffects(passiveSourceEvents);
    const passiveModifiedEvents = typeof resolveSimulationOperatorPassiveActionModifiers === "function"
        ? resolveSimulationOperatorPassiveActionModifiers(preliminaryPassiveEffectEvents)
        : preliminaryPassiveEffectEvents;
    const passiveStateProcEvents = typeof resolveSimulationOperatorPassiveStateProcs === "function"
        ? resolveSimulationOperatorPassiveStateProcs(passiveModifiedEvents)
        : [];
    const passiveResolvedMechanicEvents = resolvedMechanicEvents.map((event, index) => ({
        ...event,
        skillData: passiveModifiedEvents.find(candidate => candidate.simulationPassiveSourceIndex === index)?.skillData || event.skillData,
        operatorPassiveModifiers: passiveModifiedEvents.find(candidate => candidate.simulationPassiveSourceIndex === index)?.operatorPassiveModifiers || event.operatorPassiveModifiers
    }));
    const enrichedEffectEvents = enrichSimulationSkillEventsWithEffects([
        ...passiveResolvedMechanicEvents,
        ...passiveStateProcEvents
    ].sort((left, right) => (
        (Number(left.time) - Number(right.time))
        || (Number(left.order || 0) - Number(right.order || 0))
    )));
    const effectTimelineEvents = typeof enrichSimulationEventsWithInflictionBursts === "function"
        ? enrichSimulationEventsWithInflictionBursts(enrichedEffectEvents)
        : enrichedEffectEvents;
    const skillEvents = enrichSimulationSkillEventsWithLoadouts(enrichSimulationSkillEventsWithSp(assignSimulationCooldownDisplay(
        effectTimelineEvents.filter(event => event.kind !== "final-strike-state")
    )));
    const logEvents = [
        ...skillEvents,
        ...simulationProblemEvents
    ];
    let trackScroll = null;
    let cursorController = null;
    const navigateToSimulationEvent = (event, options = {}) => {
        if (!event) return;
        stopSimulationCursorPlayback();
        const eventTime = Number(event.time) || 0;

        const extraEvents = isSimulationProblemEvent(event) ? [event] : [];

        if (cursorController?.setCursorTime) {
            cursorController.setCursorTime(eventTime, { autoScroll: true, extraEvents });
        } else {
            simulationCursorTime = roundSimulationTime(eventTime);
            const currentEvents = getSimulationCursorState(skillEvents, simulationCursorTime).currentEvents;
            syncSimulationCursorEvents(
                extraEvents.length > 0 ? [...currentEvents, ...extraEvents] : currentEvents,
                { autoScroll: true }
            );
        }

        if (options.scrollTrack !== false) {
            scrollSimulationTrackToTime(eventTime, pixelsPerSecond, {
                scrollArea: trackScroll
            });
        }

        if (options.focusLog) {
            const focusLog = () => focusSimulationLogEvent(getSimulationEventSyncKey(event));
            if (options.source === "timeline") {
                window.setTimeout(focusLog, 0);
            } else {
                focusLog();
            }
        }
    };

    const root = document.createElement("div");
    root.className = "rotation-sim";
    root.style.width = `${trackWidth}px`;

    const buffTimeline = createSimulationEffectTimelineTrack(
        "buff",
        effectTimelineEvents,
        durationSeconds,
        pixelsPerSecond,
        trackWidth,
        skillEvents
    );
    const debuffTimeline = createSimulationEffectTimelineTrack(
        "debuff",
        effectTimelineEvents,
        durationSeconds,
        pixelsPerSecond,
        trackWidth,
        skillEvents
    );

    const labels = document.createElement("div");
    labels.className = "rotation-sim-labels";
    const rulerLabel = document.createElement("div");
    rulerLabel.dataset.simulationTrack = "ruler";
    labels.append(
        rulerLabel,
        createRotationTimelineLabel("Battle Skill", "battle"),
        createRotationTimelineLabel("Combat Events", "events"),
        createRotationTimelineLabel("SP", "sp"),
        buffTimeline.label,
        debuffTimeline.label,
        createRotationTimelineLabel("Combo Skill", "combo"),
        createRotationTimelineLabel("Combo CD", "comboCooldown"),
        createRotationTimelineLabel("BATK", "batk")
    );

    const body = document.createElement("div");
    body.className = "rotation-sim-body";
    const ruler = createSimulationTimeRuler(durationSeconds, pixelsPerSecond);
    ruler.dataset.simulationTrack = "ruler";
    body.appendChild(ruler);

    const battleSkillTrack = document.createElement("div");
    battleSkillTrack.id = "rotationSimulationSkillTrack";
    battleSkillTrack.className = "rotation-sim-skill-track rotation-sim-skill-drop-track is-battle-skill";
    battleSkillTrack.dataset.skillLane = "battle";
    battleSkillTrack.dataset.simulationTrack = "battle";
    battleSkillTrack.style.width = `${trackWidth}px`;

    const combatEventTrack = document.createElement("div");
    combatEventTrack.className = "rotation-sim-skill-track rotation-sim-skill-drop-track is-combat-event";
    combatEventTrack.dataset.skillLane = "event";
    combatEventTrack.dataset.simulationTrack = "events";
    combatEventTrack.style.width = `${trackWidth}px`;

    const comboSkillTrack = document.createElement("div");
    comboSkillTrack.className = "rotation-sim-skill-track rotation-sim-skill-drop-track is-combo-skill";
    comboSkillTrack.dataset.skillLane = "combo";
    comboSkillTrack.dataset.simulationTrack = "combo";
    comboSkillTrack.style.width = `${trackWidth}px`;

    const battleSkillEventCount = renderSimulationSkillEvents(
        battleSkillTrack,
        skillEvents,
        secondsPerSlot,
        pixelsPerSecond,
        "battle"
    );
    if (battleSkillEventCount === 0) {
        battleSkillTrack.appendChild(createSimulationLaneHint("battle"));
    }

    const combatEventCount = renderSimulationSkillEvents(
        combatEventTrack,
        skillEvents,
        secondsPerSlot,
        pixelsPerSecond,
        "event"
    );
    if (combatEventCount === 0) {
        combatEventTrack.appendChild(createSimulationLaneHint("event"));
    }

    const spTrack = document.createElement("div");
    spTrack.className = "rotation-sim-sp-track";
    spTrack.dataset.simulationTrack = "sp";
    spTrack.style.width = `${trackWidth}px`;
    renderSimulationSpTrack(spTrack, skillEvents, durationSeconds, pixelsPerSecond);

    const comboSkillEventCount = renderSimulationSkillEvents(
        comboSkillTrack,
        skillEvents,
        secondsPerSlot,
        pixelsPerSecond,
        "combo"
    );
    if (comboSkillEventCount === 0) {
        comboSkillTrack.appendChild(createSimulationLaneHint("combo"));
    }

    const comboCooldownTrack = document.createElement("div");
    comboCooldownTrack.className = "rotation-sim-cooldown-track is-combo-skill";
    comboCooldownTrack.dataset.simulationTrack = "comboCooldown";
    comboCooldownTrack.style.width = `${trackWidth}px`;
    renderSimulationCooldownTrack(comboCooldownTrack, skillEvents, pixelsPerSecond, "combo");

    const batkTrack = document.createElement("div");
    batkTrack.className = "rotation-sim-batk-track";
    batkTrack.dataset.simulationTrack = "batk";
    batkTrack.style.width = `${trackWidth}px`;
    renderSimulationBasicAttack(batkTrack, timelineBasicAttackData, durationSeconds, pixelsPerSecond, basicAttackSegments);

    body.append(
        battleSkillTrack,
        combatEventTrack,
        spTrack,
        buffTimeline.track,
        debuffTimeline.track,
        comboSkillTrack,
        comboCooldownTrack,
        batkTrack
    );
    attachSimulationTimelineNavigation(body, skillEvents, navigateToSimulationEvent);
    cursorController = createSimulationCursorController(
        body,
        skillEvents,
        durationSeconds,
        pixelsPerSecond
    );
    root.append(labels, body);
    applySimulationTrackLayout(labels, body);

    trackScroll = document.createElement("div");
    trackScroll.className = "rotation-sim-track-scroll";
    trackScroll.appendChild(root);
    attachSimulationTimelineViewportControls(trackScroll, durationSeconds);
    const eventLog = createSimulationEventLog(logEvents, undefined, {
        onSelectEvent: navigateToSimulationEvent
    });
    const timelineControls = document.createElement("div");
    timelineControls.className = "rotation-sim-timeline-controls";
    timelineControls.append(cursorController.focusBar, cursorController.toolbar);
    const stickyRuler = document.createElement("div");
    stickyRuler.className = "rotation-sim-sticky-ruler";
    stickyRuler.setAttribute("aria-hidden", "true");
    const stickyRulerLabel = document.createElement("div");
    stickyRulerLabel.className = "rotation-sim-sticky-ruler-label";
    const stickyRulerViewport = document.createElement("div");
    stickyRulerViewport.className = "rotation-sim-sticky-ruler-viewport";
    const stickyRulerTrack = ruler.cloneNode(true);
    stickyRulerTrack.classList.add("rotation-sim-sticky-ruler-track");
    stickyRulerTrack.removeAttribute("data-simulation-track");
    stickyRulerTrack.style.width = `${trackWidth}px`;
    stickyRulerViewport.appendChild(stickyRulerTrack);
    stickyRuler.append(stickyRulerLabel, stickyRulerViewport);
    const syncStickyRuler = () => {
        stickyRulerTrack.style.transform = `translateX(${-trackScroll.scrollLeft}px)`;
    };
    trackScroll.addEventListener("scroll", syncStickyRuler, { passive: true });
    const loadoutSummary = createSimulationLoadoutSummary();
    if (loadoutSummary) container.appendChild(loadoutSummary);
    container.appendChild(cursorController.compactBar);
    container.appendChild(timelineControls);
    observeSimulationFocusLayout();
    container.appendChild(stickyRuler);
    container.appendChild(trackScroll);
    container.appendChild(eventLog);
    window.requestAnimationFrame(() => {
        const restore = simulationTimelineViewportRestore;
        if (restore && Number.isFinite(Number(restore.scrollLeft))) {
            trackScroll.scrollLeft = Math.max(0, Number(restore.scrollLeft));
        } else if (restore && Number.isFinite(Number(restore.anchorTime))) {
            const labelWidth = Math.max(0, Number(restore.labelWidth) || 104);
            trackScroll.scrollLeft = Math.max(
                0,
                (Number(restore.anchorTime) * pixelsPerSecond) + labelWidth - Number(restore.viewportX || 0)
            );
        } else {
            trackScroll.scrollLeft = previousTrackScrollLeft;
        }
        syncStickyRuler();
        simulationTimelineViewportRestore = null;
        syncSimulationCursorEvents(getSimulationCursorState(skillEvents, simulationCursorTime).currentEvents);
    });

    initRotationDragDrop();
    initTapInput();
    renderEnemyEffects();
    renderOperatorBuffs();
    updateRotationActionStates();
}

function renderRotation() {
    const container = document.getElementById("rotationDropZone");
    if (!container) return;
    if (isSimulationTimelineMode()) {
        renderSimulationRotation();
        return;
    }
    document.documentElement.classList.remove("simulation-timeline-focus");
    removeBasicAttackEntriesFromRotation();
    container.innerHTML = "";

    const timeline = document.createElement("div");
    timeline.className = "rotation-timeline rotation-timeline-slot-mode";
    const hasManualRotationEntry = Array.isArray(rotation) && rotation.some(Boolean);
    if (!hasManualRotationEntry) {
        timeline.classList.add("is-empty");
    }

    const rotationDebuffStackState = {};
    const rotationDebuffMetaState = {};
    const rotationBuffStackState = {};
    const rotationBuffMetaState = {};
    const timelineBasicAttackData = getTimelineBasicAttackData();
    const timelineSecondsPerSlot = getTimelineSecondsPerSlot(timelineBasicAttackData);

    rotation.forEach((entry, index) => {
        const { step, skillSlot } = createRotationTimelineStep(index, timelineSecondsPerSlot, {
            showSeconds: false,
            showBasicAttack: false
        });
        if (entry) {
            let skillData = typeof getRotationActionData === "function" ? getRotationActionData(entry) : getSkillById(entry.id);
            if (skillData && !skillData.isBasicAttack) {
                skillData = resolveSlotModeSkillData(skillData, rotationDebuffStackState);
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
                consumeSlotModeSkillDebuffs(skillData, rotationDebuffStackState, rotationDebuffMetaState);
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
                removeBtn.className = "remove-btn rotation-slot-action is-remove";
                removeBtn.type = "button";
                removeBtn.textContent = "×";
                removeBtn.setAttribute("aria-label", "Remove skill");
                removeBtn.dataset.index = String(index);
                removeBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
                const actionWrap = document.createElement("div");
                actionWrap.className = "rotation-slot-actions";
                actionWrap.appendChild(removeBtn);
                skillDiv.appendChild(actionWrap);
                skillSlot.appendChild(skillDiv);
            }
        }

        timeline.appendChild(step);

        if (index + 1 < rotation.length) {
            const connector = createRotationTimelineConnector(index);
            const isUsed = entry !== null && rotation[index + 1] !== null;
            if (!isUsed) connector.classList.add("is-unused");
            timeline.appendChild(connector);
        }
    });

    if (!hasManualRotationEntry) {
        timeline.appendChild(createRotationEmptyDropHint());
    }

    container.appendChild(timeline);
    initRotationDragDrop();
    initTapInput();
    renderEnemyEffects();
    renderOperatorBuffs();
    updateRotationActionStates();
}
