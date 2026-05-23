const communityRotationState = {
    rotations: [],
    search: "",
    elementFilter: "all",
    classFilter: "all",
    sort: "newest",
    detailRotationId: "",
    deepLinkRotationId: "",
    likedRotationIds: new Set(),
    likingRotationIds: new Set(),
    viewedRotationIds: new Set(),
    profilesByUserId: new Map(),
    loaded: false,
    loading: false,
    submitting: false,
    error: ""
};

const COMMUNITY_LIKES_STORAGE_KEY = "aertLikedCommunityRotations";
const COMMUNITY_ROTATION_HASH_KEY = "community";

let communityRotationsInitialized = false;

function normalizeCommunityList(value) {
    return Array.isArray(value) ? value.filter(item => item !== null && item !== undefined) : [];
}

function readCommunityLikedRotationIds() {
    if (typeof localStorage === "undefined") return new Set();

    try {
        const rawValue = localStorage.getItem(COMMUNITY_LIKES_STORAGE_KEY);
        const parsedValue = JSON.parse(rawValue || "[]");
        return new Set(Array.isArray(parsedValue) ? parsedValue.map(String).filter(Boolean) : []);
    } catch (error) {
        console.warn("Community likes could not be read:", error);
        return new Set();
    }
}

function saveCommunityLikedRotationIds() {
    if (typeof localStorage === "undefined") return;

    try {
        localStorage.setItem(
            COMMUNITY_LIKES_STORAGE_KEY,
            JSON.stringify([...communityRotationState.likedRotationIds].slice(-500))
        );
    } catch (error) {
        console.warn("Community likes could not be saved:", error);
    }
}

function hasLikedCommunityRotation(rotationId) {
    return communityRotationState.likedRotationIds.has(String(rotationId || ""));
}

function rememberLikedCommunityRotation(rotationId) {
    communityRotationState.likedRotationIds.add(String(rotationId || ""));
    saveCommunityLikedRotationIds();
}

function getCommunityShareBaseUrl() {
    if (typeof getBuildShareBaseUrl === "function") {
        return getBuildShareBaseUrl();
    }

    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
        return `${window.location.origin}${window.location.pathname}`;
    }

    return window.location.href.split("#")[0];
}

function getCommunityRotationIdFromUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    const queryRotationId = searchParams.get(COMMUNITY_ROTATION_HASH_KEY);
    if (queryRotationId) return queryRotationId;

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return "";

    return new URLSearchParams(hash).get(COMMUNITY_ROTATION_HASH_KEY) || "";
}

function createCommunityRotationLink(row) {
    const rotationId = String(row?.id || "");
    if (!rotationId) return "";

    return `${getCommunityShareBaseUrl()}#${COMMUNITY_ROTATION_HASH_KEY}=${encodeURIComponent(rotationId)}`;
}

async function copyCommunityRotationLink(row) {
    const link = createCommunityRotationLink(row);
    if (!link) return false;

    try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard API is unavailable.");
        await navigator.clipboard.writeText(link);
        alert("Community rotation link copied.");
    } catch (error) {
        console.warn("Clipboard copy failed, falling back to prompt:", error);
        prompt("Copy community rotation link:", link);
    }

    return true;
}

function getCommunityOperatorById(operatorId) {
    if (typeof operators === "undefined" || !Array.isArray(operators)) return null;
    return operators.find(operator => operator.id === Number(operatorId)) || null;
}

function getCommunityTeamOperators(row) {
    return normalizeCommunityList(row.team_operator_ids)
        .map(operatorId => getCommunityOperatorById(operatorId))
        .filter(Boolean);
}

function getCommunityRotationSkills(row) {
    if (typeof getSkillById !== "function") return [];

    if (row?.share_code && typeof parseBuildShareCode === "function" && typeof getRotationActionData === "function") {
        try {
            const payload = parseBuildShareCode(row.share_code);
            const actions = Array.isArray(payload?.rotation)
                ? payload.rotation.map(entry => getRotationActionData(entry)).filter(Boolean)
                : [];
            if (actions.length) return actions;
        } catch (error) {
            console.warn("Community preview share code could not be parsed:", error);
        }
    }

    return normalizeCommunityList(row.rotation_skill_ids)
        .map(skillId => getSkillById(Number(skillId)))
        .filter(Boolean);
}

