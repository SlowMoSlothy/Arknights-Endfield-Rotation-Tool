const OPERATOR_LOADOUT_STORAGE_KEY = "operatorLoadouts";
const LEGACY_WEAPON_LOADOUT_STORAGE_KEY = "operatorWeaponLoadouts";
const DEFAULT_WEAPON_POTENTIAL = 1;
const MAX_WEAPON_POTENTIAL = 5;
const ESSENCE_CHANNEL_KEYS = ["primary", "secondary", "skill"];
const LOADOUT_SLOT_KEYS = ["weapon", "gloves", "armor", "kit1", "kit2"];

let activeLoadoutOperatorId = null;
let loadoutModalPreviousFocus = null;
let loadoutControlObserver = null;

function normalizeWeaponType(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function normalizeBoundedInteger(value, minimum, maximum, fallback = minimum) {
    const numericValue = Math.round(Number(value));
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.min(maximum, Math.max(minimum, numericValue));
}

function normalizeWeaponPotential(value) {
    return normalizeBoundedInteger(value, DEFAULT_WEAPON_POTENTIAL, MAX_WEAPON_POTENTIAL, DEFAULT_WEAPON_POTENTIAL);
}

function createEmptyEssenceAllocation() {
    return { primary: 0, secondary: 0, skill: 0 };
}

function isWeaponLoadoutSimulationMode() {
    return typeof isSimulationTimelineMode === "function"
        ? isSimulationTimelineMode()
        : (typeof uiSettings !== "undefined" && uiSettings?.timelineMode === "simulation");
}

function getWeaponByKey(weaponKey) {
    const key = String(weaponKey || "").trim();
    if (!key || !Array.isArray(weapons)) return null;
    return weapons.find(weapon => String(weapon.key) === key) || null;
}

function getWeaponEssenceProfile(weaponOrKey) {
    const weapon = typeof weaponOrKey === "object" ? weaponOrKey : getWeaponByKey(weaponOrKey);
    if (!weapon) return null;
    if (weapon.essenceProfile) return weapon.essenceProfile;
    if (typeof weaponEssenceProfiles === "undefined" || !Array.isArray(weaponEssenceProfiles)) return null;
    return weaponEssenceProfiles.find(profile => String(profile.weaponKey) === String(weapon.key)) || null;
}

function formatEssenceProfileValue(value, isPercent = false) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "-";
    return `${numericValue > 0 ? "+" : ""}${numericValue}${isPercent ? "%" : ""}`;
}

function getEssenceProfileValueRange(values, isPercent = false) {
    if (!Array.isArray(values) || values.length === 0) return "-";
    const first = formatEssenceProfileValue(values[0], isPercent);
    const last = formatEssenceProfileValue(values[values.length - 1], isPercent);
    return first === last ? first : `${first} to ${last}`;
}
function getWeaponPotentialBaseRank(profile, channel, potential) {
    const ranks = channel === "primary" ? profile?.primaryBaseRanks : profile?.secondaryBaseRanks;
    if (!Array.isArray(ranks) || ranks.length === 0) return channel === "skill" ? 1 : 0;
    const index = normalizeWeaponPotential(potential) - 1;
    return normalizeBoundedInteger(ranks[index] ?? ranks[ranks.length - 1], 0, 9, 0);
}

function getWeaponEssenceAllocationCaps(weapon, potential = DEFAULT_WEAPON_POTENTIAL) {
    const profile = getWeaponEssenceProfile(weapon);
    if (!profile) return createEmptyEssenceAllocation();

    const primaryBase = getWeaponPotentialBaseRank(profile, "primary", potential);
    const secondaryBase = getWeaponPotentialBaseRank(profile, "secondary", potential);
    const primaryValueCap = Math.max(0, profile.primaryValues.length - primaryBase);
    const secondaryValueCap = Math.max(0, profile.secondaryValues.length - secondaryBase);
    const skillRankCap = Math.max(1, Math.min(profile.skillDescriptions.length || 1, profile.skillMaxEssence || 1));

    return {
        primary: Math.min(Math.max(0, Number(profile.primaryMaxEssence) || 0), primaryValueCap),
        secondary: Math.min(Math.max(0, Number(profile.secondaryMaxEssence) || 0), secondaryValueCap),
        skill: Math.max(0, skillRankCap - 1)
    };
}

function getWeaponEssenceRankSummary(activation) {
    if (!activation) return null;
    const used = ESSENCE_CHANNEL_KEYS.reduce((total, channel) => total + (Number(activation.essence?.[channel]) || 0), 0);
    const caps = getWeaponEssenceAllocationCaps(activation.weapon, activation.potential);
    const max = ESSENCE_CHANNEL_KEYS.reduce((total, channel) => total + (Number(caps[channel]) || 0), 0);
    return { used, max };
}

function normalizeWeaponEssenceAllocation(value, weapon, potential) {
    const source = value && typeof value === "object" && !Array.isArray(value)
        ? value
        : createEmptyEssenceAllocation();
    const caps = getWeaponEssenceAllocationCaps(weapon, potential);
    return {
        primary: normalizeBoundedInteger(source.primary, 0, caps.primary, 0),
        secondary: normalizeBoundedInteger(source.secondary, 0, caps.secondary, 0),
        skill: normalizeBoundedInteger(source.skill, 0, caps.skill, 0)
    };
}

