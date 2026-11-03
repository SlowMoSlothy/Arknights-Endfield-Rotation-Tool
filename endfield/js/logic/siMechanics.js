// Source: chr_0036_jsspsi, rank 12. The planner has one enemy damage stream.
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

// Run after normal damage calculation, including basic attacks. Keep each damage
// mode separate: recorded damage is already mitigated and cannot crit a second time.
function createSiRecordedDamageEvents(events, duration) {
    const bursts = [];
    let mark = null;
    const damageKeys = ['preMitigationDamage', 'finalDamage', 'criticalHitDamage', 'expectedFinalDamage'];
    const burst = time => {
        if (!mark) return;
        const values = Object.fromEntries(damageKeys.map(key => [key,
            mark.damage[key] === null ? null : Math.floor(mark.damage[key] * 0.13)]));
        const breakdown = {
            status: 'unverified', element: 'fixed', canCrit: false,
            attack: 0, atkMultiplier: 0, flatDamage: values.preMitigationDamage,
            rawSkillDamage: values.preMitigationDamage, hitCount: 1,
            ...values, finalDamagePerHit: values.finalDamage,
            averageDamagePerHit: values.preMitigationDamage,
            outgoing: { multiplier: 1, totalPercent: 0, sources: [] },
            mitigation: null, enemyMitigationAvailable: values.finalDamage !== null,
            sourceUrl: mark.sourceUrl
        };
        bursts.push({ kind: 'si-recorded-damage', time, order: -1,
            sourceOperatorId: mark.operatorId, triggerSourceName: 'Artful Intent',
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
        const action = event.skillData?.siAction;
        const affordable = event.spState?.affordable !== false;
        if (action === 'brushwork' && affordable) {
            // Reapplying the mark replaces the old mark; it does not detonate it.
            mark = { operatorId: event.sourceOperatorId, expiresAt: event.time + 20,
                sourceUrl: event.skillData.sourceUrl, inksoul: false,
                damage: Object.fromEntries(damageKeys.map(key => [key, 0])) };
            continue; // The application hit precedes Artful Intent.
        }
        if (action === 'initial_stroke' && mark && affordable) mark.inksoul = true;
        if (action === 'final_stroke' && mark?.inksoul && affordable) {
            burst(event.time);
            continue;
        }
        if (!mark || event.kind === 'si-recorded-damage') continue;
        const damage = event.damageBreakdown;
        if (!damage || damage.status === 'missing-profile') continue;
        for (const key of damageKeys) {
            const value = damage[key];
            mark.damage[key] = mark.damage[key] === null || value === null || !Number.isFinite(value)
                ? null : mark.damage[key] + Math.max(0, value);
        }
    }
    if (mark && mark.expiresAt <= duration) burst(mark.expiresAt);
    return bursts;
}
