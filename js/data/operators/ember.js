const ember = {
    id: 17,
    name: "Ember",
    icon: "assets/operators/avatars/Ember.png",
    elementType: "heat"
};

ember.skills = [
    {
        id: (ember.id * 100) + 1,
        name: "Sword Art of Assault",
        icon: ember.icon,
        iconSmall: "assets/operators/skills/ember/fs_small.png",
        type: "Final Strike",
        shortType: "FS",
        cooldown: 20,
        energy: 60,
        elementType: "physical",
        description: "Physical Final Strike. Deals Stagger when Ember is the controlled operator.",
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
                visible: true
            }
        ]
    },

    {
        id: (ember.id * 100) + 2,
        name: "Forward March",
        icon: ember.icon,
        iconSmall: "assets/operators/skills/ember/bs_small.png",
        type: "Battle Skill",
        shortType: "BS",
        cooldown: 20,
        energy: 100,
        elementType: "heat",
        description: "Deals Heat DMG and applies Knock Down. If Ember takes DMG while casting, the slam deals additional Stagger.",
        debuffs: [
            {
                id: "knock_down",
                name: "Knock Down",
                appliesEffect: "knock_down",
                persistsForCombo: false,
                visible: true
            }
        ]
    },

    {
        id: (ember.id * 100) + 3,
        name: "Frontline Support",
        icon: ember.icon,
        iconSmall: "assets/operators/skills/ember/cs_small.png",
        type: "Combo Skill",
        shortType: "CS",
        cooldown: 19,
        energy: 0,
        elementType: "physical",
        description: "Triggers when the controlled operator is attacked. Deals Physical DMG, applies Knock Down, and heals the controlled operator.",
        comboTriggerMode: "all",
        comboTriggers: [
            { effect: "operator_attacked", minStacks: 1 }
        ],
        debuffs: [
            {
                id: "knock_down",
                name: "Knock Down",
                appliesEffect: "knock_down",
                persistsForCombo: false,
                visible: true
            }
        ],
        buffs: [
            {
                id: "hp_treatment",
                name: "HP Treatment",
                appliesEffect: "hp_treatment",
                persistsForCombo: false,
                visible: true
            }
        ]
    },

    {
        id: (ember.id * 100) + 4,
        name: "Re-Ignited Oath",
        icon: ember.icon,
        iconSmall: "assets/operators/skills/ember/ult_small.png",
        type: "Ultimate",
        shortType: "Ult",
        cooldown: 20,
        energy: 100,
        elementType: "heat",
        description: "Deals Heat DMG nearby and grants all teammates a Shield based on Ember's Max HP.",
        buffs: [
            {
                id: "shield",
                name: "Shield",
                appliesEffect: "shield",
                persistsForCombo: true,
                visible: true
            }
        ]
    }
];