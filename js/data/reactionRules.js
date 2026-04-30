const ARTS_REACTIONS = [
    {
        id: "combustion",
        name: "Combustion",
        requires: ["heat_infliction", "electric_infliction"],
        appliesEffect: "arts_reaction",
        reactionEffect: "combustion",
        persistsForCombo: false
    },
    {
        id: "corrosion",
        name: "Corrosion",
        requires: ["nature_infliction", "electric_infliction"],
        appliesEffect: "arts_reaction",
        reactionEffect: "corrosion",
        persistsForCombo: false
    },
    {
        id: "solidification",
        name: "Solidification",
        requires: ["cryo_infliction", "nature_infliction"],
        appliesEffect: "arts_reaction",
        reactionEffect: "solidification",
        persistsForCombo: false
    }
];
