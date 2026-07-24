function normalizeBattlefieldResourceKey(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getBattlefieldResourceEffectStacks(effects, effectKey) {
    const normalizedKey = normalizeBattlefieldResourceKey(effectKey);
    if (!normalizedKey) return 0;
    const effect = (Array.isArray(effects) ? effects : []).find(candidate => (
        normalizeBattlefieldResourceKey(candidate?.appliesEffect || candidate?.id || candidate?.name) === normalizedKey
    ));
    return Math.max(0, Number(effect?.currentStacks ?? effect?.stackCount ?? effect?.stacks ?? 0) || 0);
}

function getBattlefieldResourceStateKey(skillData, config) {
    const ownerOperatorId = Number(config?.ownerOperatorId ?? skillData?.operatorId ?? skillData?.sourceOperatorId);
    const resourceKey = normalizeBattlefieldResourceKey(config?.resourceKey || config?.id || config?.name);
    return `${Number.isFinite(ownerOperatorId) ? ownerOperatorId : "team"}:${resourceKey}`;
}

function getBattlefieldResourceSnapshot(config, stateKey, appliedStacks, time) {
    const expiryTimes = appliedStacks
        .map(stack => stack.expiresAt === null || stack.expiresAt === undefined ? NaN : Number(stack.expiresAt))
        .filter(Number.isFinite);
    return {
        stateKey,
        resourceKey: normalizeBattlefieldResourceKey(config?.resourceKey || config?.id || config?.name),
        name: config?.name || config?.resourceKey || "Battlefield Resource",
        stacks: appliedStacks.length,
        maxStacks: Math.max(1, Number(config?.maxStacks) || 1),
        durationSeconds: Math.max(0, Number(config?.durationSeconds) || 0),
        nextExpiresAt: expiryTimes.length > 0 ? Math.min(...expiryTimes) : null,
        stackExpiresAt: appliedStacks.map(stack => (
            stack.expiresAt === null || stack.expiresAt === undefined ? null : Number(stack.expiresAt)
        )),
        time: Number(time) || 0
    };
}

function mergeBattlefieldResourceOverride(baseValue, overrideValue) {
    if (overrideValue === null || typeof overrideValue !== "object" || Array.isArray(overrideValue)) {
        return overrideValue;
    }
    const base = baseValue && typeof baseValue === "object" && !Array.isArray(baseValue) ? baseValue : {};
    return Object.entries(overrideValue).reduce((result, [key, value]) => ({
        ...result,
        [key]: value && typeof value === "object" && !Array.isArray(value)
            ? mergeBattlefieldResourceOverride(base[key], value)
            : value
    }), { ...base });
}

function getBattlefieldResourceOutcome(config, consumedStacks) {
    const outcomes = config?.outcomesByConsumedStacks;
    if (!outcomes || typeof outcomes !== "object" || Array.isArray(outcomes)) return null;
    const maxConfigured = Math.max(0, ...Object.keys(outcomes).map(Number).filter(Number.isFinite));
    const key = String(Math.min(Math.max(0, Number(consumedStacks) || 0), maxConfigured));
    return outcomes[key] || null;
}

function resolveBattlefieldResourceSkill(skillData, activeEffectsBefore = [], time = 0, resourceState = {}) {
    const config = skillData?.battlefieldResource;
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        return { skillData, resourceState };
    }

    const stateKey = getBattlefieldResourceStateKey(skillData, config);
    const now = Math.max(0, Number(time) || 0);
    const maxStacks = Math.max(1, Number(config.maxStacks) || 1);
    const durationSeconds = Math.max(0, Number(config.durationSeconds) || 0);
    const previousEntry = resourceState[stateKey] || {};
    const appliedStacks = (Array.isArray(previousEntry.appliedStacks) ? previousEntry.appliedStacks : [])
        .filter(stack => stack.expiresAt === null
            || stack.expiresAt === undefined
            || !Number.isFinite(Number(stack.expiresAt))
            || Number(stack.expiresAt) > now + 0.0001)
        .slice(-maxStacks);
    const before = getBattlefieldResourceSnapshot(config, stateKey, appliedStacks, now);

    const consumption = config.consumption && typeof config.consumption === "object" ? config.consumption : {};
    const configuredConsumeCount = Number(consumption.count);
    const consumedResourceStacks = consumption.consumeAllActive === true
        ? appliedStacks.length
        : Number.isFinite(configuredConsumeCount) && configuredConsumeCount > 0
            ? Math.min(appliedStacks.length, Math.floor(configuredConsumeCount))
            : 0;
    if (consumedResourceStacks > 0) appliedStacks.splice(0, consumedResourceStacks);

    const creation = config.creation && typeof config.creation === "object" ? config.creation : {};
    const consumedEffectKey = normalizeBattlefieldResourceKey(creation.consumedEffect);
    const consumesConfiguredEffect = (Array.isArray(skillData?.consumeDebuffs) ? skillData.consumeDebuffs : [])
        .some(effect => normalizeBattlefieldResourceKey(effect) === consumedEffectKey);
    const consumedEffectStacks = consumesConfiguredEffect
        ? getBattlefieldResourceEffectStacks(activeEffectsBefore, consumedEffectKey)
        : 0;
    const guaranteedStacks = Number(creation.guaranteedStacks);
    let createdStacks = 0;
    if (Number.isFinite(guaranteedStacks) && guaranteedStacks >= 0) {
        createdStacks = guaranteedStacks;
    } else if (consumedEffectStacks > 0) {
        createdStacks = (Number(creation.baseStacks) || 0)
            + consumedEffectStacks * (Number(creation.stacksPerConsumedStack) || 0);
    } else if (before.stacks < Math.max(0, Number(creation.fallbackWhenBelowStacks) || 0)) {
        createdStacks = Math.max(0, Number(creation.fallbackStacks) || 0);
    }
    const maxStacksPerUse = Math.max(0, Number(creation.maxStacksPerUse) || maxStacks);
    createdStacks = Math.max(0, Math.min(maxStacksPerUse, Math.floor(createdStacks), maxStacks - appliedStacks.length));
    for (let index = 0; index < createdStacks; index++) {
        appliedStacks.push({
            appliedAt: now,
            expiresAt: durationSeconds > 0 ? now + durationSeconds : null
        });
    }

    resourceState[stateKey] = {
        ...previousEntry,
        stateKey,
        resourceKey: before.resourceKey,
        name: before.name,
        appliedStacks
    };
    const after = getBattlefieldResourceSnapshot(config, stateKey, appliedStacks, now);
    const strikeConfig = config.strikes && typeof config.strikes === "object" ? config.strikes : {};
    const strikeCount = strikeConfig.useAllActiveStacks === false ? createdStacks : after.stacks;
    const baseAtkMultiplier = Number(strikeConfig.atkMultiplierPerStrike);
    const bonusPerConsumedStack = Number(strikeConfig.bonusAtkMultiplierPerConsumedStack) || 0;
    const finalStrikeMultiplier = Math.max(1, Number(strikeConfig.finalStrikeMultiplier) || 1);
    const perStrikeMultiplier = Number.isFinite(baseAtkMultiplier)
        ? baseAtkMultiplier + bonusPerConsumedStack * consumedEffectStacks
        : null;
    const totalAtkMultiplier = Number.isFinite(perStrikeMultiplier) && strikeCount > 0
        ? perStrikeMultiplier * (Math.max(0, strikeCount - 1) + finalStrikeMultiplier)
        : null;
    const ultimateEnergyPerStrike = Number(config.ultimateEnergyPerStrike);

    let resolvedSkillData = {
        ...skillData,
        damageProfile: Number.isFinite(totalAtkMultiplier)
            ? {
                ...(skillData.damageProfile || {}),
                atkMultiplier: totalAtkMultiplier,
                hitCount: Math.max(1, strikeCount)
            }
            : skillData.damageProfile,
        ultimateEnergyGain: Number.isFinite(ultimateEnergyPerStrike)
            ? strikeCount * ultimateEnergyPerStrike
            : skillData.ultimateEnergyGain,
        battlefieldResourceState: {
            before,
            after,
            createdStacks,
            consumedEffect: consumedEffectKey,
            consumedEffectStacks,
            consumedResourceStacks,
            strikeCount,
            perStrikeMultiplier,
            finalStrikeMultiplier,
            totalAtkMultiplier
        }
    };

    const resourceOutcome = getBattlefieldResourceOutcome(config, consumedResourceStacks);
    if (resourceOutcome?.actionOverride && typeof resourceOutcome.actionOverride === "object") {
        resolvedSkillData = mergeBattlefieldResourceOverride(resolvedSkillData, resourceOutcome.actionOverride);
        resolvedSkillData.battlefieldResourceState = {
            ...(resolvedSkillData.battlefieldResourceState || {}),
            before,
            after,
            createdStacks,
            consumedResourceStacks,
            outcomeStacks: consumedResourceStacks
        };
    }

    const progressiveBuff = config.progressiveBuff;
    if (progressiveBuff && typeof progressiveBuff === "object" && !Array.isArray(progressiveBuff)) {
        const effectKey = normalizeBattlefieldResourceKey(progressiveBuff.effect);
        const valueField = String(progressiveBuff.valueField || "damageBonusPercent");
        const value = (Number(progressiveBuff.baseValue) || 0)
            + strikeCount * (Number(progressiveBuff.valuePerStrike) || 0);
        resolvedSkillData = {
            ...resolvedSkillData,
            buffs: (Array.isArray(resolvedSkillData.buffs) ? resolvedSkillData.buffs : []).map(buff => (
                normalizeBattlefieldResourceKey(buff?.appliesEffect || buff?.id || buff?.name) === effectKey
                    ? {
                        ...buff,
                        [valueField]: value,
                        durationSeconds: Number(progressiveBuff.durationSeconds) || buff.durationSeconds,
                        target: progressiveBuff.target || buff.target
                    }
                    : buff
            ))
        };
    }

    return { skillData: resolvedSkillData, resourceState };
}

