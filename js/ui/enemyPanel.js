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
            if (debuff.visible === false) return;
            if (!debuff.id) return;

            const effectId = debuff.id;

            if (!effectMap.has(effectId)) {
                effectMap.set(effectId, {
                    ...debuff,
                    stacks: debuff.stackable ? (debuff.stacksApplied || 1) : 1
                });
            } else {
                const existing = effectMap.get(effectId);
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

function renderEnemySkillBar() {
    const container = document.getElementById("enemySkillBar");
    if (!container) return;

    container.innerHTML = "";

    const enemy = getSelectedEnemy();
    if (!enemy) return;

    enemy.skills.forEach(skill => {
        const div = document.createElement("div");
        div.className = "skill skill-small enemy-skill";
        div.dataset.id = String(skill.id);
        div.dataset.largeIcon = skill.icon;

        div.appendChild(createSkillIcon(skill, {
            size: "small",
            useSmallIcon: true
        }));

        container.appendChild(div);

        if (typeof attachSkillTooltipEvents === "function") {
            attachSkillTooltipEvents(div, skill);
        }
    });

    if (typeof initEnemySkillDragDrop === "function") {
        initEnemySkillDragDrop();
    }
}

function renderEnemyModal() {
    const list = document.getElementById("enemyModalList");
    if (!list) return;

    list.innerHTML = "";

    enemies.forEach(enemy => {
        const btn = document.createElement("button");
        btn.className = "settings-option-btn";
        btn.type = "button";
        btn.innerHTML = `<div class="settings-option-title">${enemy.name}</div><div style="font-size:12px;opacity:.8;">${enemy.description || ""}</div>`;

        btn.addEventListener("click", () => {
            setSelectedEnemy(enemy.id);
            closeEnemyModal();
            renderEnemySkillBar();
        });

        list.appendChild(btn);
    });
}

function openEnemyModal() {
    renderEnemyModal();
    document.getElementById("enemyModal")?.classList.add("open");
}

function closeEnemyModal() {
    document.getElementById("enemyModal")?.classList.remove("open");
}

function initEnemyPanel() {
    document.getElementById("selectEnemyBtn")?.addEventListener("click", openEnemyModal);
    document.getElementById("closeEnemyModalBtn")?.addEventListener("click", closeEnemyModal);
    renderEnemySkillBar();
}