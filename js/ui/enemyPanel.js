function getEffectIcon(effect) {
    if (effect.stackable) {
        const stacks = effect.stacks || 1;
        return `${effect.iconBase}_${stacks}.png`;
    }

    return `${effect.iconBase}.png`;
}

function collectEnemyEffects() {
    const effectMap = new Map();

    rotation.forEach(entry => {
        if (!entry) return;

        const skillData = getSkillById(entry.id);
        if (!skillData || !skillData.debuffs || !Array.isArray(skillData.debuffs)) return;

        skillData.debuffs.forEach(debuff => {
            // Nur eindeutige IDs verwenden
            if (!debuff.id) return;

            const effectId = debuff.id;

            if (!effectMap.has(effectId)) {
                effectMap.set(effectId, {
                    ...debuff,
                    stacks: debuff.stackable ? (debuff.stacksApplied || 1) : 1
                });
            } else {
                const existing = effectMap.get(effectId);

                // Nur wirklich stackbare Effekte erhöhen
                if (existing.stackable) {
                    existing.stacks += debuff.stacksApplied || 1;

                    if (existing.maxStacks) {
                        existing.stacks = Math.min(existing.stacks, existing.maxStacks);
                    }
                }
            }
        });
    });

    return Array.from(effectMap.values());
}

function renderEnemyEffects() {
    const container = document.getElementById("enemyEffects");
    if (!container) return;

    container.innerHTML = "";

    const effects = collectEnemyEffects();

    effects.forEach(effect => {
        const icon = document.createElement("img");
        icon.className = "enemy-effect-icon";
        icon.src = getEffectIcon(effect);
        icon.alt = effect.name || "Effect";
        icon.title = effect.name || "Effect";

        container.appendChild(icon);
    });
}