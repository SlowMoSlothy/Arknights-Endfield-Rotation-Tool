const akekuri = {
    id: 2,
    name: "Akekuri",
    star: 4,
    operatorClass: "Vanguard",
    icon: "assets/operators/avatars/Akekuri.png",
    elementType: "heat",
    skills: [
        {
            id: 201,
            name: "Sword of Aspiration",
            icon: "assets/operators/avatars/Akekuri.png",
            iconSmall: "assets/operators/skills/akekuri/fs_small.png",
            type: "Final Strike",
            shortType: "FS",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Physical Final Strike. As the controlled operator, Final Strike also deals Stagger.",
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
            id: 202,
            name: "Burst of Passion",
            icon: "assets/operators/avatars/Akekuri.png",
            iconSmall: "assets/operators/skills/akekuri/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            cooldown: 20,
            energy: 100,
            sp_cost: 100,
            elementType: "heat",
            debuffs: [
                {
                    id: "heat_infliction",
                    name: "Heat Infliction",
                    appliesEffect: "heat_infliction",
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4,
                    persistsForCombo: true,
                    iconBase: "assets/debuffs/heat_infliction"
                }
            ],
            description: "A frontal slash that deals Heat DMG and applies Heat Infliction."
        },
        {
            id: 203,
            name: "Flash and Dash",
            icon: "assets/operators/avatars/Akekuri.png",
            iconSmall: "assets/operators/skills/akekuri/cs_small.png",
            type: "Combo Skill",
            shortType: "CS",
            cooldown: 9,
            energy: 0,
            elementType: "physical",
            description: "Triggers when an enemy becomes Staggered or hits a Stagger Node. Recovers SP.",
            spRecovery: {
                amount: 15,
                source: "Flash and Dash"
            },
            comboTriggers: [
                {
                    effect: "stagger",
                    minStacks: 1
                }
            ],
            buffs: [
                {
                    id: "sp_recovery",
                    name: "SP Recovery",
                    appliesEffect: "sp_recovery",
                    persistsForCombo: false,
                    visible: true,
                    stackable: false,
                    iconBase: "assets/buffs/sp_recovery"
                }
            ]
        },
        {
            id: 204,
            name: "SQUAD! ON ME!",
            icon: "assets/operators/avatars/Akekuri.png",
            iconSmall: "assets/operators/skills/akekuri/ult_small.png",
            type: "Ultimate",
            shortType: "Ult",
            cooldown: 20,
            energy: 120,
            elementType: "heat",
            description: "Enters a channeling state and fires 3 Rallying Flares. Each firing recovers SP.",
            spRecovery: {
                amount: 58,
                source: "SQUAD! ON ME!"
            }
        }
    ]
}
