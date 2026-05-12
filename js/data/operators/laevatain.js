const laevatain = {
    id: 1,
    name: "Laevatain",
    star: 6,
    operatorClass: "Striker",
    icon: "assets/operators/avatars/Laevatain.png",
    elementType: "heat",
    skills: [
        {
            id: 101,
            name: "Flaming Cinders",
            icon: "assets/operators/avatars/Laevatain.png",
            iconSmall: "assets/operators/skills/laevatain/fs_small.png",
            type: "Final Strike",
            shortType: "FS",
            elementType: "heat",
            cooldown: 20,
            energy: 60,
            description: "Final Strike. Absorbs Heat Infliction and converts absorbed stacks into Melting Flame.",
            debuffs: [
                {
                    id: "final_strike",
                    name: "Final Strike",
                    appliesEffect: "final_strike",
                    persistsForCombo: false,
                    visible: false
                }
            ],
            consumeInflictionToBuff: {
                infliction: "heat_infliction",
                grantBuff: "melting_flames",
                buffName: "Melting Flame",
                ratio: 1,
                maxStacks: 4,
                visible: true,
                stackable: true,
                iconBase: "assets/ui/buffs/laevatain/melting_flames"
            }
        },
        {
            id: 102,
            name: "Smouldering Fire",
            icon: "assets/operators/avatars/Laevatain.png",
            iconSmall: "assets/operators/skills/laevatain/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            elementType: "heat",
            cooldown: 20,
            energy: 60,
            description: "Applies Heat Infliction and grants Melting Flame. At 4 Melting Flame, consumes all stacks and applies Combustion instead of the normal Heat Infliction.",
            buffs: [
                {
                    id: "melting_flames",
                    name: "Melting Flame",
                    appliesEffect: "melting_flames",
                    persistsForCombo: true,
                    visible: true,
                    stackable: true,
                    maxStacks: 4,
                    stacksApplied: 1,
                    iconBase: "assets/ui/buffs/laevatain/melting_flames"
                }
            ],
            debuffs: [
                {
                    id: "heat_infliction",
                    name: "Heat Infliction",
                    appliesEffect: "heat_infliction",
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4,
                    persistsForCombo: true,
                    iconBase: "assets/debuffs/heat_infliction"
                }
            ],
            conditionalDebuffs: [
                {
                    requiresBuffStacks: {
                        buff: "melting_flames",
                        minStacks: 4
                    },
                    consumeBuffStacks: {
                        buff: "melting_flames",
                        amount: 4
                    },
                    skipNormalBuffs: true,
                    skipNormalDebuffs: true,
                    debuffs: [
                        {
                            id: "combustion",
                            name: "Combustion",
                            appliesEffect: "combustion",
                            persistsForCombo: true,
                            visible: true,
                            stackable: false,
                            iconBase: "assets/debuffs/combustion"
                        }
                    ]
                }
            ]
        },
        {
            id: 103,
            name: "Seethe",
            icon: "assets/operators/avatars/Laevatain.png",
            iconSmall: "assets/operators/skills/laevatain/cs_small.png",
            type: "Combo Skill",
            shortType: "CS",
            elementType: "heat",
            cooldown: 10,
            energy: 60,
            description: "Triggers on Combustion or Corrosion.",
            comboTriggerMode: "all",
            comboTriggers: [
                {
                    anyOf: [
                        { effect: "combustion", minStacks: 1 },
                        { effect: "corrosion", minStacks: 1 }
                    ]
                }
            ],
            buffs: [
                {
                    id: "melting_flames",
                    name: "Melting Flame",
                    appliesEffect: "melting_flames",
                    persistsForCombo: true,
                    visible: true,
                    stackable: true,
                    maxStacks: 4,
                    stacksApplied: 1,
                    iconBase: "assets/ui/buffs/laevatain/melting_flames"
                }
            ]
        },
        {
            id: 104,
            name: "Twilight",
            icon: "assets/operators/avatars/Laevatain.png",
            iconSmall: "assets/operators/skills/laevatain/ult_small.png",
            type: "Ultimate",
            shortType: "Ult",
            elementType: "heat",
            cooldown: 20,
            energy: 60,
            description: "Ultimate"
        }
    ]
};
