function collectEffectsFromSkill(skillData) {
    const effectMap = {};

    if (!skillData) return effectMap;

    const allEffects = [
        ...(Array.isArray(skillData.debuffs) ? skillData.debuffs : []),
        ...(Array.isArray(skillData.buffs) ? skillData.buffs : [])
    ];

    allEffects.forEach(effect => {
        if (!effect.appliesEffect) return;

        const amount = effect.stackable ? (effect.stacksApplied || 1) : 1;

        if (!effectMap[effect.appliesEffect]) {
            effectMap[effect.appliesEffect] = 0;
        }

        effectMap[effect.appliesEffect] += amount;

        if (effect.maxStacks) {
            effectMap[effect.appliesEffect] = Math.min(
                effectMap[effect.appliesEffect],
                effect.maxStacks
            );
        }
    });

    return effectMap;
}

function collectEffectsFromRotationUpToIndex(endIndex) {
    const effectMap = {};
    
    for (let i = 0; i <= endIndex; i++) {
        const entry = rotation[i];
        if (!entry) continue;
        
        const skillData = getSkillById(entry.id);
        if (!skillData) continue;
        
        const allEffects = [
            ...(Array.isArray(skillData.debuffs) ? skillData.debuffs : []),
            ...(Array.isArray(skillData.buffs) ? skillData.buffs : [])
        ];
        
        allEffects.forEach(effect => {
            if (!effect.appliesEffect) return;
            
            const amount = effect.stackable ? (effect.stacksApplied || 1) : 1;
            
            if (!effectMap[effect.appliesEffect]) {
                effectMap[effect.appliesEffect] = 0;
            }
            
            effectMap[effect.appliesEffect] += amount;
            
            if (effect.maxStacks) {
                effectMap[effect.appliesEffect] = Math.min(
                    effectMap[effect.appliesEffect],
                    effect.maxStacks
                );
            }
        });
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
                if (typeof trigger === "string") {
                    return (effectMap[trigger] || 0) >= 1;
                }

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
    
    while (queue.length > 0) {
        if (chainCount >= MAX_CHAIN_LENGTH) {
            console.warn("Combo chain stopped: maximum chain length reached.");
            break;
        }
        
        const current = queue.shift();
        const currentSkillData = getSkillById(current.skillId);
        const sourceOperator = getOperatorBySkillId(current.skillId);
        
        if (!currentSkillData || !sourceOperator) continue;
        
        // Wichtig: alle Effekte bis zu diesem Punkt der Rotation sammeln
        const effectMap = collectEffectsFromRotationUpToIndex(current.insertAfterIndex);
        
        console.log("current skill:", currentSkillData.name);
        console.log("source operator:", sourceOperator.name, sourceOperator.id);
        console.log("effectMap before combo search:", effectMap);
        
        const comboSkills = getComboSkillsFromEffects(effectMap, sourceOperator.id);
        
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