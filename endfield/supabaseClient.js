// supabaseClient.js

const SUPABASE_URL = "https://ftssllxdkqvmlxhfeqmy.supabase.co";
const SUPABASE_KEY = "sb_publishable_HoB7ioTMmxpNon3921W7YQ_AZ8wjb9b";

const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mapNumericArray(value) {
    return Array.isArray(value)
        ? value.map(item => Number(item)).filter(Number.isFinite)
        : [];
}

function getBasicAttackConfigKey(operatorId, formKey = "base") {
    return `${Number(operatorId)}:${String(formKey || "base")}`;
}

function buildBasicAttackConfigs(sequenceRows) {
    const grouped = new Map();

    (sequenceRows || []).forEach(row => {
        const key = getBasicAttackConfigKey(row.operator_id, row.form_key);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(row);
    });

    const configs = new Map();
    grouped.forEach((rows, key) => {
        rows.sort((left, right) => Number(left.sequence_index) - Number(right.sequence_index));
        const first = rows[0];
        const summedDuration = rows.reduce((total, row) => total + (Number(row.duration_seconds) || 0), 0);
        const configuredCycleDuration = Number(first.cycle_duration_seconds);
        const updatedAt = rows
            .map(row => row.updated_at)
            .filter(Boolean)
            .sort()
            .at(-1) || "";

        configs.set(key, {
            name: first.attack_name || "Basic Attack",
            cycleDuration: configuredCycleDuration > 0 ? configuredCycleDuration : summedDuration,
            timingVerified: rows.length > 0 && rows.every(row => row.verified === true),
            iconSmall: first.icon_path || "",
            description: first.description || "",
            updatedAt,
            sequences: rows.map(row => ({
                sequenceIndex: Number(row.sequence_index),
                label: row.label || undefined,
                kind: row.kind || "normal",
                duration: Number(row.duration_seconds),
                hitCount: Number(row.hit_count) || 0,
                hitTimings: mapNumericArray(row.hit_timings),
                hitTimingMode: row.hit_timing_mode || "absolute",
                hitMultipliers: mapNumericArray(row.hit_multipliers),
                atkMultiplierTotal: Number(row.atk_multiplier_total) || 0,
                staggerMultiplier: Number(row.stagger_multiplier) || 0,
                eventHitIndex: row.event_hit_index === null || row.event_hit_index === undefined
                    ? undefined
                    : Number(row.event_hit_index),
                endsCycle: row.ends_cycle === true,
                emits: Array.isArray(row.emits) ? row.emits : []
            }))
        });
    });

    return configs;
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
        durationSeconds: row.duration_seconds ?? raw.durationSeconds ?? raw.duration,
        hitTimings: mapNumericArray(row.hit_timings).length > 0
            ? mapNumericArray(row.hit_timings)
            : mapNumericArray(raw.hitTimings),
        hitTimingMode: row.hit_timing_mode || raw.hitTimingMode || "absolute",
        effectTimings: mapNumericArray(row.effect_timings).length > 0
            ? mapNumericArray(row.effect_timings)
            : mapNumericArray(raw.effectTimings),
        formKey: row.form_key || raw.formKey || "base",
        variantKey: row.variant_key || raw.variantKey || "base",
        damageProfile
    };
}

function normalizeEffectDurationKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function getEffectDurationKey(effect) {
    if (!isPlainObject(effect)) return "";

    return normalizeEffectDurationKey(
        effect.id ||
        effect.appliesEffect ||
        effect.effect ||
        effect.key ||
        effect.name
    );
}

function mapDatabaseEffectDurationOverride(row) {
    return {
        operatorId: row.operator_id,
        skillId: row.skill_id,
        effectType: row.effect_type,
        effectKey: normalizeEffectDurationKey(row.effect_key),
        durationSeconds: Number(row.duration_seconds),
        verified: Boolean(row.verified),
        sourceUrl: row.source_url || "",
        sourceNote: row.source_note || ""
    };
}

function getEffectDurationOverrideLookupKey(skillId, effectType, effectKey) {
    return `${skillId || ""}:${effectType || ""}:${effectKey || ""}`;
}

