const snowshine = {
    id: 23,
    name: "Snowshine",
    icon: "assets/operators/avatars/Snowshine.png"
};

snowshine.skills = [
    {
        id: (snowshine.id * 100) + 1,
        name: "Hypothermic Assault",
        icon: snowshine.icon,
        iconSmall: "assets/operators/skills/snowshine/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "cryo",
        description: "Cryo Final Strike.",
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
        id: (snowshine.id * 100) + 2,
        name: "Saturated Defense",
        icon: snowshine.icon,
        iconSmall: "assets/operators/skills/snowshine/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "cryo",
        description: "Grants Protection. Retaliation applies Cryo Infliction.",
        buffs: [
            {
                id: "protect",
                name: "Protect",
                appliesEffect: "protect",
                persistsForCombo: true,
                visible: true,
                iconBase: "assets/buffs/protect"
            }
        ],
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
        id: (snowshine.id * 100) + 3,
        name: "Polar Rescue",
        icon: snowshine.icon,
        iconSmall: "assets/operators/skills/snowshine/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 25,
        energy: 0,
        elementType: "cryo",
        description: "Triggers after controlled operator is attacked and drops below 60% HP. Provides HP Treatment.",
        comboTriggerMode: "all",
        comboTriggers: [
            { effect: "operator_attacked_low_hp", minStacks: 1 }
        ],
        buffs: [
            {
                id: "hp_treatment",
                name: "HP Treatment",
                appliesEffect: "hp_treatment",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/buffs/hp_treatment"
            }
        ]
    },

    {
        id: (snowshine.id * 100) + 4,
        name: "Frigid Snowfield",
        icon: snowshine.icon,
        iconSmall: "assets/operators/skills/snowshine/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 80,
        elementType: "cryo",
        description: "Deals Cryo DMG and forcibly applies Solidification.",
        debuffs: [
            {
                id: "solidification",
                name: "Solidification",
                appliesEffect: "solidification",
                persistsForCombo: true,
                visible: true,
                iconBase: "assets/debuffs/solidification"
            }
        ]
    }
];