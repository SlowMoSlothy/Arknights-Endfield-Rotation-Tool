// supabaseClient.js

const SUPABASE_URL = "https://ftssllxdkqvmlxhfeqmy.supabase.co";
const SUPABASE_KEY = "sb_publishable_HoB7ioTMmxpNon3921W7YQ_AZ8wjb9b";

const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

const ENDFIELD_OPERATOR_LEVEL_STATS = {
    ardelia: { level1: [9.8, 9.5, 20.1, 15.9, 500, 30], level90: [112.1, 93.9, 145.9, 118.2, 5495, 323] },
    ember: { level1: [21.6, 9.8, 8.8, 13.6, 500, 30], level90: [176.4, 97, 86.8, 120.3, 5495, 323] },
    endministrator: { level1: [14.7, 14.2, 9.8, 10.8, 500, 30], level90: [123.7, 140.8, 97, 107.2, 5495, 319] },
    gilberta: { level1: [9.1, 9.4, 16.1, 20.4, 500, 30], level90: [89.8, 92.9, 127.2, 171.7, 5495, 329] },
    laevatain: { level1: [13.6, 9.6, 22.3, 9.1, 500, 30], level90: [121.4, 100, 178, 89.8, 5495, 318] },
    last_rite: { level1: [21.6, 8.8, 9.5, 15.9, 500, 30], level90: [155.2, 104.2, 93.9, 109.3, 5495, 332] },
    lifeng: { level1: [14.7, 20.1, 13.4, 12.9, 500, 30], level90: [123.7, 132.3, 115.5, 117.5, 5495, 312] },
    pogranichnik: { level1: [12.4, 13.6, 10.3, 20.1, 500, 30], level90: [101.2, 110.3, 97, 173.2, 5495, 321] },
    rossi: { level1: [9.9, 23.2, 14.1, 9.1, 500, 30], level90: [98, 176.6, 118.1, 89.8, 5495, 323] },
    tangtang: { level1: [13.6, 23.5, 8.9, 10.3, 500, 30], level90: [123.6, 179.6, 85.8, 102.1, 5495, 321] },
    yvonne: { level1: [8.4, 14.7, 24.6, 10.6, 500, 30], level90: [82.7, 128.2, 176.7, 105.1, 5495, 321] },
    zhuang: { level1: [10, 10, 17, 24.7, 500, 30], level90: [99, 99, 123.9, 184.3, 5495, 326] },
    alesh: { level1: [20.1, 9.5, 13.6, 10.8, 500, 30], level90: [158.1, 95.9, 125.8, 90, 5495, 309] },
    arclight: { level1: [14, 14.7, 12.5, 10.1, 500, 30], level90: [107.5, 145.4, 123.5, 100, 5495, 306] },
    avywenna: { level1: [12.9, 10.8, 14.1, 15, 500, 30], level90: [107.4, 106.7, 110.5, 148.5, 5495, 312] },
    chen_qianyu: { level1: [10.8, 20.6, 8.9, 9.7, 500, 30], level90: [106.7, 171.8, 85.8, 93.9, 5495, 297] },
    da_pan: { level1: [24.3, 9.8, 10.1, 10.4, 500, 30], level90: [175.1, 97, 95, 102.2, 5495, 303] },
    perlica: { level1: [9.3, 9.5, 21.6, 13.6, 500, 30], level90: [91.9, 93.9, 161.7, 113.6, 5495, 303] },
    snowshine: { level1: [18.6, 12.4, 9.5, 11, 500, 30], level90: [154.9, 104.6, 93.9, 108.9, 5495, 297] },
    wulfgard: { level1: [18.6, 9.6, 9.4, 13.8, 500, 30], level90: [161.7, 95.4, 92.9, 111.5, 5495, 294] },
    xaihi: { level1: [9.3, 9.4, 15.9, 15.2, 500, 30], level90: [89.8, 91.9, 127.1, 150, 5495, 291] },
    akekuri: { level1: [13.4, 15.2, 12.5, 9.3, 500, 30], level90: [110.4, 140.9, 106.8, 108, 5495, 319] },
    antal: { level1: [15.9, 9.5, 15.5, 9.8, 500, 30], level90: [129.4, 86.8, 165.2, 82.8, 5495, 297] },
    catcher: { level1: [21.6, 9.8, 8.8, 11.5, 500, 30], level90: [176.4, 97, 86.8, 106.7, 5495, 300] },
    estella: { level1: [13, 8.8, 14.1, 15, 500, 30], level90: [104.6, 97.9, 110.5, 151.5, 5495, 312] },
    fluorite: { level1: [14, 14.7, 12.5, 10.1, 500, 30], level90: [90.3, 168.2, 114.6, 91.9, 5495, 303] }
};

