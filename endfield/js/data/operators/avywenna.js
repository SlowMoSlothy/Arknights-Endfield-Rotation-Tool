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
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        description: "Physical Final Strike.",
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
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        sp_cost: 100,
        elementType: "electric",
        description: "Returns all deployed Thunderlances to Avywenna and strikes enemies in front. A returning Thunderlance EX can apply Electric Infliction."
    },
    {
        id: (avywenna.id * 100) + 3,
        name: "Thunderlance: Strike",
        icon: avywenna.icon,
        iconSmall: "assets/operators/skills/avywenna/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 13,
        energy: 0,
        elementType: "electric",
        description: "Triggers when a Final Strike hits an enemy with Electric Infliction or Electrification. Deploys Thunderlances.",
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
        shortType: "Ult",
        cooldown: 10,
        energy: 100,
        elementType: "electric",
        description: "Deploys one Thunderlance EX."
    }
];
