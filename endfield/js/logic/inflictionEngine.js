// Runtime mechanics are intentionally empty until Supabase hydration succeeds.
// Gameplay values for Arts Inflictions must not be duplicated in the client bundle.
const INFLICTION_MECHANICS = Object.create(null);

function normalizeInflictionMechanicKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function getInflictionMechanic(value) {
    const key = normalizeInflictionMechanicKey(
        typeof value === "string"
            ? value
            : (value?.appliesEffect || value?.id || value?.effect || value?.name)
    );
    return key ? (INFLICTION_MECHANICS[key] || null) : null;
}

function getSkillInflictionApplications(skillData, activeDebuffsBefore = []) {
    const applications = [];
    const append = effect => {
        const key = normalizeInflictionMechanicKey(effect?.appliesEffect || effect?.id || effect?.name);
        const mechanic = getInflictionMechanic(key);
        if (!key || !mechanic) return;
        applications.push({
            key,
            mechanic,
            stacksApplied: Math.max(1, Math.round(Number(effect?.stacksApplied || effect?.stackCount || 1) || 1))
        });
    };

    (Array.isArray(skillData?.debuffs) ? skillData.debuffs : []).forEach(append);

    const matching = skillData?.matchingInfliction;
    if (matching && Array.isArray(matching.candidateEffects)) {
        const stacksByKey = new Map((Array.isArray(activeDebuffsBefore) ? activeDebuffsBefore : []).map(effect => [
            normalizeInflictionMechanicKey(effect?.appliesEffect || effect?.id || effect?.name),
            Number(effect?.currentStacks ?? effect?.stackCount ?? effect?.stacks ?? 0) || 0
        ]));
        const matchedKey = matching.candidateEffects.find(effectName => (
            (stacksByKey.get(normalizeInflictionMechanicKey(effectName)) || 0) >= Number(matching.minStacks || 1)
        ));
        if (matchedKey) {
            append({
                appliesEffect: matchedKey,
                stacksApplied: Number(matching.stacksApplied || 1)
            });
        }
    }

    return applications;
}

function createInflictionBurstEvent(sourceEvent, application, burstIndex) {
    const mechanic = application.mechanic;
    const explicitSourceOperatorId = Number(sourceEvent?.sourceOperatorId ?? sourceEvent?.skillData?.operatorId);
    const inferredSourceOperatorId = typeof getSimulationSourceOperatorId === "function"
        ? Number(getSimulationSourceOperatorId(sourceEvent?.skillData))
        : NaN;
    const sourceOperatorId = Number.isFinite(explicitSourceOperatorId)
        ? explicitSourceOperatorId
        : inferredSourceOperatorId;
    const delay = Math.max(0, Number(mechanic.burstDelaySeconds) || 0);
    const eventTime = Math.round(((Number(sourceEvent?.time) || 0) + delay) * 1000) / 1000;
    return {
        kind: "arts-burst",
        time: eventTime,
        order: Number(sourceEvent?.order || 0) + 0.01 + (burstIndex / 1000),
        sourceOperatorId: Number.isFinite(sourceOperatorId) ? sourceOperatorId : sourceEvent?.sourceOperatorId,
        triggerSourceName: sourceEvent?.skillData?.name || mechanic.name,
        activeBuffsBefore: (sourceEvent?.activeBuffs || sourceEvent?.activeBuffsBefore || []).map(effect => ({ ...effect })),
        activeDebuffsBefore: (sourceEvent?.activeDebuffs || sourceEvent?.activeDebuffsBefore || []).map(effect => ({ ...effect })),
        activeBuffs: (sourceEvent?.activeBuffs || []).map(effect => ({ ...effect })),
        activeDebuffs: (sourceEvent?.activeDebuffs || []).map(effect => ({ ...effect })),
        skillData: {
            id: `${mechanic.burstKey || `${application.key}_burst`}-${sourceEvent?.skillData?.id || "skill"}-${burstIndex + 1}`,
            operatorId: Number.isFinite(sourceOperatorId) ? sourceOperatorId : undefined,
            name: mechanic.burstName || `${mechanic.element || "Arts"} Burst`,
            type: "Arts Burst",
            shortType: "BURST",
            elementType: mechanic.element,
            damageProfile: {
                atkMultiplier: Number(mechanic.burstAtkMultiplier),
                flatDamage: 0,
                hitCount: Math.max(1, Number(mechanic.burstHitCount) || 1),
                element: mechanic.element,
                verified: mechanic.verified === true,
                sourceUrl: mechanic.sourceUrl || "",
                canCrit: mechanic.burstCanCrit !== false
            }
        },
        inflictionBurst: {
            effectKey: application.key,
            burstKey: mechanic.burstKey,
            sourceSkillId: sourceEvent?.skillData?.id
        }
    };
}

function enrichSimulationEventsWithInflictionBursts(events) {
    if (!Array.isArray(events) || Object.keys(INFLICTION_MECHANICS).length === 0) return events;

    const result = [];
    events.forEach(event => {
        result.push(event);
        if (!event?.skillData || event.kind === "arts-burst") return;

        const stacksBefore = new Map((Array.isArray(event.activeDebuffsBefore) ? event.activeDebuffsBefore : []).map(effect => [
            normalizeInflictionMechanicKey(effect?.appliesEffect || effect?.id || effect?.name),
            Number(effect?.currentStacks ?? effect?.stackCount ?? effect?.stacks ?? 0) || 0
        ]));
        let burstIndex = 0;
        getSkillInflictionApplications(event.skillData, event.activeDebuffsBefore).forEach(application => {
            const previousStacks = Math.max(0, Number(stacksBefore.get(application.key)) || 0);
            const burstCount = previousStacks > 0
                ? application.stacksApplied
                : Math.max(0, application.stacksApplied - 1);
            for (let index = 0; index < burstCount; index++) {
                result.push(createInflictionBurstEvent(event, application, burstIndex));
                burstIndex++;
            }
            stacksBefore.set(
                application.key,
                Math.min(Number(application.mechanic.maxStacks) || 4, previousStacks + application.stacksApplied)
            );
        });
    });

    return result.sort((left, right) => (
        (Number(left?.time) || 0) - (Number(right?.time) || 0)
        || (Number(left?.order) || 0) - (Number(right?.order) || 0)
    ));
}

window.getInflictionMechanic = getInflictionMechanic;
window.getSkillInflictionApplications = getSkillInflictionApplications;
window.enrichSimulationEventsWithInflictionBursts = enrichSimulationEventsWithInflictionBursts;
