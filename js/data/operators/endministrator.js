const endministrator = {
    id: 3,
    name: "Endministrator",
    icon: "assets/operators/avatars/Endmin.png",
    skills: [
        {
            id: 301,
            name: "Destructive Sequence",
            icon: "assets/operators/skills/endmin/fs.png",
            iconSmall: "assets/operators/skills/endmin/fs_small.png",
            type: "Final Strike",
            cooldown: 0,
            energy: 0,
            description: "Massiver AoE Schaden.",
            elementType: "physical",
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
            id: 302,
            name: "Constructive Sequence",
            icon: "assets/operators/skills/endmin/bs.png",
            iconSmall: "assets/operators/skills/endmin/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Summons a Magma Fragment to continuously attack enemies and deal Heat DMG. Hitting the enemy grants 1 stack of Melting Flame. If Laevatain already has 4 stack(s) of Melting Flame when casting the skill, then consume all the stacks and perform 1 additional attack that deals Heat DMG and forcibly trigger temporary Combustion to all enemies in a large area. When the additional attack hits the enemy, restore additional Ultimate Energy. Battle skill effects are enhanced while Laevatain's ultimate is active.",
        }
        ,
        {
            id: 303,
            name: "Sealing Sequence",
            icon: "assets/operators/skills/endmin/cs.png",
            iconSmall: "assets/operators/skills/endmin/cs_small.png",
            type: "Combo Skil",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Laevatain summons her Sviga Lævi and becomes the controlled operator. For a certain duration, her basic attacks (BATK) are enhanced and the Sviga Lævi strikes together with Laevatain, with each attack dealing Heat DMG. BATK sequence 3 also applies Heat Infliction.",
            comboTriggers: ["combo_skill"],
        },
        {
            id: 304,
            name: "Bombardment Sequence",
            icon: "assets/operators/skills/endmin/ult.png",
            iconSmall: "assets/operators/skills/endmin/ult_small.png",
            elementType: "physical",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            description: "Massiver AoE Schaden."
        }
    ]
}