function createEffectDurationOverrideLookup(overrides) {
    const lookup = new Map();

    (overrides || []).forEach(override => {
        if (!override.skillId || !override.effectType || !override.effectKey) return;
        if (!Number.isFinite(override.durationSeconds) || override.durationSeconds <= 0) return;

        lookup.set(
            getEffectDurationOverrideLookupKey(override.skillId, override.effectType, override.effectKey),
            override
        );
    });

    return lookup;
}

function applyEffectDurationOverrideToEffect(effect, effectType, skill, lookup) {
    if (!isPlainObject(effect) || !skill?.id || !lookup?.size) return effect;

    const effectKey = getEffectDurationKey(effect);
    const override = lookup.get(getEffectDurationOverrideLookupKey(skill.id, effectType, effectKey));
    if (!override) return effect;

    return {
        ...effect,
        durationSeconds: override.durationSeconds,
        durationVerified: override.verified,
        durationSource: "supabase",
        durationSourceUrl: override.sourceUrl,
        durationSourceNote: override.sourceNote
    };
}

function mapEffectsWithDurationOverrides(effects, effectType, skill, lookup) {
    if (!Array.isArray(effects)) return effects;

    return effects.map(effect => applyEffectDurationOverrideToEffect(effect, effectType, skill, lookup));
}

function applyEffectDurationOverridesToSkill(skill, lookup) {
    if (!skill || !lookup?.size) return skill;

    const nextSkill = {
        ...skill,
        buffs: mapEffectsWithDurationOverrides(skill.buffs, "buff", skill, lookup),
        debuffs: mapEffectsWithDurationOverrides(skill.debuffs, "debuff", skill, lookup)
    };

    if (Array.isArray(skill.conditionalBuffs)) {
        nextSkill.conditionalBuffs = skill.conditionalBuffs.map(condition => ({
            ...condition,
            buffs: mapEffectsWithDurationOverrides(condition.buffs, "buff", skill, lookup)
        }));
    }

    if (Array.isArray(skill.conditionalDebuffs)) {
        nextSkill.conditionalDebuffs = skill.conditionalDebuffs.map(condition => ({
            ...condition,
            debuffs: mapEffectsWithDurationOverrides(condition.debuffs, "debuff", skill, lookup)
        }));
    }

    return nextSkill;
}

function applyEffectDurationOverridesToOperators(operators, overrides) {
    const lookup = createEffectDurationOverrideLookup(overrides);
    if (!lookup.size) return operators;

    return operators.map(operator => ({
        ...operator,
        skills: Array.isArray(operator.skills)
            ? operator.skills.map(skill => applyEffectDurationOverridesToSkill(skill, lookup))
            : operator.skills
    }));
}

