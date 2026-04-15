const akekuri = {
    id: 2,
    name: "Akekuri",
    icon: "assets/operators/avatars/Akekuri.png",
    skills: [
        {
            id: 201,
            name: "Sword of Aspiration",
            icon: "assets/operators/skills/akekuri/fs.png",
            iconSmall: "assets/operators/skills/akekuri/fs_small.png",
            type: "FinalStrike",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Massiver AoE Schaden.",
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
            id: 202,
            name: "Burst of Passion",
            icon: "assets/operators/skills/akekuri/bs.png",
            iconSmall: "assets/operators/skills/akekuri/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            elementType: "heat",
            description: "Ein Hieb nach vorn, der Hitze-SDN und [heat] verursacht."
        },
        {
            id: 203,
            name: "Flash and Dash",
            icon: "assets/operators/skills/akekuri/cs.png",
            iconSmall: "assets/operators/skills/akekuri/cs_small.png",
            type: "ComboSkill",
            cooldown: 0,
            energy: 100,
            elementType: "physical",
            description: "Massiver AoE Schaden."
        },
        {
            id: 204,
            name: "SQUAD! ON ME!",
            icon: "assets/operators/skills/akekuri/ult.png",
            iconSmall: "assets/operators/skills/akekuri/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "heat",
            description: "Massiver AoE Schaden."
        }
    ]
}