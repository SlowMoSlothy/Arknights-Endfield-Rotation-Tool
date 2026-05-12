const fluorite = {
    id: 19,
    name: "Fluorite",
    star: 4,
    operatorClass: "Caster",
    icon: "assets/operators/avatars/Fluorite.png",
    elementType: "nature"
};

fluorite.skills = [
    {
        id: (fluorite.id * 100) + 1,
        name: "Signature Gun Kata",
        icon: fluorite.icon,
        iconSmall: "assets/operators/skills/fluorite/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "nature",
        description: "Nature Final Strike.",
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
        id: (fluorite.id * 100) + 2,
        name: "Free Giveaway",
        icon: fluorite.icon,
        iconSmall: "assets/operators/skills/fluorite/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "nature",
        description: "Deals Nature DMG, slows enemies, and applies Nature Infliction.",
        debuffs: [
            {
                id: "slow",
                name: "Slow",
                appliesEffect: "slow",
                persistsForCombo: true,
                visible: true,
                iconBase: "assets/debuffs/slow"
            },
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
        id: (fluorite.id * 100) + 3,
        name: "Tiny Surprise",
        icon: fluorite.icon,
        iconSmall: "assets/operators/skills/fluorite/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 40,
        energy: 0,
        elementType: "nature",
        description: "Triggers when the enemy has at least 2 Cryo or Nature Infliction stacks. Adds another stack of the matching Arts Infliction.",
        comboTriggerMode: "any",
        comboTriggers: [
            { effect: "cryo_infliction", minStacks: 2 },
            { effect: "nature_infliction", minStacks: 2 }
        ],
        allowSelfTrigger: true,
        matchingInfliction: {
            candidateEffects: ["cryo_infliction", "nature_infliction"],
            minStacks: 2,
            stacksApplied: 1,
            maxStacks: 4
        }
    },

    {
        id: (fluorite.id * 100) + 4,
        name: "Apex Prankster",
        icon: fluorite.icon,
        iconSmall: "assets/operators/skills/fluorite/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 100,
        elementType: "nature",
        description: "Deals Nature DMG. If the target has at least 2 Cryo or Nature Infliction stacks, applies the same Arts Infliction again.",
        matchingInfliction: {
            candidateEffects: ["cryo_infliction", "nature_infliction"],
            minStacks: 2,
            stacksApplied: 1,
            maxStacks: 4
        }
    }
];