function getWeaponActivationState(operatorId) {
    const operator = getWeaponLoadoutOperator(operatorId);
    const loadout = getOperatorLoadout(operatorId);
    const weapon = getWeaponByKey(loadout.weapon?.key);
    const profile = getWeaponEssenceProfile(weapon);
    if (!operator || !weapon || !profile) return null;

    const potential = normalizeWeaponPotential(loadout.weapon.potential);
    const essence = normalizeWeaponEssenceAllocation(loadout.weapon.essence, weapon, potential);
    const primaryBase = getWeaponPotentialBaseRank(profile, "primary", potential);
    const secondaryBase = getWeaponPotentialBaseRank(profile, "secondary", potential);
    const primaryRank = Math.min(profile.primaryValues.length, primaryBase + essence.primary);
    const secondaryRank = Math.min(profile.secondaryValues.length, secondaryBase + essence.secondary);
    const skillMaxRank = Math.max(1, Math.min(profile.skillDescriptions.length || 1, profile.skillMaxEssence || 1));
    const skillRank = Math.min(skillMaxRank, 1 + essence.skill);

    return {
        operator,
        weapon,
        profile,
        potential,
        essence,
        primary: {
            label: profile.primaryLabel === "Main Attribute" ? (operator.mainAttribute || profile.primaryLabel) : profile.primaryLabel,
            rank: primaryRank,
            maxRank: profile.primaryValues.length,
            value: primaryRank > 0 ? profile.primaryValues[primaryRank - 1] : null,
            isPercent: profile.primaryIsPercent
        },
        secondary: {
            label: profile.secondaryLabel,
            rank: secondaryRank,
            maxRank: profile.secondaryValues.length,
            value: secondaryRank > 0 ? profile.secondaryValues[secondaryRank - 1] : null,
            isPercent: profile.secondaryIsPercent
        },
        skill: {
            label: profile.skillName,
            rank: skillRank,
            maxRank: skillMaxRank,
            description: profile.skillDescriptions[skillRank - 1] || profile.skillDescriptions[0] || ""
        }
    };
}

function getOperatorSimulationLoadoutStats(operatorId) {
    const operator = getWeaponLoadoutOperator(operatorId);
    const loadout = getOperatorLoadout(operatorId);
    const weapon = getWeaponByKey(loadout.weapon?.key);
    if (!operator || !weapon || !isWeaponLoadoutSimulationMode()) return null;

    const activation = getWeaponActivationState(operatorId);
    const operatorBaseAtk = Number(operator.baseAtk) || 0;
    const weaponBaseAtk = Number(weapon.baseAtk) || 0;
    let flatAtkBonus = 0;
    let atkPercentBonus = 0;
    let mainAttributeBonus = null;
    const operatorBaseCritRatePercent = Number(
        operator.baseCritRatePercent ?? operator.baseCriticalRatePercent ?? operator.critRatePercent
    );
    const operatorBaseCritDamagePercent = Number(
        operator.baseCritDamagePercent ?? operator.baseCriticalDamagePercent ?? operator.critDamagePercent
    );
    const baseCritRatePercent = Number.isFinite(operatorBaseCritRatePercent) ? operatorBaseCritRatePercent : 5;
    const baseCritDamagePercent = Number.isFinite(operatorBaseCritDamagePercent) ? operatorBaseCritDamagePercent : 50;
    let critRateBonusPercent = Number(weapon.critRateBonusPercent ?? weapon.criticalRateBonusPercent) || 0;
    let critDamageBonusPercent = Number(weapon.critDamageBonusPercent ?? weapon.criticalDamageBonusPercent) || 0;
    const elementDamageBonuses = {
        physical: Number(weapon.physicalDamageBonusPercent ?? weapon.physicalDamageDealtPercent) || 0,
        heat: Number(weapon.heatDamageBonusPercent ?? weapon.heatDamageDealtPercent) || 0,
        cryo: Number(weapon.cryoDamageBonusPercent ?? weapon.cryoDamageDealtPercent) || 0,
        electric: Number(weapon.electricDamageBonusPercent ?? weapon.electricDamageDealtPercent) || 0,
        nature: Number(weapon.natureDamageBonusPercent ?? weapon.natureDamageDealtPercent) || 0
    };
    let artsDamageBonusPercent = Number(weapon.artsDamageBonusPercent ?? weapon.artsDamageDealtPercent) || 0;
    let allDamageBonusPercent = Number(weapon.allDamageBonusPercent ?? weapon.damageDealtPercent) || 0;
    const skillDamageBonuses = {};
    const operatorMainAttribute = String(operator.mainAttribute || "").trim();

    [activation?.primary, activation?.secondary].filter(Boolean).forEach(stat => {
        const label = String(stat.label || "").trim();
        const labelKey = label.toLowerCase().replace(/[^a-z0-9]/g, "");
        const mainAttributeKey = operatorMainAttribute.toLowerCase().replace(/[^a-z0-9]/g, "");
        const value = Number(stat.value);
        if (!label || !Number.isFinite(value)) return;

        if (labelKey.includes("attack") || labelKey.includes("atk")) {
            if (stat.isPercent) atkPercentBonus += value;
            else flatAtkBonus += value;
            return;
        }

        if (labelKey.includes("criticalrate") || labelKey.includes("critrate")) {
            critRateBonusPercent += value;
            return;
        }

        if (labelKey.includes("criticaldamage") || labelKey.includes("critdamage") || labelKey.includes("critdmg")) {
            critDamageBonusPercent += value;
            return;
        }

        const elementKey = Object.keys(elementDamageBonuses).find(element => (
            labelKey.includes(element) && (labelKey.includes("damage") || labelKey.includes("dmg"))
        ));
        if (elementKey && stat.isPercent) {
            elementDamageBonuses[elementKey] += value;
            return;
        }

        if (labelKey.includes("arts") && (labelKey.includes("damage") || labelKey.includes("dmg")) && stat.isPercent) {
            artsDamageBonusPercent += value;
            return;
        }

        if ((labelKey.includes("alldamage") || labelKey.includes("alldmg")) && stat.isPercent) {
            allDamageBonusPercent += value;
            return;
        }

        if (mainAttributeKey && labelKey.includes(mainAttributeKey)) {
            mainAttributeBonus = { label: operatorMainAttribute, value, isPercent: Boolean(stat.isPercent) };
        }
    });

    const passiveStaticBonuses = typeof getWeaponPassiveStaticBonuses === "function"
        ? getWeaponPassiveStaticBonuses(weapon.key, activation?.skill?.rank || 1)
        : { flatAtk: 0, atkPercent: 0 };
    flatAtkBonus += Number(passiveStaticBonuses.flatAtk) || 0;
    atkPercentBonus += Number(passiveStaticBonuses.atkPercent) || 0;
    Object.entries(passiveStaticBonuses.elementDamageBonuses || {}).forEach(([element, value]) => {
        if (Object.prototype.hasOwnProperty.call(elementDamageBonuses, element)) {
            elementDamageBonuses[element] += Number(value) || 0;
        }
    });
    Object.entries(passiveStaticBonuses.skillDamageBonuses || {}).forEach(([skillType, value]) => {
        skillDamageBonuses[skillType] = (Number(skillDamageBonuses[skillType]) || 0) + (Number(value) || 0);
    });

    const attackBeforePercent = operatorBaseAtk + weaponBaseAtk + flatAtkBonus;
    const totalAtk = Math.round(attackBeforePercent * (1 + atkPercentBonus / 100) * 10) / 10;
    return {
        operatorId: Number(operatorId),
        weaponKey: weapon.key,
        weaponName: weapon.name,
        weaponIcon: weapon.icon || "",
        operatorBaseAtk,
        weaponBaseAtk,
        flatAtkBonus,
        atkPercentBonus,
        passiveStaticBonuses,
        attackBeforePercent,
        totalAtk,
        baseCritRatePercent,
        baseCritDamagePercent,
        critRateBonusPercent,
        critDamageBonusPercent,
        critRatePercent: Math.min(100, Math.max(0, baseCritRatePercent + critRateBonusPercent)),
        critDamagePercent: Math.max(0, baseCritDamagePercent + critDamageBonusPercent),
        elementDamageBonuses,
        skillDamageBonuses,
        artsDamageBonusPercent,
        allDamageBonusPercent,
        damageBonusVerified: passiveStaticBonuses.verified === true || activation?.profile?.verified === true || weapon.damageBonusVerified === true,
        damageBonusSourceUrl: passiveStaticBonuses.sourceUrl || activation?.profile?.sourceUrl || weapon.damageBonusSourceUrl || "",
        potential: activation?.potential || normalizeWeaponPotential(loadout.weapon?.potential),
        mainAttributeBonus,
        primary: activation?.primary || null,
        secondary: activation?.secondary || null,
        skill: activation?.skill || null,
        passive: weapon.passiveName
            ? {
                name: weapon.passiveName,
                rank: activation?.skill?.rank || 1,
                description: activation?.skill?.description || ""
            }
            : null
    };
}

