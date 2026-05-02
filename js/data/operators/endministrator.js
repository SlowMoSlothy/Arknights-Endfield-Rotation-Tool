const endministrator = {
    id: 3,
    name: "Endministrator",
    icon: "assets/operators/avatars/Endmin.png",
    elementType: "physical",
    skills: [
        {
            id: 301,
            name: "Destructive Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/fs_small.png",
            type: "Final Strike",
            shortType: "FS",
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
            shortType: "BS",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "BS"
        },
        {
            id: 303,
            name: "Sealing Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/cs_small.png",
            type: "Combo Skill",
            shortType: "CS",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Triggers when another operator uses a Combo Skill.",
            comboTriggers: ["combo_skill"]
        },
        {
            id: 304,
            name: "Bombardment Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/ult_small.png",
            elementType: "physical",
            type: "Ultimate",
            shortType: "Ult",
            cooldown: 20,
            energy: 60,
            description: "Ultimate"
        }
    ]
};