function getDatabaseOperatorLevelStats(row, raw) {
    const slug = String(row.slug || raw.slug || row.name || raw.name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    return ENDFIELD_OPERATOR_LEVEL_STATS[slug] || null;
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mapDatabaseSkill(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};

    return {
        ...raw,
        id: row.id,
        name: row.name || raw.name,
        type: row.skill_type || raw.type,
        shortType: row.short_type || raw.shortType,
        cooldown: row.cooldown ?? raw.cooldown,
        energy: row.energy ?? raw.energy,
        elementType: row.element_type || raw.elementType,
        icon: row.icon_path || raw.icon,
        iconSmall: row.icon_small_path || raw.iconSmall,
        description: row.description || raw.description,
        comboTrigger: row.combo_trigger || raw.comboTrigger,
        comboTriggerMode: row.combo_trigger_mode || raw.comboTriggerMode
    };
}

function mapDatabaseOperator(row, skillRows) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};
    const fallbackStats = getDatabaseOperatorLevelStats(row, raw);
    const level1 = fallbackStats?.level1 || [];
    const level90 = fallbackStats?.level90 || [];
    const hasStoredLevelRange = [
        row.base_hp_level_1,
        row.base_atk_level_1,
        row.base_strength_level_1,
        raw.baseHpLevel1,
        raw.baseAtkLevel1,
        raw.baseStrengthLevel1
    ].some(value => value !== null && value !== undefined && value !== "");
    const useFallbackRange = Boolean(fallbackStats && !hasStoredLevelRange);

    return {
        ...raw,
        id: row.id,
        slug: row.slug || raw.slug,
        name: row.name || raw.name,
        star: row.star ?? raw.star,
        operatorClass: row.operator_class || raw.operatorClass,
        sortOrder: row.sort_order ?? raw.sortOrder,
        icon: row.icon_path || raw.icon,
        canEnterUltimateState: row.can_enter_ultimate_state ?? raw.canEnterUltimateState,
        weaponType: row.weapon_type || raw.weaponType,
        elementType: row.element_type || raw.elementType,
        mainAttribute: row.main_attribute || raw.mainAttribute,
        secondaryAttribute: row.secondary_attribute || raw.secondaryAttribute,
        baseHp: useFallbackRange ? level90[4] : row.base_hp ?? raw.baseHp ?? level90[4],
        baseAtk: useFallbackRange ? level90[5] : row.base_atk ?? raw.baseAtk ?? level90[5],
        baseStrength: useFallbackRange ? level90[0] : row.base_strength ?? raw.baseStrength ?? level90[0],
        baseAgility: useFallbackRange ? level90[1] : row.base_agility ?? raw.baseAgility ?? level90[1],
        baseIntellect: useFallbackRange ? level90[2] : row.base_intellect ?? raw.baseIntellect ?? level90[2],
        baseWill: useFallbackRange ? level90[3] : row.base_will ?? raw.baseWill ?? level90[3],
        baseHpLevel1: row.base_hp_level_1 ?? raw.baseHpLevel1 ?? level1[4],
        baseAtkLevel1: row.base_atk_level_1 ?? raw.baseAtkLevel1 ?? level1[5],
        baseStrengthLevel1: row.base_strength_level_1 ?? raw.baseStrengthLevel1 ?? level1[0],
        baseAgilityLevel1: row.base_agility_level_1 ?? raw.baseAgilityLevel1 ?? level1[1],
        baseIntellectLevel1: row.base_intellect_level_1 ?? raw.baseIntellectLevel1 ?? level1[2],
        baseWillLevel1: row.base_will_level_1 ?? raw.baseWillLevel1 ?? level1[3],
        baseStatsLevel: row.base_stats_level ?? raw.baseStatsLevel ?? (fallbackStats ? 90 : null),
        rawData: raw,
        skills: skillRows.map(mapDatabaseSkill)
    };
}

