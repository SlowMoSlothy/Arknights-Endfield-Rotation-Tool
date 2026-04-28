const lifeng = {
    id: 21,
    name: "Lifeng",
    icon: "assets/operators/avatars/Lifeng.png",
    elementType: "physical"
};

lifeng.skills = [
    {
        id: (lifeng.id * 100) + 1,
        name: "Ruination",
        icon: lifeng.icon,
        iconSmall: "assets/operators/skills/lifeng/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "physical",
        description: "Physical Final Strike. Deals Stagger when Lifeng is the controlled operator.",
        debuffs: [
            {
                id: "final_strike",
                name: "Final Strike",
                appliesEffect: "final_strike",
                persistsForCombo: false,
                visible: false
            },
            {
                id: "stagger",
                name: "Stagger",
                appliesEffect: "stagger",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/stagger"
            }
        ]
    },

    {
        id: (lifeng.id * 100) + 2,
        name: "Turbid Avatar",
        icon: lifeng.icon,
        iconSmall: "assets/operators/skills/lifeng/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 0,
        energy: 100,
        elementType: "physical",
        description: "Deals Physical DMG and applies Physical Susceptibility.",
        debuffs: [
            {
                id: "physical_susceptibility",
                name: "Physical Susceptibility",
                appliesEffect: "physical_susceptibility",
                persistsForCombo: true,
                visible: true,
                stackable: false,
                iconBase: "assets/debuffs/physical_susceptibility"
            }
        ]
    },

    {
        id: (lifeng.id * 100) + 3,
        name: "Aspect of Wrath",
        icon: lifeng.icon,
        iconSmall: "assets/operators/skills/lifeng/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 16,
        energy: 0,
        elementType: "physical",
        description: "Deals Physical DMG and grants Link status.",
        comboTriggerMode: "any",
        comboTriggers: [
            { effect: "knock_down", minStacks: 1 },
            { effect: "pull", minStacks: 1 }
        ],
        buffs: [
            {
                id: "link",
                name: "Link",
                appliesEffect: "link",
                persistsForCombo: true,
                visible: true,
                iconBase: "assets/buffs/link"
            }
        ]
    },

    {
        id: (lifeng.id * 100) + 4,
        name: "Heart of the Unmoving",
        icon: lifeng.icon,
        iconSmall: "assets/operators/skills/lifeng/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 80,
        energy: 100,
        elementType: "physical",
        description: "Deals massive Physical DMG, knocks enemies down, and pulls them closer.",
        debuffs: [
            {
                id: "knock_down",
                name: "Knock Down",
                appliesEffect: "knock_down",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/knock_down"
            },
            {
                id: "pull",
                name: "Pull",
                appliesEffect: "pull",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/pull"
            }
        ]
    }
];