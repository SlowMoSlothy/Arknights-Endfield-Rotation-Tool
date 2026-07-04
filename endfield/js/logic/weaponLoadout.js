const OPERATOR_LOADOUT_STORAGE_KEY = "operatorLoadouts";
const LEGACY_WEAPON_LOADOUT_STORAGE_KEY = "operatorWeaponLoadouts";
const DEFAULT_WEAPON_POTENTIAL = 1;
const MAX_WEAPON_POTENTIAL = 5;
const ESSENCE_CHANNEL_KEYS = ["primary", "secondary", "skill"];
const LOADOUT_SLOT_KEYS = ["weapon", "gloves", "armor", "kit1", "kit2"];

let activeLoadoutOperatorId = null;
let loadoutModalPreviousFocus = null;
let loadoutControlObserver = null;
let activeLoadoutSlot = "weapon";

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
    let mainAttributePercentBonus = 0;
    let mainAttributeBonus = null;
    let strengthBonus = 0;
    let agilityBonus = 0;
    let intellectBonus = 0;
    let willBonus = 0;
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

        if (labelKey.includes("strength")) {
            strengthBonus += value;
            return;
        }

        if (labelKey.includes("agility")) {
            agilityBonus += value;
            return;
        }

        if (labelKey.includes("intellect")) {
            intellectBonus += value;
            return;
        }

        if (labelKey.includes("will")) {
            willBonus += value;
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

    // Retrieve and process gear stats
    const equippedGloves = loadout.gloves ? getGearByKey(loadout.gloves.key, "gloves") : null;
    const equippedArmor = loadout.armor ? getGearByKey(loadout.armor.key, "armor") : null;
    const equippedKit1 = loadout.kit1 ? getGearByKey(loadout.kit1.key, "kits") : null;
    const equippedKit2 = loadout.kit2 ? getGearByKey(loadout.kit2.key, "kits") : null;

    const equippedSets = {};
    const equippedGearItems = [equippedGloves, equippedArmor, equippedKit1, equippedKit2].filter(Boolean);

    equippedGearItems.forEach(gear => {
        if (gear.setKey) {
            equippedSets[gear.setKey] = (equippedSets[gear.setKey] || 0) + 1;
        }

        const addStat = (statName, statValue) => {
            const labelKey = String(statName || "").toLowerCase().replace(/[^a-z0-9%]/g, "");
            const val = Number(statValue);
            if (!labelKey || !Number.isFinite(val)) return;

            if (labelKey.includes("flatatk")) {
                flatAtkBonus += val;
            } else if (labelKey.includes("atkbonus%") || labelKey.includes("atk%")) {
                atkPercentBonus += val;
            } else if (labelKey.includes("critrate")) {
                critRateBonusPercent += val;
            } else if (labelKey.includes("critdmg") || labelKey.includes("critdamage")) {
                critDamageBonusPercent += val;
            } else if (labelKey.includes("alldmg") || labelKey.includes("alldamage")) {
                allDamageBonusPercent += val;
            } else if (labelKey.includes("artsdmg") || labelKey.includes("artsdamage")) {
                artsDamageBonusPercent += val;
            } else if (labelKey.includes("strength")) {
                strengthBonus += val;
            } else if (labelKey.includes("agility")) {
                agilityBonus += val;
            } else if (labelKey.includes("intellect")) {
                intellectBonus += val;
            } else if (labelKey.includes("will")) {
                willBonus += val;
            } else if (labelKey.includes("mainattribute%")) {
                mainAttributePercentBonus += val;
            } else {
                Object.keys(elementDamageBonuses).forEach(element => {
                    if (labelKey.includes(element)) {
                        elementDamageBonuses[element] += val;
                    }
                });
            }
        };

        if (gear.mainStat && gear.mainValue) {
            addStat(gear.mainStat, gear.mainValue);
        }
        if (gear.secStat && gear.secValue) {
            addStat(gear.secStat, gear.secValue);
        }
        if (gear.subStat && gear.subValue) {
            addStat(gear.subStat, gear.subValue);
        }
    });

    // Apply set bonuses (3 pieces required)
    Object.entries(equippedSets).forEach(([setKey, count]) => {
        if (count >= 3) {
            switch (setKey) {
                case "bonekrusha":
                    atkPercentBonus += 15;
                    skillDamageBonuses["battle"] = (skillDamageBonuses["battle"] || 0) + 30;
                    break;
                case "frontiers":
                    allDamageBonusPercent += 16;
                    break;
                case "grizzled_edge":
                case "swordmancer":
                    atkPercentBonus += 8;
                    elementDamageBonuses.physical += 24;
                    break;
                case "eternal_xiranite":
                    allDamageBonusPercent += 16;
                    break;
                case "hot_work":
                    intellectBonus += 30;
                    elementDamageBonuses.heat += 60;
                    elementDamageBonuses.nature += 60;
                    break;
                case "xiranflow":
                case "mordvolt_insulation":
                    intellectBonus += 50;
                    artsDamageBonusPercent += 20;
                    break;
                case "lynx":
                    break;
                case "mi_security":
                    critRateBonusPercent += 10;
                    atkPercentBonus += 25;
                    break;
                case "tide_surge":
                    skillDamageBonuses["skill"] = (skillDamageBonuses["skill"] || 0) + 20;
                    artsDamageBonusPercent += 35;
                    break;
                case "aethertech":
                    atkPercentBonus += 8;
                    elementDamageBonuses.physical += 24;
                    break;
                case "qingbo":
                    skillDamageBonuses["skill"] = (skillDamageBonuses["skill"] || 0) + 40;
                    break;
                case "pulser_labs":
                    intellectBonus += 30;
                    elementDamageBonuses.electric += 50;
                    elementDamageBonuses.cryo += 50;
                    break;
                case "type_50":
                case "type_50_yinglung":
                    atkPercentBonus += 15;
                    skillDamageBonuses["combo"] = (skillDamageBonuses["combo"] || 0) + 60;
                    break;
                case "armored_msgr":
                    strengthBonus += 50;
                    break;
                case "roving_msgr":
                    agilityBonus += 50;
                    elementDamageBonuses.physical += 20;
                    break;
                case "mordvolt_resistant":
                    willBonus += 50;
                    break;
                case "aburrey_legacy":
                    skillDamageBonuses["skill"] = (skillDamageBonuses["skill"] || 0) + 24;
                    atkPercentBonus += 15;
                    break;
                case "catastrophe":
                    break;
                case "aic_light":
                case "aic_heavy":
                    break;
            }
        }
    });

    // Calculate final attributes and ATK scaling
    const statsLevel90 = operator.stats?.level90 || {};
    let strength = (Number(statsLevel90.strength) || 0) + strengthBonus;
    let agility = (Number(statsLevel90.agility) || 0) + agilityBonus;
    let intellect = (Number(statsLevel90.intellect) || 0) + intellectBonus;
    let will = (Number(statsLevel90.will) || 0) + willBonus;

    // Apply Main Attribute % bonus from gear if present
    if (operatorMainAttribute && mainAttributePercentBonus > 0) {
        const mainAttrKey = operatorMainAttribute.toLowerCase();
        const baseVal = Number(statsLevel90[mainAttrKey]) || 0;
        const pctBonus = baseVal * (mainAttributePercentBonus / 100);
        if (mainAttrKey === "strength") strength += pctBonus;
        else if (mainAttrKey === "agility") agility += pctBonus;
        else if (mainAttrKey === "intellect") intellect += pctBonus;
        else if (mainAttrKey === "will") will += pctBonus;
    }

    let attributeBonus = 1.0;
    if (operatorMainAttribute && operator.secondaryAttribute) {
        const mainAttrKey = operatorMainAttribute.toLowerCase();
        const secAttrKey = String(operator.secondaryAttribute || "").trim().toLowerCase();

        let mainVal = 0;
        if (mainAttrKey === "strength") mainVal = strength;
        else if (mainAttrKey === "agility") mainVal = agility;
        else if (mainAttrKey === "intellect") mainVal = intellect;
        else if (mainAttrKey === "will") mainVal = will;

        let secVal = 0;
        if (secAttrKey === "strength") secVal = strength;
        else if (secAttrKey === "agility") secVal = agility;
        else if (secAttrKey === "intellect") secVal = intellect;
        else if (secAttrKey === "will") secVal = will;

        if (mainVal > 0 || secVal > 0) {
            attributeBonus = 1 + (0.005 * mainVal) + (0.002 * secVal);
        }
    }

    if (operatorMainAttribute) {
        let gearMainAttrBonus = 0;
        const mainAttrKey = operatorMainAttribute.toLowerCase();
        if (mainAttrKey === "strength") gearMainAttrBonus = strengthBonus;
        else if (mainAttrKey === "agility") gearMainAttrBonus = agilityBonus;
        else if (mainAttrKey === "intellect") gearMainAttrBonus = intellectBonus;
        else if (mainAttrKey === "will") gearMainAttrBonus = willBonus;

        if (gearMainAttrBonus > 0 || mainAttributePercentBonus > 0) {
            if (mainAttributeBonus) {
                if (mainAttributePercentBonus > 0) {
                    mainAttributeBonus.value += mainAttributePercentBonus;
                    mainAttributeBonus.isPercent = true;
                } else {
                    mainAttributeBonus.value += gearMainAttrBonus;
                }
            } else {
                mainAttributeBonus = {
                    label: operatorMainAttribute,
                    value: mainAttributePercentBonus > 0 ? mainAttributePercentBonus : gearMainAttrBonus,
                    isPercent: mainAttributePercentBonus > 0
                };
            }
        }
    }

    const attackBeforePercent = operatorBaseAtk + weaponBaseAtk + flatAtkBonus;
    const totalAtk = Math.round(attackBeforePercent * (1 + atkPercentBonus / 100) * attributeBonus * 10) / 10;
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
        attributeBonus,
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
        gearStats: {
            equippedSets
        },
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
        const attrMultiplier = Number(combatStats.attributeBonus) || 1.0;
        const attrPart = attrMultiplier > 1.0
            ? ` x ${formatLoadoutAttackNumber(attrMultiplier)}`
            : "";
        formula.textContent = `${formatLoadoutAttackNumber(combatStats.attackBeforePercent)}${percentPart}${attrPart} = ${formatLoadoutAttackNumber(combatStats.totalAtk)}`;
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
        if (combatStats.attributeBonus && combatStats.attributeBonus > 1.0) {
            addRow("Attribute multiplier", `x ${formatLoadoutAttackNumber(combatStats.attributeBonus)}`);
        }
        addRow("Simulation ATK", formatLoadoutAttackNumber(combatStats.totalAtk), "is-total");
    } else {
        addRow("Mode", "Switch to Simulation");
        addRow("Weapon Base ATK", "Still fixed");
        addRow("Potential", "Affects activation ranks");
    }

    root.appendChild(rows);
    return root;
}

