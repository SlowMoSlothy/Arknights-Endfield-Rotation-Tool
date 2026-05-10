let activeSkillTooltipElement = null;

function ensureGlobalSkillTooltip() {
    let tooltip = document.getElementById("globalSkillTooltip");

    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "globalSkillTooltip";
        tooltip.className = "global-tooltip";
        document.body.appendChild(tooltip);
    }

    return tooltip;
}

function buildSkillTooltipHtml(skillData) {
    const elementType = normalizeSkillElementType(skillData.elementType);
    const cooldown = skillData.cooldown ?? "-";
    const energy = skillData.energy ?? "-";

    return `
        <div class="tooltip-card tooltip-element-${elementType}">
            <div class="tooltip-header">
                <div class="tooltip-title">${skillData.name || "Skill"}</div>
                <div class="tooltip-accent-line"></div>
            </div>

            <div class="tooltip-operator">${skillData.operator || "-"}</div>
            <div class="tooltip-type">${skillData.type || "-"}</div>

            <div class="tooltip-stat-row">
                <div class="tooltip-stat">
                    <span>CD</span>
                    <strong>${cooldown}s</strong>
                </div>
                <div class="tooltip-stat-divider"></div>
                <div class="tooltip-stat">
                    <span>EN</span>
                    <strong>${energy}</strong>
                </div>
            </div>

            <div class="tooltip-description">${formatTooltipDescription(skillData.description)}</div>
        </div>
    `;
}

function positionSkillTooltip(targetEl) {
    const tooltip = ensureGlobalSkillTooltip();
    const rect = targetEl.getBoundingClientRect();
    const margin = 10;
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - margin;
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) left = window.innerWidth - tooltipRect.width - 8;
    if (top < 8) top = rect.bottom + margin;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function showSkillTooltip(targetEl, skillData) {
    const tooltip = ensureGlobalSkillTooltip();
    tooltip.innerHTML = buildSkillTooltipHtml(skillData);
    tooltip.classList.add("visible");
    requestAnimationFrame(() => positionSkillTooltip(targetEl));
    activeSkillTooltipElement = targetEl;
}

function hideSkillTooltip() {
    const tooltip = document.getElementById("globalSkillTooltip");
    if (!tooltip) return;
    tooltip.classList.remove("visible");
    activeSkillTooltipElement = null;
}

function toggleSkillTooltip(targetEl, skillData) {
    if (activeSkillTooltipElement === targetEl) return hideSkillTooltip();
    showSkillTooltip(targetEl, skillData);
}

function attachSkillTooltipEvents(skillEl, skillData) {
    skillEl.addEventListener("mouseenter", () => { if (window.innerWidth > 900) showSkillTooltip(skillEl, skillData); });
    skillEl.addEventListener("mouseleave", () => { if (window.innerWidth > 900) hideSkillTooltip(); });
    skillEl.addEventListener("mousemove", () => {
        if (window.innerWidth <= 900) return;
        const tooltip = document.getElementById("globalSkillTooltip");
        if (tooltip?.classList.contains("visible")) positionSkillTooltip(skillEl);
    });
    skillEl.addEventListener("click", (e) => {
        if (window.innerWidth > 900) return;
        e.preventDefault();
        e.stopPropagation();
        toggleSkillTooltip(skillEl, skillData);
    });
}

function initMobileSkillTooltipClose() {
    if (window.mobileSkillTooltipCloseInitialized) return;
    window.mobileSkillTooltipCloseInitialized = true;
    document.addEventListener("click", (e) => {
        if (window.innerWidth > 900) return;
        if (e.target.closest(".skill-small") || e.target.closest("#globalSkillTooltip")) return;
        hideSkillTooltip();
    });
    window.addEventListener("resize", hideSkillTooltip);
}

