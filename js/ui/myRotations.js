const myRotationsState = {
    session: null,
    profile: null,
    rotations: [],
    loading: false,
    saving: false,
    profileSaving: false,
    avatarRemovalRequested: false,
    passwordResetSending: false,
    passwordUpdating: false,
    authMode: "signIn",
    actionIds: new Set(),
    initialized: false,
    authStatus: "",
    authStatusClass: "",
    listStatus: "",
    listStatusClass: "",
    detailRotationId: "",
    detailEditing: false
};

const MY_AUTH_MODES = {
    signIn: {
        title: "Sign in to My Rotations",
        intro: "Sign in to save private rotations, load them later, and submit them for Community review.",
        status: ""
    },
    create: {
        title: "Create your account",
        intro: "Create an account with username, email, and password to start saving private rotations.",
        status: "Enter a username, email, and password, then press Create Account."
    }
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;
const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function getMySupabaseClient() {
    return typeof supabaseClient !== "undefined" ? supabaseClient : null;
}

function createMyTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    return element;
}

function normalizeMyList(value) {
    return Array.isArray(value) ? value.filter(item => item !== null && item !== undefined) : [];
}

function formatMyDate(value) {
    if (typeof formatCommunityDate === "function") return formatCommunityDate(value);

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit"
    }).format(date);
}

function formatMyLabel(value) {
    if (typeof formatCommunityLabel === "function") return formatCommunityLabel(value);

    return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function uniqueMyLabels(values) {
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

function getMyOperatorById(operatorId) {
    const id = Number(operatorId);
    if (!Number.isFinite(id) || typeof operators === "undefined" || !Array.isArray(operators)) return null;
    return operators.find(operator => operator.id === id) || null;
}

function getMySkillById(skillId) {
    if (typeof getSkillById !== "function") return null;
    return getSkillById(Number(skillId));
}

function getMyRotationSkills(row) {
    if (row?.share_code && typeof parseBuildShareCode === "function" && typeof getRotationActionData === "function") {
        try {
            const payload = parseBuildShareCode(row.share_code);
            const actions = Array.isArray(payload?.rotation)
                ? payload.rotation.map(entry => getRotationActionData(entry)).filter(Boolean)
                : [];
            if (actions.length) return actions;
        } catch (error) {
            console.warn("My rotation preview share code could not be parsed:", error);
        }
    }

    return normalizeMyList(row?.rotation_skill_ids)
        .map(skillId => getMySkillById(skillId))
        .filter(Boolean);
}

function getMyRotationActionCount(row) {
    const actionCount = getMyRotationSkills(row).length;
    return actionCount || normalizeMyList(row?.rotation_skill_ids).length;
}

function getMyTeamOperators(row) {
    return normalizeMyList(row?.team_operator_ids)
        .map(operatorId => getMyOperatorById(operatorId))
        .filter(Boolean);
}

function getCurrentMyTeamIds() {
    if (!Array.isArray(selectedTeam)) return [];

    return selectedTeam
        .map(operatorId => Number(operatorId))
        .filter(operatorId => Number.isFinite(operatorId) && getMyOperatorById(operatorId));
}

function getCurrentMyRotationEntries() {
    if (!Array.isArray(rotation)) return [];
    return rotation.filter(Boolean);
}

function getCurrentMyRotationSkills() {
    return getCurrentMyRotationEntries()
        .map(entry => getMySkillById(entry.id))
        .filter(Boolean);
}

function getMyAuthorName() {
    const username = String(myRotationsState.profile?.username || "").trim();
    if (username) return username.slice(0, 40);

    const email = String(myRotationsState.session?.user?.email || "").trim();
    if (!email) return "Anonymous";
    return email.split("@")[0].slice(0, 40) || "Anonymous";
}

function getMyDisplayName() {
    return String(
        myRotationsState.profile?.username
        || myRotationsState.session?.user?.user_metadata?.username
        || myRotationsState.session?.user?.email
        || "Account"
    ).trim();
}

function sanitizeUsername(value) {
    return String(value || "").trim().replace(/\s+/g, "_");
}

function isValidUsername(value) {
    return USERNAME_PATTERN.test(sanitizeUsername(value));
}

function getFriendlyMyAccountError(error, fallbackMessage = "Account action failed.") {
    const message = String(error?.message || error || "").trim();
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("duplicate") || lowerMessage.includes("23505") || lowerMessage.includes("idx_user_profiles_username")) {
        return "This username is already taken.";
    }

    if (lowerMessage.includes("user already registered") || lowerMessage.includes("already registered")) {
        return "This email is already registered. Try signing in instead.";
    }

    if (lowerMessage.includes("password")) {
        return "Use a password with at least 6 characters.";
    }

    if (lowerMessage.includes("email")) {
        return "Check the email address and try again.";
    }

    return message || fallbackMessage;
}

function getAuthRedirectUrl() {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
        return `${window.location.origin}${window.location.pathname}`;
    }

    return window.location.href.split("#")[0];
}

function getFallbackUsername() {
    const metadataUsername = myRotationsState.session?.user?.user_metadata?.username;
    if (isValidUsername(metadataUsername)) return sanitizeUsername(metadataUsername);

    const emailPrefix = String(myRotationsState.session?.user?.email || "")
        .split("@")[0]
        .replace(/[^A-Za-z0-9_]/g, "")
        .slice(0, 24);
    if (isValidUsername(emailPrefix)) return emailPrefix;

    return `user_${String(myRotationsState.session?.user?.id || "00000000").replace(/-/g, "").slice(0, 8)}`;
}

function hasCurrentSavableRotation() {
    return typeof hasCreatedRotation === "function"
        ? hasCreatedRotation()
        : getCurrentMyRotationEntries().length > 0;
}

function buildMyRotationPayload(values) {
    const shareCode = createBuildShareCode();
    const persistence = createBuildPersistencePayloadFromShareCode(shareCode, {
        timestampKey: "savedAt"
    });

    return {
        game: "arknights_endfield",
        title: values.title,
        description: values.description,
        share_code: shareCode,
        setup_version: persistence.setupVersion,
        team_operator_ids: persistence.teamOperatorIds,
        rotation_skill_ids: persistence.rotationSkillIds,
        element_types: persistence.elementTypes,
        operator_classes: persistence.operatorClasses,
        payload: persistence.payload
    };
}

function normalizeMyRotationSaveValues(values = {}) {
    return {
        title: String(values.title || "").trim(),
        description: String(values.description || "").trim()
    };
}

function getMyRotationStatus(row) {
    if (row?.submitted_for_review_at) {
        return {
            label: "Submitted",
            detail: `Submitted ${formatMyDate(row.submitted_for_review_at) || ""}`.trim(),
            className: "is-submitted"
        };
    }

    return {
        label: "Private",
        detail: "Private save",
        className: "is-private"
    };
}

function createMyStatusBadge(row) {
    const status = getMyRotationStatus(row);
    const badge = createMyTextElement("span", `my-status-badge ${status.className}`, status.label);
    badge.title = status.detail;
    return badge;
}

function getMySelectedRotation() {
    const selectedId = String(myRotationsState.detailRotationId || "");
    if (!selectedId) return null;
    return myRotationsState.rotations.find(row => String(row.id) === selectedId) || null;
}

