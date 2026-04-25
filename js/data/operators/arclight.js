const opImg = "assets/operators/avatars/Arclight.png";
const opId = 6;
const arclight = {
    id: opId,
    name: "Arclight",
    icon: opImg,
    skills: [
        {
            id: (opId * 100) + 1 ,
            name: "Seek and Hunt",
            icon: opImg,
            iconSmall: "assets/operators/skills/arclight/fs_small.png",
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
            ],

        },
        {
            id: (opId * 100) + 2,
            name: "Tempestuous Arc",
            icon: opImg,
            iconSmall: "assets/operators/skills/arclight/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "BS"
        },
        {
            id: (opId * 100) + 3,
            name: "Peal of Thunder",
            icon: opImg,
            iconSmall: "assets/operators/skills/arclight/cs_small.png",
            type: "ComboSkill",
            cooldown: 0,
            energy: 100,
            elementType: "physical",    
            description: "CS"
        },
        {
            id: (opId * 100) + 4,
            name: "Exploding Blitz",
            icon: opImg,
            iconSmall: "assets/operators/skills/arclight/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Ultimate"
        }
    ]
}