function createSwapOperatorButton(op, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swap-operator-btn";
    button.title = "Operator wechseln";
    button.setAttribute("aria-label", `${op.name} wechseln`);
    button.innerHTML = `
        <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <path d="M20 18a10 10 0 1 1 0 20a10 10 0 0 1 0-20Z" />
            <path d="M8 50c2.5-7.5 8-11 12-11s9.5 3.5 12 11H8Z" />
            <path d="M44 26a9 9 0 1 1 0 18a9 9 0 0 1 0-18Z" />
            <path d="M33 58c2.4-7 7.6-10 11-10s8.6 3 11 10H33Z" />
            <path d="M38 10c8 1.5 14 7 16 14" fill="none" stroke-width="5" stroke-linecap="round" />
            <path d="M54 24l-8-2.5l5.8 8Z" />
            <path d="M26 54c-8-1.5-14-7-16-14" fill="none" stroke-width="5" stroke-linecap="round" />
            <path d="M10 40l8 2.5l-5.8-8Z" />
        </svg>
    `;

    button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const teamSlotIndex = selectedTeam.findIndex(id => id === op.id);
        openTeamSelectionModal(teamSlotIndex >= 0 ? teamSlotIndex : index);
    };

    return button;
}

function renderSkills() {
    const list = document.getElementById("skillList");
    if (!list) return;
    list.innerHTML = "";
    hideSkillTooltip();
    initMobileSkillTooltipClose();
    const activeOperators = selectedTeam.filter(id => id !== null).map(id => operators.find(op => op.id === id)).filter(Boolean);
    const wrapper = document.createElement("div");
    wrapper.className = "operators-skills-grid";
    activeOperators.forEach((op, index) => {
        const operatorWrapper = document.createElement("div");
        operatorWrapper.className = "operator-skill-wrapper";
        if (index === 0) operatorWrapper.classList.add("leader");

        const card = document.createElement("div");
        card.className = "operator-skill-card";
        const bgPath = op.background || op.icon;
        const bgUrl = new URL(bgPath, document.baseURI).href;

        card.style.setProperty("--operator-bg", `url("${bgUrl}")`);
        if (index === 0) card.classList.add("leader");

        const swapBtn = createSwapOperatorButton(op, index);
        card.appendChild(swapBtn);

        const opRow = document.createElement("div");
        opRow.className = "operator-row";
        opRow.innerHTML = `<div class="operator-skill-name">${op.name}</div>`;
        if (index === 0) {
            const leaderBadge = document.createElement("div");
            leaderBadge.className = "leader-badge";
            leaderBadge.textContent = "Leader";
            card.appendChild(leaderBadge);
        }
        const skillRow = document.createElement("div");
        skillRow.className = "skill-row";
        op.skills.forEach(skill => {
            const div = document.createElement("div");
            div.className = "skill skill-small";
            div.dataset.id = String(skill.id);
            div.dataset.largeIcon = skill.icon;
            const skillData = { ...skill, operator: op.name };
            div.appendChild(createSkillIcon(skillData, { size: "small", useSmallIcon: true }));
            skillRow.appendChild(div);
            attachSkillTooltipEvents(div, skillData);
        });
        card.appendChild(opRow);
        operatorWrapper.appendChild(card);
        operatorWrapper.appendChild(skillRow);
        wrapper.appendChild(operatorWrapper);
    });
    list.appendChild(wrapper);
}

function getSkillById(id) {
    for (const op of operators) {
        const skill = op.skills.find(s => s.id === id);
        if (skill) return { ...skill, operator: op.name };
    }
    const enemySkill = getEnemySkillById(id);
    if (enemySkill) return enemySkill;
    return null;
}

function getComboSkillByTrigger(trigger) {
    for (const op of operators) {
        for (const skill of op.skills) {
            if (skill.comboTrigger === trigger) return skill;
        }
    }
    return null;
}

function getOperatorBySkillId(skillId) {
    for (const op of operators) {
        if (op.skills.some(skill => skill.id === skillId)) return op;
    }
    const enemy = getEnemyBySkillId(skillId);
    if (enemy) return enemy;
    return null;
}

function getComboSkillFromSelectedTeam(trigger, sourceOperatorId) {
    const activeOperators = operators.filter(op => selectedTeam.includes(op.id));
    for (const op of activeOperators) {
        if (op.id === sourceOperatorId) continue;
        const comboSkill = op.skills.find(skill => skill.comboTrigger === trigger);
        if (comboSkill) return comboSkill;
    }
    return null;
}