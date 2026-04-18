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
    return `
        <div class="tooltip-title">${skillData.name}</div>
        <div class="tooltip-operator">${skillData.operator}</div>
        <div class="tooltip-line">Type: ${skillData.type || "-"}</div>
        <div class="tooltip-line">CD: ${skillData.cooldown}s</div>
        <div class="tooltip-line">Energy: ${skillData.energy}</div>
        <div class="tooltip-description">${formatTooltipDescription(skillData.description)}</div>
    `;
}

function positionSkillTooltip(targetEl) {
    const tooltip = ensureGlobalSkillTooltip();
    const rect = targetEl.getBoundingClientRect();

    const margin = 10;
    const tooltipRect = tooltip.getBoundingClientRect();

    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - margin;

    if (left < 8) {
        left = 8;
    }

    if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
    }

    if (top < 8) {
        top = rect.bottom + margin;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function showSkillTooltip(targetEl, skillData) {
    const tooltip = ensureGlobalSkillTooltip();
    tooltip.innerHTML = buildSkillTooltipHtml(skillData);
    tooltip.classList.add("visible");

    requestAnimationFrame(() => {
        positionSkillTooltip(targetEl);
    });

    activeSkillTooltipElement = targetEl;
}

function hideSkillTooltip() {
    const tooltip = document.getElementById("globalSkillTooltip");
    if (!tooltip) return;

    tooltip.classList.remove("visible");
    activeSkillTooltipElement = null;
}

function toggleSkillTooltip(targetEl, skillData) {
    if (activeSkillTooltipElement === targetEl) {
        hideSkillTooltip();
        return;
    }

    showSkillTooltip(targetEl, skillData);
}

function attachSkillTooltipEvents(skillEl, skillData) {
    skillEl.addEventListener("mouseenter", () => {
        if (window.innerWidth <= 900) return;
        showSkillTooltip(skillEl, skillData);
    });

    skillEl.addEventListener("mouseleave", () => {
        if (window.innerWidth <= 900) return;
        hideSkillTooltip();
    });

    skillEl.addEventListener("mousemove", () => {
        if (window.innerWidth <= 900) return;

        const tooltip = document.getElementById("globalSkillTooltip");
        if (!tooltip || !tooltip.classList.contains("visible")) return;

        positionSkillTooltip(skillEl);
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

        const clickedSkill = e.target.closest(".skill-small");
        const clickedTooltip = e.target.closest("#globalSkillTooltip");

        if (clickedSkill || clickedTooltip) return;

        hideSkillTooltip();
    });

    window.addEventListener("resize", () => {
        hideSkillTooltip();
    });

    window.addEventListener("scroll", () => {
        if (window.innerWidth <= 900 && activeSkillTooltipElement) {
            positionSkillTooltip(activeSkillTooltipElement);
        }
    }, true);
}

function renderSkills() {
    const list = document.getElementById("skillList");
    if (!list) return;

    list.innerHTML = "";
    hideSkillTooltip();
    initMobileSkillTooltipClose();

    const activeOperators = selectedTeam
        .filter(id => id !== null)
        .map(id => operators.find(op => op.id === id))
        .filter(Boolean);

    const wrapper = document.createElement("div");
    wrapper.className = "operators-skills-grid";

    activeOperators.forEach((op, index) => {
        const card = document.createElement("div");
        card.className = "operator-skill-card";

        if (index === 0) {
            card.classList.add("leader");
        }

        const opRow = document.createElement("div");
        opRow.className = "operator-row";

        const opImg = document.createElement("img");
        opImg.src = op.icon;
        opImg.alt = op.name;
        opImg.className = "operator-icon";

        const opName = document.createElement("div");
        opName.textContent = op.name;

        if (index === 0) {
            const leaderBadge = document.createElement("div");
            leaderBadge.className = "leader-badge";
            leaderBadge.textContent = "Leader";
            card.appendChild(leaderBadge);
        }

        opRow.appendChild(opImg);
        opRow.appendChild(opName);

        const skillRow = document.createElement("div");
        skillRow.className = "skill-row";

        op.skills.forEach(skill => {
            const div = document.createElement("div");
            div.className = "skill skill-small";
            div.dataset.id = String(skill.id);
            div.dataset.largeIcon = skill.icon;

            const skillData = { ...skill, operator: op.name };

            const icon = createSkillIcon(skillData, {
                size: "small",
                useSmallIcon: true
            });

            div.appendChild(icon);
            skillRow.appendChild(div);

            attachSkillTooltipEvents(div, skillData);
        });

        card.appendChild(opRow);
        card.appendChild(skillRow);
        wrapper.appendChild(card);
    });

    list.appendChild(wrapper);
}

function getSkillById(id) {
    for (const op of operators) {
        const skill = op.skills.find(s => s.id === id);
        if (skill) return { ...skill, operator: op.name };
    }
    return null;
}

function getComboSkillByTrigger(trigger) {
    for (const op of operators) {
        for (const skill of op.skills) {
            if (skill.comboTrigger === trigger) {
                return skill;
            }
        }
    }
    return null;
}

function getOperatorBySkillId(skillId) {
    for (const op of operators) {
        if (op.skills.some(skill => skill.id === skillId)) {
            return op;
        }
    }
    return null;
}

function getComboSkillFromSelectedTeam(trigger, sourceOperatorId) {
    const activeOperators = operators.filter(op => selectedTeam.includes(op.id));

    for (const op of activeOperators) {
        if (op.id === sourceOperatorId) {
            continue;
        }

        const comboSkill = op.skills.find(skill => skill.comboTrigger === trigger);
        if (comboSkill) {
            return comboSkill;
        }
    }

    return null;
}