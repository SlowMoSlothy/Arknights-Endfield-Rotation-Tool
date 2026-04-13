const rossi = {
    id: 5,
    name: "Rossi",
    icon: "assets/operators/avatars/Rossi.png",
    skills: [
        {
            id: 501,
            name: "Seething Wolfblood",
            icon: "assets/operators/skills/rossi/fs.png",
            iconSmall: "assets/operators/skills/rossi/fs_small.png",
            type: "fs",
            cooldown: 20,
            energy: 60,
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
            id: 502,
            name: "Crimson Shadow",
            icon: "assets/operators/skills/rossi/bs.png",
            iconSmall: "assets/operators/skills/rossi/bs_small.png",
            type: "bs",
            cooldown: 20,
            energy: 60,
            description: "Massiver AoE Schaden."
        },
        {
            id: 503,
            name: "Moment of Blazing Shadow",
            icon: "assets/operators/skills/rossi/cs.png",
            iconSmall: "assets/operators/skills/rossi/cs_small.png",
            type: "cs",
            cooldown: 20,
            energy: 60,
            description: "Massiver AoE Schaden."
        },
        {
            id: 504,
            name: '"Razorclaw" Ambuscade',
            icon: "assets/operators/skills/rossi/ult.png",
            iconSmall: "assets/operators/skills/rossi/ult_small.png",
            type: "ult",
            cooldown: 20,
            energy: 60,
            description: "Massiver AoE Schaden."
        }
    ]
}