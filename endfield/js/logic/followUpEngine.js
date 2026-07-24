function mergeSimulationMechanicOverride(baseValue, overrideValue) {
    if (overrideValue === null || typeof overrideValue !== "object" || Array.isArray(overrideValue)) {
        return overrideValue;
    }

    const base = baseValue && typeof baseValue === "object" && !Array.isArray(baseValue)
        ? baseValue
        : {};
    return Object.entries(overrideValue).reduce((result, [key, value]) => ({
        ...result,
        [key]: value && typeof value === "object" && !Array.isArray(value)
            ? mergeSimulationMechanicOverride(base[key], value)
            : value
    }), { ...base });
}

function getSimulationMechanicEventKey(event) {
    const operatorId = Number(event?.sourceOperatorId ?? event?.skillData?.operatorId);
    const skillId = Number(event?.skillData?.id);
    return `${Number.isFinite(operatorId) ? operatorId : ""}:${Number.isFinite(skillId) ? skillId : ""}`;
}

function getSimulationMechanicEmittedEffects(event) {
    const skillData = event?.skillData || {};
    return new Set([
        ...(Array.isArray(skillData.emits) ? skillData.emits : []),
        ...(Array.isArray(skillData.debuffs) ? skillData.debuffs.map(effect => effect?.appliesEffect || effect?.id) : []),
        skillData.formActionKey
    ].filter(Boolean).map(value => String(value).trim().toLowerCase().replace(/[\s-]+/g, "_")));
}

function applySimulationSequenceStage(event, config, stageNumber, perfectTiming = false) {
    const stages = Array.isArray(config?.stages) ? config.stages : [];
    const stage = stages.find(candidate => Number(candidate?.stage) === Number(stageNumber)) || {};
    const override = stage.actionOverride && typeof stage.actionOverride === "object"
        ? stage.actionOverride
        : {};
    const stageSkillData = mergeSimulationMechanicOverride(event.skillData, override);
    const skillData = perfectTiming === true && stage.perfectActionOverride
        ? mergeSimulationMechanicOverride(stageSkillData, stage.perfectActionOverride)
        : stageSkillData;
    return {
        ...event,
        order: Number(event.order || 0) + (stageNumber / 10000),
        skillData: {
            ...skillData,
            sequenceStage: stageNumber,
            sequenceLabel: stage.label || skillData.sequenceLabel,
            perfectTiming: perfectTiming === true
        },
        sequenceStage: stageNumber,
        perfectTiming: perfectTiming === true
    };
}

function prepareSimulationSkillEventsForTriggerPass(events) {
    return (Array.isArray(events) ? events : []).map(event => {
        const skillData = event?.skillData;
        const sequenceConfig = skillData?.manualSequence;
        if (sequenceConfig && typeof sequenceConfig === "object" && !Array.isArray(sequenceConfig)) {
            return applySimulationSequenceStage(event, sequenceConfig, 1, false);
        }

        const delayedConfig = skillData?.delayedFollowUp;
        if (delayedConfig && typeof delayedConfig === "object" && !Array.isArray(delayedConfig)) {
            return {
                ...event,
                skillData: mergeSimulationMechanicOverride(skillData, delayedConfig.initialActionOverride || {})
            };
        }
        return event;
    });
}

function resolveSimulationManualSequences(events) {
    const sorted = [...(Array.isArray(events) ? events : [])]
        .sort((left, right) => (Number(left.time) - Number(right.time)) || (Number(left.order) - Number(right.order)));
    const consumed = new Set();
    const resolved = [];

    sorted.forEach((event, index) => {
        if (consumed.has(index)) return;
        const config = event?.skillData?.manualSequence;
        if (!config || typeof config !== "object" || Array.isArray(config)) {
            resolved.push(event);
            return;
        }

        const firstStage = applySimulationSequenceStage(event, config, 1, false);
        resolved.push(firstStage);

        const maxDelay = Math.max(0, Number(config.maxFollowUpDelaySeconds) || 0);
        const key = getSimulationMechanicEventKey(event);
        const candidateIndex = sorted.findIndex((candidate, candidateIndex) => (
            candidateIndex > index
            && !consumed.has(candidateIndex)
            && candidate?.kind === "manual"
            && getSimulationMechanicEventKey(candidate) === key
            && Number(candidate.time) > Number(event.time) + 0.0001
            && (maxDelay <= 0 || Number(candidate.time) <= Number(event.time) + maxDelay + 0.0001)
        ));

        let secondEvent = null;
        let perfectTiming = false;
        if (candidateIndex >= 0) {
            consumed.add(candidateIndex);
            secondEvent = sorted[candidateIndex];
            const delay = Number(secondEvent.time) - Number(event.time);
            const perfectWindow = config.perfectTimingWindow || {};
            const windowStart = Number(perfectWindow.startSeconds);
            const windowEnd = Number(perfectWindow.endSeconds);
            perfectTiming = config.manualFollowUpCountsAsPerfect === true
                || (Number.isFinite(windowStart) && Number.isFinite(windowEnd)
                    && delay >= windowStart - 0.0001
                    && delay <= windowEnd + 0.0001);
        } else if (config.autoComplete !== false && Number(config.automaticDelaySeconds) >= 0) {
            secondEvent = {
                ...event,
                kind: "proc",
                time: Number(event.time) + Number(config.automaticDelaySeconds),
                order: Number(event.order || 0) + 0.5,
                triggerSourceName: event.skillData?.name || "Sequence 1",
                triggerSourceType: "automatic-sequence"
            };
        }

        if (secondEvent) {
            resolved.push({
                ...applySimulationSequenceStage(secondEvent, config, 2, perfectTiming),
                sequenceSourceTime: Number(event.time)
            });
        }
    });

    return resolved.sort((left, right) => (Number(left.time) - Number(right.time)) || (Number(left.order) - Number(right.order)));
}

