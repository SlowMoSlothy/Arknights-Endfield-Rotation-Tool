const akekuri = {
    id: 2,
    name: "Akekuri",
    icon: "assets/operators/avatars/Akekuri.png",
    elementType: "heat",
    skills: [
        {
            id: 201,
            name: "Sword of Aspiration",
            icon: "assets/operators/avatars/Akekuri.png",
            iconSmall: "assets/operators/skills/akekuri/fs_small.png",
            type: "Final Strike",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
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
            id: 202,
            name: "Burst of Passion",
            icon: "assets/operators/avatars/Akekuri.png",
            iconSmall: "assets/operators/skills/akekuri/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            elementType: "heat",
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
            description: "Ein Hieb nach vorn, der [heat] verursacht."
        },
        {
            id: 203,
            name: "Flash and Dash",
            icon: "assets/operators/avatars/Akekuri.png",
            iconSmall: "assets/operators/skills/akekuri/cs_small.png",
            type: "Combo Skill",
            cooldown: 0,
            energy: 100,
            elementType: "physical",
            description: "CS"
        },
        {
            id: 204,
            name: "SQUAD! ON ME!",
            icon: "assets/operators/avatars/Akekuri.png",
            iconSmall: "assets/operators/skills/akekuri/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "heat",
            description: "Ultimate"
        }
    ]
}