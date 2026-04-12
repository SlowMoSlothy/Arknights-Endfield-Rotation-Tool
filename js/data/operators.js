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
                buffs: [
                    {
                        id: "final_strike",
                        name: "Final Strike",
                        appliesEffect: "final_strike",
                        visible: false
                    }
                ]
            },
            {
                id: 102,
                name: "Smouldering Fire",
                icon: "assets/operators/skills/laevatain/bs.png",
                iconSmall: "assets/operators/skills/laevatain/bs_small.png",
                type: "BS",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden.",
                buffs: [
                    {
                        id: "melting_flames",
                        name: "Melting Flame",
                        appliesEffect: "Melting Flame",
                        stackable: true,
                        maxStacks: 4,
                        stacksApplied: 1,
                        iconBase: "assets/buffs/laevatain/melting_flames"
                    }
                ]
            }
            ,
            {
                id: 103,
                name: "Seethe",
                icon: "assets/operators/skills/laevatain/cs.png",
                iconSmall: "assets/operators/skills/laevatain/cs_small.png",
                type: "CS",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden.",
                comboTriggers: ["Combustion", "Corrosion"],
                buffs: [
                    {
                        id: "melting_flames",
                        name: "Melting Flame",
                        appliesEffect: "Melting Flame",
                        stackable: true,
                        maxStacks: 4,
                        stacksApplied: 1,
                        iconBase: "assets/buffs/laevatain/melting_flames"
                    }
                ]
            },
            {
                id: 104,
                name: "Twilight",
                icon: "assets/operators/skills/laevatain/ult.png",
                iconSmall: "assets/operators/skills/laevatain/ult_small.png",
                type: "ult",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
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
                description: "Massiver AoE Schaden.",
                buffs: [
                    {
                        id: "final_strike",
                        name: "Final Strike",
                        appliesEffect: "final_strike",
                        stackable: false,
                        visible: false
                    }
                ]
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
                description: "Massiver AoE Schaden."
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
                description: "Massiver AoE Schaden.",
                buffs: [
                    {
                        id: "final_strike",
                        name: "Final Strike",
                        appliesEffect: "final_strike",
                        stackable: false,
                        visible: false
                    }
                ]
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
                name: "Protocol α: Breach",
                icon: "assets/operators/skills/perlica/fs.png",
                iconSmall: "assets/operators/skills/perlica/fs_small.png",
                type: "fs",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            },
            {
                id: 402,
                name: "Protocol ω: Strike",
                icon: "assets/operators/skills/perlica/bs.png",
                iconSmall: "assets/operators/skills/perlica/bs_small.png",
                type: "bs",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            },
            {
                id: 403,
                name: "Instant Protocol: Chain",
                icon: "assets/operators/skills/perlica/cs.png",
                iconSmall: "assets/operators/skills/perlica/cs_small.png",
                type: "CS",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden.",
                comboTriggers: ["final_strike"]
            },
            {
                id: 404,
                name: "Protocol ε: 70.41K",
                icon: "assets/operators/skills/perlica/ult.png",
                iconSmall: "assets/operators/skills/perlica/ult_small.png",
                type: "ult",
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
                description: "Massiver AoE Schaden.",
                buffs: [
                    {
                        id: "final_strike",
                        name: "Final Strike",
                        appliesEffect: "final_strike",
                        stackable: false,
                        visible: false
                    }
                ]
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