function selectMyRotation(row, editing = false) {
    myRotationsState.detailRotationId = String(row?.id || "");
    myRotationsState.detailEditing = Boolean(editing);
    renderMyRotationList();
}

function closeMyRotationDetail() {
    myRotationsState.detailRotationId = "";
    myRotationsState.detailEditing = false;
    renderMyRotationList();
}

function setMyAuthStatus(text, className = "") {
    myRotationsState.authStatus = text;
    myRotationsState.authStatusClass = className;
    renderMyAuthStatus();
}

function setMyListStatus(text, className = "") {
    myRotationsState.listStatus = text;
    myRotationsState.listStatusClass = className;
    renderMyListStatus();
}

function renderMyAuthStatus() {
    const status = document.getElementById("myRotationsAuthStatus");
    if (!status) return;

    status.className = `my-rotations-status${myRotationsState.authStatusClass ? ` ${myRotationsState.authStatusClass}` : ""}`;
    status.textContent = myRotationsState.authStatus;
}

function renderMyListStatus() {
    const status = document.getElementById("myRotationsListStatus");
    if (!status) return;

    status.className = `my-rotations-status${myRotationsState.listStatusClass ? ` ${myRotationsState.listStatusClass}` : ""}`;
    status.textContent = myRotationsState.listStatus;
}

function renderMyAuthPanel() {
    const authPanel = document.getElementById("myRotationsAuthPanel");
    const contentPanel = document.getElementById("myRotationsContentPanel");
    const userLabel = document.getElementById("myRotationsUserName");
    const title = document.getElementById("myRotationsTitle");
    const isSignedIn = Boolean(myRotationsState.session);

    if (authPanel) authPanel.hidden = isSignedIn;
    if (contentPanel) contentPanel.hidden = !isSignedIn;
    if (userLabel) userLabel.textContent = getMyDisplayName();
    if (title && isSignedIn) title.textContent = "My Rotations";

    renderMyAuthStatus();
    renderMyListStatus();
    renderMyProfile();
    updateAccountBar();
    if (typeof updateCommunitySubmitAvailability === "function") updateCommunitySubmitAvailability();
}

function updateAccountBar() {
    const signInButton = document.getElementById("accountSignInBtn");
    const createButton = document.getElementById("accountCreateBtn");
    const signOutButton = document.getElementById("accountSignOutBtn");
    const userLabel = document.getElementById("accountUserLabel");
    const avatar = document.getElementById("accountAvatar");
    const openMyRotationsButton = document.getElementById("openMyRotationsBtn");
    const openProfileButton = document.getElementById("openProfileBtn");
    const isSignedIn = Boolean(myRotationsState.session);
    const displayName = getMyDisplayName();
    const avatarUrl = myRotationsState.profile?.avatar_url || "";

    if (signInButton) signInButton.hidden = isSignedIn;
    if (createButton) createButton.hidden = isSignedIn;
    if (signOutButton) signOutButton.hidden = !isSignedIn;
    if (openMyRotationsButton) openMyRotationsButton.hidden = !isSignedIn;
    if (openProfileButton) openProfileButton.hidden = !isSignedIn;
    if (userLabel) {
        userLabel.hidden = !isSignedIn;
        userLabel.textContent = displayName;
        userLabel.title = displayName;
    }
    if (avatar) {
        avatar.hidden = !isSignedIn || !avatarUrl;
        avatar.src = avatarUrl || "";
        avatar.alt = avatarUrl ? `${displayName} avatar` : "";
    }
}

function setMyAuthMode(mode = "signIn") {
    const config = MY_AUTH_MODES[mode] || MY_AUTH_MODES.signIn;
    myRotationsState.authMode = mode;

    const title = document.getElementById("myRotationsTitle");
    const intro = document.getElementById("myRotationsIntro");
    const usernameField = document.getElementById("myRotationsUsernameField");
    const usernameInput = document.getElementById("myRotationsUsernameInput");
    const passwordInput = document.getElementById("myRotationsPasswordInput");
    const registerButton = document.getElementById("myRotationsRegisterButton");
    const signInButton = document.getElementById("myRotationsSignInButton");
    const forgotPasswordButton = document.getElementById("myRotationsForgotPasswordButton");

    if (title) title.textContent = config.title;
    if (intro) intro.textContent = config.intro;
    if (usernameField) usernameField.hidden = mode !== "create";
    if (usernameInput) {
        usernameInput.disabled = mode !== "create";
        usernameInput.required = false;
        usernameInput.setAttribute("aria-required", mode === "create" ? "true" : "false");
    }
    if (passwordInput) passwordInput.autocomplete = mode === "create" ? "new-password" : "current-password";
    if (registerButton) registerButton.classList.toggle("my-primary-btn", mode === "create");
    if (registerButton) registerButton.classList.toggle("my-secondary-btn", mode !== "create");
    if (signInButton) signInButton.classList.toggle("my-primary-btn", mode !== "create");
    if (signInButton) signInButton.classList.toggle("my-secondary-btn", mode === "create");
    if (forgotPasswordButton) forgotPasswordButton.hidden = mode === "create";

    if (!myRotationsState.session) {
        setMyAuthStatus(config.status);
    }
}

function setMyProfileStatus(text, className = "") {
    const status = document.getElementById("myProfileStatus");
    if (!status) return;

    status.className = `my-rotations-status${className ? ` ${className}` : ""}`;
    status.textContent = text;
}

function clearMyAvatarObjectUrl(preview) {
    const objectUrl = preview?.dataset?.objectUrl || "";
    if (!objectUrl) return;

    URL.revokeObjectURL(objectUrl);
    delete preview.dataset.objectUrl;
}

function renderMyProfile() {
    const usernameInput = document.getElementById("myProfileUsernameInput");
    const avatarPreview = document.getElementById("myProfileAvatarPreview");
    const avatarInput = document.getElementById("myProfileAvatarInput");
    const saveButton = document.getElementById("myProfileSaveButton");
    const removeAvatarButton = document.getElementById("myProfileRemoveAvatarButton");
    const username = myRotationsState.profile?.username || "";
    const avatarUrl = myRotationsState.avatarRemovalRequested ? "" : myRotationsState.profile?.avatar_url || "";

    if (usernameInput && document.activeElement !== usernameInput) {
        usernameInput.value = username;
    }
    if (avatarInput && myRotationsState.avatarRemovalRequested) {
        avatarInput.value = "";
    }
    if (avatarPreview) {
        clearMyAvatarObjectUrl(avatarPreview);
        avatarPreview.hidden = !avatarUrl;
        avatarPreview.src = avatarUrl || "";
        avatarPreview.alt = avatarUrl ? `${username || "Account"} avatar` : "";
    }
    if (saveButton) {
        saveButton.disabled = !myRotationsState.session || myRotationsState.profileSaving;
        saveButton.textContent = myRotationsState.profileSaving ? "Saving" : "Save Account";
    }
    if (removeAvatarButton) {
        removeAvatarButton.disabled = !myRotationsState.session || myRotationsState.profileSaving || (!avatarUrl && !myRotationsState.profile?.avatar_url);
    }
}