function mapDatabaseWeaponEssenceProfile(row) {
    if (!isPlainObject(row) || row.verified !== true) return null;

    const toNumericArray = values => (
        Array.isArray(values)
            ? values.map(Number).filter(Number.isFinite)
            : []
    );
    const primaryValues = toNumericArray(row.primary_values);
    const secondaryValues = toNumericArray(row.secondary_values);
    const skillDescriptions = Array.isArray(row.skill_descriptions)
        ? row.skill_descriptions.map(String)
        : [];

    if (primaryValues.length !== 9 || skillDescriptions.length !== 9) return null;
    if (row.secondary_label && secondaryValues.length !== 9) return null;

    return {
        verified: true,
        sourceUrl: row.source_url || "",
        sourceNote: row.source_note || "",
        primary: {
            label: row.primary_label || "Primary Attribute",
            values: primaryValues,
            isPercent: row.primary_is_percent === true
        },
        secondary: row.secondary_label
            ? {
                label: row.secondary_label,
                values: secondaryValues,
                isPercent: row.secondary_is_percent === true
            }
            : null,
        skill: {
            name: row.skill_name || "Weapon Skill",
            descriptions: skillDescriptions
        },
        baseRanks: {
            primary: toNumericArray(row.primary_base_ranks),
            secondary: toNumericArray(row.secondary_base_ranks)
        },
        maxEssence: {
            primary: Number(row.primary_max_essence) || 0,
            secondary: Number(row.secondary_max_essence) || 0,
            skill: Number(row.skill_max_essence) || 0
        }
    };
}

function mapDatabaseWeapon(row, essenceProfile = null) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};

    return {
        ...raw,
        id: row.weapon_key || raw.id,
        name: row.name || raw.name,
        weaponType: row.weapon_type || raw.weaponType,
        rarity: row.rarity ?? raw.rarity,
        iconPath: row.icon_path || raw.iconPath || raw.icon,
        mainAttribute: row.main_attribute || raw.mainAttribute,
        secondaryAttribute: row.secondary_attribute || raw.secondaryAttribute,
        passiveName: row.passive_name || raw.passiveName,
        baseAtk: row.base_atk ?? raw.baseAtk,
        baseAtkLevel1: row.base_atk_level_1 ?? raw.baseAtkLevel1,
        baseStatsLevel: row.base_stats_level ?? raw.baseStatsLevel,
        setEffect: raw.setEffect || raw.set_effect || raw.effect,
        essenceData: essenceProfile || raw.essenceData || null,
        rawData: raw
    };
}

function mapDatabaseGearPiece(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};

    return {
        ...raw,
        id: row.gear_key || raw.id,
        name: row.name || raw.name,
        slot: row.gear_slot || raw.slot,
        setName: row.set_name || raw.setName,
        rarity: row.rarity ?? raw.rarity,
        iconPath: row.icon_path || raw.iconPath || raw.icon,
        mainAttribute: row.main_attribute || raw.mainAttribute,
        secondaryAttribute: row.secondary_attribute || raw.secondaryAttribute,
        passiveName: row.passive_name || raw.passiveName,
        setEffect: raw.setEffect || raw.set_effect || raw.effect,
        rawData: raw
    };
}

