const gilberta = {
    id: 11,
    name: "Gilberta",
    icon: "assets/operators/avatars/Gilberta.png"
};

gilberta.skills = [
    {
        id: (gilberta.id * 100) + 1,
        name: "Arcane Staff: Beam Cohesion Arts",
        icon: gilberta.icon,
        iconSmall: "assets/operators/skills/gilberta/fs_small.png",
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
        id: (gilberta.id * 100) + 2,
        name: "Arcane Staff: Gravity Mode",
        icon: gilberta.icon,
        iconSmall: "assets/operators/skills/gilberta/bs_small.png",
        type: "Battle Skill",
        cooldown: 20,
        energy: 60,
        elementType: "nature"
    },
    {
        id: (gilberta.id * 100) + 3,
        name: "Arcane Staff: Matrix Displacement",
        icon: gilberta.icon,
        iconSmall: "assets/operators/skills/gilberta/cs_small.png",
        type: "Combo Skill",
        cooldown: 0,
        energy: 0,
        elementType: "nature"
    },
    {
        id: (gilberta.id * 100) + 4,
        name: "Arcane Staff: Gravity Field",
        icon: gilberta.icon,
        iconSmall: "assets/operators/skills/gilberta/ult_small.png",
        type: "Ultimate",
        cooldown: 20,
        energy: 60,
        elementType: "nature"
    }
];