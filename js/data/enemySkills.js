const enemies = [
    {
        id: "training_dummy",
        name: "Training Dummy",
        icon: "assets/enemies/training_dummy.png",
        description: "Generic test enemy for trigger validation.",
        skills: [
            {
                id: 900001,
                name: "Basic Attack",
                icon: "assets/enemies/skills/basic_attack.svg",
                iconSmall: "assets/enemies/skills/basic_attack.svg",
                type: "Enemy Skill",
                shortType: "Enemy",
                cooldown: 0,
                energy: 0,
                elementType: "enemy",
                isEnemySkill: true,
                description: "Enemy attacks the controlled operator. Used to trigger effects such as Ember's Combo Skill.",
                debuffs: [
                    {
                        id: "operator_attacked",
                        name: "Operator Attacked",
                        appliesEffect: "operator_attacked",
                        persistsForCombo: true,
                        visible: false
                    }
                ]
            }
        ]
    },
    {
        id: "heat_attacker",
        name: "Heat Attacker",
        icon: "assets/enemies/heat_attacker.png",
        description: "Enemy with Heat-themed attacks for future testing.",
        skills: [
            {
                id: 900101,
                name: "Scorching Hit",
                icon: "assets/enemies/skills/basic_attack.svg",
                iconSmall: "assets/enemies/skills/basic_attack.svg",
                type: "Enemy Skill",
                shortType: "Enemy",
                cooldown: 0,
                energy: 0,
                elementType: "heat",
                isEnemySkill: true,
                description: "Enemy attacks the controlled operator and applies operator_attacked.",
                debuffs: [
                    {
                        id: "operator_attacked",
                        name: "Operator Attacked",
                        appliesEffect: "operator_attacked",
                        persistsForCombo: true,
                        visible: false
                    }
                ]
            }
        ]
    }
];

let selectedEnemyId = localStorage.getItem("selectedEnemyId") || "training_dummy";
let enemySkillSourceSortable = null;

function getSelectedEnemy() {
    return enemies.find(enemy => enemy.id === selectedEnemyId) || enemies[0] || null;
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
