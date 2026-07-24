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

function getConfiguredArtsReactionRules() {
    return Array.isArray(ARTS_REACTIONS) ? ARTS_REACTIONS : [];
}

function getArtsReactionEffectNames() {
    return [
        "arts_reaction",
        ...getConfiguredArtsReactionRules().flatMap(rule => [rule.appliesEffect, rule.reactionEffect])
    ].filter((effectName, index, values) => effectName && values.indexOf(effectName) === index);
}

function resolveLatestElementalReaction(reactionMap, latestEffectNames = []) {
    const latestEffects = Array.isArray(latestEffectNames) ? latestEffectNames : [latestEffectNames];
    const reaction = getConfiguredArtsReactionRules().find(rule => {
        return rule.triggerEffect
            && latestEffects.includes(rule.triggerEffect)
            && (reactionMap[rule.triggerEffect] || 0) >= 1;
    });

    if (!reaction) {
        return false;
    }

    const compatibleEffects = Array.isArray(reaction.requiresAny)
        ? reaction.requiresAny
        : ELEMENTAL_INFLICTION_EFFECTS.filter(effectName => effectName !== reaction.triggerEffect);
    const previousInflictions = compatibleEffects.filter(effectName => (reactionMap[effectName] || 0) >= 1);

    if (previousInflictions.length === 0) return false;

    ELEMENTAL_INFLICTION_EFFECTS.concat(getArtsReactionEffectNames()).forEach(effectName => {
        delete reactionMap[effectName];
    });

    addEffectToMap(reactionMap, reaction.appliesEffect || "arts_reaction", 1);
    addEffectToMap(reactionMap, reaction.reactionEffect, 1);

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
    getArtsReactionEffectNames().forEach(effectName => {
        delete reactionMap[effectName];
    });

    addEffectToMap(reactionMap, reaction.appliesEffect, 1);
    addEffectToMap(reactionMap, reaction.reactionEffect, 1);

    return true;
}

function resolveArtsReactions(effectMap, latestEffectNames = []) {
    const reactionMap = { ...effectMap };
    const reactionRules = getConfiguredArtsReactionRules();

    resolveLatestElementalReaction(reactionMap, latestEffectNames);

    let reactionResolved = true;
    let safetyCounter = 0;
    const MAX_REACTION_LOOPS = 20;

    while (reactionResolved && safetyCounter < MAX_REACTION_LOOPS) {
        reactionResolved = false;
        safetyCounter++;

        for (const reaction of reactionRules.filter(rule => !rule.triggerEffect)) {
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