function createMyOperatorPlaceholder() {
    const placeholder = document.createElement("span");
    placeholder.className = "my-operator-placeholder";
    placeholder.textContent = "?";
    return placeholder;
}

function createMyOperatorAvatar(operator) {
    if (typeof createCommunityOperatorAvatar === "function") {
        const avatar = createCommunityOperatorAvatar(operator);
        avatar.classList.add("my-operator-avatar");
        return avatar;
    }

    if (!operator?.icon) return createMyOperatorPlaceholder();

    const image = document.createElement("img");
    image.className = "my-operator-avatar";
    image.src = operator.icon;
    image.alt = operator.name || "Operator";
    image.loading = "lazy";
    image.addEventListener("error", () => image.replaceWith(createMyOperatorPlaceholder()), { once: true });
    return image;
}

function createMyTeamPreview(row) {
    const team = document.createElement("div");
    team.className = "my-team-preview";

    const teamOperators = getMyTeamOperators(row);
    if (!teamOperators.length) {
        team.appendChild(createMyOperatorPlaceholder());
        return team;
    }

    teamOperators.slice(0, 4).forEach(operator => {
        const item = document.createElement("span");
        item.className = "my-team-operator";
        item.append(
            createMyOperatorAvatar(operator),
            createMyTextElement("span", "my-team-operator-name", operator.name || "Operator")
        );
        team.appendChild(item);
    });

    return team;
}

function createMyRotationPreview(row) {
    if (typeof createCommunityRotationPreview === "function") {
        const preview = createCommunityRotationPreview(row, { limit: 8 });
        preview.classList.add("my-rotation-preview");
        return preview;
    }

    const preview = document.createElement("div");
    preview.className = "my-rotation-preview";
    preview.textContent = `${getMyRotationActionCount(row)} actions`;
    return preview;
}

function createMyChipRow(row) {
    const chipRow = document.createElement("div");
    chipRow.className = "my-chip-row";
    [...normalizeMyList(row.element_types), ...normalizeMyList(row.operator_classes)].slice(0, 8).forEach(label => {
        chipRow.appendChild(createMyTextElement("span", "my-chip", formatMyLabel(label)));
    });
    return chipRow;
}

function createMyDetailSection(title, child) {
    const section = document.createElement("section");
    section.className = "my-detail-section";
    section.append(createMyTextElement("h4", "my-detail-section-title", title), child);
    return section;
}

function createMyDetailTeam(row) {
    const team = document.createElement("div");
    team.className = "my-detail-team";

    const operators = getMyTeamOperators(row);
    if (!operators.length) {
        team.appendChild(createMyTextElement("span", "my-detail-empty", "No team saved."));
        return team;
    }

    operators.forEach((operator, index) => {
        const item = document.createElement("article");
        item.className = "my-detail-operator";
        if (index === 0) item.classList.add("is-leader");

        const avatar = createMyOperatorAvatar(operator);
        avatar.classList.add("my-detail-operator-avatar");

        const copy = document.createElement("div");
        copy.className = "my-detail-operator-copy";
        copy.appendChild(createMyTextElement("strong", "", operator.name || "Operator"));

        const meta = [
            operator.star ? `${operator.star} star` : "",
            operator.operatorClass ? formatMyLabel(operator.operatorClass) : "",
            operator.elementType ? formatMyLabel(operator.elementType) : ""
        ].filter(Boolean).join(" - ");

        copy.appendChild(createMyTextElement("span", "", meta || `Slot ${index + 1}`));
        if (index === 0) copy.appendChild(createMyTextElement("em", "", "Leader"));

        item.append(avatar, copy);
        team.appendChild(item);
    });

    return team;
}

function createMyDetailSkillSequence(row) {
    const sequence = document.createElement("div");
    sequence.className = "my-detail-skill-sequence";

    const skills = getMyRotationSkills(row);
    if (!skills.length) {
        sequence.appendChild(createMyTextElement("span", "my-detail-empty", "No skills saved."));
        return sequence;
    }

    skills.forEach((skill, index) => {
        if (index > 0) {
            sequence.appendChild(createMyTextElement("span", "my-detail-arrow", "->"));
        }

        const item = document.createElement("span");
        item.className = "my-detail-skill";

        if (skill?.isBasicAttack && typeof createBasicAttackIcon === "function") {
            item.appendChild(createBasicAttackIcon(skill, {
                size: "small",
                extraClasses: ["my-detail-skill-icon"]
            }));
        } else if (skill && typeof createSkillIcon === "function") {
            item.appendChild(createSkillIcon(skill, {
                size: "small",
                useSmallIcon: true,
                extraClasses: ["my-detail-skill-icon"]
            }));
        } else {
            item.appendChild(createMyOperatorPlaceholder());
        }

        const label = typeof getShortSkillType === "function"
            ? getShortSkillType(skill.type || skill.shortType)
            : (skill.shortType || "");
        item.appendChild(createMyTextElement("span", "my-detail-skill-label", label || "?"));
        sequence.appendChild(item);
    });

    return sequence;
}

function createMyDetailMeta(row) {
    const meta = document.createElement("div");
    meta.className = "my-detail-meta";
    const updated = formatMyDate(row.updated_at || row.created_at) || "-";
    const skillCount = getMyRotationActionCount(row);
    const teamCount = normalizeMyList(row.team_operator_ids).length;
    meta.append(
        createMyTextElement("span", "", `Updated ${updated}`),
        createMyTextElement("span", "", `${teamCount} operator${teamCount === 1 ? "" : "s"}`),
        createMyTextElement("span", "", `${skillCount} action${skillCount === 1 ? "" : "s"}`)
    );
    return meta;
}

function createMyDetailEditForm(row) {
    const form = document.createElement("form");
    form.className = "my-detail-edit-form";

    const titleField = document.createElement("label");
    titleField.className = "my-rotations-field";
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.minLength = 3;
    titleInput.maxLength = 80;
    titleInput.required = true;
    titleInput.value = row.title || "";
    titleField.append(createMyTextElement("span", "", "Title"), titleInput);

    const descriptionField = document.createElement("label");
    descriptionField.className = "my-rotations-field";
    const descriptionInput = document.createElement("textarea");
    descriptionInput.maxLength = 600;
    descriptionInput.rows = 3;
    descriptionInput.value = row.description || "";
    descriptionField.append(createMyTextElement("span", "", "Description"), descriptionInput);

    const actions = document.createElement("div");
    actions.className = "my-detail-actions";
    const busy = myRotationsState.actionIds.has(String(row.id));
    actions.append(
        createMyActionButton("Save Changes", "is-primary", () => {}, busy),
        createMyActionButton("Cancel", "", () => selectMyRotation(row, false), busy)
    );

    form.addEventListener("submit", event => {
        event.preventDefault();
        updateMyRotationDetails(row, {
            title: titleInput.value,
            description: descriptionInput.value
        });
    });
    actions.querySelector(".is-primary")?.addEventListener("click", event => {
        event.preventDefault();
        form.requestSubmit();
    });

    form.append(titleField, descriptionField, actions);
    window.setTimeout(() => titleInput.focus(), 0);
    return form;
}

