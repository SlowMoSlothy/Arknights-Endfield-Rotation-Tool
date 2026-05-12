const xaihi = {
    id: 25,
    name: "Xaihi",
    star: 5,
    operatorClass: "Supporter",
    icon: "assets/operators/avatars/Xaihi.png",
    elementType: "cryo"
};

xaihi.skills = [
    {
        id: (xaihi.id * 100) + 1,
        name: "Cooldown",
        icon: xaihi.icon,
        iconSmall: "assets/operators/skills/xaihi/fs_small.png",
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
        id: (xaihi.id * 100) + 2,
        name: "Distributed DoS",
        icon: xaihi.icon,
        iconSmall: "assets/operators/skills/xaihi/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "cryo",
        description: "Summons Auxiliary Crystal. Provides HP Treatment after Final Strike and grants Arts Amp if HP is full.",
        buffs: [
            {
    id: "auxiliary_crystal",
    name: "Auxiliary Crystal",
    appliesEffect: "auxiliary_crystal",
    persistsForCombo: true,
    visible: true,
    stackable: true,
    stacksApplied: 2,
    maxStacks: 2
},
            {
                id: "arts_amp",
                name: "Arts Amp",
                appliesEffect: "arts_amp",
                persistsForCombo: true,
                visible: true,
                iconBase: "assets/buffs/arts_amp"
            }
        ]
    },

    {
        id: (xaihi.id * 100) + 3,
        name: "Stress Testing",
        icon: xaihi.icon,
        iconSmall: "assets/operators/skills/xaihi/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 8,
        energy: 0,
        elementType: "cryo",
        description: "Triggers when Auxiliary Crystal uses up its HP treatments. Applies Cryo Infliction.",
        comboTriggerMode: "all",
        allowSelfTrigger: true,
        comboTriggers: [
            { effect: "auxiliary_crystal_used_up", minStacks: 1 }
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
        id: (xaihi.id * 100) + 4,
        name: "Protocol: Chilling Wind",
        icon: xaihi.icon,
        iconSmall: "assets/operators/skills/xaihi/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 80,
        elementType: "cryo",
        description: "Cryo support Ultimate. Grants Cryo/Arts-related team support.",
        buffs: [
            {
                id: "cryo_amp",
                name: "Cryo Amp",
                appliesEffect: "cryo_amp",
                persistsForCombo: true,
                visible: true,
                iconBase: "assets/buffs/cryo_amp"
            }
        ]
    }
];
