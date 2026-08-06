let activeSkillTooltipElement = null;
let qingboSkillMoveState = {};

const QINGBO_MOVE_NAME_PATTERNS = [
    { move: 1, pattern: /\b(move\s*1|cloudtrapper)\b/i },
    { move: 2, pattern: /\b(move\s*2|trail\s+and\s+mangle)\b/i },
    { move: 3, pattern: /\b(move\s*3|world\s+splitter)\b/i }
];

const QINGBO_MOVE_ALIAS_PATTERNS = [
    { move: 1, pattern: /\bcloudtrapper\b/i },
    { move: 2, pattern: /\btrail\s+and\s+mangle\b/i },
    { move: 3, pattern: /\bworld\s+splitter\b/i }
];

const QINGBO_MOVE_IDS = {
    2702: 1,
    2705: 2,
    2706: 3
};

function isValidQingboMoveNumber(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 1 && number <= 3;
}

function getQingboMoveNumber(skill) {
    const directMove = Number(skill?.qingboMove ?? skill?.qingbo_move);
    if (isValidQingboMoveNumber(directMove)) return directMove;

    const skillId = Number(skill?.id);
    if (Number.isFinite(skillId) && QINGBO_MOVE_IDS[skillId]) {
        return QINGBO_MOVE_IDS[skillId];
    }

    const iconPath = String(skill?.iconSmall || skill?.icon || "");
    const normalizedIconPath = iconPath.toLowerCase();
    const iconMoveMatch = normalizedIconPath.match(/(?:^|\/)bs[_-]?([123])\.(?:svg|png|webp)$/i);
    if (/\/(?:mifu|mi[_-]?fu)\//i.test(normalizedIconPath) && iconMoveMatch) {
        return Number(iconMoveMatch[1]);
    }

    const skillName = String(skill?.name || "");
    if (!/qingbo\s+triplex/i.test(skillName)) {
        const aliasMatch = QINGBO_MOVE_ALIAS_PATTERNS.find(item => item.pattern.test(skillName));
        return aliasMatch ? aliasMatch.move : null;
    }

    const nameMatch = QINGBO_MOVE_NAME_PATTERNS.find(item => item.pattern.test(skillName));
    return nameMatch ? nameMatch.move : null;
}

function ensureQingboMoveMetadata(skill) {
    const moveNumber = getQingboMoveNumber(skill);
    if (!isValidQingboMoveNumber(moveNumber)) return null;

    skill.qingboMove = moveNumber;
    if (!Number.isFinite(Number(skill.nextQingboMove)) && moveNumber < 3) {
        skill.nextQingboMove = moveNumber + 1;
    }

    return moveNumber;
}

function isQingboTriplexMove(skill) {
    return Number.isFinite(ensureQingboMoveMetadata(skill));
}

function getQingboMovesForOperator(op) {
    if (!Array.isArray(op?.skills)) return [];

    return op.skills
        .filter(isQingboTriplexMove)
        .sort((a, b) => Number(a.qingboMove) - Number(b.qingboMove));
}

function getDisplaySkillsForOperator(op) {
    const qingboMoves = getQingboMovesForOperator(op);
    if (qingboMoves.length <= 1) {
        return (op.skills || []).map(skill => ({ skill }));
    }

    const selectedId = qingboSkillMoveState[op.id];
    const activeMove = qingboMoves.find(skill => skill.id === selectedId) || qingboMoves[0];
    qingboSkillMoveState[op.id] = activeMove.id;

    const displaySkills = [];
    let qingboInserted = false;

    (op.skills || []).forEach(skill => {
        if (isQingboTriplexMove(skill)) {
            if (!qingboInserted) {
                displaySkills.push({
                    skill: activeMove,
                    switchGroup: qingboMoves
                });
                qingboInserted = true;
            }
            return;
        }

        displaySkills.push({ skill });
    });

    return displaySkills;
}

