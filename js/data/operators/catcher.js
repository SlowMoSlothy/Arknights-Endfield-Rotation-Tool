const catcher = {
    id: 13,
    name: "Catcher",
    icon: "assets/operators/avatars/Catcher.png",
    elementType: "physical"
};

catcher.skills = [
    {
        id: (catcher.id * 100) + 1,
        name: "Basic Tactics",
        icon: catcher.icon,
        iconSmall: "assets/operators/skills/catcher/fs_small.png",
        type: "Final Strike",
        cooldown: 20,
        energy: 60,
        debuffs: [
            {
                id: "final_strike",
                name: "Final Strike",
                appliesEffect: "final_strike",
                persistsForCombo: false,
                visible: false
            }
        ],
        elementType: "physical"
    },
    {
    id: (catcher.id * 100) + 2,
    name: "Rigid Interdiction",
    icon: catcher.icon,
    iconSmall: "assets/operators/skills/catcher/bs_small.png",
    type: "Battle Skill",
    shortType: "BS",
    cooldown: 20,
    energy: 100,
    elementType: "physical",
    description: "Raises a shield, grants Protection, returns SP, and can retaliate when attacked to apply Vulnerability.",
    buffs: [
        {
            id: "protection",
            name: "Protection",
            appliesEffect: "protection",
            persistsForCombo: true,
            visible: true,
            stackable: false
        },
        {
            id: "shield",
            name: "Shield",
            appliesEffect: "shield",
            persistsForCombo: true,
            visible: true,
            stackable: false
        }
    ]
},
    {
    id: (catcher.id * 100) + 3,
    name: "Timely Suppression",
    icon: catcher.icon,
    iconSmall: "assets/operators/skills/catcher/cs_small.png",
    type: "Combo Skill",
    shortType: "CS",
    cooldown: 35,
    energy: 0,
    elementType: "physical",
    description: "Triggers when an enemy starts charging a skill, or when the controlled operator is attacked and falls below 40% HP. Grants shield.",
    comboTriggerMode: "all",
    comboTriggers: [
    {
        anyOf: [
            { effect: "enemy_skill_charging", minStacks: 1 },
            { effect: "operator_attacked", minStacks: 1 }
        ]
    }
],
    buffs: [
        {
            id: "shield",
            name: "Shield",
            appliesEffect: "shield",
            persistsForCombo: true,
            visible: true,
            stackable: false
        }
    ]
},
    {
        id: (catcher.id * 100) + 4,
        name: "Textbook Assault",
        icon: catcher.icon,
        iconSmall: "assets/operators/skills/catcher/ult_small.png",
        type: "Ultimate",
        cooldown: 20,
        energy: 60,
        elementType: "physical"
    }
];