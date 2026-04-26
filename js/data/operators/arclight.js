const opImg = "assets/operators/avatars/Arclight.png";
const opId = 6;

const arclight = {
    id: opId,
    name: "Arclight",
    icon: opImg,
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
            id: (opId * 100) + 2,
            name: "Tempestuous Arc",
            icon: opImg,
            iconSmall: "assets/operators/skills/arclight/bs_small.png",
            type: "Battle Skill",
            shortType: "BS",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Consumes Electrification.",
            debuffs: [
                {
                    id: "electrification_consumed",
                    name: "Electrification Consumed",
                    appliesEffect: "electrification_consumed",
                    persistsForCombo: false,
                    visible: false
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
            description: "Triggers when Electrification is applied or consumed.",
            comboTriggerMode: "any",
            comboTriggers: [
                { effect: "electrification", minStacks: 1 },
                { effect: "electrification_consumed", minStacks: 1 }
            ],
            allowSelfTrigger: true
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
            description: "Applies Electrification.",
            debuffs: [
                {
                    id: "electrification",
                    name: "Electrification",
                    appliesEffect: "electrification",
                    persistsForCombo: true,
                    visible: true,
                    stackable: true,
                    stacksApplied: 1,
                    maxStacks: 4,
                    iconBase: "assets/debuffs/electrification"
                }
            ]
        }
    ]
};