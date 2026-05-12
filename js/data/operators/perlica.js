const perlica = {
    id: 4,
    name: "Perlica",
    star: 5,
    operatorClass: "Caster",
    icon: "assets/operators/avatars/Perlica.png",
    elementType: "electric",
    skills: [
        {
            id: 401,
            name: "Protocol α: Breach",
            icon: "assets/operators/avatars/Perlica.png",
            iconSmall: "assets/operators/skills/perlica/fs_small.png",
            type: "Final Strike",
            shortType: "FS",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Electric Final Strike. As the controlled operator, Final Strike also deals Stagger.",
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
            id: 402,
            name: "Protocol ω: Strike",
            icon: "assets/operators/avatars/Perlica.png",
            iconSmall: "assets/operators/skills/perlica/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            cooldown: 20,
            energy: 100,
            elementType: "electric",
            description: "Deals Electric DMG and applies Electric Infliction.",
            debuffs: [
                {
                    id: "electric_infliction",
                    name: "Electric Infliction",
                    appliesEffect: "electric_infliction",
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4,
                    persistsForCombo: true
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
            id: 403,
            name: "Instant Protocol: Chain",
            icon: "assets/operators/avatars/Perlica.png",
            iconSmall: "assets/operators/skills/perlica/cs_small.png",
            type: "Combo Skill",
            shortType: "CS",
            cooldown: 20,
            energy: 0,
            elementType: "electric",
            description: "Triggers when the controlled operator performs a Final Strike. Forcibly applies temporary Electrification.",
            comboTriggerMode: "all",
            comboTriggers: [
                {
                    effect: "final_strike",
                    minStacks: 1
                }
            ],
            allowSelfTrigger: true,
            debuffs: [
                {
                    id: "electrification",
                    name: "Electrification",
                    appliesEffect: "electrification",
                    persistsForCombo: true,
                    availableAfterChain: true,
                    visible: true,
                    stackable: false,
                    iconBase: "assets/debuffs/electrification"
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
            id: 404,
            name: "Protocol ε: 70.41K",
            icon: "assets/operators/avatars/Perlica.png",
            iconSmall: "assets/operators/skills/perlica/ult_small.png",
            type: "Ultimate",
            shortType: "Ult",
            cooldown: 20,
            energy: 80,
            elementType: "electric",
            description: "Deals massive Electric DMG and Stagger.",
            debuffs: [
                {
                    id: "stagger",
                    name: "Stagger",
                    appliesEffect: "stagger",
                    persistsForCombo: false,
                    visible: true,
                    iconBase: "assets/debuffs/stagger"
                }
            ]
        }
    ]
};
