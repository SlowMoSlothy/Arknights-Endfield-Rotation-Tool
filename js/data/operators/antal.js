const antal = {
    id: 8,
    name: "Antal",
    icon: "assets/operators/avatars/Antal.png",
    elementType: "electric",
    skills: [
        {
            id: 801,
            name: "Exchange Current",
            icon: "assets/operators/avatars/Antal.png",
            iconSmall: "assets/operators/skills/antal/fs_small.png",
            type: "Final Strike",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "FS",
            debuffs: [
                {
                    id: "final_strike",
                    name: "Final Strike",
                    appliesEffect: "final_strike",
                    persistsForCombo: false,
                    visible: false
                }
            ],

        },
        {
            id: 802,
            name: "Specified Research Subject",
            icon: "assets/operators/avatars/Antal.png",
            iconSmall: "assets/operators/skills/antal/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "BS"
        },
        {
            id: 803,
            name: "EMP Test Site",
            icon: "assets/operators/avatars/Antal.png",
            iconSmall: "assets/operators/skills/antal/cs_small.png",
            type: "ComboSkill",
            cooldown: 0,
            energy: 100,
            elementType: "electric",
            description: "CS"
        },
        {
            id: 804,
            name: "Overclocked Moment",
            icon: "assets/operators/avatars/Antal.png",
            iconSmall: "assets/operators/skills/antal/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Ultimate"
        }
    ]
}