function uniqueCommunityLabels(values) {
    const seen = new Set();
    return values
        .map(value => String(value || "").trim())
        .filter(Boolean)
        .filter(value => {
            const key = value.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function formatCommunityLabel(value) {
    return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function normalizeCommunityFilterValue(value) {
    return String(value || "").trim().toLowerCase();
}

function getCommunityElements(row) {
    const directElements = uniqueCommunityLabels(normalizeCommunityList(row.element_types));
    if (directElements.length) return directElements;

    return uniqueCommunityLabels(getCommunityTeamOperators(row).map(operator => operator.elementType));
}

function getCommunityClasses(row) {
    const directClasses = uniqueCommunityLabels(normalizeCommunityList(row.operator_classes));
    if (directClasses.length) return directClasses;

    return uniqueCommunityLabels(getCommunityTeamOperators(row).map(operator => operator.operatorClass));
}

function getCommunityAuthorProfile(row) {
    const userId = String(row?.submitted_by || "");
    if (!userId) return null;
    return communityRotationState.profilesByUserId.get(userId) || null;
}

function getCommunityAuthorName(row) {
    const profile = getCommunityAuthorProfile(row);
    return String(profile?.username || row?.author_name || "Anonymous").trim() || "Anonymous";
}

function isOwnCommunityRotation(row) {
    const currentUserId = typeof getCommunityAccountUserId === "function" ? getCommunityAccountUserId() : "";
    return Boolean(currentUserId && row?.submitted_by && String(currentUserId) === String(row.submitted_by));
}

function getCommunityAuthorInitials(row) {
    return getCommunityAuthorName(row)
        .split(/\s+|_+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() || "")
        .join("") || "?";
}

function createCommunityAuthorAvatar(row) {
    const profile = getCommunityAuthorProfile(row);
    const avatarUrl = String(profile?.avatar_url || "").trim();

    if (avatarUrl) {
        const image = document.createElement("img");
        image.className = "community-author-avatar";
        image.src = avatarUrl;
        image.alt = `${getCommunityAuthorName(row)} avatar`;
        image.loading = "lazy";
        image.addEventListener("error", () => image.replaceWith(createCommunityAuthorAvatar({ ...row, submitted_by: "" })), { once: true });
        return image;
    }

    const fallback = document.createElement("span");
    fallback.className = "community-author-avatar community-author-fallback";
    fallback.textContent = getCommunityAuthorInitials(row);
    return fallback;
}

function createCommunityAuthorChip(row, options = {}) {
    const chip = document.createElement("div");
    chip.className = `community-author-chip${options.isLarge ? " is-large" : ""}`;

    const copy = document.createElement("div");
    copy.className = "community-author-copy";
    copy.appendChild(createCommunityTextElement("strong", "community-author-name", getCommunityAuthorName(row)));
    if (isOwnCommunityRotation(row)) {
        copy.appendChild(createCommunityTextElement("span", "community-author-you", "Submitted by you"));
    }

    chip.append(createCommunityAuthorAvatar(row), copy);
    return chip;
}

function getAvailableCommunityValues(accessor) {
    const values = communityRotationState.rotations.flatMap(row => accessor(row));
    const seen = new Set();

    return values
        .map(value => ({
            value: normalizeCommunityFilterValue(value),
            label: formatCommunityLabel(value)
        }))
        .filter(item => item.value)
        .filter(item => {
            if (seen.has(item.value)) return false;
            seen.add(item.value);
            return true;
        })
        .sort((a, b) => a.label.localeCompare(b.label));
}

function formatCommunityDate(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit"
    }).format(date);
}

function createCommunityTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    return element;
}

function createCommunityStateCard({ type = "", title, message, actionLabel = "", action = null, loading = false }) {
    const card = document.createElement("div");
    card.className = `community-state-card${type ? ` is-${type}` : ""}`;

    if (loading) {
        const loader = document.createElement("span");
        loader.className = "community-state-loader";
        loader.setAttribute("aria-hidden", "true");
        card.appendChild(loader);
    }

    const content = document.createElement("div");
    content.className = "community-state-content";
    content.append(
        createCommunityTextElement("h3", "community-state-title", title),
        createCommunityTextElement("p", "community-state-message", message)
    );

    if (actionLabel && typeof action === "function") {
        const button = document.createElement("button");
        button.className = "community-state-action";
        button.type = "button";
        button.textContent = actionLabel;
        button.addEventListener("click", action);
        content.appendChild(button);
    }

    card.appendChild(content);
    return card;
}

function renderCommunityListState(list, options) {
    list.replaceChildren(createCommunityStateCard(options));
}

function createCommunityOperatorPlaceholder() {
    const placeholder = document.createElement("span");
    placeholder.className = "community-operator-placeholder";
    placeholder.textContent = "?";
    return placeholder;
}

function createCommunityOperatorAvatar(operator) {
    if (!operator || !operator.icon) {
        return createCommunityOperatorPlaceholder();
    }

    const image = document.createElement("img");
    image.className = "community-operator-avatar";
    image.src = operator.icon;
    image.alt = operator.name || "Operator";
    image.loading = "lazy";
    image.addEventListener("error", () => {
        image.replaceWith(createCommunityOperatorPlaceholder());
    }, { once: true });

    return image;
}

function createCommunityOperatorDetail(operator, index) {
    const item = document.createElement("div");
    item.className = "community-detail-operator";

    item.appendChild(createCommunityOperatorAvatar(operator));

    const copy = document.createElement("div");
    copy.className = "community-detail-operator-copy";
    copy.appendChild(createCommunityTextElement("strong", "", operator?.name || "Operator"));

    const meta = [
        operator?.star ? `${operator.star} star` : "",
        operator?.operatorClass ? formatCommunityLabel(operator.operatorClass) : "",
        operator?.elementType ? formatCommunityLabel(operator.elementType) : ""
    ].filter(Boolean).join(" - ");

    copy.appendChild(createCommunityTextElement("span", "", meta || `Slot ${index + 1}`));
    item.appendChild(copy);
    return item;
}

function createCommunityDetailMetaBlock(label, value) {
    const item = document.createElement("div");
    item.className = "community-detail-meta-item";
    item.append(
        createCommunityTextElement("span", "", label),
        createCommunityTextElement("strong", "", value || "-")
    );
    return item;
}

function createCommunityDetailSection(title, child) {
    const section = document.createElement("section");
    section.className = "community-detail-section";
    section.appendChild(createCommunityTextElement("h4", "community-detail-section-title", title));
    section.appendChild(child);
    return section;
}

function createCommunityDetailChipRow(row) {
    const chipRow = document.createElement("div");
    chipRow.className = "community-detail-chip-row";

    [...getCommunityElements(row), ...getCommunityClasses(row)].slice(0, 10).forEach(label => {
        chipRow.appendChild(createCommunityTextElement("span", "community-chip", formatCommunityLabel(label)));
    });

    return chipRow;
}

function createCommunitySkillPlaceholder() {
    const placeholder = document.createElement("span");
    placeholder.className = "community-skill-placeholder";
    placeholder.textContent = "?";
    return placeholder;
}

function createCommunitySkillPreviewItem(skill, isExpanded = false) {
    const item = document.createElement("span");
    item.className = `community-preview-skill${isExpanded ? " is-expanded" : ""}`;

    let icon;
    if (skill?.isBasicAttack && typeof createBasicAttackIcon === "function") {
        icon = createBasicAttackIcon(skill, {
            size: "small",
            extraClasses: ["community-preview-skill-icon"]
        });
    } else if (skill && typeof createSkillIcon === "function") {
        icon = createSkillIcon(skill, {
            size: "small",
            useSmallIcon: true,
            extraClasses: ["community-preview-skill-icon"]
        });
    } else {
        icon = createCommunitySkillPlaceholder();
    }

    item.appendChild(icon);

    if (isExpanded && skill) {
        const label = document.createElement("span");
        label.className = "community-preview-skill-label";
        label.textContent = typeof getShortSkillType === "function"
            ? getShortSkillType(skill.type || skill.shortType)
            : (skill.shortType || "");
        item.appendChild(label);
    }

    return item;
}

function createCommunityRotationPreview(row, options = {}) {
    const { limit = 6, isExpanded = false } = options;
    const skills = getCommunityRotationSkills(row);
    const previewSkills = isExpanded ? skills : skills.slice(0, limit);
    const preview = document.createElement("div");
    preview.className = `community-rotation-preview${isExpanded ? " is-expanded" : ""}`;

    if (!previewSkills.length) {
        preview.appendChild(createCommunityTextElement("span", "community-preview-empty", "No rotation preview"));
        return preview;
    }

    previewSkills.forEach((skill, index) => {
        if (index > 0) {
            preview.appendChild(createCommunityTextElement("span", "community-preview-arrow", "->"));
        }
        preview.appendChild(createCommunitySkillPreviewItem(skill, isExpanded));
    });

    if (!isExpanded && skills.length > previewSkills.length) {
        preview.appendChild(createCommunityTextElement("span", "community-preview-more", `+${skills.length - previewSkills.length}`));
    }

    return preview;
}

function createCommunityLikeButton(row) {
    const rotationId = String(row?.id || "");
    const liked = hasLikedCommunityRotation(rotationId);
    const liking = communityRotationState.likingRotationIds.has(rotationId);
    const likeCount = Number(row?.likes_count) || 0;
    const button = document.createElement("button");

    button.className = `community-like-btn${liked ? " is-liked" : ""}`;
    button.type = "button";
    button.disabled = liked || liking || !rotationId;
    button.setAttribute("aria-pressed", String(liked));
    button.textContent = `${liking ? "Liking" : liked ? "Liked" : "Like"} ${likeCount}`;
    button.addEventListener("click", () => likeCommunityRotation(row));

    return button;
}

function createCommunityLoadButton(row, label = "Load") {
    const loadButton = document.createElement("button");
    loadButton.className = "community-load-btn";
    loadButton.type = "button";
    loadButton.textContent = label;
    loadButton.addEventListener("click", event => {
        event.stopPropagation();
        loadCommunityRotation(row.id);
    });
    return loadButton;
}

function createCommunityCopyLinkButton(row, label = "Copy Link") {
    const linkButton = document.createElement("button");
    linkButton.className = "community-copy-link-btn";
    linkButton.type = "button";
    linkButton.textContent = label;
    linkButton.addEventListener("click", event => {
        event.stopPropagation();
        copyCommunityRotationLink(row);
    });
    return linkButton;
}

function createCommunityDetailButton(row) {
    const detailButton = document.createElement("button");
    detailButton.className = "community-detail-btn";
    detailButton.type = "button";
    detailButton.textContent = "Details";
    detailButton.addEventListener("click", event => {
        event.stopPropagation();
        openCommunityDetail(row.id);
    });
    return detailButton;
}

function getCommunitySearchText(row) {
    const teamNames = getCommunityTeamOperators(row)
        .map(operator => operator.name)
        .join(" ");

    return [
        row.title,
        row.description,
        getCommunityAuthorName(row),
        teamNames,
        getCommunityElements(row).join(" "),
        getCommunityClasses(row).join(" ")
    ].join(" ").toLowerCase();
}

function getFilteredCommunityRotations() {
    const query = communityRotationState.search.trim().toLowerCase();
    const elementFilter = normalizeCommunityFilterValue(communityRotationState.elementFilter);
    const classFilter = normalizeCommunityFilterValue(communityRotationState.classFilter);

    const filteredRotations = communityRotationState.rotations.filter(row => {
        const matchesSearch = !query || getCommunitySearchText(row).includes(query);
        const matchesElement = elementFilter === "all" || getCommunityElements(row)
            .map(normalizeCommunityFilterValue)
            .includes(elementFilter);
        const matchesClass = classFilter === "all" || getCommunityClasses(row)
            .map(normalizeCommunityFilterValue)
            .includes(classFilter);

        return matchesSearch && matchesElement && matchesClass;
    });

    return sortCommunityRotations(filteredRotations);
}

function getCommunityCreatedTime(row) {
    const timestamp = new Date(row.created_at || 0).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function getCommunitySkillCount(row) {
    const actionCount = getCommunityRotationSkills(row).length;
    return actionCount || normalizeCommunityList(row.rotation_skill_ids).length;
}

function sortCommunityRotations(rotations) {
    const sortedRotations = [...rotations];

    sortedRotations.sort((a, b) => {
        switch (communityRotationState.sort) {
            case "oldest":
                return getCommunityCreatedTime(a) - getCommunityCreatedTime(b);
            case "views":
                return (Number(b.view_count) || 0) - (Number(a.view_count) || 0)
                    || getCommunityCreatedTime(b) - getCommunityCreatedTime(a);
            case "likes":
                return (Number(b.likes_count) || 0) - (Number(a.likes_count) || 0)
                    || getCommunityCreatedTime(b) - getCommunityCreatedTime(a);
            case "skills":
                return getCommunitySkillCount(b) - getCommunitySkillCount(a)
                    || getCommunityCreatedTime(b) - getCommunityCreatedTime(a);
            case "newest":
            default:
                return getCommunityCreatedTime(b) - getCommunityCreatedTime(a);
        }
    });

    return sortedRotations;
}

function hasActiveCommunityFilters() {
    return Boolean(communityRotationState.search.trim())
        || communityRotationState.elementFilter !== "all"
        || communityRotationState.classFilter !== "all";
}

function getCommunityFilterIconPath(filterKey, value) {
    if (value === "all") return "";
    if (typeof getFilterIconPath === "function") return getFilterIconPath(filterKey, value);

    if (filterKey === "operatorClass") {
        return `assets/ui/classes/${normalizeCommunityFilterValue(value)}.webp`;
    }

    if (filterKey === "element") {
        return `assets/ui/elements/${normalizeCommunityFilterValue(value)}.webp`;
    }

    return "";
}

function createCommunityFilterButton(filterKey, label, value, isActive, onClick) {
    const button = document.createElement("button");
    button.className = `community-filter-chip${isActive ? " is-active" : ""}`;
    button.type = "button";
    button.setAttribute("aria-pressed", String(isActive));

    const iconPath = getCommunityFilterIconPath(filterKey, value);
    if (iconPath) {
        const icon = document.createElement("img");
        icon.className = "community-filter-icon";
        icon.src = iconPath;
        icon.alt = "";
        icon.setAttribute("aria-hidden", "true");
        button.classList.add("has-icon");
        button.appendChild(icon);
    }

    const text = document.createElement("span");
    text.textContent = label;
    button.appendChild(text);

    button.addEventListener("click", onClick);
    return button;
}

function renderCommunityFilterGroup(containerId, filterKey, values, activeValue, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.replaceChildren();
    container.appendChild(createCommunityFilterButton(filterKey, "All", "all", activeValue === "all", () => onSelect("all")));

    values.forEach(item => {
        container.appendChild(createCommunityFilterButton(
            filterKey,
            item.label,
            item.value,
            activeValue === item.value,
            () => onSelect(item.value)
        ));
    });
}

function renderCommunityFilters() {
    renderCommunityFilterGroup(
        "communityElementFilters",
        "element",
        getAvailableCommunityValues(getCommunityElements),
        communityRotationState.elementFilter,
        value => {
            communityRotationState.elementFilter = value;
            renderCommunityRotations();
        }
    );

    renderCommunityFilterGroup(
        "communityClassFilters",
        "operatorClass",
        getAvailableCommunityValues(getCommunityClasses),
        communityRotationState.classFilter,
        value => {
            communityRotationState.classFilter = value;
            renderCommunityRotations();
        }
    );

    const sortSelect = document.getElementById("communitySortSelect");
    if (sortSelect) sortSelect.value = communityRotationState.sort;
}

function getActiveCommunityDetailRow() {
    if (!communityRotationState.detailRotationId) return null;
    return communityRotationState.rotations.find(row => String(row.id) === String(communityRotationState.detailRotationId)) || null;
}

function openCommunityDetail(rotationId) {
    communityRotationState.detailRotationId = String(rotationId || "");
    renderCommunityDetailPanel();

    const row = getActiveCommunityDetailRow();
    if (row) markCommunityRotationViewed(row);
}

function closeCommunityDetail() {
    communityRotationState.detailRotationId = "";
    renderCommunityDetailPanel();
}

function renderCommunityDetailPanel() {
    const panel = document.getElementById("communityDetailPanel");
    if (!panel) return;

    const row = getActiveCommunityDetailRow();
    panel.replaceChildren();

    if (!row) {
        communityRotationState.detailRotationId = "";
        delete panel.dataset.communityRotationId;
        panel.hidden = true;
        return;
    }

    panel.hidden = false;
    panel.dataset.communityRotationId = String(row.id || "");
    const teamOperators = getCommunityTeamOperators(row);
    const skillCount = getCommunitySkillCount(row);
    const author = getCommunityAuthorName(row);
    const submittedDate = formatCommunityDate(row.created_at);

    const header = document.createElement("div");
    header.className = "community-detail-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "community-detail-title-wrap";
    titleWrap.append(
        createCommunityTextElement("h3", "community-detail-title", row.title || "Untitled rotation"),
        createCommunityAuthorChip(row, { isLarge: true }),
        createCommunityTextElement(
            "div",
            "community-detail-meta",
            [
                submittedDate,
                `${skillCount} action${skillCount === 1 ? "" : "s"}`
            ].filter(Boolean).join(" - ")
        )
    );

    const closeButton = document.createElement("button");
    closeButton.className = "community-detail-close";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", closeCommunityDetail);

    header.append(titleWrap, closeButton);

    const team = document.createElement("div");
    team.className = "community-detail-team";
    teamOperators.slice(0, 4).forEach((operator, index) => {
        team.appendChild(createCommunityOperatorDetail(operator, index));
    });
    if (!team.children.length) team.appendChild(createCommunityOperatorPlaceholder());

    const rotationWrap = document.createElement("div");
    rotationWrap.className = "community-detail-rotation";
    rotationWrap.appendChild(createCommunityRotationPreview(row, { isExpanded: true }));

    const description = createCommunityTextElement(
        "p",
        "community-detail-description",
        row.description || "No description added."
    );

    const stats = document.createElement("div");
    stats.className = "community-detail-meta-grid";
    stats.append(
        createCommunityDetailMetaBlock("Author", isOwnCommunityRotation(row) ? `${author} (you)` : author),
        createCommunityDetailMetaBlock("Submitted", submittedDate),
        createCommunityDetailMetaBlock("Views", String(Number(row.view_count) || 0)),
        createCommunityDetailMetaBlock("Likes", String(Number(row.likes_count) || 0))
    );

    const actions = document.createElement("div");
    actions.className = "community-detail-actions";
    actions.append(
        createCommunityLoadButton(row, "Load Rotation"),
        createCommunityCopyLinkButton(row),
        createCommunityLikeButton(row)
    );

    panel.append(
        header,
        createCommunityDetailSection("Team", team),
        createCommunityDetailSection("Rotation", rotationWrap),
        createCommunityDetailSection("Notes", description),
        stats,
        createCommunityDetailChipRow(row),
        actions
    );
}

function setCommunityStatus(text, className = "") {
    const status = document.getElementById("communityRotationStatus");
    if (!status) return;

    status.className = `community-status${className ? ` ${className}` : ""}`;
    status.textContent = text;
}

function setCommunitySubmitStatus(text, className = "") {
    const status = document.getElementById("communitySubmitStatus");
    if (!status) return;

    status.className = `community-submit-status${className ? ` ${className}` : ""}`;
    status.textContent = text;
}

function getCurrentCommunityTeamIds() {
    if (!Array.isArray(selectedTeam)) return [];

    return selectedTeam
        .map(operatorId => Number(operatorId))
        .filter(operatorId => Number.isFinite(operatorId) && getCommunityOperatorById(operatorId));
}

function getCurrentCommunityTeamOperators() {
    return getCurrentCommunityTeamIds()
        .map(operatorId => getCommunityOperatorById(operatorId))
        .filter(Boolean);
}

function getCurrentCommunityRotationEntries() {
    if (!Array.isArray(rotation)) return [];

    return rotation
        .filter(Boolean)
        .map(entry => {
            if (typeof isBasicAttackEntry === "function" && isBasicAttackEntry(entry)) {
                const operatorId = Number(entry.operatorId);
                if (!Number.isFinite(operatorId) || !getBasicAttackByOperatorId(operatorId)) return null;
                return {
                    type: BASIC_ATTACK_ACTION_TYPE,
                    operatorId,
                    hitCount: Number(entry.hitCount || DEFAULT_BASIC_ATTACK_HITS),
                    finalHitCount: Number(entry.finalHitCount || DEFAULT_BASIC_ATTACK_FINAL_HITS)
                };
            }

            const id = Number(entry.id);
            if (!Number.isFinite(id) || typeof getSkillById !== "function" || !getSkillById(id)) return null;
            return {
                type: "skill",
                id,
                autoInserted: entry.autoInserted === true
            };
        })
        .filter(Boolean);
}

function getCurrentCommunityRotationSkills() {
    return getCurrentCommunityRotationEntries()
        .map(entry => typeof getRotationActionData === "function" ? getRotationActionData(entry) : getSkillById(entry.id))
        .filter(Boolean);
}

function getCurrentCommunityElements() {
    return uniqueCommunityLabels([
        ...getCurrentCommunityTeamOperators().map(operator => operator.elementType),
        ...getCurrentCommunityRotationSkills().map(skill => skill.elementType)
    ]).map(value => String(value).toLowerCase());
}

function getCurrentCommunityClasses() {
    return uniqueCommunityLabels(getCurrentCommunityTeamOperators().map(operator => operator.operatorClass))
        .map(value => String(value).toLowerCase());
}

function isCommunityAccountSignedIn() {
    return typeof isMyAccountSignedIn === "function" && isMyAccountSignedIn();
}

function getCommunityAccountProfile() {
    return typeof getMyAccountProfile === "function" ? getMyAccountProfile() : null;
}

function getCommunityAccountUserId() {
    return typeof getMyAccountUserId === "function" ? getMyAccountUserId() : "";
}

function getCommunitySubmitAuthorName() {
    const profile = getCommunityAccountProfile();
    const username = String(profile?.username || "").trim();
    return username || "Account";
}

function updateCommunitySubmitAvailability() {
    const submitToggle = document.getElementById("openCommunitySubmitFormBtn");
    if (!submitToggle) return;

    const isSignedIn = isCommunityAccountSignedIn();
    const hasRotation = typeof hasCreatedRotation === "function" ? hasCreatedRotation() : getCurrentCommunityRotationEntries().length > 0;

    submitToggle.disabled = !isSignedIn || !hasRotation;
    submitToggle.textContent = !isSignedIn ? "Sign in required" : hasRotation ? "Submit Current" : "No Rotation";
}

function setCommunitySubmitFormOpen(isOpen) {
    const form = document.getElementById("communitySubmitForm");
    if (!form) return;

    if (isOpen && !isCommunityAccountSignedIn()) {
        form.hidden = true;
        updateCommunitySubmitAvailability();
        setCommunitySubmitStatus("Sign in before submitting a rotation.", "is-error");
        return;
    }

    form.hidden = !isOpen;
    if (isOpen) {
        updateCommunitySubmitAvailability();
        setCommunitySubmitStatus("");
        const authorInput = document.getElementById("communitySubmitAuthor");
        if (authorInput) {
            authorInput.value = getCommunitySubmitAuthorName();
            authorInput.disabled = true;
        }
        const titleInput = document.getElementById("communitySubmitTitle");
        if (titleInput) titleInput.focus();
    }
}

function validateCommunitySubmission(values) {
    const title = values.title.trim();
    const description = values.description.trim();
    const teamIds = getCurrentCommunityTeamIds();
    const rotationEntries = getCurrentCommunityRotationEntries();

    if (!isCommunityAccountSignedIn()) {
        return "Sign in before submitting a rotation.";
    }

    if (!title || title.length < 3 || title.length > 80) {
        return "Please enter a title between 3 and 80 characters.";
    }

    if (description.length > 600) {
        return "Description can be up to 600 characters.";
    }

    if (!teamIds.length) {
        return "Please choose at least one operator before submitting.";
    }

    if (!rotationEntries.length) {
        return "Please create a rotation before submitting.";
    }

    return "";
}

function buildCommunitySubmission(values) {
    const teamIds = getCurrentCommunityTeamIds();
    const rotationEntries = getCurrentCommunityRotationEntries();
    const rotationSkillIds = rotationEntries
        .map(entry => Number(entry.id))
        .filter(Number.isFinite);
    const teamOperators = getCurrentCommunityTeamOperators();
    const rotationSkills = getCurrentCommunityRotationSkills();

    return {
        game: "arknights_endfield",
        title: values.title.trim(),
        description: values.description.trim(),
        author_name: getCommunitySubmitAuthorName().slice(0, 40),
        submitted_by: getCommunityAccountUserId() || null,
        share_code: createBuildShareCode(),
        setup_version: 3,
        team_operator_ids: teamIds,
        rotation_skill_ids: rotationSkillIds,
        element_types: getCurrentCommunityElements(),
        operator_classes: getCurrentCommunityClasses(),
        payload: {
            version: 1,
            submittedAt: new Date().toISOString(),
            team: teamOperators.map(operator => ({
                id: operator.id,
                name: operator.name,
                elementType: operator.elementType,
                operatorClass: operator.operatorClass
            })),
            rotation: rotationEntries.map((entry, index) => {
                const skill = rotationSkills[index];
                return {
                    actionType: entry.type || "skill",
                    id: entry.id,
                    operatorId: entry.operatorId,
                    name: skill?.name || "",
                    type: skill?.type || "",
                    shortType: skill?.shortType || "",
                    elementType: skill?.elementType || "",
                    autoInserted: entry.autoInserted
                };
            })
        },
        likes_count: 0,
        view_count: 0,
        is_public: true,
        is_approved: false,
        is_hidden: false
    };
}

async function submitCommunityRotation(event) {
    event.preventDefault();

    if (communityRotationState.submitting) return;

    const values = {
        title: document.getElementById("communitySubmitTitle")?.value || "",
        author: document.getElementById("communitySubmitAuthor")?.value || "",
        description: document.getElementById("communitySubmitDescription")?.value || ""
    };

    try {
        await submitCurrentRotationToCommunity(values);

        const form = document.getElementById("communitySubmitForm");
        if (form) form.reset();
    } catch (_error) {
        // The shared submit helper already renders the user-facing message.
    }
}

async function submitCurrentRotationToCommunity(values) {
    if (communityRotationState.submitting) return false;

    const normalizedValues = {
        title: String(values?.title || "").trim(),
        author: String(values?.author || "").trim(),
        description: String(values?.description || "").trim()
    };

    const validationError = validateCommunitySubmission(normalizedValues);
    if (validationError) {
        setCommunitySubmitStatus(validationError, "is-error");
        throw new Error(validationError);
    }

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        setCommunitySubmitStatus("Supabase is not available right now.", "is-error");
        throw new Error("Supabase is not available right now.");
    }

    communityRotationState.submitting = true;
    const submitButton = document.getElementById("communitySubmitButton");
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting";
    }
    setCommunitySubmitStatus("Submitting rotation for review...");

    try {
        const { error } = await supabaseClient
            .from("community_rotations")
            .insert(buildCommunitySubmission(normalizedValues));

        if (error) throw error;

        setCommunitySubmitStatus("Submitted for review. It will appear after approval.", "is-success");
        return true;
    } catch (error) {
        console.error("Community rotation submission failed:", error);
        setCommunitySubmitStatus("This rotation could not be submitted.", "is-error");
        throw error;
    } finally {
        communityRotationState.submitting = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Submit for review";
        }
    }
}