function resolveSimulationDelayedFollowUps(events) {
    const sorted = [...(Array.isArray(events) ? events : [])]
        .sort((left, right) => (Number(left.time) - Number(right.time)) || (Number(left.order) - Number(right.order)));
    const resolved = [];

    sorted.forEach(event => {
        const config = event?.skillData?.delayedFollowUp;
        if (!config || typeof config !== "object" || Array.isArray(config)) {
            resolved.push(event);
            return;
        }

        const castEvent = {
            ...event,
            skillData: mergeSimulationMechanicOverride(event.skillData, config.initialActionOverride || {})
        };
        resolved.push(castEvent);

        const naturalTime = Number(event.time) + Math.max(0, Number(config.delaySeconds) || 0);
        const detonateIds = new Set((Array.isArray(config.detonateOnSkillIds) ? config.detonateOnSkillIds : [])
            .map(Number)
            .filter(Number.isFinite));
        const detonateEffects = new Set((Array.isArray(config.detonateOnEmittedEffects) ? config.detonateOnEmittedEffects : [])
            .map(value => String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_"))
            .filter(Boolean));
        const sameOperatorOnly = config.detonatorScope !== "team";
        const detonator = sorted.find(candidate => (
            Number(candidate.time) > Number(event.time) + 0.0001
            && Number(candidate.time) < naturalTime - 0.0001
            && (!sameOperatorOnly || Number(candidate.sourceOperatorId ?? candidate.skillData?.operatorId) === Number(event.sourceOperatorId ?? event.skillData?.operatorId))
            && (detonateIds.has(Number(candidate.skillData?.id))
                || [...getSimulationMechanicEmittedEffects(candidate)].some(effect => detonateEffects.has(effect)))
        ));
        const detonatedEarly = Boolean(detonator);
        const followUpOverride = detonatedEarly && config.earlyFollowUpActionOverride
            ? config.earlyFollowUpActionOverride
            : (config.followUpActionOverride || {});
        let followUpSkill = mergeSimulationMechanicOverride(event.skillData, followUpOverride);
        if (detonatedEarly && Number(config.earlyDetonationDamageMultiplier) > 0) {
            const baseMultiplier = Number(followUpSkill?.damageProfile?.atkMultiplier);
            if (Number.isFinite(baseMultiplier)) {
                followUpSkill = {
                    ...followUpSkill,
                    damageProfile: {
                        ...followUpSkill.damageProfile,
                        atkMultiplier: baseMultiplier * Number(config.earlyDetonationDamageMultiplier)
                    }
                };
            }
        }
        const followUpEvent = {
            kind: "proc",
            time: detonatedEarly ? Number(detonator.time) : naturalTime,
            order: (detonatedEarly ? Number(detonator.order || 0) : Number(event.order || 0)) + 0.02,
            sourceOperatorId: event.sourceOperatorId,
            skillData: followUpSkill,
            triggerSourceName: detonatedEarly ? detonator.skillData?.name : event.skillData?.name,
            triggerSourceType: detonatedEarly ? "early-detonation" : "delayed-follow-up",
            delayedFromTime: Number(event.time),
            detonatedEarly
        };
        resolved.push(followUpEvent);

        if (detonatedEarly) {
            (Array.isArray(config.earlyAdditionalActions) ? config.earlyAdditionalActions : []).forEach((action, index) => {
                const actionSkill = mergeSimulationMechanicOverride(event.skillData, action?.actionOverride || action || {});
                resolved.push({
                    kind: "proc",
                    time: Number(detonator.time) + Math.max(0, Number(action?.delaySeconds) || 0),
                    order: Number(detonator.order || 0) + 0.03 + (index / 1000),
                    sourceOperatorId: event.sourceOperatorId,
                    skillData: actionSkill,
                    triggerSourceName: detonator.skillData?.name,
                    triggerSourceType: "early-additional-action",
                    delayedFromTime: Number(event.time),
                    detonatedEarly: true
                });
            });
        }
    });

    return resolved.sort((left, right) => (Number(left.time) - Number(right.time)) || (Number(left.order) - Number(right.order)));
}

function resolveSimulationFollowUpEvents(events) {
    const followUps = resolveSimulationDelayedFollowUps(resolveSimulationManualSequences(events));
    return typeof resolveSimulationOperatorPassives === "function"
        ? resolveSimulationOperatorPassives(followUps)
        : followUps;
}

if (typeof window !== "undefined") {
    window.mergeSimulationMechanicOverride = mergeSimulationMechanicOverride;
    window.prepareSimulationSkillEventsForTriggerPass = prepareSimulationSkillEventsForTriggerPass;
    window.resolveSimulationManualSequences = resolveSimulationManualSequences;
    window.resolveSimulationDelayedFollowUps = resolveSimulationDelayedFollowUps;
    window.resolveSimulationFollowUpEvents = resolveSimulationFollowUpEvents;
}
