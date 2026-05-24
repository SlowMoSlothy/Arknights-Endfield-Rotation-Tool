const operatorGalleryState = {
    search: "",
    star: "all",
    operatorClass: "all",
    element: "all",
    detailOperatorId: null
};

function getOperatorGallerySlug(operator) {
    return String(operator?.slug || operator?.name || operator?.id || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
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

function createOperatorGalleryCard(operator, variant = "seo") {
    const article = document.createElement("article");
    article.className = variant === "modal" ? "operator-gallery-card" : "";
    if (variant === "modal") {
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
    if (variant === "modal") {
        name.className = "operator-gallery-card-name";
        name.addEventListener("click", event => {
            event.stopPropagation();
            openOperatorGalleryDetail(operator.id);
        });
    }

    const meta = document.createElement("span");
    meta.textContent = [
        operator.operatorClass,
        typeof formatElementLabel === "function"
            ? formatElementLabel(operator.elementType)
            : operator.elementType
    ].filter(Boolean).join(" - ");

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
    actions.className = variant === "modal" ? "operator-gallery-actions" : "seo-operator-actions";
    actions.append(link, createButton);

    article.append(image, name, meta, actions);
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
        .map(value => ({ value: String(value), label: `${value} Star` }));
}

function createOperatorGalleryFilterButton(filterKey, value, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `operator-gallery-filter-chip${operatorGalleryState[filterKey] === value ? " is-active" : ""}`;
    button.setAttribute("aria-pressed", String(operatorGalleryState[filterKey] === value));
    button.textContent = label;
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
}

function getFilteredOperatorGalleryItems() {
    const query = operatorGalleryState.search.trim().toLowerCase();
    const starFilter = operatorGalleryState.star;
    const classFilter = operatorGalleryState.operatorClass;
    const elementFilter = operatorGalleryState.element;

    return getOperatorGalleryItems().filter(operator => {
        const searchText = [
        operator.name,
        operator.operatorClass,
            operator.elementType,
            typeof formatElementLabel === "function" ? formatElementLabel(operator.elementType) : ""
        ].join(" ").toLowerCase();

        const matchesSearch = !query || searchText.includes(query);
        const matchesStar = starFilter === "all" || String(operator.star || "") === starFilter;
        const matchesClass = classFilter === "all" || normalizeOperatorGalleryValue(operator.operatorClass) === classFilter;
        const matchesElement = elementFilter === "all"
            || normalizeOperatorGalleryValue(operator.elementType) === elementFilter
            || normalizeOperatorGalleryValue(typeof formatElementLabel === "function" ? formatElementLabel(operator.elementType) : "") === elementFilter;

        return matchesSearch && matchesStar && matchesClass && matchesElement;
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

function getOperatorGallerySkillEffects(skill) {
    const effects = [];

    [
        ...(Array.isArray(skill.debuffs) ? skill.debuffs : []),
        ...(Array.isArray(skill.buffs) ? skill.buffs : [])
    ].forEach(effect => {
        const label = String(effect.name || effect.id || effect.appliesEffect || effect.buffName || "").trim();
        if (label && !effects.includes(label)) effects.push(label);
    });

    if (Array.isArray(skill.consumeDebuffs)) {
        skill.consumeDebuffs.forEach(effect => {
            const label = `${String(effect || "").trim()} consumed`;
            if (label.trim() && !effects.includes(label)) effects.push(label);
        });
    }

    return effects;
}

function createOperatorGallerySkillChip(label) {
    const chip = document.createElement("span");
    chip.className = "operator-gallery-detail-skill-chip";
    chip.textContent = label;
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

    const trigger = document.createElement("span");
    trigger.className = "operator-gallery-detail-skill-trigger";
    trigger.textContent = skill.comboTrigger
        ? `Trigger: ${skill.comboTrigger}`
        : "";

    const description = document.createElement("p");
    description.textContent = skill.description || "No skill description available.";

    const chips = document.createElement("div");
    chips.className = "operator-gallery-detail-skill-chips";
    const effectLabels = getOperatorGallerySkillEffects(skill);
    if (effectLabels.length) {
        chips.replaceChildren(...effectLabels.slice(0, 8).map(createOperatorGallerySkillChip));
    }

    copy.append(title, meta);
    if (trigger.textContent) copy.appendChild(trigger);
    copy.appendChild(description);
    if (effectLabels.length) copy.appendChild(chips);
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

    const showLink = document.createElement("a");
    showLink.href = "#community-rotations";
    showLink.textContent = "Show rotation";
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
    createButton.addEventListener("click", () => {
        closeOperatorGalleryDetail();
        if (typeof createRotationWithCommunityOperator === "function") {
            createRotationWithCommunityOperator(operator.id);
        }
    });

    const copyLinkButton = document.createElement("button");
    copyLinkButton.type = "button";
    copyLinkButton.textContent = "Copy operator link";
    copyLinkButton.addEventListener("click", () => copyOperatorGalleryDeepLink(operator, copyLinkButton));

    actions.append(showLink, createButton, copyLinkButton);
    copy.append(title, subtitle, actions);
    header.append(image, copy);

    const metaGrid = document.createElement("div");
    metaGrid.className = "operator-gallery-detail-meta";
    metaGrid.append(
        createOperatorGalleryDetailMeta("Stars", operator.star ? `${operator.star}` : ""),
        createOperatorGalleryDetailMeta("Class", operator.operatorClass),
        createOperatorGalleryDetailMeta("Element", operator.elementType && typeof formatElementLabel === "function" ? formatElementLabel(operator.elementType) : operator.elementType)
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

    detail.replaceChildren(backButton, header, metaGrid, skillTitle, skillList);
    detail.scrollTop = 0;
}

function closeOperatorGalleryDetail() {
    const detailModal = document.getElementById("operatorDetailModal");
    const detail = document.getElementById("operatorGalleryDetail");
    if (detailModal) detailModal.classList.remove("open");
    if (detail) {
        detail.replaceChildren();
    }
    operatorGalleryState.detailOperatorId = null;
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
