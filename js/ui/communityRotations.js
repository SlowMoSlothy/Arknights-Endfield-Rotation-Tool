const communityRotationState = {
    rotations: [],
    search: "",
    loaded: false,
    loading: false,
    submitting: false,
    error: ""
};

let communityRotationsInitialized = false;

function normalizeCommunityList(value) {
    return Array.isArray(value) ? value.filter(item => item !== null && item !== undefined) : [];
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
    if (!query) return communityRotationState.rotations;

    return communityRotationState.rotations.filter(row => getCommunitySearchText(row).includes(query));
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

    if (refreshButton) {
        refreshButton.disabled = communityRotationState.loading;
        refreshButton.textContent = communityRotationState.loading ? "Loading" : "Refresh";
    }

    list.innerHTML = "";

    if (communityRotationState.loading) {
        setCommunityStatus("Loading community rotations...");
        return;
    }

    if (communityRotationState.error) {
        setCommunityStatus(communityRotationState.error, "is-error");
        return;
    }

    if (!communityRotationState.loaded) {
        setCommunityStatus("");
        return;
    }

    const filteredRotations = getFilteredCommunityRotations();
    if (!filteredRotations.length) {
        const message = communityRotationState.search
            ? "No community rotations match this search."
            : "No approved community rotations yet.";
        setCommunityStatus(message, "is-empty");
        return;
    }

    setCommunityStatus(`${filteredRotations.length} rotation${filteredRotations.length === 1 ? "" : "s"} found.`);
    filteredRotations.forEach(row => {
        list.appendChild(createCommunityRotationCard(row));
    });
}

function createCommunityRotationCard(row) {
    const card = document.createElement("article");
    card.className = "community-card";

    const header = document.createElement("div");
    header.className = "community-card-header";

    const titleWrap = document.createElement("div");
    const title = createCommunityTextElement("h3", "community-card-title", row.title || "Untitled rotation");
    const author = row.author_name ? row.author_name : "Anonymous";
    const date = formatCommunityDate(row.created_at);
    const metaParts = [`by ${author}`];
    if (date) metaParts.push(date);
    titleWrap.append(title, createCommunityTextElement("div", "community-card-meta", metaParts.join(" - ")));

    const loadButton = document.createElement("button");
    loadButton.className = "community-load-btn";
    loadButton.type = "button";
    loadButton.textContent = "Load";
    loadButton.addEventListener("click", () => loadCommunityRotation(row.id));

    header.append(titleWrap, loadButton);

    const team = document.createElement("div");
    team.className = "community-team";
    const teamOperators = getCommunityTeamOperators(row);
    if (teamOperators.length) {
        teamOperators.slice(0, 4).forEach(operator => team.appendChild(createCommunityOperatorAvatar(operator)));
    } else {
        team.appendChild(createCommunityOperatorPlaceholder());
    }

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
        `${Number(row.view_count) || 0} views`,
        `${Number(row.likes_count) || 0} likes`
    ].join(" - ");
    footer.appendChild(createCommunityTextElement("span", "community-stat", statText));

    card.append(header, team, description, chipRow, footer);
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
    modal.classList.remove("open");
}

function initCommunityRotations() {
    if (communityRotationsInitialized) return;
    communityRotationsInitialized = true;

    const openButton = document.getElementById("openCommunityRotationsBtn");
    const closeButton = document.getElementById("closeCommunityModalBtn");
    const refreshButton = document.getElementById("refreshCommunityRotationsBtn");
    const submitToggle = document.getElementById("openCommunitySubmitFormBtn");
    const submitForm = document.getElementById("communitySubmitForm");
    const cancelSubmitButton = document.getElementById("cancelCommunitySubmitBtn");
    const searchInput = document.getElementById("communitySearchInput");
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
