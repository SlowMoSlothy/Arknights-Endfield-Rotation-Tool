function getBuffIcon(buff) {
    if (!buff || typeof buff.iconBase !== "string") {
        return null;
    }

    const iconBase = buff.iconBase.trim();

    if (!iconBase || iconBase === "undefined" || iconBase === "null") {
        return null;
    }

    if (buff.stackable) {
        const stacks = buff.stacks || 1;
        return `${iconBase}_${stacks}.png`;
    }

    return `${iconBase}.png`;
}

function normalizeConsumeKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

function skillConsumesBuff(skillData, buff) {
    if (!buff.consumeOnSkillType) return false;

    const consumeKey = normalizeConsumeKey(buff.consumeOnSkillType);
    const skillTypeKey = normalizeConsumeKey(skillData.type);

    if (consumeKey === skillTypeKey) return true;

    const allEffects = [
        ...(Array.isArray(skillData.debuffs) ? skillData.debuffs : []),
        ...(Array.isArray(skillData.buffs) ? skillData.buffs : [])
    ];

    return allEffects.some(effect => {
        return normalizeConsumeKey(effect?.id) === consumeKey ||
            normalizeConsumeKey(effect?.appliesEffect) === consumeKey ||
            normalizeConsumeKey(effect?.name) === consumeKey;
    });
}

function collectOperatorBuffs(operatorId) {
    const buffMap = new Map();

    rotation.forEach(entry => {
        if (!entry) return;

        const skillData = getSkillById(entry.id);
        if (!skillData) return;

        const sourceOperator = getOperatorBySkillId(entry.id);
        if (!sourceOperator || sourceOperator.id !== operatorId) return;

        for (const [buffId, buff] of Array.from(buffMap.entries())) {
            if (!skillConsumesBuff(skillData, buff)) continue;
            buffMap.delete(buffId);
        }

        if (!skillData.buffs || !Array.isArray(skillData.buffs)) return;

        skillData.buffs.forEach(buff => {
            if (buff.visible === false) return;
            if (!buff.id) return;

            const id = buff.id;

            if (!buffMap.has(id)) {
                buffMap.set(id, {
                    ...buff,
                    stacks: buff.stackable ? (buff.stacksApplied || 1) : 1
                });
            } else {
                const existing = buffMap.get(id);

                if (existing.stackable) {
                    existing.stacks += buff.stacksApplied || 1;

                    if (existing.maxStacks) {
                        existing.stacks = Math.min(existing.stacks, existing.maxStacks);
                    }
                }
            }
        });
    });

    return Array.from(buffMap.values());
}

function renderOperatorBuffs() {
    document.querySelectorAll(".team-preview-operator").forEach(card => {
        const operatorId = parseInt(card.dataset.operatorId, 10);
        if (Number.isNaN(operatorId)) return;

        let buffContainer = card.querySelector(".operator-buffs");
        if (!buffContainer) {
            buffContainer = document.createElement("div");
            buffContainer.className = "operator-buffs";
            card.appendChild(buffContainer);
        }

        buffContainer.innerHTML = "";

        const buffs = collectOperatorBuffs(operatorId);

        buffs.forEach(buff => {
            const iconPath = getBuffIcon(buff);

            if (iconPath) {
                const icon = document.createElement("img");
                icon.className = "operator-buff-icon";
                icon.src = iconPath;
                const displayName = typeof getBuffDisplayName === "function"
                    ? getBuffDisplayName(buff)
                    : (buff.name || "Buff");

                icon.alt = displayName;
                icon.title = displayName;

                buffContainer.appendChild(icon);
            } else {
                const badge = document.createElement("div");
                badge.className = "operator-buff-badge";
                
                badge.textContent = displayName;
                badge.title = displayName;

                buffContainer.appendChild(badge);
            }
        });
    });
}