function renderCommunityRotations() {
    const list = document.getElementById("communityRotationList");
    const refreshButton = document.getElementById("refreshCommunityRotationsBtn");
    if (!list) return;

    renderCommunityFilters();
    renderCommunityDetailPanel();

    if (refreshButton) {
        refreshButton.disabled = communityRotationState.loading;
        refreshButton.textContent = communityRotationState.loading ? "Loading" : "Refresh";
    }

    list.innerHTML = "";

    if (communityRotationState.loading) {
        setCommunityStatus("");
        renderCommunityListState(list, {
            type: "loading",
            title: "Loading community rotations",
            message: "Fetching approved builds from the database.",
            loading: true
        });
        return;
    }

    if (communityRotationState.error) {
        setCommunityStatus("");
        renderCommunityListState(list, {
            type: "error",
            title: "Community could not be loaded",
            message: communityRotationState.error,
            actionLabel: "Try again",
            action: () => fetchCommunityRotations(true)
        });
        return;
    }

    if (!communityRotationState.loaded) {
        setCommunityStatus("");
        return;
    }

    const filteredRotations = getFilteredCommunityRotations();
    if (!filteredRotations.length) {
        setCommunityStatus("");
        if (hasActiveCommunityFilters()) {
            renderCommunityListState(list, {
                type: "empty",
                title: "No matching rotations",
                message: "Try another search, element, or class filter.",
                actionLabel: "Reset filters",
                action: resetCommunityFilters
            });
        } else {
            renderCommunityListState(list, {
                type: "empty",
                title: "No community rotations yet",
                message: "Approved community rotations will appear here after review.",
                actionLabel: "Refresh",
                action: () => fetchCommunityRotations(true)
            });
        }
        return;
    }

    const totalCount = communityRotationState.rotations.length;
    const statusText = filteredRotations.length === totalCount
        ? `${filteredRotations.length} rotation${filteredRotations.length === 1 ? "" : "s"} found.`
        : `${filteredRotations.length} of ${totalCount} rotations shown.`;
    setCommunityStatus(statusText);
    filteredRotations.forEach(row => {
        list.appendChild(createCommunityRotationCard(row));
    });
}

