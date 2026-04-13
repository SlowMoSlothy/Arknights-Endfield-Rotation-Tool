const endministrator = {
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
            debuffs: [
                {
                    id: "final_strike",
                    name: "Final Strike",
                    appliesEffect: "final_strike",
                    visible: false
                }
            ]
        }
    ]
}