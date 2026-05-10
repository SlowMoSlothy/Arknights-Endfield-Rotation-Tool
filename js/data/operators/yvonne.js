const yvonne = {
    id: 26,
    name: "Yvonne",
    icon: "assets/operators/avatars/Yvonne.png",
    elementType: "cryo"
};

yvonne.skills = [
    {
        id: (yvonne.id * 100) + 1,
        name: "Exuberant Trigger",
        icon: yvonne.icon,
        iconSmall: "assets/operators/skills/yvonne/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "cryo",
        description: "Cryo Final Strike. Does not directly apply Cryo Infliction.",
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
        id: (yvonne.id * 100) + 2,
        name: "Brr-Brr-Bomb β",
        icon: yvonne.icon,
        iconSmall: "assets/operators/skills/yvonne/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "cryo",
        description: "Consumes Cryo Infliction or Nature Infliction to apply Solidification.",
        consumeDebuffs: [
            "cryo_infliction",
            "nature_infliction"
        ],
        debuffs: [
            {
                id: "solidification",
                name: "Solidification",
                appliesEffect: "solidification",
                persistsForCombo: true,
                visible: true,
                stackable: false,
                iconBase: "assets/debuffs/solidification"
            }
        ],
        buffs: [
            {
                id: "yvonne_next_attack_final_strike",
                name: "Next Attack Final Strike",
                appliesEffect: "yvonne_next_attack_final_strike",
                persistsForCombo: true,
                visible: false,
                stackable: false,
                iconBase: "assets/buffs/final_strike"
            }
        ]
    },

    {
        id: (yvonne.id * 100) + 3,
        name: "Flashfreezer υ37",
        icon: yvonne.icon,
        iconSmall: "assets/operators/skills/yvonne/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 20,
        energy: 0,
        elementType: "cryo",
        description: "Triggers when the controlled operator performs a Final Strike on an enemy with Solidification.",
        comboTriggerMode: "all",
        comboTriggers: [
            { effect: "final_strike", minStacks: 1 },
            { effect: "solidification", minStacks: 1 }
        ],
        allowSelfTrigger: true,
        debuffs: [
            {
                id: "pull",
                name: "Pull",
                appliesEffect: "pull",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/pull"
            },
            {
                id: "solidification",
                name: "Solidification",
                appliesEffect: "solidification",
                persistsForCombo: true,
                visible: true,
                stackable: false,
                iconBase: "assets/debuffs/solidification"
            }
        ]
    },

    {
        id: (yvonne.id * 100) + 4,
        name: "Cryoblasting Pistolier",
        icon: yvonne.icon,
        iconSmall: "assets/operators/skills/yvonne/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 220,
        elementType: "cryo",
        description: "Enhanced attack state. Enhanced Final Strike can consume Solidification for an additional Cryo attack.",
        debuffs: [
            {
                id: "final_strike",
                name: "Final Strike",
                appliesEffect: "final_strike",
                persistsForCombo: false,
                visible: false
            }
        ],
        consumeDebuffs: [
            "solidification"
        ]
    }
];