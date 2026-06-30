function getSimulationWeaponPassiveTriggerType(event) {
    if (event?.kind === "final-strike") return "final_strike";
    if (typeof isComboSkillData === "function" && isComboSkillData(event?.skillData)) return "combo_skill";
    if (typeof isBattleSkillData === "function" && isBattleSkillData(event?.skillData)) return "battle_skill";
    if (typeof isUltimateSkillData === "function" && isUltimateSkillData(event?.skillData)) return "ultimate";
    return null;
}

function simulationWeaponPassiveEventGrantsLink(event) {
    const effects = [
        ...(Array.isArray(event?.skillData?.buffs) ? event.skillData.buffs : []),
        ...(Array.isArray(event?.skillData?.debuffs) ? event.skillData.debuffs : [])
    ];
    return effects.some(effect => String(
        effect?.appliesEffect || effect?.id || effect?.name || ""
    ).trim().toLowerCase().replace(/\s+/g, "_").includes("link"));
}

function normalizeSimulationWeaponPassiveEffectKey(effect) {
    return String(effect?.appliesEffect || effect?.id || effect?.name || "")
        .trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getSimulationWeaponPassiveEffectCounts(effects) {
    const counts = new Map();
    (Array.isArray(effects) ? effects : []).forEach(effect => {
        const key = normalizeSimulationWeaponPassiveEffectKey(effect);
        if (!key) return;
        const stacks = Math.max(1, Number(effect?.currentStacks ?? effect?.stackCount ?? effect?.stacks ?? 1) || 1);
        counts.set(key, Math.max(counts.get(key) || 0, stacks));
    });
    return counts;
}

function getSimulationWeaponPassiveTransitionKeys(beforeEffects, afterEffects, direction = "added") {
    const before = getSimulationWeaponPassiveEffectCounts(beforeEffects);
    const after = getSimulationWeaponPassiveEffectCounts(afterEffects);
    const source = direction === "consumed" ? before : after;
    const comparison = direction === "consumed" ? after : before;
    return [...source.entries()]
        .filter(([key, amount]) => amount > (comparison.get(key) || 0))
        .map(([key]) => key);
}

function getSimulationWeaponPassiveTriggerContext(event) {
    const buffsBefore = Array.isArray(event?.activeBuffsBefore) ? event.activeBuffsBefore : [];
    const buffsAfter = Array.isArray(event?.activeBuffs) ? event.activeBuffs : buffsBefore;
    const debuffsBefore = Array.isArray(event?.activeDebuffsBefore) ? event.activeDebuffsBefore : [];
    const debuffsAfter = Array.isArray(event?.activeDebuffs) ? event.activeDebuffs : debuffsBefore;
    const declaredDebuffs = Array.isArray(event?.skillData?.debuffs) ? event.skillData.debuffs : [];
    const declaredBuffs = Array.isArray(event?.skillData?.buffs) ? event.skillData.buffs : [];
    const consumedDebuffs = Array.isArray(event?.skillData?.consumeDebuffs) ? event.skillData.consumeDebuffs : [];
    return {
        appliedEffectKeys: [...new Set([
            ...getSimulationWeaponPassiveTransitionKeys(debuffsBefore, debuffsAfter),
            ...declaredDebuffs.map(normalizeSimulationWeaponPassiveEffectKey)
        ].filter(Boolean))],
        gainedBuffKeys: [...new Set([
            ...getSimulationWeaponPassiveTransitionKeys(buffsBefore, buffsAfter),
            ...declaredBuffs.map(normalizeSimulationWeaponPassiveEffectKey)
        ].filter(Boolean))],
        consumedEffectKeys: [...new Set([
            ...getSimulationWeaponPassiveTransitionKeys(debuffsBefore, debuffsAfter, "consumed"),
            ...consumedDebuffs.map(value => normalizeSimulationWeaponPassiveEffectKey({ id: value }))
        ].filter(Boolean))],
        enemyEffectKeysBefore: [...getSimulationWeaponPassiveEffectCounts(debuffsBefore).keys()]
    };
}

function getSimulationWeaponPassiveTriggerTypes(event) {
    const types = [];
    const skillType = getSimulationWeaponPassiveTriggerType(event);
    if (skillType) types.push(skillType);
    if (Number(event?.spRecoveryState?.applied || 0) > 0) types.push("sp_recovery");
    if (Number(event?.spRecoveryState?.applied || 0) > 0 || simulationWeaponPassiveEventGrantsLink(event)) {
        types.push("sp_recovery_or_link");
    }
    const context = getSimulationWeaponPassiveTriggerContext(event);
    if (context.appliedEffectKeys.length > 0) types.push("effect_applied");
    if (context.gainedBuffKeys.length > 0) types.push("buff_gained");
    if (context.consumedEffectKeys.length > 0) types.push("effect_consumed");
    return types;
}

function getSimulationWeaponPassiveState(activeEffects, operatorId, loadoutState) {
    const effects = activeEffects.filter(effect => Number(effect.targetOperatorId) === Number(operatorId));
    const atkPercentBonus = effects.reduce((sum, effect) => sum + Number(effect.atkPercent || 0), 0);
    const baseAtk = Number(loadoutState?.totalAtk || 0);
    return {
        atkPercentBonus: Math.round(atkPercentBonus * 10) / 10,
        effectiveAtk: Math.round(baseAtk * (1 + atkPercentBonus / 100) * 10) / 10,
        effects: effects.map(effect => ({ ...effect }))
    };
}

function buildSimulationWeaponAtkTimeline(teamLoadouts, effectHistory, durationSeconds) {
    const duration = Math.max(0, Number(durationSeconds) || 0);
    return teamLoadouts.map(loadout => {
        const operatorId = Number(loadout.operatorId);
        const effects = effectHistory.filter(effect => Number(effect.targetOperatorId) === operatorId);
        const moments = [...new Set([
            0,
            duration,
            ...effects.flatMap(effect => [effect.startedAt, Math.min(duration, effect.expiresAt)])
        ].filter(time => Number.isFinite(Number(time)) && Number(time) >= 0 && Number(time) <= duration))]
            .map(Number)
            .sort((left, right) => left - right);
        const getAtkAt = (time, includeStarts) => {
            const activePercent = effects
                .filter(effect => (
                    (includeStarts ? effect.startedAt <= time + 0.0001 : effect.startedAt < time - 0.0001)
                    && (includeStarts
                        ? effect.expiresAt > time + 0.0001
                        : effect.expiresAt >= time - 0.0001)
                ))
                .reduce((sum, effect) => sum + Number(effect.atkPercent || 0), 0);
            return Math.round(Number(loadout.totalAtk || 0) * (1 + activePercent / 100) * 10) / 10;
        };
        const points = [];
        moments.forEach((time, index) => {
            const before = getAtkAt(time, false);
            const after = getAtkAt(time, true);
            if (index === 0) points.push({ time, value: before });
            if (points[points.length - 1]?.value !== before) points.push({ time, value: before });
            if (after !== before) points.push({ time, value: after });
        });
        if (points.length === 0) points.push({ time: 0, value: Number(loadout.totalAtk || 0) });
        if (points[points.length - 1].time < duration) {
            points.push({ time: duration, value: points[points.length - 1].value });
        }
        return {
            operatorId,
            operatorName: typeof getSimulationOperatorName === "function"
                ? getSimulationOperatorName(operatorId)
                : `Operator ${operatorId}`,
            weaponName: loadout.weaponName,
            baseAtk: Number(loadout.totalAtk || 0),
            points
        };
    });
}

function createSimulationWeaponPassiveSkillData(loadoutState, passive) {
    return {
        id: `weapon-passive-${loadoutState.weaponKey}-${passive.triggerType}`,
        operatorId: loadoutState.operatorId,
        name: passive.passiveName,
        type: "Weapon Passive",
        shortType: "WP",
        elementType: "neutral",
        icon: loadoutState.weaponIcon || ""
    };
}

function getSimulationPassiveEventOperatorId(event) {
    if (typeof getSimulationEventOperatorId === "function") return getSimulationEventOperatorId(event);
    const explicitId = Number(event?.sourceOperatorId);
    return Number.isFinite(explicitId) ? explicitId : null;
}

function enrichSimulationSkillEventsWithWeaponPassives(events, finalStrikeTimes, leaderId, durationSeconds = null) {
    if (typeof getWeaponPassiveTriggerEffects !== "function") {
        return { events, passiveEvents: [] };
    }

    const teamLoadouts = (Array.isArray(selectedTeam) ? selectedTeam : [])
        .filter(operatorId => operatorId !== null && operatorId !== undefined)
        .map(operatorId => typeof getOperatorSimulationLoadoutStats === "function"
            ? getOperatorSimulationLoadoutStats(operatorId)
            : null)
        .filter(Boolean);
    const loadoutByOperator = new Map(teamLoadouts.map(loadout => [Number(loadout.operatorId), loadout]));
    const activeEffects = [];
    const effectHistory = [];
    const passiveEvents = [];
    const stream = [
        ...events.map(event => ({ event, time: Number(event.time) || 0, order: Number(event.order) || 0 })),
        ...(Array.isArray(finalStrikeTimes) ? finalStrikeTimes : []).map((time, index) => ({
            event: {
                kind: "final-strike",
                sourceOperatorId: Number(leaderId),
                time: Number(time) || 0,
                order: -100 + (index / 1000)
            },
            time: Number(time) || 0,
            order: -100 + (index / 1000),
            isSynthetic: true
        }))
    ].sort((left, right) => (left.time - right.time) || (left.order - right.order));

    stream.forEach(item => {
        const event = item.event;
        const eventTime = item.time;
        for (let index = activeEffects.length - 1; index >= 0; index--) {
            if (Number(activeEffects[index].expiresAt) <= eventTime + 0.0001) activeEffects.splice(index, 1);
        }

        const sourceOperatorId = getSimulationPassiveEventOperatorId(event);
        const sourceLoadout = loadoutByOperator.get(Number(sourceOperatorId)) || null;
        const activeEnemyEffects = activeEffects.filter(effect => effect.target === "enemy");
        if (activeEnemyEffects.length > 0) {
            event.activeDebuffsBefore = [
                ...(Array.isArray(event.activeDebuffsBefore) ? event.activeDebuffsBefore : []),
                ...activeEnemyEffects.map(effect => ({ ...effect }))
            ];
            event.activeDebuffs = [
                ...(Array.isArray(event.activeDebuffs) ? event.activeDebuffs : []),
                ...activeEnemyEffects.map(effect => ({ ...effect }))
            ];
        }
        event.sourceOperatorId = sourceOperatorId;
        event.loadoutState = event.loadoutState || sourceLoadout;
        event.weaponPassiveStateBefore = getSimulationWeaponPassiveState(activeEffects, sourceOperatorId, sourceLoadout);
        const activations = [];
        const triggerTypes = getSimulationWeaponPassiveTriggerTypes(event);
        const triggerContext = getSimulationWeaponPassiveTriggerContext(event);

        activeEffects.slice().forEach(effect => {
            if (Number(effect.targetOperatorId) !== Number(sourceOperatorId)) return;
            if (!(effect.consumeOnTriggerTypes || []).some(type => triggerTypes.includes(type))) return;
            activeEffects.splice(activeEffects.indexOf(effect), 1);
            effect.expiresAt = eventTime;
        });

        triggerTypes.forEach(triggerType => {
          teamLoadouts.forEach(passiveLoadout => {
            if (!passiveLoadout?.passive) return;
            const effects = getWeaponPassiveTriggerEffects(
                passiveLoadout.weaponKey,
                passiveLoadout.passive.rank,
                triggerType,
                {
                    ...triggerContext,
                    event,
                    isControlled: Number(passiveLoadout.operatorId) === Number(leaderId)
                }
            ).filter(effect => (
                Number(passiveLoadout.operatorId) === Number(sourceOperatorId)
                || effect.listen === "team"
            ));

            effects.forEach(effect => {
                const targets = effect.target === "enemy"
                    ? []
                    : effect.target === "team"
                    ? teamLoadouts.map(loadout => Number(loadout.operatorId))
                    : [Number(passiveLoadout.operatorId)];
                const activation = {
                    operatorId: Number(passiveLoadout.operatorId),
                    weaponKey: passiveLoadout.weaponKey,
                    weaponName: passiveLoadout.weaponName,
                    passiveName: passiveLoadout.passive.name,
                    triggerType,
                    triggerLabel: typeof getWeaponPassiveTriggerLabel === "function"
                        ? getWeaponPassiveTriggerLabel(triggerType)
                        : triggerType,
                    atkPercent: Number(effect.atkPercent || 0),
                    allDamageBonusPercent: Number(effect.allDamageBonusPercent || 0),
                    elementDamageBonuses: { ...(effect.elementDamageBonuses || {}) },
                    skillDamageBonuses: { ...(effect.skillDamageBonuses || {}) },
                    elementDamageTakenBonuses: { ...(effect.elementDamageTakenBonuses || {}) },
                    verified: effect.verified === true,
                    sourceUrl: effect.sourceUrl || "",
                    duration: Number(effect.duration || 0),
                    target: effect.target,
                    targetOperatorIds: targets
                };
                activations.push(activation);

                const effectTargets = effect.target === "enemy" ? [null] : targets;
                effectTargets.forEach(targetOperatorId => {
                    const effectKey = `${passiveLoadout.operatorId}:${passiveLoadout.weaponKey}:${effect.id || triggerType}:${targetOperatorId ?? "enemy"}`;
                    const activeEffect = {
                        effectKey,
                        id: `weapon_${passiveLoadout.weaponKey}_${effect.id || triggerType}`,
                        triggerId: effect.id || triggerType,
                        sourceOperatorId: Number(passiveLoadout.operatorId),
                        targetOperatorId,
                        target: effect.target,
                        weaponKey: passiveLoadout.weaponKey,
                        weaponName: passiveLoadout.weaponName,
                        weaponIcon: passiveLoadout.weaponIcon || "",
                        passiveName: passiveLoadout.passive.name,
                        atkPercent: activation.atkPercent,
                        allDamageBonusPercent: activation.allDamageBonusPercent,
                        elementDamageBonuses: { ...activation.elementDamageBonuses },
                        skillDamageBonuses: { ...activation.skillDamageBonuses },
                        elementDamageTakenBonuses: { ...activation.elementDamageTakenBonuses },
                        consumeOnTriggerTypes: [...(effect.consumeOnTriggerTypes || [])],
                        verified: activation.verified,
                        sourceUrl: activation.sourceUrl,
                        startedAt: eventTime,
                        expiresAt: eventTime + Math.max(0, activation.duration)
                    };
                    if (effect.appliesToTriggeringEvent) {
                        const appliesToSource = effect.target === "team"
                            || Number(targetOperatorId) === Number(sourceOperatorId);
                        if (appliesToSource) event.weaponPassiveStateBefore.effects.push(activeEffect);
                        return;
                    }
                    const matching = activeEffects
                        .filter(active => active.effectKey === effectKey)
                        .sort((left, right) => left.expiresAt - right.expiresAt);
                    const maxStacks = Math.max(1, Number(effect.maxStacks || 1));
                    if (matching.length >= maxStacks) {
                        matching[0].expiresAt = eventTime;
                        activeEffects.splice(activeEffects.indexOf(matching[0]), 1);
                    }
                    activeEffects.push(activeEffect);
                    effectHistory.push(activeEffect);
                });
            });
          });
        });

        event.weaponPassiveActivations = activations;
        event.weaponPassiveStateAfter = getSimulationWeaponPassiveState(activeEffects, sourceOperatorId, sourceLoadout);

        if (item.isSynthetic && activations.length > 0) {
            const primaryActivation = activations[0];
            const passiveOwnerLoadout = loadoutByOperator.get(Number(primaryActivation.operatorId)) || sourceLoadout;
            event.kind = "weapon-passive";
            event.skillData = createSimulationWeaponPassiveSkillData(passiveOwnerLoadout, primaryActivation);
            event.triggerSourceName = `${typeof getSimulationOperatorName === "function" ? getSimulationOperatorName(sourceOperatorId) : "Operator"} Final Strike`;
            passiveEvents.push(event);
        }
    });

    const timelineDuration = Number.isFinite(Number(durationSeconds))
        ? Number(durationSeconds)
        : Math.max(0, ...stream.map(item => item.time));
    return {
        events,
        passiveEvents,
        atkTimeline: buildSimulationWeaponAtkTimeline(teamLoadouts, effectHistory, timelineDuration),
        atkSource: { teamLoadouts, effectHistory }
    };
}

window.enrichSimulationSkillEventsWithWeaponPassives = enrichSimulationSkillEventsWithWeaponPassives;
window.buildSimulationWeaponAtkTimeline = buildSimulationWeaponAtkTimeline;