function renderMyRotationDetail() {
    const panel = document.getElementById("myRotationDetailPanel");
    if (!panel) return;

    const row = getMySelectedRotation();
    if (!myRotationsState.session || myRotationsState.loading || !row) {
        panel.hidden = true;
        panel.replaceChildren();
        return;
    }

    panel.hidden = false;
    panel.replaceChildren();

    const busy = myRotationsState.actionIds.has(String(row.id));
    const header = document.createElement("div");
    header.className = "my-detail-header";

    const titleBlock = document.createElement("div");
    titleBlock.className = "my-detail-title-block";
    const titleRow = document.createElement("div");
    titleRow.className = "my-detail-title-row";
    titleRow.append(createMyTextElement("h3", "my-detail-title", row.title || "Untitled rotation"), createMyStatusBadge(row));
    titleBlock.append(titleRow, createMyDetailMeta(row));

    const headerActions = document.createElement("div");
    headerActions.className = "my-detail-header-actions";
    if (!myRotationsState.detailEditing) {
        headerActions.appendChild(createMyActionButton("Edit", "", () => selectMyRotation(row, true), busy));
    }
    const closeButton = createMyActionButton("Close", "", closeMyRotationDetail);
    headerActions.appendChild(closeButton);
    header.append(titleBlock, headerActions);
    panel.appendChild(header);

    if (myRotationsState.detailEditing) {
        panel.appendChild(createMyDetailEditForm(row));
        return;
    }

    const description = createMyTextElement("p", "my-detail-description", row.description || "No description added.");
    const actions = document.createElement("div");
    actions.className = "my-detail-actions";
    actions.append(
        createMyActionButton("Load", "is-primary", () => loadMyRotation(row), busy),
        createMyActionButton("Update with Current", "", () => overwriteMyRotationWithCurrent(row), busy || !hasCurrentSavableRotation()),
        createMyActionButton(
            row.submitted_for_review_at ? "Submitted" : "Submit to Community",
            "",
            () => submitMyRotationForReview(row),
            busy || Boolean(row.submitted_for_review_at)
        ),
        createMyActionButton("Delete", "is-danger", () => deleteMyRotation(row), busy)
    );

    panel.append(
        createMyDetailSection("Team", createMyDetailTeam(row)),
        createMyDetailSection("Rotation", createMyDetailSkillSequence(row)),
        createMyDetailSection("Notes", description),
        createMyDetailSection("Tags", createMyChipRow(row)),
        actions
    );
}

function createMyActionButton(label, className, action, disabled = false) {
    const button = document.createElement("button");
    button.className = `my-action-btn${className ? ` ${className}` : ""}`;
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", event => {
        event.stopPropagation();
        action(event);
    });
    return button;
}

function createMyRotationCard(row) {
    const card = document.createElement("article");
    card.className = "my-rotation-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${row.title || "saved rotation"}`);
    card.classList.toggle("is-selected", String(row.id) === String(myRotationsState.detailRotationId));
    card.addEventListener("click", () => selectMyRotation(row));
    card.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        selectMyRotation(row);
    });

    const titleRow = document.createElement("div");
    titleRow.className = "my-rotation-title-row";
    const title = createMyTextElement("h3", "my-rotation-title", row.title || "Untitled rotation");
    titleRow.append(title, createMyStatusBadge(row));

    const updated = formatMyDate(row.updated_at || row.created_at);
    const skillCount = getMyRotationActionCount(row);
    const meta = createMyTextElement(
        "div",
        "my-rotation-meta",
        [`Updated ${updated || "-"}`, `${skillCount} action${skillCount === 1 ? "" : "s"}`].join(" - ")
    );

    const description = createMyTextElement(
        "p",
        "my-rotation-description",
        row.description || "No description added."
    );

    const actions = document.createElement("div");
    actions.className = "my-rotation-actions";
    const busy = myRotationsState.actionIds.has(String(row.id));
    actions.append(
        createMyActionButton("Load", "is-primary", () => loadMyRotation(row), busy),
        createMyActionButton(
            row.submitted_for_review_at ? "Submitted" : "Submit for Review",
            "",
            () => submitMyRotationForReview(row),
            busy || Boolean(row.submitted_for_review_at)
        ),
        createMyActionButton("Delete", "is-danger", () => deleteMyRotation(row), busy)
    );

    card.append(titleRow, meta, createMyTeamPreview(row), createMyRotationPreview(row), description, createMyChipRow(row), actions);
    return card;
}

function renderMyRotationList() {
    const list = document.getElementById("myRotationsList");
    if (!list) return;

    list.replaceChildren();
    list.hidden = false;

    if (!myRotationsState.session) {
        setMyListStatus("");
        renderMyRotationDetail();
        return;
    }

    if (myRotationsState.loading) {
        setMyListStatus("Loading your rotations...");
        const card = document.createElement("div");
        card.className = "my-state-card";
        const loader = document.createElement("span");
        loader.className = "my-state-loader";
        loader.setAttribute("aria-hidden", "true");
        card.append(loader, createMyTextElement("span", "", "Loading saved rotations"));
        list.appendChild(card);
        renderMyRotationDetail();
        return;
    }

    if (!myRotationsState.rotations.length) {
        myRotationsState.detailRotationId = "";
        myRotationsState.detailEditing = false;
        setMyListStatus("No saved rotations yet.");
        const card = document.createElement("div");
        card.className = "my-state-card";
        card.appendChild(createMyTextElement("span", "", "Save your current build to see it here."));
        list.appendChild(card);
        renderMyRotationDetail();
        return;
    }

    if (myRotationsState.detailRotationId && !getMySelectedRotation()) {
        myRotationsState.detailRotationId = "";
        myRotationsState.detailEditing = false;
    }

    const savedCountLabel = `${myRotationsState.rotations.length} saved rotation${myRotationsState.rotations.length === 1 ? "" : "s"}.`;
    setMyListStatus(myRotationsState.detailRotationId
        ? savedCountLabel
        : `${savedCountLabel} Select a saved rotation to inspect it.`
    );
    const visibleRows = myRotationsState.detailRotationId
        ? myRotationsState.rotations.filter(row => String(row.id) !== String(myRotationsState.detailRotationId))
        : myRotationsState.rotations;
    list.hidden = visibleRows.length === 0;
    visibleRows.forEach(row => list.appendChild(createMyRotationCard(row)));
    renderMyRotationDetail();
}

function renderMyRotations() {
    renderMyAuthPanel();
    renderMyRotationList();
}

async function upsertMyProfile({ username, avatarUrl = "" }) {
    const client = getMySupabaseClient();
    const userId = myRotationsState.session?.user?.id;
    if (!client || !userId) return null;

    const payload = {
        user_id: userId,
        username: sanitizeUsername(username || getFallbackUsername()),
        avatar_url: avatarUrl || myRotationsState.profile?.avatar_url || ""
    };

    const { data, error } = await client
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select("user_id,username,avatar_url,updated_at")
        .single();

    if (error) throw error;

    myRotationsState.profile = data;
    return data;
}

