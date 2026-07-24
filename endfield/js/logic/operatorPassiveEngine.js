function normalizeOperatorPassiveKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function getSimulationOperatorPassiveRules() {
    return (typeof operatorPassiveRules !== "undefined" && Array.isArray(operatorPassiveRules))
        ? operatorPassiveRules.filter(rule => rule?.enabled !== false)
        : [];
}

function getSimulationOperatorPotential(operatorId) {
    if (typeof getOperatorLoadout !== "function") return 0;
    return Math.max(0, Math.min(5, Number(getOperatorLoadout(operatorId)?.operatorPotential) || 0));
}

function getOperatorPassiveOwner(rule) {
    if (!Array.isArray(operators)) return null;
    return operators.find(operator => Number(operator.id) === Number(rule?.operatorId)) || null;
}

function isOperatorPassiveOwnerSelected(rule) {
    return Array.isArray(selectedTeam)
        && selectedTeam.some(operatorId => Number(operatorId) === Number(rule?.operatorId));
}

function getOperatorPassiveEventEffects(event) {
    if (typeof getSimulationMechanicEmittedEffects === "function") {
        return getSimulationMechanicEmittedEffects(event);
    }
    return new Set([
        ...(Array.isArray(event?.skillData?.buffs) ? event.skillData.buffs : []),
        ...(Array.isArray(event?.skillData?.debuffs) ? event.skillData.debuffs : [])
    ].map(effect => normalizeOperatorPassiveKey(effect?.appliesEffect || effect?.effect || effect?.id || effect?.name)));
}

function getOperatorPassiveStat(operatorId, stat) {
    const key = normalizeOperatorPassiveKey(stat);
    const stats = typeof getOperatorSimulationLoadoutStats === "function"
        ? getOperatorSimulationLoadoutStats(operatorId)
        : null;
    const operator = getOperatorPassiveOwner({ operatorId });
    const aliases = {
        atk: "totalAtk",
        attack: "totalAtk",
        hp: "maxHp",
        max_hp: "maxHp",
        strength: "strength",
        agility: "agility",
        intellect: "intellect",
        will: "will"
    };
    const property = aliases[key] || key;
    const value = Number(stats?.[property] ?? operator?.[property] ?? operator?.stats?.level90?.[key]);
    return Number.isFinite(value) ? value : 0;
}

function mergeSimulationAttributeOverride(baseValue, overrideValue) {
    if (!overrideValue || typeof overrideValue !== "object" || Array.isArray(overrideValue)) {
        return overrideValue;
    }
    const base = baseValue && typeof baseValue === "object" && !Array.isArray(baseValue)
        ? baseValue
        : {};
    return Object.entries(overrideValue).reduce((result, [key, value]) => ({
        ...result,
        [key]: value && typeof value === "object" && !Array.isArray(value)
            ? mergeSimulationAttributeOverride(base[key], value)
            : value
    }), { ...base });
}

function simulationAttributeConditionMatches(condition, operatorId) {
    const left = getOperatorPassiveStat(operatorId, condition?.leftStat || condition?.stat);
    const right = condition?.rightStat
        ? getOperatorPassiveStat(operatorId, condition.rightStat)
        : Number(condition?.value || 0);
    switch (String(condition?.comparison || condition?.operator || "gte").toLowerCase()) {
        case "gt": case ">": return left > right;
        case "lt": case "<": return left < right;
        case "lte": case "<=": return left <= right;
        case "eq": case "=": case "==": return Math.abs(left - right) < 0.0001;
        case "neq": case "!=": return Math.abs(left - right) >= 0.0001;
        default: return left >= right;
    }
}

