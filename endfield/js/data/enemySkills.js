// Enemy definitions come exclusively from public.enemies in Supabase.
const enemies = [];
let enemyCatalogState = "loading";
let enemyCatalogError = "";
// Compatibility aliases only: old saved rotations used these keys.
const LEGACY_ENEMY_KEYS = ['training_dummy', 'heat_attacker', 'frost_attacker', 'electric_attacker', 'physical_attacker', 'boss_dummy'];
function resolveEnemyId(id) {
    const index = LEGACY_ENEMY_KEYS.indexOf(String(id));
    return index < 0 ? String(id || "") : `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
}
function safeEnemyImage(value) {
    const fallback = "/favicon-flat.png";
    if (!value) return fallback;
    try {
        const url = new URL(value, "https://rotationforge.gg/endfield/");
        return url.protocol === "https:" && ["rotationforge.gg", "ftssllxdkqvmlxhfeqmy.supabase.co"].includes(url.hostname) ? url.href : fallback;
    } catch { return fallback; }
}
function mapDatabaseEnemy(row) {
    const skills = (Array.isArray(row.skills) ? row.skills : []).map(skill => ({
        ...skill, name: String(skill.name || "Ability"),
        icon: safeEnemyImage(skill.icon || row.avatar_url),
        iconSmall: safeEnemyImage(skill.iconSmall || skill.icon || row.avatar_url),
        type: "Enemy Skill", shortType: "Enemy", isEnemySkill: true
    }));
    const multipliers = Object.fromEntries(Object.entries(row.resistances || {}).filter(([key, value]) =>
        ['physical','heat','cryo','electric','nature','aether','neutral'].includes(key) && typeof value === "number" && Number.isFinite(value) && value >= 0));
    return {
        id: row.id, name: String(row.name), description: String(row.description || ""),
        icon: safeEnemyImage(row.avatar_url),
        enemyRank: ['normal','elite','boss','test'].includes(row.category) ? row.category : 'normal',
        enemyType: 'neutral', skills,
        combatProfile: { defense: typeof row.defense === 'number' && Number.isFinite(row.defense) && row.defense >= 0 ? row.defense : null,
            resistanceMultipliers: multipliers, verified: false, sourceUrl: row.source_url || '', sourceLabel: "Enemy Database" }
    };
}
async function loadEnemyDatabase(client = supabaseClient) {
    if (!client) throw new Error("Enemy Database is unavailable.");
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
        const {data, error} = await client.from('enemies').select('*').eq('is_visible', true).order('id').range(offset, offset + 999);
        if (error || !Array.isArray(data)) throw new Error(error?.message || "Invalid enemy response");
        rows.push(...data.filter(row => row.is_visible === true));
        if (data.length < 1000) break;
    }
    const mapped = rows.map(mapDatabaseEnemy);
    const skillIds = new Set();
    for (const enemy of mapped) for (const skill of enemy.skills) {
        if (!Number.isSafeInteger(skill.id) || skill.id <= 0) continue;
        if (skillIds.has(skill.id)) throw new Error("Duplicate enemy ability ID");
        skillIds.add(skill.id);
    }
    return mapped.sort((a,b) => a.name.localeCompare(b.name));
}
let enemyCatalogRequest = null;
async function hydrateEnemyDatabaseFromSupabase() {
    if (enemyCatalogRequest) return enemyCatalogRequest;
    enemyCatalogState = "loading";
    enemyCatalogRequest = (async () => {
        try {
            const loaded = await loadEnemyDatabase();
            enemies.splice(0, enemies.length, ...loaded);
            selectedEnemyId = resolveEnemyId(selectedEnemyId);
            enemyCatalogState = "ready"; enemyCatalogError = "";
            return true;
        } catch (error) {
            enemies.splice(0, enemies.length);
            enemyCatalogState = "error"; enemyCatalogError = "Could not load enemies. Please retry.";
            console.error("Enemy Database load failed:", error);
            return false;
        } finally { enemyCatalogRequest = null; }
    })();
    return enemyCatalogRequest;
}

const DEFAULT_ENEMY_COMBAT_PROFILE = Object.freeze({
    defense: 100,
    resistanceMultipliers: Object.freeze({
        physical: 1,
        heat: 1,
        cryo: 1,
        electric: 1,
        nature: 1,
        neutral: 1
    }),
    sourceLabel: "Endfield default enemy defense",
    sourceUrl: "https://endfield.wiki.gg/wiki/Damage_calculation"
});

function getEnemyCombatProfile(enemy = getSelectedEnemy()) {
    const configured = enemy?.combatProfile || {};
    return {
        ...DEFAULT_ENEMY_COMBAT_PROFILE,
        ...configured,
        defense: configured.defense ?? DEFAULT_ENEMY_COMBAT_PROFILE.defense,
        resistanceMultipliers: {
            ...DEFAULT_ENEMY_COMBAT_PROFILE.resistanceMultipliers,
            ...(configured.resistanceMultipliers || {})
        }
    };
}

let selectedEnemyId = localStorage.getItem("selectedEnemyId") || "training_dummy";
let enemySkillSourceSortable = null;

function getSelectedEnemy() {
    return enemies.find(enemy => enemy.id === resolveEnemyId(selectedEnemyId));
}

function setSelectedEnemy(enemyId) {
    selectedEnemyId = resolveEnemyId(enemyId);
    localStorage.setItem("selectedEnemyId", selectedEnemyId);
}

function getEnemySkillById(id) {
    for (const enemy of enemies) {
        const skill = enemy.skills.find(skill => skill.id === id);
        if (skill) {
            return {
                ...skill,
                operator: enemy.name,
                enemyName: enemy.name,
                isEnemySkill: true
            };
        }
    }
    return null;
}

function getEnemyBySkillId(skillId) {
    for (const enemy of enemies) {
        if (enemy.skills.some(skill => skill.id === skillId)) {
            return {
                id: `enemy_${enemy.id}`,
                name: enemy.name,
                isEnemy: true
            };
        }
    }
    return null;
}

window.getEnemyCombatProfile = getEnemyCombatProfile;
