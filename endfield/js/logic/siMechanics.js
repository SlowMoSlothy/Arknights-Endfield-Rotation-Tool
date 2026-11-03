// Source: chr_0036_jsspsi, rank 12. Sequential hosts share the selected enemy profile.
function resolveSiTeamSkill(skill, team = [], operatorList = []) {
    if (skill?.siAction !== 'brushwork') return skill;
    const leader = operatorList.find(op => Number(op.id) === Number(team[0]));
    const element = leader?.elementType === 'heat' ? 'heat' : 'cryo';
    return {
        ...skill,
        debuffs: [
            ...(skill.debuffs || []),
            { id: `${element}_infliction`, name: `${element === 'heat' ? 'Heat' : 'Cryo'} Infliction`,
                appliesEffect: `${element}_infliction`, visible: true, persistsForCombo: true,
                stackable: true, stacksApplied: 1, maxStacks: 4 },
            { id: 'immobilization', name: 'Immobilization', appliesEffect: 'immobilization',
                visible: true, persistsForCombo: true, durationSeconds: 1 }
        ]
    };
}

// These manual events describe host availability; they do not infer enemy deaths
// from the damage chart. Stable numeric IDs use the existing save/share format.
function getSiCombatEvents(existing = []) {
    const definitions = [
        [99003301, 'si_host_defeated_next', 'Host defeated → next enemy', 'defeat_next',
            'The marked host is defeated and another enemy is available. A drawn Inksoul links to that enemy without resetting its timer.'],
        [99003302, 'si_host_defeated_last', 'Last enemy defeated', 'defeat_last',
            'The current host is defeated with no other enemy available. No damage is recorded on a dead host.'],
        [99003303, 'si_enemy_enters', 'New enemy enters combat', 'enemy_enters',
            'An enemy becomes available. A drawn Inksoul waiting for a host links to it for the remaining duration.']
    ];
    const keys = new Set(existing.map(event => event.eventKey));
    const ids = new Set(existing.map(event => Number(event.id)));
    return [...existing, ...definitions.filter(([id, key]) => !ids.has(id) && !keys.has(key))
        .map(([id, eventKey, name, siHostEvent, description]) => ({
            id, eventKey, name, siHostEvent, description,
            quickLabel: {defeat_next: 'NEXT', defeat_last: 'END', enemy_enters: 'NEW'}[siHostEvent],
            type: 'Combat Event', shortType: 'EVT', simulationOnly: true,
            elementType: 'neutral', cooldown: 0, energy: 0,
            icon: 'assets/ui/events/combat_event.svg',
            iconSmall: 'assets/ui/events/combat_event.svg', effects: [], buffs: [], debuffs: []
        }))];
}