function getNextQingboMoveForSkill(op, skillData) {
    const qingboMoves = getQingboMovesForOperator(op);
    if (qingboMoves.length <= 1 || !isQingboTriplexMove(skillData)) return null;

    const nextMoveNumber = Number(skillData.nextQingboMove);
    const currentIndex = qingboMoves.findIndex(skill => skill.id === skillData.id);

    return Number.isFinite(nextMoveNumber)
        ? qingboMoves.find(skill => Number(skill.qingboMove) === nextMoveNumber) || null
        : qingboMoves[(currentIndex + 1 + qingboMoves.length) % qingboMoves.length] || null;
}

function getQingboMoveByNumber(op, moveNumber) {
    return getQingboMovesForOperator(op).find(skill => Number(skill.qingboMove) === Number(moveNumber)) || null;
}

function getFirstQingboMove(op) {
    return getQingboMovesForOperator(op)[0] || null;
}

function getNextQingboMoveInSequence(op, currentSkill) {
    return getNextQingboMoveForSkill(op, currentSkill) || getFirstQingboMove(op);
}

function resolveQingboRotationMoveState(normalizeEntries = false) {
    const nextMoveByOperatorId = {};
    const persistentEffectMap = {};
    let changed = false;
    if (!Array.isArray(rotation)) return { nextMoveByOperatorId, changed };

    if (typeof operators !== "undefined" && Array.isArray(operators)) {
        operators.forEach(op => {
            const firstMove = getFirstQingboMove(op);
            if (firstMove) nextMoveByOperatorId[op.id] = firstMove.id;
        });
    }

    const useSimulationOrder = typeof isSimulationTimelineMode === "function" && isSimulationTimelineMode();
    const rotationItems = rotation.map((entry, index) => ({ entry, index })).filter(item => item.entry);
    if (useSimulationOrder) {
        rotationItems.sort((left, right) => {
            const leftTime = typeof getRotationEntryTime === "function"
                ? getRotationEntryTime(left.entry, left.index, 0)
                : Number(left.entry?.time || 0);
            const rightTime = typeof getRotationEntryTime === "function"
                ? getRotationEntryTime(right.entry, right.index, 0)
                : Number(right.entry?.time || 0);
            return (leftTime - rightTime) || (left.index - right.index);
        });
    }

    rotationItems.forEach(({ entry }) => {
        let skillData = typeof getSkillById === "function" ? getSkillById(entry.id) : null;
        if (!skillData) return;
        const op = typeof getOperatorBySkillId === "function" ? getOperatorBySkillId(skillData.id) : null;
        if (!op) return;

        if (isQingboTriplexMove(skillData)) {
            const expectedMove = getQingboMovesForOperator(op).find(move => move.id === nextMoveByOperatorId[op.id])
                || getFirstQingboMove(op);
            if (expectedMove && skillData.id !== expectedMove.id) {
                if (normalizeEntries) {
                    entry.id = expectedMove.id;
                    changed = true;
                }
                skillData = expectedMove;
            }

            const requiredStacks = Number(skillData?.requiresConsumedVulnerableStacks);
            const consumedEffect = normalizeComboEffectKey(
                skillData?.requiredConsumedEffect || skillData?.physicalStatusResolution?.vulnerableEffect || "vulnerable"
            );
            const stacksBefore = Math.max(0, Number(persistentEffectMap[consumedEffect]) || 0);
            const nextMoveNumber = Number.isFinite(requiredStacks) && requiredStacks > 0
                ? (stacksBefore >= requiredStacks ? Number(skillData.nextQingboMove) : Number(skillData.fallbackQingboMove || 1))
                : Number(skillData.nextQingboMove);
            const nextMove = getQingboMoveByNumber(op, nextMoveNumber) || getFirstQingboMove(op);
            if (nextMove) nextMoveByOperatorId[op.id] = nextMove.id;
        }

        if (typeof applySkillEffectsToComboMap === "function") {
            applySkillEffectsToComboMap(skillData, persistentEffectMap, true, false, persistentEffectMap);
        }
        if (typeof consumeStackedComboEffectsForSkill === "function") {
            consumeStackedComboEffectsForSkill(skillData, persistentEffectMap, persistentEffectMap);
        }

        if (!isQingboTriplexMove(skillData) && Number.isFinite(Number(skillData.nextQingboMove))) {
            const shortcutMove = getQingboMoveByNumber(op, Number(skillData.nextQingboMove));
            if (shortcutMove) nextMoveByOperatorId[op.id] = shortcutMove.id;
        }
    });

    return { nextMoveByOperatorId, changed };
}

