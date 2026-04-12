function getBuffIcon(buff) {
    if (buff.stackable) {
        const stacks = buff.stacks || 1;
        return `${buff.iconBase}_${stacks}.png`;
    }

    return `${buff.iconBase}.png`;
}

function collectOperatorBuffs(operatorId) {
    const buffMap = new Map();

    rotation.forEach(entry => {
        if (!entry) return;

        const skillData = getSkillById(entry.id);
        if (!skillData || !skillData.buffs || !Array.isArray(skillData.buffs)) return;

        const sourceOperator = getOperatorBySkillId(entry.id);
        if (!sourceOperator || sourceOperator.id !== operatorId) return;

        skillData.buffs.forEach(buff => {
            // rein technische / unsichtbare Buffs überspringen
            if (buff.visible === false) return;

            // eindeutige ID ist Pflicht
            if (!buff.id) return;

            const buffId = buff.id;

            if (!buffMap.has(buffId)) {
                buffMap.set(buffId, {
                    ...buff,
                    stacks: buff.stackable ? (buff.stacksApplied || 1) : 1
                });
            } else {
                const existing = buffMap.get(buffId);

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
            if (buff.iconBase) {
                const icon = document.createElement("img");
                icon.className = "operator-buff-icon";
                icon.src = getBuffIcon(buff);
                icon.alt = buff.name || "Buff";
                icon.title = buff.name || "Buff";

                buffContainer.appendChild(icon);
            } else {
                const badge = document.createElement("div");
                badge.className = "operator-buff-badge";
                badge.textContent = buff.name || "Buff";
                badge.title = buff.name || "Buff";

                buffContainer.appendChild(badge);
            }
        });
    });
}