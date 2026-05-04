function addAmountToEffectMap(effectMap, effectName, amount = 1, maxStacks = null) {
    if (!effectName) return;
    if (!effectMap[effectName]) effectMap[effectName] = 0;
    effectMap[effectName] += amount;
    if (maxStacks) effectMap[effectName] = Math.min(effectMap[effectName], maxStacks);
}

function removeConsumedDebuffsFromEffectMap(skillData, effectMap) {
    if (!Array.isArray(skillData?.consumeDebuffs)) return;
    skillData.consumeDebuffs.forEach(effectName => {
        delete effectMap[effectName];
    });
}

function addTransientSkillTypeTriggers(skillData, effectMap) {
    if (!skillData?.type) return;

    const type = skillData.type.toLowerCase();

    if (type === "final strike") addAmountToEffectMap(effectMap, "final_strike", 1);
    if (type === "combo skill") addAmountToEffectMap(effectMap, "combo_skill", 1);
    if (type === "battle skill") addAmountToEffectMap(effectMap, "battle_skill", 1);
    if (type === "ultimate") addAmountToEffectMap(effectMap, "ultimate", 1);
}

function normalizeComboEffectKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}
function skillConsumesComboEffect(skillData, effectName) {
    const registryEntry = BUFF_REGISTRY?.[effectName];
    if (!registryEntry?.consumeOnSkillType) return false;

    const consumeKey = normalizeComboEffectKey(registryEntry.consumeOnSkillType);
    const skillTypeKey = normalizeComboEffectKey(skillData.type);
    const shortTypeKey = normalizeComboEffectKey(skillData.shortType);

    return consumeKey === skillTypeKey || consumeKey === shortTypeKey;
}

function consumeStackedComboEffectsForSkill(skillData, effectMap, outputMap = effectMap) {
    if (!effectMap) return;
    if (!outputMap) outputMap = effectMap;

    Object.keys(effectMap).forEach(effectName => {
        if (!skillConsumesComboEffect(skillData, effectName)) return;

        const registryEntry = BUFF_REGISTRY?.[effectName];
        if (!registryEntry) return;

        const amount = Number(registryEntry.consumeStacks || 1);

        effectMap[effectName] -= amount;

        if (effectMap[effectName] <= 0) {
            delete effectMap[effectName];

            if (registryEntry.onFullyConsumedEffect) {
                addAmountToEffectMap(
                    outputMap,
                    registryEntry.onFullyConsumedEffect,
                    1
                );
            }
        }
    });
}
function hasRequiredComboBuff(rule, effectMap) {
    const requiredList = Array.isArray(rule?.requiresBuff) ? rule.requiresBuff : [rule?.requiresBuff];
    return requiredList.every(buffName => Boolean(effectMap[normalizeComboEffectKey(buffName)]));
}

function addEffectDefinitionToMap(effect, effectMap) {
    if (!effect?.appliesEffect) return;

    const amount = effect.stackable ? (effect.stacksApplied || 1) : 1;

    addAmountToEffectMap(
        effectMap,
        effect.appliesEffect,
        amount,
        effect.maxStacks || null
    );
}

function applyConditionalDebuffsToComboMap(skillData, effectMap, contextEffectMap = effectMap) {
    if (!Array.isArray(skillData?.conditionalDebuffs)) return;

    skillData.conditionalDebuffs.forEach(rule => {
        if (!hasRequiredComboBuff(rule, contextEffectMap)) return;
        if (!Array.isArray(rule.debuffs)) return;

        rule.debuffs.forEach(effect => {
            if (effect.persistsForCombo === false) return;
            addEffectDefinitionToMap(effect, effectMap);
        });
    });
}

function consumeInflictionToBuffFromEffectMap(skillData, effectMap) {
    const config = skillData?.consumeInflictionToBuff;
    if (!config || !config.infliction) return null;

    const infliction = config.infliction;
    const consumedStacks = Number(effectMap[infliction] || 0);
    if (consumedStacks <= 0) return null;

    delete effectMap[infliction];

    return {
        buffName: config.grantBuff,
        amount: consumedStacks * Number(config.ratio || 1),
        maxStacks: Number(config.maxStacks || 4)
    };
}

function consumeInflictionToBuffFromComboMaps(skillData, maps) {
    const config = skillData?.consumeInflictionToBuff;
    if (!config || !config.infliction) return null;

    const infliction = config.infliction;
    let consumedStacks = 0;

    maps.forEach(effectMap => {
        consumedStacks += Number(effectMap[infliction] || 0);
        delete effectMap[infliction];
    });

    if (consumedStacks <= 0) return null;

    return {
        buffName: config.grantBuff,
        amount: consumedStacks * Number(config.ratio || 1),
        maxStacks: Number(config.maxStacks || 4)
    };
}

