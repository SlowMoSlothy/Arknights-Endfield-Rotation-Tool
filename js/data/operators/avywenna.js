const avywenna = {
    id: 7,
    name: "Avywenna",
    icon: "assets/operators/avatars/Avywenna.png",
    skills: [
        {
            id: 701,
            name: "Thunderlance: Blitz",
            icon: "assets/operators/skills/avywenna/fs.png",
            iconSmall: "assets/operators/skills/avywenna/fs_small.png",
            type: "Final Strike",
            cooldown: 20,
            energy: 60,
            elementType: "physical",
            description: "Massiver AoE Schaden.",
            debuffs: [
                {
                    id: "final_strike",
                    name: "Final Strike",
                    appliesEffect: "final_strike",
                    persistsForCombo: false,
                    visible: false
                }
            ],
        },
        {
            id: 702,
            name: "Thunderlance: Interdiction",
            icon: "assets/operators/skills/avywenna/bs.png",
            iconSmall: "assets/operators/skills/avywenna/bs_small.png",
            type: "Battle Skill",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "FS"
        },
        {
            id: 703,
            name: "Thunderlance: Strike",
            icon: "assets/operators/skills/avywenna/cs.png",
            iconSmall: "assets/operators/skills/avywenna/cs_small.png",
            type: "ComboSkill",
            cooldown: 0,
            energy: 0,
            elementType: "electric",
            comboTriggerMode: "all",
comboTriggers: [
    { effect: "final_strike"},
    { effect: "electric", minStacks: 1 }
],
debuffs: [
                {
                    id: "electrification",
                    name: "Electrification",
                    appliesEffect: "electrification",
                    persistsForCombo: true,
                    visible: false
                }]
            ,
            description: "CS"
        },
        {
            id: 704,
            name: "Thunderlance: Final Shock",
            icon: "assets/operators/skills/avywenna/ult.png",
            iconSmall: "assets/operators/skills/avywenna/ult_small.png",
            type: "Ultimate",
            cooldown: 20,
            energy: 60,
            elementType: "electric",
            description: "Ultimate"
        }
    ]
}