function resolveSimulationAttributeVariant(skillData, operatorId = skillData?.operatorId) {
    const variants = Array.isArray(skillData?.attributeVariants) ? skillData.attributeVariants : [];
    const variant = variants.find(candidate => {
        const conditions = Array.isArray(candidate?.conditions)
            ? candidate.conditions
            : [candidate?.condition].filter(Boolean);
        const mode = String(candidate?.conditionMode || "all").toLowerCase();
        return conditions.length > 0 && (mode === "any"
            ? conditions.some(condition => simulationAttributeConditionMatches(condition, operatorId))
            : conditions.every(condition => simulationAttributeConditionMatches(condition, operatorId)));
    });
    if (!variant) return skillData;
    return {
        ...mergeSimulationAttributeOverride(skillData, variant.actionOverride || variant.override || {}),
        attributeVariantKey: variant.key || variant.variantKey || "attribute_variant",
        attributeVariantLabel: variant.label || variant.name || "Attribute variant"
    };
}

function operatorPassiveRuleMatchesAction(rule, event) {
    const match = rule?.conditions || {};
    const skill = event?.skillData || {};
    const sourceOperatorId = Number(event?.sourceOperatorId ?? skill.operatorId);
    if (sourceOperatorId !== Number(rule.operatorId)) return false;

    const skillIds = (Array.isArray(match.skillIds) ? match.skillIds : []).map(Number);
    if (skillIds.length && !skillIds.includes(Number(skill.id))) return false;
    const skillTypes = (Array.isArray(match.skillTypes) ? match.skillTypes : [])
        .map(normalizeOperatorPassiveKey);
    if (skillTypes.length && !skillTypes.includes(normalizeOperatorPassiveKey(skill.type || skill.shortType))) return false;
    const actionNames = (Array.isArray(match.actionNames) ? match.actionNames : [])
        .map(normalizeOperatorPassiveKey);
    if (actionNames.length && !actionNames.includes(normalizeOperatorPassiveKey(skill.name))) return false;
    const requiredEnemyEffects = (Array.isArray(match.enemyEffectsAny) ? match.enemyEffectsAny : [])
        .map(normalizeOperatorPassiveKey)
        .filter(Boolean);
    if (requiredEnemyEffects.length) {
        const activeEffects = new Set([
            ...(Array.isArray(event?.activeDebuffsBefore) ? event.activeDebuffsBefore : []),
            ...(Array.isArray(event?.activeDebuffs) ? event.activeDebuffs : [])
        ].map(effect => normalizeOperatorPassiveKey(effect?.appliesEffect || effect?.effect || effect?.id || effect?.name)));
        if (!requiredEnemyEffects.some(effect => activeEffects.has(effect))) return false;
    }
    return true;
}

function adjustOperatorPassiveEffects(effects, adjustments) {
    if (!Array.isArray(effects) || !adjustments || typeof adjustments !== "object") return effects;
    return effects.map(effect => {
        const key = normalizeOperatorPassiveKey(effect?.appliesEffect || effect?.effect || effect?.id || effect?.name);
        const adjustment = adjustments[key];
        if (!adjustment || typeof adjustment !== "object") return effect;
        return {
            ...effect,
            valuePercent: Number.isFinite(Number(adjustment.valuePercentDelta))
                ? (Number(effect.valuePercent) || 0) + Number(adjustment.valuePercentDelta)
                : effect.valuePercent,
            durationSeconds: Number.isFinite(Number(adjustment.durationSecondsDelta))
                ? (Number(effect.durationSeconds) || 0) + Number(adjustment.durationSecondsDelta)
                : effect.durationSeconds
        };
    });
}