function resolveSimulationSkillScopedBuffValues(skillData, activeBuffs = []) {
    const skillType = normalizeBattlefieldResourceKey(skillData?.type || skillData?.shortType);
    return (Array.isArray(activeBuffs) ? activeBuffs : []).map(buff => {
        const effectKey = normalizeBattlefieldResourceKey(buff?.appliesEffect || buff?.id || buff?.name);
        const registryEntry = typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY?.[effectKey] : null;
        const mergedBuff = { ...(registryEntry || {}), ...buff };
        const config = mergedBuff.skillValueByStacks;
        if (!config || typeof config !== "object" || Array.isArray(config)) return mergedBuff;
        const valuesByType = config.valuesBySkillType || {};
        const values = valuesByType[skillType]
            || valuesByType[normalizeBattlefieldResourceKey(skillData?.shortType)]
            || valuesByType.default;
        if (!values || typeof values !== "object") return buff;
        const stacks = Math.max(1, Number(mergedBuff?.currentStacks ?? mergedBuff?.stackCount ?? mergedBuff?.stacks ?? 1) || 1);
        const maxStacks = Math.max(1, Number(config.maxStacks) || stacks);
        const value = Number(values[String(Math.min(stacks, maxStacks))] ?? values[String(stacks)]);
        if (!Number.isFinite(value)) return buff;
        return {
            ...mergedBuff,
            [String(config.valueField || "damageBonusPercent")]: value,
            resolvedSkillValueStacks: stacks
        };
    });
}

if (typeof window !== "undefined") {
    window.resolveSimulationSkillScopedBuffValues = resolveSimulationSkillScopedBuffValues;
}