async function fetchMyProfile() {
    const client = getMySupabaseClient();
    const userId = myRotationsState.session?.user?.id;
    if (!client || !userId) {
        myRotationsState.profile = null;
        renderMyProfile();
        updateAccountBar();
        return null;
    }

    try {
        const { data, error } = await client
            .from("user_profiles")
            .select("user_id,username,avatar_url,updated_at")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) throw error;

        myRotationsState.profile = data || await upsertMyProfile({ username: getFallbackUsername() });
        setMyProfileStatus("");
    } catch (error) {
        console.error("Account profile could not be loaded:", error);
        myRotationsState.profile = {
            user_id: userId,
            username: getFallbackUsername(),
            avatar_url: myRotationsState.session?.user?.user_metadata?.avatar_url || ""
        };
        setMyProfileStatus("Profile could not be loaded. Run the latest supabase/user_rotations.sql.", "is-error");
    }

    renderMyProfile();
    updateAccountBar();
    return myRotationsState.profile;
}

async function refreshMySession(loadRotations = false) {
    const client = getMySupabaseClient();
    if (!client) {
        myRotationsState.session = null;
        setMyAuthStatus("Supabase is not available right now.", "is-error");
        renderMyRotations();
        return;
    }

    try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;

        myRotationsState.session = data?.session || null;
        if (!myRotationsState.session) {
            myRotationsState.profile = null;
        }
        setMyAuthStatus("");

        if (myRotationsState.session) {
            await fetchMyProfile();
            if (loadRotations) {
                await fetchMyRotations();
                return;
            }
        }
    } catch (error) {
        console.error("Account session could not be checked:", error);
        setMyAuthStatus("Account session could not be checked.", "is-error");
    }

    renderMyRotations();
}

async function fetchMyRotations() {
    const client = getMySupabaseClient();
    if (!client || !myRotationsState.session) return;

    myRotationsState.loading = true;
    renderMyRotationList();

    try {
        const { data, error } = await client
            .from("user_rotations")
            .select("id,title,description,share_code,setup_version,team_operator_ids,rotation_skill_ids,element_types,operator_classes,payload,submitted_for_review_at,created_at,updated_at")
            .eq("game", "arknights_endfield")
            .order("updated_at", { ascending: false });

        if (error) throw error;

        myRotationsState.rotations = Array.isArray(data) ? data : [];
        setMyListStatus("");
    } catch (error) {
        console.error("Private rotations could not be loaded:", error);
        myRotationsState.rotations = [];
        setMyListStatus("Your rotations could not be loaded. Run supabase/user_rotations.sql and try again.", "is-error");
    } finally {
        myRotationsState.loading = false;
        renderMyRotationList();
    }
}

async function signInMyAccount(event) {
    event.preventDefault();
    const client = getMySupabaseClient();
    if (!client) {
        setMyAuthStatus("Supabase is not available right now.", "is-error");
        return;
    }

    const email = document.getElementById("myRotationsEmailInput")?.value.trim() || "";
    const password = document.getElementById("myRotationsPasswordInput")?.value || "";
    const button = document.getElementById("myRotationsSignInButton");

    if (button) {
        button.disabled = true;
        button.textContent = "Signing in";
    }
    setMyAuthStatus("Signing in...");

    try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const passwordInput = document.getElementById("myRotationsPasswordInput");
        if (passwordInput) passwordInput.value = "";
        await refreshMySession(false);
        closeMyRotationsModal();
    } catch (error) {
        console.error("Account sign in failed:", error);
        setMyAuthStatus(getFriendlyMyAccountError(error, "Sign in failed. Check the email and password."), "is-error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Sign In";
        }
    }
}

async function sendMyPasswordReset() {
    const client = getMySupabaseClient();
    if (!client) {
        setMyAuthStatus("Supabase is not available right now.", "is-error");
        return;
    }

    const email = document.getElementById("myRotationsEmailInput")?.value.trim() || "";
    const button = document.getElementById("myRotationsForgotPasswordButton");
    if (!email) {
        setMyAuthStatus("Enter your email first, then press Forgot password.", "is-error");
        return;
    }

    myRotationsState.passwordResetSending = true;
    if (button) {
        button.disabled = true;
        button.textContent = "Sending";
    }
    setMyAuthStatus("Sending password reset email...");

    try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: getAuthRedirectUrl()
        });
        if (error) throw error;

        setMyAuthStatus("Password reset email sent. Open the link in your email.", "is-success");
    } catch (error) {
        console.error("Password reset email failed:", error);
        setMyAuthStatus(getFriendlyMyAccountError(error, "Password reset email could not be sent."), "is-error");
    } finally {
        myRotationsState.passwordResetSending = false;
        if (button) {
            button.disabled = false;
            button.textContent = "Forgot password?";
        }
    }
}

async function registerMyAccount() {
    const client = getMySupabaseClient();
    if (!client) {
        setMyAuthStatus("Supabase is not available right now.", "is-error");
        return;
    }

    const email = document.getElementById("myRotationsEmailInput")?.value.trim() || "";
    const username = sanitizeUsername(document.getElementById("myRotationsUsernameInput")?.value || "");
    const password = document.getElementById("myRotationsPasswordInput")?.value || "";
    const button = document.getElementById("myRotationsRegisterButton");

    if (!isValidUsername(username)) {
        setMyAuthStatus("Username must be 3-24 characters and use only letters, numbers, or underscore.", "is-error");
        return;
    }

    if (!email || !password) {
        setMyAuthStatus("Enter an email and password first.", "is-error");
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Creating";
    }
    setMyAuthStatus("Creating account...");

    try {
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username
                }
            }
        });
        if (error) throw error;

        if (data?.session) {
            myRotationsState.session = data.session;
            await upsertMyProfile({ username });
            setMyAuthStatus("Account created.", "is-success");
            await refreshMySession(false);
            closeMyRotationsModal();
            return;
        }

        setMyAuthStatus("Account created. Check your email to confirm it, then sign in.", "is-success");
    } catch (error) {
        console.error("Account registration failed:", error);
        setMyAuthStatus(getFriendlyMyAccountError(error, "Account could not be created."), "is-error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Create Account";
        }
    }
}

function handleMyRegisterButton() {
    if (myRotationsState.authMode !== "create") {
        setMyAuthMode("create");
        window.setTimeout(() => document.getElementById("myRotationsUsernameInput")?.focus(), 0);
        return;
    }

    registerMyAccount();
}

function handleMyAuthFormSubmit(event) {
    if (myRotationsState.authMode === "create") {
        event.preventDefault();
        registerMyAccount();
        return;
    }

    signInMyAccount(event);
}

function handleMySignInButtonClick() {
    if (myRotationsState.authMode !== "signIn") {
        setMyAuthMode("signIn");
    }
}

async function uploadMyAvatar(file) {
    const client = getMySupabaseClient();
    const userId = myRotationsState.session?.user?.id;
    if (!client || !userId || !file) return "";

    if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file.");
    }

    if (file.size > MAX_AVATAR_BYTES) {
        throw new Error("Avatar image can be up to 2 MB.");
    }

    const extension = (file.name.split(".").pop() || "webp").toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
    const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await client.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false
        });

    if (uploadError) throw uploadError;

    const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);
    return data?.publicUrl || "";
}

