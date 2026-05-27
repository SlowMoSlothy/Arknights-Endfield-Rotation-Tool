function getShortSkillType(type) {
    const value = (type || "").toLowerCase();
    if (value.includes("basic") || value === "batk") return "BATK";
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
    return Number(hit?.hit || 0) === Number(attackData?.hitCount || 0);
}

function getOperatorFinalStrikeSkill(operatorId) {
    const operator = Array.isArray(operators)
        ? operators.find(op => Number(op.id) === Number(operatorId))
        : null;
    if (!operator?.skills) return null;
    return operator.skills.find(isFinalStrikeSkillData) || null;
}

function getFinalStrikeEventEffectMap(sourceOperatorId) {
    const finalStrikeSkill = getOperatorFinalStrikeSkill(sourceOperatorId);
    if (finalStrikeSkill && typeof collectEffectsFromSkill === "function") {
        return collectEffectsFromSkill(finalStrikeSkill, {});
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
            if (isFinalStrikeHit) marker.classList.add("is-final-strike");
            const markerPosition = ((absoluteTime - slotStart) / slotDuration) * 100;
            marker.style.left = `${Math.round(markerPosition * 1000) / 1000}%`;
            marker.dataset.hit = String(hit.hit);
            marker.textContent = isFinalStrikeHit ? "FS" : String(hit.hit);
            marker.title = `BATK ${isFinalStrikeHit ? "Final Strike" : `Hit ${hit.hit}`}: ${formatBasicAttackSeconds(absoluteTime)}${hit.finalHitCount > 1 ? `, ${hit.finalHitCount} hits` : ""}`;
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

function createRotationTimelineLabel(text) {
    const label = document.createElement("div");
    label.className = "rotation-timeline-label";
    label.textContent = text;
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

function getSimulationPixelsPerSecond() {
    const density = uiSettings?.simulationTimelineDensity || "normal";
    return SIMULATION_PIXELS_PER_SECOND_BY_DENSITY[density] || SIMULATION_PIXELS_PER_SECOND;
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

function getSimulationSkillLane(skillData) {
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

function getSimulationOperatorName(operatorId) {
    const operator = Array.isArray(operators)
        ? operators.find(op => Number(op.id) === Number(operatorId))
        : null;
    return operator?.name || "Operator";
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
                Math.max(1, resolvedAmount - persistentAmount)
            );
        }
    });

    return currentTriggerMap;
}

function getSimulationComboTriggerDefinitions(skillData) {
    return Array.isArray(skillData?.comboTriggers)
        ? skillData.comboTriggers
        : (skillData?.comboTrigger ? [{ effect: skillData.comboTrigger, minStacks: 1 }] : []);
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

function applySimulationSkillToPersistentComboState(skillData, persistentEffectMap, latestEffectNames = []) {
    if (!skillData) return;

    if (typeof applySkillEffectsToComboMap === "function") {
        applySkillEffectsToComboMap(skillData, persistentEffectMap, true, false, persistentEffectMap);
    }

    if (typeof consumeStackedComboEffectsForSkill === "function") {
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

function getSimulationSkillEventsForSpSnap(excludedIndex, secondsPerSlot, durationHintSeconds = 0) {
    const excludedNumber = Number(excludedIndex);
    const entries = rotation
        .map((entry, index) => ({ entry, index }))
        .filter(item => item.entry && Number(item.index) !== excludedNumber);
    const manualSkillEvents = getSimulationManualSkillEvents(entries, secondsPerSlot);
    const maxEntryTime = manualSkillEvents.reduce((max, event) => Math.max(max, event.time), 0);
    const timelineBasicAttackData = getTimelineBasicAttackData();
    const firstBasicAttackCycle = timelineBasicAttackData?.hasBasicAttackConfig
        ? getBasicAttackCycleDuration(timelineBasicAttackData, secondsPerSlot)
        : 0;
    const durationSeconds = Math.max(4, Math.ceil(maxEntryTime + 2), Math.ceil(durationHintSeconds + 2), Math.ceil(firstBasicAttackCycle + 1));
    const leaderId = Array.isArray(selectedTeam) ? selectedTeam[0] : null;
    const finalStrikeTimes = getSimulationFinalStrikeTimes(timelineBasicAttackData, durationSeconds);
    const autoComboEvents = collectSimulationFinalStrikeComboSkills(leaderId, finalStrikeTimes, manualSkillEvents);
    return enrichSimulationSkillEventsWithEffects([
        ...manualSkillEvents,
        ...autoComboEvents
    ]);
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
        if (cost !== null && cost > 0) currentSp -= cost;

        const recovery = getSimulationSkillSpRecovery(event.skillData, event);
        if (recovery > 0) {
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
        if (cost !== null && cost > 0) currentSp -= cost;

        const recovery = getSimulationSkillSpRecovery(event.skillData, event);
        if (recovery > 0) currentSp = Math.min(SIMULATION_MAX_SP, currentSp + recovery);
        if (currentSp >= threshold) return eventTime;
    }

    if (spPerSecond <= 0) return fromTime;
    return lastTime + ((threshold - currentSp) / spPerSecond);
}

function getSnappedSimulationEntryTime(index, value, secondsPerSlot = getTimelineSecondsPerSlot(getTimelineBasicAttackData())) {
    const entry = rotation[index];
    const skillData = entry ? getSimulationSkillData(entry) : null;
    if (!isBattleSkillData(skillData)) return roundSimulationTime(value);

    const cost = getSimulationBattleSkillSpCost(skillData) || 100;
    const candidateTime = roundSimulationTime(value);
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
        end: ["M18 5v14", "M6 6l8 6-8 6V6z"]
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
    const nextLeft = Math.max(0, Math.min(maxScroll, targetX - (scrollArea.clientWidth * 0.45)));

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
    cursor.setAttribute("aria-hidden", "true");

    const line = document.createElement("div");
    line.className = "rotation-sim-cursor-line";
    const handle = document.createElement("div");
    handle.className = "rotation-sim-cursor-handle";
    const timeBadge = document.createElement("div");
    timeBadge.className = "rotation-sim-cursor-time";
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
        timeStat.valueElement.textContent = formattedTime;
        spStat.valueElement.textContent = `${formatSimulationSpValue(state.sp)} / ${SIMULATION_MAX_SP}`;
        spStat.item.classList.toggle("is-warning", state.sp < 100);
        const eventSummary = formatSimulationCursorEventSummary(state);
        eventStat.valueElement.textContent = eventSummary;
        eventStat.valueElement.title = eventSummary;
        replaceSimulationCursorEffects(buffValue, state.activeBuffs, "buff");
        replaceSimulationCursorEffects(debuffValue, state.activeDebuffs, "debuff");
        const syncEvents = Array.isArray(options.extraEvents) && options.extraEvents.length > 0
            ? [...state.currentEvents, ...options.extraEvents]
            : state.currentEvents;
        syncSimulationCursorEvents(syncEvents, {
            autoScroll: Boolean(options.autoScroll || simulationCursorPlaybackTimer)
        });
        if (options.scrollTrack) {
            scrollSimulationTrackToTime(simulationCursorTime, pixelsPerSecond, {
                instant: Boolean(options.scrollTrackInstant)
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

        simulationCursorPlaybackTimer = window.setInterval(() => {
            const nextTime = clampSimulationCursorTime(simulationCursorTime + SIMULATION_TIME_STEP, durationSeconds);
            setCursorTime(nextTime, { autoScroll: true });
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

    startButton.addEventListener("click", jumpToStart);
    previousEventButton.addEventListener("click", jumpToPreviousEvent);
    playButton.addEventListener("click", startPlayback);
    backButton.addEventListener("click", () => stepCursor(-1));
    forwardButton.addEventListener("click", () => stepCursor(1));
    nextEventButton.addEventListener("click", jumpToNextEvent);
    endButton.addEventListener("click", jumpToEnd);

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

        if (key === "Home" && !event.shiftKey) {
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

    body.addEventListener("pointerdown", event => {
        if (event.target.closest(".rotation-sim-skill, .rotation-sim-sp-marker, .rotation-batk-hit-marker, button, .rotation-sim-inspector")) return;
        event.preventDefault();
        stopSimulationCursorPlayback();
        setCursorTime(getTimeFromPointer(event));

        const move = moveEvent => setCursorTime(getTimeFromPointer(moveEvent));
        const up = () => {
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
        };

        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
    });

    setCursorTime(simulationCursorTime);
    return {
        toolbar,
        setCursorTime,
        pixelsPerSecond
    };
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

    appendSimulationInspectorSection(panel, "SP", [
        ["Skill", marker.name || "Skill"],
        [
            marker.type === "recovery" ? "Recovery" : "Cost",
            `${formatSimulationSpValue(marker.before)} -> ${formatSimulationSpValue(marker.after)} (${getSimulationSpMarkerText(marker)})`,
            marker.type === "recovery" ? "is-positive" : (marker.affordable ? "" : "is-warning")
        ]
    ]);

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
            event.kind === "auto" ? "trigger" : "",
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
        spBadge.textContent = `${formatSimulationSpValue(spState.cost)} SP`;
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
    } else {
        const buffTray = createEffectTray(options.activeBuffs || [], "buff");
        if (buffTray) item.appendChild(buffTray);
        const debuffTray = createEffectTray(options.activeDebuffs || [], "debuff");
        if (debuffTray) item.appendChild(debuffTray);
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
            setRotationEntryTime(index, getRotationEntryTime(rotation[index], index, secondsPerSlot) + direction);
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
        const showDragGuide = item.dataset.skillLane === "battle" && body;
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
                snapBattleSkill: true,
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

function renderSimulationBasicAttack(track, attackData, durationSeconds, pixelsPerSecond) {
    if (!attackData?.hasBasicAttackConfig || typeof getBasicAttackHitTimeline !== "function") return;
    const slotDuration = getTimelineSecondsPerSlot(attackData);
    const cycleDuration = getBasicAttackCycleDuration(attackData, slotDuration);
    const hits = getBasicAttackHitTimeline(attackData);

    for (let cycleStart = 0; cycleStart <= durationSeconds; cycleStart += cycleDuration) {
        hits.forEach(hit => {
            const absoluteTime = cycleStart + hit.time;
            if (absoluteTime > durationSeconds) return;
            const marker = document.createElement("span");
            marker.className = "rotation-batk-hit-marker";
            if (hit.finalHitCount > 1) marker.classList.add("is-double");
            const isFinalStrikeHit = isFinalBasicAttackHit(attackData, hit);
            if (isFinalStrikeHit) marker.classList.add("is-final-strike");
            marker.style.left = `${absoluteTime * pixelsPerSecond}px`;
            marker.textContent = isFinalStrikeHit ? "FS" : String(hit.hit);
            marker.title = `BATK ${isFinalStrikeHit ? "Final Strike" : `Hit ${hit.hit}`}: ${formatBasicAttackSeconds(absoluteTime)}`;
            track.appendChild(marker);
        });
    }
}

function collectSimulationFinalStrikeComboSkills(sourceOperatorId, finalStrikeTimes, manualEvents = []) {
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
            sourceOperatorId: getSimulationSourceOperatorId(event.skillData)
        })),
        ...finalStrikeTimes.map((time, index) => ({
            kind: "final-strike",
            time,
            order: index + 0.5,
            sourceOperatorId
        }))
    ].sort((left, right) => (left.time - right.time) || (left.order - right.order));

    timelineEvents.forEach(event => {
        if (event.skillData && isComboSkillData(event.skillData)) {
            markSimulationComboCooldown(event.skillData, event.time, cooldownState);
        }

        const currentEffects = event.kind === "final-strike"
            ? getFinalStrikeEventEffectMap(event.sourceOperatorId)
            : (typeof collectEffectsFromSkill === "function" ? collectEffectsFromSkill(event.skillData, persistentEffectMap) : {});
        const chainEffectMap = { ...currentEffects };
        const triggeredComboSkills = [];
        const comboQueue = [];
        let chainCount = 0;
        const maxChainLength = 20;

        const triggerComboSkills = (comboSkills, sourceOperatorId, triggerContext = {}) => {
            comboSkills.forEach(comboSkill => {
                if (isFinalStrikeSkillData(comboSkill)) return;
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
                            sourceOperatorId,
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
                    sourceOperatorId,
                    triggerSourceName: triggerContext.sourceName || "Timeline event",
                    triggerSourceType: triggerContext.sourceType || event.kind,
                    triggerSourceOperatorId: triggerContext.sourceOperatorId ?? sourceOperatorId,
                    triggerEffects: getSimulationCurrentTriggerEffectNames(comboSkill, triggerContext.currentTriggerMap || {}),
                    triggerContextEffects: Object.keys(triggerContext.resolvedEffectMap || {})
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
                    ? `${getSimulationOperatorName(event.sourceOperatorId)} Final Strike`
                    : (event.skillData?.name || "Manual skill"),
                sourceType: event.kind,
                sourceOperatorId: event.sourceOperatorId,
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
            applySimulationSkillToPersistentComboState(event.skillData, persistentEffectMap, Object.keys(currentEffects || {}));
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
    return entries
        .map((item, order) => {
            const skillData = getSimulationSkillData(item.entry);
            if (!skillData || skillData.isBasicAttack || isFinalStrikeSkillData(skillData)) return null;
            return {
                kind: "manual",
                entry: item.entry,
                index: item.index,
                order,
                time: getRotationEntryTime(item.entry, item.index, secondsPerSlot),
                skillData
            };
        })
        .filter(Boolean);
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
            if (cost !== null && cost > 0) {
                const before = currentSp;
                const after = before - cost;
                event.spState = {
                    start: SIMULATION_START_SP,
                    max: SIMULATION_MAX_SP,
                    spPerSecond,
                    cost,
                    before,
                    after,
                    generated: generatedSp,
                    affordable: before + 0.001 >= cost
                };
                currentSp = after;
            }

            const recovery = getSimulationSkillSpRecovery(event.skillData, event);
            if (recovery > 0) {
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

function enrichSimulationSkillEventsWithEffects(events) {
    if (typeof applySkillBuffsAndGetActiveState !== "function" || typeof applySkillDebuffsAndGetActiveState !== "function") {
        return events;
    }

    const rotationDebuffStackState = {};
    const rotationDebuffMetaState = {};
    const rotationBuffStackState = {};
    const rotationBuffMetaState = {};

    return [...events]
        .sort((left, right) => (left.time - right.time) || (left.order - right.order))
        .map(event => {
            const activeDebuffsBeforeSkill = getActiveDebuffsFromRotationState(rotationDebuffStackState, rotationDebuffMetaState);
            const activeBuffsBeforeSkill = {
                ...rotationBuffMetaState
            };
            const activeBuffListBeforeSkill = getActiveBuffsFromRotationState(rotationBuffStackState, rotationBuffMetaState);
            const activeBuffStacksBeforeSkill = {
                ...rotationBuffStackState
            };
            applySkillBuffsAndGetActiveState(event.skillData, rotationBuffStackState, rotationBuffMetaState, activeBuffsBeforeSkill, activeBuffStacksBeforeSkill);
            const activeDebuffs = applySkillDebuffsAndGetActiveState(
                event.skillData,
                activeBuffsBeforeSkill,
                activeBuffStacksBeforeSkill,
                rotationDebuffStackState,
                rotationDebuffMetaState,
                rotationBuffStackState,
                rotationBuffMetaState
            );
            return {
                ...event,
                activeBuffsBefore: activeBuffListBeforeSkill,
                activeDebuffsBefore: activeDebuffsBeforeSkill,
                activeBuffs: getActiveBuffsFromRotationState(rotationBuffStackState, rotationBuffMetaState),
                activeDebuffs
            };
        });
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

function renderSimulationSkillEvents(skillTrack, events, secondsPerSlot, pixelsPerSecond, lane) {
    const laneEvents = events.filter(event => getSimulationSkillLane(event.skillData) === lane);
    const renderedEvents = getRenderedSimulationSkillEvents(laneEvents);
    renderedEvents.forEach(event => {
        const entry = event.entry || {
            uid: `auto-final-strike-${event.skillData.id}-${event.time}`,
            id: event.skillData.id,
            time: event.time,
            autoInserted: true
        };
        const index = event.index ?? `auto-${event.skillData.id}-${event.time}`;
        const element = createSimulationSkillElement(entry, index, event.skillData, secondsPerSlot, pixelsPerSecond, {
            readOnly: event.kind === "auto",
            extraClasses: event.kind === "auto" ? ["auto-inserted", "final-strike-triggered"] : [],
            activeBuffs: event.activeBuffs,
            activeDebuffs: event.activeDebuffs,
            groupEvents: event.groupEvents,
            spState: event.spState,
            event
        });

        if (event.kind === "auto") {
            element.style.setProperty("--sim-cd-color", event.cooldownColor || SIMULATION_COMBO_COOLDOWN_COLORS[0]);
        }

        skillTrack.appendChild(element);
    });

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
        : "Combo Skills appear here automatically";

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
        markerElement.title = marker.type === "recovery"
            ? `${marker.name}: ${formatSimulationSpValue(marker.before)} SP + ${formatSimulationSpValue(marker.amount)} SP = ${formatSimulationSpValue(marker.after)} SP`
            : `${marker.name}: ${formatSimulationSpValue(marker.before)} SP - ${formatSimulationSpValue(marker.amount)} SP = ${formatSimulationSpValue(marker.after)} SP`;
        attachSimulationInspector(
            markerElement,
            createSimulationSpMarkerInspector(marker),
            `${marker.name || "SP"} inspector`
        );
        track.appendChild(markerElement);
    });
}

function getSimulationFinalStrikeTimes(attackData, durationSeconds) {
    if (!attackData?.hasBasicAttackConfig || typeof getBasicAttackHitTimeline !== "function") return [];
    const slotDuration = getTimelineSecondsPerSlot(attackData);
    const cycleDuration = getBasicAttackCycleDuration(attackData, slotDuration);
    const finalHit = getBasicAttackHitTimeline(attackData).find(hit => isFinalBasicAttackHit(attackData, hit));
    if (!finalHit) return [];

    const times = [];
    for (let cycleStart = 0; cycleStart <= durationSeconds; cycleStart += cycleDuration) {
        const absoluteTime = cycleStart + finalHit.time;
        if (absoluteTime <= durationSeconds) times.push(Math.round(absoluteTime * 100) / 100);
    }

    return times;
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
    const firstBasicAttackCycle = timelineBasicAttackData?.hasBasicAttackConfig
        ? getBasicAttackCycleDuration(timelineBasicAttackData, secondsPerSlot)
        : 0;
    const configuredDurationSeconds = Number(uiSettings?.simulationDurationSeconds);
    const sharedDurationSeconds = Number.isFinite(configuredDurationSeconds) && configuredDurationSeconds > 0
        ? configuredDurationSeconds
        : 0;
    const initialDurationSeconds = Math.max(4, Math.ceil(maxEntryTime + 2), Math.ceil(firstBasicAttackCycle + 1), sharedDurationSeconds);
    const leaderId = Array.isArray(selectedTeam) ? selectedTeam[0] : null;
    const finalStrikeTimes = getSimulationFinalStrikeTimes(timelineBasicAttackData, initialDurationSeconds);
    const autoComboEvents = collectSimulationFinalStrikeComboSkills(leaderId, finalStrikeTimes, manualSkillEvents);
    const autoSkillEvents = autoComboEvents.filter(event => !isSimulationProblemEvent(event));
    const simulationProblemEvents = autoComboEvents.filter(event => isSimulationProblemEvent(event));
    const cooldownEndTime = getSimulationCooldownEndTime(entries, secondsPerSlot, autoSkillEvents);
    const durationSeconds = Math.max(initialDurationSeconds, Math.ceil(cooldownEndTime + 1));
    const pixelsPerSecond = getSimulationPixelsPerSecond();
    const trackWidth = durationSeconds * pixelsPerSecond;
    const skillEvents = enrichSimulationSkillEventsWithSp(assignSimulationCooldownDisplay(enrichSimulationSkillEventsWithEffects([
        ...manualSkillEvents,
        ...autoSkillEvents
    ])));
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

    const labels = document.createElement("div");
    labels.className = "rotation-sim-labels";
    labels.append(
        document.createElement("div"),
        createRotationTimelineLabel("Battle Skill"),
        createRotationTimelineLabel("SP"),
        createRotationTimelineLabel("Combo Skill"),
        createRotationTimelineLabel("Combo CD"),
        createRotationTimelineLabel("BATK")
    );

    const body = document.createElement("div");
    body.className = "rotation-sim-body";
    body.appendChild(createSimulationTimeRuler(durationSeconds, pixelsPerSecond));

    const battleSkillTrack = document.createElement("div");
    battleSkillTrack.id = "rotationSimulationSkillTrack";
    battleSkillTrack.className = "rotation-sim-skill-track rotation-sim-skill-drop-track is-battle-skill";
    battleSkillTrack.dataset.skillLane = "battle";
    battleSkillTrack.style.width = `${trackWidth}px`;

    const comboSkillTrack = document.createElement("div");
    comboSkillTrack.className = "rotation-sim-skill-track rotation-sim-skill-drop-track is-combo-skill";
    comboSkillTrack.dataset.skillLane = "combo";
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

    const spTrack = document.createElement("div");
    spTrack.className = "rotation-sim-sp-track";
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
    comboCooldownTrack.style.width = `${trackWidth}px`;
    renderSimulationCooldownTrack(comboCooldownTrack, skillEvents, pixelsPerSecond, "combo");

    const batkTrack = document.createElement("div");
    batkTrack.className = "rotation-sim-batk-track";
    batkTrack.style.width = `${trackWidth}px`;
    renderSimulationBasicAttack(batkTrack, timelineBasicAttackData, durationSeconds, pixelsPerSecond);

    body.append(battleSkillTrack, spTrack, comboSkillTrack, comboCooldownTrack, batkTrack);
    attachSimulationTimelineNavigation(body, skillEvents, navigateToSimulationEvent);
    cursorController = createSimulationCursorController(
        body,
        skillEvents,
        durationSeconds,
        pixelsPerSecond
    );
    root.append(labels, body);

    trackScroll = document.createElement("div");
    trackScroll.className = "rotation-sim-track-scroll";
    trackScroll.appendChild(root);
    const eventLog = createSimulationEventLog(logEvents, undefined, {
        onSelectEvent: navigateToSimulationEvent
    });
    container.appendChild(cursorController.toolbar);
    container.appendChild(trackScroll);
    container.appendChild(eventLog);
    window.requestAnimationFrame(() => {
        trackScroll.scrollLeft = previousTrackScrollLeft;
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
            const skillData = typeof getRotationActionData === "function" ? getRotationActionData(entry) : getSkillById(entry.id);
            if (skillData && !skillData.isBasicAttack) {
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