function createCommunityRotationCard(row) {
    const card = document.createElement("article");
    card.className = "community-card";
    card.dataset.communityRotationId = String(row.id || "");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open details for ${row.title || "community rotation"}`);
    card.addEventListener("click", event => {
        if (event.target.closest("button")) return;
        openCommunityDetail(row.id);
    });
    card.addEventListener("keydown", event => {
        if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        openCommunityDetail(row.id);
    });

    const header = document.createElement("div");
    header.className = "community-card-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "community-card-title-wrap";
    const title = createCommunityTextElement("h3", "community-card-title", row.title || "Untitled rotation");
    const date = formatCommunityDate(row.created_at);
    titleWrap.append(title, createCommunityAuthorChip(row));
    if (date) titleWrap.appendChild(createCommunityTextElement("div", "community-card-meta", date));

    header.append(titleWrap, createCommunityLoadButton(row));

    const team = document.createElement("div");
    team.className = "community-team";
    const teamOperators = getCommunityTeamOperators(row);
    if (teamOperators.length) {
        teamOperators.slice(0, 4).forEach(operator => team.appendChild(createCommunityOperatorAvatar(operator)));
    } else {
        team.appendChild(createCommunityOperatorPlaceholder());
    }

    const rotationPreview = createCommunityRotationPreview(row);

    const description = createCommunityTextElement(
        "p",
        "community-description",
        row.description || "No description added."
    );

    const chipRow = document.createElement("div");
    chipRow.className = "community-chip-row";
    [...getCommunityElements(row), ...getCommunityClasses(row)].slice(0, 8).forEach(label => {
        chipRow.appendChild(createCommunityTextElement("span", "community-chip", formatCommunityLabel(label)));
    });

    const footer = document.createElement("div");
    footer.className = "community-card-footer";
    const skillCount = getCommunitySkillCount(row);
    const statText = [
        `${skillCount} action${skillCount === 1 ? "" : "s"}`,
        `${Number(row.view_count) || 0} views`
    ].join(" - ");
    footer.appendChild(createCommunityTextElement("span", "community-stat", statText));
    const actions = document.createElement("div");
    actions.className = "community-card-actions";
    actions.append(createCommunityDetailButton(row), createCommunityCopyLinkButton(row, "Link"), createCommunityLikeButton(row));
    footer.appendChild(actions);

    card.append(header, team, rotationPreview, description, chipRow, footer);
    return card;
}

function resolvePendingCommunityRotationDeepLink() {
    const rotationId = String(communityRotationState.deepLinkRotationId || "");
    if (!rotationId || communityRotationState.loading || !communityRotationState.loaded) return false;

    communityRotationState.deepLinkRotationId = "";
    const row = communityRotationState.rotations.find(item => String(item.id) === rotationId);
    if (!row) {
        setCommunityStatus("This community rotation could not be found or is not approved yet.", "is-error");
        return false;
    }

    openCommunityDetail(row.id);
    setCommunityStatus("Community rotation opened from link.");
    return true;
}

function handleCommunityRotationDeepLink() {
    const rotationId = getCommunityRotationIdFromUrl();
    if (!rotationId) return false;

    communityRotationState.deepLinkRotationId = String(rotationId);
    openCommunityRotationsModal({ forceRefresh: !communityRotationState.loaded });
    return true;
}

async function fetchCommunityAuthorProfiles(rows) {
    communityRotationState.profilesByUserId = new Map();

    if (typeof supabaseClient === "undefined" || !supabaseClient) return;

    const userIds = [...new Set(
        normalizeCommunityList(rows)
            .map(row => String(row?.submitted_by || "").trim())
            .filter(Boolean)
    )];
    if (!userIds.length) return;

    try {
        const { data, error } = await supabaseClient
            .from("user_profiles")
            .select("user_id,username,avatar_url")
            .in("user_id", userIds);

        if (error) throw error;

        normalizeCommunityList(data).forEach(profile => {
            const userId = String(profile?.user_id || "");
            if (!userId) return;
            communityRotationState.profilesByUserId.set(userId, {
                username: profile.username || "",
                avatar_url: profile.avatar_url || ""
            });
        });
    } catch (error) {
        console.warn("Community author profiles could not be loaded:", error);
    }
}

async function fetchCommunityRotations(force = false) {
    if (communityRotationState.loading) return;
    if (communityRotationState.loaded && !force) {
        renderCommunityRotations();
        resolvePendingCommunityRotationDeepLink();
        return;
    }

    communityRotationState.loading = true;
    communityRotationState.error = "";
    renderCommunityRotations();

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        communityRotationState.loading = false;
        communityRotationState.loaded = true;
        communityRotationState.error = "Supabase is not available right now.";
        renderCommunityRotations();
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("community_rotations")
            .select("id,title,description,author_name,submitted_by,share_code,team_operator_ids,rotation_skill_ids,element_types,operator_classes,likes_count,view_count,created_at")
            .eq("game", "arknights_endfield")
            .eq("is_public", true)
            .eq("is_approved", true)
            .eq("is_hidden", false)
            .order("created_at", { ascending: false })
            .limit(60);

        if (error) throw error;

        communityRotationState.rotations = Array.isArray(data) ? data : [];
        await fetchCommunityAuthorProfiles(communityRotationState.rotations);
        communityRotationState.loaded = true;
    } catch (error) {
        console.error("Community rotations could not be loaded:", error);
        communityRotationState.error = "Community rotations could not be loaded.";
    } finally {
        communityRotationState.loading = false;
        renderCommunityRotations();
        resolvePendingCommunityRotationDeepLink();
    }
}

async function incrementCommunityRotationView(row) {
    if (!row?.id || typeof supabaseClient === "undefined" || !supabaseClient) {
        return Number(row?.view_count) || 0;
    }

    try {
        const { data, error } = await supabaseClient
            .rpc("increment_community_rotation_view", {
                target_rotation_id: row.id
            });

        if (error) throw error;

        const nextViewCount = Number(data);
        row.view_count = Number.isFinite(nextViewCount)
            ? nextViewCount
            : (Number(row.view_count) || 0) + 1;
        return row.view_count;
    } catch (error) {
        console.warn("Community rotation view count could not be updated:", error);
        return Number(row.view_count) || 0;
    }
}

async function markCommunityRotationViewed(row) {
    const rotationId = String(row?.id || "");
    if (!rotationId || communityRotationState.viewedRotationIds.has(rotationId)) return;

    communityRotationState.viewedRotationIds.add(rotationId);
    await incrementCommunityRotationView(row);

    if (communityRotationState.detailRotationId === rotationId) {
        renderCommunityDetailPanel();
    }
    renderCommunityRotations();
}

async function likeCommunityRotation(row) {
    const rotationId = String(row?.id || "");
    if (!rotationId || hasLikedCommunityRotation(rotationId) || communityRotationState.likingRotationIds.has(rotationId)) return;

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        alert("Supabase is not available right now.");
        return;
    }

    communityRotationState.likingRotationIds.add(rotationId);
    renderCommunityRotations();

    try {
        const { data, error } = await supabaseClient
            .rpc("increment_community_rotation_like", {
                target_rotation_id: rotationId
            });

        if (error) throw error;

        const nextLikesCount = Number(data);
        row.likes_count = Number.isFinite(nextLikesCount)
            ? nextLikesCount
            : (Number(row.likes_count) || 0) + 1;
        rememberLikedCommunityRotation(rotationId);
    } catch (error) {
        console.warn("Community rotation like count could not be updated:", error);
        alert("This rotation could not be liked right now.");
    } finally {
        communityRotationState.likingRotationIds.delete(rotationId);
        renderCommunityRotations();
    }
}

function loadCommunityRotation(rotationId) {
    const row = communityRotationState.rotations.find(item => item.id === rotationId);
    if (!row || !row.share_code) {
        alert("This community rotation has no valid share code.");
        return;
    }

    if (typeof hasCreatedRotation === "function" && hasCreatedRotation()) {
        const shouldReplace = confirm("Load this community rotation and replace your current setup?");
        if (!shouldReplace) return;
    }

    try {
        applyBuildShareCode(row.share_code);
        markCommunityRotationViewed(row);
        closeCommunityRotationsModal();
        alert("Community rotation loaded.");
    } catch (error) {
        console.error("Community rotation import failed:", error);
        alert("This community rotation could not be loaded.");
    }
}

function openCommunityRotationsModal(options = {}) {
    const modal = document.getElementById("communityModal");
    if (!modal) return;

    const forceRefresh = Object.prototype.hasOwnProperty.call(options || {}, "forceRefresh")
        ? Boolean(options.forceRefresh)
        : true;

    modal.classList.add("open");
    updateCommunitySubmitAvailability();
    fetchCommunityRotations(forceRefresh);
}

function closeCommunityRotationsModal() {
    const modal = document.getElementById("communityModal");
    if (!modal) return;

    setCommunitySubmitFormOpen(false);
    communityRotationState.detailRotationId = "";
    renderCommunityDetailPanel();
    modal.classList.remove("open");
}

function resetCommunityFilters() {
    communityRotationState.search = "";
    communityRotationState.elementFilter = "all";
    communityRotationState.classFilter = "all";
    communityRotationState.sort = "newest";

    const searchInput = document.getElementById("communitySearchInput");
    if (searchInput) searchInput.value = "";

    renderCommunityRotations();
}

function initCommunityRotations() {
    if (communityRotationsInitialized) return;
    communityRotationsInitialized = true;
    communityRotationState.likedRotationIds = readCommunityLikedRotationIds();

    const openButton = document.getElementById("openCommunityRotationsBtn");
    const closeButton = document.getElementById("closeCommunityModalBtn");
    const refreshButton = document.getElementById("refreshCommunityRotationsBtn");
    const submitToggle = document.getElementById("openCommunitySubmitFormBtn");
    const submitForm = document.getElementById("communitySubmitForm");
    const cancelSubmitButton = document.getElementById("cancelCommunitySubmitBtn");
    const searchInput = document.getElementById("communitySearchInput");
    const sortSelect = document.getElementById("communitySortSelect");
    const clearFiltersButton = document.getElementById("clearCommunityFiltersBtn");
    const modal = document.getElementById("communityModal");

    if (openButton) openButton.addEventListener("click", () => openCommunityRotationsModal());
    if (closeButton) closeButton.addEventListener("click", closeCommunityRotationsModal);
    if (refreshButton) refreshButton.addEventListener("click", () => fetchCommunityRotations(true));
    if (submitToggle) submitToggle.addEventListener("click", () => setCommunitySubmitFormOpen(true));
    if (submitForm) submitForm.addEventListener("submit", submitCommunityRotation);
    if (cancelSubmitButton) cancelSubmitButton.addEventListener("click", () => setCommunitySubmitFormOpen(false));
    if (searchInput) {
        searchInput.addEventListener("input", event => {
            communityRotationState.search = event.target.value;
            renderCommunityRotations();
        });
    }
    if (sortSelect) {
        sortSelect.addEventListener("change", event => {
            communityRotationState.sort = event.target.value;
            renderCommunityRotations();
        });
    }
    if (clearFiltersButton) clearFiltersButton.addEventListener("click", resetCommunityFilters);

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeCommunityRotationsModal();
        });
    }

    document.addEventListener("keydown", event => {
        const modalElement = document.getElementById("communityModal");
        if (event.key === "Escape" && modalElement?.classList.contains("open")) {
            closeCommunityRotationsModal();
        }
    });

    window.addEventListener("hashchange", handleCommunityRotationDeepLink);
    if (getCommunityRotationIdFromUrl()) {
        window.setTimeout(handleCommunityRotationDeepLink, 0);
    }
}

window.openCommunityRotationsModal = openCommunityRotationsModal;
window.setCommunitySubmitFormOpen = setCommunitySubmitFormOpen;
window.submitCurrentRotationToCommunity = submitCurrentRotationToCommunity;
window.initCommunityRotations = initCommunityRotations;
