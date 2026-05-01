const lastrite = {
    id: 20,
    name: "Last Rite",
    icon: "assets/operators/avatars/Last_Rite.png",
    elementType: "cryo"
};

lastrite.skills = [
    {
        id: (lastrite.id * 100) + 1,
        name: "Dance of Rime",
        icon: lastrite.icon,
        iconSmall: "assets/operators/skills/lastrite/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "cryo",
        description: "Cryo Final Strike. Applies Cryo Infliction.",
        debuffs: [
            {
                id: "final_strike",
                name: "Final Strike",
                appliesEffect: "final_strike",
                persistsForCombo: false,
                visible: false
            },
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
        id: (lastrite.id * 100) + 2,
        name: "Esoteric Legacy of Seš'qa",
        icon: lastrite.icon,
        iconSmall: "assets/operators/skills/lastrite/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "cryo",
        description: "Buffs the next Final Strike with Last Rite's Mirages. The Mirage attack deals Cryo DMG and applies Cryo Infliction.",
        buffs: [
            {
                id: "hypothermic_perfusion",
                name: "Hypothermic Perfusion",
                appliesEffect: "hypothermic_perfusion",
                persistsForCombo: true,
                visible: true,
                consumeOnSkillType: "final_strike",
                iconBase: "assets/buffs/hypothermic_perfusion"
            }
        ]
    },

    {
        id: (lastrite.id * 100) + 3,
        name: "Winter's Devourer",
        icon: lastrite.icon,
        iconSmall: "assets/operators/skills/lastrite/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 0,
        energy: 0,
        elementType: "cryo",
        description: "Triggers when the enemy has at least 3 Cryo Infliction stacks. Consumes Cryo Infliction and applies Cryo Susceptibility.",
        comboTriggerMode: "all",
        comboTriggers: [
            { effect: "cryo_infliction", minStacks: 3 }
        ],
        consumesEffects: [
            {
                effect: "cryo_infliction",
                amount: "all"
            }
        ],
        debuffs: [
            {
                id: "cryo_susceptibility",
                name: "Cryo Susceptibility",
                appliesEffect: "cryo_susceptibility",
                persistsForCombo: true,
                visible: true,
                stackable: false,
                iconBase: "assets/debuffs/cryo_susceptibility"
            }
        ]
    },

    {
        id: (lastrite.id * 100) + 4,
        name: "Vigil Services",
        icon: lastrite.icon,
        iconSmall: "assets/operators/skills/lastrite/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 240,
        elementType: "cryo",
        description: "Deals massive Cryo DMG. Last Rite can only gain Ultimate Energy from her own Battle Skill and Combo Skill.",
        debuffs: [
            {
                id: "cryo_susceptibility",
                name: "Cryo Susceptibility",
                appliesEffect: "cryo_susceptibility",
                persistsForCombo: true,
                visible: true,
                stackable: false,
                iconBase: "assets/debuffs/cryo_susceptibility"
            }
        ]
    }
];