function getActivationAttackBoostSummary(activation) {
    const summary = { flat: 0, percent: 0, hasBoost: false };
    [activation?.primary, activation?.secondary].filter(Boolean).forEach(stat => {
        const labelKey = String(stat.label || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        const value = Number(stat.value);
        if (!Number.isFinite(value) || (!labelKey.includes("attack") && !labelKey.includes("atk"))) return;
        summary.hasBoost = true;
        if (stat.isPercent) summary.percent += value;
        else summary.flat += value;
    });
    return summary;
}

function formatLoadoutAttackBoost(summary) {
    if (!summary?.hasBoost) return "No ATK Essence";
    const parts = [];
    if (summary.flat) parts.push(formatEssenceProfileValue(summary.flat));
    if (summary.percent) parts.push(formatEssenceProfileValue(summary.percent, true));
    return parts.join(" / ") || "Active";
}

function formatLoadoutAttackNumber(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "-";
    return Number.isInteger(numericValue) ? String(numericValue) : String(Math.round(numericValue * 10) / 10);
}

function createLoadoutAttackBreakdown(combatStats) {
    const root = document.createElement("details");
    root.className = "loadout-attack-breakdown";

    const summary = document.createElement("summary");
    const title = document.createElement("strong");
    title.textContent = "ATK breakdown";
    const formula = document.createElement("span");
    if (combatStats) {
        const multiplier = 1 + (Number(combatStats.atkPercentBonus) || 0) / 100;
        const percentPart = combatStats.atkPercentBonus
            ? ` x ${formatLoadoutAttackNumber(multiplier)}`
            : "";
        formula.textContent = `${formatLoadoutAttackNumber(combatStats.attackBeforePercent)}${percentPart} = ${formatLoadoutAttackNumber(combatStats.totalAtk)}`;
    } else {
        formula.textContent = "Available in Simulation Mode";
    }
    summary.append(title, formula);
    root.appendChild(summary);

    const rows = document.createElement("div");
    rows.className = "loadout-attack-breakdown-rows";
    const addRow = (label, value, modifier = "") => {
        const row = document.createElement("div");
        row.className = `loadout-attack-breakdown-row${modifier ? ` ${modifier}` : ""}`;
        const labelNode = document.createElement("span");
        labelNode.textContent = label;
        const valueNode = document.createElement("strong");
        valueNode.textContent = value;
        row.append(labelNode, valueNode);
        rows.appendChild(row);
    };

    if (combatStats) {
        addRow("Operator Base ATK", formatLoadoutAttackNumber(combatStats.operatorBaseAtk));
        addRow("Weapon Base ATK", `+${formatLoadoutAttackNumber(combatStats.weaponBaseAtk)}`);
        addRow("Flat ATK bonuses", formatEssenceProfileValue(combatStats.flatAtkBonus));
        addRow("ATK before percent", formatLoadoutAttackNumber(combatStats.attackBeforePercent));
        addRow("Percent ATK bonuses", formatEssenceProfileValue(combatStats.atkPercentBonus, true));
        addRow("Simulation ATK", formatLoadoutAttackNumber(combatStats.totalAtk), "is-total");
    } else {
        addRow("Mode", "Switch to Simulation");
        addRow("Weapon Base ATK", "Still fixed");
        addRow("Potential", "Affects activation ranks");
    }

    root.appendChild(rows);
    return root;
}
function getWeaponLoadoutOperator(operatorId) {
    const id = Number(operatorId);
    if (!Number.isFinite(id) || !Array.isArray(operators)) return null;
    return operators.find(operator => Number(operator.id) === id) || null;
}

function isWeaponCompatibleWithOperator(weapon, operator) {
    if (!weapon || !operator) return false;
    return normalizeWeaponType(weapon.weaponType) === normalizeWeaponType(operator.weaponType);
}

function getCompatibleWeaponsForOperator(operatorOrId) {
    const operator = typeof operatorOrId === "object"
        ? operatorOrId
        : getWeaponLoadoutOperator(operatorOrId);
    if (!operator || !Array.isArray(weapons)) return [];

    return weapons
        .filter(weapon => isWeaponCompatibleWithOperator(weapon, operator))
        .sort((left, right) => {
            const rarityDifference = Number(right.rarity || 0) - Number(left.rarity || 0);
            return rarityDifference || String(left.name || "").localeCompare(String(right.name || ""));
        });
}

function createEmptyOperatorLoadout() {
    return {
        weapon: null,
        gloves: null,
        armor: null,
        kit1: null,
        kit2: null
    };
}

function normalizeWeaponLoadoutEntry(value, operator) {
    const source = typeof value === "string"
        ? { key: value }
        : (value && typeof value === "object" ? value : null);
    if (!source) return null;

    const weaponKey = source.key || source.weaponKey;
    const weapon = getWeaponByKey(weaponKey);
    if (!isWeaponCompatibleWithOperator(weapon, operator)) return null;

    const legacyPotential = typeof source.essence === "number" ? source.essence : null;
    const potential = normalizeWeaponPotential(source.potential ?? source.weaponPotential ?? legacyPotential);
    return {
        key: String(weapon.key),
        potential,
        essence: normalizeWeaponEssenceAllocation(source.essence, weapon, potential)
    };
}

function normalizeOperatorLoadouts(value) {
    const normalized = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return normalized;

    Object.entries(value).forEach(([operatorId, rawLoadout]) => {
        const operator = getWeaponLoadoutOperator(operatorId);
        if (!operator) return;

        const legacyWeaponValue = typeof rawLoadout === "string"
            ? rawLoadout
            : (rawLoadout?.weaponKey ? rawLoadout : null);
        const weapon = normalizeWeaponLoadoutEntry(
            legacyWeaponValue || rawLoadout?.weapon,
            operator
        );
        if (!weapon) return;

        normalized[String(operator.id)] = {
            ...createEmptyOperatorLoadout(),
            weapon
        };
    });

    return normalized;
}

function loadOperatorLoadouts() {
    const saved = localStorage.getItem(OPERATOR_LOADOUT_STORAGE_KEY)
        || localStorage.getItem(LEGACY_WEAPON_LOADOUT_STORAGE_KEY);
    if (!saved) {
        operatorLoadouts = {};
        return;
    }

    try {
        operatorLoadouts = normalizeOperatorLoadouts(JSON.parse(saved));
        saveOperatorLoadouts();
        localStorage.removeItem(LEGACY_WEAPON_LOADOUT_STORAGE_KEY);
    } catch (error) {
        console.error("Operator loadouts could not be loaded:", error);
        operatorLoadouts = {};
    }
}

function saveOperatorLoadouts() {
    operatorLoadouts = normalizeOperatorLoadouts(operatorLoadouts);
    localStorage.setItem(OPERATOR_LOADOUT_STORAGE_KEY, JSON.stringify(operatorLoadouts));
}

function getOperatorLoadout(operatorId) {
    const operator = getWeaponLoadoutOperator(operatorId);
    if (!operator) return createEmptyOperatorLoadout();

    const normalized = normalizeOperatorLoadouts({
        [String(operator.id)]: operatorLoadouts?.[String(operator.id)]
    });
    return normalized[String(operator.id)] || createEmptyOperatorLoadout();
}

function getEquippedWeaponKey(operatorId) {
    return getOperatorLoadout(operatorId).weapon?.key || null;
}

function getEquippedWeapon(operatorId) {
    return getWeaponByKey(getEquippedWeaponKey(operatorId));
}

function getEquippedWeaponPotential(operatorId) {
    const weapon = getOperatorLoadout(operatorId).weapon;
    return weapon ? normalizeWeaponPotential(weapon.potential) : null;
}

function getEquippedWeaponEssence(operatorId) {
    const loadoutWeapon = getOperatorLoadout(operatorId).weapon;
    const weapon = getWeaponByKey(loadoutWeapon?.key);
    return loadoutWeapon ? normalizeWeaponEssenceAllocation(loadoutWeapon.essence, weapon, loadoutWeapon.potential) : null;
}

function setEquippedWeaponForOperator(operatorId, weaponKey) {
    if (!isWeaponLoadoutSimulationMode()) return false;

    const operator = getWeaponLoadoutOperator(operatorId);
    if (!operator) return false;

    const key = String(weaponKey || "").trim();
    if (!key) {
        delete operatorLoadouts[String(operator.id)];
        saveOperatorLoadouts();
        return true;
    }

    const weapon = getWeaponByKey(key);
    if (!isWeaponCompatibleWithOperator(weapon, operator)) return false;

    const currentWeapon = getOperatorLoadout(operator.id).weapon;
    const keepCurrent = currentWeapon?.key === String(weapon.key);
    const potential = keepCurrent
        ? normalizeWeaponPotential(currentWeapon.potential)
        : DEFAULT_WEAPON_POTENTIAL;
    operatorLoadouts[String(operator.id)] = {
        ...createEmptyOperatorLoadout(),
        weapon: {
            key: String(weapon.key),
            potential,
            essence: keepCurrent
                ? normalizeWeaponEssenceAllocation(currentWeapon.essence, weapon, potential)
                : createEmptyEssenceAllocation()
        }
    };
    saveOperatorLoadouts();
    return true;
}

function setWeaponPotentialForOperator(operatorId, potential) {
    if (!isWeaponLoadoutSimulationMode()) return false;
    const operator = getWeaponLoadoutOperator(operatorId);
    const current = getOperatorLoadout(operatorId);
    const weapon = getWeaponByKey(current.weapon?.key);
    if (!operator || !weapon || !current.weapon) return false;

    const normalizedPotential = normalizeWeaponPotential(potential);
    operatorLoadouts[String(operator.id)] = {
        ...current,
        weapon: {
            ...current.weapon,
            potential: normalizedPotential,
            essence: normalizeWeaponEssenceAllocation(current.weapon.essence, weapon, normalizedPotential)
        }
    };
    saveOperatorLoadouts();
    return true;
}

function setWeaponEssenceForOperator(operatorId, channelOrValue, value = null) {
    if (!isWeaponLoadoutSimulationMode()) return false;

    const operator = getWeaponLoadoutOperator(operatorId);
    const current = getOperatorLoadout(operatorId);
    const weapon = getWeaponByKey(current.weapon?.key);
    if (!operator || !weapon || !current.weapon) return false;

    const potential = normalizeWeaponPotential(current.weapon.potential);
    const nextEssence = typeof channelOrValue === "object"
        ? channelOrValue
        : {
            ...normalizeWeaponEssenceAllocation(current.weapon.essence, weapon, potential),
            [String(channelOrValue)]: value
        };
    if (typeof channelOrValue !== "object" && !ESSENCE_CHANNEL_KEYS.includes(String(channelOrValue))) return false;

    operatorLoadouts[String(operator.id)] = {
        ...current,
        weapon: {
            ...current.weapon,
            potential,
            essence: normalizeWeaponEssenceAllocation(nextEssence, weapon, potential)
        }
    };
    saveOperatorLoadouts();
    return true;
}

function getShareableOperatorLoadouts(team = selectedTeam) {
    if (!isWeaponLoadoutSimulationMode() || !Array.isArray(team)) return {};

    const loadouts = {};
    team.forEach(operatorId => {
        const id = Number(operatorId);
        if (!Number.isFinite(id)) return;
        const loadout = getOperatorLoadout(id);
        if (loadout.weapon) loadouts[String(id)] = loadout;
    });
    return loadouts;
}

function getShareableOperatorWeaponLoadouts(team = selectedTeam) {
    const loadouts = getShareableOperatorLoadouts(team);
    return Object.fromEntries(
        Object.entries(loadouts).map(([operatorId, loadout]) => [operatorId, loadout.weapon.key])
    );
}

function applyImportedOperatorLoadouts(value, team = selectedTeam) {
    const imported = normalizeOperatorLoadouts(value);
    const nextLoadouts = { ...operatorLoadouts };
    const teamOperatorIds = new Set(
        Array.isArray(team)
            ? team.map(Number).filter(Number.isFinite).map(String)
            : []
    );

    teamOperatorIds.forEach(operatorId => delete nextLoadouts[operatorId]);
    Object.entries(imported).forEach(([operatorId, loadout]) => {
        if (teamOperatorIds.has(String(operatorId))) nextLoadouts[String(operatorId)] = loadout;
    });

    operatorLoadouts = normalizeOperatorLoadouts(nextLoadouts);
    saveOperatorLoadouts();
}

function applyImportedOperatorWeaponLoadouts(value, team = selectedTeam) {
    applyImportedOperatorLoadouts(value, team);
}

function getWeaponLoadoutSummary(weapon, activation = null) {
    if (!weapon) return "Choose weapon";
    const parts = [];
    if (activation) {
        const ranks = getWeaponEssenceRankSummary(activation);
        parts.push(`Potential ${activation.potential}`);
        if (ranks) parts.push(`${ranks.used}/${ranks.max} Essence ranks`);
    }
    if (Number.isFinite(Number(weapon.baseAtk))) parts.push(`${Number(weapon.baseAtk)} ATK`);
    return parts.join(" / ") || "Equipped";
}

function getWeaponRarityStars(weapon) {
    const rarity = Math.max(0, Math.min(6, Math.round(Number(weapon?.rarity) || 0)));
    return rarity > 0 ? "\u2605".repeat(rarity) : "?";
}

function createLoadoutWeaponIcon(className = "", weapon = null) {
    const icon = document.createElement("span");
    icon.className = `loadout-weapon-icon ${className}`.trim();
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
        <svg viewBox="0 0 24 24" focusable="false">
            <path d="M14.5 4.5l5 5"></path>
            <path d="M13 6l5 5L9 20H4v-5z"></path>
            <path d="M11 8l5 5"></path>
        </svg>
    `;
    if (weapon?.icon) {
        const image = document.createElement("img");
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        icon.classList.add("has-image");
        image.addEventListener("error", () => {
            image.remove();
            icon.classList.remove("has-image");
        });
        image.src = weapon.icon;
        icon.prepend(image);
    }
    return icon;
}

function refreshOperatorLoadoutSurfaces() {
    if (typeof renderSkills === "function") renderSkills();
    if (typeof initSkillDragDrop === "function") initSkillDragDrop();
    if (typeof renderRotation === "function") renderRotation();
}

function createCompactOperatorLoadoutControl(control, operator) {
    const weapon = getEquippedWeapon(operator.id);
    const activation = getWeaponActivationState(operator.id);

    control.innerHTML = "";
    control.dataset.loadoutOperatorId = String(operator.id);
    control.classList.toggle("equipped", Boolean(weapon));
    control.setAttribute("role", "button");
    control.setAttribute("tabindex", "0");
    control.setAttribute("aria-haspopup", "dialog");
    control.setAttribute("aria-label", `Open loadout for ${operator.name}`);
    control.title = weapon
        ? `${weapon.name}: ${getWeaponLoadoutSummary(weapon, activation)}`
        : `Configure ${operator.name}'s loadout`;

    control.appendChild(createLoadoutWeaponIcon("compact", weapon));

    const copy = document.createElement("span");
    copy.className = "operator-weapon-loadout-copy";
    const label = document.createElement("span");
    label.className = "operator-weapon-loadout-label";
    label.textContent = "Loadout";
    const value = document.createElement("strong");
    value.className = "operator-weapon-loadout-value";
    value.textContent = weapon?.name || "Choose weapon";
    const summary = document.createElement("span");
    summary.className = "operator-weapon-loadout-summary";
    summary.textContent = getWeaponLoadoutSummary(weapon, activation);
    copy.appendChild(label);
    copy.appendChild(value);
    copy.appendChild(summary);
    control.appendChild(copy);

    const chevron = document.createElement("span");
    chevron.className = "operator-weapon-loadout-chevron";
    chevron.textContent = ">";
    chevron.setAttribute("aria-hidden", "true");
    control.appendChild(chevron);

    const open = event => {
        event.preventDefault();
        event.stopPropagation();
        openOperatorLoadoutModal(operator.id);
    };
    control.addEventListener("click", open);
    control.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") open(event);
    });
}