function mapDatabaseOperator(row, skillRows, basicAttackConfig = null) {
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
        isVisible: row.is_visible !== false,
        canEnterUltimateState: row.can_enter_ultimate_state ?? raw.canEnterUltimateState,
        elementType: row.element_type || raw.elementType,
        weaponType: row.weapon_type || raw.weaponType,
        baseHp: row.base_hp ?? raw.baseHp,
        baseAtk: row.base_atk ?? raw.baseAtk,
        baseStatsLevel: row.base_stats_level ?? raw.baseStatsLevel,
        mainAttribute: row.main_attribute || raw.mainAttribute,
        secondaryAttribute: row.secondary_attribute || raw.secondaryAttribute,
        // The BATK Analyzer writes the canonical base profile to operators.raw_data.basicAttack.
        // Normalized sequence rows remain a legacy fallback and are still used for form variants.
        basicAttack: raw.basicAttack || raw.basic_attack || basicAttackConfig,
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
        secondaryValue: row.secondary_value ?? raw.secondaryValue ?? null,
        secondaryIsPercent: row.secondary_is_percent ?? raw.secondaryIsPercent ?? false,
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

function mapDatabaseInflictionMechanic(row) {
    return {
        key: row.effect_key,
        value: {
            effectKey: row.effect_key,
            name: row.name,
            element: row.element,
            durationSeconds: Number(row.duration_seconds),
            maxStacks: Number(row.max_stacks),
            burstKey: row.burst_key,
            burstName: row.burst_name,
            burstAtkMultiplier: Number(row.burst_atk_multiplier),
            burstHitCount: Number(row.burst_hit_count) || 1,
            burstCanCrit: row.burst_can_crit !== false,
            burstDelaySeconds: Number(row.burst_delay_seconds) || 0,
            verified: row.verified === true,
            sourceUrl: row.source_url || "",
            sourceNote: row.source_note || ""
        }
    };
}

function mapDatabaseBuffRegistryEntry(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};
    const localFallback = typeof BUFF_REGISTRY !== "undefined"
        ? BUFF_REGISTRY[row.effect_key]
        : null;

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
            onFullyConsumedEffect: row.on_fully_consumed_effect || raw.onFullyConsumedEffect,
            onConsume: raw.onConsume || localFallback?.onConsume
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

function mapDatabaseSimulationTriggerEvent(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};
    const effects = Array.isArray(row.effects) ? row.effects : (Array.isArray(raw.effects) ? raw.effects : []);

    return {
        ...raw,
        id: Number(row.id),
        eventKey: row.event_key,
        name: row.name,
        description: row.description || raw.description || "",
        type: "Combat Event",
        shortType: "EVT",
        elementType: "neutral",
        icon: row.icon_path || raw.icon || "assets/ui/events/combat_event.svg",
        iconSmall: row.icon_path || raw.iconSmall || raw.icon || "assets/ui/events/combat_event.svg",
        cooldown: 0,
        energy: 0,
        simulationOnly: true,
        effects,
        debuffs: effects.map(effect => ({
            id: effect.effect,
            name: effect.name || effect.effect,
            appliesEffect: effect.effect,
            persistsForCombo: effect.persistsForCombo === true,
            transientTrigger: effect.transientTrigger !== false,
            visible: effect.visible === true
        }))
    };
}

function mapDatabaseSimulationActionRule(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};
    return {
        ...raw,
        ruleKey: row.rule_key,
        name: row.name,
        description: row.description || raw.description || "",
        actionType: row.action_type,
        actorScope: row.actor_scope || raw.actorScope || "controlled",
        conditions: isPlainObject(row.conditions) ? row.conditions : (raw.conditions || {}),
        consumedEffects: Array.isArray(row.consumed_effects) ? row.consumed_effects : (raw.consumedEffects || []),
        emittedEffects: Array.isArray(row.emitted_effects) ? row.emitted_effects : (raw.emittedEffects || []),
        actionOverride: row.action_override || raw.actionOverride || null,
        priority: Number(row.priority || raw.priority || 0),
        enabled: row.enabled !== false
    };
}

function mapDatabaseOperatorPassiveRule(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};
    return {
        ...raw,
        ruleKey: row.rule_key,
        operatorId: Number(row.operator_id),
        name: row.name,
        ruleType: row.rule_type || raw.ruleType || "talent",
        resolutionType: row.resolution_type || raw.resolutionType,
        minimumPotential: Number(row.minimum_potential ?? raw.minimumPotential ?? 0),
        maximumPotential: row.maximum_potential === null || row.maximum_potential === undefined
            ? (Number.isFinite(Number(raw.maximumPotential)) ? Number(raw.maximumPotential) : null)
            : Number(row.maximum_potential),
        conditions: isPlainObject(row.conditions) ? row.conditions : (raw.conditions || {}),
        trigger: isPlainObject(row.trigger) ? row.trigger : (raw.trigger || {}),
        effect: isPlainObject(row.effect) ? row.effect : (raw.effect || {}),
        cooldownSeconds: Number(row.cooldown_seconds ?? raw.cooldownSeconds ?? 0),
        enabled: row.enabled !== false,
        verified: row.verified === true,
        sourceUrl: row.source_url || raw.sourceUrl || "",
        sourceNote: row.source_note || raw.sourceNote || ""
    };
}

function mapDatabaseOperatorForm(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};
    return {
        ...raw,
        formKey: row.form_key,
        operatorId: Number(row.operator_id),
        name: row.name,
        activationSkillId: Number(row.activation_skill_id),
        durationSeconds: Number(row.duration_seconds),
        priority: Number(row.priority || 0),
        icon: row.icon_path || raw.icon || "",
        visible: row.visible !== false,
        enabled: row.enabled !== false,
        verified: row.verified === true,
        sourceUrl: row.source_url || "",
        sourceNote: row.source_note || ""
    };
}