function getMatchingInflictionEffect(skillData, effectMap) {
    const config = skillData?.matchingInfliction;
    if (!config || !Array.isArray(config.candidateEffects)) return null;

    const minStacks = Number(config.minStacks || 1);
    const matchingEffect = config.candidateEffects.find(effectName => {
        return (effectMap[effectName] || 0) >= minStacks;
    });

    if (!matchingEffect) return null;

    return {
        effectName: matchingEffect,
        amount: Number(config.stacksApplied || 1),
        maxStacks: Number(config.maxStacks || 4)
    };
}

function applySkillEffectsToComboMap(
    skillData,
    effectMap,
    includeAvailableAfterChain = false,
    includeTransientTriggers = false,
    contextEffectMap = effectMap
) {
    const transientComboTriggerEffects = new Set([
        "final_strike",
        "combo_skill",
        "battle_skill",
        "ultimate",
        "knock_down",
        "pull",
        "stagger",
        "lift",
        "operator_attacked"
    ]);

    const allEffects = [
        ...(Array.isArray(skillData?.debuffs) ? skillData.debuffs : []),
        ...(Array.isArray(skillData?.buffs) ? skillData.buffs : [])
    ];

    allEffects.forEach(effect => {
        if (!effect.appliesEffect) return;
        if (!includeAvailableAfterChain && effect.availableAfterChain === true) return;

        const isTransientTrigger =
            includeTransientTriggers &&
            transientComboTriggerEffects.has(effect.appliesEffect);

        if (effect.persistsForCombo === false && !isTransientTrigger) return;

        addEffectDefinitionToMap(effect, effectMap);
    });

    applyConditionalDebuffsToComboMap(skillData, effectMap, contextEffectMap);
    removeConsumedDebuffsFromEffectMap(skillData, effectMap);
    consumeInflictionToBuffFromEffectMap(skillData, effectMap);

    const matchingInfliction = getMatchingInflictionEffect(skillData, effectMap);
    if (matchingInfliction) {
        addAmountToEffectMap(
            effectMap,
            matchingInfliction.effectName,
            matchingInfliction.amount,
            matchingInfliction.maxStacks
        );
    }
}

function collectPersistentEffectsFromRotationUpToIndex(endIndex) {
    const effectMap = {};

    for (let i = 0; i <= endIndex; i++) {
        const entry = rotation[i];
        if (!entry) continue;

        const skillData = getSkillById(entry.id);
        if (!skillData) continue;

        applySkillEffectsToComboMap(skillData, effectMap, true, false, effectMap);

        consumeStackedComboEffectsForSkill(
            skillData,
            effectMap,
            effectMap
        );
    }

    return effectMap;
}
function collectEffectsFromSkill(skillData, contextEffectMap = {}) {
    const effectMap = {};
    if (!skillData) return effectMap;

    applySkillEffectsToComboMap(skillData, effectMap, false, false, contextEffectMap);
    addTransientSkillTypeTriggers(skillData, effectMap);

    return effectMap;
}

function collectEffectsFromRotationUpToIndex(endIndex) {
    const effectMap = {};
    
    for (let i = 0; i <= endIndex; i++) {
        const entry = rotation[i];
        if (!entry) continue;
        
        const skillData = getSkillById(entry.id);
        if (!skillData) continue;
        
        applySkillEffectsToComboMap(skillData, effectMap, true, false, effectMap);
        
        consumeStackedComboEffectsForSkill(
            skillData,
            effectMap,
            effectMap
        );
    }
    
    return effectMap;
}

function getComboSkillsFromEffects(effectMap, sourceOperatorId) {
    const activeOperators = selectedTeam
        .filter(id => id !== null)
        .map(id => operators.find(op => op.id === id))
        .filter(Boolean);

    const result = [];
    const seen = new Set();

    for (const op of activeOperators) {
        const isSameOperator = op.id === sourceOperatorId;

        for (const skill of op.skills) {
            if (isSameOperator && !skill.allowSelfTrigger) continue;

            const triggers = Array.isArray(skill.comboTriggers)
                ? skill.comboTriggers
                : (skill.comboTrigger ? [{ effect: skill.comboTrigger, minStacks: 1 }] : []);

            if (triggers.length === 0) continue;

            const triggerMode = (skill.comboTriggerMode || "any").toLowerCase();

            const checkTrigger = (trigger) => {
                if (typeof trigger === "string") return (effectMap[trigger] || 0) >= 1;
                if (Array.isArray(trigger.anyOf)) return trigger.anyOf.some(option => checkTrigger(option));
                if (Array.isArray(trigger.allOf)) return trigger.allOf.every(option => checkTrigger(option));

                const effectName = trigger.effect;
                const minStacks = trigger.minStacks || 1;

                return (effectMap[effectName] || 0) >= minStacks;
            };

            const matches = triggerMode === "all"
                ? triggers.every(checkTrigger)
                : triggers.some(checkTrigger);

            if (matches && !seen.has(skill.id)) {
                result.push(skill);
                seen.add(skill.id);
            }
        }
    }

    return result;
}

