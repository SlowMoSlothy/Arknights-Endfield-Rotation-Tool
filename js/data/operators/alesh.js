const alesh = {
    id: 10,
    name: "Alesh",
    icon: "assets/operators/avatars/Alesh.png",
    canEnterUltimateState: false,
    elementType: "cryo",
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
            description: "FS",
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
            id: 1002,
            name: "Unconventional Lure",
            icon: "assets/operators/avatars/Alesh.png",
            iconSmall: "assets/operators/skills/alesh/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Consumes Originium Crystals.",
            debuffs: [
                {
                    id: "originium_crystal_consumed",
                    name: "Originium Crystal Consumed",
                    appliesEffect: "originium_crystal_consumed",
                    persistsForCombo: false,
                    visible: false
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
            cooldown: 20,
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
            description: "Ultimate"
        }
    ]
};