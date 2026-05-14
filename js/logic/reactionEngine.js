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

const ELEMENTAL_INFLICTION_EFFECTS = [
    "electric_infliction",
    "heat_infliction",
    "cryo_infliction",
    "nature_infliction"
];

const LATEST_ELEMENT_REACTIONS = {
    cryo_infliction: "solidification",
    heat_infliction: "combustion",
    nature_infliction: "corrosion"
};

const ARTS_REACTION_EFFECTS = [
    "arts_reaction",
    "combustion",
    "corrosion",
    "solidification"
];

const LATEST_REACTION_OWN_EFFECTS = {
    cryo_infliction: "solidification",
    heat_infliction: "combustion",
    nature_infliction: "corrosion"
};

function resolveLatestElementalReaction(reactionMap, latestEffectNames = []) {
    const latestEffects = Array.isArray(latestEffectNames) ? latestEffectNames : [latestEffectNames];
    const latestInfliction = Object.keys(LATEST_ELEMENT_REACTIONS).find(effectName => {
        return latestEffects.includes(effectName) && (reactionMap[effectName] || 0) >= 1;
    });

    if (!latestInfliction) {
        return false;
    }

    const previousInflictions = ELEMENTAL_INFLICTION_EFFECTS
        .concat(ARTS_REACTION_EFFECTS.filter(effectName => effectName !== "arts_reaction"))
        .filter(effectName => {
            return effectName !== latestInfliction
                && effectName !== LATEST_REACTION_OWN_EFFECTS[latestInfliction]
                && (reactionMap[effectName] || 0) >= 1;
        });

    if (previousInflictions.length === 0) return false;

    ELEMENTAL_INFLICTION_EFFECTS.concat(ARTS_REACTION_EFFECTS).forEach(effectName => {
        delete reactionMap[effectName];
    });

    addEffectToMap(reactionMap, "arts_reaction", 1);
    addEffectToMap(reactionMap, LATEST_ELEMENT_REACTIONS[latestInfliction], 1);

    return true;
}

function resolveSingleArtsReaction(reactionMap, reaction) {
    const hasAllRequiredEffects = reaction.requires.every(effectName => {
        return (reactionMap[effectName] || 0) >= 1;
    });

    if (!hasAllRequiredEffects) return false;

    reaction.requires.forEach(effectName => {
        consumeEffectFromMap(reactionMap, effectName, 1);
    });
    ARTS_REACTION_EFFECTS.forEach(effectName => {
        delete reactionMap[effectName];
    });

    addEffectToMap(reactionMap, reaction.appliesEffect, 1);
    addEffectToMap(reactionMap, reaction.reactionEffect, 1);

    return true;
}

function resolveArtsReactions(effectMap, latestEffectNames = []) {
    const reactionMap = { ...effectMap };
    const reactionRules = Array.isArray(ARTS_REACTIONS) ? ARTS_REACTIONS : [];

    resolveLatestElementalReaction(reactionMap, latestEffectNames);

    let reactionResolved = true;
    let safetyCounter = 0;
    const MAX_REACTION_LOOPS = 20;

    while (reactionResolved && safetyCounter < MAX_REACTION_LOOPS) {
        reactionResolved = false;
        safetyCounter++;

        for (const reaction of reactionRules) {
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
