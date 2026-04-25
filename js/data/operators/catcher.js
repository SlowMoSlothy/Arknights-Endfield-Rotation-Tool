const catcher = {
    id: 13,
    name: "Catcher",
    icon: "assets/operators/avatars/Catcher.png"
};

catcher.skills = [
    {
        id: (catcher.id * 100) + 1,
        name: "Basic Tactics",
        icon: catcher.icon,
        iconSmall: "assets/operators/skills/catcher/fs_small.png",
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
        id: (catcher.id * 100) + 2,
        name: "Rigid Interdiction",
        icon: catcher.icon,
        iconSmall: "assets/operators/skills/catcher/bs_small.png",
        type: "Battle Skill",
        cooldown: 20,
        energy: 60,
        elementType: "physical"
    },
    {
        id: (catcher.id * 100) + 3,
        name: "Timely Suppression",
        icon: catcher.icon,
        iconSmall: "assets/operators/skills/catcher/cs_small.png",
        type: "Combo Skill",
        cooldown: 0,
        energy: 0,
        elementType: "physical"
    },
    {
        id: (catcher.id * 100) + 4,
        name: "Textbook Assault",
        icon: catcher.icon,
        iconSmall: "assets/operators/skills/catcher/ult_small.png",
        type: "Ultimate",
        cooldown: 20,
        energy: 60,
        elementType: "physical"
    }
];