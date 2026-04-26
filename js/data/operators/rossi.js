const rossi = {
    id: 5,
    name: "Rossi",
    icon: "assets/operators/avatars/Rossi.png",
    skills: [
        {
            id: 501,
            name: "Seething Wolfblood",
            icon: "assets/operators/avatars/Rossi.png",
            iconSmall: "assets/operators/skills/rossi/fs_small.png",
            type: "Final Strike",
            shortType: "FS",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Final Strike",
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
            id: 502,
            name: "Crimson Shadow",
            icon: "assets/operators/avatars/Rossi.png",
            iconSmall: "assets/operators/skills/rossi/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Applies Lift. If Vulnerability is present, Rossi also performs a Heat follow-up.",
            debuffs: [
                {
                    id: "lift",
                    name: "Lift",
                    appliesEffect: "lift",
                    persistsForCombo: false,
                    visible: true,
                    iconBase: "assets/debuffs/lift"
                },
                {
                    id: "heat_followup",
                    name: "Heat Follow-up",
                    appliesEffect: "heat_followup",
                    persistsForCombo: false,
                    visible: false
                }
            ]
        },
        {
            id: 503,
            name: "Moment of Blazing Shadow",
            icon: "assets/operators/avatars/Rossi.png",
            iconSmall: "assets/operators/skills/rossi/cs_small.png",
            type: "Combo Skill",
            shortType: "CS",
            cooldown: 15,
            energy: 60,
            elementType: "physical",
            description: "Triggers when the enemy has Vulnerability and Arts Infliction. Consumes Arts Infliction, applies Lift and buffs Rossi's Crit stats.",
            comboTriggerMode: "all",
            comboTriggers: [
                { effect: "vulnerable", minStacks: 1 },
                { effect: "arts_infliction", minStacks: 1 }
            ],
            debuffs: [
                {
                    id: "lift",
                    name: "Lift",
                    appliesEffect: "lift",
                    persistsForCombo: false,
                    visible: true,
                    iconBase: "assets/debuffs/lift"
                },
                {
                    id: "vulnerable",
                    name: "Vulnerable",
                    appliesEffect: "vulnerable",
                    persistsForCombo: true,
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4,
                    iconBase: "assets/debuffs/vulnerable"
                },
                {
                    id: "arts_infliction_consumed",
                    name: "Arts Infliction Consumed",
                    appliesEffect: "arts_infliction_consumed",
                    persistsForCombo: false,
                    visible: false
                }
            ],
            buffs: [
                {
                    id: "rossi_crit_buff",
                    name: "Crit Rate / Crit DMG",
                    appliesEffect: "rossi_crit_buff",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false,
                    iconBase: "assets/buffs/rossi/crit_buff"
                }
            ]
        },
        {
            id: 504,
            name: '"Razorclaw" Ambuscade',
            icon: "assets/operators/avatars/Rossi.png",
            iconSmall: "assets/operators/skills/rossi/ult_small.png",
            type: "Ultimate",
            shortType: "Ult",
            cooldown: 10,
            energy: 110,
            elementType: "heat",
            description: "Deals Heat DMG and applies Heat Infliction.",
            debuffs: [
                {
                    id: "heat_infliction",
                    name: "Heat Infliction",
                    appliesEffect: "heat_infliction",
                    persistsForCombo: true,
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4,
                    iconBase: "assets/debuffs/heat_infliction"
                }
            ]
        }
    ]
};