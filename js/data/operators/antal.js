const antal = {
    id: 8,
    name: "Antal",
    star: 4,
    operatorClass: "Supporter",
    icon: "assets/operators/avatars/Antal.png",
    elementType: "electric",
    skills: [
        {
            id: 801,
            name: "Exchange Current",
            icon: "assets/operators/avatars/Antal.png",
            iconSmall: "assets/operators/skills/antal/fs_small.png",
            type: "Final Strike",
            shortType: "FS",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Final Strike.",
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
            id: 802,
            name: "Specified Research Subject",
            icon: "assets/operators/avatars/Antal.png",
            iconSmall: "assets/operators/skills/antal/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            cooldown: 20,
            energy: 100,
            sp_cost: 100,
            elementType: "electric",
            description: "Applies Focus. Focused enemies suffer Electric Susceptibility and Heat Susceptibility.",
            debuffs: [
                {
                    id: "focus",
                    name: "Focus",
                    appliesEffect: "focus",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false
                },
                {
                    id: "electric_susceptibility",
                    name: "Electric Susceptibility",
                    appliesEffect: "electric_susceptibility",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false
                },
                {
                    id: "heat_susceptibility",
                    name: "Heat Susceptibility",
                    appliesEffect: "heat_susceptibility",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false
                }
            ]
        },
        {
            id: 803,
            name: "EMP Test Site",
            icon: "assets/operators/avatars/Antal.png",
            iconSmall: "assets/operators/skills/antal/cs_small.png",
            type: "Combo Skill",
            shortType: "CS",
            cooldown: 25,
            energy: 0,
            elementType: "electric",
            description: "Triggers when a focused enemy suffers a Physical Status or Arts Infliction, then applies another stack of the same effect.",
            comboTriggerMode: "all",
            comboTriggers: [
                { effect: "focus", minStacks: 1 },
                {
                    anyOf: [
                        { effect: "arts_infliction", minStacks: 1 },
                        { effect: "heat_infliction", minStacks: 1 },
                        { effect: "electric_infliction", minStacks: 1 },
                        { effect: "cryo_infliction", minStacks: 1 },
                        { effect: "nature_infliction", minStacks: 1 },
                        { effect: "vulnerable", minStacks: 1 },
                        { effect: "slow", minStacks: 1 },
                        { effect: "lift", minStacks: 1 },
                        { effect: "stagger", minStacks: 1 }
                    ]
                }
            ],
            matchingInfliction: {
                candidateEffects: [
                    "arts_infliction",
                    "heat_infliction",
                    "electric_infliction",
                    "cryo_infliction",
                    "nature_infliction",
                    "vulnerable",
                    "slow",
                    "lift",
                    "stagger"
                ],
                minStacks: 1,
                stacksApplied: 1,
                maxStacks: 4
            }
        },
        {
            id: 804,
            name: "Overclocked Moment",
            icon: "assets/operators/avatars/Antal.png",
            iconSmall: "assets/operators/skills/antal/ult_small.png",
            type: "Ultimate",
            shortType: "Ult",
            cooldown: 20,
            energy: 100,
            elementType: "electric",
            description: "Applies Electric Amp and Heat Amp to the whole team.",
            buffs: [
                {
                    id: "electric_amp",
                    name: "Electric Amp",
                    appliesEffect: "electric_amp",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false
                },
                {
                    id: "heat_amp",
                    name: "Heat Amp",
                    appliesEffect: "heat_amp",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false
                }
            ]
        }
    ]
};
