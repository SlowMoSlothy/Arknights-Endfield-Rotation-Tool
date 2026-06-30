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
    const rawDamageProfile = isPlainObject(raw.damageProfile) ? raw.damageProfile : null;
    const legacyDamageMultiplier = Number(raw.damageMultiplier);
    const hasStructuredDamageProfile = row.atk_multiplier !== null && row.atk_multiplier !== undefined;
    const damageProfile = hasStructuredDamageProfile
        ? {
            atkMultiplier: Number(row.atk_multiplier),
            flatDamage: Number(row.flat_damage) || 0,
            hitCount: Number(row.hit_count) || 1,
            element: row.damage_element || row.element_type || raw.elementType,
            verified: Boolean(row.damage_verified),
            sourceUrl: row.damage_source_url || "",
            canCrit: rawDamageProfile?.canCrit !== false
        }
        : (rawDamageProfile || (Number.isFinite(legacyDamageMultiplier) && legacyDamageMultiplier >= 0
            ? {
                atkMultiplier: legacyDamageMultiplier / 100,
                flatDamage: 0,
                hitCount: 1,
                element: row.element_type || raw.elementType,
                verified: false,
                sourceUrl: ""
            }
            : null));

    return {
        ...raw,
        id: row.id,
        operatorId: row.operator_id,
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
        comboTriggerMode: row.combo_trigger_mode || raw.comboTriggerMode,
        damageProfile
    };
}

function mapDatabaseOperator(row, skillRows) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};

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
        elementType: row.element_type || raw.elementType,
        weaponType: row.weapon_type || raw.weaponType,
        baseHp: row.base_hp ?? raw.baseHp,
        baseAtk: row.base_atk ?? raw.baseAtk,
        baseStatsLevel: row.base_stats_level ?? raw.baseStatsLevel,
        mainAttribute: row.main_attribute || raw.mainAttribute,
        secondaryAttribute: row.secondary_attribute || raw.secondaryAttribute,
        skills: skillRows.map(mapDatabaseSkill)
    };
}

function mapDatabaseWeapon(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};
    const weaponKey = row.weapon_key || raw.key;

    return {
        ...raw,
        key: weaponKey,
        name: row.name || raw.name,
        weaponType: row.weapon_type || raw.weaponType,
        rarity: row.rarity ?? raw.rarity,
        mainAttribute: row.main_attribute || raw.mainAttribute,
        secondaryAttribute: row.secondary_attribute || raw.secondaryAttribute,
        passiveName: row.passive_name || raw.passiveName,
        icon: row.icon_path || raw.icon || (weaponKey ? `assets/weapons/${weaponKey}.png` : ""),
        baseAtk: row.base_atk ?? raw.baseAtk,
        baseStatsLevel: row.base_stats_level ?? raw.baseStatsLevel
    };
}

function mapDatabaseWeaponEssenceProfile(row) {
    return {
        weaponKey: row.weapon_key,
        primaryLabel: row.primary_label,
        primaryValues: Array.isArray(row.primary_values) ? row.primary_values : [],
        primaryIsPercent: Boolean(row.primary_is_percent),
        secondaryLabel: row.secondary_label,
        secondaryValues: Array.isArray(row.secondary_values) ? row.secondary_values : [],
        secondaryIsPercent: Boolean(row.secondary_is_percent),
        skillName: row.skill_name,
        skillDescriptions: Array.isArray(row.skill_descriptions) ? row.skill_descriptions : [],
        primaryBaseRanks: Array.isArray(row.primary_base_ranks) ? row.primary_base_ranks : [],
        secondaryBaseRanks: Array.isArray(row.secondary_base_ranks) ? row.secondary_base_ranks : [],
        primaryMaxEssence: Number(row.primary_max_essence) || 0,
        secondaryMaxEssence: Number(row.secondary_max_essence) || 0,
        skillMaxEssence: Number(row.skill_max_essence) || 0,
        verified: Boolean(row.verified),
        sourceUrl: row.source_url || "",
        sourceNote: row.source_note || ""
    };
}

