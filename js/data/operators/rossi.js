const rossi = {
    id: 5,
    name: "Rossi",
    icon: "assets/operators/avatars/Rossi.png",
    skills: [
        {
            id: 501,
            name: "Seething Wolfblood",
            icon: "assets/operators/avatars/Rossi.png",
            iconSmall: "assets/operators/skills/rossi/fs_small.png",
            type: "FinalStrike",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Final Strike",
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
            id: 502,
            name: "Crimson Shadow",
            icon: "assets/operators/avatars/Rossi.png",
            iconSmall: "assets/operators/skills/rossi/bs_small.png",
            type: "BattleSkill",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "BS"
        },
        {
            id: 503,
            name: "Moment of Blazing Shadow",
            icon: "assets/operators/avatars/Rossi.png",
            iconSmall: "assets/operators/skills/rossi/cs_small.png",
            type: "cs",
            cooldown: 20,
            energy: 60,
            description: "CS"
        },
        {
            id: 504,
            name: '"Razorclaw" Ambuscade',
            icon: "assets/operators/avatars/Rossi.png",
            iconSmall: "assets/operators/skills/rossi/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "heat",
            description: "Ultimate"
        }
    ]
}