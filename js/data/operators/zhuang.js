const zhuang = {
    id: 9,
    name: "Zhuang",
    star: 6,
    operatorClass: "Striker",
    icon: "assets/operators/avatars/Zhuang.png",
    canEnterUltimateState: true,
    elementType: "electric",
    skills: [
        {
            id: 901,
            name: "Jolting Arts",
            icon: "assets/operators/avatars/Zhuang.png",
            iconSmall: "assets/ui/skills/batk/art_unit.svg",
            type: "Final Strike",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "FS",
            shortType: "FS",
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
            id: 902,
            name: "Mantra of Sundering",
            icon: "assets/operators/avatars/Zhuang.png",
            iconSmall: "assets/operators/skills/zhuang/bs_small.svg",
            type: "Battle Skill",
            cooldown: 20,
            energy: 100,
            sp_cost: 100,
            elementType: "electric",
            shortType: "BS",
            description: "Consumes Electrification to create Sunderblades, channels nearby Sunderblades for Thunder Strikes, and grants Electric Amp.",
            consumeDebuffs: ["electrification"],
            buffs: [
                {
                    id: "electric_amp",
                    name: "Electric Amp",
                    appliesEffect: "electric_amp",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false
                }
            ]
        },
        {
            id: 903,
            name: "Breath of Transformation",
            icon: "assets/operators/avatars/Zhuang.png",
            iconSmall: "assets/operators/skills/zhuang/cs_small.png",
            type: "Combo Skill",
            cooldown: 17,
            energy: 0,
            elementType: "electric",
            shortType: "CS",
            description: "Triggers on Final Strike or Finisher against a target with Electric Infliction. Consumes Electric Infliction to forcibly apply Electrification.",
            comboTriggerMode: "all",
            comboTriggers: [
                { effect: "final_strike", minStacks: 1 },
                { effect: "electric_infliction", minStacks: 1 }
            ],
            allowSelfTrigger: true,
            consumeDebuffs: [
                "electric_infliction"
            ],
            debuffs: [
                {
                    id: "electrification",
                    name: "Electrification",
                    appliesEffect: "electrification",
                    persistsForCombo: true,
                    visible: true,
                    stackable: false
                }
            ]
        },
        {
            id: 904,
            name: "Smiting Tempest",
            icon: "assets/operators/avatars/Zhuang.png",
            iconSmall: "assets/operators/skills/zhuang/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 240,
            elementType: "electric",
            shortType: "Ult",
            description: "Transforms into Empyrean of Truth, enhancing Zhuang Fangyi's basic attacks, Battle Skill, and Combo Skill for a duration."
        }
    ],
    altSkills: [
        {
            id: 911,
            name: "Flaming Cinders EX",
            baseType: "Final Strike",
            icon: "assets/operators/skills/zhuang/fs_ex.png",
            iconSmall: "assets/operators/skills/zhuang/fs_ex_small.png"
        }
    ]
};