function upgradeOperatorLoadoutControls() {
    document.querySelectorAll(".operator-skill-wrapper .operator-weapon-loadout").forEach(control => {
        if (control.dataset.loadoutOperatorId) return;
        const operatorName = control.closest(".operator-skill-wrapper")
            ?.querySelector(".operator-skill-name")
            ?.textContent
            ?.trim();
        const operator = Array.isArray(operators)
            ? operators.find(entry => entry.name === operatorName && selectedTeam.includes(entry.id))
            : null;
        if (operator) createCompactOperatorLoadoutControl(control, operator);
    });
}

function observeOperatorLoadoutControls() {
    const skillList = document.getElementById("skillList");
    if (!skillList || typeof MutationObserver === "undefined") return;
    loadoutControlObserver?.disconnect();
    loadoutControlObserver = new MutationObserver(upgradeOperatorLoadoutControls);
    loadoutControlObserver.observe(skillList, { childList: true, subtree: true });
    upgradeOperatorLoadoutControls();
}

function renderLoadoutOperatorHeader(operator) {
    const avatar = document.getElementById("loadoutOperatorAvatar");
    const name = document.getElementById("loadoutOperatorName");
    const meta = document.getElementById("loadoutOperatorMeta");
    if (avatar) {
        avatar.src = operator.icon || "";
        avatar.alt = operator.name || "Operator";
    }
    if (name) name.textContent = operator.name || "Operator";
    if (meta) meta.textContent = `${operator.operatorClass || "Operator"} / ${String(operator.weaponType || "Weapon").replace(/_/g, " ")}`;
}

