// supabaseClient.js

const SUPABASE_URL = "https://ftssllxdkqvmlxhfeqmy.supabase.co";
const SUPABASE_KEY = "sb_publishable_HoB7ioTMmxpNon3921W7YQ_AZ8wjb9b";

const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

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

    return {
        ...raw,
        id: row.id,
        name: row.name || raw.name,
        star: row.star ?? raw.star,
        operatorClass: row.operator_class || raw.operatorClass,
        sortOrder: row.sort_order ?? raw.sortOrder,
        icon: row.icon_path || raw.icon,
        canEnterUltimateState: row.can_enter_ultimate_state ?? raw.canEnterUltimateState,
        weaponType: row.weapon_type || raw.weaponType,
        elementType: row.element_type || raw.elementType,
        skills: skillRows.map(mapDatabaseSkill)
    };
}

function mapDatabaseWeapon(row) {
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
        passiveName: row.passive_name || raw.passiveName
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

    const { data, error } = await supabaseClient
        .from("weapons")
        .select("*")
        .eq("game", "arknights_endfield")
        .order("weapon_type", { ascending: true })
        .order("rarity", { ascending: false })
        .order("name", { ascending: true });

    if (error) {
        console.error("Weapons could not be loaded from Supabase:", error);
        return [];
    }

    return Array.isArray(data) ? data.map(mapDatabaseWeapon) : [];
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
