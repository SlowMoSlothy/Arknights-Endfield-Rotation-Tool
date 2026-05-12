const opImg = "assets/operators/avatars/Arclight.png";
const opId = 6;

const arclight = {
    id: opId,
    name: "Arclight",
    star: 5,
    operatorClass: "Vanguard",
    icon: opImg,
    elementType: "electric",
    skills: [
        {
            id: (opId * 100) + 1,
            name: "Seek and Hunt",
            icon: opImg,
            iconSmall: "assets/operators/skills/arclight/fs_small.png",
            type: "Final Strike",
            shortType: "FS",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
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
            id: (opId * 100) + 2,
            name: "Tempestuous Arc",
            icon: opImg,
            iconSmall: "assets/operators/skills/arclight/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            cooldown: 20,
            energy: 100,
            elementType: "electric",
            description: "Consumes Electrification to launch an additional Electric attack and recover SP.",
            debuffs: [
                {
                    id: "electrification_consumed",
                    name: "Electrification Consumed",
                    appliesEffect: "electrification_consumed",
                    persistsForCombo: false,
                    visible: false
                }
            ],
            buffs: [
                {
                    id: "sp_recovery",
                    name: "SP Recovery",
                    appliesEffect: "sp_recovery",
                    persistsForCombo: false,
                    visible: true,
                    stackable: false
                }
            ]
        },
        {
            id: (opId * 100) + 3,
            name: "Peal of Thunder",
            icon: opImg,
            iconSmall: "assets/operators/skills/arclight/cs_small.png",
            type: "Combo Skill",
            shortType: "CS",
            cooldown: 3,
            energy: 100,
            elementType: "physical",
            description: "Triggers when Electrification is applied or consumed. Recovers SP.",
            comboTriggerMode: "any",
            comboTriggers: [
                { effect: "electrification", minStacks: 1 },
                { effect: "electrification_consumed", minStacks: 1 }
            ],
            allowSelfTrigger: true,
            buffs: [
                {
                    id: "sp_recovery",
                    name: "SP Recovery",
                    appliesEffect: "sp_recovery",
                    persistsForCombo: false,
                    visible: true,
                    stackable: false
                }
            ]
        },
        {
            id: (opId * 100) + 4,
            name: "Exploding Blitz",
            icon: opImg,
            iconSmall: "assets/operators/skills/arclight/ult_small.png",
            type: "Ultimate",
            shortType: "Ult",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Applies Electric Infliction. Lingering arcs can consume Electric Infliction to forcibly apply Electrification.",
            debuffs: [
                {
                    id: "electric_infliction",
                    name: "Electric Infliction",
                    appliesEffect: "electric_infliction",
                    persistsForCombo: true,
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4
                },
                {
                    id: "electrification",
                    name: "Electrification",
                    appliesEffect: "electrification",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false
                }
            ]
        }
    ]
};
