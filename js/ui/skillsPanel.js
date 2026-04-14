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
        <div class="tooltip-title"><b>${skillData.name}</b></div>
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
    if (window.innerWidth <= 900) return;

    const tooltip = ensureGlobalSkillTooltip();
    tooltip.innerHTML = buildSkillTooltipHtml(skillData);
    tooltip.classList.add("visible");

    requestAnimationFrame(() => {
        positionSkillTooltip(targetEl);
    });
}

function hideSkillTooltip() {
    const tooltip = document.getElementById("globalSkillTooltip");
    if (!tooltip) return;

    tooltip.classList.remove("visible");
}

function attachSkillTooltipEvents(skillEl, skillData) {
    skillEl.addEventListener("mouseenter", () => {
        showSkillTooltip(skillEl, skillData);
    });

    skillEl.addEventListener("mouseleave", () => {
        hideSkillTooltip();
    });

    skillEl.addEventListener("mousemove", () => {
        const tooltip = document.getElementById("globalSkillTooltip");
        if (!tooltip || !tooltip.classList.contains("visible")) return;
        positionSkillTooltip(skillEl);
    });
}

function renderSkills() {
    const list = document.getElementById("skillList");
    if (!list) return;

    list.innerHTML = "";
    hideSkillTooltip();

    const activeOperators = operators.filter(op => selectedTeam.includes(op.id));

    const wrapper = document.createElement("div");
    wrapper.className = "operators-skills-grid";

    activeOperators.forEach(op => {
        const card = document.createElement("div");
        card.className = "operator-skill-card";

        const opRow = document.createElement("div");
        opRow.className = "operator-row";

        const opImg = document.createElement("img");
        opImg.src = op.icon;
        opImg.alt = op.name;
        opImg.className = "operator-icon";

        const opName = document.createElement("div");
        opName.textContent = op.name;

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

            const img = document.createElement("img");
            img.src = skill.iconSmall || skill.icon;
            img.alt = skill.name;
            img.draggable = false;

            div.appendChild(img);
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

function getComboSkillsFromEffects(effects, sourceOperatorId) {
    const activeOperators = operators.filter(op => selectedTeam.includes(op.id));
    const result = [];
    const seen = new Set();

    for (const op of activeOperators) {
        if (op.id === sourceOperatorId) continue;

        for (const skill of op.skills) {
            const triggers = Array.isArray(skill.comboTriggers)
                ? skill.comboTriggers
                : (skill.comboTrigger ? [skill.comboTrigger] : []);

            const matches = triggers.some(trigger => effects.includes(trigger));

            if (matches && !seen.has(skill.id)) {
                result.push(skill);
                seen.add(skill.id);
            }
        }
    }

    return result;
}