function normalizeQingboMovesInRotation() {
    return resolveQingboRotationMoveState(true).changed;
}

function syncQingboMoveStateFromRotation() {
    const { nextMoveByOperatorId } = resolveQingboRotationMoveState(false);

    Object.entries(nextMoveByOperatorId).forEach(([operatorId, skillId]) => {
        qingboSkillMoveState[operatorId] = skillId;
    });
}

function refreshSkillsAfterRotationChange() {
    syncQingboMoveStateFromRotation();
    renderSkills();
    if (typeof initSkillDragDrop === "function") initSkillDragDrop();
    if (typeof updateSelectedUI === "function") updateSelectedUI();
}

function cycleQingboMove(op, currentSkillId) {
    const qingboMoves = getQingboMovesForOperator(op);
    if (qingboMoves.length <= 1) return;

    const currentIndex = qingboMoves.findIndex(skill => skill.id === currentSkillId);
    const nextMove = qingboMoves[(currentIndex + 1 + qingboMoves.length) % qingboMoves.length];
    qingboSkillMoveState[op.id] = nextMove.id;

    if (typeof selectedSkill !== "undefined" && selectedSkill && qingboMoves.some(skill => skill.id === selectedSkill.id)) {
        selectedSkill = { id: nextMove.id };
    }

    renderSkills();
    if (typeof initSkillDragDrop === "function") initSkillDragDrop();
    if (typeof updateSelectedUI === "function") updateSelectedUI();
}

function advanceQingboMoveAfterPlacement(skillId) {
    const skillData = typeof getSkillById === "function" ? getSkillById(skillId) : null;
    if (!isQingboTriplexMove(skillData)) return false;

    const op = typeof getOperatorBySkillId === "function" ? getOperatorBySkillId(skillId) : null;
    const qingboMoves = getQingboMovesForOperator(op);
    if (!op || qingboMoves.length <= 1) return false;

    const nextMove = getNextQingboMoveForSkill(op, skillData);
    if (!nextMove) return false;

    qingboSkillMoveState[op.id] = nextMove.id;

    if (typeof selectedSkill !== "undefined" && selectedSkill && qingboMoves.some(skill => skill.id === selectedSkill.id)) {
        selectedSkill = { id: nextMove.id };
    }

    renderSkills();
    if (typeof initSkillDragDrop === "function") initSkillDragDrop();
    if (typeof updateSelectedUI === "function") updateSelectedUI();

    return true;
}

