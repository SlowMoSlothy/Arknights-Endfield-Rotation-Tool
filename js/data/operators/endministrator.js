const endministrator = {
    id: 3,
    name: "Endministrator",
    star: 6,
    operatorClass: "Guard",
    icon: "assets/operators/avatars/Endmin.png",
    elementType: "physical",
    skills: [
        {
            id: 301,
            name: "Destructive Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/fs_small.png",
            type: "Final Strike",
            shortType: "FS",
            cooldown: 0,
            energy: 0,
            description: "Physical Final Strike.",
            elementType: "physical",
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
            id: 302,
            name: "Constructive Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            cooldown: 20,
            energy: 100,
            sp_cost: 100,
            elementType: "physical",
            description: "Deals Physical DMG, applies Crush and Vulnerable, and can shatter Originium Crystals for burst damage.",
            consumeDebuffs: [
                "originium_crystal"
            ],
            debuffs: [
                {
                    id: "crush",
                    name: "Crush",
                    appliesEffect: "crush",
                    persistsForCombo: false,
                    visible: true
                },
                {
                    id: "vulnerable",
                    name: "Vulnerable",
                    appliesEffect: "vulnerable",
                    persistsForCombo: true,
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4
                }
            ]
        },
        {
            id: 303,
            name: "Sealing Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/cs_small.png",
            type: "Combo Skill",
            shortType: "CS",
            cooldown: 16,
            energy: 0,
            elementType: "physical",
            description: "Triggers when another operator uses a Combo Skill. Places Originium Crystals that can be shattered by Endministrator's Battle Skill or Ultimate.",
            comboTriggers: ["combo_skill"],
            debuffs: [
                {
                    id: "originium_crystal",
                    name: "Originium Crystal",
                    appliesEffect: "originium_crystal",
                    persistsForCombo: true,
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4
                }
            ]
        },
        {
            id: 304,
            name: "Bombardment Sequence",
            icon: "assets/operators/avatars/Endmin.png",
            iconSmall: "assets/operators/skills/endmin/ult_small.png",
            elementType: "physical",
            type: "Ultimate",
            shortType: "Ult",
            cooldown: 20,
            energy: 90,
            description: "Deals Physical DMG and shatters all Originium Crystals on the field.",
            consumeDebuffs: [
                "originium_crystal"
            ]
        }
    ]
};
