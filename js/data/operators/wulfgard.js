const wulfgard = {
    id: 24,
    name: "Wulfgard",
    icon: "assets/operators/avatars/Wulfgard.png",
    elementType: "heat"
};

wulfgard.skills = [
    {
        id: (wulfgard.id * 100) + 1,
        name: "Rapid Fire Akimbo",
        icon: wulfgard.icon,
        iconSmall: "assets/operators/skills/wulfgard/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "heat",
        description: "Heat Final Strike.",
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
        id: (wulfgard.id * 100) + 2,
        name: "Thermite Tracers",
        icon: wulfgard.icon,
        iconSmall: "assets/operators/skills/wulfgard/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "heat",
        description: "Applies Heat Infliction. If Combustion or Electrification is active, consumes it instead for extra Heat DMG.",
        consumesEffects: [
            { effect: "combustion", amount: "all" },
            { effect: "electrification", amount: "all" }
        ],
        debuffs: [
            {
                id: "heat_infliction",
                name: "Heat Infliction",
                appliesEffect: "heat_infliction",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4,
                iconBase: "assets/debuffs/heat_infliction"
            }
        ]
    },

    {
        id: (wulfgard.id * 100) + 3,
        name: "Frag Grenade·β",
        icon: wulfgard.icon,
        iconSmall: "assets/operators/skills/wulfgard/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 20,
        energy: 0,
        elementType: "heat",
        description: "Triggers when an Arts Infliction is applied. Applies Heat Infliction.",
        comboTriggerMode: "any",
        comboTriggers: [
            { effect: "heat_infliction", minStacks: 1 },
            { effect: "cryo_infliction", minStacks: 1 },
            { effect: "nature_infliction", minStacks: 1 },
            { effect: "electric_infliction", minStacks: 1 }
        ],
        debuffs: [
            {
                id: "heat_infliction",
                name: "Heat Infliction",
                appliesEffect: "heat_infliction",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4,
                iconBase: "assets/debuffs/heat_infliction"
            }
        ]
    },

    {
        id: (wulfgard.id * 100) + 4,
        name: "Wolven Fury",
        icon: wulfgard.icon,
        iconSmall: "assets/operators/skills/wulfgard/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 90,
        elementType: "heat",
        description: "Deals Heat DMG and forcibly applies Combustion.",
        debuffs: [
            {
                id: "combustion",
                name: "Combustion",
                appliesEffect: "combustion",
                persistsForCombo: true,
                visible: true,
                iconBase: "assets/debuffs/combustion"
            }
        ]
    }
];