function createQingboSwitchButton(op, skillData, switchGroup) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "qingbo-switch-btn";
    button.textContent = String(skillData.qingboMove);
    button.dataset.buttonTooltip = "Switch Qingbo move";
    button.setAttribute("aria-label", `Switch ${skillData.name}`);
    button.setAttribute("title", `Move ${skillData.qingboMove} of ${switchGroup.length}`);

    const stopSwitchEvent = (event) => {
        event.preventDefault();
        event.stopPropagation();
    };

    button.addEventListener("pointerdown", stopSwitchEvent);
    button.addEventListener("pointerup", stopSwitchEvent);
    button.addEventListener("click", (event) => {
        stopSwitchEvent(event);
        cycleQingboMove(op, skillData.id);
    });

    return button;
}

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
    const isBasicAttack = skillData.isBasicAttack === true;
    const battleSkillSpCost = typeof getBattleSkillSpCost === "function"
        ? getBattleSkillSpCost(skillData)
        : null;
    const firstStatLabel = isBasicAttack ? "Hits" : "CD";
    const firstStatValue = isBasicAttack ? skillData.hitCount : `${skillData.cooldown ?? "-"}s`;
    const secondStatLabel = isBasicAttack ? "Final" : (battleSkillSpCost !== null ? "SP" : "EN");
    const secondStatValue = isBasicAttack
        ? `${skillData.finalHitCount || 1} hit${Number(skillData.finalHitCount || 1) === 1 ? "" : "s"}`
        : (battleSkillSpCost ?? skillData.energy ?? "-");
    const basicAttackTiming = isBasicAttack && typeof getBasicAttackHitTimeline === "function"
        ? getBasicAttackHitTimeline(skillData)
            .map(hit => `${hit.hit}: ${formatBasicAttackSeconds(hit.time)}`)
            .join(" / ")
        : "";
    const animationSummary = isBasicAttack && Array.isArray(skillData.animations)
        ? skillData.animations
            .map(animation => `${animation.label}: ${animation.hits} hit${animation.hits === 1 ? "" : "s"} in ${formatBasicAttackSeconds(animation.duration)}`)
            .join(" / ")
        : "";
    const basicAttackDetails = isBasicAttack
        ? `
            <div class="tooltip-description">Hit timing: ${basicAttackTiming || "-"}</div>
            <div class="tooltip-description">Animations: ${animationSummary || "-"}</div>
        `
        : "";

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
                    <span>${firstStatLabel}</span>
                    <strong>${firstStatValue}</strong>
                </div>
                <div class="tooltip-stat-divider"></div>
                <div class="tooltip-stat">
                    <span>${secondStatLabel}</span>
                    <strong>${secondStatValue}</strong>
                </div>
            </div>

            <div class="tooltip-description">${formatTooltipDescription(skillData.description)}</div>
            ${basicAttackDetails}
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
    button.dataset.buttonTooltip = "Change operator";
    button.setAttribute("aria-label", `${op.name} wechseln`);
    button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M7 7h11"></path>
            <path d="M15 4l3 3l-3 3"></path>
            <path d="M17 17H6"></path>
            <path d="M9 14l-3 3l3 3"></path>
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

function createSkillOperatorDetailButton(op) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "operator-skill-detail-btn";
    button.dataset.buttonTooltip = "Operator details";
    button.setAttribute("aria-label", `${op.name} details anzeigen`);

    button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (typeof openOperatorGalleryDetail === "function") {
            openOperatorGalleryDetail(op.id);
        }
    });

    return button;
}

function createAddOperatorCard(index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "operator-skill-add-card";
    button.setAttribute("aria-label", `Operator fuer Slot ${index + 1} auswaehlen`);
    button.innerHTML = `<span class="operator-skill-add-plus">+</span>`;
    button.addEventListener("click", () => openTeamSelectionModal(index));
    return button;
}

function getWeaponLoadoutSummary(weapon) {
    if (!weapon) return "No weapon equipped";

    const details = [];
    const level = Number(weapon.baseStatsLevel);
    const attack = Number(weapon.baseAtk);
    if (Number.isFinite(level)) details.push(`Lv. ${level}`);
    if (Number.isFinite(attack)) details.push(`${attack} ATK`);
    if (weapon.passiveName) details.push(weapon.passiveName);
    return details.join(" / ") || "Equipped";
}

