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
        icon: row.icon_path || raw.icon,
        canEnterUltimateState: row.can_enter_ultimate_state ?? raw.canEnterUltimateState,
        elementType: row.element_type || raw.elementType,
        skills: skillRows.map(mapDatabaseSkill)
    };
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
