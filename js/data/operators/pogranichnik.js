const pogranichnik = {
    id: 22,
    name: "Pogranichnik",
    star: 6,
    operatorClass: "Vanguard",
    icon: "assets/operators/avatars/Pogranichnik.png",
    elementType: "physical"
};

pogranichnik.skills = [
    {
        id: (pogranichnik.id * 100) + 1,
        name: "All-Out Offensive",
        icon: pogranichnik.icon,
        iconSmall: "assets/operators/skills/pogranichnik/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "physical",
        description: "Physical Final Strike. As controlled operator, Final Strike also deals Stagger.",
        debuffs: [
            {
                id: "final_strike",
                name: "Final Strike",
                appliesEffect: "final_strike",
                persistsForCombo: false,
                visible: false
            },
            {
                id: "stagger",
                name: "Stagger",
                appliesEffect: "stagger",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/stagger"
            }
        ]
    },

    {
        id: (pogranichnik.id * 100) + 2,
        name: "The Pulverizing Front",
        icon: pogranichnik.icon,
        iconSmall: "assets/operators/skills/pogranichnik/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 0,
        energy: 100,
        sp_cost: 100,
        elementType: "physical",
        description: "Performs 2 slashes, deals Physical DMG, applies Breach, and consumes Vulnerable stacks for SP recovery.",
        spRecovery: {
            effects: [
                "vulnerable"
            ],
            amountByStacks: {
                "1": 5,
                "2": 10,
                "3": 20,
                "4": 30
            },
            maxStacks: 4,
            source: "The Pulverizing Front"
        },
        consumeDebuffs: [
            "vulnerable"
        ],
        debuffs: [
            {
                id: "breach",
                name: "Breach",
                appliesEffect: "breach",
                persistsForCombo: false,
                visible: true,
                icon: "assets/ui/debuffs/breach.svg"
            }
        ]
    },

    {
        id: (pogranichnik.id * 100) + 3,
        name: "Full Moon Slash",
        icon: pogranichnik.icon,
        iconSmall: "assets/operators/skills/pogranichnik/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 18,
        energy: 0,
        elementType: "physical",
        description: "Triggers when Breach or Crush consumes Vulnerable stacks. Deals Physical DMG and recovers SP.",
        spRecovery: {
            effects: [
                "vulnerable"
            ],
            amountByStacks: {
                "1": 5,
                "2": 12,
                "3": 25,
                "4": 35
            },
            maxStacks: 4,
            fallbackStacks: 1,
            source: "Full Moon Slash"
        },
        comboTriggerMode: "all",
        allowSelfTrigger: true, 
        comboTriggers: [
            { effect: "vulnerable_consumed", minStacks: 1 },
            {
                anyOf: [
                    { effect: "breach", minStacks: 1 },
                    { effect: "crush", minStacks: 1 }
                ]
            }
        ]
    },

    {
        id: (pogranichnik.id * 100) + 4,
        name: "Shieldguard Banner, Forward",
        icon: pogranichnik.icon,
        iconSmall: "assets/operators/skills/pogranichnik/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 90,
        elementType: "physical",
        description: "Summons Shieldguards, generates Steel Oath, pushes enemies, deals Physical DMG, and reacts to Physical Status or Pogranichnik combo damage.",
        debuffs: [
            {
                id: "push",
                name: "Push",
                appliesEffect: "push",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/push"
            },
            {
                id: "steel_oath",
                name: "Steel Oath",
                appliesEffect: "steel_oath",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 5,
                maxStacks: 5,
                iconBase: "assets/buffs/steel_oath"
            }
        ]
    }
];
