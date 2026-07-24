function normalizeSimulationSustainNumber(value, fallback = 0) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
}

function resolveSimulationTreatmentEntry(entry, loadoutState = {}) {
    const scalingAttribute = String(entry?.scalingAttribute || (entry?.intellectMultiplier !== undefined ? "intellect" : "will")).trim().toLowerCase();
    const attributeValue = Math.max(0, normalizeSimulationSustainNumber(loadoutState[scalingAttribute]));
    const will = Math.max(0, normalizeSimulationSustainNumber(loadoutState.will));
    const baseTreatment = Math.max(0, normalizeSimulationSustainNumber(entry?.baseTreatment));
    const maxHp = Math.max(0, normalizeSimulationSustainNumber(loadoutState.maxHp));
    const maxHpMultiplier = Math.max(0, normalizeSimulationSustainNumber(entry?.maxHpMultiplier));
    const willMultiplier = Math.max(0, normalizeSimulationSustainNumber(
        entry?.attributeMultiplier ?? entry?.intellectMultiplier ?? entry?.willMultiplier
    ));
    const intervalSeconds = Math.max(0, normalizeSimulationSustainNumber(entry?.intervalSeconds));
    const durationSeconds = Math.max(0, normalizeSimulationSustainNumber(entry?.durationSeconds));
    const explicitTicks = Math.max(0, Math.round(normalizeSimulationSustainNumber(entry?.tickCount)));
    const tickCount = explicitTicks || (intervalSeconds > 0 && durationSeconds > 0
        ? Math.max(1, Math.round(durationSeconds / intervalSeconds))
        : 1);
    const treatmentEffectPercent = normalizeSimulationSustainNumber(loadoutState.treatmentEffectPercent);
    const perTickBeforeBonus = baseTreatment + attributeValue * willMultiplier + maxHp * maxHpMultiplier;
    const perTick = perTickBeforeBonus * (1 + treatmentEffectPercent / 100);
    const conditionalMultiplier = Math.max(1, normalizeSimulationSustainNumber(entry?.conditionalMultiplier, 1));

    return {
        name: entry?.name || "HP Treatment",
        target: entry?.target || "controlled_operator",
        will,
        scalingAttribute,
        attributeValue,
        baseTreatment,
        maxHp,
        maxHpMultiplier,
        willMultiplier,
        intervalSeconds,
        durationSeconds,
        tickCount,
        treatmentEffectPercent,
        perTick,
        total: perTick * tickCount,
        conditionalTargetHpAtMostPercent: Number.isFinite(Number(entry?.conditionalTargetHpAtMostPercent))
            ? Number(entry.conditionalTargetHpAtMostPercent)
            : null,
        conditionalMultiplier,
        conditionalTotal: perTick * tickCount * conditionalMultiplier
    };
}

function resolveSimulationShieldEntry(entry, loadoutState = {}) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const maxHp = Math.max(0, normalizeSimulationSustainNumber(loadoutState.maxHp));
    const maxHpMultiplier = Math.max(0, normalizeSimulationSustainNumber(entry.maxHpMultiplier));
    const flatShield = Math.max(0, normalizeSimulationSustainNumber(entry.flatShield));
    const baseShield = Math.max(0, normalizeSimulationSustainNumber(entry.baseShield));
    const defense = Math.max(0, normalizeSimulationSustainNumber(loadoutState.defense));
    const will = Math.max(0, normalizeSimulationSustainNumber(loadoutState.will));
    const derivedDefenseFromWill = Math.max(0, normalizeSimulationSustainNumber(entry.derivedDefenseFromWill));
    const effectiveDefense = defense + will * derivedDefenseFromWill;
    const defenseMultiplier = Math.max(0, normalizeSimulationSustainNumber(entry.defenseMultiplier));
    const shieldAppliedBonusPercent = normalizeSimulationSustainNumber(loadoutState.shieldAppliedBonusPercent);
    const beforeBonus = flatShield + baseShield + maxHp * maxHpMultiplier + effectiveDefense * defenseMultiplier;
    return {
        name: entry.name || "Shield",
        target: entry.target || "team",
        maxHp,
        maxHpMultiplier,
        flatShield,
        baseShield,
        defense,
        derivedDefenseFromWill,
        effectiveDefense,
        defenseMultiplier,
        shieldAppliedBonusPercent,
        amount: beforeBonus * (1 + shieldAppliedBonusPercent / 100),
        durationSeconds: Math.max(0, normalizeSimulationSustainNumber(entry.durationSeconds))
    };
}

function resolveSimulationSustainProfile(skillData, loadoutState = {}) {
    const profile = skillData?.sustainProfile;
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
    const treatmentEntries = Array.isArray(profile.treatments)
        ? profile.treatments
        : (profile.treatment ? [profile.treatment] : []);
    const treatments = treatmentEntries.map(entry => resolveSimulationTreatmentEntry(entry, loadoutState));
    const shield = resolveSimulationShieldEntry(profile.shield, loadoutState);
    const protectionPercent = Number(profile.protectionPercent);
    return {
        treatments,
        shield,
        protectionPercent: Number.isFinite(protectionPercent) ? protectionPercent : null,
        verified: profile.verified === true,
        sourceUrl: profile.sourceUrl || "",
        skillLevel: Number(profile.skillLevel) || null,
        conditionalBuffs: Array.isArray(profile.conditionalBuffs) ? profile.conditionalBuffs : [],
        activationCondition: profile.activationCondition || null
    };
}

if (typeof window !== "undefined") {
    window.resolveSimulationTreatmentEntry = resolveSimulationTreatmentEntry;
    window.resolveSimulationShieldEntry = resolveSimulationShieldEntry;
    window.resolveSimulationSustainProfile = resolveSimulationSustainProfile;
}
