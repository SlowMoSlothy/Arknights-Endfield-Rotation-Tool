const arclight = {
    id: 6,
    name: "Arclight",
    icon: "assets/operators/avatars/Arclight.png",
    skills: [
        {
            id: 601,
            name: "Seek and Hunt",
            icon: "assets/operators/skills/arclight/fs.png",
            iconSmall: "assets/operators/skills/arclight/fs_small.png",
            type: "Final Strike",
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
            ],

        },
        {
            id: 602,
            name: "Tempestuous Arc",
            icon: "assets/operators/skills/arclight/bs.png",
            iconSmall: "assets/operators/skills/arclight/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Ein Hieb nach vorn, der Hitze-SDN und [heat] verursacht."
        },
        {
            id: 603,
            name: "Peal of Thunder",
            icon: "assets/operators/skills/arclight/cs.png",
            iconSmall: "assets/operators/skills/arclight/cs_small.png",
            type: "ComboSkill",
            cooldown: 0,
            energy: 100,
            elementType: "physical",    
            description: "Massiver AoE Schaden."
        },
        {
            id: 604,
            name: "Exploding Blitz",
            icon: "assets/operators/skills/arclight/ult.png",
            iconSmall: "assets/operators/skills/arclight/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Massiver AoE Schaden."
        }
    ]
}