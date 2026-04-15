const laevatain = {
    id: 1,
    name: "Laevatain",
    icon: "assets/operators/avatars/Laevatain.png",
    skills: [
        {
            id: 101,
            name: "Flaming Cinders",
            icon: "assets/operators/skills/laevatain/fs.png",
            iconSmall: "assets/operators/skills/laevatain/fs_small.png",
            type: "Final Strike",
            elementType: "heat",
            cooldown: 0,
            energy: 0,
            description: "An attack with up to 5 sequences that deals [heat]. As the controlled operator, Final Strike also deals 1 Stagger.",
            debuffs: [
                {
                    id: "final_strike",
                    name: "Final Strike",
                    appliesEffect: "final_strike",
                    visible: false
                }
            ]
        },
        {
            id: 102,
            name: "Smouldering Fire",
            icon: "assets/operators/skills/laevatain/bs.png",
            iconSmall: "assets/operators/skills/laevatain/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            description: "Summons a Magma Fragment to continuously attack enemies and deal Heat DMG. Hitting the enemy grants 1 stack of Melting Flame. If Laevatain already has 4 stack(s) of Melting Flame when casting the skill, then consume all the stacks and perform 1 additional attack that deals Heat DMG and forcibly trigger temporary Combustion to all enemies in a large area. When the additional attack hits the enemy, restore additional Ultimate Energy. Battle skill effects are enhanced while Laevatain's ultimate is active.",
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
        }
        ,
        {
            id: 103,
            name: "Seethe",
            icon: "assets/operators/skills/laevatain/cs.png",
            iconSmall: "assets/operators/skills/laevatain/cs_small.png",
            type: "Combo Skill",
            cooldown: 20,
            energy: 60,
            description: "Laevatain summons her Sviga Lævi and becomes the controlled operator. For a certain duration, her basic attacks (BATK) are enhanced and the Sviga Lævi strikes together with Laevatain, with each attack dealing Heat DMG. BATK sequence 3 also applies Heat Infliction.",
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
            icon: "assets/operators/skills/laevatain/ult.png",
            iconSmall: "assets/operators/skills/laevatain/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            description: "Massiver AoE Schaden."
        }
    ]
}