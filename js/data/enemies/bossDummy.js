const bossDummy = {
    id: "boss_dummy",
    name: "Boss Dummy",
    icon: "assets/enemies/training_dummy.svg",
    description: "Boss test enemy.",
    skills: [
        {
            id: 900501,
            name: "Boss Slam",
            icon: "assets/enemies/skills/boss_attack.svg",
            iconSmall: "assets/enemies/skills/boss_attack.svg",
            type: "Enemy Skill",
            shortType: "Enemy",
            elementType: "boss",
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