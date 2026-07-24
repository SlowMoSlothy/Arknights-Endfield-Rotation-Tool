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

    function getBasicAttackHitMultiplier(hit) {
        const explicitMultiplier = Number(hit?.hitMultiplier);
        if (Number.isFinite(explicitMultiplier) && explicitMultiplier > 0) return explicitMultiplier;
        const sequenceTotal = Number(hit?.atkMultiplierTotal);
        const sequenceHitCount = Math.max(1, Number(hit?.sequenceHitCount) || 1);
        return Number.isFinite(sequenceTotal) && sequenceTotal > 0
            ? sequenceTotal / sequenceHitCount
            : 0;
    }

    function getSimulationEffectsBeforeTime(events, time) {
        const latest = [...(Array.isArray(events) ? events : [])]
            .filter(event => Number(event?.time) < Number(time) - 0.0001)
            .sort((left, right) => (Number(right.time) || 0) - (Number(left.time) || 0) || (Number(right.order) || 0) - (Number(left.order) || 0))[0];
        return {
            activeBuffsBefore: Array.isArray(latest?.activeBuffs) ? latest.activeBuffs.map(effect => ({ ...effect })) : [],
            activeDebuffsBefore: Array.isArray(latest?.activeDebuffs) ? latest.activeDebuffs.map(effect => ({ ...effect })) : []
        };
    }

    function createSimulationBasicAttackDamageEvents(attackData, duration, leaderId, passiveTimeline, segments = null) {
        const teamLoadouts = passiveTimeline?.atkSource?.teamLoadouts || [];
        const leaderLoadout = teamLoadouts.find(loadout => Number(loadout?.operatorId) === Number(leaderId)) || null;
        const effectHistory = passiveTimeline?.atkSource?.effectHistory || [];
        const events = [];
        const attackSegments = Array.isArray(segments) && segments.length > 0
            ? segments
            : [{ start: 0, end: duration, attackData }];

        attackSegments.forEach(segment => {
            const segmentAttack = segment.attackData;
            if (!segmentAttack?.hasBasicAttackConfig || typeof getBasicAttackHitTimeline !== "function") return;
            const secondsPerSlot = typeof getTimelineSecondsPerSlot === "function"
                ? getTimelineSecondsPerSlot(segmentAttack)
                : 1;
            const cycleDuration = typeof getBasicAttackCycleDuration === "function"
                ? getBasicAttackCycleDuration(segmentAttack, secondsPerSlot)
                : 0;
            if (!Number.isFinite(cycleDuration) || cycleDuration <= 0) return;
            const hitTimeline = getBasicAttackHitTimeline(segmentAttack);

            for (let localCycleStart = 0; segment.start + localCycleStart <= segment.end; localCycleStart += cycleDuration) {
                const cycleStart = segment.start + localCycleStart;
            hitTimeline.forEach(hit => {
                const time = Math.round((cycleStart + Number(hit?.time || 0)) * 1000) / 1000;
                const atkMultiplier = getBasicAttackHitMultiplier(hit);
                if (time > segment.end + 0.0001 || time > duration + 0.0001 || atkMultiplier <= 0) return;

                const isFinalStrike = hit?.isFinalStrike === true;
                const activePassiveEffects = effectHistory.filter(effect => (
                    Number(effect?.targetOperatorId) === Number(leaderId)
                    && Number(effect?.startedAt) <= time + 0.0001
                    && Number(effect?.expiresAt) > time + 0.0001
                ));
                const weaponPassiveStateBefore = typeof getSimulationWeaponPassiveState === "function"
                    ? getSimulationWeaponPassiveState(activePassiveEffects, leaderId, leaderLoadout)
                    : null;
                const sequenceLabel = isFinalStrike
                    ? "Final Strike"
                    : `SEQ ${Number(hit?.sequenceIndex) || 1}${Number(hit?.sequenceHitCount || 1) > 1 ? ` Hit ${Number(hit?.hitInSequence) || 1}` : ""}`;
                const effectState = getSimulationEffectsBeforeTime(passiveTimeline?.events, time);
                events.push({
                    kind: "basic-attack",
                    time,
                    order: -50 + ((Number(hit?.hit) || 0) / 1000),
                    sourceOperatorId: Number(leaderId),
                    loadoutState: leaderLoadout,
                    weaponPassiveStateBefore,
                    ...effectState,
                    skillData: {
                        id: `basic-attack-${Number(leaderId)}-${Number(hit?.sequenceIndex) || 1}-${Number(hit?.hitInSequence) || 1}`,
                        operatorId: Number(leaderId),
                        name: `${segmentAttack.operator || "Operator"} BATK ${sequenceLabel}${segment.form ? ` · ${segment.form.name}` : ""}`,
                        type: isFinalStrike ? "Final Strike" : "Basic Attack",
                        shortType: isFinalStrike ? "FS" : "BA",
                        elementType: segmentAttack.elementType || "neutral",
                        icon: segmentAttack.icon,
                        iconSmall: segmentAttack.iconSmall,
                        damageProfile: {
                            atkMultiplier,
                            flatDamage: 0,
                            hitCount: 1,
                            element: segmentAttack.elementType || "neutral",
                            verified: true,
                            sourceUrl: "",
                            canCrit: true
                        }
                    },
                    basicAttackHit: { ...hit, cycleStart, atkMultiplier, formKey: segment.form?.formKey || null }
                });
            });
            }
        });
        return events;
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
            Number.isFinite(configuredDuration) && configuredDuration > 0 ? configuredDuration : 20
        );
        const leaderId = Array.isArray(selectedTeam) ? selectedTeam[0] : null;
        const finalStrikeTimes = typeof getSimulationFinalStrikeTimes === "function"
            ? getSimulationFinalStrikeTimes(
                attackData,
                duration,
                typeof getBasicAttackFormSegments === "function"
                    ? getBasicAttackFormSegments(leaderId, duration, window.__simulationOperatorFormIntervals || [])
                    : null
            )
            : [];
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
        const basicAttackDamageEvents = createSimulationBasicAttackDamageEvents(
            attackData,
            duration,
            leaderId,
            passiveTimeline,
            typeof getBasicAttackFormSegments === "function"
                ? getBasicAttackFormSegments(leaderId, duration, window.__simulationOperatorFormIntervals || [])
                : null
        );
        if (typeof enrichSimulationSkillEventsWithDamageBreakdown === "function") {
            enrichSimulationSkillEventsWithDamageBreakdown(basicAttackDamageEvents);
        }
        window.__simulationDamageTimeline = typeof buildSimulationDamageTimeline === "function"
            ? buildSimulationDamageTimeline([...damageEvents, ...basicAttackDamageEvents])
            : [];
        window.__simulationBasicAttackDamageEvents = basicAttackDamageEvents;
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
