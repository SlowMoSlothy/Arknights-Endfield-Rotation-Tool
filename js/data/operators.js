const operators = [
    {
        id: 1,
        name: "Laevatain",
        icon: "assets/operators/avatars/Laevatain.png",
        skills: [
            {
                id: 101,
                name: "Flaming Cinders",
                icon: "assets/operators/skills/laevatain/fs.png",
                iconSmall: "assets/operators/skills/laevatain/fs_small.png",
                type: "FS",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden.",
                debuffs: [
                    {
                        id: "heat",
                        name: "Heat DMG",
                        appliesEffect: "Heat DMG",
                        stackable: true,
                        maxStacks: 3,
                        stacksApplied: 1,
                        iconBase: "assets/debuffs/heat"
                    },
                    {
                        id: "lift",
                        name: "Lift",
                        appliesEffect: "Lift",
                        stackable: false,
                        iconBase: "assets/debuffs/lift"
                    }
                ]
},
            {
                id: 102,
                name: "Battle Skill",
                icon: "assets/operators/skills/laevatain/bs.png",
                iconSmall: "assets/operators/skills/laevatain/bs_small.png",
                type: "BS",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden.",
                debuffs: [
                    {
                        id: "heat",
                        name: "Melting Flame",
                        appliesEffect: "Melting Flame",
                        stackable: true,
                        maxStacks: 4,
                        stacksApplied: 1,
                        iconBase: "assets/debuffs/melting_flames"
                    }
                ]
            }
            ,
            {
                id: 103,
                name: "Combo Skill",
                icon: "assets/operators/skills/laevatain/cs.png",
                iconSmall: "assets/operators/skills/laevatain/cs_small.png",
                type: "CS",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden.",
                comboTriggers: ["Combustion", "Corrosion"]
            }
        ]
    },
    {
        id: 2,
        name: "Akekuri",
        icon: "assets/operators/avatars/Akekuri.png",
        skills: [
            {
                id: 201,
                name: "Sword of Aspiration",
                icon: "assets/operators/skills/akekuri/fs.png",
                iconSmall: "assets/operators/skills/akekuri/fs_small.png",
                type: "ultimate",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            },
            {
                id: 202,
                name: "Burst of Passion",
                icon: "assets/operators/skills/akekuri/bs.png",
                iconSmall: "assets/operators/skills/akekuri/bs_small.png",
                type: "bs",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            },
            {
                id: 203,
                name: "Flash and Dash",
                icon: "assets/operators/skills/akekuri/cs.png",
                iconSmall: "assets/operators/skills/akekuri/cs_small.png",
                type: "cs",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden.",
                comboTrigger: "Lift"
            },
            {
                id: 204,
                name: "SQUAD! ON ME!",
                icon: "assets/operators/skills/akekuri/ult.png",
                iconSmall: "assets/operators/skills/akekuri/ult_small.png",
                type: "ult",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            }
        ]
    },
    {
        id: 3,
        name: "Endministrator",
        icon: "assets/operators/avatars/Endmin.png",
        skills: [
            {
                id: 301,
                name: "Final Strike",
                icon: "assets/operators/skills/endmin/fs.png",
                iconSmall: "assets/operators/skills/endmin/fs_small.png",
                type: "ultimate",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            }
        ]
    },
    {
        id: 4,
        name: "Perlica",
        icon: "assets/operators/avatars/Perlica.png",
        skills: [
            {
                id: 401,
                name: "Overdrive Burst",
                icon: "assets/operators/skills/perlica/fs.png",
                iconSmall: "assets/operators/skills/perlica/fs_small.png",
                type: "ultimate",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            }
        ]
    }
    ,
    {
        id: 5,
        name: "Rossi",
        icon: "assets/operators/avatars/Rossi.png",
        skills: [
            {
                id: 501,
                name: "Seething Wolfblood",
                icon: "assets/operators/skills/rossi/fs.png",
                iconSmall: "assets/operators/skills/rossi/fs_small.png",
                type: "fs",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            },
            {
                id: 502,
                name: "Crimson Shadow",
                icon: "assets/operators/skills/rossi/bs.png",
                iconSmall: "assets/operators/skills/rossi/bs_small.png",
                type: "bs",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            },
            {
                id: 503,
                name: "Moment of Blazing Shadow",
                icon: "assets/operators/skills/rossi/cs.png",
                iconSmall: "assets/operators/skills/rossi/cs_small.png",
                type: "cs",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            },
            {
                id: 504,
                name: '"Razorclaw" Ambuscade',
                icon: "assets/operators/skills/rossi/ult.png",
                iconSmall: "assets/operators/skills/rossi/ult_small.png",
                type: "ult",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            }
        ]
    }
];