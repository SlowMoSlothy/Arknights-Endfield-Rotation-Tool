const chen = {
    id: 14,
    name: "Chen Qianyu",
    icon: "assets/operators/avatars/Chen.png"
};

chen.skills = [
    {
        id: (chen.id * 100) + 1,
        name: "Basic Tactics",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "physical",
        debuffs: [
            {
                id: "final_strike",
                name: "Final Strike",
                appliesEffect: "final_strike",
                persistsForCombo: false,
                visible: false
            }
        ]
    },

    {
        id: (chen.id * 100) + 2,
        name: "Rigid Interdiction",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 60,
        elementType: "physical",
        description: "Applies Vulnerable.",
        debuffs: [
            {
                id: "vulnerable",
                name: "Vulnerable",
                appliesEffect: "vulnerable",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4,
                iconBase: "assets/debuffs/vulnerable"
            }
        ]
    },

    {
        id: (chen.id * 100) + 3,
        name: "Timely Suppression",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 0,
        energy: 0,
        elementType: "physical",
        description: "Triggers when enemy is Lifted.",
        comboTriggerMode: "all",
        comboTriggers: [
            { effect: "lift", minStacks: 1 }
        ]
    },

    {
        id: (chen.id * 100) + 4,
        name: "Textbook Assault",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 60,
        elementType: "physical",
        description: "Applies Lift.",
        debuffs: [
            {
                id: "lift",
                name: "Lift",
                appliesEffect: "lift",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/lift"
            }
        ]
    }
];