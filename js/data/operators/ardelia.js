const ardelia = {
    id: 12,
    name: "Ardelia",
    icon: "assets/operators/avatars/Ardelia.png",
    elementType: "nature"
};

ardelia.skills = [
    {
        id: (ardelia.id * 100) + 1,
        name: "Rocky Whispers",
        icon: ardelia.icon,
        iconSmall: "assets/operators/skills/ardelia/fs_small.png",
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
        elementType: "nature"
    },
    {
        id: (ardelia.id * 100) + 2,
        name: "Dolly Rush",
        icon: ardelia.icon,
        iconSmall: "assets/operators/skills/ardelia/bs_small.png",
        type: "Battle Skill",
        cooldown: 20,
        energy: 60,
        elementType: "nature"
    },
    {
        id: (ardelia.id * 100) + 3,
        name: "Eruption Column",
        icon: ardelia.icon,
        iconSmall: "assets/operators/skills/ardelia/cs_small.png",
        type: "Combo Skill",
        cooldown: 0,
        energy: 0,
        elementType: "nature"
    },
    {
        id: (ardelia.id * 100) + 4,
        name: "Wooly Party",
        icon: ardelia.icon,
        iconSmall: "assets/operators/skills/ardelia/ult_small.png",
        type: "Ultimate",
        cooldown: 20,
        energy: 60,
        elementType: "nature"
    }
];