const laevatain = {
    id: 1,
    name: "Laevatain",
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
            cooldown: 0,
            energy: 0,
            description: "FS",
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
            id: 102,
            name: "Smouldering Fire",
            icon: "assets/operators/avatars/Laevatain.png",
            iconSmall: "assets/operators/skills/laevatain/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            elementType: "heat",
            cooldown: 20,
            energy: 60,
            description: "Applies Heat Infliction and grants Melting Flame.",
            buffs: [
                {
                    id: "melting_flames",
                    name: "Melting Flame",
                    appliesEffect: "melting_flames",
                    persistsForCombo: true,
                    visible: true,
                    stackable: true,
                    maxStacks: 4,
                    stacksApplied: 1
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
            cooldown: 20,
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
                    iconBase: "assets/buffs/laevatain/melting_flames"
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