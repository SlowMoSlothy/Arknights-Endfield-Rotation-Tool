const WEAPON_PASSIVE_RULES = Object.freeze({
    exemplar: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/exemplar",
        staticElementDamageBonuses: { physical: [10, 12, 14, 16] },
        triggers: ["battle_skill", "ultimate"].map(type => ({
            type,
            target: "self",
            elementDamageBonuses: { physical: [10, 12, 14, 16] },
            duration: 30,
            maxStacks: 3
        }))
    },
    forgeborn_scathe: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/forgeborn-scathe",
        staticElementDamageBonuses: { heat: [16, 19.2, 22.4, 25.6] },
        triggers: [{
            type: "ultimate",
            target: "self",
            skillDamageBonuses: { basicAttack: [75, 90, 105, 120] },
            duration: 20,
            maxStacks: 1
        }]
    },
    artzy_tyrannical: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/artzy-tyrannical",
        staticElementDamageBonuses: { cryo: [16, 19.2, 22.4, 25.6] }
    },
    brigands_calling: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/brigands-calling",
        staticElementDamageBonuses: { cryo: [16, 19.2, 22.4, 25.6] },
        triggers: ["battle_skill", "ultimate"].flatMap(type => ([{
            id: `cryo-infliction-${type}`,
            type,
            target: "self",
            conditions: { appliedAnyEffect: ["cryo_infliction"] },
            elementDamageBonuses: { cryo: [20, 24, 28, 32] },
            duration: 20,
            maxStacks: 1
        }, {
            id: `arts-susceptibility-${type}`,
            type,
            target: "enemy",
            conditions: { appliedAnyEffect: ["arts_susceptibility"] },
            elementDamageTakenBonuses: { arts: [6, 7.2, 8.4, 9.6] },
            duration: 20,
            maxStacks: 1
        }]))
    },
    aspirant: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/aspirant",
        staticSkillDamageBonuses: { ultimate: [16, 19.2, 22.4, 25.6] },
        triggers: [{
            id: "lifted-next-ultimate",
            type: "effect_applied",
            target: "self",
            conditions: { appliedAnyEffect: ["lift", "lifted"] },
            elementDamageBonuses: { physical: [12, 14.4, 16.8, 19.2] },
            duration: 30,
            maxStacks: 3,
            consumeOnTriggerTypes: ["ultimate"]
        }]
    },
    darhoff_7: { staticAtkFlat: [12, 14, 17, 19] },
    jiminy_12: { staticAtkFlat: [12, 14, 17, 19] },
    opero_77: { staticAtkFlat: [12, 14, 17, 19] },
    peco_5: { staticAtkFlat: [12, 14, 17, 19] },
    tarr_11: { staticAtkFlat: [12, 14, 17, 19] },
    flickers_in_the_mist: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/flickers-in-the-mist",
        staticAtkPercent: [7, 8.4, 9.8, 11.2],
        triggers: [{
            id: "electric-amp-gained",
            type: "buff_gained",
            target: "self",
            conditions: { gainedAnyBuff: ["electric_amp"] },
            elementDamageBonuses: { electric: [5.5, 6.6, 7.7, 8.8] },
            duration: 30,
            maxStacks: 3
        }]
    },
    glorious_memory: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/glorious-memory",
        staticAtkPercent: [7, 8.4, 9.8, 11.2],
        triggers: [{
            id: "vulnerability-next-ultimate",
            type: "effect_applied",
            target: "self",
            conditions: { appliedAnyEffect: ["vulnerable", "vulnerability"] },
            allDamageBonusPercent: [12, 14.4, 16.8, 19.2],
            duration: 30,
            maxStacks: 3,
            consumeOnTriggerTypes: ["ultimate"]
        }]
    },
    fortmaker: { staticAtkPercent: [5, 6, 7, 8] },
    umbral_torch: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/umbral-torch",
        staticAtkPercent: [7, 8.4, 9.8, 11.2],
        triggers: [{
            id: "combustion-or-corrosion",
            type: "effect_applied",
            listen: "team",
            target: "self",
            conditions: { appliedAnyEffect: ["combustion", "corrosion"] },
            elementDamageBonuses: {
                heat: [8, 9.6, 11.2, 12.8],
                nature: [8, 9.6, 11.2, 12.8]
            },
            duration: 20,
            maxStacks: 2
        }]
    },
    obj_edge_of_lightness: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/obj-edge-of-lightness",
        triggers: [{
            id: "sp-recovery-team-elements",
            type: "sp_recovery",
            target: "team",
            elementDamageBonuses: {
                heat: [3, 3.6, 4.2, 4.8],
                electric: [3, 3.6, 4.2, 4.8]
            },
            duration: 20,
            maxStacks: 3
        }]
    },
    rapid_ascent: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/rapid-ascent",
        triggers: ["battle_skill", "ultimate"].flatMap(type => ([{
            id: `physical-${type}`,
            type,
            target: "self",
            elementDamageBonuses: { physical: [15, 18, 21, 24] },
            appliesToTriggeringEvent: true
        }, {
            id: `staggered-${type}`,
            type,
            target: "self",
            conditions: { enemyHasAnyEffectBefore: ["stagger", "staggered"] },
            allDamageBonusPercent: [35, 42, 49, 56],
            appliesToTriggeringEvent: true
        }]))
    },
    grand_vision: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/grand-vision",
        triggers: [{
            id: "crystal-next-skill",
            type: "effect_applied",
            target: "self",
            conditions: { appliedAnyEffect: ["originium_crystal", "originium_crystals", "solidification"] },
            elementDamageBonuses: { physical: [36, 43.2, 50.4, 57.6] },
            duration: 20,
            maxStacks: 1,
            consumeOnTriggerTypes: ["battle_skill", "ultimate"]
        }]
    },
    obj_razorhorn: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/obj-razorhorn",
        triggers: ["battle_skill", "combo_skill", "ultimate", "final_strike"].map(type => ({
            id: `cryo-target-${type}`,
            type,
            target: "self",
            conditions: { enemyHasAnyEffectBefore: ["cryo_infliction", "solidification"] },
            allDamageBonusPercent: [8, 9.6, 11.2, 12.8],
            appliesToTriggeringEvent: true
        })).concat([{
            id: "solidification-consumed",
            type: "effect_consumed",
            target: "self",
            conditions: { consumedAnyEffect: ["solidification"] },
            atkPercent: [12, 14.4, 16.8, 19.2],
            duration: 15,
            maxStacks: 1
        }])
    },
    obj_arts_identifier: {
        verified: true,
        sourceUrl: "https://www.icy-veins.com/arknights-endfield/weapons/obj-arts-identifier",
        triggers: [{
            id: "combo-status-team-elements",
            type: "combo_skill",
            target: "team",
            conditions: { appliedAnyEffect: ["arts_burst", "physical_status"] },
            elementDamageBonuses: {
                heat: [8, 9.6, 11.2, 12.8],
                electric: [8, 9.6, 11.2, 12.8]
            },
            duration: 15,
            maxStacks: 1
        }]
    },
    valiant: { staticAtkPercent: [10, 12, 14, 16] },
    thermite_cutter: {
        staticAtkPercent: [10, 12, 14, 16],
        triggers: [{
            type: "sp_recovery_or_link",
            target: "team",
            atkPercent: [5, 6, 7, 8],
            duration: 20,
            maxStacks: 2
        }]
    },
    sundered_prince: {
        triggers: [{
            type: "final_strike",
            target: "self",
            atkPercent: [10, 12, 14, 16],
            duration: 8,
            maxStacks: 1,
            controlledMultiplier: 2
        }]
    },
    wave_tide: {
        triggers: [{
            type: "combo_skill",
            target: "self",
            atkPercent: [12, 14.4, 16.8, 19.2],
            duration: 20,
            maxStacks: 1
        }]
    },
    howling_guard: {
        triggers: [{
            type: "battle_skill",
            target: "self",
            atkPercent: [12, 14.4, 16.8, 19.2],
            duration: 20,
            maxStacks: 1
        }]
    },
    industry_01: {
        triggers: [{
            type: "battle_skill",
            target: "self",
            atkPercent: [12, 14.4, 16.8, 19.2],
            duration: 20,
            maxStacks: 1
        }]
    }
});