function renderLoadoutWeaponList(operator) {
    const list = document.getElementById("loadoutWeaponList");
    if (!list) return;
    list.innerHTML = "";

    const equippedKey = getEquippedWeaponKey(operator.id);
    const compatibleWeapons = getCompatibleWeaponsForOperator(operator);
    compatibleWeapons.forEach(weapon => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "loadout-weapon-card";
        button.classList.toggle("selected", String(weapon.key) === equippedKey);
        button.setAttribute("aria-pressed", String(String(weapon.key) === equippedKey));
        button.setAttribute("aria-label", `Equip ${weapon.name}`);

        button.appendChild(createLoadoutWeaponIcon("", weapon));

        const copy = document.createElement("span");
        copy.className = "loadout-weapon-card-copy";
        const title = document.createElement("strong");
        title.textContent = weapon.name;
        const meta = document.createElement("span");
        meta.className = "loadout-weapon-card-meta";
        const stars = document.createElement("span");
        stars.className = "loadout-weapon-rarity";
        stars.textContent = getWeaponRarityStars(weapon);
        stars.setAttribute("aria-label", `${Number(weapon.rarity) || "Unknown"} star weapon`);
        const attack = document.createElement("span");
        attack.className = "loadout-weapon-atk-badge";
        const attackLabel = document.createElement("small");
        attackLabel.textContent = "ATK";
        const attackValue = document.createElement("strong");
        attackValue.textContent = String(Number(weapon.baseAtk) || "-");
        attack.append(attackLabel, attackValue);
        meta.append(stars, attack);
        copy.appendChild(title);
        copy.appendChild(meta);

        const marker = document.createElement("span");
        marker.className = "loadout-weapon-card-marker";
        if (String(weapon.key) === equippedKey) marker.classList.add("is-equipped");
        marker.textContent = String(weapon.key) === equippedKey ? "Active" : "Equip";

        button.appendChild(copy);
        button.appendChild(marker);
        button.addEventListener("click", () => {
            if (!setEquippedWeaponForOperator(operator.id, weapon.key)) return;
            renderOperatorLoadoutModal();
            refreshOperatorLoadoutSurfaces();
        });
        list.appendChild(button);
    });

    if (compatibleWeapons.length === 0) {
        const empty = document.createElement("p");
        empty.className = "loadout-empty-message";
        empty.textContent = "No compatible weapons are available in the database.";
        list.appendChild(empty);
    }
}

