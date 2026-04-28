const gilberta = {
    id: 11,
    name: "Gilberta",
    icon: "assets/operators/avatars/Gilberta.png",
    elementType: "nature"
};

gilberta.skills = [
    {
        id: (gilberta.id * 100) + 1,
        name: "Arcane Staff: Beam Cohesion Arts",
        icon: gilberta.icon,
        iconSmall: "assets/operators/skills/gilberta/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "nature",
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
        id: (gilberta.id * 100) + 2,
        name: "Arcane Staff: Gravity Mode",
        icon: gilberta.icon,
        iconSmall: "assets/operators/skills/gilberta/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 60,
        elementType: "nature",
        description: "Applies Nature Infliction.",
        debuffs: [
            {
                id: "nature_infliction",
                name: "Nature Infliction",
                appliesEffect: "nature_infliction",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4,
                iconBase: "assets/debuffs/nature_infliction"
            }
        ]
    },
    {
        id: (gilberta.id * 100) + 3,
        name: "Arcane Staff: Matrix Displacement",
        icon: gilberta.icon,
        iconSmall: "assets/operators/skills/gilberta/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 0,
        energy: 0,
        elementType: "nature",
        description: "Triggers on Arts Reaction. Applies Lift and Vulnerable.",
        comboTriggerMode: "any",
        comboTriggers: [
            { effect: "arts_reaction", minStacks: 1 }
        ],
        debuffs: [
            {
                id: "lift",
                name: "Lift",
                appliesEffect: "lift",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/lift"
            },
            {
                id: "vulnerable",
                name: "Vulnerable",
                appliesEffect: "vulnerable",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4,
                iconBase: "assets/debuffs/vulnerable"
            }
        ]
    },
    {
        id: (gilberta.id * 100) + 4,
        name: "Arcane Staff: Gravity Field",
        icon: gilberta.icon,
        iconSmall: "assets/operators/skills/gilberta/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 60,
        elementType: "nature",
        description: "Applies Arts Susceptibility.",
        debuffs: [
            {
                id: "arts_susceptibility",
                name: "Arts Susceptibility",
                appliesEffect: "arts_susceptibility",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4,
                iconBase: "assets/debuffs/arts_susceptibility"
            }
        ]
    }
];