function getWeaponPassiveRule(weaponKey) {
    return WEAPON_PASSIVE_RULES[String(weaponKey || "").trim()] || null;
}

function getWeaponPassiveRankValue(values, rank) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const index = Math.max(0, Math.min(values.length - 1, Math.round(Number(rank) || 1) - 1));
    const value = Number(values[index]);
    return Number.isFinite(value) ? value : 0;
}

function getWeaponPassiveRankedBonuses(bonuses, rank) {
    return Object.fromEntries(Object.entries(bonuses || {}).map(([key, values]) => (
        [key, getWeaponPassiveRankValue(values, rank)]
    )));
}

function normalizeWeaponPassiveEffectKey(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function weaponPassiveConditionMatches(actualValues, expectedValues) {
    const actual = new Set((actualValues || []).map(normalizeWeaponPassiveEffectKey));
    return (expectedValues || []).some(value => actual.has(normalizeWeaponPassiveEffectKey(value)));
}

function doesWeaponPassiveTriggerMatch(trigger, options = {}) {
    const conditions = trigger?.conditions || {};
    if (conditions.appliedAnyEffect && !weaponPassiveConditionMatches(options.appliedEffectKeys, conditions.appliedAnyEffect)) return false;
    if (conditions.gainedAnyBuff && !weaponPassiveConditionMatches(options.gainedBuffKeys, conditions.gainedAnyBuff)) return false;
    if (conditions.consumedAnyEffect && !weaponPassiveConditionMatches(options.consumedEffectKeys, conditions.consumedAnyEffect)) return false;
    if (conditions.enemyHasAnyEffectBefore && !weaponPassiveConditionMatches(options.enemyEffectKeysBefore, conditions.enemyHasAnyEffectBefore)) return false;
    return true;
}

function getWeaponPassiveStaticBonuses(weaponKey, rank = 1) {
    const rule = getWeaponPassiveRule(weaponKey);
    return {
        flatAtk: getWeaponPassiveRankValue(rule?.staticAtkFlat, rank),
        atkPercent: getWeaponPassiveRankValue(rule?.staticAtkPercent, rank),
        elementDamageBonuses: getWeaponPassiveRankedBonuses(rule?.staticElementDamageBonuses, rank),
        skillDamageBonuses: getWeaponPassiveRankedBonuses(rule?.staticSkillDamageBonuses, rank),
        verified: rule?.verified === true,
        sourceUrl: rule?.sourceUrl || ""
    };
}

function getWeaponPassiveTriggerEffects(weaponKey, rank, triggerType, options = {}) {
    const rule = getWeaponPassiveRule(weaponKey);
    return (rule?.triggers || [])
        .filter(trigger => trigger.type === triggerType && doesWeaponPassiveTriggerMatch(trigger, options))
        .map(trigger => {
            const controlledMultiplier = options.isControlled
                ? Number(trigger.controlledMultiplier || 1)
                : 1;
            return {
                ...trigger,
                atkPercent: getWeaponPassiveRankValue(trigger.atkPercent, rank) * controlledMultiplier,
                allDamageBonusPercent: getWeaponPassiveRankValue(trigger.allDamageBonusPercent, rank),
                elementDamageBonuses: getWeaponPassiveRankedBonuses(trigger.elementDamageBonuses, rank),
                skillDamageBonuses: getWeaponPassiveRankedBonuses(trigger.skillDamageBonuses, rank),
                elementDamageTakenBonuses: getWeaponPassiveRankedBonuses(trigger.elementDamageTakenBonuses, rank),
                verified: trigger.verified === true || rule?.verified === true,
                sourceUrl: trigger.sourceUrl || rule?.sourceUrl || ""
            };
        });
}

function getWeaponPassiveTriggerLabel(triggerType) {
    return ({
        final_strike: "Final Strike",
        combo_skill: "Combo Skill",
        battle_skill: "Battle Skill",
        ultimate: "Ultimate",
        sp_recovery: "SP recovery",
        buff_gained: "Buff gained",
        effect_applied: "Effect applied",
        effect_consumed: "Effect consumed",
        sp_recovery_or_link: "SP recovery or Link"
    })[triggerType] || "Timeline event";
}

window.getWeaponPassiveRule = getWeaponPassiveRule;
window.getWeaponPassiveStaticBonuses = getWeaponPassiveStaticBonuses;
window.getWeaponPassiveTriggerEffects = getWeaponPassiveTriggerEffects;
window.getWeaponPassiveTriggerLabel = getWeaponPassiveTriggerLabel;
