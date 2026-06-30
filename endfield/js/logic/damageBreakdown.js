function normalizeSimulationDamageProfile(skillData) {
    const profile = skillData?.damageProfile;
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;

    const atkMultiplier = Number(profile.atkMultiplier);
    const flatDamage = Number(profile.flatDamage || 0);
    const hitCount = Math.max(1, Math.round(Number(profile.hitCount) || 1));
    if (!Number.isFinite(atkMultiplier) || atkMultiplier < 0) return null;

    return {
        atkMultiplier,
        flatDamage: Number.isFinite(flatDamage) ? flatDamage : 0,
        hitCount,
        element: String(profile.element || skillData.elementType || "neutral").toLowerCase(),
        verified: profile.verified === true,
        sourceUrl: String(profile.sourceUrl || ""),
        canCrit: profile.canCrit !== false,
        critDamageBonusPercent: Number(profile.critDamageBonusPercent) || 0
    };
}

function clampSimulationPercent(value, minimum = 0, maximum = 100) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return minimum;
    return Math.min(maximum, Math.max(minimum, numericValue));
}

function getSimulationEventCritStats(event, profile) {
    const loadoutState = event?.loadoutState || {};
    let critRatePercent = Number(loadoutState.critRatePercent);
    let critDamagePercent = Number(loadoutState.critDamagePercent);
    if (!Number.isFinite(critRatePercent)) critRatePercent = 5;
    if (!Number.isFinite(critDamagePercent)) critDamagePercent = 50;

    const sourceOperatorId = Number(event?.sourceOperatorId);
    const appliedBuffs = [];
    const sources = [];
    (Array.isArray(event?.activeBuffsBefore) ? event.activeBuffsBefore : []).forEach(buff => {
        const key = normalizeSimulationDamageEffectKey(buff);
        const registryEntry = typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY[key] : null;
        const merged = { ...(registryEntry || {}), ...buff };
        const buffSourceOperatorId = Number(merged.sourceOperatorId);
        if (merged.target === "self" && Number.isFinite(buffSourceOperatorId) && buffSourceOperatorId !== sourceOperatorId) return;

        const rateBonus = Number(merged.critRatePercent ?? merged.criticalRatePercent);
        const damageBonus = Number(merged.critDamagePercent ?? merged.criticalDamagePercent);
        if (Number.isFinite(rateBonus)) critRatePercent += rateBonus;
        if (Number.isFinite(damageBonus)) critDamagePercent += damageBonus;
        if (Number.isFinite(rateBonus) || Number.isFinite(damageBonus)) {
            appliedBuffs.push(merged.name || key);
            sources.push({
                ...getSimulationDamageEffectSource(buff, typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY : null, "buff", event),
                valueLabel: [
                    Number.isFinite(rateBonus) ? `+${rateBonus}% CR` : "",
                    Number.isFinite(damageBonus) ? `+${damageBonus}% CD` : ""
                ].filter(Boolean).join(" / ")
            });
        }
    });

    critDamagePercent += Number(profile?.critDamageBonusPercent) || 0;
    const canCrit = profile?.canCrit !== false;
    return {
        canCrit,
        critRatePercent: canCrit ? clampSimulationPercent(critRatePercent) : 0,
        critDamagePercent: canCrit ? Math.max(0, critDamagePercent) : 0,
        appliedBuffs,
        sources
    };
}

function getSimulationEventDamageAtk(event) {
    const before = Number(event?.weaponPassiveStateBefore?.effectiveAtk);
    if (Number.isFinite(before) && before > 0) return before;
    const loadoutAtk = Number(event?.loadoutState?.totalAtk);
    return Number.isFinite(loadoutAtk) ? loadoutAtk : 0;
}

function getSimulationDamageMode() {
    const configuredMode = typeof uiSettings !== "undefined" ? uiSettings?.simulationDamageMode : "expected";
    return ["normal", "expected", "critical"].includes(configuredMode) ? configuredMode : "expected";
}