function getMyAvatarStoragePath(avatarUrl) {
    const url = String(avatarUrl || "").trim();
    if (!url) return "";

    try {
        const parsedUrl = new URL(url);
        const decodedPath = decodeURIComponent(parsedUrl.pathname);
        const marker = `/object/public/${AVATAR_BUCKET}/`;
        const markerIndex = decodedPath.indexOf(marker);
        return markerIndex >= 0 ? decodedPath.slice(markerIndex + marker.length) : "";
    } catch (_error) {
        const marker = `/object/public/${AVATAR_BUCKET}/`;
        const markerIndex = url.indexOf(marker);
        return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : "";
    }
}

async function deleteMyStoredAvatar(avatarUrl) {
    const client = getMySupabaseClient();
    const storagePath = getMyAvatarStoragePath(avatarUrl);
    if (!client || !storagePath) return;

    try {
        await client.storage.from(AVATAR_BUCKET).remove([storagePath]);
    } catch (error) {
        console.warn("Old avatar could not be deleted:", error);
    }
}

function markMyAvatarForRemoval() {
    myRotationsState.avatarRemovalRequested = true;
    const avatarInput = document.getElementById("myProfileAvatarInput");
    if (avatarInput) avatarInput.value = "";
    setMyProfileStatus("Avatar will be removed when you save.", "is-success");
    renderMyProfile();
}

async function saveMyProfile(event) {
    event.preventDefault();
    const client = getMySupabaseClient();
    if (!client || !myRotationsState.session) {
        setMyProfileStatus("Sign in before editing your account.", "is-error");
        return;
    }

    const username = sanitizeUsername(document.getElementById("myProfileUsernameInput")?.value || "");
    const avatarInput = document.getElementById("myProfileAvatarInput");
    const avatarFile = avatarInput?.files?.[0] || null;
    const previousAvatarUrl = myRotationsState.profile?.avatar_url || "";

    if (!isValidUsername(username)) {
        setMyProfileStatus("Username must be 3-24 characters and use only letters, numbers, or underscore.", "is-error");
        return;
    }

    myRotationsState.profileSaving = true;
    renderMyProfile();
    setMyProfileStatus("Saving account...");

    try {
        const avatarUrl = myRotationsState.avatarRemovalRequested
            ? ""
            : avatarFile ? await uploadMyAvatar(avatarFile) : previousAvatarUrl;
        const profile = await upsertMyProfile({ username, avatarUrl });

        await client.auth.updateUser({
            data: {
                username: profile.username,
                avatar_url: profile.avatar_url || ""
            }
        });

        if ((myRotationsState.avatarRemovalRequested || avatarFile) && previousAvatarUrl && previousAvatarUrl !== avatarUrl) {
            await deleteMyStoredAvatar(previousAvatarUrl);
        }

        if (avatarInput) avatarInput.value = "";
        myRotationsState.avatarRemovalRequested = false;
        setMyProfileStatus("Account saved.", "is-success");
    } catch (error) {
        console.error("Account profile save failed:", error);
        setMyProfileStatus(getFriendlyMyAccountError(error, "Account could not be saved."), "is-error");
    } finally {
        myRotationsState.profileSaving = false;
        renderMyProfile();
        updateAccountBar();
    }
}

async function signOutMyAccount() {
    const client = getMySupabaseClient();
    if (!client) return;

    try {
        await client.auth.signOut();
    } catch (error) {
        console.warn("Account sign out failed:", error);
    }

    myRotationsState.session = null;
    myRotationsState.profile = null;
    myRotationsState.rotations = [];
    myRotationsState.detailRotationId = "";
    myRotationsState.detailEditing = false;
    setMyAuthStatus("");
    setMyListStatus("");
    closeProfileModal();
    renderMyRotations();
    renderMyAuthPanel();
}

async function saveCurrentRotationToMyRotations(values) {
    const client = getMySupabaseClient();
    if (!client || !myRotationsState.session) {
        setMyListStatus("Sign in before saving a rotation.", "is-error");
        throw new Error("Please sign in to save rotations.");
    }

    if (!hasCurrentSavableRotation()) {
        setMyListStatus("Create a rotation before saving it.", "is-error");
        throw new Error("Create a rotation before saving it.");
    }

    const normalizedValues = normalizeMyRotationSaveValues(values);

    if (normalizedValues.title.length < 3) {
        setMyListStatus("Use at least 3 characters for the title.", "is-error");
        throw new Error("Use at least 3 characters for the title.");
    }

    myRotationsState.saving = true;
    setMyListStatus("Saving rotation...");

    try {
        const { data, error } = await client
            .from("user_rotations")
            .insert(buildMyRotationPayload(normalizedValues))
            .select("id")
            .single();

        if (error) throw error;

        if (data?.id) {
            myRotationsState.detailRotationId = String(data.id);
            myRotationsState.detailEditing = false;
        }
        setMyListStatus("Rotation saved.", "is-success");
        await fetchMyRotations();
        return true;
    } catch (error) {
        console.error("Private rotation save failed:", error);
        setMyListStatus("This rotation could not be saved. Check the user_rotations table setup.", "is-error");
        throw error;
    } finally {
        myRotationsState.saving = false;
    }
}

function loadMyRotation(row) {
    if (!row?.share_code || typeof applyBuildShareCode !== "function") {
        setMyListStatus("This saved rotation cannot be loaded.", "is-error");
        return;
    }

    if (hasCurrentSavableRotation()) {
        const shouldLoad = confirm("Load this saved rotation and replace your current setup?");
        if (!shouldLoad) return;
    }

    try {
        applyBuildShareCode(row.share_code);
        setMyListStatus("Rotation loaded.", "is-success");
        closeMyRotationsModal();
    } catch (error) {
        console.error("Private rotation load failed:", error);
        setMyListStatus("This saved rotation could not be loaded.", "is-error");
    }
}

async function runMyRowAction(row, action) {
    const rotationId = String(row?.id || "");
    if (!rotationId || myRotationsState.actionIds.has(rotationId)) return;

    myRotationsState.actionIds.add(rotationId);
    renderMyRotationList();

    try {
        await action();
    } finally {
        myRotationsState.actionIds.delete(rotationId);
        renderMyRotationList();
    }
}

async function updateMyRotationDetails(row, values) {
    const client = getMySupabaseClient();
    const normalizedValues = normalizeMyRotationSaveValues(values);

    if (!client || !myRotationsState.session) {
        setMyListStatus("Sign in before editing a rotation.", "is-error");
        return;
    }

    if (normalizedValues.title.length < 3) {
        setMyListStatus("Use at least 3 characters for the title.", "is-error");
        return;
    }

    await runMyRowAction(row, async () => {
        setMyListStatus("Saving changes...");
        const { error } = await client
            .from("user_rotations")
            .update({
                title: normalizedValues.title,
                description: normalizedValues.description
            })
            .eq("id", row.id);

        if (error) throw error;

        myRotationsState.detailEditing = false;
        myRotationsState.detailRotationId = String(row.id);
        setMyListStatus("Rotation updated.", "is-success");
        await fetchMyRotations();
    }).catch(error => {
        console.error("Private rotation update failed:", error);
        setMyListStatus("This rotation could not be updated.", "is-error");
    });
}

