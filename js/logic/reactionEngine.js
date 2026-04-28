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

function addEffectToMap(effectMap, effectName, amount = 1) {
    if (!effectName) return;
    effectMap[effectName] = (effectMap[effectName] || 0) + amount;
}

function consumeEffectFromMap(effectMap, effectName, amount = 1) {
    if (!effectName) return;
    if (!effectMap[effectName]) return;

    effectMap[effectName] -= amount;

    if (effectMap[effectName] <= 0) {
        delete effectMap[effectName];
    }
}

function resolveSingleArtsReaction(reactionMap, reaction) {
    const hasAllRequiredEffects = reaction.requires.every(effectName => {
        return (reactionMap[effectName] || 0) >= 1;
    });

    if (!hasAllRequiredEffects) return false;

    reaction.requires.forEach(effectName => {
        consumeEffectFromMap(reactionMap, effectName, 1);
    });

    addEffectToMap(reactionMap, reaction.appliesEffect, 1);
    addEffectToMap(reactionMap, reaction.reactionEffect, 1);

    return true;
}

function resolveArtsReactions(effectMap) {
    const reactionMap = { ...effectMap };

    let reactionResolved = true;
    let safetyCounter = 0;
    const MAX_REACTION_LOOPS = 20;

    while (reactionResolved && safetyCounter < MAX_REACTION_LOOPS) {
        reactionResolved = false;
        safetyCounter++;

        for (const reaction of ARTS_REACTIONS) {
            const resolved = resolveSingleArtsReaction(reactionMap, reaction);

            if (resolved) {
                reactionResolved = true;
            }
        }
    }

    if (safetyCounter >= MAX_REACTION_LOOPS) {
        console.warn("Arts reaction resolution stopped: maximum loop count reached.");
    }

    return reactionMap;
}