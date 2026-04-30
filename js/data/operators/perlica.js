const perlica = {
    id: 4,
    name: "Perlica",
    icon: "assets/operators/avatars/Perlica.png",
    elementType: "electric",
    skills: [
        {
            id: 401,
            name: "Protocol α: Breach",
            icon: "assets/operators/avatars/Perlica.png",
            iconSmall: "assets/operators/skills/perlica/fs_small.png",
            type: "final_strike",
            cooldown: 0,
            energy: 0,
            elementType: "electric",
            debuffs: [
                {
                    id: "final_strike",
                    name: "Final Strike",
                    appliesEffect: "final_strike",
                    persistsForCombo: false,
                    visible: false
                }
            ],
            description: "Final Strike"
        },
        {
            id: 402,
            name: "Protocol ω: Strike",
            icon: "assets/operators/avatars/Perlica.png",
            iconSmall: "assets/operators/skills/perlica/bs_small.png",
            type: "Battle Skill",
            cooldown: 0,
            energy: 40,
            elementType: "electric",
            debuffs: [
                {
                    id: "electric_infliction",
                    name: "Electric Infliction",
                    appliesEffect: "electric_infliction",
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4,
                    persistsForCombo: true
                }
            ],
            description: "BS"
        },
        {
            id: 403,
            name: "Instant Protocol: Chain",
            icon: "assets/operators/avatars/Perlica.png",
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
                    id: "electrification",
                    name: "Electrification",
                    appliesEffect: "electrification",
                    persistsForCombo: true,
                    availableAfterChain: true,
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4,
                    iconBase: "assets/debuffs/electrification"
                }
            ]
        },
        {
            id: 404,
            name: "Protocol ε: 70.41K",
            icon: "assets/operators/avatars/Perlica.png",
            iconSmall: "assets/operators/skills/perlica/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Ultimate"
        }
    ]
}