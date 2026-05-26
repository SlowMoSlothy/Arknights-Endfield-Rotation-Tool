const lifeng = {
    id: 21,
    name: "Lifeng",
    star: 6,
    operatorClass: "Guard",
    icon: "assets/operators/avatars/Lifeng.png",
    elementType: "physical"
};

lifeng.skills = [
    {
        id: (lifeng.id * 100) + 1,
        name: "Ruination",
        icon: lifeng.icon,
        iconSmall: "assets/operators/skills/lifeng/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "physical",
        description: "Physical Final Strike. Deals Stagger when Lifeng is the controlled operator.",
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
        id: (lifeng.id * 100) + 2,
        name: "Turbid Avatar",
        icon: lifeng.icon,
        iconSmall: "assets/operators/skills/lifeng/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 0,
        energy: 100,
        sp_cost: 100,
        elementType: "physical",
        description: "Deals 3 hits of Physical DMG, applies Knock Down and 1 Vulnerable stack. If the target had no Vulnerable stacks before the last hit, also applies Physical Susceptibility.",
        conditionalDebuffs: [
            {
                noneOf: ["vulnerable"],
                debuffs: [
                    {
                        id: "physical_susceptibility",
                        name: "Physical Susceptibility",
                        appliesEffect: "physical_susceptibility",
                        persistsForCombo: true,
                        visible: true,
                        stackable: false
                    }
                ]
            }
        ],
        debuffs: [
            {
                id: "knock_down",
                name: "Knock Down",
                appliesEffect: "knock_down",
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
        id: (lifeng.id * 100) + 3,
        name: "Aspect of Wrath",
        icon: lifeng.icon,
        iconSmall: "assets/operators/skills/lifeng/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 0,
        energy: 0,
        elementType: "physical",
        description: "Triggers when the controlled operator performs a Final Strike on an enemy with Physical Susceptibility or Breach. Deals Physical DMG and grants Link.",
        comboTriggerMode: "all",
        allowSelfTrigger: true,
        comboTriggers: [
            { effect: "final_strike", minStacks: 1 },
            {
                anyOf: [
                    { effect: "physical_susceptibility", minStacks: 1 },
                    { effect: "breach", minStacks: 1 }
                ]
            }
        ],
        buffs: [
            {
                id: "link",
                name: "Link",
                appliesEffect: "link",
                persistsForCombo: true,
                visible: true,
                iconBase: "assets/buffs/link"
            }
        ]
    },

    {
        id: (lifeng.id * 100) + 4,
        name: "Heart of the Unmoving",
        icon: lifeng.icon,
        iconSmall: "assets/operators/skills/lifeng/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 80,
        energy: 100,
        elementType: "physical",
        description: "Deals massive Physical DMG, knocks enemies down, and pulls them closer.",
        debuffs: [
            {
                id: "knock_down",
                name: "Knock Down",
                appliesEffect: "knock_down",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/knock_down"
            },
            {
                id: "pull",
                name: "Pull",
                appliesEffect: "pull",
                persistsForCombo: false,
                visible: true,
                iconBase: "assets/debuffs/pull"
            }
        ]
    }
];
