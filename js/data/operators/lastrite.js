const lastrite = {
    id: 20,
    name: "Last Rite",
    star: 6,
    operatorClass: "Striker",
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
        description: "Final Strike. Applies Cryo Infliction only while Hypothermic Perfusion is active.",
        debuffs: [
            {
                id: "final_strike",
                name: "Final Strike",
                appliesEffect: "final_strike",
                persistsForCombo: false,
                visible: false
            }
        ],
        conditionalDebuffs: [
            {
                requiresBuff: "hypothermic_perfusion",
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
        sp_cost: 100,
        elementType: "cryo",
        description: "Applies Hypothermic Perfusion to the controlled operator's weapon and returns 30 SP. The next Final Strike within the duration creates Last Rite's Mirage, dealing Cryo DMG and applying Cryo Infliction.",
        spRecovery: {
            amount: 30,
            source: "Esoteric Legacy of Seš'qa"
        },
        buffs: [
            {
                id: "hypothermic_perfusion",
                name: "Hypothermic Perfusion",
                appliesEffect: "hypothermic_perfusion",
                persistsForCombo: true,
                visible: true,
                consumeOnSkillType: "final_strike",
                consumeStacks: 1
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
        cooldown: 9,
        energy: 0,
        elementType: "cryo",
        description: "Triggers when the enemy has at least 3 Cryo Infliction stacks. Consumes Cryo Infliction and applies Cryo Susceptibility.",
        comboTriggerMode: "all",
        comboTriggers: [
            { effect: "cryo_infliction", minStacks: 3 }
        ],
        allowSelfTrigger: true,
        consumeDebuffs: [
            "cryo_infliction"
        ],
        debuffs: [
            {
                id: "cryo_susceptibility",
                name: "Cryo Susceptibility",
                appliesEffect: "cryo_susceptibility",
                persistsForCombo: true,
                visible: true,
                stackable: false
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
                stackable: false
            }
        ]
    }
];