function mapDatabaseEnemyCombatProfile(row) {
    const resistances = isPlainObject(row.resistance_multipliers) ? row.resistance_multipliers : {};
    const getResistance = element => {
        const value = Number(resistances[element]);
        return Number.isFinite(value) ? value : 1;
    };
    return {
        profileKey: row.profile_key,
        enemyKey: row.enemy_key,
        name: row.name,
        difficultyLabel: row.difficulty_label || "Standard",
        enemyRank: row.enemy_rank || "normal",
        enemyType: row.enemy_type || "neutral",
        defense: Number(row.defense) || 0,
        resistanceMultipliers: {
            physical: getResistance("physical"),
            heat: getResistance("heat"),
            cryo: getResistance("cryo"),
            electric: getResistance("electric"),
            nature: getResistance("nature"),
            neutral: getResistance("neutral")
        },
        icon: row.icon_path || "",
        description: row.description || "",
        verified: Boolean(row.verified),
        sourceUrl: row.source_url || "",
        sourceNote: row.source_note || ""
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
        throw new Error(`Supabase client is not available. Cannot load ${label}.`);
    }

    const { data, error } = await supabaseClient
        .from(tableName)
        .select("*")
        .eq("game", "arknights_endfield")
        .order("sort_order", { ascending: true });

    if (error) {
        throw error;
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

function mergeRegistryObject(target, entries) {
    entries.forEach(entry => {
        if (!entry.key) return;
        target[entry.key] = {
            ...(target[entry.key] || {}),
            ...(entry.value || {})
        };
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

    mergeRegistryObject(BUFF_REGISTRY, databaseBuffs);

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
        throw new Error("Supabase client is not available. Cannot load operator data.");
    }

    const { data: operatorRows, error: operatorError } = await supabaseClient
        .from("operators")
        .select("*")
        .eq("game", "arknights_endfield")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (operatorError) {
        throw operatorError;
    }

    if (!Array.isArray(operatorRows) || operatorRows.length === 0) {
        throw new Error("Supabase returned no operator data.");
    }

    const operatorIds = operatorRows.map(row => row.id);
    const { data: skillRows, error: skillError } = await supabaseClient
        .from("operator_skills")
        .select("*")
        .in("operator_id", operatorIds)
        .order("operator_id", { ascending: true })
        .order("slot_index", { ascending: true });

    if (skillError) {
        throw skillError;
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
        throw new Error("Supabase client is not available. Cannot load weapon data.");
    }

    const { data, error } = await supabaseClient
        .from("weapons")
        .select("*")
        .eq("game", "arknights_endfield")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        throw error;
    }

    return Array.isArray(data) ? data.map(mapDatabaseWeapon) : [];
}

async function loadWeaponEssenceProfilesFromSupabase() {
    if (!supabaseClient) {
        throw new Error("Supabase client is not available. Cannot load weapon Essence profiles.");
    }

    const { data, error } = await supabaseClient
        .from("weapon_essence_profiles")
        .select("*")
        .order("weapon_key", { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data.map(mapDatabaseWeaponEssenceProfile) : [];
}

async function loadEnemyCombatProfilesFromSupabase() {
    if (!supabaseClient) throw new Error("Supabase client is not available. Cannot load enemy profiles.");
    const { data, error } = await supabaseClient
        .from("enemy_combat_profiles")
        .select("*")
        .eq("game", "arknights_endfield")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data.map(mapDatabaseEnemyCombatProfile) : [];
}

async function hydrateEnemyCombatProfilesFromSupabase() {
    if (typeof enemies === "undefined" || !Array.isArray(enemies)) return false;

    let profiles;
    try {
        profiles = await loadEnemyCombatProfilesFromSupabase();
    } catch (error) {
        console.info("Supabase enemy profiles are not available yet; using local defaults.", error?.message || error);
        return false;
    }
    if (!profiles.length) return false;

    const localEnemies = new Map(enemies.map(enemy => [String(enemy.id), enemy]));
    const hydrated = profiles.map(profile => {
        const baseEnemy = localEnemies.get(String(profile.enemyKey));
        const displayName = profile.difficultyLabel && profile.difficultyLabel !== "Standard"
            ? `${profile.name} · ${profile.difficultyLabel}`
            : profile.name;
        return {
            ...(baseEnemy || {}),
            id: profile.profileKey,
            baseEnemyId: profile.enemyKey,
            name: displayName,
            enemyRank: profile.enemyRank,
            enemyType: profile.enemyType,
            icon: profile.icon || baseEnemy?.icon || "",
            description: profile.description || baseEnemy?.description || "",
            skills: Array.isArray(baseEnemy?.skills) ? baseEnemy.skills : [],
            combatProfile: {
                defense: profile.defense,
                resistanceMultipliers: profile.resistanceMultipliers,
                verified: profile.verified,
                sourceUrl: profile.sourceUrl,
                sourceNote: profile.sourceNote,
                difficultyLabel: profile.difficultyLabel
            }
        };
    });

    const profileKeys = new Set(profiles.map(profile => String(profile.profileKey)));
    const localFallbacks = enemies.filter(enemy => !profileKeys.has(String(enemy.id)));
    enemies.splice(0, enemies.length, ...hydrated, ...localFallbacks);
    window.enemies = enemies;
    console.info(`Enemy combat profiles loaded from Supabase: ${hydrated.length}`);
    return true;
}
async function hydrateOperatorsFromSupabase() {
    if (typeof useSupabaseOperators !== "undefined" && !useSupabaseOperators) {
        console.info("Supabase operator loading is disabled.");
        return false;
    }

    let databaseOperators = [];
    try {
        databaseOperators = await loadOperatorsFromSupabase();
        if (!databaseOperators.length) {
            return false;
        }
    } catch (error) {
        console.error("Supabase operator loading failed.", error);
        return false;
    }

    let databaseWeapons = [];
    try {
        databaseWeapons = await loadWeaponsFromSupabase();
    } catch (error) {
        console.error("Supabase weapon loading failed. Weapon loadouts are unavailable.", error);
    }

    let databaseWeaponEssenceProfiles = [];
    try {
        databaseWeaponEssenceProfiles = await loadWeaponEssenceProfilesFromSupabase();
    } catch (error) {
        console.error("Supabase weapon Essence profile loading failed.", error);
    }

    const profilesByWeaponKey = new Map(
        databaseWeaponEssenceProfiles.map(profile => [String(profile.weaponKey), profile])
    );
    databaseWeapons = databaseWeapons.map(weapon => ({
        ...weapon,
        essenceProfile: profilesByWeaponKey.get(String(weapon.key)) || null
    }));

    operators = databaseOperators;
    weapons = databaseWeapons;
    weaponEssenceProfiles = databaseWeaponEssenceProfiles;
    window.operators = operators;
    window.weapons = weapons;
    window.weaponEssenceProfiles = weaponEssenceProfiles;
    console.info(`Operatoren aus Supabase geladen: ${operators.length}; Waffen: ${weapons.length}; Essenzprofile: ${weaponEssenceProfiles.length}`);
    return true;
}
