function getEffectIcon(effect) {
    if (effect.stackable) {
        const stacks = effect.stacks || 1;
        return `${effect.iconBase}_${stacks}.png`;
    }

    return `${effect.iconBase}.png`;
}

function getEnemyRank(enemy) {
    return enemy.enemyRank || enemy.rank || "normal";
}

function getEnemyType(enemy) {
    return enemy.enemyType || enemy.elementType || "neutral";
}

function getEnemyCombatMeta(enemy) {
    if (typeof getEnemyCombatProfile !== "function") return "";
    const profile = getEnemyCombatProfile(enemy);
    const resistanceSummary = Object.entries(profile.resistanceMultipliers || {})
        .filter(([element, multiplier]) => element !== "neutral" && Number(multiplier) !== 1)
        .map(([element, multiplier]) => `${element.toUpperCase()} ${Math.round(Number(multiplier) * 100)}%`)
        .join(" / ");
    return `DEF ${profile.defense} / ${resistanceSummary || "Neutral resistance"} / ${profile.verified ? "Verified" : "Unverified"}`;
}

function renderEnemySelectionControl() {
    const button = document.getElementById("selectEnemyBtn");
    const name = document.getElementById("selectedEnemyName");
    const meta = document.getElementById("selectedEnemyMeta");
    const enemy = getSelectedEnemy();
    if (!button || !enemy) return;

    button.classList.remove("enemy-rank-normal", "enemy-rank-elite", "enemy-rank-boss");
    button.classList.add(`enemy-rank-${getEnemyRank(enemy)}`);
    if (name) name.textContent = enemy.name;
    if (meta) meta.textContent = getEnemyCombatMeta(enemy).replace(/ \/ (Verified|Unverified)$/, "");
    button.setAttribute("aria-label", `Choose enemy. Current profile: ${enemy.name}`);
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
    renderEnemySelectionControl();
    if (!isEnemyPanelEnabled()) return;

    const container = document.getElementById("enemySkillBar");
    if (!container) return;

    container.innerHTML = "";

    const enemy = getSelectedEnemy();
    if (!enemy) return;

    const header = document.createElement("div");
    header.className = `enemy-card enemy-rank-${getEnemyRank(enemy)} enemy-type-${getEnemyType(enemy)}`;
    header.innerHTML = `
        <img class="enemy-card-icon" src="${enemy.icon}" alt="${enemy.name}">
        <div class="enemy-card-info">
            <div class="enemy-card-name">${enemy.name}</div>
            <div class="enemy-card-meta">${getEnemyRank(enemy).toUpperCase()} / ${getEnemyType(enemy).toUpperCase()} / ${getEnemyCombatMeta(enemy)}</div>
        </div>
    `;
    container.appendChild(header);

    const skillRow = document.createElement("div");
    skillRow.className = "enemy-skill-row";

    enemy.skills.forEach(skill => {
        const div = document.createElement("div");
        div.className = `skill skill-small enemy-skill enemy-skill-rank-${getEnemyRank(enemy)} enemy-skill-type-${getEnemyType(enemy)}`;
        div.dataset.id = String(skill.id);
        div.dataset.largeIcon = skill.icon;

        div.appendChild(createSkillIcon(skill, {
            size: "small",
            useSmallIcon: true
        }));

        skillRow.appendChild(div);

        if (typeof attachSkillTooltipEvents === "function") {
            attachSkillTooltipEvents(div, skill);
        }
    });

    container.appendChild(skillRow);

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
        btn.className = `settings-option-btn enemy-select-btn enemy-rank-${getEnemyRank(enemy)} enemy-type-${getEnemyType(enemy)}`;
        btn.type = "button";
        btn.innerHTML = `
            <img class="enemy-select-icon" src="${enemy.icon}" alt="${enemy.name}">
            <div class="enemy-select-text">
                <div class="settings-option-title">${enemy.name}</div>
                <div class="enemy-select-meta">${getEnemyRank(enemy).toUpperCase()} / ${getEnemyType(enemy).toUpperCase()} / ${getEnemyCombatMeta(enemy)}</div>
                <div style="font-size:12px;opacity:.8;">${enemy.description || ""}</div>
            </div>
        `;

        btn.addEventListener("click", () => {
            setSelectedEnemy(enemy.id);
            closeEnemyModal();
            renderEnemySelectionControl();
            renderEnemySkillBar();
            if (typeof renderRotation === "function") renderRotation();
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

function isEnemyPanelEnabled() {
    return typeof showEnemyPanel === "undefined" ? true : showEnemyPanel;
}

function applyEnemyPanelVisibility() {
    const panel = document.getElementById("enemyPanel");
    const isEnabled = isEnemyPanelEnabled();

    if (panel) {
        panel.hidden = !isEnabled;
    }

    if (!isEnabled) {
        closeEnemyModal();

        if (enemySkillSourceSortable) {
            enemySkillSourceSortable.destroy();
            enemySkillSourceSortable = null;
        }
    }

    return isEnabled;
}

function initEnemyPanel() {
    applyEnemyPanelVisibility();
    document.getElementById("selectEnemyBtn")?.addEventListener("click", openEnemyModal);
    document.getElementById("closeEnemyModalBtn")?.addEventListener("click", closeEnemyModal);
    renderEnemySelectionControl();
    renderEnemySkillBar();
}
