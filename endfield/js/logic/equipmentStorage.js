const OPERATOR_EQUIPMENT_STORAGE_KEY = "operatorEquipmentSets";

let operatorEquipmentSets = {};

function createEmptyGearPiece() {
    return {
        pieceId: "",
        name: "",
        setName: "",
        rarity: "",
        mainStat: "",
        subStats: "",
        refinementMain: "",
        refinementSecond: "",
        refinementSpecial: "",
        notes: ""
    };
}

function createEmptyOperatorEquipmentSet() {
    return {
        operator: {
            level: 90
        },
        weapon: {
            weaponId: "",
            customName: "",
            level: "",
            essencePrimary: "",
            essenceSecondary: "",
            essenceSkill: "",
            notes: ""
        },
        stats: {
            mainStat: "",
            subStats: ""
        },
        gear: {
            armor: createEmptyGearPiece(),
            gloves: createEmptyGearPiece(),
            kit1: createEmptyGearPiece(),
            kit2: createEmptyGearPiece()
        }
    };
}

function normalizeGearPiece(piece) {
    return {
        ...createEmptyGearPiece(),
        ...(piece && typeof piece === "object" ? piece : {})
    };
}

function migrateLegacyGear(source) {
    const armor = source.armor && typeof source.armor === "object" ? source.armor : {};

    return {
        armor: {
            ...createEmptyGearPiece(),
            name: armor.chest || armor.head || "",
            setName: armor.setName || "",
            mainStat: armor.mainStat || "",
            notes: armor.notes || ""
        },
        gloves: {
            ...createEmptyGearPiece(),
            name: armor.hands || "",
            mainStat: armor.mainStat || "",
            notes: armor.notes || ""
        },
        kit1: {
            ...createEmptyGearPiece(),
            name: armor.legs || "",
            mainStat: armor.mainStat || ""
        },
        kit2: createEmptyGearPiece()
    };
}

function normalizeEquipmentWeapon(weapon) {
    const source = weapon && typeof weapon === "object" ? weapon : {};
    return {
        weaponId: source.weaponId || source.id || "",
        customName: source.customName || source.name || "",
        level: source.level || "",
        essencePrimary: source.essencePrimary || source.essence?.primary || "",
        essenceSecondary: source.essenceSecondary || source.essence?.secondary || "",
        essenceSkill: source.essenceSkill || source.essence?.skill || "",
        notes: source.notes || ""
    };
}

function normalizeEquipmentOperator(operator, source) {
    const operatorSource = operator && typeof operator === "object" ? operator : {};
    const rawLevel = Number(operatorSource.level ?? source?.operatorLevel ?? 90);
    const level = Number.isFinite(rawLevel) ? Math.max(1, Math.min(90, Math.round(rawLevel))) : 90;

    return { level };
}

function normalizeEquipmentStats(stats, source) {
    const statSource = stats && typeof stats === "object" ? stats : {};
    return {
        mainStat: statSource.mainStat || source?.weapon?.mainStat || source?.armor?.mainStat || "",
        subStats: statSource.subStats || ""
    };
}

function normalizeEquipmentGear(source) {
    const gear = source.gear && typeof source.gear === "object" ? source.gear : null;
    if (!gear) return migrateLegacyGear(source);

    return {
        armor: normalizeGearPiece(gear.armor),
        gloves: normalizeGearPiece(gear.gloves),
        kit1: normalizeGearPiece(gear.kit1),
        kit2: normalizeGearPiece(gear.kit2)
    };
}

function normalizeOperatorEquipmentSet(set) {
    const source = set && typeof set === "object" ? set : {};

    return {
        operator: normalizeEquipmentOperator(source.operator, source),
        weapon: normalizeEquipmentWeapon(source.weapon),
        stats: normalizeEquipmentStats(source.stats, source),
        gear: normalizeEquipmentGear(source)
    };
}

function loadOperatorEquipmentSets() {
    const saved = localStorage.getItem(OPERATOR_EQUIPMENT_STORAGE_KEY);
    if (!saved) {
        operatorEquipmentSets = {};
        return;
    }

    try {
        const parsed = JSON.parse(saved);
        operatorEquipmentSets = parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
    } catch (error) {
        console.error("Equipment sets could not be loaded:", error);
        operatorEquipmentSets = {};
    }
}

function saveOperatorEquipmentSets() {
    localStorage.setItem(OPERATOR_EQUIPMENT_STORAGE_KEY, JSON.stringify(operatorEquipmentSets));
}

function getOperatorEquipmentSet(operatorId) {
    const key = String(operatorId || "");
    if (!key) return createEmptyOperatorEquipmentSet();
    return normalizeOperatorEquipmentSet(operatorEquipmentSets[key]);
}

function hasOperatorEquipmentSet(operatorId) {
    const set = getOperatorEquipmentSet(operatorId);
    return Boolean(
        set.weapon.weaponId ||
        set.weapon.level ||
        set.stats.mainStat ||
        set.stats.subStats ||
        Object.values(set.gear).some(piece => (
            piece.name ||
            piece.setName ||
            piece.mainStat ||
            piece.subStats
        ))
    );
}

function setOperatorEquipmentSet(operatorId, set) {
    const key = String(operatorId || "");
    if (!key) return;

    operatorEquipmentSets[key] = normalizeOperatorEquipmentSet(set);
    saveOperatorEquipmentSets();
}

function clearOperatorEquipmentSet(operatorId) {
    const key = String(operatorId || "");
    if (!key) return;

    delete operatorEquipmentSets[key];
    saveOperatorEquipmentSets();
}

window.createEmptyGearPiece = createEmptyGearPiece;
window.createEmptyOperatorEquipmentSet = createEmptyOperatorEquipmentSet;
window.loadOperatorEquipmentSets = loadOperatorEquipmentSets;
window.getOperatorEquipmentSet = getOperatorEquipmentSet;
window.hasOperatorEquipmentSet = hasOperatorEquipmentSet;
window.setOperatorEquipmentSet = setOperatorEquipmentSet;
window.clearOperatorEquipmentSet = clearOperatorEquipmentSet;
