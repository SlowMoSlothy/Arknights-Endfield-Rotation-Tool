const tangtang = {
    id: 15,
    name: "Tangtang",
    icon: "assets/operators/avatars/Tangtang.png"
};

tangtang.skills = [
    {
        id: (tangtang.id * 100) + 1,
        name: "Final Strike",
        icon: tangtang.icon,
        iconSmall: "assets/operators/skills/tangtang/65px-Attack-Guns.webp",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "cryo",
        description: "Final Strike.",
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
        id: (tangtang.id * 100) + 2,
        name: "IMA WAVERIDAAH!",
        icon: tangtang.icon,
        iconSmall: "assets/operators/skills/tangtang/65px-Skill-Tangtang.webp",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 60,
        elementType: "cryo",
        description: "Applies Cryo Infliction.",
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
        id: (tangtang.id * 100) + 3,
        name: "RIVER, TO ME!",
        icon: tangtang.icon,
        iconSmall: "assets/operators/skills/tangtang/65px-Combo-Tangtang.webp",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 0,
        energy: 0,
        elementType: "cryo",
        description: "Triggers on Cryo Infliction or Cryo Burst. Adds Arts Susceptibility.",
        comboTriggerMode: "all",
        comboTriggers: [
            {
                anyOf: [
                    { effect: "cryo_infliction", minStacks: 1 },
                    { effect: "cryo_burst", minStacks: 1 }
                ]
            }
        ],
        buffs: [
            {
                id: "whirlpool",
                name: "Whirlpool",
                appliesEffect: "whirlpool",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 2,
                iconBase: "assets/buffs/tangtang/whirlpool"
            }
        ],
        debuffs: [
            {
                id: "arts_susceptibility",
                name: "Arts Susceptibility",
                appliesEffect: "arts_susceptibility",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4,
                iconBase: "assets/debuffs/arts_susceptibility"
            }
        ]
    },
    {
        id: (tangtang.id * 100) + 4,
        name: "Ultimate",
        icon: tangtang.icon,
        iconSmall: "assets/operators/skills/tangtang/65px-Ult-Tangtang.webp",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 100,
        elementType: "cryo",
        description: "Cryo Ultimate.",
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
            },
            {
                id: "cryo_burst",
                name: "Cryo Burst",
                appliesEffect: "cryo_burst",
                persistsForCombo: false,
                visible: false
            }
        ]
    }
];