// Run after normal damage calculation, including basic attacks. Keep each damage
// mode separate: recorded damage is already mitigated and cannot crit a second time.
function createSiRecordedDamageEvents(events, duration) {
    const bursts = [];
    let mark = null;
    let hostIndex = 1;
    let currentTargetId = 'enemy-1';
    const stateEvent = (event, kind, name, previousTargetId) => {
        bursts.push({kind, time: event.time, order: Number(event.order || 0) + 0.001,
            sourceOperatorId: mark.operatorId, previousTargetId,
            targetId: mark.hostAlive ? mark.targetId : null,
            siHostState: { targetId: mark.hostAlive ? mark.targetId : null,
                previousTargetId, expiresAt: mark.expiresAt,
                remainingSeconds: Math.max(0, mark.expiresAt - event.time),
                drawn: mark.inksoul, recordedDamage: {...mark.damage} },
            skillData: {id: kind, operatorId: mark.operatorId, name, type: 'Combat Event', shortType: 'EVT',
                simulationOnly: true, iconSmall: 'assets/ui/events/combat_event.svg',
                description: 'Inksoul keeps the original Artful Intent expiry and recorded damage.',
                buffs: [], debuffs: []}
        });
    };
    const damageKeys = ['preMitigationDamage', 'finalDamage', 'criticalHitDamage', 'expectedFinalDamage'];
    const burst = time => {
        if (!mark) return;
        if (!mark.hostAlive) { mark = null; return; }
        const values = Object.fromEntries(damageKeys.map(key => [key,
            mark.damage[key] === null ? null : Math.floor(mark.damage[key] * 0.13)]));
        const breakdown = {
            status: 'unverified', element: 'fixed', canCrit: false, recordedDamageModes: true,
            attack: 0, atkMultiplier: 0, flatDamage: values.preMitigationDamage,
            rawSkillDamage: values.preMitigationDamage, hitCount: 1,
            ...values, finalDamagePerHit: values.finalDamage,
            averageDamagePerHit: values.preMitigationDamage,
            outgoing: { multiplier: 1, totalPercent: 0, sources: [] },
            mitigation: null, enemyMitigationAvailable: values.finalDamage !== null,
            sourceUrl: mark.sourceUrl
        };
        bursts.push({ kind: 'si-recorded-damage', time, order: -1,
            sourceOperatorId: mark.operatorId, targetId: mark.targetId, triggerSourceName: 'Artful Intent',
            fixedDamageBreakdown: breakdown, damageBreakdown: breakdown,
            skillData: { id: 'si-artful-intent-burst', operatorId: mark.operatorId,
                name: 'Artful Intent Burst', type: 'Fixed Damage', shortType: 'PROC',
                elementType: 'fixed', stagger: 5, buffs: [], debuffs: [] }
        });
        mark = null;
    };
    const ordered = [...events].sort((a, b) => (a.time - b.time) || ((a.order || 0) - (b.order || 0)));
    for (const event of ordered) {
        if (event.time > duration) break;
        if (mark && event.time >= mark.expiresAt) burst(mark.expiresAt);
        const hostEvent = event.skillData?.siHostEvent;
        if (hostEvent) {
            const previousTargetId = currentTargetId;
            if (hostEvent === 'defeat_next' || hostEvent === 'defeat_last') {
                // An explicit defeated ID can name another enemy; that must not
                // kill or transfer this mark's current host.
                if (currentTargetId === null) continue;
                const defeatedId = event.defeatedTargetId ?? event.skillData?.defeatedTargetId;
                if (defeatedId != null && String(defeatedId) !== String(currentTargetId)) continue;
                currentTargetId = hostEvent === 'defeat_next'
                    ? String(event.nextTargetId ?? event.skillData?.nextTargetId ?? `enemy-${++hostIndex}`)
                    : null;
                if (mark?.hostAlive && String(mark.targetId) === String(previousTargetId)) {
                    mark.hostAlive = false;
                    if (mark.inksoul && currentTargetId !== null) {
                        mark.targetId = currentTargetId;
                        mark.hostAlive = true;
                        stateEvent(event, 'si-host-transfer', 'Inksoul → next host', previousTargetId);
                    } else {
                        stateEvent(event, mark.inksoul ? 'si-inksoul-waiting' : 'si-inksoul-dropped',
                            mark.inksoul ? 'Inksoul waiting for a host' : 'Undrawn Inksoul dropped', previousTargetId);
                    }
                }
            } else if (hostEvent === 'enemy_enters') {
                if (currentTargetId !== null) continue;
                currentTargetId = String(event.nextTargetId ?? event.skillData?.nextTargetId ?? `enemy-${++hostIndex}`);
                if (mark?.inksoul && !mark.hostAlive) {
                    const oldHost = mark.targetId;
                    mark.targetId = currentTargetId;
                    mark.hostAlive = true;
                    stateEvent(event, 'si-host-transfer', 'Inksoul → new host', oldHost);
                }
            }
            continue;
        }
        const action = event.skillData?.siAction;
        const affordable = event.spState?.affordable !== false;
        if (action === 'brushwork' && affordable && currentTargetId !== null) {
            // Reapplying the mark replaces the old mark; it does not detonate it.
            currentTargetId = String(event.targetId ?? currentTargetId);
            mark = { operatorId: event.sourceOperatorId, expiresAt: event.time + 20,
                sourceUrl: event.skillData.sourceUrl, inksoul: false, hostAlive: true,
                targetId: String(event.targetId ?? currentTargetId), seenDamageInstances: new Set(),
                damage: Object.fromEntries(damageKeys.map(key => [key, 0])) };
            continue; // The application hit precedes Artful Intent.
        }
        if (action === 'initial_stroke' && mark?.hostAlive && affordable) mark.inksoul = true;
        if (action === 'final_stroke' && mark?.inksoul && mark.hostAlive && affordable) {
            burst(event.time);
            continue;
        }
        if (!mark?.hostAlive || event.kind === 'si-recorded-damage') continue;
        const targets = Array.isArray(event.targetIds) ? event.targetIds
            : event.targetId != null ? [event.targetId] : null;
        if (targets && !targets.some(target => String(target) === String(mark.targetId)
            || (mark.inksoul && String(target) === `inksoul:${mark.operatorId}`))) continue;
        const instanceId = event.damageInstanceId;
        if (instanceId != null && mark.seenDamageInstances.has(String(instanceId))) continue;
        const damage = event.damageBreakdown;
        if (!damage || damage.status === 'missing-profile') continue;
        if (instanceId != null) mark.seenDamageInstances.add(String(instanceId));
        for (const key of damageKeys) {
            const value = damage[key];
            mark.damage[key] = mark.damage[key] === null || value === null || !Number.isFinite(value)
                ? null : mark.damage[key] + Math.max(0, value);
        }
    }
    if (mark && mark.expiresAt <= duration) burst(mark.expiresAt);
    return bursts;
}
