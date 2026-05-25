const chen = {
    id: 14,
    name: "Chen Qianyu",
    star: 5,
    operatorClass: "Guard",
    icon: "assets/operators/avatars/Chen.png",
    elementType: "physical"
};

chen.skills = [
    {
        id: (chen.id * 100) + 1,
        name: "Soaring Break",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "physical",
        description: "Physical Final Strike.",
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
        name: "Ascending Strike",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        sp_cost: 100,
        elementType: "physical",
        description: "Deals Physical DMG, applies Lift, and contributes Vulnerable pressure.",
        debuffs: [
            {
                id: "lift",
                name: "Lift",
                appliesEffect: "lift",
                persistsForCombo: false,
                visible: true
            },
            {
                id: "vulnerable",
                name: "Vulnerable",
                appliesEffect: "vulnerable",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4
            }
        ]
    },

    {
    id: (chen.id * 100) + 3,
    name: "Soar to the Stars",
    allowSelfTrigger: false,
    icon: chen.icon,
    iconSmall: "assets/operators/skills/chen/cs_small.png",
    type: "Combo Skill",
    shortType: "CS",
    cooldown: 16,
    energy: 0,
    elementType: "physical",
    comboTriggerMode: "all",
    description: "Triggers when an enemy becomes Vulnerable. Dashes through the enemy, deals Physical DMG, and applies Lift.",
    comboTriggers: [
        {
            effect: "vulnerable",
            minStacks: 1
        }
    ],
    debuffs: [
        {
            id: "lift",
            name: "Lift",
            appliesEffect: "lift",
            persistsForCombo: false,
            visible: true
        }
    ]
},

    {
        id: (chen.id * 100) + 4,
        name: "Blade Gale",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 70,
        elementType: "physical",
        description: "Performs a 7-sequence Physical slash attack. The final slash deals increased damage."
    }
];
