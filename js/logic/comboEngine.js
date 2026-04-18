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

        const skillEffects = collectEffectsFromSkill(skillData);

        Object.entries(skillEffects).forEach(([effectName, amount]) => {
            if (!effectMap[effectName]) {
                effectMap[effectName] = 0;
            }

            effectMap[effectName] += amount;
        });
    }

    return effectMap;
}

 function getComboSkillsFromEffects(effectMap, sourceOperatorId) {
    console.log("=== getComboSkillsFromEffects ===");
    console.log("effectMap:", effectMap);
    console.log("sourceOperatorId:", sourceOperatorId);
    console.log("selectedTeam:", selectedTeam);

    const activeOperators = selectedTeam
        .filter(id => id !== null)
        .map(id => operators.find(op => op.id === id))
        .filter(Boolean);

    console.log("activeOperators:", activeOperators.map(op => `${op.id} ${op.name}`));

    const result = [];
    const seen = new Set();

    for (const op of activeOperators) {
        const isSameOperator = op.id === sourceOperatorId;

        console.log("checking operator:", op.name, "isSameOperator:", isSameOperator);

        for (const skill of op.skills) {

            if (op.name === "Perlica") {
                console.log("PERLICA DEBUG =>", {
                    skillName: skill.name,
                    skillId: skill.id,
                    allowSelfTrigger: skill.allowSelfTrigger,
                    comboTriggers: skill.comboTriggers,
                    isSameOperator,
                    finalStrikeValue: effectMap["final_strike"] || 0
                });
            }
            
            console.log("  skill:", skill.name, "allowSelfTrigger:", skill.allowSelfTrigger, "comboTriggers:", skill.comboTriggers);

            if (isSameOperator && !skill.allowSelfTrigger) {
                console.log("   -> skipped because self trigger not allowed");
                continue;
            }

            const triggers = Array.isArray(skill.comboTriggers)
                ? skill.comboTriggers
                : (skill.comboTrigger ? [{ effect: skill.comboTrigger, minStacks: 1 }] : []);

            const matches = triggers.some(trigger => {
                if (typeof trigger === "string") {
                    const ok = (effectMap[trigger] || 0) >= 1;
                    console.log("   string trigger:", trigger, "=>", ok);
                    return ok;
                }

                const effectName = trigger.effect;
                const minStacks = trigger.minStacks || 1;
                const ok = (effectMap[effectName] || 0) >= minStacks;

                console.log("   object trigger:", effectName, "minStacks:", minStacks, "current:", effectMap[effectName] || 0, "=>", ok);
                return ok;
            });

            if (matches && !seen.has(skill.id)) {
                console.log("   -> MATCH:", skill.name);
                result.push(skill);
                seen.add(skill.id);
            }
        }
    }

    console.log("result:", result.map(skill => skill.name));
    return result;
}

function insertComboChain(startSkillId, startIndex) {
    const queue = [{ skillId: startSkillId, insertAfterIndex: startIndex }];
    const alreadyInsertedIds = new Set([startSkillId]);

    const MAX_CHAIN_LENGTH = 20;
    let chainCount = 0;

    // Nur Effekte der AKTUELLEN Combo-Kette
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

        // Nur Effekte dieses aktuellen Skills sammeln
        const currentEffects = collectEffectsFromSkill(currentSkillData);

        // In die aktuelle Kette addieren
        Object.entries(currentEffects).forEach(([effectName, amount]) => {
            if (!chainEffectMap[effectName]) {
                chainEffectMap[effectName] = 0;
            }
            chainEffectMap[effectName] += amount;
        });

        console.log("current skill:", currentSkillData.name);
        console.log("source operator:", sourceOperator.name, sourceOperator.id);
        console.log("chainEffectMap before combo search:", chainEffectMap);

        const comboSkills = getComboSkillsFromEffects(chainEffectMap, sourceOperator.id);

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