function collectComboCooldownStateUpToIndex(endIndex) {
    const cooldownState = {};

    for (let i = 0; i <= endIndex; i++) {
        const entry = rotation[i];
        if (!entry) continue;

        const skillData = getSkillById(entry.id);
        if (!skillData) continue;

        if ((skillData.type || "").toLowerCase() === "combo skill") {
            cooldownState[skillData.id] = i;
        }
    }

    return cooldownState;
}

function isComboSkillOnCooldown(comboSkill, comboIndex, cooldownState) {
    const cooldown = Number(comboSkill.cooldown || 0);
    if (cooldown <= 0) return false;

    const lastTriggeredAt = cooldownState[comboSkill.id];
    if (lastTriggeredAt === undefined) return false;

    return (comboIndex - lastTriggeredAt) < cooldown;
}

function insertComboChain(startSkillId, startIndex) {
    const queue = [{ skillId: startSkillId, insertAfterIndex: startIndex }];
    const alreadyInsertedIds = new Set([startSkillId]);

    const MAX_CHAIN_LENGTH = 20;
    let chainCount = 0;

    const persistentEffectMap = collectPersistentEffectsFromRotationUpToIndex(startIndex - 1);
    const chainEffectMap = {};
    const comboCooldownState = collectComboCooldownStateUpToIndex(startIndex - 1);

    while (queue.length > 0) {
        if (chainCount >= MAX_CHAIN_LENGTH) {
            console.warn("Combo chain stopped: maximum chain length reached.");
            break;
        }

        const current = queue.shift();
        const currentSkillData = getSkillById(current.skillId);
        const sourceOperator = getOperatorBySkillId(current.skillId);

        if (!currentSkillData || !sourceOperator) continue;

        const effectMapBeforeSkill = { ...persistentEffectMap };
        Object.entries(chainEffectMap).forEach(([effectName, amount]) => {
            addAmountToEffectMap(effectMapBeforeSkill, effectName, amount);
        });
        
        const currentEffects = collectEffectsFromSkill(currentSkillData, effectMapBeforeSkill);

Object.entries(currentEffects).forEach(([effectName, amount]) => {
    addAmountToEffectMap(chainEffectMap, effectName, amount);
});

consumeStackedComboEffectsForSkill(currentSkillData, chainEffectMap, chainEffectMap);
consumeStackedComboEffectsForSkill(currentSkillData, persistentEffectMap, chainEffectMap);

        removeConsumedDebuffsFromEffectMap(currentSkillData, persistentEffectMap);
        removeConsumedDebuffsFromEffectMap(currentSkillData, chainEffectMap);
        consumeInflictionToBuffFromComboMaps(currentSkillData, [persistentEffectMap, chainEffectMap]);

        const effectMapAfterConsume = { ...persistentEffectMap };

Object.entries(chainEffectMap).forEach(([effectName, amount]) => {
    addAmountToEffectMap(effectMapAfterConsume, effectName, amount);
});

        const matchingInfliction = getMatchingInflictionEffect(currentSkillData, effectMapBeforeSkill);
        if (matchingInfliction) {
            addAmountToEffectMap(chainEffectMap, matchingInfliction.effectName, matchingInfliction.amount, matchingInfliction.maxStacks);
            addAmountToEffectMap(effectMapAfterConsume, matchingInfliction.effectName, matchingInfliction.amount, matchingInfliction.maxStacks);
        }

        const resolvedEffectMap =
            typeof resolveArtsReactions === "function"
                ? resolveArtsReactions(effectMapAfterConsume)
                : effectMapAfterConsume;

        const comboSkills = getComboSkillsFromEffects(resolvedEffectMap, sourceOperator.id);

        let insertOffset = 1;

        comboSkills.forEach(comboSkill => {
            if (alreadyInsertedIds.has(comboSkill.id)) return;

            const comboIndex = current.insertAfterIndex + insertOffset;
            if (isComboSkillOnCooldown(comboSkill, comboIndex, comboCooldownState)) return;

            rotation.splice(comboIndex, 0, {
                uid: crypto.randomUUID(),
                id: comboSkill.id,
                autoInserted: true
            });

            alreadyInsertedIds.add(comboSkill.id);
            comboCooldownState[comboSkill.id] = comboIndex;

            queue.push({
                skillId: comboSkill.id,
                insertAfterIndex: comboIndex
            });

            insertOffset++;
            chainCount++;
        });
    }
}