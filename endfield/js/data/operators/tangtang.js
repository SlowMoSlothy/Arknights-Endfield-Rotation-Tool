const tangtang = {
    id: 15,
    name: "Tangtang",
    star: 6,
    operatorClass: "Caster",
    icon: "assets/operators/avatars/Tangtang.png",
    elementType: "cryo"
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
        energy: 100,
        sp_cost: 100,
        elementType: "cryo",
        description: "Shoots Cryo waves that apply Cryo Infliction and can trigger Waterspouts from existing Whirlpools.",
        debuffs: [
            {
                id: "cryo_infliction",
                name: "Cryo Infliction",
                appliesEffect: "cryo_infliction",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4
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
        cooldown: 12,
        energy: 0,
        elementType: "cryo",
        description: "Triggers when applying Cryo Infliction or dealing Arts Burst DMG. Creates a Whirlpool.",
        comboTriggerMode: "any",
        allowSelfTrigger: true,
        comboTriggers: [
            { effect: "cryo_infliction", minStacks: 1 },
            { effect: "cryo_burst", minStacks: 1 }
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
                maxStacks: 2
            }
        ],
        debuffs: [
            {
                id: "slow",
                name: "Slow",
                appliesEffect: "slow",
                persistsForCombo: true,
                visible: true
            }
        ]
    },
    {
        id: (tangtang.id * 100) + 4,
        name: "DA CHIEF SEES YOU!",
        icon: tangtang.icon,
        iconSmall: "assets/operators/skills/tangtang/65px-Ult-Tangtang.webp",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 90,
        elementType: "cryo",
        description: "Creates OLDEN STARE, dealing Cryo DMG over time before a rogue wave crashes down for massive Cryo DMG.",
        debuffs: [
            {
                id: "cryo_infliction",
                name: "Cryo Infliction",
                appliesEffect: "cryo_infliction",
                persistsForCombo: true,
                visible: true,
                stackable: false,
                stacksApplied: 1,
                maxStacks: 4
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
