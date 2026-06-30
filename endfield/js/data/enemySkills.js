const enemies = [
    trainingDummy,
    heatAttacker,
    frostAttacker,
    electricAttacker,
    physicalAttacker,
    bossDummy
];

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
        resistanceMultipliers: {
            ...DEFAULT_ENEMY_COMBAT_PROFILE.resistanceMultipliers,
            ...(configured.resistanceMultipliers || {})
        }
    };
}

let selectedEnemyId = localStorage.getItem("selectedEnemyId") || "training_dummy";
let enemySkillSourceSortable = null;

function getSelectedEnemy() {
    return enemies.find(enemy => enemy.id === selectedEnemyId) || enemies[0];
}

function setSelectedEnemy(enemyId) {
    selectedEnemyId = enemyId;
    localStorage.setItem("selectedEnemyId", enemyId);
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
