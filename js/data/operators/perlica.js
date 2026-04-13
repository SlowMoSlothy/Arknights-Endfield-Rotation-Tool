const perlica = {
    id: 4,
    name: "Perlica",
    icon: "assets/operators/avatars/Perlica.png",
    skills: [
        {
            id: 401,
            name: "Protocol α: Breach",
            icon: "assets/operators/skills/perlica/fs.png",
            iconSmall: "assets/operators/skills/perlica/fs_small.png",
            type: "fs",
            cooldown: 20,
            energy: 60,
            description: "Massiver AoE Schaden."
        },
        {
            id: 402,
            name: "Protocol ω: Strike",
            icon: "assets/operators/skills/perlica/bs.png",
            iconSmall: "assets/operators/skills/perlica/bs_small.png",
            type: "bs",
            cooldown: 20,
            energy: 60,
            description: "Massiver AoE Schaden."
        },
        {
            id: 403,
            name: "Instant Protocol: Chain",
            icon: "assets/operators/skills/perlica/cs.png",
            iconSmall: "assets/operators/skills/perlica/cs_small.png",
            type: "CS",
            cooldown: 20,
            energy: 60,
            description: "Massiver AoE Schaden.",
            comboTriggers: ["final_strike"],
            debuffs: [
                {
                    id: "combo_skill",
                    name: "Combo Skill",
                    appliesEffect: "combo_skill",
                    visible: false
                }
            ]
        },
        {
            id: 404,
            name: "Protocol ε: 70.41K",
            icon: "assets/operators/skills/perlica/ult.png",
            iconSmall: "assets/operators/skills/perlica/ult_small.png",
            type: "ult",
            cooldown: 20,
            energy: 60,
            description: "Massiver AoE Schaden."
        }
    ]
}