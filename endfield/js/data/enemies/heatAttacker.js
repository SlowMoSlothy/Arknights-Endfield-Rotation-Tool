const heatAttacker = {
    id: "heat_attacker",
    name: "Heat Attacker",
    icon: "assets/enemies/heat_attacker.png",
    description: "Enemy with Heat attacks.",
    skills: [
        {
            id: 900101,
            name: "Scorching Hit",
            icon: "assets/enemies/skills/heat_attack.svg",
            iconSmall: "assets/enemies/skills/heat_attack.svg",
            type: "Enemy Skill",
            shortType: "Enemy",
            elementType: "heat",
            isEnemySkill: true,
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
};