function createWeaponLoadoutControl(op) {
    const control = document.createElement("div");
    control.className = "operator-weapon-loadout";

    const icon = document.createElement("span");
    icon.className = "operator-weapon-loadout-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `
        <svg viewBox="0 0 24 24" focusable="false">
            <path d="M14.5 4.5l5 5"></path>
            <path d="M13 6l5 5L9 20H4v-5z"></path>
            <path d="M11 8l5 5"></path>
        </svg>
    `;

    const label = document.createElement("label");
    label.className = "operator-weapon-loadout-label";
    label.textContent = "Weapon";

    const select = document.createElement("select");
    select.className = "operator-weapon-loadout-select";
    select.setAttribute("aria-label", `Equip weapon for ${op.name}`);

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "No weapon";
    select.appendChild(emptyOption);

    const compatibleWeapons = typeof getCompatibleWeaponsForOperator === "function"
        ? getCompatibleWeaponsForOperator(op)
        : [];
    compatibleWeapons.forEach(weapon => {
        const option = document.createElement("option");
        option.value = String(weapon.key);
        option.textContent = `${weapon.name} (${Number(weapon.rarity) || "?"}-star)`;
        select.appendChild(option);
    });

    const equippedKey = typeof getEquippedWeaponKey === "function"
        ? getEquippedWeaponKey(op.id)
        : null;
    select.value = equippedKey || "";
    select.disabled = compatibleWeapons.length === 0;

    const summary = document.createElement("div");
    summary.className = "operator-weapon-loadout-summary";
    const updateSummary = () => {
        const weapon = typeof getWeaponByKey === "function" ? getWeaponByKey(select.value) : null;
        summary.textContent = compatibleWeapons.length === 0
            ? "No compatible weapons"
            : getWeaponLoadoutSummary(weapon);
        control.classList.toggle("equipped", Boolean(weapon));
        select.title = weapon
            ? `${weapon.name}: ${getWeaponLoadoutSummary(weapon)}`
            : summary.textContent;
    };
    updateSummary();

    select.addEventListener("click", event => event.stopPropagation());
    select.addEventListener("change", event => {
        event.stopPropagation();
        if (typeof setEquippedWeaponForOperator === "function") {
            setEquippedWeaponForOperator(op.id, select.value);
        }
        updateSummary();
    });

    label.appendChild(select);
    control.appendChild(icon);
    control.appendChild(label);
    control.appendChild(summary);
    return control;
}

function renderSkills() {
    const list = document.getElementById("skillList");
    if (!list) return;
    list.innerHTML = "";
    hideSkillTooltip();
    initMobileSkillTooltipClose();
    const wrapper = document.createElement("div");
    wrapper.className = "operators-skills-grid";
    selectedTeam.forEach((opId, index) => {
        const op = opId !== null ? operators.find(operator => operator.id === opId) : null;
        const operatorWrapper = document.createElement("div");
        operatorWrapper.className = "operator-skill-wrapper";
        if (index === 0) operatorWrapper.classList.add("leader");

        if (!op) {
            operatorWrapper.classList.add("empty");
            operatorWrapper.appendChild(createAddOperatorCard(index));
            wrapper.appendChild(operatorWrapper);
            return;
        }

        const operatorElement = typeof normalizeSkillElementType === "function"
            ? normalizeSkillElementType(op.elementType)
            : String(op.elementType || "neutral").trim().toLowerCase();
        operatorWrapper.classList.add(`operator-element-${operatorElement || "neutral"}`);

        const card = document.createElement("div");
        card.className = "operator-skill-card";
        const bgPath = op.background || op.icon;
        const bgUrl = new URL(bgPath, document.baseURI).href;

        card.style.setProperty("--operator-bg", `url("${bgUrl}")`);
        if (index === 0) card.classList.add("leader");

        const swapBtn = createSwapOperatorButton(op, index);
        const detailBtn = createSkillOperatorDetailButton(op);
        

        const opRow = document.createElement("div");
        opRow.className = "operator-row";
        const opName = document.createElement("div");
        opName.className = "operator-skill-name";
        opName.textContent = op.name;
        opRow.appendChild(opName);
        if (index === 0) {
            const leaderBadge = document.createElement("div");
            leaderBadge.className = "leader-badge";
            leaderBadge.textContent = "Leader";
            card.appendChild(leaderBadge);
        }
        const skillRow = document.createElement("div");
        skillRow.className = "skill-row operator-owned-skill-row";
        skillRow.setAttribute("aria-label", `${op.name} skills`);
        const skillOwner = document.createElement("div");
        skillOwner.className = "operator-skill-owner";
        const skillOwnerDot = document.createElement("span");
        skillOwnerDot.className = "operator-skill-owner-dot";
        skillOwnerDot.setAttribute("aria-hidden", "true");
        const skillOwnerName = document.createElement("span");
        skillOwnerName.textContent = `${op.name} skills`;
        skillOwner.append(skillOwnerDot, skillOwnerName);
        skillRow.appendChild(skillOwner);
        getDisplaySkillsForOperator(op).forEach(({ skill, switchGroup }) => {
            if (uiSettings?.timelineMode === "simulation" && isFinalStrikeSkillForPanel(skill)) return;
            const div = document.createElement("div");
            div.className = "skill skill-small";
            div.dataset.id = String(skill.id);
            div.dataset.largeIcon = skill.icon;
            const skillData = { ...skill, operator: op.name };
            if (typeof getSimulationSkillLane === "function") {
                div.dataset.skillLane = getSimulationSkillLane(skillData);
            }
            div.appendChild(createSkillIcon(skillData, { size: "small", useSmallIcon: true }));
            if (Array.isArray(switchGroup) && switchGroup.length > 1) {
                div.classList.add("qingbo-switch");
                div.dataset.qingboMove = String(skillData.qingboMove);
                div.appendChild(createQingboSwitchButton(op, skillData, switchGroup));
            }
            skillRow.appendChild(div);
            attachSkillTooltipEvents(div, skillData);
        });
        opRow.appendChild(detailBtn);
        opRow.appendChild(swapBtn);
        card.appendChild(opRow);
        operatorWrapper.appendChild(card);
        if (uiSettings?.timelineMode === "simulation") {
            operatorWrapper.appendChild(createWeaponLoadoutControl(op));
        }
        operatorWrapper.appendChild(skillRow);
        wrapper.appendChild(operatorWrapper);
    });
    list.appendChild(wrapper);
    renderRotationQuickSkills();
}

function createQuickSkillSource(skill, operator) {
    const item = document.createElement("div");
    item.className = "skill skill-small rotation-quick-skill";
    item.dataset.id = String(skill.id);
    item.dataset.largeIcon = skill.icon;
    const skillData = { ...skill, operator: operator.name };
    if (typeof getSimulationSkillLane === "function") {
        item.dataset.skillLane = getSimulationSkillLane(skillData);
    }
    item.appendChild(createSkillIcon(skillData, { size: "small", useSmallIcon: true }));
    attachSkillTooltipEvents(item, skillData);
    return item;
}

let rotationQuickSkillsCollapsed = false;

function createQuickSkillsToggle() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rotation-quick-skills-toggle";
    button.innerHTML = `
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M4 12.5 10 6.5l6 6"></path>
        </svg>`;

    const sync = () => {
        button.setAttribute("aria-expanded", String(!rotationQuickSkillsCollapsed));
        button.setAttribute("aria-label", rotationQuickSkillsCollapsed ? "Expand quick skills" : "Collapse quick skills");
        button.title = rotationQuickSkillsCollapsed ? "Expand quick skills" : "Collapse quick skills";
    };
    sync();
    button.addEventListener("click", () => {
        rotationQuickSkillsCollapsed = !rotationQuickSkillsCollapsed;
        if (typeof uiSettings !== "undefined") {
            uiSettings.simulationQuickSkillsCollapsed = rotationQuickSkillsCollapsed;
            if (typeof saveUiSettings === "function") saveUiSettings();
        }
        const dock = button.closest(".rotation-quick-skills");
        dock?.classList.toggle("is-collapsed", rotationQuickSkillsCollapsed);
        const content = dock?.querySelector(".rotation-quick-skills-content");
        if (content) content.hidden = rotationQuickSkillsCollapsed;
        sync();
        window.scheduleSimulationFocusStickyOffsets?.();
    });
    return button;
}

function renderRotationQuickSkills() {
    const dock = document.getElementById("rotationQuickSkills");
    if (!dock) return;
    dock.replaceChildren();
    const isSimulation = uiSettings?.timelineMode === "simulation";
    rotationQuickSkillsCollapsed = Boolean(uiSettings?.simulationQuickSkillsCollapsed);
    dock.hidden = !isSimulation;
    if (!isSimulation) return;

    const heading = document.createElement("div");
    heading.className = "rotation-quick-skills-heading";
    const title = document.createElement("strong");
    title.textContent = "Quick Skills";
    const hint = document.createElement("span");
    hint.textContent = "Drag directly to the timeline";
    heading.append(title, hint);

    const content = document.createElement("div");
    content.className = "rotation-quick-skills-content";
    content.hidden = rotationQuickSkillsCollapsed;

    const eventGroups = document.createElement("div");
    eventGroups.className = "rotation-quick-skills-events";

    const groups = document.createElement("div");
    groups.className = "rotation-quick-skills-groups";

    if (Array.isArray(simulationTriggerEvents) && simulationTriggerEvents.length > 0) {
        const eventGroup = document.createElement("div");
        eventGroup.className = "rotation-quick-skill-group is-combat-events";
        const eventName = document.createElement("span");
        eventName.className = "rotation-quick-skill-name";
        eventName.textContent = "Combat Events";
        const eventRow = document.createElement("div");
        eventRow.className = "skill-row rotation-quick-skill-row";
        const eventSource = { name: "Combat Event" };
        simulationTriggerEvents.forEach(eventData => {
            eventRow.appendChild(createQuickSkillSource(eventData, eventSource));
        });
        eventGroup.append(eventName, eventRow);
        eventGroups.appendChild(eventGroup);
    }

    selectedTeam.forEach(operatorId => {
        const operator = operators.find(candidate => candidate.id === operatorId);
        if (!operator) return;
        const skills = getDisplaySkillsForOperator(operator)
            .map(entry => entry.skill)
            .filter(skill => !isFinalStrikeSkillForPanel(skill));
        if (!skills.length) return;

        const group = document.createElement("div");
        group.className = "rotation-quick-skill-group";
        const name = document.createElement("span");
        name.className = "rotation-quick-skill-name";
        name.textContent = operator.name;
        const row = document.createElement("div");
        row.className = "skill-row rotation-quick-skill-row";
        skills.forEach(skill => row.appendChild(createQuickSkillSource(skill, operator)));
        group.append(name, row);
        groups.appendChild(group);
    });

    if (!groups.childElementCount && !eventGroups.childElementCount) {
        dock.hidden = true;
        return;
    }
    if (eventGroups.childElementCount) content.appendChild(eventGroups);
    if (groups.childElementCount) content.appendChild(groups);
    groups.addEventListener("wheel", event => {
        if (groups.scrollWidth <= groups.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
        event.preventDefault();
        groups.scrollLeft += event.deltaY;
    }, { passive: false });
    const toggle = createQuickSkillsToggle();
    dock.classList.toggle("is-collapsed", rotationQuickSkillsCollapsed);
    dock.append(heading, content, toggle);
    window.scheduleSimulationFocusStickyOffsets?.();
}

function isFinalStrikeSkillForPanel(skill) {
    const type = String(skill?.type || skill?.baseType || "").toLowerCase();
    const shortType = String(skill?.shortType || "").toLowerCase();
    return type === "final strike" || shortType === "fs";
}

function getSkillById(id) {
    for (const op of operators) {
        const skill = op.skills.find(s => s.id === id);
        if (skill) return { ...skill, operator: op.name };
    }
    const enemySkill = getEnemySkillById(id);
    if (enemySkill) return enemySkill;
    const simulationEvent = Array.isArray(simulationTriggerEvents)
        ? simulationTriggerEvents.find(eventData => Number(eventData.id) === Number(id))
        : null;
    if (simulationEvent) return { ...simulationEvent, operator: "Combat Event" };
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
