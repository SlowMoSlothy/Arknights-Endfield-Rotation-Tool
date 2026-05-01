function addAmountToEffectMap(effectMap, effectName, amount = 1, maxStacks = null) {
    if (!effectName) return;
    if (!effectMap[effectName]) effectMap[effectName] = 0;
    effectMap[effectName] += amount;
    if (maxStacks) effectMap[effectName] = Math.min(effectMap[effectName], maxStacks);
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

function applySkillEffectsToComboMap(skillData, effectMap, includeAvailableAfterChain = false) {
    const allEffects = [
        ...(Array.isArray(skillData?.debuffs) ? skillData.debuffs : []),
        ...(Array.isArray(skillData?.buffs) ? skillData.buffs : [])
    ];

    allEffects.forEach(effect => {
        if (!effect.appliesEffect) return;
        if (!includeAvailableAfterChain && effect.availableAfterChain === true) return;
        if (effect.persistsForCombo === false) return;

        const amount = effect.stackable ? (effect.stacksApplied || 1) : 1;
        addAmountToEffectMap(effectMap, effect.appliesEffect, amount, effect.maxStacks || null);
    });

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

        applySkillEffectsToComboMap(skillData, effectMap, true);
    }

    return effectMap;
}

function collectEffectsFromSkill(skillData) {
    const effectMap = {};
    if (!skillData) return effectMap;
    applySkillEffectsToComboMap(skillData, effectMap, false);
    return effectMap;
}

function collectEffectsFromRotationUpToIndex(endIndex) {
    const effectMap = {};

    for (let i = 0; i <= endIndex; i++) {
        const entry = rotation[i];
        if (!entry) continue;

        const skillData = getSkillById(entry.id);
        if (!skillData) continue;

        applySkillEffectsToComboMap(skillData, effectMap, true);
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

function insertComboChain(startSkillId, startIndex) {
    const queue = [{ skillId: startSkillId, insertAfterIndex: startIndex }];
    const alreadyInsertedIds = new Set([startSkillId]);

    const MAX_CHAIN_LENGTH = 20;
    let chainCount = 0;

    const persistentEffectMap = collectPersistentEffectsFromRotationUpToIndex(startIndex - 1);
    const chainEffectMap = {};

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

        const currentEffects = collectEffectsFromSkill(currentSkillData);

        Object.entries(currentEffects).forEach(([effectName, amount]) => {
            addAmountToEffectMap(chainEffectMap, effectName, amount);
        });

        consumeInflictionToBuffFromEffectMap(currentSkillData, chainEffectMap);

        const matchingInfliction = getMatchingInflictionEffect(currentSkillData, effectMapBeforeSkill);
        if (matchingInfliction) {
            addAmountToEffectMap(
                chainEffectMap,
                matchingInfliction.effectName,
                matchingInfliction.amount,
                matchingInfliction.maxStacks
            );
        }

        const effectMap = { ...persistentEffectMap };

        Object.entries(chainEffectMap).forEach(([effectName, amount]) => {
            addAmountToEffectMap(effectMap, effectName, amount);
        });

        const resolvedEffectMap =
            typeof resolveArtsReactions === "function"
                ? resolveArtsReactions(effectMap)
                : effectMap;

        const comboSkills = getComboSkillsFromEffects(resolvedEffectMap, sourceOperator.id);

        let insertOffset = 1;

        comboSkills.forEach(comboSkill => {
            if (alreadyInsertedIds.has(comboSkill.id)) return;

            const comboIndex = current.insertAfterIndex + insertOffset;

            rotation.splice(comboIndex, 0, {
                uid: crypto.randomUUID(),
                id: comboSkill.id,
                autoInserted: true
            });

            alreadyInsertedIds.add(comboSkill.id);

            queue.push({
                skillId: comboSkill.id,
                insertAfterIndex: comboIndex
            });

            insertOffset++;
            chainCount++;
        });
    }
}