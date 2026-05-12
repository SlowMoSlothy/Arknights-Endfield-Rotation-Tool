const alesh = {
    id: 10,
    name: "Alesh",
    star: 5,
    operatorClass: "Vanguard",
    icon: "assets/operators/avatars/Alesh.png",
    canEnterUltimateState: false,
    elementType: "physical",
    skills: [
        {
            id: 1001,
            name: "Basic Rod Casting",
            icon: "assets/operators/avatars/Alesh.png",
            iconSmall: "assets/operators/skills/alesh/fs_small.png",
            type: "Final Strike",
            shortType: "FS",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Physical Final Strike.",
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
            id: 1002,
            name: "Unconventional Lure",
            icon: "assets/operators/avatars/Alesh.png",
            iconSmall: "assets/operators/skills/alesh/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            cooldown: 20,
            energy: 60,
            elementType: "cryo",
            description: "Consumes Cryo Infliction or Originium Crystals to apply Solidification.",
            consumeDebuffs: [
                "cryo_infliction",
                "originium_crystal"
            ],
            debuffs: [
                {
                    id: "originium_crystal_consumed",
                    name: "Originium Crystal Consumed",
                    appliesEffect: "originium_crystal_consumed",
                    persistsForCombo: false,
                    visible: false
                },
                {
                    id: "solidification",
                    name: "Solidification",
                    appliesEffect: "solidification",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false,
                    iconBase: "assets/debuffs/solidification"
                }
            ]
        },

        {
            id: 1003,
            name: "Auger Angling",
            icon: "assets/operators/avatars/Alesh.png",
            iconSmall: "assets/operators/skills/alesh/cs_small.png",
            type: "Combo Skill",
            shortType: "CS",
            elementType: "physical",
            cooldown: 9,
            energy: 0,
            description: "Triggers when an Arts Reaction or Originium Crystals are consumed. Deals Physical DMG and recovers SP.",
            comboTriggerMode: "all",
            comboTriggers: [
                {
                    anyOf: [
                        { effect: "arts_reaction", minStacks: 1 },
                        { effect: "originium_crystal_consumed", minStacks: 1 }
                    ]
                }
            ],
            allowSelfTrigger: true,
            buffs: [
                {
                    id: "sp_recovery",
                    name: "SP Recovery",
                    appliesEffect: "sp_recovery",
                    visible: false,
                    persistsForCombo: false
                }
            ]
        },

        {
            id: 1004,
            name: "One Monster Catch!",
            icon: "assets/operators/avatars/Alesh.png",
            iconSmall: "assets/operators/skills/alesh/ult_small.png",
            type: "Ultimate",
            shortType: "Ult",
            cooldown: 20,
            energy: 60,
            elementType: "cryo",
            description: "Cryo Ultimate. Deals Cryo DMG."
        }
    ]
};
