const dapan = {
    id: 16,
    name: "Da Pan",
    icon: "assets/operators/avatars/Dapan.png",
    elementType: "physical"
};

dapan.skills = [
    {
        id: (dapan.id * 100) + 1,
        name: "ROLLING CUT!",
        icon: dapan.icon,
        iconSmall: "assets/operators/skills/dapan/fs_small.png",
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
        id: (dapan.id * 100) + 2,
        name: "FLIP DA WOK!",
        icon: dapan.icon,
        iconSmall: "assets/operators/skills/dapan/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "physical",
        description: "Deals Physical DMG and applies Lift plus 1 Vulnerable stack.",
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
        id: (dapan.id * 100) + 3,
        name: "MORE SPICE!",
        icon: dapan.icon,
        iconSmall: "assets/operators/skills/dapan/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 20,
        energy: 0,
        elementType: "physical",
        description: "Triggers at 4 Vulnerable stacks. Consumes Vulnerable and applies Crush.",
        comboTriggerMode: "all",
        allowSelfTrigger: true,
        comboTriggers: [
            { effect: "vulnerable", minStacks: 4 }
        ],
        consumeDebuffs: [
            "vulnerable"
        ],
        debuffs: [
            {
                id: "crush",
                name: "Crush",
                appliesEffect: "crush",
                persistsForCombo: false,
                visible: true
            }
        ]
    },
    {
        id: (dapan.id * 100) + 4,
        name: "CHOP N DUNK!",
        icon: dapan.icon,
        iconSmall: "assets/operators/skills/dapan/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 15,
        energy: 90,
        elementType: "physical",
        description: "Applies Lift, Knock Down, and 4 Vulnerable stacks.",
        debuffs: [
            {
                id: "lift",
                name: "Lift",
                appliesEffect: "lift",
                persistsForCombo: false,
                visible: true
            },
            {
                id: "knock_down",
                name: "Knock Down",
                appliesEffect: "knock_down",
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
                stacksApplied: 4,
                maxStacks: 4
            }
        ]
    }
];