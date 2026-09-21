function escapeEnemyHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
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

const ENEMY_STAT_ICONS = Object.freeze({
    defense: "/endfield/assets/ui/enemy-stats/DEF.svg?v=4",
    physical: "/endfield/assets/ui/enemy-stats/Resistance_Physical.svg?v=4",
    heat: "/endfield/assets/ui/enemy-stats/Resistance_Heat.svg?v=4",
    cryo: "/endfield/assets/ui/enemy-stats/Resistance_Cryo.svg?v=4",
    electric: "/endfield/assets/ui/enemy-stats/Resistance_Electric.svg?v=4",
    nature: "/endfield/assets/ui/enemy-stats/Resistance_Nature.svg?v=4",
    aether: "/endfield/assets/ui/enemy-stats/Resistance_Ether.svg?v=4"
});

function formatEnemyResistancePercent(multiplier) {
    const numeric = typeof multiplier === "number" ? multiplier : Number.NaN;
    if (!Number.isFinite(numeric) || numeric < 0) return "?";
    return `${Number(((1 - numeric) * 100).toFixed(6))}%`;
}

function getEnemyCombatMeta(enemy) {
    if (typeof getEnemyCombatProfile !== "function") return "";
    const profile = getEnemyCombatProfile(enemy);
    const resistanceSummary = Object.entries(profile.resistanceMultipliers || {})
        .filter(([element, multiplier]) => element !== "neutral" && Number(multiplier) !== 1)
        .map(([element, multiplier]) => `${element.toUpperCase()} ${formatEnemyResistancePercent(multiplier)}`)
        .join(" / ");
    const defense = enemy.combatProfile?.defense == null ? `DEF unknown (calculation: ${profile.defense})` : `DEF ${profile.defense}`;
    const known = Object.keys(enemy.combatProfile?.resistanceMultipliers || {}).length;
    return `${defense} / ${resistanceSummary || (known ? "Recorded resistances: neutral" : "Resistances unknown (calculation: neutral)")}${known > 0 && known < 5 ? " / unrecorded elements assumed neutral" : ""}`;
}

function renderEnemyCombatChips(enemy) {
    const chip = (label, value, tone) => `<span class="enemy-stat-chip enemy-stat-chip-${tone}" title="${escapeEnemyHtml(label)}" aria-label="${escapeEnemyHtml(label)}"><span class="enemy-stat-chip-icon" style="--enemy-stat-icon:url('${ENEMY_STAT_ICONS[tone]}')" aria-hidden="true"></span><span>${escapeEnemyHtml(value)}</span></span>`;
    const defense = enemy.combatProfile?.defense;
    let html = chip(defense == null ? 'Defense unknown; calculation uses 100' : `Defense: ${defense}`, defense ?? '?', 'defense');
    for (const element of ['physical', 'heat', 'cryo', 'electric', 'nature', 'aether']) {
        const value = enemy.combatProfile?.resistanceMultipliers?.[element];
        const percent = formatEnemyResistancePercent(value);
        html += chip(value == null ? `${element}: unknown; calculation assumes 0% resistance` : `${element}: ${percent} resistance`, percent, element);
    }
    return html;
}

function renderEnemySelectionControl() {
    const button = document.getElementById("selectEnemyBtn");
    const name = document.getElementById("selectedEnemyName");
    const meta = document.getElementById("selectedEnemyMeta");
    const enemy = getSelectedEnemy();
    if (!button) return;
    const portrait = document.getElementById("selectedEnemyPortrait");
    if (portrait) {
        portrait.replaceChildren();
        if (enemy?.icon) {
            const image = document.createElement("img");
            image.src = enemy.icon; image.alt = "";
            image.addEventListener("error", () => { if (image.parentNode === portrait) portrait.textContent = "DEF"; }, { once: true });
            portrait.appendChild(image);
        } else {
            portrait.textContent = "DEF";
        }
    }
    if (!enemy) {
        button.removeAttribute("title");
        if (name) name.textContent = enemyCatalogState === "loading" ? "Loading enemies…" : "No enemy selected";
        if (meta) meta.textContent = enemyCatalogState === "error" ? enemyCatalogError : (enemies.length ? "Choose a published enemy. Calculation defaults: DEF 100, neutral resistance." : "No published enemies. Calculation defaults: DEF 100, neutral resistance.");
        button.setAttribute("aria-label", "Choose enemy");
        return;
    }

    button.classList.remove("enemy-rank-normal", "enemy-rank-elite", "enemy-rank-boss", "enemy-rank-test");
    button.classList.add(`enemy-rank-${getEnemyRank(enemy)}`);
    if (name) name.textContent = enemy.name;
    if (meta) meta.innerHTML = renderEnemyCombatChips(enemy);
    button.title = `${enemy.name} — ${getEnemyCombatMeta(enemy)}`;
    button.setAttribute("aria-label", `Choose enemy. Current profile: ${enemy.name}. ${getEnemyCombatMeta(enemy)}`);
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
        <img class="enemy-card-icon" src="${escapeEnemyHtml(enemy.icon)}" alt="${escapeEnemyHtml(enemy.name)}">
        <div class="enemy-card-info">
            <div class="enemy-card-name">${escapeEnemyHtml(enemy.name)}</div>
            <div class="enemy-card-meta">${getEnemyRank(enemy).toUpperCase()} / ${getEnemyType(enemy).toUpperCase()} / ${escapeEnemyHtml(getEnemyCombatMeta(enemy))}</div>
        </div>
    `;
    container.appendChild(header);

    const skillRow = document.createElement("div");
    skillRow.className = "enemy-skill-row";

    enemy.skills.forEach(skill => {
        if (!Number.isSafeInteger(skill.id) || skill.id <= 0) {
            const note = document.createElement("span");
            note.textContent = `${skill.name} — description only`;
            skillRow.appendChild(note); return;
        }
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

    if (!enemies.length) {
        const message = document.createElement("p");
        message.textContent = enemyCatalogState === "loading" ? "Loading enemies…" : enemyCatalogState === "error" ? enemyCatalogError : "No enemies have been published yet.";
        list.appendChild(message);
    }
    if (enemyCatalogState === "error") {
        const retry = document.createElement("button");
        retry.type = "button"; retry.className = "settings-option-btn enemy-load-retry";
        retry.textContent = "Retry";
        retry.addEventListener("click", async () => {
            retry.disabled = true;
            await hydrateEnemyDatabaseFromSupabase();
            renderEnemyModal(); renderEnemySkillBar();
            if (typeof renderRotation === "function") renderRotation();
        });
        list.appendChild(retry);
    }
    enemies.forEach(enemy => {
        const btn = document.createElement("button");
        const selected = getSelectedEnemy()?.id === enemy.id;
        btn.className = `operator-card enemy-select-btn${selected ? " selected" : ""}`;
        btn.type = "button";
        btn.setAttribute("aria-pressed", String(selected));
        btn.setAttribute("aria-label", enemy.name);
        btn.title = `${enemy.name} · ${getEnemyRank(enemy).toUpperCase()}\n${getEnemyCombatMeta(enemy)}\n${enemy.description || ""}`;
        const image = document.createElement("img");
        image.className = "enemy-select-icon"; image.src = enemy.icon; image.alt = "";
        image.addEventListener("error", () => { image.src = "/favicon-flat.png"; }, {once:true});
        const name = document.createElement("span");
        name.className = "operator-name"; name.textContent = enemy.name;
        btn.append(image, name);

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
