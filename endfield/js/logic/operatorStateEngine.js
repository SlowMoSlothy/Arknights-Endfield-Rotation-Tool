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

function mergeOperatorFormOverride(baseValue, overrideValue) {
    if (!overrideValue || typeof overrideValue !== "object" || Array.isArray(overrideValue)) {
        return overrideValue;
    }

    const base = baseValue && typeof baseValue === "object" && !Array.isArray(baseValue)
        ? baseValue
        : {};
    return Object.entries(overrideValue).reduce((result, [key, value]) => ({
        ...result,
        [key]: value && typeof value === "object" && !Array.isArray(value)
            ? mergeOperatorFormOverride(base[key], value)
            : value
    }), { ...base });
}

function getOperatorFormActionKey(actionData) {
    if (!actionData) return "";
    const configuredActionKey = String(actionData.formActionKey || "").trim();
    if (configuredActionKey) return configuredActionKey;
    if (actionData.isBasicAttack === true || actionData.actionType === "basicAttack") return "basic_attack";
    const skillId = Number(actionData.id);
    return Number.isFinite(skillId) ? `skill:${skillId}` : "";
}

function getOperatorFormsForOperator(operatorId) {
    const forms = typeof operatorForms !== "undefined" && Array.isArray(operatorForms)
        ? operatorForms
        : [];
    return forms.filter(form => form.enabled !== false && Number(form.operatorId) === Number(operatorId));
}

function buildOperatorFormIntervals(events, durationSeconds = Infinity) {
    const intervals = [];
    const sortedEvents = [...(Array.isArray(events) ? events : [])]
        .sort((left, right) => (Number(left?.time) - Number(right?.time)) || (Number(left?.order) - Number(right?.order)));

    sortedEvents.forEach(event => {
        const skillId = Number(event?.skillData?.id);
        const operatorId = Number(event?.sourceOperatorId ?? event?.skillData?.operatorId);
        if (!Number.isFinite(skillId)) return;

        const matchingForms = (typeof operatorForms !== "undefined" && Array.isArray(operatorForms) ? operatorForms : [])
            .filter(form => form.enabled !== false
                && Number(form.activationSkillId) === skillId
                && (!Number.isFinite(operatorId) || Number(form.operatorId) === operatorId));

        matchingForms.forEach(form => {
            const start = Math.max(0, Number(event.time) || 0);
            const configuredDuration = Number(form.durationSeconds);
            const end = Number.isFinite(configuredDuration) && configuredDuration > 0
                ? Math.min(Number(durationSeconds), start + configuredDuration)
                : Number(durationSeconds);
            const previousInterval = [...intervals].reverse().find(interval => (
                Number(interval.operatorId) === Number(form.operatorId)
                && interval.formKey === form.formKey
                && Number(interval.end) > start
            ));
            if (previousInterval) previousInterval.end = start;
            intervals.push({
                formKey: form.formKey,
                operatorId: Number(form.operatorId),
                name: form.name,
                start,
                end,
                priority: Number(form.priority || 0),
                icon: form.icon || event?.skillData?.iconSmall || event?.skillData?.icon || "",
                visible: form.visible !== false,
                activationSkillId: skillId,
                sourceUrl: form.sourceUrl || "",
                sourceNote: form.sourceNote || ""
            });
        });
    });

    return intervals.sort((left, right) => left.start - right.start || right.priority - left.priority);
}

function getActiveOperatorForm(operatorId, time, intervals = []) {
    return [...(Array.isArray(intervals) ? intervals : [])]
        .filter(interval => Number(interval.operatorId) === Number(operatorId)
            && Number(interval.start) <= Number(time) + 0.0001
            && Number(interval.end) > Number(time) + 0.0001)
        .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0) || Number(right.start) - Number(left.start))[0]
        || null;
}

function resolveOperatorFormAction(actionData, operatorId, time, intervals = [], context = {}) {
    if (!actionData) return actionData;
    const form = getActiveOperatorForm(operatorId, time, intervals);
    if (!form) return actionData;

    const actionKey = getOperatorFormActionKey(actionData);
    const variants = typeof operatorFormActionVariants !== "undefined" && Array.isArray(operatorFormActionVariants)
        ? operatorFormActionVariants
        : [];
    const variant = variants
        .filter(candidate => candidate.enabled !== false
            && Number(candidate.operatorId) === Number(operatorId)
            && candidate.formKey === form.formKey
            && candidate.actionKey === actionKey)
        .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0))[0];
    if (!variant) return actionData;

    let actionOverride = variant.actionOverride || {};
    const activationUseIndex = Number(context.activationUseIndex || 0);
    if (activationUseIndex === 1 && actionOverride.firstUsePerActivation) {
        actionOverride = mergeOperatorFormOverride(actionOverride, actionOverride.firstUsePerActivation);
    }
    const { firstUsePerActivation, ...resolvedOverride } = actionOverride;
    return {
        ...mergeOperatorFormOverride(actionData, resolvedOverride),
        baseActionData: actionData,
        activeForm: form,
        formVariant: variant,
        formKey: form.formKey,
        formName: form.name,
        isFormVariant: true
    };
}

function attachOperatorFormEffectsToActivationEvents(events, intervals) {
    return (Array.isArray(events) ? events : []).map(event => {
        const forms = (Array.isArray(intervals) ? intervals : []).filter(interval => (
            Number(interval.activationSkillId) === Number(event?.skillData?.id)
            && Number(interval.start) === Number(event?.time)
            && interval.visible !== false
        ));
        if (forms.length === 0) return event;

        const formBuffs = forms.map(form => ({
            id: form.formKey,
            name: form.name,
            appliesEffect: form.formKey,
            durationSeconds: Math.max(0, Number(form.end) - Number(form.start)),
            visible: true,
            stackable: false,
            persistsForCombo: false,
            icon: form.icon,
            sourceUrl: form.sourceUrl,
            sourceNote: form.sourceNote,
            operatorForm: true
        }));
        return {
            ...event,
            skillData: {
                ...event.skillData,
                buffs: [...(Array.isArray(event.skillData?.buffs) ? event.skillData.buffs : []), ...formBuffs]
            }
        };
    });
}
