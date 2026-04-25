const zhuang = {
    id: 9,
    name: "Zhuang",
    icon: "assets/operators/avatars/Zhuang.png",
    canEnterUltimateState: true,
    skills: [
        {
            id: 901,
            name: "Jolting Arts",
            icon: "assets/operators/avatars/Zhuang.png",
            iconSmall: "assets/operators/skills/zhuang/fs_small.png",
            type: "Final Strike",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "FS",
            shortType: "FS",
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
            id: 902,
            name: "Mantra of Sundering",
            icon: "assets/operators/avatars/Zhuang.png",
            iconSmall: "assets/operators/skills/zhuang/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            shortType: "BS",
            description: "BS"
        },
        {
            id: 903,
            name: "Breath of Transformation",
            icon: "assets/operators/avatars/Zhuang.png",
            iconSmall: "assets/operators/skills/zhuang/cs_small.png",
            type: "ComboSkill",
            cooldown: 0,
            energy: 100,
            elementType: "electric",
            shortType: "CS",
            description: "CS"
        },
        {
            id: 904,
            name: "Smiting Tempest",
            icon: "assets/operators/avatars/Zhuang.png",
            iconSmall: "assets/operators/skills/zhuang/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            shortType: "Ult",
            description: "Ultimate"
        }
    ],
    altSkills: [
        {
            id: 911,
            name: "Flaming Cinders EX",
            baseType: "Final Strike",
            icon: "assets/operators/skills/zhuang/fs_ex.png",
            iconSmall: "assets/operators/skills/zhuang/fs_ex_small.png"
        }
    ]
}