function mapDatabaseOperatorFormActionVariant(row) {
    const raw = isPlainObject(row.raw_data) ? row.raw_data : {};
    return {
        ...raw,
        formKey: row.form_key,
        operatorId: Number(row.operator_id),
        actionKey: row.action_key,
        actionOverride: isPlainObject(row.action_override) ? row.action_override : {},
        priority: Number(row.priority || 0),
        enabled: row.enabled !== false,
        verified: row.verified === true,
        sourceUrl: row.source_url || "",
        sourceNote: row.source_note || ""
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

async function loadInflictionMechanicsFromSupabase() {
    return loadRegistryTableFromSupabase("infliction_mechanics", mapDatabaseInflictionMechanic, "infliction mechanics");
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

async function hydrateInflictionMechanicsFromSupabase() {
    if (typeof INFLICTION_MECHANICS === "undefined") return false;

    let databaseMechanics = [];
    try {
        databaseMechanics = await loadInflictionMechanicsFromSupabase();
    } catch (error) {
        console.error("Infliction mechanics could not be loaded from Supabase. Arts Burst simulation is disabled.", error);
        return false;
    }

    if (databaseMechanics.length === 0) {
        console.error("Supabase returned no Infliction mechanics. Arts Burst simulation is disabled.");
        return false;
    }

    replaceRegistryObject(INFLICTION_MECHANICS, databaseMechanics);
    console.info(`Infliction mechanics loaded from Supabase: ${databaseMechanics.length}`);
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

async function loadEffectDurationOverridesFromSupabase() {
    if (!supabaseClient) {
        throw new Error("Supabase client is not available. Cannot load effect duration overrides.");
    }

    const { data, error } = await supabaseClient
        .from("effect_duration_overrides")
        .select("*")
        .eq("game", "arknights_endfield")
        .order("operator_id", { ascending: true })
        .order("skill_id", { ascending: true })
        .order("effect_type", { ascending: true });

    if (error) throw error;

    return Array.isArray(data) ? data.map(mapDatabaseEffectDurationOverride) : [];
}

async function loadSimulationTriggerEventsFromSupabase() {
    if (!supabaseClient) {
        throw new Error("Supabase client is not available. Cannot load simulation trigger events.");
    }

    const { data, error } = await supabaseClient
        .from("simulation_trigger_events")
        .select("*")
        .eq("game", "arknights_endfield")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data.map(mapDatabaseSimulationTriggerEvent) : [];
}

async function hydrateSimulationTriggerEventsFromSupabase() {
    let databaseEvents = [];
    try {
        databaseEvents = await loadSimulationTriggerEventsFromSupabase();
    } catch (error) {
        console.info("Simulation trigger events are not available in Supabase yet.", error?.message || error);
        return false;
    }

    simulationTriggerEvents = databaseEvents;
    window.simulationTriggerEvents = simulationTriggerEvents;
    console.info(`Simulation trigger events loaded from Supabase: ${databaseEvents.length}`);
    return databaseEvents.length > 0;
}

async function loadSimulationActionRulesFromSupabase() {
    if (!supabaseClient) {
        throw new Error("Supabase client is not available. Cannot load simulation action rules.");
    }

    const { data, error } = await supabaseClient
        .from("simulation_action_rules")
        .select("*")
        .eq("game", "arknights_endfield")
        .eq("enabled", true)
        .order("priority", { ascending: true });

    if (error) throw error;
    return Array.isArray(data) ? data.map(mapDatabaseSimulationActionRule) : [];
}

async function hydrateSimulationActionRulesFromSupabase() {
    let databaseRules = [];
    try {
        databaseRules = await loadSimulationActionRulesFromSupabase();
    } catch (error) {
        console.info("Simulation action rules are not available in Supabase yet.", error?.message || error);
        return false;
    }

    simulationActionRules = databaseRules;
    window.simulationActionRules = simulationActionRules;
    console.info(`Simulation action rules loaded from Supabase: ${databaseRules.length}`);
    return databaseRules.length > 0;
}

async function loadOperatorPassiveRulesFromSupabase() {
    if (!supabaseClient) throw new Error("Supabase client is not available. Cannot load operator passive rules.");
    const { data, error } = await supabaseClient
        .from("operator_passive_rules")
        .select("*")
        .eq("game", "arknights_endfield")
        .eq("enabled", true)
        .order("priority", { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data.map(mapDatabaseOperatorPassiveRule) : [];
}

async function hydrateOperatorPassiveRulesFromSupabase() {
    try {
        operatorPassiveRules = await loadOperatorPassiveRulesFromSupabase();
        window.operatorPassiveRules = operatorPassiveRules;
        console.info(`Operator passive rules loaded from Supabase: ${operatorPassiveRules.length}`);
        return operatorPassiveRules.length > 0;
    } catch (error) {
        console.info("Operator passive rules are not available in Supabase yet.", error?.message || error);
        operatorPassiveRules = [];
        window.operatorPassiveRules = operatorPassiveRules;
        return false;
    }
}

async function loadOperatorFormsFromSupabase() {
    if (!supabaseClient) throw new Error("Supabase client is not available. Cannot load operator forms.");

    const [
        { data: formRows, error: formError },
        { data: variantRows, error: variantError },
        basicAttackRows
    ] = await Promise.all([
        supabaseClient
            .from("operator_forms")
            .select("*")
            .eq("game", "arknights_endfield")
            .eq("enabled", true)
            .order("priority", { ascending: true }),
        supabaseClient
            .from("operator_form_action_variants")
            .select("*")
            .eq("game", "arknights_endfield")
            .eq("enabled", true)
            .order("priority", { ascending: true }),
        loadBasicAttackSequencesFromSupabase()
    ]);

    if (formError) throw formError;
    if (variantError) throw variantError;
    const mappedVariants = Array.isArray(variantRows)
        ? variantRows.map(mapDatabaseOperatorFormActionVariant)
        : [];
    const basicAttackConfigs = buildBasicAttackConfigs(basicAttackRows);

    basicAttackConfigs.forEach((config, key) => {
        const [operatorIdValue, ...formParts] = key.split(":");
        const formKey = formParts.join(":");
        if (!formKey || formKey === "base") return;

        const existing = mappedVariants.find(variant =>
            Number(variant.operatorId) === Number(operatorIdValue)
            && variant.formKey === formKey
            && variant.actionKey === "basic_attack"
        );
        if (existing) {
            existing.actionOverride = config;
            return;
        }

        mappedVariants.push({
            formKey,
            operatorId: Number(operatorIdValue),
            actionKey: "basic_attack",
            actionOverride: config,
            priority: 0,
            enabled: true,
            verified: config.timingVerified === true,
            sourceUrl: "",
            sourceNote: "operator_basic_attack_sequences"
        });
    });

    return {
        forms: Array.isArray(formRows) ? formRows.map(mapDatabaseOperatorForm) : [],
        variants: mappedVariants
    };
}

async function loadBasicAttackSequencesFromSupabase(operatorIds = null) {
    if (!supabaseClient) {
        throw new Error("Supabase client is not available. Cannot load Basic Attack sequences.");
    }

    let query = supabaseClient
        .from("operator_basic_attack_sequences")
        .select("*")
        .eq("game", "arknights_endfield")
        .order("operator_id", { ascending: true })
        .order("form_key", { ascending: true })
        .order("sequence_index", { ascending: true });

    if (Array.isArray(operatorIds) && operatorIds.length > 0) {
        query = query.in("operator_id", operatorIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

async function hydrateOperatorFormsFromSupabase() {
    let databaseData;
    try {
        databaseData = await loadOperatorFormsFromSupabase();
    } catch (error) {
        console.info("Operator forms are not available in Supabase yet.", error?.message || error);
        return false;
    }

    operatorForms = databaseData.forms;
    operatorFormActionVariants = databaseData.variants;
    window.operatorForms = operatorForms;
    window.operatorFormActionVariants = operatorFormActionVariants;
    console.info(`Operator forms loaded from Supabase: ${operatorForms.length}; variants: ${operatorFormActionVariants.length}`);
    return operatorForms.length > 0;
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

    const visibleOperatorRows = operatorRows.filter(row => row.is_visible !== false);
    if (visibleOperatorRows.length === 0) {
        throw new Error("Supabase returned no visible operator data.");
    }

    const operatorIds = visibleOperatorRows.map(row => row.id);
    const [
        { data: skillRows, error: skillError },
        basicAttackRows
    ] = await Promise.all([
        supabaseClient
            .from("operator_skills")
            .select("*")
            .in("operator_id", operatorIds)
            .order("operator_id", { ascending: true })
            .order("slot_index", { ascending: true }),
        loadBasicAttackSequencesFromSupabase(operatorIds)
    ]);

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

    const basicAttackConfigs = buildBasicAttackConfigs(basicAttackRows);
    const operators = visibleOperatorRows.map(row => mapDatabaseOperator(
        row,
        skillsByOperatorId.get(row.id) || [],
        basicAttackConfigs.get(getBasicAttackConfigKey(row.id, "base")) || null
    ));

    let effectDurationOverrides = [];
    try {
        effectDurationOverrides = await loadEffectDurationOverridesFromSupabase();
    } catch (error) {
        console.info(
            "Effect duration overrides are not available in Supabase yet. Using operator skill raw data durations.",
            error?.message || error
        );
    }

    return applyEffectDurationOverridesToOperators(operators, effectDurationOverrides);
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

function mapDatabaseGearItem(row) {
    return {
        key: row.gear_key,
        category: row.category,
        name: row.name,
        setKey: row.set_key,
        rarity: row.rarity,
        mainStat: row.main_stat,
        mainValue: Number(row.main_value) || 0,
        subStat: row.sub_stat,
        subValue: Number(row.sub_value) || 0,
        secStat: row.sec_stat,
        secValue: Number(row.sec_value) || 0,
        defValue: Number(row.def_value) || 0,
        icon: row.icon
    };
}

async function loadGearSetsFromSupabase() {
    if (!supabaseClient) throw new Error("Supabase client is not available. Cannot load gear sets.");
    const { data, error } = await supabaseClient
        .from("gear_sets")
        .select("*")
        .order("set_key", { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data : [];
}

async function loadGearItemsFromSupabase() {
    if (!supabaseClient) throw new Error("Supabase client is not available. Cannot load gear items.");
    const { data, error } = await supabaseClient
        .from("gear_items")
        .select("*")
        .order("name", { ascending: true });
    if (error) throw error;
    return Array.isArray(data) ? data.map(mapDatabaseGearItem) : [];
}

async function hydrateGearFromSupabase() {
    let setsData = [];
    let itemsData = [];
    try {
        setsData = await loadGearSetsFromSupabase();
        itemsData = await loadGearItemsFromSupabase();
    } catch (error) {
        console.info("Supabase gear data is not available yet; using local defaults.", error?.message || error);
        return false;
    }
    if (!setsData.length || !itemsData.length) return false;

    // Build temporary databases
    const newSets = {};
    setsData.forEach(row => {
        newSets[row.set_key] = {
            name: row.name,
            description: row.description
        };
    });

    const newGear = {
        gloves: [],
        armor: [],
        kits: []
    };
    itemsData.forEach(item => {
        if (newGear[item.category]) {
            newGear[item.category].push(item);
        }
    });

    // Safely mutate global constants to preserve references across modules
    if (typeof SET_BONUS_DATABASE !== "undefined") {
        Object.keys(SET_BONUS_DATABASE).forEach(k => delete SET_BONUS_DATABASE[k]);
        Object.assign(SET_BONUS_DATABASE, newSets);
    }
    if (typeof GEAR_DATABASE !== "undefined") {
        Object.keys(GEAR_DATABASE).forEach(k => delete GEAR_DATABASE[k]);
        Object.assign(GEAR_DATABASE, newGear);
    }

    console.info(`Ausrüstung erfolgreich aus Supabase geladen: ${setsData.length} Sets, ${itemsData.length} Items.`);
    return true;
}

window.hydrateGearFromSupabase = hydrateGearFromSupabase;
