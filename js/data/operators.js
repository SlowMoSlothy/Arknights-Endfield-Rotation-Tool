const operators = [
    {
        id: 1,
        name: "Operator A",
        skills: [
            {
                id: 101,
                name: "Blade Surge",
                icon: "assets/icons/skill1.png",
                type: "damage",
                cooldown: 6,
                energy: 20,
                description: "Schneller Angriff."
            },
            {
                id: 102,
                name: "Energy Pulse",
                icon: "assets/icons/skill2.png",
                type: "support",
                cooldown: 10,
                energy: 0,
                description: "Energie Regeneration."
            }
        ]
    },
    {
        id: 2,
        name: "Operator B",
        skills: [
            {
                id: 201,
                name: "Overdrive Burst",
                icon: "assets/icons/skill3.png",
                type: "ultimate",
                cooldown: 20,
                energy: 60,
                description: "Massiver AoE Schaden."
            }
        ]
    }
];