function mapDatabaseDebuffRegistryEntry(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};

    return {
        key: row.effect_key,
        value: {
            ...raw,
            name: row.name || raw.name,
            icon: row.icon_path || raw.icon,
            iconBase: row.icon_base_path || raw.iconBase,
            stackable: row.stackable ?? raw.stackable,
            maxStacks: row.max_stacks ?? raw.maxStacks,
            extension: row.extension || raw.extension
        }
    };
}

function mapDatabaseBuffRegistryEntry(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};

    return {
        key: row.effect_key,
        value: {
            ...raw,
            name: row.name || raw.name,
            icon: row.icon_path || raw.icon,
            iconBase: row.icon_base_path || raw.iconBase,
            stackable: row.stackable ?? raw.stackable,
            maxStacks: row.max_stacks ?? raw.maxStacks,
            extension: row.extension || raw.extension,
            consumeOnSkillType: row.consume_on_skill_type || raw.consumeOnSkillType,
            consumeStacks: row.consume_stacks ?? raw.consumeStacks,
            onFullyConsumedEffect: row.on_fully_consumed_effect || raw.onFullyConsumedEffect
        }
    };
}

function mapDatabaseReactionRule(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};

    return {
        ...raw,
        id: row.reaction_key || raw.id,
        name: row.name || raw.name,
        requires: Array.isArray(row.requires_effects) ? row.requires_effects : raw.requires,
        appliesEffect: row.applies_effect || raw.appliesEffect,
        reactionEffect: row.reaction_effect || raw.reactionEffect,
        persistsForCombo: row.persists_for_combo ?? raw.persistsForCombo
    };
}

function mapDatabaseEffectGroup(row) {
    return {
        key: row.group_key,
        effects: Array.isArray(row.effects) ? row.effects : []
    };
}

async function loadRegistryTableFromSupabase(tableName, mapper, label) {
    if (!supabaseClient) {
        console.warn(`Supabase client is not available. Using local ${label}.`);
        return [];
    }

    const { data, error } = await supabaseClient
        .from(tableName)
        .select("*")
        .eq("game", "arknights_endfield")
        .order("sort_order", { ascending: true });

    if (error) {
        console.error(`${label} could not be loaded from Supabase:`, error);
        return [];
    }

    return Array.isArray(data) ? data.map(mapper) : [];
}

async function loadDebuffRegistryFromSupabase() {
    return loadRegistryTableFromSupabase("debuff_registry", mapDatabaseDebuffRegistryEntry, "debuff registry");
}

async function loadBuffRegistryFromSupabase() {
    return loadRegistryTableFromSupabase("buff_registry", mapDatabaseBuffRegistryEntry, "buff registry");
}

async function loadReactionRulesFromSupabase() {
    return loadRegistryTableFromSupabase("reaction_rules", mapDatabaseReactionRule, "reaction rules");
}

async function loadEffectGroupsFromSupabase() {
    return loadRegistryTableFromSupabase("effect_groups", mapDatabaseEffectGroup, "effect groups");
}

function replaceRegistryObject(target, entries) {
    Object.keys(target).forEach(key => {
        delete target[key];
    });

    entries.forEach(entry => {
        if (!entry.key) return;
        target[entry.key] = entry.value;
    });
}

function replaceRegistrySet(target, values) {
    target.clear();
    values.forEach(value => target.add(value));
}

async function hydrateDebuffRegistryFromSupabase() {
    if (typeof DEBUFF_REGISTRY === "undefined") {
        return false;
    }

    let databaseDebuffs = [];
    try {
        databaseDebuffs = await loadDebuffRegistryFromSupabase();
        if (!databaseDebuffs.length) {
            return false;
        }
    } catch (error) {
        console.error("Debuff registry loading failed. Using local debuff registry.", error);
        return false;
    }

    replaceRegistryObject(DEBUFF_REGISTRY, databaseDebuffs);

    console.info(`Debuff registry loaded from Supabase: ${databaseDebuffs.length}`);
    return true;
}

