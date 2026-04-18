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
            type: "final_strike",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            cooldown: 0,
            energy: 0,
            debuffs: [
                {
                    id: "final_strike",
                    name: "Final Strike",
                    appliesEffect: "final_strike",
                    visible: false
                }
            ],
            description: "Final Strike"    
        },
        {
            id: 402,
            name: "Protocol ω: Strike",
            icon: "assets/operators/skills/perlica/bs.png",
            iconSmall: "assets/operators/skills/perlica/bs_small.png",
            type: "Battle Skill",
            cooldown: 0,
            energy: 40,
            elementType: "electric",
            description: "BS"
        },
        {
            id: 403,
            name: "Instant Protocol: Chain",
            icon: "assets/operators/skills/perlica/cs.png",
            iconSmall: "assets/operators/skills/perlica/cs_small.png",
            type: "Combo Skill",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "CS",
            comboTriggers: ["final_strike"],
            allowSelfTrigger: true,
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
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Ultimate"
        }
    ]
}