function applyOperatorPassiveActionRule(event, rule) {
    if ((event?.operatorPassiveModifiers || []).includes(rule.ruleKey)) return event;
    if (!operatorPassiveRuleMatchesAction(rule, event)) return event;
    const effect = rule?.effect || {};
    let skillData = { ...event.skillData };

    if (effect.actionOverride && typeof effect.actionOverride === "object") {
        skillData = mergeSimulationAttributeOverride(skillData, effect.actionOverride);
    }

    if (effect.spRecoveryStatScaling && skillData.spRecovery) {
        const scaling = effect.spRecoveryStatScaling;
        const statValue = getOperatorPassiveStat(rule.operatorId, scaling.stat);
        const perPoints = Math.max(0.0001, Number(scaling.perPoints) || 1);
        const steps = scaling.rounding === "continuous" ? statValue / perPoints : Math.floor(statValue / perPoints);
        const bonusPercent = Math.min(Number(scaling.maxPercent) || Infinity, steps * (Number(scaling.percentPerStep) || 0));
        skillData.spRecovery = {
            ...skillData.spRecovery,
            amount: (Number(skillData.spRecovery.amount) || 0) * (1 + bonusPercent / 100),
            passiveBonusPercent: bonusPercent,
            passiveSource: rule.name
        };
    }

    if (Number(effect.damageMultiplier) > 0 && skillData.damageProfile) {
        skillData.damageProfile = {
            ...skillData.damageProfile,
            atkMultiplier: (Number(skillData.damageProfile.atkMultiplier) || 0) * Number(effect.damageMultiplier),
            passiveSource: rule.name
        };
    }

    if (Number.isFinite(Number(effect.spRecoveryFlatBonus))) {
        const currentRecovery = typeof skillData.spRecovery === "object"
            ? Number(skillData.spRecovery.amount)
            : Number(skillData.spRecovery);
        const amount = (Number.isFinite(currentRecovery) ? currentRecovery : 0) + Number(effect.spRecoveryFlatBonus);
        skillData.spRecovery = typeof skillData.spRecovery === "object"
            ? { ...skillData.spRecovery, amount, passiveSource: rule.name }
            : { amount, source: rule.name, passiveSource: rule.name };
    }

    if (Number.isFinite(Number(effect.cooldownDeltaSeconds))) {
        skillData.cooldown = Math.max(0, (Number(skillData.cooldown) || 0) + Number(effect.cooldownDeltaSeconds));
    }
    if (Number.isFinite(Number(effect.staggerBonus))) {
        skillData.stagger = (Number(skillData.stagger) || 0) + Number(effect.staggerBonus);
    }
    if (Number.isFinite(Number(effect.ultimateEnergyCostMultiplier))) {
        skillData.energy = Math.max(0, (Number(skillData.energy) || 0) * Number(effect.ultimateEnergyCostMultiplier));
    }
    if (effect.effectAdjustments) {
        skillData.buffs = adjustOperatorPassiveEffects(skillData.buffs, effect.effectAdjustments);
        skillData.debuffs = adjustOperatorPassiveEffects(skillData.debuffs, effect.effectAdjustments);
    }

    const randomVariant = effect.randomVariant;
    if (randomVariant && skillData.damageProfile) {
        const scaling = randomVariant.chanceStatScaling || {};
        const statValue = getOperatorPassiveStat(rule.operatorId, scaling.stat);
        const perPoints = Math.max(0.0001, Number(scaling.perPoints) || 1);
        const steps = scaling.rounding === "continuous" ? statValue / perPoints : Math.floor(statValue / perPoints);
        const chanceBonus = Math.min(Number(scaling.maxPercent) || Infinity, steps * (Number(scaling.percentPerStep) || 0));
        const chancePercent = Math.max(0, Math.min(100, (Number(randomVariant.baseChancePercent) || 0) + chanceBonus));
        const chance = chancePercent / 100;
        const baseMultiplier = Number(randomVariant.baseAtkMultiplier ?? skillData.damageProfile.atkMultiplier) || 0;
        const variantMultiplier = Number(randomVariant.variantAtkMultiplier ?? baseMultiplier) || baseMultiplier;
        skillData.damageProfile = {
            ...skillData.damageProfile,
            atkMultiplier: baseMultiplier + chance * (variantMultiplier - baseMultiplier),
            expectedValueModel: true,
            variantChancePercent: chancePercent,
            passiveSource: rule.name
        };
        const baseSp = Number(randomVariant.baseSpRecovery);
        const bonusSp = Number(randomVariant.variantBonusSpRecovery);
        if (Number.isFinite(baseSp) && Number.isFinite(bonusSp)) {
            skillData.spRecovery = {
                amount: baseSp + chance * bonusSp,
                source: rule.name,
                expectedValueModel: true,
                variantChancePercent: chancePercent
            };
        }
    }

    return {
        ...event,
        skillData,
        operatorPassiveModifiers: [...(event.operatorPassiveModifiers || []), rule.ruleKey]
    };
}

