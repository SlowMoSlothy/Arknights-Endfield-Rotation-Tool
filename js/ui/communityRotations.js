const communityRotationState = {
    rotations: [],
    search: "",
    elementFilter: "all",
    classFilter: "all",
    sort: "newest",
    detailRotationId: "",
    likedRotationIds: new Set(),
    likingRotationIds: new Set(),
    loaded: false,
    loading: false,
    submitting: false,
    error: ""
};

const COMMUNITY_LIKES_STORAGE_KEY = "aertLikedCommunityRotations";

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
    if (skill && typeof createSkillIcon === "function") {
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
        row.author_name,
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
    return normalizeCommunityList(row.rotation_skill_ids).length;
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
        panel.hidden = true;
        return;
    }

    panel.hidden = false;

    const header = document.createElement("div");
    header.className = "community-detail-header";

    const titleWrap = document.createElement("div");
    titleWrap.append(
        createCommunityTextElement("h3", "community-detail-title", row.title || "Untitled rotation"),
        createCommunityTextElement(
            "div",
            "community-detail-meta",
            [
                row.author_name ? `by ${row.author_name}` : "by Anonymous",
                formatCommunityDate(row.created_at),
                `${Number(row.view_count) || 0} views`,
                `${Number(row.likes_count) || 0} likes`
            ].filter(Boolean).join(" - ")
        )
    );

    const closeButton = document.createElement("button");
    closeButton.className = "community-detail-close";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", closeCommunityDetail);

    header.append(titleWrap, closeButton);

    const body = document.createElement("div");
    body.className = "community-detail-body";

    const team = document.createElement("div");
    team.className = "community-detail-team";
    getCommunityTeamOperators(row).slice(0, 4).forEach(operator => {
        const item = document.createElement("div");
        item.className = "community-detail-operator";
        item.append(
            createCommunityOperatorAvatar(operator),
            createCommunityTextElement("span", "", operator.name || "Operator")
        );
        team.appendChild(item);
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

    const actions = document.createElement("div");
    actions.className = "community-detail-actions";
    actions.append(createCommunityLoadButton(row, "Load Rotation"), createCommunityLikeButton(row));

    body.append(team, rotationWrap, description, actions);
    panel.append(header, body);
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
        .map(entry => ({
            id: Number(entry.id),
            autoInserted: entry.autoInserted === true
        }))
        .filter(entry => Number.isFinite(entry.id) && typeof getSkillById === "function" && getSkillById(entry.id));
}

function getCurrentCommunityRotationSkills() {
    return getCurrentCommunityRotationEntries()
        .map(entry => getSkillById(entry.id))
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

function updateCommunitySubmitAvailability() {
    const submitToggle = document.getElementById("openCommunitySubmitFormBtn");
    if (!submitToggle) return;

    const canSubmit = typeof hasCreatedRotation === "function" ? hasCreatedRotation() : getCurrentCommunityRotationEntries().length > 0;
    submitToggle.disabled = !canSubmit;
    submitToggle.textContent = canSubmit ? "Submit Current" : "No Rotation";
}

function setCommunitySubmitFormOpen(isOpen) {
    const form = document.getElementById("communitySubmitForm");
    if (!form) return;

    form.hidden = !isOpen;
    if (isOpen) {
        updateCommunitySubmitAvailability();
        setCommunitySubmitStatus("");
        const titleInput = document.getElementById("communitySubmitTitle");
        if (titleInput) titleInput.focus();
    }
}

function validateCommunitySubmission(values) {
    const title = values.title.trim();
    const description = values.description.trim();
    const author = values.author.trim();
    const teamIds = getCurrentCommunityTeamIds();
    const rotationEntries = getCurrentCommunityRotationEntries();

    if (!title || title.length < 3 || title.length > 80) {
        return "Please enter a title between 3 and 80 characters.";
    }

    if (author.length > 40) {
        return "Author can be up to 40 characters.";
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
    const rotationSkillIds = rotationEntries.map(entry => entry.id);
    const teamOperators = getCurrentCommunityTeamOperators();
    const rotationSkills = getCurrentCommunityRotationSkills();

    return {
        game: "arknights_endfield",
        title: values.title.trim(),
        description: values.description.trim(),
        author_name: values.author.trim(),
        share_code: createBuildShareCode(),
        setup_version: 2,
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
                    id: entry.id,
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

    const validationError = validateCommunitySubmission(values);
    if (validationError) {
        setCommunitySubmitStatus(validationError, "is-error");
        return;
    }

    if (typeof supabaseClient === "undefined" || !supabaseClient) {
        setCommunitySubmitStatus("Supabase is not available right now.", "is-error");
        return;
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
            .insert(buildCommunitySubmission(values));

        if (error) throw error;

        const form = document.getElementById("communitySubmitForm");
        if (form) form.reset();
        setCommunitySubmitStatus("Submitted for review. It will appear after approval.", "is-success");
    } catch (error) {
        console.error("Community rotation submission failed:", error);
        setCommunitySubmitStatus("This rotation could not be submitted.", "is-error");
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
    const title = createCommunityTextElement("h3", "community-card-title", row.title || "Untitled rotation");
    const author = row.author_name ? row.author_name : "Anonymous";
    const date = formatCommunityDate(row.created_at);
    const metaParts = [`by ${author}`];
    if (date) metaParts.push(date);
    titleWrap.append(title, createCommunityTextElement("div", "community-card-meta", metaParts.join(" - ")));

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
    const skillCount = normalizeCommunityList(row.rotation_skill_ids).length;
    const statText = [
        `${skillCount} skill${skillCount === 1 ? "" : "s"}`,
        `${Number(row.view_count) || 0} views`
    ].join(" - ");
    footer.appendChild(createCommunityTextElement("span", "community-stat", statText));
    const actions = document.createElement("div");
    actions.className = "community-card-actions";
    actions.append(createCommunityDetailButton(row), createCommunityLikeButton(row));
    footer.appendChild(actions);

    card.append(header, team, rotationPreview, description, chipRow, footer);
    return card;
}

async function fetchCommunityRotations(force = false) {
    if (communityRotationState.loading) return;
    if (communityRotationState.loaded && !force) {
        renderCommunityRotations();
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
            .select("id,title,description,author_name,share_code,team_operator_ids,rotation_skill_ids,element_types,operator_classes,likes_count,view_count,created_at")
            .eq("game", "arknights_endfield")
            .eq("is_public", true)
            .eq("is_approved", true)
            .eq("is_hidden", false)
            .order("created_at", { ascending: false })
            .limit(60);

        if (error) throw error;

        communityRotationState.rotations = Array.isArray(data) ? data : [];
        communityRotationState.loaded = true;
    } catch (error) {
        console.error("Community rotations could not be loaded:", error);
        communityRotationState.error = "Community rotations could not be loaded.";
    } finally {
        communityRotationState.loading = false;
        renderCommunityRotations();
    }
}

async function incrementCommunityRotationView(row) {
    if (!row?.id || typeof supabaseClient === "undefined" || !supabaseClient) return;

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
    } catch (error) {
        console.warn("Community rotation view count could not be updated:", error);
    }
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
        incrementCommunityRotationView(row);
        closeCommunityRotationsModal();
        alert("Community rotation loaded.");
    } catch (error) {
        console.error("Community rotation import failed:", error);
        alert("This community rotation could not be loaded.");
    }
}

function openCommunityRotationsModal() {
    const modal = document.getElementById("communityModal");
    if (!modal) return;

    modal.classList.add("open");
    updateCommunitySubmitAvailability();
    fetchCommunityRotations(true);
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

    if (openButton) openButton.addEventListener("click", openCommunityRotationsModal);
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
}

window.initCommunityRotations = initCommunityRotations;
