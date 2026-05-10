const frostAttacker = {
    id: "frost_attacker",
    name: "Frost Attacker",
    icon: "assets/enemies/frost_attacker.svg",
    description: "Enemy with Frost attacks.",
    skills: [
        {
            id: 900201,
            name: "Frozen Strike",
            icon: "assets/enemies/skills/frost_attack.svg",
            iconSmall: "assets/enemies/skills/frost_attack.svg",
            type: "Enemy Skill",
            shortType: "Enemy",
            elementType: "frost",
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