function operatorPassiveRuleMatchesTrigger(rule, event) {
    if (event?.operatorPassiveRuleId) return false;
    const trigger = rule?.trigger || {};
    const emitted = getOperatorPassiveEventEffects(event);
    const effects = (Array.isArray(trigger.effects) ? trigger.effects : [trigger.effect])
        .map(normalizeOperatorPassiveKey)
        .filter(Boolean);
    if (effects.length && !effects.some(effect => emitted.has(effect))) return false;
    if (trigger.controlledOperatorOnly === true && Number(selectedTeam?.[0]) !== Number(rule.operatorId)) return false;
    if (trigger.sourceOperatorOnly === true) {
        const sourceId = Number(event?.sourceOperatorId ?? event?.skillData?.operatorId);
        if (sourceId !== Number(rule.operatorId)) return false;
    }
    const skill = event?.skillData || {};
    const skillIds = (Array.isArray(trigger.skillIds) ? trigger.skillIds : []).map(Number);
    if (skillIds.length && !skillIds.includes(Number(skill.id))) return false;
    const skillTypes = (Array.isArray(trigger.skillTypes) ? trigger.skillTypes : []).map(normalizeOperatorPassiveKey);
    if (skillTypes.length && !skillTypes.includes(normalizeOperatorPassiveKey(skill.type || skill.shortType))) return false;
    const stateEffect = normalizeOperatorPassiveKey(trigger.minimumEffectStacks?.effect);
    if (stateEffect) {
        const active = [
            ...(Array.isArray(event?.activeBuffs) ? event.activeBuffs : []),
            ...(Array.isArray(event?.activeDebuffs) ? event.activeDebuffs : [])
        ].find(effect => normalizeOperatorPassiveKey(effect?.appliesEffect || effect?.id || effect?.name) === stateEffect);
        const stacks = Number(active?.currentStacks ?? active?.stackCount ?? active?.stacks ?? 0);
        if (stacks < (Number(trigger.minimumEffectStacks.stacks) || 1)) return false;
    }
    return effects.length > 0 || skillIds.length > 0 || skillTypes.length > 0 || Boolean(stateEffect);
}

function getEligibleOperatorPassiveRules() {
    return getSimulationOperatorPassiveRules().filter(rule => {
        const potential = getSimulationOperatorPotential(rule.operatorId);
        const hasMaximumPotential = rule.maximumPotential !== null
            && rule.maximumPotential !== undefined
            && Number.isFinite(Number(rule.maximumPotential));
        return isOperatorPassiveOwnerSelected(rule)
            && potential >= (Number(rule.minimumPotential) || 0)
            && (!hasMaximumPotential || potential <= Number(rule.maximumPotential));
    });
}

function resolveSimulationOperatorPassiveActionModifiers(events) {
    const actionRules = getEligibleOperatorPassiveRules().filter(rule => rule.resolutionType === "action_modifier");
    return (Array.isArray(events) ? events : []).map(event => {
        const sourceOperatorId = Number(event?.sourceOperatorId ?? event?.skillData?.operatorId);
        const variantEvent = {
            ...event,
            skillData: resolveSimulationAttributeVariant(event?.skillData, sourceOperatorId)
        };
        return actionRules.reduce(applyOperatorPassiveActionRule, variantEvent);
    });
}

