const avywenna = {
    id: 7,
    name: "Avywenna",
    star: 5,
    operatorClass: "Striker",
    icon: "assets/operators/avatars/Avywenna.png",
    elementType: "electric"
};

avywenna.skills = [
    {
        id: (avywenna.id * 100) + 1,
        name: "Thunderlance: Blitz",
        icon: avywenna.icon,
        iconSmall: "assets/operators/skills/avywenna/fs_small.png",
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
        id: (avywenna.id * 100) + 2,
        name: "Thunderlance: Interdiction",
        icon: avywenna.icon,
        iconSmall: "assets/operators/skills/avywenna/bs_small.png",
        type: "Battle Skill",
        cooldown: 20,
        energy: 100,
        elementType: "electric",
        description: "Deals Electric DMG and applies Electric Infliction via Thunderlance EX.",
        debuffs: [
            {
                id: "electric_infliction",
                name: "Electric Infliction",
                appliesEffect: "electric_infliction",
                persistsForCombo: true,
                visible: true,
                stackable: true,
                stacksApplied: 1,
                maxStacks: 4
            }
        ]
    },
    {
        id: (avywenna.id * 100) + 3,
        name: "Thunderlance: Strike",
        icon: avywenna.icon,
        iconSmall: "assets/operators/skills/avywenna/cs_small.png",
        type: "Combo Skill",
        cooldown: 13,
        energy: 0,
        elementType: "electric",
        comboTriggerMode: "all",
        comboTriggers: [
            { effect: "final_strike", minStacks: 1 },
            {
                anyOf: [
                    { effect: "electrification", minStacks: 1 },
                    { effect: "electric_infliction", minStacks: 1 }
                ]
            }
        ]
    },
    {
        id: (avywenna.id * 100) + 4,
        name: "Thunderlance: Final Shock",
        icon: avywenna.icon,
        iconSmall: "assets/operators/skills/avywenna/ult_small.png",
        type: "Ultimate",
        cooldown: 20,
        energy: 60,
        elementType: "electric"
    }
];
