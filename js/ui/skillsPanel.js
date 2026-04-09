function renderSkills() {
    const list = document.getElementById("skillList");
    if (!list) return;

    list.innerHTML = "";

    const activeOperators = operators.filter(op => selectedTeam.includes(op.id));

    const wrapper = document.createElement("div");
    wrapper.className = "operators-skills-grid";

    activeOperators.forEach(op => {
        const card = document.createElement("div");
        card.className = "operator-skill-card";

        // Kopf mit Avatar + Name
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

        // Skills darunter
        const skillRow = document.createElement("div");
        skillRow.className = "skill-row";

        op.skills.forEach(skill => {
            const div = document.createElement("div");
            div.className = "skill skill-small";
            div.dataset.id = String(skill.id);
            div.dataset.largeIcon = skill.icon;

            const img = document.createElement("img");
            img.src = skill.iconSmall || skill.icon;
            img.alt = skill.name;
            img.draggable = false;

            div.appendChild(img);
            skillRow.appendChild(div);
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
            continue; // nur anderer Operator
        }

        const comboSkill = op.skills.find(skill => skill.comboTrigger === trigger);
        if (comboSkill) {
            return comboSkill;
        }
    }

    return null;
}