async function hydrateBuffRegistryFromSupabase() {
    if (typeof BUFF_REGISTRY === "undefined") {
        return false;
    }

    let databaseBuffs = [];
    try {
        databaseBuffs = await loadBuffRegistryFromSupabase();
        if (!databaseBuffs.length) {
            return false;
        }
    } catch (error) {
        console.error("Buff registry loading failed. Using local buff registry.", error);
        return false;
    }

    replaceRegistryObject(BUFF_REGISTRY, databaseBuffs);

    console.info(`Buff registry loaded from Supabase: ${databaseBuffs.length}`);
    return true;
}

async function hydrateReactionRulesFromSupabase() {
    if (typeof ARTS_REACTIONS === "undefined" || !Array.isArray(ARTS_REACTIONS)) {
        return false;
    }

    let databaseRules = [];
    try {
        databaseRules = await loadReactionRulesFromSupabase();
        if (!databaseRules.length) {
            return false;
        }
    } catch (error) {
        console.error("Reaction rules loading failed. Using local reaction rules.", error);
        return false;
    }

    ARTS_REACTIONS.splice(0, ARTS_REACTIONS.length, ...databaseRules);

    console.info(`Reaction rules loaded from Supabase: ${databaseRules.length}`);
    return true;
}

async function hydrateEffectGroupsFromSupabase() {
    if (
        typeof EXCLUSIVE_INFLICTIONS === "undefined" ||
        typeof PHYSICAL_DEBUFFS === "undefined" ||
        typeof UTILITY_DEBUFFS === "undefined"
    ) {
        return false;
    }

    let databaseGroups = [];
    try {
        databaseGroups = await loadEffectGroupsFromSupabase();
        if (!databaseGroups.length) {
            return false;
        }
    } catch (error) {
        console.error("Effect groups loading failed. Using local effect groups.", error);
        return false;
    }

    const groupsByKey = new Map(databaseGroups.map(group => [group.key, group.effects]));
    if (groupsByKey.has("exclusive_inflictions")) replaceRegistrySet(EXCLUSIVE_INFLICTIONS, groupsByKey.get("exclusive_inflictions"));
    if (groupsByKey.has("physical_debuffs")) replaceRegistrySet(PHYSICAL_DEBUFFS, groupsByKey.get("physical_debuffs"));
    if (groupsByKey.has("utility_debuffs")) replaceRegistrySet(UTILITY_DEBUFFS, groupsByKey.get("utility_debuffs"));

    console.info(`Effect groups loaded from Supabase: ${databaseGroups.length}`);
    return true;
}

async function loadOperatorsFromSupabase() {
    if (!supabaseClient) {
        console.warn("Supabase client is not available. Using local operator data.");
        return [];
    }

    const { data: operatorRows, error: operatorError } = await supabaseClient
        .from("operators")
        .select("*")
        .eq("game", "arknights_endfield")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (operatorError) {
        console.error("Operatoren konnten nicht aus Supabase geladen werden:", operatorError);
        return [];
    }

    if (!Array.isArray(operatorRows) || operatorRows.length === 0) {
        console.warn("Supabase hat keine Operatoren geliefert. Using local operator data.");
        return [];
    }

    const operatorIds = operatorRows.map(row => row.id);
    const { data: skillRows, error: skillError } = await supabaseClient
        .from("operator_skills")
        .select("*")
        .in("operator_id", operatorIds)
        .order("operator_id", { ascending: true })
        .order("slot_index", { ascending: true });

    if (skillError) {
        console.error("Skills konnten nicht aus Supabase geladen werden:", skillError);
        return [];
    }

    const skillsByOperatorId = new Map();
    (skillRows || []).forEach(row => {
        if (!skillsByOperatorId.has(row.operator_id)) {
            skillsByOperatorId.set(row.operator_id, []);
        }

        skillsByOperatorId.get(row.operator_id).push(row);
    });

    return operatorRows.map(row => mapDatabaseOperator(row, skillsByOperatorId.get(row.id) || []));
}

