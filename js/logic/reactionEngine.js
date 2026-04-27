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

function resolveArtsReactions(effectMap) {
    const reactionMap = { ...effectMap };

    ARTS_REACTIONS.forEach(reaction => {
        const hasAllRequiredEffects = reaction.requires.every(effectName => {
            return (reactionMap[effectName] || 0) >= 1;
        });

        if (!hasAllRequiredEffects) return;

        reaction.requires.forEach(effectName => {
            reactionMap[effectName] -= 1;

            if (reactionMap[effectName] <= 0) {
                delete reactionMap[effectName];
            }
        });

        reactionMap[reaction.appliesEffect] =
            (reactionMap[reaction.appliesEffect] || 0) + 1;

        reactionMap[reaction.reactionEffect] =
            (reactionMap[reaction.reactionEffect] || 0) + 1;
    });

    return reactionMap;
}