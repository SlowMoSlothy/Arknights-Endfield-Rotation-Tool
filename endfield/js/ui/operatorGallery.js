const operatorGalleryState = {
    search: "",
    star: "all",
    operatorClass: "all",
    element: "all",
    role: "all",
    detailOperatorId: null
};

const OPERATOR_GALLERY_ROLE_FILTERS = ["Damage", "Buffer", "Enabler", "Control", "Sustain"];

function getOperatorGallerySlug(operator) {
    return String(operator?.slug || operator?.name || operator?.id || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getOperatorLandingPageSlug(operator) {
    if (operator?.slug) return String(operator.slug).trim().toLowerCase();

    return String(operator?.name || operator?.id || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function createOperatorLandingPageUrl(operator) {
    const slug = getOperatorLandingPageSlug(operator);
    return new URL(`operators/${slug}/`, `${window.location.origin}${window.location.pathname}`).href;
}

function getOperatorGallerySlugFromHash() {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.startsWith("operator-")) return "";

    return hash.replace(/^operator-/, "");
}

function createOperatorGalleryDeepLink(operator) {
    const baseUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    return `${baseUrl}#operator-${getOperatorGallerySlug(operator)}`;
}

function getOperatorGalleryItems() {
    const sourceOperators = Array.isArray(window.operators)
        ? window.operators
        : (typeof operators !== "undefined" && Array.isArray(operators) ? operators : []);
    if (!sourceOperators.length) return [];

    return [...sourceOperators]
        .filter(operator => operator && operator.id && operator.name)
        .sort((a, b) => {
            const sortA = Number(a.sortOrder ?? a.sort_order ?? a.id);
            const sortB = Number(b.sortOrder ?? b.sort_order ?? b.id);
            return sortA - sortB || String(a.name).localeCompare(String(b.name));
        });
}

function getOperatorGalleryBySlug(slug) {
    const normalizedSlug = String(slug || "").trim().toLowerCase();
    if (!normalizedSlug) return null;

    return getOperatorGalleryItems().find(operator => getOperatorGallerySlug(operator) === normalizedSlug) || null;
}

function normalizeOperatorGalleryEffectKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function getOperatorGalleryEffectLabel(effect, type = "effect") {
    if (effect && typeof effect === "object") {
        if (type === "buff" && typeof getBuffDisplayName === "function") {
            return getBuffDisplayName(effect);
        }
        if (type === "debuff" && typeof getDebuffDisplayName === "function") {
            return getDebuffDisplayName(effect);
        }
        return String(effect.name || effect.id || effect.appliesEffect || effect.buffName || "").trim();
    }

    return String(effect || "").trim();
}

function getOperatorGallerySkillEffectEntries(skill) {
    const entries = [];

    const addEntries = (items, type) => {
        if (!Array.isArray(items)) return;
        items.forEach(effect => {
            const label = getOperatorGalleryEffectLabel(effect, type);
            const key = normalizeOperatorGalleryEffectKey(
                typeof effect === "object" ? (effect.id || effect.appliesEffect || effect.name) : effect
            );
            if (!label && !key) return;
            entries.push({ type, label: label || key, key });
        });
    };

    addEntries(skill.debuffs, "debuff");
    addEntries(skill.buffs, "buff");

    if (Array.isArray(skill.conditionalDebuffs)) {
        skill.conditionalDebuffs.forEach(condition => addEntries(condition.debuffs, "debuff"));
    }

    if (Array.isArray(skill.consumeDebuffs)) {
        skill.consumeDebuffs.forEach(effect => {
            const label = getOperatorGalleryEffectLabel(effect);
            const key = normalizeOperatorGalleryEffectKey(label);
            if (label) entries.push({ type: "consume", label: `${label} consumed`, key });
        });
    }

    return entries;
}

function getOperatorGalleryRoleProfile(operator) {
    const skills = Array.isArray(operator.skills) ? operator.skills : [];
    const entries = skills.flatMap(getOperatorGallerySkillEffectEntries);
    const text = [
        operator.operatorClass,
        operator.elementType,
        ...skills.flatMap(skill => [skill.name, skill.type, skill.description])
    ].filter(Boolean).join(" ").toLowerCase();
    const effectText = entries.map(entry => `${entry.key} ${entry.label}`).join(" ").toLowerCase();
    const allText = `${text} ${effectText}`;

    const hasAny = terms => terms.some(term => allText.includes(term));
    const roleScores = {
        Damage: 0,
        Buffer: 0,
        Enabler: 0,
        Control: 0,
        Sustain: 0
    };

    const className = normalizeOperatorGalleryValue(operator.operatorClass);
    if (["striker", "caster", "guard", "vanguard"].includes(className)) roleScores.Damage += 1;
    if (hasAny([" dmg", "damage", "deals", "ultimate", "follow-up", "follow up"])) roleScores.Damage += 2;

    const buffCount = entries.filter(entry => entry.type === "buff").length;
    if (buffCount) roleScores.Buffer += buffCount + 1;
    if (hasAny([" amp", "atk up", "crit", "buff", "link", "melting flames"])) roleScores.Buffer += 2;

    const enablerKeys = ["infliction", "susceptibility", "vulnerable", "breach", "arts reaction", "auxiliary crystal", "electrification", "combustion", "corrosion", "crush"];
    if (entries.some(entry => enablerKeys.some(key => entry.key.includes(normalizeOperatorGalleryEffectKey(key)) || entry.label.toLowerCase().includes(key)))) {
        roleScores.Enabler += 3;
    }
    if (skills.some(skill => skill.comboTrigger || Array.isArray(skill.comboTriggers) || Array.isArray(skill.consumeDebuffs))) {
        roleScores.Enabler += 2;
    }

    const controlKeys = ["lift", "stagger", "pull", "push", "knock", "slow", "solidification"];
    if (hasAny(controlKeys)) roleScores.Control += 3;

    const sustainKeys = ["shield", "hp treatment", "protect", "heal", "treatment"];
    if (hasAny(sustainKeys)) roleScores.Sustain += 3;
    if (className === "defender") roleScores.Sustain += 1;

    const roles = Object.entries(roleScores)
        .filter(([, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([role]) => role);

    const effectLabels = [];
    entries.forEach(entry => {
        if (!entry.label || effectLabels.includes(entry.label)) return;
        effectLabels.push(entry.label);
    });

    const comboSkills = skills.filter(skill => skill.type === "Combo Skill" || skill.shortType === "CS" || skill.comboTrigger || Array.isArray(skill.comboTriggers));
    const consumedEffects = entries.filter(entry => entry.type === "consume").map(entry => entry.label);

    return {
        primaryRole: roles[0] || "Damage",
        roles: roles.length ? roles.slice(0, 4) : ["Damage"],
        effectLabels,
        buffCount,
        debuffCount: entries.filter(entry => entry.type === "debuff").length,
        comboCount: comboSkills.length,
        consumedEffects,
        skillCount: skills.length,
        note: createOperatorGalleryRoleNote(roles[0] || "Damage", operator, effectLabels, comboSkills, consumedEffects)
    };
}

function createOperatorGalleryRoleNote(primaryRole, operator, effectLabels, comboSkills, consumedEffects) {
    const classLabel = operator.operatorClass || "operator";
    const elementLabel = operator.elementType && typeof formatElementLabel === "function"
        ? formatElementLabel(operator.elementType)
        : operator.elementType;
    const effects = effectLabels.slice(0, 3).join(", ");

    const roleLead = {
        Damage: `${operator.name} is mainly a damage pick`,
        Buffer: `${operator.name} works well as a buffer`,
        Enabler: `${operator.name} is useful as a rotation enabler`,
        Control: `${operator.name} brings control tools`,
        Sustain: `${operator.name} adds sustain or protection`
    }[primaryRole] || `${operator.name} is a flexible ${classLabel}`;

    const parts = [
        `${roleLead}${elementLabel ? ` for ${elementLabel} teams` : ""}.`,
        effects ? `Key tracked effects: ${effects}.` : "",
        comboSkills.length ? `${comboSkills.length} combo skill${comboSkills.length === 1 ? "" : "s"} can be checked for trigger planning.` : "",
        consumedEffects.length ? `Consumes: ${consumedEffects.slice(0, 2).join(", ")}.` : ""
    ];

    return parts.filter(Boolean).join(" ");
}

function createOperatorGalleryRoleChips(profile, compact = false, featuredRole = "") {
    const chips = document.createElement("div");
    chips.className = compact ? "operator-gallery-role-chips is-compact" : "operator-gallery-role-chips";
    let roles = compact ? profile.roles.slice(0, 2) : profile.roles;
    const normalizedFeaturedRole = normalizeOperatorGalleryValue(featuredRole);
    if (
        compact &&
        normalizedFeaturedRole &&
        normalizedFeaturedRole !== "all" &&
        !roles.some(role => normalizeOperatorGalleryValue(role) === normalizedFeaturedRole)
    ) {
        const matchingRole = profile.roles.find(role => normalizeOperatorGalleryValue(role) === normalizedFeaturedRole);
        if (matchingRole) {
            roles = [roles[0], matchingRole].filter(Boolean);
        }
    }
    chips.replaceChildren(...roles.map(role => {
        const chip = document.createElement("span");
        chip.textContent = role;
        return chip;
    }));
    return chips;
}

function createOperatorGalleryCardMeta(operator) {
    const elementType = normalizeOperatorGalleryValue(operator.elementType) || "neutral";
    if (typeof createOperatorCardMeta === "function") {
        return createOperatorCardMeta(operator, elementType);
    }

    const meta = document.createElement("div");
    meta.className = "operator-card-meta";

    const star = document.createElement("span");
    star.className = "operator-card-star";
    star.textContent = `${operator.star || "-"} ★`;
    meta.appendChild(star);

    return meta;
}

function createOperatorGalleryCard(operator, variant = "seo") {
    const article = document.createElement("article");
    const elementClass = `operator-element-${normalizeOperatorGalleryValue(operator.elementType) || "neutral"}`;
    const isEnhancedCard = variant === "modal" || variant === "seo";
    article.className = isEnhancedCard ? `operator-gallery-card ${elementClass}${variant === "seo" ? " seo-operator-card" : ""}` : "";
    if (variant === "modal" || variant === "seo") {
        article.tabIndex = 0;
        article.setAttribute("role", "button");
        article.setAttribute("aria-label", `Open ${operator.name} details`);
        article.addEventListener("click", event => {
            if (event.target.closest("a, button")) return;
            openOperatorGalleryDetail(operator.id);
        });
        article.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            openOperatorGalleryDetail(operator.id);
        });
    }

    const image = document.createElement("img");
    image.src = operator.icon || "";
    image.alt = `${operator.name} operator avatar`;
    image.loading = "lazy";

    const name = document.createElement("strong");
    name.textContent = operator.name;
    if (isEnhancedCard) {
        name.className = "operator-gallery-card-name";
        name.addEventListener("click", event => {
            event.stopPropagation();
            openOperatorGalleryDetail(operator.id);
        });
    }

    const infoButton = document.createElement("button");
    infoButton.type = "button";
    infoButton.className = "operator-gallery-info-button";
    infoButton.setAttribute("aria-label", `Open ${operator.name} details`);
    infoButton.addEventListener("click", event => {
        event.stopPropagation();
        openOperatorGalleryDetail(operator.id);
    });

    const profile = getOperatorGalleryRoleProfile(operator);

    const meta = document.createElement("span");
    meta.textContent = [
        operator.operatorClass,
        typeof formatElementLabel === "function"
            ? formatElementLabel(operator.elementType)
            : operator.elementType
    ].filter(Boolean).join(" - ");

    const roleChips = createOperatorGalleryRoleChips(profile, true, operatorGalleryState.role);

    const link = document.createElement("a");
    link.href = "#community-rotations";
    link.dataset.openCommunityRotations = "";
    link.dataset.communityOperatorId = String(operator.id);
    link.textContent = "Show rotation";
    link.addEventListener("click", event => {
        event.preventDefault();
        closeOperatorGalleryModal();
        if (typeof filterCommunityRotationsByOperator === "function") {
            filterCommunityRotationsByOperator(operator.id);
        }
    });

    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.textContent = "Create rotation";
    createButton.addEventListener("click", () => {
        closeOperatorGalleryModal();
        if (typeof createRotationWithCommunityOperator === "function") {
            createRotationWithCommunityOperator(operator.id);
        }
    });

    const actions = document.createElement("div");
    actions.className = isEnhancedCard ? "operator-gallery-actions" : "seo-operator-actions";
    actions.append(link, createButton);

    if (isEnhancedCard) {
        const titleRow = document.createElement("div");
        titleRow.className = "operator-gallery-card-title";
        titleRow.append(name, infoButton);

        article.append(createOperatorGalleryCardMeta(operator), image, titleRow, meta, roleChips, actions);
    } else {
        article.append(image, name, meta, actions);
    }
    return article;
}

function renderOperatorGalleryContainer(container, items, variant = "seo") {
    if (!container) return;

    container.replaceChildren(...items.map(operator => createOperatorGalleryCard(operator, variant)));
}

function renderSeoOperatorGallery() {
    const container = document.getElementById("seoOperatorGallery");
    const operators = getOperatorGalleryItems();
    if (!container || !operators.length) return;

    renderOperatorGalleryContainer(container, operators, "seo");
}

function normalizeOperatorGalleryValue(value) {
    return String(value || "").trim().toLowerCase();
}

function getOperatorGalleryFilterValues(accessor) {
    const seen = new Set();
    return getOperatorGalleryItems()
        .map(accessor)
        .filter(value => value !== null && value !== undefined && value !== "")
        .map(value => ({
            value: normalizeOperatorGalleryValue(value),
            label: String(value)
        }))
        .filter(item => {
            if (seen.has(item.value)) return false;
            seen.add(item.value);
            return true;
        })
        .sort((a, b) => a.label.localeCompare(b.label));
}

function getOperatorGalleryStarValues() {
    return getOperatorGalleryItems()
        .map(operator => Number(operator.star))
        .filter(Number.isFinite)
        .filter((value, index, values) => values.indexOf(value) === index)
        .sort((a, b) => b - a)
        .map(value => ({ value: String(value), label: `${value} ★` }));
}

function getOperatorGalleryRoleValues() {
    const availableRoles = new Set();
    getOperatorGalleryItems().forEach(operator => {
        getOperatorGalleryRoleProfile(operator).roles.forEach(role => availableRoles.add(role));
    });

    return OPERATOR_GALLERY_ROLE_FILTERS
        .filter(role => availableRoles.has(role))
        .map(role => ({ value: normalizeOperatorGalleryValue(role), label: role }));
}

function createOperatorGalleryFilterButton(filterKey, value, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `operator-gallery-filter-chip${operatorGalleryState[filterKey] === value ? " is-active" : ""}`;
    button.setAttribute("aria-pressed", String(operatorGalleryState[filterKey] === value));

    const iconPath = value !== "all" && typeof getFilterIconPath === "function"
        ? getFilterIconPath(filterKey, value)
        : "";

    if (iconPath) {
        const icon = document.createElement("img");
        icon.className = "operator-gallery-filter-icon";
        icon.src = iconPath;
        icon.alt = "";
        icon.setAttribute("aria-hidden", "true");
        button.appendChild(icon);
    }

    const text = document.createElement("span");
    text.textContent = label;
    button.appendChild(text);

    button.addEventListener("click", () => {
        operatorGalleryState[filterKey] = value;
        renderOperatorGalleryModal();
    });
    return button;
}

function renderOperatorGalleryFilterGroup(containerId, filterKey, options) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.replaceChildren(
        createOperatorGalleryFilterButton(filterKey, "all", "All"),
        ...options.map(option => createOperatorGalleryFilterButton(filterKey, option.value, option.label))
    );
}

function renderOperatorGalleryFilters() {
    renderOperatorGalleryFilterGroup("operatorGalleryStarFilters", "star", getOperatorGalleryStarValues());
    renderOperatorGalleryFilterGroup("operatorGalleryClassFilters", "operatorClass", getOperatorGalleryFilterValues(operator => operator.operatorClass));
    renderOperatorGalleryFilterGroup("operatorGalleryElementFilters", "element", getOperatorGalleryFilterValues(operator => (
        typeof formatElementLabel === "function" ? formatElementLabel(operator.elementType) : operator.elementType
    )));
    renderOperatorGalleryFilterGroup("operatorGalleryRoleFilters", "role", getOperatorGalleryRoleValues());
}

function getFilteredOperatorGalleryItems() {
    const query = operatorGalleryState.search.trim().toLowerCase();
    const starFilter = operatorGalleryState.star;
    const classFilter = operatorGalleryState.operatorClass;
    const elementFilter = operatorGalleryState.element;
    const roleFilter = operatorGalleryState.role;

    return getOperatorGalleryItems().filter(operator => {
        const profile = getOperatorGalleryRoleProfile(operator);
        const searchText = [
            operator.name,
            operator.operatorClass,
            operator.elementType,
            typeof formatElementLabel === "function" ? formatElementLabel(operator.elementType) : "",
            ...profile.roles,
            ...profile.effectLabels
        ].join(" ").toLowerCase();

        const matchesSearch = !query || searchText.includes(query);
        const matchesStar = starFilter === "all" || String(operator.star || "") === starFilter;
        const matchesClass = classFilter === "all" || normalizeOperatorGalleryValue(operator.operatorClass) === classFilter;
        const matchesElement = elementFilter === "all"
            || normalizeOperatorGalleryValue(operator.elementType) === elementFilter
            || normalizeOperatorGalleryValue(typeof formatElementLabel === "function" ? formatElementLabel(operator.elementType) : "") === elementFilter;
        const matchesRole = roleFilter === "all"
            || profile.roles.some(role => normalizeOperatorGalleryValue(role) === roleFilter);

        return matchesSearch && matchesStar && matchesClass && matchesElement && matchesRole;
    });
}

function renderOperatorGalleryModal() {
    const list = document.getElementById("operatorGalleryList");
    const count = document.getElementById("operatorGalleryCount");
    if (!list) return;

    operatorGalleryState.detailOperatorId = null;
    closeOperatorGalleryDetail();

    renderOperatorGalleryFilters();

    const items = getFilteredOperatorGalleryItems();
    renderOperatorGalleryContainer(list, items, "modal");

    if (count) {
        count.textContent = `${items.length} operator${items.length === 1 ? "" : "s"}`;
    }
}

function getOperatorGalleryById(operatorId) {
    return getOperatorGalleryItems().find(operator => Number(operator.id) === Number(operatorId)) || null;
}

function createOperatorGalleryDetailMeta(label, value) {
    const item = document.createElement("div");
    item.className = "operator-gallery-detail-meta-item";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement("strong");
    valueElement.textContent = value || "-";

    item.append(labelElement, valueElement);
    return item;
}

function createOperatorGallerySummaryItem(label, value) {
    const item = document.createElement("div");
    item.className = "operator-gallery-summary-item";

    const labelElement = document.createElement("span");
    labelElement.textContent = label;

    const valueElement = document.createElement("strong");
    valueElement.textContent = value || "-";

    item.append(labelElement, valueElement);
    return item;
}

function getOperatorGalleryBestUse(profile, operator) {
    const elementLabel = operator.elementType && typeof formatElementLabel === "function"
        ? formatElementLabel(operator.elementType)
        : operator.elementType;
    const roleText = profile.roles.slice(0, 2).join(" / ");

    return [roleText, elementLabel ? `${elementLabel} setup` : ""].filter(Boolean).join(" - ");
}

function formatOperatorGalleryEffectName(value) {
    return String(value || "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getOperatorGalleryTriggerLabels(skill) {
    const labels = [];
    const addLabel = value => {
        const label = formatOperatorGalleryEffectName(value);
        if (label && !labels.includes(label)) labels.push(label);
    };

    if (skill.comboTrigger) addLabel(skill.comboTrigger);

    if (Array.isArray(skill.comboTriggers)) {
        skill.comboTriggers.forEach(trigger => {
            if (trigger?.effect) addLabel(trigger.effect);
            if (Array.isArray(trigger?.anyOf)) {
                trigger.anyOf.forEach(option => addLabel(option?.effect));
            }
        });
    }

    return labels;
}

function getOperatorGallerySkillEffects(skill) {
    const effects = [];
    getOperatorGallerySkillEffectEntries(skill).forEach(effect => {
        if (!effect.label) return;
        const key = `${effect.type}:${effect.label}`;
        if (effects.some(item => item.key === key)) return;
        effects.push({ ...effect, key });
    });

    getOperatorGalleryTriggerLabels(skill).forEach(label => {
        const key = `trigger:${label}`;
        if (!effects.some(item => item.key === key)) {
            effects.push({ type: "trigger", label, key });
        }
    });

    return effects;
}

function createOperatorGallerySkillChip(effect) {
    const chip = document.createElement("span");
    chip.className = `operator-gallery-detail-skill-chip is-${effect.type || "effect"}`;
    const type = document.createElement("small");
    type.textContent = {
        buff: "Buff",
        debuff: "Debuff",
        consume: "Consumes",
        trigger: "Trigger"
    }[effect.type] || "Effect";
    const label = document.createElement("span");
    label.textContent = effect.label;
    chip.append(type, label);
    return chip;
}

function hasOperatorGalleryNumber(value) {
    return value !== null
        && value !== undefined
        && value !== ""
        && Number.isFinite(Number(value));
}

function createOperatorGalleryDetailSkill(skill) {
    const item = document.createElement("article");
    item.className = "operator-gallery-detail-skill";

    let icon;
    if (typeof createSkillIcon === "function") {
        icon = createSkillIcon(skill, {
            size: "small",
            useSmallIcon: true,
            extraClasses: ["operator-gallery-detail-skill-icon"]
        });
    } else {
        icon = document.createElement("img");
        icon.className = "operator-gallery-detail-skill-fallback";
        icon.src = skill.iconSmall || skill.icon || "";
        icon.alt = skill.name || "Skill";
    }

    const copy = document.createElement("div");
    copy.className = "operator-gallery-detail-skill-copy";

    const title = document.createElement("strong");
    title.textContent = skill.name || "Skill";

    const meta = document.createElement("span");
    meta.textContent = [
        skill.type,
        skill.elementType && typeof formatElementLabel === "function" ? formatElementLabel(skill.elementType) : skill.elementType,
        hasOperatorGalleryNumber(skill.cooldown) ? `${skill.cooldown}s` : "",
        hasOperatorGalleryNumber(skill.energy) ? `${skill.energy} SP` : ""
    ].filter(Boolean).join(" - ");

    const description = document.createElement("p");
    description.textContent = skill.description || "No skill description available.";

    const chips = document.createElement("div");
    chips.className = "operator-gallery-detail-skill-chips";
    const effects = getOperatorGallerySkillEffects(skill);
    if (effects.length) {
        chips.replaceChildren(...effects.slice(0, 10).map(createOperatorGallerySkillChip));
    }

    copy.append(title, meta);
    copy.appendChild(description);
    if (effects.length) copy.appendChild(chips);
    item.append(icon, copy);
    return item;
}

async function copyOperatorGalleryDeepLink(operator, button) {
    const link = createOperatorGalleryDeepLink(operator);

    try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard API is unavailable.");
        await navigator.clipboard.writeText(link);
    } catch (error) {
        console.warn("Operator link could not be copied automatically:", error);
        prompt("Copy operator link:", link);
    }

    if (!button) return;

    const originalText = button.textContent;
    button.textContent = "Link copied";
    window.setTimeout(() => {
        button.textContent = originalText;
    }, 1200);
}

function openOperatorGalleryDetail(operatorId) {
    const operator = getOperatorGalleryById(operatorId);
    const detail = document.getElementById("operatorGalleryDetail");
    const detailModal = document.getElementById("operatorDetailModal");
    if (!operator || !detail || !detailModal) return;

    operatorGalleryState.detailOperatorId = operator.id;
    const nextHash = `operator-${getOperatorGallerySlug(operator)}`;
    if (window.location.hash.replace(/^#/, "") !== nextHash) {
        history.replaceState(null, "", `#${nextHash}`);
    }
    closeOperatorGalleryModal();
    detailModal.classList.add("open");

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "operator-gallery-detail-back";
    backButton.textContent = "Back to gallery";
    backButton.addEventListener("click", () => {
        closeOperatorGalleryDetail();
        if (getOperatorGallerySlugFromHash()) {
            history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        }
        openOperatorGalleryModal();
    });

    const header = document.createElement("div");
    header.className = "operator-gallery-detail-header";

    const image = document.createElement("img");
    image.className = "operator-gallery-detail-avatar";
    image.src = operator.icon || "";
    image.alt = `${operator.name} operator avatar`;

    const copy = document.createElement("div");
    copy.className = "operator-gallery-detail-copy";

    const title = document.createElement("h3");
    title.textContent = operator.name;

    const subtitle = document.createElement("p");
    subtitle.textContent = [
        operator.star ? `${operator.star} Star` : "",
        operator.operatorClass,
        operator.elementType && typeof formatElementLabel === "function" ? formatElementLabel(operator.elementType) : operator.elementType
    ].filter(Boolean).join(" - ");

    const actions = document.createElement("div");
    actions.className = "operator-gallery-actions operator-gallery-detail-actions";

    const landingPageLink = document.createElement("a");
    landingPageLink.className = "operator-gallery-landing-link";
    landingPageLink.href = createOperatorLandingPageUrl(operator);
    landingPageLink.target = "_blank";
    landingPageLink.rel = "noopener";
    landingPageLink.textContent = "View Operator Page";

    const useLeaderButton = document.createElement("button");
    useLeaderButton.type = "button";
    useLeaderButton.textContent = "Use as leader";
    useLeaderButton.addEventListener("click", () => startOperatorGalleryLeaderRotation(operator.id));

    const showLink = document.createElement("a");
    showLink.href = "#community-rotations";
    showLink.textContent = "Show rotations";
    showLink.addEventListener("click", event => {
        event.preventDefault();
        closeOperatorGalleryDetail();
        if (typeof filterCommunityRotationsByOperator === "function") {
            filterCommunityRotationsByOperator(operator.id);
        }
    });

    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.textContent = "Create rotation";
    createButton.addEventListener("click", () => startOperatorGalleryLeaderRotation(operator.id));

    const copyLinkButton = document.createElement("button");
    copyLinkButton.type = "button";
    copyLinkButton.textContent = "Copy operator link";
    copyLinkButton.addEventListener("click", () => copyOperatorGalleryDeepLink(operator, copyLinkButton));

    actions.append(landingPageLink, useLeaderButton, showLink, createButton, copyLinkButton);
    copy.append(title, subtitle, actions);
    header.append(image, copy);

    const metaGrid = document.createElement("div");
    metaGrid.className = "operator-gallery-detail-meta";
    const profile = getOperatorGalleryRoleProfile(operator);

    const summaryPanel = document.createElement("section");
    summaryPanel.className = "operator-gallery-summary-panel";
    summaryPanel.append(
        createOperatorGallerySummaryItem("Main role", profile.primaryRole),
        createOperatorGallerySummaryItem("Element", operator.elementType && typeof formatElementLabel === "function" ? formatElementLabel(operator.elementType) : operator.elementType),
        createOperatorGallerySummaryItem("Best use", getOperatorGalleryBestUse(profile, operator)),
        createOperatorGallerySummaryItem("Key effects", profile.effectLabels.length ? profile.effectLabels.slice(0, 3).join(", ") : "-")
    );

    metaGrid.append(
        createOperatorGalleryDetailMeta("Stars", operator.star ? `${operator.star}` : ""),
        createOperatorGalleryDetailMeta("Class", operator.operatorClass),
        createOperatorGalleryDetailMeta("Element", operator.elementType && typeof formatElementLabel === "function" ? formatElementLabel(operator.elementType) : operator.elementType),
        createOperatorGalleryDetailMeta("Main role", profile.primaryRole),
        createOperatorGalleryDetailMeta("Skills", profile.skillCount ? `${profile.skillCount}` : ""),
        createOperatorGalleryDetailMeta("Combo skills", profile.comboCount ? `${profile.comboCount}` : "0")
    );

    const roleTitle = document.createElement("h4");
    roleTitle.className = "operator-gallery-detail-section-title";
    roleTitle.textContent = "Role overview";

    const rolePanel = document.createElement("section");
    rolePanel.className = "operator-gallery-role-panel";
    const roleChips = createOperatorGalleryRoleChips(profile);
    const roleNote = document.createElement("p");
    roleNote.textContent = profile.note;
    rolePanel.append(roleChips, roleNote);

    const infoGrid = document.createElement("div");
    infoGrid.className = "operator-gallery-info-grid";
    infoGrid.append(
        createOperatorGalleryDetailMeta("Buff effects", profile.buffCount ? `${profile.buffCount}` : "0"),
        createOperatorGalleryDetailMeta("Debuff effects", profile.debuffCount ? `${profile.debuffCount}` : "0"),
        createOperatorGalleryDetailMeta("Tracked effects", profile.effectLabels.length ? profile.effectLabels.slice(0, 4).join(", ") : "-")
    );

    const skillTitle = document.createElement("h4");
    skillTitle.className = "operator-gallery-detail-section-title";
    skillTitle.textContent = "Skills";

    const skillList = document.createElement("div");
    skillList.className = "operator-gallery-detail-skills";
    const skills = Array.isArray(operator.skills) ? operator.skills : [];
    if (skills.length) {
        skillList.replaceChildren(...skills.map(createOperatorGalleryDetailSkill));
    } else {
        const empty = document.createElement("p");
        empty.className = "operator-gallery-detail-empty";
        empty.textContent = "No skills are available for this operator yet.";
        skillList.appendChild(empty);
    }

    detail.replaceChildren(backButton, header, summaryPanel, metaGrid, roleTitle, rolePanel, infoGrid, skillTitle, skillList);
    detail.scrollTop = 0;
}

function startOperatorGalleryLeaderRotation(operatorId) {
    closeOperatorGalleryDetail();
    if (typeof createRotationWithCommunityOperator === "function") {
        createRotationWithCommunityOperator(operatorId);
    }
}

function clearOperatorGalleryDetailHash() {
    if (!getOperatorGallerySlugFromHash()) return;

    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

function closeOperatorGalleryDetail() {
    const detailModal = document.getElementById("operatorDetailModal");
    const detail = document.getElementById("operatorGalleryDetail");
    if (detailModal) detailModal.classList.remove("open");
    if (detail) {
        detail.replaceChildren();
    }
    operatorGalleryState.detailOperatorId = null;
    clearOperatorGalleryDetailHash();
}

function handleOperatorGalleryDeepLink() {
    const slug = getOperatorGallerySlugFromHash();
    if (!slug) return false;

    const operator = getOperatorGalleryBySlug(slug);
    if (!operator) return false;

    openOperatorGalleryDetail(operator.id);
    return true;
}

function openOperatorGalleryModal() {
    const modal = document.getElementById("operatorGalleryModal");
    if (!modal) return;

    renderOperatorGalleryModal();
    modal.classList.add("open");
}

function closeOperatorGalleryModal() {
    const modal = document.getElementById("operatorGalleryModal");
    if (!modal) return;

    modal.classList.remove("open");
}

function initOperatorGallery() {
    renderSeoOperatorGallery();

    const openButton = document.getElementById("openOperatorGalleryBtn");
    const closeButton = document.getElementById("closeOperatorGalleryBtn");
    const closeDetailButton = document.getElementById("closeOperatorDetailBtn");
    const modal = document.getElementById("operatorGalleryModal");
    const detailModal = document.getElementById("operatorDetailModal");
    const searchInput = document.getElementById("operatorGallerySearchInput");

    if (openButton) openButton.addEventListener("click", openOperatorGalleryModal);
    if (closeButton) closeButton.addEventListener("click", closeOperatorGalleryModal);
    if (closeDetailButton) closeDetailButton.addEventListener("click", closeOperatorGalleryDetail);
    if (searchInput) {
        searchInput.addEventListener("input", event => {
            operatorGalleryState.search = event.target.value;
            renderOperatorGalleryModal();
        });
    }
    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeOperatorGalleryModal();
        });
    }
    if (detailModal) {
        detailModal.addEventListener("click", event => {
            if (event.target === detailModal) closeOperatorGalleryDetail();
        });
    }

    document.addEventListener("keydown", event => {
        const modalElement = document.getElementById("operatorGalleryModal");
        if (event.key === "Escape" && modalElement?.classList.contains("open")) {
            closeOperatorGalleryModal();
        }
        const detailModalElement = document.getElementById("operatorDetailModal");
        if (event.key === "Escape" && detailModalElement?.classList.contains("open")) {
            closeOperatorGalleryDetail();
        }
    });

    window.addEventListener("hashchange", handleOperatorGalleryDeepLink);
    if (getOperatorGallerySlugFromHash()) {
        window.setTimeout(handleOperatorGalleryDeepLink, 0);
    }
}

window.initOperatorGallery = initOperatorGallery;
window.openOperatorGalleryModal = openOperatorGalleryModal;
window.closeOperatorGalleryModal = closeOperatorGalleryModal;
window.closeOperatorGalleryDetail = closeOperatorGalleryDetail;
window.openOperatorGalleryDetail = openOperatorGalleryDetail;