function appendCombatAttributesSection(panel, combatStats) {
    if (!combatStats) return;

    const critSection = document.createElement("div");
    critSection.className = "loadout-essence-section";
    const heading = document.createElement("div");
    heading.className = "loadout-essence-heading";
    const label = document.createElement("strong");
    label.textContent = "Combat Attributes";
    heading.appendChild(label);
    critSection.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "loadout-detail-stats";
    appendLoadoutDetailRow(grid, "Crit Rate", `${formatLoadoutAttackNumber(combatStats.critRatePercent)}%`);
    appendLoadoutDetailRow(grid, "Crit DMG", `+${formatLoadoutAttackNumber(combatStats.critDamagePercent)}%`);

    Object.entries(combatStats.elementDamageBonuses).forEach(([el, val]) => {
        if (val > 0) {
            const elName = el.charAt(0).toUpperCase() + el.slice(1);
            appendLoadoutDetailRow(grid, `${elName} DMG`, `+${formatLoadoutAttackNumber(val)}%`);
        }
    });
    if (combatStats.artsDamageBonusPercent > 0) {
        appendLoadoutDetailRow(grid, "Arts DMG", `+${formatLoadoutAttackNumber(combatStats.artsDamageBonusPercent)}%`);
    }
    if (combatStats.allDamageBonusPercent > 0) {
        appendLoadoutDetailRow(grid, "All DMG Boost", `+${formatLoadoutAttackNumber(combatStats.allDamageBonusPercent)}%`);
    }

    critSection.appendChild(grid);
    panel.appendChild(critSection);
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

function normalizeGearLoadoutEntry(value, category) {
    if (!value || typeof value !== "object") return null;
    const key = value.key;
    if (!key) return null;
    const gear = getGearByKey(key, category);
    if (!gear) return null;
    return { key: String(gear.key) };
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

        normalized[String(operator.id)] = {
            weapon: weapon || null,
            gloves: normalizeGearLoadoutEntry(rawLoadout?.gloves, "gloves"),
            armor: normalizeGearLoadoutEntry(rawLoadout?.armor, "armor"),
            kit1: normalizeGearLoadoutEntry(rawLoadout?.kit1, "kits"),
            kit2: normalizeGearLoadoutEntry(rawLoadout?.kit2, "kits")
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

    const current = getOperatorLoadout(operator.id);
    const keepCurrent = current.weapon?.key === String(weapon.key);
    const potential = keepCurrent
        ? normalizeWeaponPotential(current.weapon.potential)
        : DEFAULT_WEAPON_POTENTIAL;
    operatorLoadouts[String(operator.id)] = {
        ...current,
        weapon: {
            key: String(weapon.key),
            potential,
            essence: keepCurrent
                ? normalizeWeaponEssenceAllocation(current.weapon.essence, weapon, potential)
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

function setEquippedGearForOperator(operatorId, slot, gearKey) {
    if (!isWeaponLoadoutSimulationMode()) return false;
    const operator = getWeaponLoadoutOperator(operatorId);
    if (!operator) return false;

    const slots = ["gloves", "armor", "kit1", "kit2"];
    if (!slots.includes(slot)) return false;

    const current = getOperatorLoadout(operator.id);
    const key = gearKey ? String(gearKey).trim() : null;

    operatorLoadouts[String(operator.id)] = {
        ...current,
        [slot]: key ? { key } : null
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

function createLoadoutGearIcon(className = "", gear = null, slotType = "") {
    const icon = document.createElement("span");
    icon.className = `loadout-weapon-icon ${className}`.trim();
    icon.setAttribute("aria-hidden", "true");

    const category = slotType === "kit1" || slotType === "kit2" ? "kit" : slotType;
    if (category && !gear) {
        icon.style.backgroundImage = `url('assets/gear/${category}.png')`;
        icon.style.backgroundSize = "cover";
        icon.style.backgroundPosition = "center";
    }

    const iconPath = gear?.icon || (gear?.key ? `assets/gear/${gear.key}.png` : null);
    if (iconPath) {
        const image = document.createElement("img");
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        icon.classList.add("has-image");
        image.addEventListener("error", () => {
            image.remove();
            icon.classList.remove("has-image");
            if (category) {
                icon.style.backgroundImage = `url('assets/gear/${category}.png')`;
                icon.style.backgroundSize = "cover";
                icon.style.backgroundPosition = "center";
            }
        });
        image.src = iconPath;
        icon.prepend(image);
    }
    return icon;
}

function updateSlotIcon(slotName, imageUrl, defaultText) {
    const slotEl = document.getElementById("loadoutSlot" + slotName.charAt(0).toUpperCase() + slotName.slice(1));
    if (!slotEl) return;
    const iconEl = slotEl.querySelector(".loadout-slot-icon");
    if (!iconEl) return;

    if (imageUrl) {
        iconEl.innerHTML = `<img src="${imageUrl}" alt="" onerror="this.style.display='none'; const p=this.parentElement; p.classList.remove('has-image'); p.style.backgroundImage=''; p.style.color=''; p.innerHTML='${defaultText}';" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block;" />`;
        iconEl.classList.add("has-image");
        iconEl.style.backgroundImage = "none";
        iconEl.style.color = "transparent";
    } else {
        iconEl.innerHTML = defaultText;
        iconEl.classList.remove("has-image");
        iconEl.style.backgroundImage = "";
        iconEl.style.color = "";
    }
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
    const attrsEl = document.getElementById("loadoutOperatorAttributes");
    const simAtkEl = document.getElementById("loadoutOperatorSimulationAtkValue");

    if (avatar) {
        avatar.src = operator.icon || "";
        avatar.alt = operator.name || "Operator";
    }
    if (name) name.textContent = operator.name || "Operator";
    if (meta) meta.textContent = `${operator.operatorClass || "Operator"} / ${String(operator.weaponType || "Weapon").replace(/_/g, " ")}`;

    if (attrsEl) {
        attrsEl.innerHTML = "";
        const formatAttr = attr => {
            const a = String(attr || "").trim().toLowerCase();
            if (a.startsWith("strength")) return "STR";
            if (a.startsWith("agility")) return "AGI";
            if (a.startsWith("intellect")) return "INT";
            if (a.startsWith("will")) return "WILL";
            return a.toUpperCase();
        };

        if (operator.mainAttribute) {
            const mainChip = document.createElement("span");
            mainChip.className = "loadout-weapon-atk-badge";
            mainChip.style.borderColor = "rgba(248, 245, 70, 0.45)";
            const label = document.createElement("small");
            label.textContent = "MAIN";
            const val = document.createElement("strong");
            val.textContent = formatAttr(operator.mainAttribute);
            mainChip.append(label, val);
            attrsEl.appendChild(mainChip);
        }
        if (operator.secondaryAttribute) {
            const secChip = document.createElement("span");
            secChip.className = "loadout-weapon-atk-badge";
            const label = document.createElement("small");
            label.textContent = "SEC";
            const val = document.createElement("strong");
            val.textContent = formatAttr(operator.secondaryAttribute);
            secChip.append(label, val);
            attrsEl.appendChild(secChip);
        }
    }

    if (simAtkEl) {
        const stats = getOperatorSimulationLoadoutStats(operator.id);
        simAtkEl.textContent = stats ? formatLoadoutAttackNumber(stats.totalAtk) : "-";
    }
}

function renderLoadoutWeaponList(operator) {
    const list = document.getElementById("loadoutWeaponList");
    const browserTitle = document.getElementById("loadoutWeaponsTitle");
    if (!list) return;
    list.innerHTML = "";

    if (activeLoadoutSlot === "weapon") {
        if (browserTitle) browserTitle.textContent = "Weapons";
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
            
            const stars = document.createElement("span");
            stars.className = "loadout-weapon-rarity";
            stars.textContent = getWeaponRarityStars(weapon);
            stars.setAttribute("aria-label", `${Number(weapon.rarity) || "Unknown"} star weapon`);

            const meta = document.createElement("span");
            meta.className = "loadout-weapon-card-meta";
            const attack = document.createElement("span");
            attack.className = "loadout-weapon-atk-badge";
            const attackLabel = document.createElement("small");
            attackLabel.textContent = "ATK";
            const attackValue = document.createElement("strong");
            attackValue.textContent = String(Number(weapon.baseAtk) || "-");
            attack.append(attackLabel, attackValue);
            meta.append(attack);

            copy.appendChild(title);
            copy.appendChild(stars);
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
    } else {
        const category = (activeLoadoutSlot === "kit1" || activeLoadoutSlot === "kit2") ? "kits" : activeLoadoutSlot;
        const gearList = GEAR_DATABASE[category] || [];

        if (browserTitle) {
            browserTitle.textContent = activeLoadoutSlot === "gloves" ? "Gloves" :
                                       activeLoadoutSlot === "armor" ? "Armor" : "Kits";
        }

        const equippedGear = getOperatorLoadout(operator.id)[activeLoadoutSlot];
        const equippedKey = equippedGear?.key || null;

        const operatorMain = String(operator.mainAttribute || "").trim().toLowerCase();
        const operatorSec = String(operator.secondaryAttribute || "").trim().toLowerCase();

        // Sort gearList so synergistic items (matching BOTH operator stats in order) come first!
        const sortedGearList = [...gearList].sort((a, b) => {
            const getScore = (gear) => {
                const main = String(gear.mainStat || "").trim().toLowerCase();
                const sec = String(gear.secStat || "").trim().toLowerCase();
                
                if (main === operatorMain && sec === operatorSec) return 1;
                return 0;
            };
            return getScore(b) - getScore(a);
        });

        sortedGearList.forEach(gear => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "loadout-weapon-card";
            button.classList.toggle("selected", String(gear.key) === equippedKey);
            button.setAttribute("aria-pressed", String(String(gear.key) === equippedKey));
            button.setAttribute("aria-label", `Equip ${gear.name}`);

            const icon = createLoadoutGearIcon("compact", gear, activeLoadoutSlot);
            button.appendChild(icon);

            const matchesMainPosition = gear.mainStat && 
                String(gear.mainStat).trim().toLowerCase() === operatorMain;

            const matchesSecPosition = gear.secStat && 
                String(gear.secStat).trim().toLowerCase() === operatorSec;

            const isPerfectMatch = matchesMainPosition && matchesSecPosition;

            if (isPerfectMatch) {
                button.classList.add("synergistic", "synergistic-best");
            }

            const copy = document.createElement("span");
            copy.className = "loadout-weapon-card-copy";

            if (isPerfectMatch) {
                const badge = document.createElement("span");
                badge.className = "loadout-gear-recommendation-badge";
                badge.textContent = "✦ Synergy";
                copy.appendChild(badge);
            }

            const title = document.createElement("strong");
            title.textContent = gear.name;
            
            const stars = document.createElement("span");
            stars.className = "loadout-weapon-rarity";
            stars.textContent = "★".repeat(gear.rarity);
            stars.setAttribute("aria-label", `${gear.rarity} star gear`);

            const meta = document.createElement("span");
            meta.className = "loadout-weapon-card-meta";

            const formatAttr = attr => {
                const a = String(attr || "").trim().toLowerCase();
                if (a.startsWith("strength")) return "STR";
                if (a.startsWith("agility")) return "AGI";
                if (a.startsWith("intellect")) return "INT";
                if (a.startsWith("will")) return "WILL";
                return a.toUpperCase();
            };

            const mainStatBadge = document.createElement("span");
            mainStatBadge.className = "loadout-weapon-atk-badge";
            if (matchesMainPosition) {
                mainStatBadge.style.borderColor = "rgba(248, 245, 70, 0.65)";
                mainStatBadge.style.color = "#F8F546";
            }
            const statLabel = document.createElement("small");
            statLabel.textContent = formatAttr(gear.mainStat);
            const statValue = document.createElement("strong");
            statValue.textContent = `+${gear.mainValue}`;
            mainStatBadge.append(statLabel, statValue);

            meta.append(mainStatBadge);

            if (gear.secStat) {
                const secStatBadge = document.createElement("span");
                secStatBadge.className = "loadout-weapon-atk-badge";
                if (matchesSecPosition) {
                    secStatBadge.style.borderColor = "rgba(248, 245, 70, 0.65)";
                    secStatBadge.style.color = "#F8F546";
                }
                const label = document.createElement("small");
                label.textContent = formatAttr(gear.secStat);
                const val = document.createElement("strong");
                val.textContent = `+${gear.secValue}`;
                secStatBadge.append(label, val);
                meta.append(secStatBadge);
            }
            copy.appendChild(title);
            copy.appendChild(stars);
            copy.appendChild(meta);

            const marker = document.createElement("span");
            marker.className = "loadout-weapon-card-marker";
            if (String(gear.key) === equippedKey) marker.classList.add("is-equipped");
            marker.textContent = String(gear.key) === equippedKey ? "Active" : "Equip";

            button.appendChild(copy);
            button.appendChild(marker);
            button.addEventListener("click", () => {
                if (!setEquippedGearForOperator(operator.id, activeLoadoutSlot, gear.key)) return;
                renderOperatorLoadoutModal();
                refreshOperatorLoadoutSurfaces();
            });
            list.appendChild(button);
        });

        if (gearList.length === 0) {
            const empty = document.createElement("p");
            empty.className = "loadout-empty-message";
            empty.textContent = `No gear is available for ${category} in the database.`;
            list.appendChild(empty);
        }
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
    const currentLoadout = getOperatorLoadout(operator.id);

    // Update slot values in modal
    if (slotValue) {
        slotValue.textContent = weapon?.name || "Not equipped";
    }
    updateSlotIcon("weapon", weapon?.icon || null, "W");

    if (essenceSlotValue) {
        const essenceSlot = essenceSlotValue.closest(".loadout-slot");
        const essenceRanks = getWeaponEssenceRankSummary(activation);
        essenceSlotValue.textContent = !weapon
            ? "Select a weapon"
            : (activation ? `Potential ${activation.potential} / ${essenceRanks.used}/${essenceRanks.max} ranks` : "No essence data");
        essenceSlot?.classList.toggle("active", Boolean(essenceProfile) && activeLoadoutSlot === "weapon");
        essenceSlot?.classList.toggle("future", !essenceProfile);
        essenceSlot?.classList.toggle("active-essence", Boolean(essenceProfile));
        essenceSlot?.setAttribute("aria-disabled", String(!essenceProfile));
    }

    const glovesVal = document.getElementById("loadoutGlovesSlotValue");
    const equippedGloves = currentLoadout.gloves ? getGearByKey(currentLoadout.gloves.key, "gloves") : null;
    if (glovesVal) glovesVal.textContent = equippedGloves ? equippedGloves.name : "Not equipped";
    updateSlotIcon("gloves", equippedGloves ? (equippedGloves.icon || `assets/gear/${equippedGloves.key}.png`) : null, "G");

    const armorVal = document.getElementById("loadoutArmorSlotValue");
    const equippedArmor = currentLoadout.armor ? getGearByKey(currentLoadout.armor.key, "armor") : null;
    if (armorVal) armorVal.textContent = equippedArmor ? equippedArmor.name : "Not equipped";
    updateSlotIcon("armor", equippedArmor ? (equippedArmor.icon || `assets/gear/${equippedArmor.key}.png`) : null, "A");

    const kit1Val = document.getElementById("loadoutKit1SlotValue");
    const equippedKit1 = currentLoadout.kit1 ? getGearByKey(currentLoadout.kit1.key, "kits") : null;
    if (kit1Val) kit1Val.textContent = equippedKit1 ? equippedKit1.name : "Not equipped";
    updateSlotIcon("kit1", equippedKit1 ? (equippedKit1.icon || `assets/gear/${equippedKit1.key}.png`) : null, "K");

    const kit2Val = document.getElementById("loadoutKit2SlotValue");
    const equippedKit2 = currentLoadout.kit2 ? getGearByKey(currentLoadout.kit2.key, "kits") : null;
    if (kit2Val) kit2Val.textContent = equippedKit2 ? equippedKit2.name : "Not equipped";
    updateSlotIcon("kit2", equippedKit2 ? (equippedKit2.icon || `assets/gear/${equippedKit2.key}.png`) : null, "K");

    // Toggle active status classes on slot DOM elements
    const slots = ["weapon", "gloves", "armor", "kit1", "kit2"];
    slots.forEach(slot => {
        const slotEl = document.getElementById("loadoutSlot" + slot.charAt(0).toUpperCase() + slot.slice(1));
        if (slotEl) {
            slotEl.classList.toggle("active", activeLoadoutSlot === slot);
        }
    });

    const activeSlot = activeLoadoutSlot;
    if (activeSlot !== "weapon") {
        const equippedGear = currentLoadout[activeSlot];
        const gearCategory = (activeSlot === "kit1" || activeSlot === "kit2") ? "kits" : activeSlot;
        const gear = equippedGear ? getGearByKey(equippedGear.key, gearCategory) : null;
        const combatStats = getOperatorSimulationLoadoutStats(operator.id);

        if (!gear) {
            panel.classList.add("empty");
            const icon = createLoadoutGearIcon("large", null, activeSlot);
            icon.style.opacity = "0.22";
            icon.style.width = "72px";
            icon.style.height = "72px";
            icon.style.margin = "0 auto 14px";
            panel.appendChild(icon);

            const title = document.createElement("strong");
            title.textContent = activeSlot === "gloves" ? "No Gloves equipped" :
                                activeSlot === "armor" ? "No Armor equipped" :
                                activeSlot.startsWith("kit") ? `No Kit ${activeSlot.slice(3)} equipped` :
                                `No ${activeSlot} equipped`;
            const copy = document.createElement("p");
            copy.textContent = activeSlot === "gloves" ? "Choose Gloves for this operator." :
                               activeSlot === "armor" ? "Choose Armor for this operator." :
                               activeSlot.startsWith("kit") ? `Choose Kit ${activeSlot.slice(3)} for this operator.` :
                               `Choose ${activeSlot} for this operator.`;
            panel.appendChild(title);
            panel.appendChild(copy);

            if (combatStats) {
                panel.appendChild(createLoadoutAttackBreakdown(combatStats));
                appendCombatAttributesSection(panel, combatStats);
            }
            return;
        }

        panel.classList.remove("empty");
        const heading = document.createElement("div");
        heading.className = "loadout-detail-heading";
        const heroIdentity = document.createElement("div");
        heroIdentity.className = "loadout-detail-identity";

        const icon = createLoadoutGearIcon("large", gear, activeSlot);
        heroIdentity.appendChild(icon);

        const headingCopy = document.createElement("div");
        headingCopy.className = "loadout-detail-heading-copy";
        const rarity = document.createElement("span");
        rarity.className = "loadout-weapon-rarity is-large";
        rarity.textContent = "★".repeat(gear.rarity);
        rarity.setAttribute("aria-label", `${gear.rarity} star gear`);

        const title = document.createElement("h3");
        title.textContent = gear.name;
        
        const meta = document.createElement("small");
        const setBonus = SET_BONUS_DATABASE[gear.setKey];
        meta.textContent = setBonus ? `Set: ${setBonus.name}` : "Gear";

        const activeBadge = document.createElement("span");
        activeBadge.className = "loadout-detail-status";
        activeBadge.textContent = "Equipped";

        headingCopy.appendChild(title);
        headingCopy.appendChild(rarity);
        headingCopy.appendChild(meta);
        headingCopy.appendChild(activeBadge);
        heroIdentity.appendChild(headingCopy);
        heading.appendChild(heroIdentity);

        const mainStatChip = document.createElement("div");
        mainStatChip.className = "loadout-detail-attack-chip";
        const mainStatLabel = document.createElement("span");
        mainStatLabel.textContent = gear.mainStat;
        const mainStatValue = document.createElement("strong");
        mainStatValue.textContent = `+${gear.mainValue}`;
        mainStatChip.appendChild(mainStatLabel);
        mainStatChip.appendChild(mainStatValue);
        heading.appendChild(mainStatChip);
        panel.appendChild(heading);

        const statsSummary = document.createElement("div");
        statsSummary.className = "loadout-combat-summary";
        appendLoadoutDetailRow(statsSummary, "Main Attribute", `${gear.mainStat}: +${gear.mainValue}`);
        if (gear.secStat) {
            appendLoadoutDetailRow(statsSummary, "Secondary Attribute", `${gear.secStat}: +${gear.secValue}`);
        }
        const subStatValueDisplay = String(gear.subStat).includes("%") ? `+${gear.subValue}%` : `+${gear.subValue}`;
        appendLoadoutDetailRow(statsSummary, "Sub Stat", `${gear.subStat}: ${subStatValueDisplay}`);
        if (gear.defValue) {
            appendLoadoutDetailRow(statsSummary, "Defense", `+${gear.defValue}`);
        }

        if (setBonus) {
            const count = combatStats?.gearStats?.equippedSets?.[gear.setKey] || 0;
            appendLoadoutDetailRow(statsSummary, "Set Pieces Equipped", `${count} / 3 equipped`, count >= 3 ? "is-attack" : "");
        }
        panel.appendChild(statsSummary);

        if (setBonus) {
            const setSection = document.createElement("div");
            setSection.className = "loadout-essence-section";
            const setHeading = document.createElement("div");
            setHeading.className = "loadout-essence-heading";
            const setLabel = document.createElement("strong");
            setLabel.textContent = setBonus.name;
            const count = combatStats?.gearStats?.equippedSets?.[gear.setKey] || 0;
            const setHint = document.createElement("span");
            setHint.textContent = count >= 3 
                ? "Active: " + setBonus.description 
                : "Inactive (requires 3 pieces): " + setBonus.description;
            if (count >= 3) {
                setHint.style.color = "#F8F546";
            }
            setHeading.appendChild(setLabel);
            setHeading.appendChild(setHint);
            setSection.appendChild(setHeading);
            panel.appendChild(setSection);
        }

        if (combatStats) {
            panel.appendChild(createLoadoutAttackBreakdown(combatStats));
            appendCombatAttributesSection(panel, combatStats);
        }

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "loadout-remove-weapon";
        removeButton.textContent = `Unequip ${activeSlot.replace("kit", "Kit ")}`;
        removeButton.addEventListener("click", () => {
            if (!setEquippedGearForOperator(operator.id, activeSlot, null)) return;
            renderOperatorLoadoutModal();
            refreshOperatorLoadoutSurfaces();
        });
        panel.appendChild(removeButton);
        return;
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
    appendCombatAttributesSection(panel, combatStats);

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
    activeLoadoutSlot = "weapon";
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

    const slots = ["weapon", "gloves", "armor", "kit1", "kit2"];
    slots.forEach(slot => {
        const slotEl = document.getElementById("loadoutSlot" + slot.charAt(0).toUpperCase() + slot.slice(1));
        if (slotEl) {
            slotEl.addEventListener("click", () => {
                activeLoadoutSlot = slot;
                renderOperatorLoadoutModal();
            });
        }
    });
}

window.getOperatorSimulationLoadoutStats = getOperatorSimulationLoadoutStats;
window.openOperatorLoadoutModal = openOperatorLoadoutModal;
window.closeOperatorLoadoutModal = closeOperatorLoadoutModal;
window.setEquippedGearForOperator = setEquippedGearForOperator;
