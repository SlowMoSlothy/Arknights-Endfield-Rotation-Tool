const yvonne = {
    id: 26,
    name: "Yvonne",
    icon: "assets/operators/avatars/Yvonne.png",
    elementType: "cryo"
};

yvonne.skills = [
    {
        id: (yvonne.id * 100) + 1,
        name: "Exuberant Trigger",
        icon: yvonne.icon,
        iconSmall: "assets/operators/skills/yvonne/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "cryo",
        description: "Cryo Final Strike. Applies Cryo Infliction.",
        debuffs: [
            { id: "final_strike", name: "Final Strike", appliesEffect: "final_strike", persistsForCombo: false, visible: false },
            { id: "cryo_infliction", name: "Cryo Infliction", appliesEffect: "cryo_infliction", persistsForCombo: true, visible: true, stackable: true, stacksApplied: 1, maxStacks: 4 }
        ]
    },
    {
        id: (yvonne.id * 100) + 2,
        name: "Brr-Brr-Bomb β",
        icon: yvonne.icon,
        iconSmall: "assets/operators/skills/yvonne/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "cryo",
        description: "Consumes Cryo or Nature Infliction to apply Solidification.",
        consumesEffects: [
            { effect: "cryo_infliction", amount: "all" },
            { effect: "nature_infliction", amount: "all" }
        ],
        debuffs: [
            { id: "solidification", name: "Solidification", appliesEffect: "solidification", persistsForCombo: true, visible: true, stackable: false }
        ]
    },
    {
        id: (yvonne.id * 100) + 3,
        name: "Flashfreezer υ37",
        icon: yvonne.icon,
        iconSmall: "assets/operators/skills/yvonne/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 20,
        energy: 0,
        elementType: "cryo",
        description: "Triggers on Final Strike against Solidified enemy.",
        comboTriggerMode: "all",
        comboTriggers: [
            { effect: "final_strike", minStacks: 1 },
            { effect: "solidification", minStacks: 1 }
        ],
        allowSelfTrigger: true,
        debuffs: [
            { id: "solidification", name: "Solidification", appliesEffect: "solidification", persistsForCombo: true, visible: true, stackable: false }
        ]
    },
    {
        id: (yvonne.id * 100) + 4,
        name: "Cryoblasting Pistolier",
        icon: yvonne.icon,
        iconSmall: "assets/operators/skills/yvonne/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 220,
        elementType: "cryo",
        description: "Enhanced attack state ending in Cryo Final Strike.",
        debuffs: [
            { id: "final_strike", name: "Final Strike", appliesEffect: "final_strike", persistsForCombo: false, visible: false },
            { id: "cryo_infliction", name: "Cryo Infliction", appliesEffect: "cryo_infliction", persistsForCombo: true, visible: true, stackable: true, stacksApplied: 1, maxStacks: 4 }
        ]
    }
];