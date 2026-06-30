(function integrateWeaponPassivesWithSimulation() {
    const originalLoadoutEnrichment = window.enrichSimulationSkillEventsWithLoadouts;
    const originalCreateSimulationEventLog = window.createSimulationEventLog;
    const originalGetSimulationSourceOperatorId = window.getSimulationSourceOperatorId;
    const originalGetSimulationLogTypeKey = window.getSimulationLogTypeKey;
    const originalGetSimulationLogReason = window.getSimulationLogReason;
    const originalGetSimulationLogEffectSummary = window.getSimulationLogEffectSummary;
    const originalGetSimulationLogSpSummary = window.getSimulationLogSpSummary;
    const originalCreateSimulationSkillInspector = window.createSimulationSkillInspector;
    const originalRenderSimulationRotation = window.renderSimulationRotation;

    function formatPassiveActivationBonuses(activation) {
        const bonuses = [];
        if (Number(activation?.atkPercent)) bonuses.push(`+${activation.atkPercent}% ATK`);
        if (Number(activation?.allDamageBonusPercent)) bonuses.push(`+${activation.allDamageBonusPercent}% DMG`);
        Object.entries(activation?.elementDamageBonuses || {}).forEach(([element, value]) => {
            if (Number(value)) bonuses.push(`+${value}% ${element} DMG`);
        });
        Object.entries(activation?.skillDamageBonuses || {}).forEach(([skillType, value]) => {
            if (Number(value)) bonuses.push(`+${value}% ${skillType} DMG`);
        });
        Object.entries(activation?.elementDamageTakenBonuses || {}).forEach(([element, value]) => {
            if (Number(value)) bonuses.push(`+${value}% ${element} DMG taken`);
        });
        return bonuses.join(", ") || "Conditional effect";
    }

    if (typeof originalLoadoutEnrichment !== "function") return;

    window.getSimulationSourceOperatorId = function getPassiveAwareSourceOperatorId(skillData) {
        const explicitId = Number(skillData?.operatorId);
        if (Number.isFinite(explicitId)) return explicitId;
        return originalGetSimulationSourceOperatorId(skillData);
    };

    window.enrichSimulationSkillEventsWithLoadouts = function enrichLoadoutsAndWeaponPassives(events) {
        const enrichedEvents = originalLoadoutEnrichment(events);
        if (typeof enrichSimulationSkillEventsWithWeaponPassives !== "function") return enrichedEvents;

        const maxEventTime = enrichedEvents.reduce((max, event) => Math.max(max, Number(event?.time) || 0), 0);
        const cooldownEndTime = enrichedEvents.reduce((max, event) => {
            const isCombo = typeof isComboSkillData === "function" && isComboSkillData(event?.skillData);
            return isCombo
                ? Math.max(max, (Number(event?.time) || 0) + (Number(event?.skillData?.cooldown) || 0))
                : max;
        }, 0);
        const attackData = typeof getTimelineBasicAttackData === "function" ? getTimelineBasicAttackData() : null;
        const secondsPerSlot = typeof getTimelineSecondsPerSlot === "function"
            ? getTimelineSecondsPerSlot(attackData)
            : 1;
        const firstCycle = attackData?.hasBasicAttackConfig && typeof getBasicAttackCycleDuration === "function"
            ? getBasicAttackCycleDuration(attackData, secondsPerSlot)
            : 0;
        const configuredDuration = Number(uiSettings?.simulationDurationSeconds);
        const duration = Math.max(
            4,
            Math.ceil(maxEventTime + 2),
            Math.ceil(cooldownEndTime + 1),
            Math.ceil(firstCycle + 1),
            Number.isFinite(configuredDuration) && configuredDuration > 0 ? configuredDuration : 0
        );
        const finalStrikeTimes = typeof getSimulationFinalStrikeTimes === "function"
            ? getSimulationFinalStrikeTimes(attackData, duration)
            : [];
        const leaderId = Array.isArray(selectedTeam) ? selectedTeam[0] : null;
        const passiveTimeline = enrichSimulationSkillEventsWithWeaponPassives(
            enrichedEvents,
            finalStrikeTimes,
            leaderId,
            duration
        );
        window.__simulationWeaponPassiveEvents = passiveTimeline.passiveEvents;
        window.__simulationWeaponAtkTimeline = passiveTimeline.atkTimeline;
        window.__simulationWeaponAtkSource = passiveTimeline.atkSource;
        window.__simulationWeaponAtkTimelineMeta = {
            duration,
            pixelsPerSecond: typeof getSimulationPixelsPerSecond === "function"
                ? getSimulationPixelsPerSecond()
                : 180
        };
        const damageEvents = typeof enrichSimulationSkillEventsWithDamageBreakdown === "function"
            ? enrichSimulationSkillEventsWithDamageBreakdown(passiveTimeline.events)
            : passiveTimeline.events;
        window.__simulationDamageTimeline = typeof buildSimulationDamageTimeline === "function"
            ? buildSimulationDamageTimeline(damageEvents)
            : [];
        return damageEvents;
    };

    if (typeof originalRenderSimulationRotation === "function") {
        window.renderSimulationRotation = function renderSimulationRotationWithAtkChart() {
            originalRenderSimulationRotation();
            if (typeof mountSimulationWeaponAtkChart === "function") mountSimulationWeaponAtkChart();
            if (typeof mountSimulationDamageChart === "function") mountSimulationDamageChart();
        };
    }

    window.createSimulationEventLog = function createPassiveAwareSimulationEventLog(events, width, options) {
        const passiveEvents = Array.isArray(window.__simulationWeaponPassiveEvents)
            ? window.__simulationWeaponPassiveEvents
            : [];
        return originalCreateSimulationEventLog([...events, ...passiveEvents], width, options);
    };

    window.getSimulationLogTypeKey = function getPassiveSimulationLogTypeKey(event) {
        if (event?.kind === "weapon-passive") return "passive";
        return originalGetSimulationLogTypeKey(event);
    };

    window.getSimulationLogReason = function getPassiveSimulationLogReason(event) {
        const activations = Array.isArray(event?.weaponPassiveActivations)
            ? event.weaponPassiveActivations
            : [];
        if (event?.kind === "weapon-passive" && activations[0]) {
            return `${activations[0].triggerLabel}: ${activations[0].weaponName} activated`;
        }
        if (activations.length > 0) {
            return `${originalGetSimulationLogReason(event)} | ${activations.map(item => item.passiveName).join(", ")} activated`;
        }
        return originalGetSimulationLogReason(event);
    };

    window.getSimulationLogEffectSummary = function getPassiveSimulationLogEffectSummary(event) {
        const baseSummary = originalGetSimulationLogEffectSummary(event);
        const activations = Array.isArray(event?.weaponPassiveActivations)
            ? event.weaponPassiveActivations
            : [];
        const passiveSummary = activations.map(activation => (
            `Weapon: ${formatPassiveActivationBonuses(activation)}${activation.duration ? ` for ${activation.duration}s` : ""}`
        )).join(" | ");
        const damage = event?.damageBreakdown;
        const damageSummary = damage && damage.status !== "missing-profile"
            ? `Expected DMG: ${damage.expectedFinalDamage ?? damage.finalDamage ?? damage.preMitigationDamage}`
            : "";
        return [baseSummary, passiveSummary, damageSummary].filter(Boolean).join(" | ");
    };

    window.getSimulationLogSpSummary = function getPassiveSimulationLogSpSummary(event) {
        const baseSummary = originalGetSimulationLogSpSummary(event);
        const before = Number(event?.weaponPassiveStateBefore?.effectiveAtk);
        const after = Number(event?.weaponPassiveStateAfter?.effectiveAtk);
        const atkSummary = Number.isFinite(before) && Number.isFinite(after) && Math.abs(after - before) > 0.01
            ? `ATK ${before} -> ${after}`
            : "";
        return [baseSummary, atkSummary].filter(Boolean).join(" | ");
    };

    window.createSimulationSkillInspector = function createPassiveAwareSkillInspector(event) {
        const panel = originalCreateSimulationSkillInspector(event);
        if (!panel || typeof appendSimulationInspectorSection !== "function") return panel;

        const activations = Array.isArray(event?.weaponPassiveActivations)
            ? event.weaponPassiveActivations
            : [];
        const stateBefore = event?.weaponPassiveStateBefore;
        const stateAfter = event?.weaponPassiveStateAfter;
        if (activations.length > 0 || stateBefore?.effects?.length) {
            const lines = [];
            activations.forEach(activation => {
                lines.push([
                    activation.passiveName,
                    `${formatPassiveActivationBonuses(activation)}${activation.duration ? ` for ${activation.duration}s` : ""} (${activation.triggerLabel})`,
                    "is-positive"
                ]);
            });
            if (Number(stateBefore?.effectiveAtk) > 0 || Number(stateAfter?.effectiveAtk) > 0) {
                lines.push([
                    "Effective ATK",
                    `${stateBefore?.effectiveAtk || 0} -> ${stateAfter?.effectiveAtk || 0}`,
                    Number(stateAfter?.effectiveAtk) > Number(stateBefore?.effectiveAtk) ? "is-positive" : ""
                ]);
            }
            if (Number(stateAfter?.atkPercentBonus) > 0) {
                lines.push(["Active weapon bonus", `+${stateAfter.atkPercentBonus}% ATK`]);
            }
            appendSimulationInspectorSection(panel, "Weapon Passive", lines);
        }
        if (typeof appendSimulationDamageBreakdown === "function") {
            appendSimulationDamageBreakdown(panel, event);
        }
        return panel;
    };
})();