function resolveSimulationOperatorPassiveStateProcs(events) {
    const stateRules = getEligibleOperatorPassiveRules().filter(rule => (
        rule.resolutionType === "triggered_effect" && rule?.trigger?.minimumEffectStacks
    ));
    const cooldownEnds = new Map();
    const procs = [];
    (Array.isArray(events) ? events : []).forEach(event => stateRules.forEach((rule, index) => {
        if (!operatorPassiveRuleMatchesTrigger(rule, event)) return;
        const now = Number(event.time) || 0;
        if (now + 0.0001 < (cooldownEnds.get(rule.ruleKey) || 0)) return;
        cooldownEnds.set(rule.ruleKey, now + Math.max(0, Number(rule.cooldownSeconds) || 0));
        procs.push(createOperatorPassiveProcEvent(rule, event, index));
    }));
    return procs;
}

function createOperatorPassiveProcEvent(rule, triggerEvent, index) {
    const actionOverride = rule?.effect?.actionOverride || {};
    return {
        kind: "proc",
        time: Number(triggerEvent.time) + Math.max(0, Number(rule?.effect?.delaySeconds) || 0),
        order: Number(triggerEvent.order || 0) + 0.04 + (index / 1000),
        sourceOperatorId: Number(rule.operatorId),
        skillData: {
            id: `operator-passive-${rule.ruleKey}`,
            operatorId: Number(rule.operatorId),
            name: rule.name,
            type: rule.ruleType === "potential" ? "Potential Proc" : "Talent Proc",
            shortType: rule.ruleType === "potential" ? "POT" : "TAL",
            elementType: getOperatorPassiveOwner(rule)?.elementType || "neutral",
            icon: rule.icon || getOperatorPassiveOwner(rule)?.icon || "",
            iconSmall: rule.icon || getOperatorPassiveOwner(rule)?.icon || "",
            ...actionOverride
        },
        triggerSourceName: triggerEvent?.skillData?.name,
        triggerSourceType: "operator-passive",
        operatorPassiveRuleId: rule.ruleKey
    };
}

function resolveSimulationOperatorPassives(events) {
    const rules = getEligibleOperatorPassiveRules();
    if (!rules.length) return Array.isArray(events) ? events : [];

    const actionRules = rules.filter(rule => rule.resolutionType === "action_modifier");
    const triggerRules = rules.filter(rule => rule.resolutionType === "triggered_effect" && !rule?.trigger?.minimumEffectStacks);
    const cooldownEnds = new Map();
    const resolved = [];

    (Array.isArray(events) ? events : []).forEach(event => {
        const sourceOperatorId = Number(event?.sourceOperatorId ?? event?.skillData?.operatorId);
        const variantEvent = {
            ...event,
            skillData: resolveSimulationAttributeVariant(event?.skillData, sourceOperatorId)
        };
        const modifiedEvent = actionRules.reduce(applyOperatorPassiveActionRule, variantEvent);
        resolved.push(modifiedEvent);
        triggerRules.forEach((rule, index) => {
            if (!operatorPassiveRuleMatchesTrigger(rule, modifiedEvent)) return;
            const now = Number(modifiedEvent.time) || 0;
            if (now + 0.0001 < (cooldownEnds.get(rule.ruleKey) || 0)) return;
            cooldownEnds.set(rule.ruleKey, now + Math.max(0, Number(rule.cooldownSeconds) || 0));
            resolved.push(createOperatorPassiveProcEvent(rule, modifiedEvent, index));
        });
    });

    return resolved.sort((left, right) => (Number(left.time) - Number(right.time)) || (Number(left.order) - Number(right.order)));
}

if (typeof window !== "undefined") {
    window.getSimulationOperatorPassiveRules = getSimulationOperatorPassiveRules;
    window.getSimulationOperatorPotential = getSimulationOperatorPotential;
    window.resolveSimulationAttributeVariant = resolveSimulationAttributeVariant;
    window.resolveSimulationOperatorPassiveActionModifiers = resolveSimulationOperatorPassiveActionModifiers;
    window.resolveSimulationOperatorPassiveStateProcs = resolveSimulationOperatorPassiveStateProcs;
    window.resolveSimulationOperatorPassives = resolveSimulationOperatorPassives;
}
