const chen = {
    id: 14,
    name: "Chen Qianyu",
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
        energy: 60,
        elementType: "physical",
        description: "Applies Lift.",
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
    id: (chen.id * 100) + 3,
    name: "Soar to the Stars",
    allowSelfTrigger: false,
    icon: chen.icon,
    iconSmall: "assets/operators/skills/chen/cs_small.png",
    type: "Combo Skill",
    shortType: "CS",
    cooldown: 20,
    energy: 0,
    elementType: "physical",
    comboTriggerMode: "all",
    description: "Triggers when enemy becomes Vulnerable.",
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
        energy: 60,
        elementType: "physical"
    }
];