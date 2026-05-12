const estella = {
    id: 18,
    name: "Estella",
    star: 4,
    operatorClass: "Guard",
    icon: "assets/operators/avatars/Estella.png",
    elementType: "cryo"
};

estella.skills = [
    {
        id: (estella.id * 100) + 1,
        name: "Audio Noise",
        icon: estella.icon,
        iconSmall: "assets/operators/skills/estella/fs_small.png",
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
        id: (estella.id * 100) + 2,
        name: "Onomatopoeia",
        icon: estella.icon,
        iconSmall: "assets/operators/skills/estella/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "cryo",
        description: "Deals Cryo DMG and applies Cryo Infliction.",
        debuffs: [
            {
                id: "cryo_infliction",
                name: "Cryo Infliction",
                appliesEffect: "cryo_infliction",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4,
                iconBase: "assets/debuffs/cryo_infliction"
            }
        ]
    },

    {
        id: (estella.id * 100) + 3,
        name: "Distortion",
        icon: estella.icon,
        iconSmall: "assets/operators/skills/estella/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 18,
        energy: 0,
        elementType: "physical",
        description: "Triggers on Solidification. Applies Lift and Physical Susceptibility.",
        comboTriggerMode: "all",
        comboTriggers: [
            { effect: "solidification", minStacks: 1 }
        ],
        debuffs: [
            {
                id: "lift",
                name: "Lift",
                appliesEffect: "lift",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/lift"
            },
            {
                id: "physical_susceptibility",
                name: "Physical Susceptibility",
                appliesEffect: "physical_susceptibility",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4,
                iconBase: "assets/debuffs/physical_susceptibility"
            }
        ]
    },

    {
        id: (estella.id * 100) + 4,
        name: "Tremolo",
        icon: estella.icon,
        iconSmall: "assets/operators/skills/estella/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 70,
        elementType: "physical",
        description: "Deals AoE Physical DMG. Applies Lift to enemies with Physical Susceptibility.",
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