async function overwriteMyRotationWithCurrent(row) {
    const client = getMySupabaseClient();
    if (!client || !myRotationsState.session) {
        setMyListStatus("Sign in before editing a rotation.", "is-error");
        return;
    }

    if (!hasCurrentSavableRotation()) {
        setMyListStatus("Create a rotation before updating this save.", "is-error");
        return;
    }

    const shouldOverwrite = confirm(`Overwrite "${row.title || "this rotation"}" with your current team and rotation?`);
    if (!shouldOverwrite) return;

    await runMyRowAction(row, async () => {
        setMyListStatus("Updating saved rotation...");
        const payload = buildMyRotationPayload({
            title: row.title || "Untitled rotation",
            description: row.description || ""
        });

        const { error } = await client
            .from("user_rotations")
            .update(payload)
            .eq("id", row.id);

        if (error) throw error;

        myRotationsState.detailEditing = false;
        myRotationsState.detailRotationId = String(row.id);
        setMyListStatus("Saved rotation updated with the current build.", "is-success");
        await fetchMyRotations();
    }).catch(error => {
        console.error("Private rotation overwrite failed:", error);
        setMyListStatus("This rotation could not be updated with the current build.", "is-error");
    });
}

async function submitMyRotationForReview(row) {
    if (row.submitted_for_review_at) return;

    const shouldSubmit = confirm("Submit this saved rotation to Community review?");
    if (!shouldSubmit) return;

    await runMyRowAction(row, async () => {
        const client = getMySupabaseClient();
        if (!client || !myRotationsState.session) return;
        let persistence = null;
        if (typeof createBuildPersistencePayloadFromShareCode === "function") {
            try {
                persistence = createBuildPersistencePayloadFromShareCode(row.share_code, {
                    timestampKey: "submittedAt"
                });
            } catch (error) {
                console.warn("Saved rotation payload could not be rebuilt from share code:", error);
            }
        }

        const communityPayload = {
            game: "arknights_endfield",
            title: row.title,
            description: row.description || "",
            author_name: getMyAuthorName(),
            submitted_by: myRotationsState.session.user.id,
            share_code: row.share_code,
            setup_version: persistence?.setupVersion || Number(row.setup_version) || 5,
            team_operator_ids: persistence?.teamOperatorIds?.length ? persistence.teamOperatorIds : normalizeMyList(row.team_operator_ids),
            rotation_skill_ids: persistence?.rotationSkillIds?.length ? persistence.rotationSkillIds : normalizeMyList(row.rotation_skill_ids),
            element_types: persistence?.elementTypes?.length ? persistence.elementTypes : normalizeMyList(row.element_types),
            operator_classes: persistence?.operatorClasses?.length ? persistence.operatorClasses : normalizeMyList(row.operator_classes),
            payload: persistence?.payload || row.payload || {}
        };

        const { error: insertError } = await client
            .from("community_rotations")
            .insert(communityPayload);

        if (insertError) throw insertError;

        const submittedAt = new Date().toISOString();
        const { error: updateError } = await client
            .from("user_rotations")
            .update({ submitted_for_review_at: submittedAt })
            .eq("id", row.id);

        if (updateError) throw updateError;

        row.submitted_for_review_at = submittedAt;
        setMyListStatus("Rotation submitted for Community review.", "is-success");
        await fetchMyRotations();
    }).catch(error => {
        console.error("Private rotation submit failed:", error);
        setMyListStatus("This rotation could not be submitted for review.", "is-error");
    });
}

async function deleteMyRotation(row) {
    const shouldDelete = confirm(`Delete "${row.title || "this rotation"}" from My Rotations?`);
    if (!shouldDelete) return;

    await runMyRowAction(row, async () => {
        const client = getMySupabaseClient();
        if (!client || !myRotationsState.session) return;

        const { error } = await client
            .from("user_rotations")
            .delete()
            .eq("id", row.id);

        if (error) throw error;

        if (String(myRotationsState.detailRotationId) === String(row.id)) {
            myRotationsState.detailRotationId = "";
            myRotationsState.detailEditing = false;
        }
        setMyListStatus("Rotation deleted.", "is-success");
        await fetchMyRotations();
    }).catch(error => {
        console.error("Private rotation delete failed:", error);
        setMyListStatus("This rotation could not be deleted.", "is-error");
    });
}

function openMyRotationsModal(options = {}) {
    const modal = document.getElementById("myRotationsModal");
    if (!modal) return;

    setMyAuthMode(options.mode || "signIn");
    if (myRotationsState.session) renderMyAuthPanel();
    modal.classList.add("open");
    refreshMySession(true);

    window.setTimeout(() => {
        const usernameInput = document.getElementById("myRotationsUsernameInput");
        const emailInput = document.getElementById("myRotationsEmailInput");
        if (!myRotationsState.session && options.mode === "create" && usernameInput) {
            usernameInput.focus();
            return;
        }
        if (!myRotationsState.session && emailInput) emailInput.focus();
    }, 0);
}

function closeMyRotationsModal() {
    const modal = document.getElementById("myRotationsModal");
    if (!modal) return;

    modal.classList.remove("open");
}

function setMyPasswordResetStatus(text, className = "") {
    const status = document.getElementById("myPasswordResetStatus");
    if (!status) return;

    status.className = `my-rotations-status${className ? ` ${className}` : ""}`;
    status.textContent = text;
}

function openPasswordResetModal() {
    const modal = document.getElementById("passwordResetModal");
    if (!modal) return;

    const passwordInput = document.getElementById("myPasswordResetInput");
    const confirmInput = document.getElementById("myPasswordResetConfirmInput");
    if (passwordInput) passwordInput.value = "";
    if (confirmInput) confirmInput.value = "";
    setMyPasswordResetStatus("");
    modal.classList.add("open");
    window.setTimeout(() => passwordInput?.focus(), 0);
}

function closePasswordResetModal() {
    const modal = document.getElementById("passwordResetModal");
    if (!modal) return;

    modal.classList.remove("open");
}

async function saveMyNewPassword(event) {
    event.preventDefault();
    const client = getMySupabaseClient();
    const passwordInput = document.getElementById("myPasswordResetInput");
    const confirmInput = document.getElementById("myPasswordResetConfirmInput");
    const saveButton = document.getElementById("myPasswordResetSaveButton");
    const password = passwordInput?.value || "";
    const confirmation = confirmInput?.value || "";

    if (!client) {
        setMyPasswordResetStatus("Supabase is not available right now.", "is-error");
        return;
    }

    if (password.length < 6) {
        setMyPasswordResetStatus("Use at least 6 characters.", "is-error");
        return;
    }

    if (password !== confirmation) {
        setMyPasswordResetStatus("Passwords do not match.", "is-error");
        return;
    }

    myRotationsState.passwordUpdating = true;
    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving";
    }
    setMyPasswordResetStatus("Saving new password...");

    try {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;

        if (passwordInput) passwordInput.value = "";
        if (confirmInput) confirmInput.value = "";
        setMyPasswordResetStatus("Password updated.", "is-success");
        window.setTimeout(closePasswordResetModal, 800);
    } catch (error) {
        console.error("Password update failed:", error);
        setMyPasswordResetStatus(getFriendlyMyAccountError(error, "Password could not be updated."), "is-error");
    } finally {
        myRotationsState.passwordUpdating = false;
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Password";
        }
    }
}