function appendLoadoutDetailRow(container, labelText, valueText, className = "") {
    const row = document.createElement("div");
    row.className = "loadout-detail-row";
    if (className) row.classList.add(...String(className).split(/\s+/).filter(Boolean));
    const label = document.createElement("span");
    label.textContent = labelText;
    const value = document.createElement("strong");
    value.textContent = valueText || "-";
    row.appendChild(label);
    row.appendChild(value);
    container.appendChild(row);
}

function createWeaponPotentialControl(operatorId, activation) {
    const root = document.createElement("div");
    root.className = "loadout-potential-control";
    const copy = document.createElement("div");
    const label = document.createElement("strong");
    label.textContent = "Weapon Potential";
    const hint = document.createElement("span");
    hint.textContent = "Sets the weapon's base activation ranks.";
    copy.append(label, hint);

    const options = document.createElement("div");
    options.className = "loadout-potential-options";
    for (let potential = 1; potential <= MAX_WEAPON_POTENTIAL; potential++) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `P${potential}`;
        button.classList.toggle("active", potential === activation.potential);
        button.setAttribute("aria-pressed", String(potential === activation.potential));
        button.addEventListener("click", () => {
            if (!setWeaponPotentialForOperator(operatorId, potential)) return;
            renderOperatorLoadoutModal();
            refreshOperatorLoadoutSurfaces();
        });
        options.appendChild(button);
    }
    root.append(copy, options);
    return root;
}

