const laevatain = {
    id: 1,
    name: "Laevatain",
    icon: "assets/operators/avatars/Laevatain.png",
    skills: [
        {
            id: 101,
            name: "Flaming Cinders",
            icon: "assets/operators/avatars/Laevatain.png",
            iconSmall: "assets/operators/skills/laevatain/fs_small.png",
            type: "Final Strike",
            elementType: "heat",
            cooldown: 0,
            energy: 0,
            debuffs: [
                {
                    id: "final_strike",
                    name: "Final Strike",
                    appliesEffect: "final_strike",
                    persistsForCombo: false,
                    visible: false
                }
            ],
            description: "FS"     
        },
        {
            id: 102,
            name: "Smouldering Fire",
            icon: "assets/operators/avatars/Laevatain.png",
            iconSmall: "assets/operators/skills/laevatain/bs_small.png",
            type: "Battle Skill",
            elementType: "heat",
            cooldown: 20,
            energy: 60,
            description: "BS",
            buffs: [
                {
                    id: "melting_flames",
                    name: "Melting Flame",
                    appliesEffect: "Melting Flame",
                    stackable: true,
                    maxStacks: 4,
                    stacksApplied: 1,
                    iconBase: "assets/buffs/laevatain/melting_flames"
                }
            ],
            debuffs: [
        {
            id: "heat_infliction",
            name: "Heat Infliction",
            appliesEffect: "heat_infliction",

            visible: true,

            // 🔥 wichtig für Reactions
            stackable: true,
            stacksApplied: 1,
            maxStacks: 4,

            // 🔥 bleibt im System gespeichert
            persistsForCombo: true
        }
    ]
        }
        ,
        {
            id: 103,
            name: "Seethe",
            icon: "assets/operators/avatars/Laevatain.png",
            iconSmall: "assets/operators/skills/laevatain/cs_small.png",
            type: "Combo Skill",
            elementType: "heat",
            cooldown: 20,
            energy: 60,
            description: "CS",
            comboTriggers: ["Combustion", "Corrosion"],
            buffs: [
                {
                    id: "melting_flames",
                    name: "Melting Flame",
                    appliesEffect: "Melting Flame",
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
            elementType: "heat",
            cooldown: 20,
            energy: 60,
            description: "Ultimate"
        }
    ]
}