const myRotationsState = {
    session: null,
    rotations: [],
    loading: false,
    saving: false,
    actionIds: new Set(),
    initialized: false,
    authStatus: "",
    authStatusClass: "",
    listStatus: "",
    listStatusClass: ""
};

const MY_AUTH_MODES = {
    signIn: {
        title: "Sign in to My Rotations",
        intro: "Sign in to save private rotations, load them later, and submit them for Community review.",
        status: ""
    },
    create: {
        title: "Create your account",
        intro: "Create an account with email and password to start saving private rotations.",
        status: "Enter an email and password, then press Create Account."
    }
};

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
    const email = String(myRotationsState.session?.user?.email || "").trim();
    if (!email) return "Anonymous";
    return email.split("@")[0].slice(0, 40) || "Anonymous";
}

function hasCurrentSavableRotation() {
    return typeof hasCreatedRotation === "function"
        ? hasCreatedRotation()
        : getCurrentMyRotationEntries().length > 0;
}

function buildMyRotationPayload(values) {
    const teamIds = getCurrentMyTeamIds();
    const rotationEntries = getCurrentMyRotationEntries();
    const rotationSkillIds = rotationEntries
        .map(entry => Number(entry.id))
        .filter(Number.isFinite);
    const teamOperators = teamIds.map(getMyOperatorById).filter(Boolean);
    const rotationSkills = getCurrentMyRotationSkills();
    const shareCode = createBuildShareCode();

    return {
        game: "arknights_endfield",
        title: values.title,
        description: values.description,
        share_code: shareCode,
        setup_version: 2,
        team_operator_ids: teamIds,
        rotation_skill_ids: rotationSkillIds,
        element_types: uniqueMyLabels([
            ...teamOperators.map(operator => operator.elementType),
            ...rotationSkills.map(skill => skill.elementType)
        ]),
        operator_classes: uniqueMyLabels(teamOperators.map(operator => operator.operatorClass)),
        payload: typeof parseBuildShareCode === "function" ? parseBuildShareCode(shareCode) : {}
    };
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

function updateMySaveAvailability() {
    const saveButton = document.getElementById("myRotationSaveButton");
    if (!saveButton) return;

    saveButton.disabled = !myRotationsState.session || myRotationsState.saving || !hasCurrentSavableRotation();
    saveButton.textContent = myRotationsState.saving ? "Saving" : "Save Current Rotation";
}

function renderMyAuthPanel() {
    const authPanel = document.getElementById("myRotationsAuthPanel");
    const contentPanel = document.getElementById("myRotationsContentPanel");
    const emailLabel = document.getElementById("myRotationsUserEmail");
    const isSignedIn = Boolean(myRotationsState.session);

    if (authPanel) authPanel.hidden = isSignedIn;
    if (contentPanel) contentPanel.hidden = !isSignedIn;
    if (emailLabel) emailLabel.textContent = myRotationsState.session?.user?.email || "Signed in";

    renderMyAuthStatus();
    renderMyListStatus();
    updateMySaveAvailability();
    updateAccountBar();
}

function updateAccountBar() {
    const signInButton = document.getElementById("accountSignInBtn");
    const createButton = document.getElementById("accountCreateBtn");
    const signOutButton = document.getElementById("accountSignOutBtn");
    const userLabel = document.getElementById("accountUserLabel");
    const isSignedIn = Boolean(myRotationsState.session);
    const email = myRotationsState.session?.user?.email || "";

    if (signInButton) signInButton.hidden = isSignedIn;
    if (createButton) createButton.hidden = isSignedIn;
    if (signOutButton) signOutButton.hidden = !isSignedIn;
    if (userLabel) {
        userLabel.hidden = !isSignedIn;
        userLabel.textContent = email;
        userLabel.title = email;
    }
}

function setMyAuthMode(mode = "signIn") {
    const config = MY_AUTH_MODES[mode] || MY_AUTH_MODES.signIn;
    const title = document.getElementById("myRotationsTitle");
    const intro = document.getElementById("myRotationsIntro");
    const registerButton = document.getElementById("myRotationsRegisterButton");
    const signInButton = document.getElementById("myRotationsSignInButton");

    if (title) title.textContent = config.title;
    if (intro) intro.textContent = config.intro;
    if (registerButton) registerButton.classList.toggle("my-primary-btn", mode === "create");
    if (registerButton) registerButton.classList.toggle("my-secondary-btn", mode !== "create");
    if (signInButton) signInButton.classList.toggle("my-primary-btn", mode !== "create");
    if (signInButton) signInButton.classList.toggle("my-secondary-btn", mode === "create");

    if (!myRotationsState.session) {
        setMyAuthStatus(config.status);
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
    preview.textContent = `${normalizeMyList(row.rotation_skill_ids).length} skills`;
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

function createMyActionButton(label, className, action, disabled = false) {
    const button = document.createElement("button");
    button.className = `my-action-btn${className ? ` ${className}` : ""}`;
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener("click", action);
    return button;
}

function createMyRotationCard(row) {
    const card = document.createElement("article");
    card.className = "my-rotation-card";

    const title = createMyTextElement("h3", "my-rotation-title", row.title || "Untitled rotation");
    const updated = formatMyDate(row.updated_at || row.created_at);
    const skillCount = normalizeMyList(row.rotation_skill_ids).length;
    const statusText = row.submitted_for_review_at
        ? `Submitted ${formatMyDate(row.submitted_for_review_at)}`
        : "Private";
    const meta = createMyTextElement(
        "div",
        "my-rotation-meta",
        [`Updated ${updated || "-"}`, `${skillCount} skill${skillCount === 1 ? "" : "s"}`, statusText].join(" - ")
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

    card.append(title, meta, createMyTeamPreview(row), createMyRotationPreview(row), description, createMyChipRow(row), actions);
    return card;
}

function renderMyRotationList() {
    const list = document.getElementById("myRotationsList");
    if (!list) return;

    list.replaceChildren();
    updateMySaveAvailability();

    if (!myRotationsState.session) {
        setMyListStatus("");
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
        return;
    }

    if (!myRotationsState.rotations.length) {
        setMyListStatus("No saved rotations yet.");
        const card = document.createElement("div");
        card.className = "my-state-card";
        card.appendChild(createMyTextElement("span", "", "Save your current build to see it here."));
        list.appendChild(card);
        return;
    }

    setMyListStatus(`${myRotationsState.rotations.length} saved rotation${myRotationsState.rotations.length === 1 ? "" : "s"}.`);
    myRotationsState.rotations.forEach(row => list.appendChild(createMyRotationCard(row)));
}

function renderMyRotations() {
    renderMyAuthPanel();
    renderMyRotationList();
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
        setMyAuthStatus("");

        if (myRotationsState.session && loadRotations) {
            await fetchMyRotations();
            return;
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
            .select("id,title,description,share_code,team_operator_ids,rotation_skill_ids,element_types,operator_classes,submitted_for_review_at,created_at,updated_at")
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
        await refreshMySession(true);
    } catch (error) {
        console.error("Account sign in failed:", error);
        setMyAuthStatus("Sign in failed. Check the email and password.", "is-error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Sign In";
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
    const password = document.getElementById("myRotationsPasswordInput")?.value || "";
    const button = document.getElementById("myRotationsRegisterButton");

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
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;

        if (data?.session) {
            setMyAuthStatus("Account created.", "is-success");
            await refreshMySession(true);
            return;
        }

        setMyAuthStatus("Account created. Check your email to confirm it, then sign in.", "is-success");
    } catch (error) {
        console.error("Account registration failed:", error);
        setMyAuthStatus(error.message || "Account could not be created.", "is-error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Create Account";
        }
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
    myRotationsState.rotations = [];
    setMyAuthStatus("");
    setMyListStatus("");
    renderMyRotations();
}

async function saveCurrentMyRotation(event) {
    event.preventDefault();
    const client = getMySupabaseClient();
    if (!client || !myRotationsState.session) {
        setMyListStatus("Sign in before saving a rotation.", "is-error");
        return;
    }

    if (!hasCurrentSavableRotation()) {
        setMyListStatus("Create a rotation before saving it.", "is-error");
        return;
    }

    const titleInput = document.getElementById("myRotationTitleInput");
    const descriptionInput = document.getElementById("myRotationDescriptionInput");
    const values = {
        title: String(titleInput?.value || "").trim(),
        description: String(descriptionInput?.value || "").trim()
    };

    if (values.title.length < 3) {
        setMyListStatus("Use at least 3 characters for the title.", "is-error");
        return;
    }

    myRotationsState.saving = true;
    updateMySaveAvailability();
    setMyListStatus("Saving rotation...");

    try {
        const { error } = await client
            .from("user_rotations")
            .insert(buildMyRotationPayload(values));

        if (error) throw error;

        if (titleInput) titleInput.value = "";
        if (descriptionInput) descriptionInput.value = "";
        setMyListStatus("Rotation saved.", "is-success");
        await fetchMyRotations();
    } catch (error) {
        console.error("Private rotation save failed:", error);
        setMyListStatus("This rotation could not be saved. Check the user_rotations table setup.", "is-error");
    } finally {
        myRotationsState.saving = false;
        updateMySaveAvailability();
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

async function submitMyRotationForReview(row) {
    if (row.submitted_for_review_at) return;

    const shouldSubmit = confirm("Submit this saved rotation to Community review?");
    if (!shouldSubmit) return;

    await runMyRowAction(row, async () => {
        const client = getMySupabaseClient();
        if (!client || !myRotationsState.session) return;

        const communityPayload = {
            game: "arknights_endfield",
            title: row.title,
            description: row.description || "",
            author_name: getMyAuthorName(),
            share_code: row.share_code,
            setup_version: 2,
            team_operator_ids: normalizeMyList(row.team_operator_ids),
            rotation_skill_ids: normalizeMyList(row.rotation_skill_ids),
            element_types: normalizeMyList(row.element_types),
            operator_classes: normalizeMyList(row.operator_classes),
            payload: {}
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
    modal.classList.add("open");
    refreshMySession(true);

    window.setTimeout(() => {
        const emailInput = document.getElementById("myRotationsEmailInput");
        if (!myRotationsState.session && emailInput) emailInput.focus();
    }, 0);
}

function closeMyRotationsModal() {
    const modal = document.getElementById("myRotationsModal");
    if (!modal) return;

    modal.classList.remove("open");
}

function initMyRotations() {
    if (myRotationsState.initialized) return;
    myRotationsState.initialized = true;

    const openButton = document.getElementById("openMyRotationsBtn");
    const accountSignInButton = document.getElementById("accountSignInBtn");
    const accountCreateButton = document.getElementById("accountCreateBtn");
    const accountSignOutButton = document.getElementById("accountSignOutBtn");
    const closeButton = document.getElementById("closeMyRotationsModalBtn");
    const authForm = document.getElementById("myRotationsAuthForm");
    const registerButton = document.getElementById("myRotationsRegisterButton");
    const saveForm = document.getElementById("myRotationSaveForm");
    const refreshButton = document.getElementById("myRotationsRefreshButton");
    const signOutButton = document.getElementById("myRotationsSignOutButton");
    const modal = document.getElementById("myRotationsModal");

    if (openButton) openButton.addEventListener("click", () => openMyRotationsModal());
    if (accountSignInButton) accountSignInButton.addEventListener("click", () => openMyRotationsModal({ mode: "signIn" }));
    if (accountCreateButton) accountCreateButton.addEventListener("click", () => openMyRotationsModal({ mode: "create" }));
    if (accountSignOutButton) accountSignOutButton.addEventListener("click", signOutMyAccount);
    if (closeButton) closeButton.addEventListener("click", closeMyRotationsModal);
    if (authForm) authForm.addEventListener("submit", signInMyAccount);
    if (registerButton) registerButton.addEventListener("click", registerMyAccount);
    if (saveForm) saveForm.addEventListener("submit", saveCurrentMyRotation);
    if (refreshButton) refreshButton.addEventListener("click", fetchMyRotations);
    if (signOutButton) signOutButton.addEventListener("click", signOutMyAccount);
    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeMyRotationsModal();
        });
    }

    document.addEventListener("keydown", event => {
        const modalElement = document.getElementById("myRotationsModal");
        if (event.key === "Escape" && modalElement?.classList.contains("open")) {
            closeMyRotationsModal();
        }
    });

    const client = getMySupabaseClient();
    if (client?.auth?.onAuthStateChange) {
        client.auth.onAuthStateChange((_event, session) => {
            myRotationsState.session = session || null;
            if (!myRotationsState.session) {
                myRotationsState.rotations = [];
            }
            renderMyRotations();
        });
    }

    refreshMySession(false);
    updateAccountBar();
}

window.initMyRotations = initMyRotations;