function openProfileModal() {
    if (!myRotationsState.session) {
        openMyRotationsModal({ mode: "signIn" });
        return;
    }

    const modal = document.getElementById("profileModal");
    if (!modal) return;

    modal.classList.add("open");
    refreshMySession(false);
    renderMyProfile();
}

function closeProfileModal() {
    const modal = document.getElementById("profileModal");
    if (!modal) return;

    myRotationsState.avatarRemovalRequested = false;
    const avatarInput = document.getElementById("myProfileAvatarInput");
    const avatarPreview = document.getElementById("myProfileAvatarPreview");
    if (avatarInput) avatarInput.value = "";
    clearMyAvatarObjectUrl(avatarPreview);
    modal.classList.remove("open");
    renderMyProfile();
}

function initMyRotations() {
    if (myRotationsState.initialized) return;
    myRotationsState.initialized = true;

    const openButton = document.getElementById("openMyRotationsBtn");
    const openProfileButton = document.getElementById("openProfileBtn");
    const accountSignInButton = document.getElementById("accountSignInBtn");
    const accountCreateButton = document.getElementById("accountCreateBtn");
    const accountSignOutButton = document.getElementById("accountSignOutBtn");
    const closeButton = document.getElementById("closeMyRotationsModalBtn");
    const closeProfileButton = document.getElementById("closeProfileModalBtn");
    const closePasswordResetButton = document.getElementById("closePasswordResetModalBtn");
    const authForm = document.getElementById("myRotationsAuthForm");
    const registerButton = document.getElementById("myRotationsRegisterButton");
    const signInButton = document.getElementById("myRotationsSignInButton");
    const forgotPasswordButton = document.getElementById("myRotationsForgotPasswordButton");
    const profileForm = document.getElementById("myProfileForm");
    const avatarInput = document.getElementById("myProfileAvatarInput");
    const removeAvatarButton = document.getElementById("myProfileRemoveAvatarButton");
    const passwordResetForm = document.getElementById("myPasswordResetForm");
    const refreshButton = document.getElementById("myRotationsRefreshButton");
    const signOutButton = document.getElementById("myRotationsSignOutButton");
    const modal = document.getElementById("myRotationsModal");
    const profileModal = document.getElementById("profileModal");
    const passwordResetModal = document.getElementById("passwordResetModal");

    if (openButton) openButton.addEventListener("click", () => openMyRotationsModal());
    if (openProfileButton) openProfileButton.addEventListener("click", openProfileModal);
    if (accountSignInButton) accountSignInButton.addEventListener("click", () => openMyRotationsModal({ mode: "signIn" }));
    if (accountCreateButton) accountCreateButton.addEventListener("click", () => openMyRotationsModal({ mode: "create" }));
    if (accountSignOutButton) accountSignOutButton.addEventListener("click", signOutMyAccount);
    if (closeButton) closeButton.addEventListener("click", closeMyRotationsModal);
    if (closeProfileButton) closeProfileButton.addEventListener("click", closeProfileModal);
    if (closePasswordResetButton) closePasswordResetButton.addEventListener("click", closePasswordResetModal);
    if (authForm) authForm.addEventListener("submit", handleMyAuthFormSubmit);
    if (registerButton) registerButton.addEventListener("click", handleMyRegisterButton);
    if (signInButton) signInButton.addEventListener("click", handleMySignInButtonClick);
    if (forgotPasswordButton) forgotPasswordButton.addEventListener("click", sendMyPasswordReset);
    if (profileForm) profileForm.addEventListener("submit", saveMyProfile);
    if (removeAvatarButton) removeAvatarButton.addEventListener("click", markMyAvatarForRemoval);
    if (passwordResetForm) passwordResetForm.addEventListener("submit", saveMyNewPassword);
    if (avatarInput) {
        avatarInput.addEventListener("change", () => {
            const file = avatarInput.files?.[0];
            const preview = document.getElementById("myProfileAvatarPreview");
            if (!file || !preview) return;
            myRotationsState.avatarRemovalRequested = false;
            clearMyAvatarObjectUrl(preview);
            preview.hidden = false;
            const objectUrl = URL.createObjectURL(file);
            preview.dataset.objectUrl = objectUrl;
            preview.src = objectUrl;
            setMyProfileStatus("Avatar selected. Save the account to apply it.");
        });
    }
    if (refreshButton) refreshButton.addEventListener("click", fetchMyRotations);
    if (signOutButton) signOutButton.addEventListener("click", signOutMyAccount);
    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeMyRotationsModal();
        });
    }
    if (profileModal) {
        profileModal.addEventListener("click", event => {
            if (event.target === profileModal) closeProfileModal();
        });
    }
    if (passwordResetModal) {
        passwordResetModal.addEventListener("click", event => {
            if (event.target === passwordResetModal) closePasswordResetModal();
        });
    }

    document.addEventListener("keydown", event => {
        const modalElement = document.getElementById("myRotationsModal");
        const profileModalElement = document.getElementById("profileModal");
        const passwordResetModalElement = document.getElementById("passwordResetModal");
        if (event.key === "Escape" && modalElement?.classList.contains("open")) {
            closeMyRotationsModal();
        }
        if (event.key === "Escape" && profileModalElement?.classList.contains("open")) {
            closeProfileModal();
        }
        if (event.key === "Escape" && passwordResetModalElement?.classList.contains("open")) {
            closePasswordResetModal();
        }
    });

    const client = getMySupabaseClient();
    if (client?.auth?.onAuthStateChange) {
        client.auth.onAuthStateChange((event, session) => {
            myRotationsState.session = session || null;
            if (!myRotationsState.session) {
                myRotationsState.profile = null;
                myRotationsState.rotations = [];
                myRotationsState.detailRotationId = "";
                myRotationsState.detailEditing = false;
                closeProfileModal();
                closePasswordResetModal();
                renderMyRotations();
                renderMyAuthPanel();
                return;
            }
            if (event === "PASSWORD_RECOVERY") {
                closeMyRotationsModal();
                fetchMyProfile().finally(() => {
                    renderMyAuthPanel();
                    openPasswordResetModal();
                });
                return;
            }
            fetchMyProfile().finally(() => {
                renderMyRotations();
                renderMyAuthPanel();
            });
        });
    }

    refreshMySession(false);
    updateAccountBar();
}

function isMyAccountSignedIn() {
    return Boolean(myRotationsState.session);
}

function getMyAccountProfile() {
    return myRotationsState.profile || null;
}

function getMyAccountUserId() {
    return myRotationsState.session?.user?.id || "";
}

window.isMyAccountSignedIn = isMyAccountSignedIn;
window.getMyAccountProfile = getMyAccountProfile;
window.getMyAccountUserId = getMyAccountUserId;
window.openMyRotationsModal = openMyRotationsModal;
window.saveCurrentRotationToMyRotations = saveCurrentRotationToMyRotations;
window.initMyRotations = initMyRotations;
