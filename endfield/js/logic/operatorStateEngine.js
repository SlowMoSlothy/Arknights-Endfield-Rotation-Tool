function isOperatorInUltimateState(operatorId) {
    return operatorUltimateStates[operatorId] === true;
}

function setOperatorUltimateState(operatorId, isActive) {
    operatorUltimateStates[operatorId] = !!isActive;
}

function toggleOperatorUltimateState(operatorId) {
    operatorUltimateStates[operatorId] = !isOperatorInUltimateState(operatorId);
}

function handleUltimateStateToggle(skillId) {
    const skill = getSkillById(skillId);
    const operator = getOperatorBySkillId(skillId);

    if (!skill || !operator) return;
    if (!operator.canEnterUltimateState) return;
    if (!skill.togglesUltimateState) return;

    toggleOperatorUltimateState(operator.id);
}

function getMappedSkillIdForOperatorState(skillId) {
    const skill = getSkillById(skillId);
    const operator = getOperatorBySkillId(skillId);

    if (!skill || !operator) return skillId;
    if (!isOperatorInUltimateState(operator.id)) return skillId;

    if (!Array.isArray(operator.altSkills) || operator.altSkills.length === 0) {
        return skillId;
    }

    const altSkill = operator.altSkills.find(s => s.baseType === skill.type);
    return altSkill ? altSkill.id : skillId;
}