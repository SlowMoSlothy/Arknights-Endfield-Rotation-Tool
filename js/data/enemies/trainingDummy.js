const trainingDummy = {
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
            elementType: "enemy",
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