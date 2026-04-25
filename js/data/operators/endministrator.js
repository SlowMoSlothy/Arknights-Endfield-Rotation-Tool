const endministrator = {
    id: 3,
    name: "Endministrator",
    icon: "assets/operators/avatars/Endmin.png",
    skills: [
        {
            id: 301,
            name: "Destructive Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/fs_small.png",
            type: "Final Strike",
            cooldown: 0,
            energy: 0,
            description: "FS",
            elementType: "physical",
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
            id: 302,
            name: "Constructive Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "BS",
        }
        ,
        {
            id: 303,
            name: "Sealing Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/cs_small.png",
            type: "Combo Skil",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "CS",
            comboTriggers: ["combo_skill"],
        },
        {
            id: 304,
            name: "Bombardment Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/ult_small.png",
            elementType: "physical",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            description: "Ultimate"
        }
    ]
}