async function loadWeaponsFromSupabase() {
    if (!supabaseClient) {
        console.warn("Supabase client is not available. Using local weapon data.");
        return [];
    }

    const [
        { data, error },
        { data: essenceRows, error: essenceError }
    ] = await Promise.all([
        supabaseClient
            .from("weapons")
            .select("*")
            .eq("game", "arknights_endfield")
            .order("weapon_type", { ascending: true })
            .order("rarity", { ascending: false })
            .order("name", { ascending: true }),
        supabaseClient
            .from("weapon_essence_profiles")
            .select("*")
            .eq("verified", true)
    ]);

    if (error) {
        console.error("Weapons could not be loaded from Supabase:", error);
        return [];
    }

    if (essenceError) {
        console.warn(
            "Verified weapon Essence profiles are unavailable. Essence bonuses will not be estimated.",
            essenceError
        );
    }

    const essenceByWeaponKey = new Map(
        (essenceError || !Array.isArray(essenceRows) ? [] : essenceRows)
            .map(row => [String(row.weapon_key), mapDatabaseWeaponEssenceProfile(row)])
            .filter(([, profile]) => profile)
    );

    return Array.isArray(data)
        ? data.map(row => mapDatabaseWeapon(row, essenceByWeaponKey.get(String(row.weapon_key)) || null))
        : [];
}

async function loadGearPiecesFromSupabase() {
    if (!supabaseClient) {
        console.warn("Supabase client is not available. Using local gear data.");
        return [];
    }

    const { data, error } = await supabaseClient
        .from("gear_pieces")
        .select("*")
        .eq("game", "arknights_endfield")
        .order("gear_slot", { ascending: true })
        .order("rarity", { ascending: false })
        .order("name", { ascending: true });

    if (error) {
        console.error("Gear pieces could not be loaded from Supabase:", error);
        return [];
    }

    return Array.isArray(data) ? data.map(mapDatabaseGearPiece) : [];
}

async function hydrateWeaponsFromSupabase() {
    if (typeof ENDFIELD_WEAPONS === "undefined" || !Array.isArray(ENDFIELD_WEAPONS)) {
        return false;
    }

    let databaseWeapons = [];
    try {
        databaseWeapons = await loadWeaponsFromSupabase();
        if (!databaseWeapons.length) {
            return false;
        }
    } catch (error) {
        console.error("Weapon loading failed. Using local weapon data.", error);
        return false;
    }

    ENDFIELD_WEAPONS.splice(0, ENDFIELD_WEAPONS.length, ...databaseWeapons);
    console.info(`Weapons loaded from Supabase: ${ENDFIELD_WEAPONS.length}`);
    return true;
}

async function hydrateGearPiecesFromSupabase() {
    if (typeof ENDFIELD_GEAR_PIECES === "undefined" || !Array.isArray(ENDFIELD_GEAR_PIECES)) {
        return false;
    }

    let databaseGearPieces = [];
    try {
        databaseGearPieces = await loadGearPiecesFromSupabase();
        if (!databaseGearPieces.length) {
            return false;
        }
    } catch (error) {
        console.error("Gear piece loading failed. Using local gear data.", error);
        return false;
    }

    ENDFIELD_GEAR_PIECES.splice(0, ENDFIELD_GEAR_PIECES.length, ...databaseGearPieces);
    console.info(`Gear pieces loaded from Supabase: ${ENDFIELD_GEAR_PIECES.length}`);
    return true;
}

async function hydrateOperatorsFromSupabase() {
    if (typeof useSupabaseOperators !== "undefined" && !useSupabaseOperators) {
        console.info("Supabase operator loading is disabled. Using local operator data.");
        return false;
    }

    let databaseOperators = [];
    try {
        databaseOperators = await loadOperatorsFromSupabase();
        if (!databaseOperators.length) {
            return false;
        }
    } catch (error) {
        console.error("Supabase loading failed. Using local operator data.", error);
        return false;
    }

    operators = databaseOperators;
    window.operators = operators;
    console.info(`Operatoren aus Supabase geladen: ${operators.length}`);
    return true;
}