function createEssenceActivationControl(operatorId, channel, activation) {
    const state = activation[channel];
    const caps = getWeaponEssenceAllocationCaps(activation.weapon, activation.potential);
    if (!state?.label || !state.maxRank) return null;

    const root = document.createElement("div");
    root.className = "loadout-activation-row";
    const copy = document.createElement("div");
    copy.className = "loadout-activation-copy";
    const label = document.createElement("strong");
    label.textContent = state.label;
    const value = document.createElement("span");
    value.textContent = channel === "skill"
        ? `Rank ${state.rank}/${state.maxRank}`
        : `Rank ${state.rank}/${state.maxRank} / ${formatEssenceProfileValue(state.value, state.isPercent)}`;
    copy.append(label, value);

    const stepper = document.createElement("div");
    stepper.className = "loadout-activation-stepper";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "-";
    decrease.setAttribute("aria-label", `Decrease ${state.label} Essence`);
    decrease.disabled = activation.essence[channel] <= 0;
    const amount = document.createElement("strong");
    amount.textContent = `+${activation.essence[channel]}`;
    amount.title = "Ranks added by infused Essences";
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Increase ${state.label} Essence`);
    increase.disabled = activation.essence[channel] >= caps[channel];

    decrease.addEventListener("click", () => {
        if (!setWeaponEssenceForOperator(operatorId, channel, activation.essence[channel] - 1)) return;
        renderOperatorLoadoutModal();
        refreshOperatorLoadoutSurfaces();
    });
    increase.addEventListener("click", () => {
        if (!setWeaponEssenceForOperator(operatorId, channel, activation.essence[channel] + 1)) return;
        renderOperatorLoadoutModal();
        refreshOperatorLoadoutSurfaces();
    });
    stepper.append(decrease, amount, increase);
    root.append(copy, stepper);
    return root;
}
function renderLoadoutWeaponDetails(operator) {
    const panel = document.getElementById("loadoutWeaponDetails");
    const slotValue = document.getElementById("loadoutWeaponSlotValue");
    const essenceSlotValue = document.getElementById("loadoutEssenceSlotValue");
    if (!panel) return;
    panel.innerHTML = "";

    const weapon = getEquippedWeapon(operator.id);
    const essenceProfile = getWeaponEssenceProfile(weapon);
    const activation = getWeaponActivationState(operator.id);
    if (slotValue) {
        slotValue.textContent = weapon?.name || "Not equipped";
    }
    if (essenceSlotValue) {
        const essenceSlot = essenceSlotValue.closest(".loadout-slot");
        const essenceRanks = getWeaponEssenceRankSummary(activation);
        essenceSlotValue.textContent = !weapon
            ? "Select a weapon"
            : (activation ? `Potential ${activation.potential} / ${essenceRanks.used}/${essenceRanks.max} ranks` : "No essence data");
        essenceSlot?.classList.toggle("active", Boolean(essenceProfile));
        essenceSlot?.classList.toggle("future", !essenceProfile);
        essenceSlot?.setAttribute("aria-disabled", String(!essenceProfile));
    }
    if (!weapon) {
        panel.classList.add("empty");
        panel.appendChild(createLoadoutWeaponIcon("large"));
        const title = document.createElement("strong");
        title.textContent = "No weapon equipped";
        const copy = document.createElement("p");
        copy.textContent = "Choose a compatible weapon for this operator.";
        panel.appendChild(title);
        panel.appendChild(copy);
        return;
    }

    panel.classList.remove("empty");
    const heading = document.createElement("div");
    heading.className = "loadout-detail-heading";
    const heroIdentity = document.createElement("div");
    heroIdentity.className = "loadout-detail-identity";
    heroIdentity.appendChild(createLoadoutWeaponIcon("large", weapon));
    const headingCopy = document.createElement("div");
    const rarity = document.createElement("span");
    rarity.className = "loadout-weapon-rarity is-large";
    rarity.textContent = getWeaponRarityStars(weapon);
    rarity.setAttribute("aria-label", `${Number(weapon.rarity) || "Unknown"} star weapon`);
    const title = document.createElement("h3");
    title.textContent = weapon.name;
    const meta = document.createElement("small");
    meta.textContent = [weapon.mainAttribute, weapon.secondaryAttribute].filter(Boolean).join(" / ") || "Weapon";
    const activeBadge = document.createElement("span");
    activeBadge.className = "loadout-detail-status";
    activeBadge.textContent = "Equipped";
    headingCopy.appendChild(rarity);
    headingCopy.appendChild(title);
    headingCopy.appendChild(meta);
    headingCopy.appendChild(activeBadge);
    heroIdentity.appendChild(headingCopy);
    heading.appendChild(heroIdentity);
    const attackBadge = document.createElement("div");
    attackBadge.className = "loadout-detail-attack-chip";
    const attackLabel = document.createElement("span");
    attackLabel.textContent = "Weapon Base ATK";
    const attackValue = document.createElement("strong");
    attackValue.textContent = Number.isFinite(Number(weapon.baseAtk)) ? String(Number(weapon.baseAtk)) : "-";
    attackBadge.appendChild(attackLabel);
    attackBadge.appendChild(attackValue);
    heading.appendChild(attackBadge);
    panel.appendChild(heading);

    const combatStats = getOperatorSimulationLoadoutStats(operator.id);
    const attackBoost = getActivationAttackBoostSummary(activation);
    const combatSummary = document.createElement("div");
    combatSummary.className = "loadout-combat-summary";
    appendLoadoutDetailRow(combatSummary, "Weapon Base ATK", Number.isFinite(Number(weapon.baseAtk)) ? String(Number(weapon.baseAtk)) : "-", "is-attack");
    appendLoadoutDetailRow(combatSummary, "Essence ATK Boost", formatLoadoutAttackBoost(attackBoost), attackBoost.hasBoost ? "is-attack" : "");
    appendLoadoutDetailRow(
        combatSummary,
        "Simulation ATK",
        combatStats ? formatLoadoutAttackNumber(combatStats.totalAtk) : "Simulation only",
        combatStats ? "is-attack is-total" : ""
    );
    panel.appendChild(combatSummary);
    panel.appendChild(createLoadoutAttackBreakdown(combatStats));

    const stats = document.createElement("div");
    stats.className = "loadout-detail-stats";
    appendLoadoutDetailRow(stats, "Level", Number.isFinite(Number(weapon.baseStatsLevel)) ? String(Number(weapon.baseStatsLevel)) : "-");
    appendLoadoutDetailRow(stats, "Main", weapon.mainAttribute || "-");
    appendLoadoutDetailRow(stats, "Secondary", weapon.secondaryAttribute || "-");
    panel.appendChild(stats);

    if (weapon.passiveName) {
        const passive = document.createElement("div");
        passive.className = "loadout-passive";
        const passiveLabel = document.createElement("span");
        passiveLabel.textContent = "Passive";
        const passiveName = document.createElement("strong");
        passiveName.textContent = weapon.passiveName;
        passive.appendChild(passiveLabel);
        passive.appendChild(passiveName);
        panel.appendChild(passive);
    }

    const essenceSection = document.createElement("div");
    essenceSection.className = `loadout-essence-section${essenceProfile ? "" : " unavailable"}`;
    const essenceHeading = document.createElement("div");
    essenceHeading.className = "loadout-essence-heading";
    const essenceLabel = document.createElement("strong");
    essenceLabel.textContent = "Essence activation profile";
    const essenceHint = document.createElement("span");
    essenceHint.textContent = essenceProfile
        ? "Set the weapon Potential, then distribute the available Essence ranks."
        : "No Essence profile is stored for this weapon yet.";
    essenceHeading.appendChild(essenceLabel);
    essenceHeading.appendChild(essenceHint);
    essenceSection.appendChild(essenceHeading);

    if (activation) {
        const essenceRanks = getWeaponEssenceRankSummary(activation);
        const essenceStatus = document.createElement("div");
        essenceStatus.className = "loadout-essence-status";
        const potentialPill = document.createElement("span");
        potentialPill.textContent = `Potential ${activation.potential}`;
        const ranksPill = document.createElement("span");
        ranksPill.textContent = `${essenceRanks.used}/${essenceRanks.max} Essence ranks used`;
        essenceStatus.append(potentialPill, ranksPill);
        essenceSection.appendChild(essenceStatus);

        essenceSection.appendChild(createWeaponPotentialControl(operator.id, activation));

        const profileGrid = document.createElement("div");
        profileGrid.className = "loadout-essence-profile";
        ESSENCE_CHANNEL_KEYS.forEach(channel => {
            const control = createEssenceActivationControl(operator.id, channel, activation);
            if (control) profileGrid.appendChild(control);
        });
        essenceSection.appendChild(profileGrid);

        if (activation.skill.description) {
            const skillPreview = document.createElement("p");
            skillPreview.className = "loadout-essence-skill-preview";
            skillPreview.textContent = activation.skill.description;
            essenceSection.appendChild(skillPreview);
        }
    } else {
        const essencePlaceholder = document.createElement("div");
        essencePlaceholder.className = "loadout-essence-placeholder";
        const essenceBadge = document.createElement("span");
        essenceBadge.textContent = "Database pending";
        const essenceStatus = document.createElement("strong");
        essenceStatus.textContent = "No Essence profile in database yet";
        const essenceCopy = document.createElement("span");
        essenceCopy.textContent = "Weapon ATK and passive data still apply in Simulation Mode. Essence rank tuning will unlock once a matching weapon_essence_profiles row exists.";
        essencePlaceholder.appendChild(essenceBadge);
        essencePlaceholder.appendChild(essenceStatus);
        essencePlaceholder.appendChild(essenceCopy);
        essenceSection.appendChild(essencePlaceholder);
    }
    panel.appendChild(essenceSection);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "loadout-remove-weapon";
    removeButton.textContent = "Unequip weapon";
    removeButton.addEventListener("click", () => {
        if (!setEquippedWeaponForOperator(operator.id, null)) return;
        renderOperatorLoadoutModal();
        refreshOperatorLoadoutSurfaces();
    });
    panel.appendChild(removeButton);
}

function renderOperatorLoadoutModal() {
    const operator = getWeaponLoadoutOperator(activeLoadoutOperatorId);
    if (!operator) return;
    renderLoadoutOperatorHeader(operator);
    renderLoadoutWeaponList(operator);
    renderLoadoutWeaponDetails(operator);
}

function openOperatorLoadoutModal(operatorId) {
    if (!isWeaponLoadoutSimulationMode()) return false;

    const operator = getWeaponLoadoutOperator(operatorId);
    const modal = document.getElementById("operatorLoadoutModal");
    if (!operator || !modal) return false;

    activeLoadoutOperatorId = Number(operator.id);
    loadoutModalPreviousFocus = document.activeElement;
    renderOperatorLoadoutModal();
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("closeOperatorLoadoutModalBtn")?.focus();
    return true;
}

function closeOperatorLoadoutModal() {
    const modal = document.getElementById("operatorLoadoutModal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    activeLoadoutOperatorId = null;
    if (loadoutModalPreviousFocus && typeof loadoutModalPreviousFocus.focus === "function") {
        loadoutModalPreviousFocus.focus();
    }
    loadoutModalPreviousFocus = null;
}

function initOperatorLoadoutModal() {
    const modal = document.getElementById("operatorLoadoutModal");
    const closeButton = document.getElementById("closeOperatorLoadoutModalBtn");
    if (!modal || modal.dataset.initialized === "true") return;

    modal.dataset.initialized = "true";
    observeOperatorLoadoutControls();
    closeButton?.addEventListener("click", closeOperatorLoadoutModal);
    modal.addEventListener("click", event => {
        if (event.target === modal) closeOperatorLoadoutModal();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal.classList.contains("open")) {
            closeOperatorLoadoutModal();
        }
    });
}

window.getOperatorSimulationLoadoutStats = getOperatorSimulationLoadoutStats;
window.openOperatorLoadoutModal = openOperatorLoadoutModal;
window.closeOperatorLoadoutModal = closeOperatorLoadoutModal;