function getSimulationDisplayedDamage(breakdown, mode = getSimulationDamageMode()) {
    if (!breakdown || breakdown.status === "missing-profile") return null;
    if (mode === "normal") return breakdown.finalDamage ?? breakdown.preMitigationDamage ?? null;
    if (mode === "critical") {
        return breakdown.canCrit
            ? (breakdown.criticalHitDamage ?? breakdown.finalDamage ?? breakdown.preMitigationDamage ?? null)
            : (breakdown.finalDamage ?? breakdown.preMitigationDamage ?? null);
    }
    return breakdown.expectedFinalDamage ?? breakdown.finalDamage ?? breakdown.preMitigationDamage ?? null;
}

function normalizeSimulationDamageEffectKey(effect) {
    return String(effect?.appliesEffect || effect?.id || effect?.name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

function getSimulationDamageEffectStacks(effect) {
    const stacks = Number(effect?.currentStacks ?? effect?.stackCount ?? effect?.stacks ?? 1);
    return Number.isFinite(stacks) && stacks > 0 ? stacks : 1;
}

function getSimulationDamageEffectPercent(effect, keys) {
    for (const key of keys) {
        const value = Number(effect?.[key]);
        if (Number.isFinite(value)) return value;
    }
    return null;
}

function getSimulationDamageEffectData(effect, registry) {
    const key = normalizeSimulationDamageEffectKey(effect);
    const registryEntry = registry && typeof registry === "object" ? registry[key] : null;
    return { key, merged: { ...(registryEntry || {}), ...(effect || {}) } };
}

function getSimulationDamageEffectTiming(effect, eventTime = 0) {
    const toOptionalNumber = value => value === null || value === undefined || value === "" ? NaN : Number(value);
    const stackTimes = Array.isArray(effect?.appliedStackTimes)
        ? effect.appliedStackTimes.map(toOptionalNumber).filter(Number.isFinite)
        : [];
    const startedAtCandidates = [effect?.startedAt, effect?.appliedAt, stackTimes.at(-1)].map(toOptionalNumber);
    const startedAt = startedAtCandidates.find(Number.isFinite);
    const explicitExpiresAt = toOptionalNumber(effect?.expiresAt);
    const durationSeconds = toOptionalNumber(effect?.durationSeconds);
    const expiresAt = Number.isFinite(explicitExpiresAt)
        ? explicitExpiresAt
        : (Number.isFinite(startedAt) && Number.isFinite(durationSeconds) && durationSeconds > 0
            ? startedAt + durationSeconds
            : null);
    return {
        startedAt: Number.isFinite(startedAt) ? startedAt : null,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
        remainingSeconds: Number.isFinite(expiresAt)
            ? Math.max(0, Math.round((expiresAt - (Number(eventTime) || 0)) * 10) / 10)
            : null
    };
}

function getSimulationDamageEffectSource(effect, registry, type, event) {
    const { key, merged } = getSimulationDamageEffectData(effect, registry);
    const sourceOperatorId = Number(merged.sourceOperatorId);
    const sourceOperatorName = Number.isFinite(sourceOperatorId) && typeof getSimulationOperatorName === "function"
        ? getSimulationOperatorName(sourceOperatorId)
        : "";
    const resolver = type === "debuff"
        ? (typeof resolveDebuffIcon === "function" ? resolveDebuffIcon : null)
        : (typeof resolveBuffIcon === "function" ? resolveBuffIcon : null);
    return {
        effectKey: merged.effectKey || key,
        triggerId: merged.triggerId || "",
        name: merged.name || merged.passiveName || key || "Effect",
        type,
        icon: merged.weaponIcon || (resolver ? resolver(merged) : "") || "",
        sourceLabel: merged.weaponName
            ? `Weapon: ${merged.weaponName}`
            : (sourceOperatorName ? `Operator: ${sourceOperatorName}` : (type === "debuff" ? "Enemy effect" : "Active effect")),
        weaponKey: merged.weaponKey || "",
        weaponName: merged.weaponName || "",
        passiveName: merged.passiveName || "",
        stacks: getSimulationDamageEffectStacks(merged),
        verified: merged.verified === true,
        sourceUrl: merged.sourceUrl || "",
        ...getSimulationDamageEffectTiming(merged, event?.time)
    };
}

function formatSimulationPassiveRequirementList(values) {
    return (values || []).map(value => String(value || "").replace(/_/g, " ")).join(" or ");
}

function getSimulationInactiveWeaponRequirements(event) {
    const loadout = event?.loadoutState || {};
    if (!loadout.weaponKey || typeof getWeaponPassiveRule !== "function") return [];
    const rule = getWeaponPassiveRule(loadout.weaponKey);
    const triggers = Array.isArray(rule?.triggers) ? rule.triggers : [];
    if (triggers.length === 0) return [];
    const activeTriggerIds = new Set((event?.weaponPassiveStateBefore?.effects || [])
        .filter(effect => effect.weaponKey === loadout.weaponKey)
        .map(effect => effect.triggerId)
        .filter(Boolean));
    const requirements = triggers
        .filter(trigger => !activeTriggerIds.has(trigger.id || trigger.type))
        .map(trigger => {
            const conditions = trigger.conditions || {};
            const parts = [];
            if (["battle_skill", "combo_skill", "ultimate", "final_strike"].includes(trigger.type)) {
                parts.push(typeof getWeaponPassiveTriggerLabel === "function"
                    ? getWeaponPassiveTriggerLabel(trigger.type)
                    : trigger.type.replace(/_/g, " "));
            }
            if (conditions.appliedAnyEffect) parts.push(`apply ${formatSimulationPassiveRequirementList(conditions.appliedAnyEffect)}`);
            if (conditions.gainedAnyBuff) parts.push(`gain ${formatSimulationPassiveRequirementList(conditions.gainedAnyBuff)}`);
            if (conditions.consumedAnyEffect) parts.push(`consume ${formatSimulationPassiveRequirementList(conditions.consumedAnyEffect)}`);
            if (conditions.enemyHasAnyEffectBefore) parts.push(`enemy has ${formatSimulationPassiveRequirementList(conditions.enemyHasAnyEffectBefore)}`);
            if (parts.length === 0) {
                parts.push(typeof getWeaponPassiveTriggerLabel === "function"
                    ? getWeaponPassiveTriggerLabel(trigger.type)
                    : String(trigger.type || "trigger").replace(/_/g, " "));
            }
            if (Array.isArray(trigger.consumeOnTriggerTypes) && trigger.consumeOnTriggerTypes.length) {
                parts.push(`then use ${trigger.consumeOnTriggerTypes.map(type => (
                    typeof getWeaponPassiveTriggerLabel === "function" ? getWeaponPassiveTriggerLabel(type) : type.replace(/_/g, " ")
                )).join(" or ")}`);
            }
            return parts.join(" - ");
        });
    return [...new Set(requirements)].slice(0, 4).map(reason => ({
        name: loadout.passive?.name || "Weapon passive",
        sourceLabel: `Weapon: ${loadout.weaponName || loadout.weaponKey}`,
        icon: loadout.weaponIcon || "",
        reason,
        verified: rule?.verified === true,
        sourceUrl: rule?.sourceUrl || ""
    }));
}

function isSimulationDamageEffectForSource(effect, sourceOperatorId) {
    const effectSourceOperatorId = Number(effect?.sourceOperatorId);
    return effect?.target !== "self"
        || !Number.isFinite(effectSourceOperatorId)
        || effectSourceOperatorId === sourceOperatorId;
}

function getSimulationSkillDamageTypeKey(skillData) {
    const key = String(skillData?.shortType || skillData?.type || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (key === "bs" || key.includes("battleskill")) return "battleSkill";
    if (key === "cs" || key.includes("comboskill")) return "comboSkill";
    if (key === "ult" || key.includes("ultimate")) return "ultimate";
    if (key === "fs" || key.includes("finalstrike")) return "finalStrike";
    if (key === "ba" || key.includes("basicattack")) return "basicAttack";
    return "";
}

function getSimulationOutgoingDamageBonuses(event, element) {
    const normalizedElement = String(element || "neutral").toLowerCase();
    const sourceOperatorId = Number(event?.sourceOperatorId);
    const sources = [];
    const unquantifiedEffects = [];
    let totalPercent = 0;

    const addBonus = (name, value, options = {}) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue === 0) return;
        const stacks = Math.max(1, Number(options.stacks) || 1);
        const stackedValue = numericValue * stacks;
        totalPercent += stackedValue;
        sources.push({
            name: name || "Damage bonus",
            valuePercent: stackedValue,
            stacks,
            verified: options.verified === true,
            sourceUrl: options.sourceUrl || "",
            icon: options.icon || "",
            sourceLabel: options.sourceLabel || "",
            effectKey: options.effectKey || "",
            triggerId: options.triggerId || "",
            weaponKey: options.weaponKey || "",
            startedAt: options.startedAt ?? null,
            expiresAt: options.expiresAt ?? null,
            remainingSeconds: options.remainingSeconds ?? null
        });
    };

    const loadout = event?.loadoutState || {};
    const loadoutSource = {
        verified: loadout.damageBonusVerified === true,
        sourceUrl: loadout.damageBonusSourceUrl || "",
        icon: loadout.weaponIcon || "",
        sourceLabel: `${loadout.weaponName || "Weapon loadout"}${loadout.potential ? ` / P${loadout.potential}` : ""} / Weapon + Essence`,
        weaponKey: loadout.weaponKey || "",
        effectKey: `loadout:${loadout.weaponKey || loadout.weaponName || "weapon"}`
    };
    addBonus("Loadout: All DMG", loadout.allDamageBonusPercent, loadoutSource);
    addBonus(`Loadout: ${normalizedElement} DMG`, loadout.elementDamageBonuses?.[normalizedElement], loadoutSource);
    if (!["physical", "neutral"].includes(normalizedElement)) {
        addBonus("Loadout: Arts DMG", loadout.artsDamageBonusPercent, loadoutSource);
    }

    const skillType = getSimulationSkillDamageTypeKey(event?.skillData);
    if (skillType) addBonus(`Loadout: ${skillType} DMG`, loadout.skillDamageBonuses?.[skillType], loadoutSource);
    const registries = [
        ...(Array.isArray(event?.activeBuffsBefore) ? event.activeBuffsBefore.map(effect => ({ effect, registry: typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY : null })) : []),
        ...(Array.isArray(event?.weaponPassiveStateBefore?.effects) ? event.weaponPassiveStateBefore.effects.map(effect => ({ effect, registry: null })) : [])
    ];
    registries.forEach(({ effect, registry }) => {
        const { key, merged } = getSimulationDamageEffectData(effect, registry);
        if (!isSimulationDamageEffectForSource(merged, sourceOperatorId)) return;
        const stacks = getSimulationDamageEffectStacks(merged);
        const options = {
            stacks,
            verified: merged.verified === true,
            sourceUrl: merged.sourceUrl || "",
            ...getSimulationDamageEffectSource(merged, registry, "buff", event)
        };
        const values = [
            getSimulationDamageEffectPercent(merged, ["allDamageBonusPercent", "allDamageDealtPercent", "damageBonusPercent", "damageDealtPercent"]),
            getSimulationDamageEffectPercent(merged, [`${normalizedElement}DamageBonusPercent`, `${normalizedElement}DamageDealtPercent`]),
            !["physical", "neutral"].includes(normalizedElement)
                ? getSimulationDamageEffectPercent(merged, ["artsDamageBonusPercent", "artsDamageDealtPercent"])
                : null,
            skillType ? getSimulationDamageEffectPercent(merged, [`${skillType}DamageBonusPercent`, `${skillType}DamageDealtPercent`]) : null,
            getSimulationDamageEffectPercent(merged.elementDamageBonuses, [normalizedElement]),
            skillType ? getSimulationDamageEffectPercent(merged.skillDamageBonuses, [skillType]) : null
        ];
        let quantified = false;
        values.forEach(value => {
            if (value === null) return;
            quantified = true;
            addBonus(merged.name || merged.passiveName || key, value, options);
        });
        const looksLikeDamageAmp = key === `${normalizedElement}_amp`
            || key === `${normalizedElement}_damage_up`
            || (!["physical", "neutral"].includes(normalizedElement) && key === "arts_amp")
            || key === "damage_up";
        if (!quantified && looksLikeDamageAmp) unquantifiedEffects.push(merged.name || key);
    });

    return {
        totalPercent: Math.round(totalPercent * 10) / 10,
        multiplier: Math.max(0, 1 + totalPercent / 100),
        sources,
        unquantifiedEffects
    };
}

function getSimulationDefenseMultiplier(defense) {
    const value = Number(defense);
    if (!Number.isFinite(value)) return 1;
    return value >= 0
        ? 100 / (value + 100)
        : 2 - (0.99 ** (-value));
}

function getSimulationDamageMitigation(event, element, enemy) {
    const profile = typeof getEnemyCombatProfile === "function"
        ? getEnemyCombatProfile(enemy)
        : (enemy?.combatProfile || null);
    if (!profile) return null;

    const effects = Array.isArray(event?.activeDebuffsBefore) ? event.activeDebuffsBefore : [];
    let flatDefenseReduction = 0;
    let percentDefenseReduction = 0;
    let susceptibilityPercent = 0;
    let increasedDamageTakenPercent = 0;
    let resistanceMultiplierBonus = 0;
    const unquantifiedEffects = [];
    const sources = [];
    const susceptibilityKeys = new Set([`${element}_susceptibility`]);
    if (element !== "physical" && element !== "neutral") susceptibilityKeys.add("arts_susceptibility");

    effects.forEach(effect => {
        const { key, merged } = getSimulationDamageEffectData(
            effect,
            typeof DEBUFF_REGISTRY !== "undefined" ? DEBUFF_REGISTRY : null
        );
        const stacks = getSimulationDamageEffectStacks(merged);
        const contributions = [];
        if (susceptibilityKeys.has(key)) {
            const value = getSimulationDamageEffectPercent(merged, ["valuePercent", "susceptibilityPercent", "damageTakenPercent"]);
            if (value === null) unquantifiedEffects.push(merged.name || key);
            else {
                susceptibilityPercent += value * stacks;
                contributions.push(`+${value * stacks}% susceptibility`);
            }
        }

        const defenseFlat = getSimulationDamageEffectPercent(merged, ["defenseReduction", "flatDefenseReduction"]);
        const defensePercent = getSimulationDamageEffectPercent(merged, ["defenseReductionPercent"]);
        if (defenseFlat !== null) {
            flatDefenseReduction += defenseFlat * stacks;
            contributions.push(`-${defenseFlat * stacks} DEF`);
        }
        if (defensePercent !== null) {
            percentDefenseReduction += defensePercent * stacks;
            contributions.push(`-${defensePercent * stacks}% DEF`);
        }

        const increased = getSimulationDamageEffectPercent(merged, ["increasedDamageTakenPercent", "damageTakenPercent"]);
        if (increased !== null && !susceptibilityKeys.has(key)) {
            increasedDamageTakenPercent += increased * stacks;
            contributions.push(`+${increased * stacks}% damage taken`);
        }
        const elementDamageTaken = getSimulationDamageEffectPercent(merged.elementDamageTakenBonuses, [element]);
        const artsDamageTaken = !["physical", "neutral"].includes(element)
            ? getSimulationDamageEffectPercent(merged.elementDamageTakenBonuses, ["arts"])
            : null;
        if (elementDamageTaken !== null) {
            increasedDamageTakenPercent += elementDamageTaken * stacks;
            contributions.push(`+${elementDamageTaken * stacks}% ${element} damage taken`);
        }
        if (artsDamageTaken !== null) {
            increasedDamageTakenPercent += artsDamageTaken * stacks;
            contributions.push(`+${artsDamageTaken * stacks}% Arts damage taken`);
        }

        const resistanceBonus = getSimulationDamageEffectPercent(merged, ["resistanceMultiplierBonus"]);
        const resistanceReduction = getSimulationDamageEffectPercent(merged, ["resistanceReductionPercent"]);
        if (resistanceBonus !== null) {
            resistanceMultiplierBonus += resistanceBonus * stacks;
            contributions.push(`+${Math.round(resistanceBonus * stacks * 1000) / 10}% resistance multiplier`);
        }
        if (resistanceReduction !== null) {
            resistanceMultiplierBonus += (resistanceReduction / 100) * stacks;
            contributions.push(`-${resistanceReduction * stacks}% resistance`);
        }
        if (contributions.length) {
            sources.push({
                ...getSimulationDamageEffectSource(
                    merged,
                    typeof DEBUFF_REGISTRY !== "undefined" ? DEBUFF_REGISTRY : null,
                    "debuff",
                    event
                ),
                valueLabel: contributions.join(" / ")
            });
        }
    });

    const defense = Number(profile.defense ?? 100);
    const effectiveDefense = defense * Math.max(0, 1 - percentDefenseReduction / 100) - flatDefenseReduction;
    const defenseMultiplier = getSimulationDefenseMultiplier(effectiveDefense);
    const baseResistanceMultiplier = Number(profile.resistanceMultipliers?.[element] ?? profile.resistanceMultiplier ?? 1);
    const resistanceMultiplier = Math.round(Math.max(
        0,
        (Number.isFinite(baseResistanceMultiplier) ? baseResistanceMultiplier : 1) + resistanceMultiplierBonus
    ) * 10000) / 10000;
    const susceptibilityMultiplier = 1 + susceptibilityPercent / 100;
    const increasedDamageTakenMultiplier = 1 + increasedDamageTakenPercent / 100;

    return {
        defense,
        effectiveDefense: Math.round(effectiveDefense * 10) / 10,
        defenseMultiplier,
        baseResistanceMultiplier: Number.isFinite(baseResistanceMultiplier) ? baseResistanceMultiplier : 1,
        resistanceMultiplier,
        resistanceReductionPercent: Math.round(resistanceMultiplierBonus * 1000) / 10,
        susceptibilityPercent,
        susceptibilityMultiplier,
        increasedDamageTakenPercent,
        increasedDamageTakenMultiplier,
        totalMultiplier: defenseMultiplier * resistanceMultiplier * susceptibilityMultiplier * increasedDamageTakenMultiplier,
        sources,
        unquantifiedEffects,
        sourceLabel: profile.sourceLabel || "Enemy combat profile",
        sourceUrl: profile.sourceUrl || ""
    };
}

function getSimulationDamageEffectContext(event, outgoing, mitigation, crit) {
    const loadout = event?.loadoutState || {};
    const attackSources = [];
    if (loadout.weaponName) {
        const attackParts = [];
        if (Number(loadout.weaponBaseAtk)) attackParts.push(`+${loadout.weaponBaseAtk} weapon ATK`);
        if (Number(loadout.flatAtkBonus)) attackParts.push(`+${loadout.flatAtkBonus} flat ATK`);
        if (Number(loadout.atkPercentBonus)) attackParts.push(`+${loadout.atkPercentBonus}% ATK`);
        attackSources.push({
            effectKey: `loadout:${loadout.weaponKey || loadout.weaponName}`,
            name: loadout.weaponName,
            type: "loadout",
            icon: loadout.weaponIcon || "",
            sourceLabel: `Weapon + Essence${loadout.potential ? ` / P${loadout.potential}` : ""}`,
            valueLabel: attackParts.join(" / ") || "Equipped weapon",
            verified: loadout.damageBonusVerified === true,
            sourceUrl: loadout.damageBonusSourceUrl || "",
            startedAt: null,
            expiresAt: null,
            remainingSeconds: null
        });
    }
    (event?.weaponPassiveStateBefore?.effects || []).forEach(effect => {
        const atkPercent = Number(effect?.atkPercent);
        if (!Number.isFinite(atkPercent) || atkPercent === 0) return;
        attackSources.push({
            ...getSimulationDamageEffectSource(effect, null, "buff", event),
            valueLabel: `+${atkPercent}% ATK`
        });
    });

    const outgoingSources = Array.isArray(outgoing?.sources) ? outgoing.sources : [];
    const mitigationSources = Array.isArray(mitigation?.sources) ? mitigation.sources : [];
    const critSources = Array.isArray(crit?.sources) ? crit.sources : [];
    const appliedKeys = new Set([
        ...attackSources,
        ...outgoingSources,
        ...mitigationSources,
        ...critSources
    ].map(source => source.effectKey).filter(Boolean));
    const activeEffects = [
        ...(event?.activeBuffsBefore || []).map(effect => ({ effect, registry: typeof BUFF_REGISTRY !== "undefined" ? BUFF_REGISTRY : null, type: "buff" })),
        ...(event?.weaponPassiveStateBefore?.effects || []).map(effect => ({ effect, registry: null, type: "buff" })),
        ...(event?.activeDebuffsBefore || []).map(effect => ({ effect, registry: typeof DEBUFF_REGISTRY !== "undefined" ? DEBUFF_REGISTRY : null, type: "debuff" }))
    ];
    const otherActiveEffects = activeEffects
        .map(({ effect, registry, type }) => getSimulationDamageEffectSource(effect, registry, type, event))
        .filter(source => source.effectKey && !appliedKeys.has(source.effectKey))
        .filter((source, index, all) => all.findIndex(candidate => candidate.effectKey === source.effectKey) === index)
        .slice(0, 6)
        .map(source => ({ ...source, valueLabel: "Active, no quantified contribution to this hit" }));

    return {
        eventTime: Number(event?.time) || 0,
        attackSources,
        outgoingSources,
        mitigationSources,
        critSources,
        otherActiveEffects,
        inactiveRequirements: getSimulationInactiveWeaponRequirements(event)
    };
}

function getSimulationDamageBreakdown(event) {
    const skillData = event?.skillData;
    if (!skillData || event?.kind === "weapon-passive" || skillData.isEnemySkill) return null;

    const attack = getSimulationEventDamageAtk(event);
    const profile = normalizeSimulationDamageProfile(skillData);
    const enemy = typeof getSelectedEnemy === "function" ? getSelectedEnemy() : null;
    if (!profile) {
        return {
            status: "missing-profile",
            attack,
            element: String(skillData.elementType || "neutral").toLowerCase(),
            enemyName: enemy?.name || "Selected enemy",
            message: "No verified multiplier in the database"
        };
    }

    const multiplierDamage = attack * profile.atkMultiplier;
    const rawSkillDamage = Math.round((multiplierDamage + profile.flatDamage) * 10) / 10;
    const outgoing = getSimulationOutgoingDamageBonuses(event, profile.element);
    const preMitigationDamage = Math.round(rawSkillDamage * outgoing.multiplier * 10) / 10;
    const mitigation = getSimulationDamageMitigation(event, profile.element, enemy);
    const finalDamage = mitigation
        ? Math.max(0, Math.floor(preMitigationDamage * mitigation.totalMultiplier))
        : null;
    const crit = getSimulationEventCritStats(event, profile);
    const expectedCritMultiplier = crit.canCrit
        ? 1 + (crit.critRatePercent / 100) * (crit.critDamagePercent / 100)
        : 1;
    const criticalHitDamage = finalDamage === null
        ? null
        : Math.max(0, Math.floor(finalDamage * (1 + crit.critDamagePercent / 100)));
    const expectedFinalDamage = finalDamage === null
        ? null
        : Math.max(0, Math.round(finalDamage * expectedCritMultiplier));
    const effectContext = getSimulationDamageEffectContext(event, outgoing, mitigation, crit);
    return {
        status: profile.verified ? "verified" : "unverified",
        attack,
        atkMultiplier: profile.atkMultiplier,
        flatDamage: profile.flatDamage,
        hitCount: profile.hitCount,
        element: profile.element,
        rawSkillDamage,
        outgoing,
        preMitigationDamage,
        averageDamagePerHit: Math.round((preMitigationDamage / profile.hitCount) * 10) / 10,
        enemyName: enemy?.name || "Selected enemy",
        enemyMitigationAvailable: Boolean(mitigation),
        mitigation,
        finalDamage,
        finalDamagePerHit: finalDamage === null ? null : Math.floor(finalDamage / profile.hitCount),
        canCrit: crit.canCrit,
        critRatePercent: crit.critRatePercent,
        critDamagePercent: crit.critDamagePercent,
        criticalHitDamage,
        expectedCritMultiplier,
        expectedFinalDamage,
        critBuffs: crit.appliedBuffs,
        effectContext,
        sourceUrl: profile.sourceUrl
    };
}

function enrichSimulationSkillEventsWithDamageBreakdown(events) {
    return (Array.isArray(events) ? events : []).map(event => {
        event.damageBreakdown = getSimulationDamageBreakdown(event);
        return event;
    });
}

function formatSimulationDamageMultiplier(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "-";
    return `${Math.round(numericValue * 1000) / 10}% ATK`;
}

function appendSimulationDamageBreakdown(parent, event) {
    if (!parent || typeof appendSimulationInspectorSection !== "function") return;
    const breakdown = event?.damageBreakdown || getSimulationDamageBreakdown(event);
    if (!breakdown) return;

    if (breakdown.status === "missing-profile") {
        appendSimulationInspectorSection(parent, "Damage Breakdown", [
            ["Current ATK", String(breakdown.attack || 0)],
            ["Skill scaling", "Missing in database", "is-warning"],
            ["Pre-mitigation DMG", "Unavailable"],
            ["Enemy mitigation", "Not configured"]
        ]);
        return;
    }

    const formula = `(${breakdown.attack} x ${Math.round(breakdown.atkMultiplier * 1000) / 1000}`
        + (breakdown.flatDamage ? ` + ${breakdown.flatDamage}` : "")
        + `) x ${Math.round((breakdown.outgoing?.multiplier || 1) * 1000) / 1000}`;
    const mitigation = breakdown.mitigation;
    const outgoingSources = breakdown.outgoing?.sources || [];
    appendSimulationInspectorSection(parent, "Damage Breakdown", [
        ["Current ATK", String(breakdown.attack)],
        ["Skill scaling", formatSimulationDamageMultiplier(breakdown.atkMultiplier)],
        ["Formula", formula],
        ["Raw skill DMG", String(breakdown.rawSkillDamage)],
        ["Outgoing DMG bonus", `+${breakdown.outgoing?.totalPercent || 0}%`],
        ["Outgoing sources", outgoingSources.length ? outgoingSources.map(source => `${source.name} +${source.valuePercent}%${source.verified ? "" : " (unverified)"}`).join(", ") : "None", outgoingSources.some(source => !source.verified) ? "is-warning" : ""],
        ["Pre-mitigation DMG", String(breakdown.preMitigationDamage), breakdown.status === "verified" ? "is-positive" : "is-warning"],
        ["Hits", `${breakdown.hitCount} x ${breakdown.averageDamagePerHit}`],
        ["Element", breakdown.element],
        ["Enemy", breakdown.enemyName],
        ["Effective DEF", mitigation ? `${mitigation.effectiveDefense} (${Math.round(mitigation.defenseMultiplier * 1000) / 10}% damage)` : "Not configured"],
        ["Resistance", mitigation ? `${Math.round(mitigation.baseResistanceMultiplier * 1000) / 10}% base -> ${Math.round(mitigation.resistanceMultiplier * 1000) / 10}% damage` : "Not configured"],
        ["Resistance reduction", mitigation ? `+${mitigation.resistanceReductionPercent}% damage` : "Not configured"],
        ["Susceptibility", mitigation ? `+${mitigation.susceptibilityPercent}%` : "Not configured"],
        ["Final DMG (non-crit)", breakdown.finalDamage === null ? "Unavailable" : String(breakdown.finalDamage), "is-positive"],
        ["Crit Rate", breakdown.canCrit ? `${breakdown.critRatePercent}%` : "Cannot crit"],
        ["Crit DMG", breakdown.canCrit ? `+${breakdown.critDamagePercent}%` : "-"],
        ["Critical hit", breakdown.criticalHitDamage === null ? "Unavailable" : String(breakdown.criticalHitDamage)],
        ["Expected DMG", breakdown.expectedFinalDamage === null ? "Unavailable" : String(breakdown.expectedFinalDamage), "is-positive"],
        ["Crit buffs", breakdown.critBuffs?.length ? breakdown.critBuffs.join(", ") : "None"],
        ["Unquantified effects", [...(breakdown.outgoing?.unquantifiedEffects || []), ...(mitigation?.unquantifiedEffects || [])].length ? [...(breakdown.outgoing?.unquantifiedEffects || []), ...(mitigation?.unquantifiedEffects || [])].join(", ") : "None", [...(breakdown.outgoing?.unquantifiedEffects || []), ...(mitigation?.unquantifiedEffects || [])].length ? "is-warning" : ""],
        ["Data", breakdown.status === "verified" ? "Verified profile" : "Unverified profile", breakdown.status === "verified" ? "is-positive" : "is-warning"]
    ]);
}

window.getSimulationDamageBreakdown = getSimulationDamageBreakdown;
window.getSimulationDefenseMultiplier = getSimulationDefenseMultiplier;
window.getSimulationDamageMitigation = getSimulationDamageMitigation;
window.getSimulationOutgoingDamageBonuses = getSimulationOutgoingDamageBonuses;
window.getSimulationEventCritStats = getSimulationEventCritStats;
window.getSimulationDamageMode = getSimulationDamageMode;
window.getSimulationDisplayedDamage = getSimulationDisplayedDamage;
window.enrichSimulationSkillEventsWithDamageBreakdown = enrichSimulationSkillEventsWithDamageBreakdown;
window.appendSimulationDamageBreakdown = appendSimulationDamageBreakdown;
