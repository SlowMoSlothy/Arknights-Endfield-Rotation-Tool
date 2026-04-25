const chen = {
    id: 14,
    name: "Chen Qianyu",
    icon: "assets/operators/avatars/Chen.png"
};

chen.skills = [
    {
        id: (chen.id * 100) + 1,
        name: "Basic Tactics",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/fs_small.png",
        type: "Final Strike",
        cooldown: 20,
        energy: 60,
        debuffs: [
            {
                id: "final_strike",
                name: "Final Strike",
                appliesEffect: "final_strike",
                persistsForCombo: false,
                visible: false
            }
        ],
        elementType: "physical"
    },
    {
        id: (chen.id * 100) + 2,
        name: "Rigid Interdiction",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/bs_small.png",
        type: "Battle Skill",
        cooldown: 20,
        energy: 60,
        elementType: "physical"
    },
    {
        id: (chen.id * 100) + 3,
        name: "Timely Suppression",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/cs_small.png",
        type: "Combo Skill",
        cooldown: 0,
        energy: 0,
        elementType: "physical"
    },
    {
        id: (chen.id * 100) + 4,
        name: "Textbook Assault",
        icon: chen.icon,
        iconSmall: "assets/operators/skills/chen/ult_small.png",
        type: "Ultimate",
        cooldown: 20,
        energy: 60,
        elementType: "physical"
    }
];