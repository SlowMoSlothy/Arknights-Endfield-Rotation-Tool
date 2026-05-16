const ADMIN_REVIEW_TABS = [
    {
        id: "pending",
        label: "Pending",
        loadingTitle: "Loading pending submissions",
        loadingMessage: "Fetching rotations waiting for review.",
        emptyTitle: "No pending rotations",
        emptyMessage: "Everything submitted so far has already been reviewed."
    },
    {
        id: "approved",
        label: "Approved",
        loadingTitle: "Loading approved rotations",
        loadingMessage: "Fetching public Community rotations.",
        emptyTitle: "No approved rotations",
        emptyMessage: "Approved rotations will appear here after review."
    },
    {
        id: "rejected",
        label: "Rejected",
        loadingTitle: "Loading rejected rotations",
        loadingMessage: "Fetching hidden or rejected submissions.",
        emptyTitle: "No rejected rotations",
        emptyMessage: "Rejected submissions and hidden rotations will appear here."
    }
];

const adminPanelState = {
    session: null,
    isAdmin: false,
    rotations: [],
    activeTab: "pending",
    loaded: false,
    loading: false,
    checkingAuth: false,
    reviewError: "",
    detailRotationId: "",
    actionIds: new Set(),
    authStatus: "",
    authStatusClass: "",
    reviewStatus: "",
    reviewStatusClass: "",
    initialized: false
};

function getAdminSupabaseClient() {
    return typeof supabaseClient !== "undefined" ? supabaseClient : null;
}

function createAdminTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    return element;
}

function getActiveAdminTab() {
    return ADMIN_REVIEW_TABS.find(tab => tab.id === adminPanelState.activeTab) || ADMIN_REVIEW_TABS[0];
}

function getAdminReviewState(row) {
    if (row?.is_approved === true && row?.is_hidden !== true) return "approved";
    if (row?.is_hidden === true) return "rejected";
    return "pending";
}

function formatAdminReviewState(row) {
    const state = getAdminReviewState(row);
    if (state === "approved") return "Approved";
    if (state === "rejected") return "Rejected";
    return "Pending";
}

function setAdminAuthStatus(text, className = "") {
    adminPanelState.authStatus = text;
    adminPanelState.authStatusClass = className;
    renderAdminAuthStatus();
}

function setAdminReviewStatus(text, className = "") {
    adminPanelState.reviewStatus = text;
    adminPanelState.reviewStatusClass = className;
    renderAdminReviewStatus();
}

function renderAdminAuthStatus() {
    const status = document.getElementById("adminLoginStatus");
    if (!status) return;

    status.className = `admin-status${adminPanelState.authStatusClass ? ` ${adminPanelState.authStatusClass}` : ""}`;
    status.textContent = adminPanelState.authStatus;
}

function renderAdminReviewStatus() {
    const status = document.getElementById("adminReviewStatus");
    if (!status) return;

    status.className = `admin-status${adminPanelState.reviewStatusClass ? ` ${adminPanelState.reviewStatusClass}` : ""}`;
    status.textContent = adminPanelState.reviewStatus;
}

function renderAdminReviewTabs() {
    const tabs = document.getElementById("adminReviewTabs");
    if (!tabs) return;

    tabs.replaceChildren();

    ADMIN_REVIEW_TABS.forEach(tab => {
        const button = document.createElement("button");
        const isActive = tab.id === adminPanelState.activeTab;
        button.className = `admin-review-tab${isActive ? " is-active" : ""}`;
        button.type = "button";
        button.setAttribute("role", "tab");
        button.setAttribute("aria-selected", isActive ? "true" : "false");
        button.textContent = tab.label;
        button.addEventListener("click", () => setAdminReviewTab(tab.id));
        tabs.appendChild(button);
    });
}

function normalizeAdminList(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    return [value];
}

function formatAdminDate(value) {
    if (typeof formatCommunityDate === "function") {
        return formatCommunityDate(value);
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit"
    }).format(date);
}

function formatAdminLabel(value) {
    if (typeof formatCommunityLabel === "function") {
        return formatCommunityLabel(value);
    }

    return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, letter => letter.toUpperCase());
}

function getAdminOperatorById(operatorId) {
    const id = Number(operatorId);
    if (!Number.isFinite(id) || typeof operators === "undefined" || !Array.isArray(operators)) return null;
    return operators.find(operator => operator.id === id) || null;
}

function getAdminTeamOperators(row) {
    return normalizeAdminList(row?.team_operator_ids)
        .map(operatorId => getAdminOperatorById(operatorId))
        .filter(Boolean);
}

function createAdminOperatorPlaceholder() {
    const placeholder = document.createElement("span");
    placeholder.className = "admin-operator-placeholder";
    placeholder.textContent = "?";
    return placeholder;
}

function createAdminOperatorAvatar(operator) {
    if (!operator || !operator.icon) return createAdminOperatorPlaceholder();

    const image = document.createElement("img");
    image.className = "admin-operator-avatar";
    image.src = operator.icon;
    image.alt = operator.name || "Operator";
    image.loading = "lazy";
    image.addEventListener("error", () => {
        image.replaceWith(createAdminOperatorPlaceholder());
    }, { once: true });

    return image;
}

function createAdminOperatorMini(operator) {
    const item = document.createElement("span");
    item.className = "admin-operator-mini";
    item.append(
        createAdminOperatorAvatar(operator),
        createAdminTextElement("span", "admin-operator-mini-name", operator?.name || "Operator")
    );
    return item;
}

function createAdminTeamPreview(row) {
    const team = document.createElement("div");
    team.className = "admin-team-preview";

    const operatorsForRow = getAdminTeamOperators(row);
    if (!operatorsForRow.length) {
        team.appendChild(createAdminOperatorPlaceholder());
        return team;
    }

    operatorsForRow.slice(0, 4).forEach(operator => team.appendChild(createAdminOperatorMini(operator)));
    return team;
}

function createAdminRotationPreview(row) {
    if (typeof createCommunityRotationPreview === "function") {
        const preview = createCommunityRotationPreview(row, { limit: 8 });
        preview.classList.add("admin-preview-rotation");
        return preview;
    }

    const preview = document.createElement("div");
    preview.className = "admin-rotation-preview";
    const skillCount = normalizeAdminList(row?.rotation_skill_ids).length;
    preview.textContent = `${skillCount} skill${skillCount === 1 ? "" : "s"} submitted`;
    return preview;
}

function createAdminChipRow(row) {
    const chipRow = document.createElement("div");
    chipRow.className = "admin-chip-row";

    const labels = [
        ...normalizeAdminList(row?.element_types),
        ...normalizeAdminList(row?.operator_classes)
    ].filter(Boolean);

    labels.slice(0, 10).forEach(label => {
        chipRow.appendChild(createAdminTextElement("span", "admin-chip", formatAdminLabel(label)));
    });

    return chipRow;
}

function createAdminReviewNote(row, className = "admin-review-note") {
    const note = String(row?.review_note || "").trim();
    if (!note) return null;

    const element = createAdminTextElement("p", className, note);
    element.prepend(createAdminTextElement("strong", "", "Note: "));
    return element;
}

function createAdminOperatorDetail(operator, index) {
    const item = document.createElement("div");
    item.className = "admin-detail-operator";

    item.appendChild(createAdminOperatorAvatar(operator));

    const copy = document.createElement("div");
    copy.className = "admin-detail-operator-copy";
    copy.appendChild(createAdminTextElement("strong", "", operator?.name || "Operator"));

    const meta = [
        operator?.star ? `${operator.star} star` : "",
        operator?.operatorClass ? formatAdminLabel(operator.operatorClass) : "",
        operator?.elementType ? formatAdminLabel(operator.elementType) : ""
    ].filter(Boolean).join(" - ");

    copy.appendChild(createAdminTextElement("span", "", meta || `Slot ${index + 1}`));
    item.appendChild(copy);
    return item;
}

function createAdminDetailMetaBlock(label, value) {
    const item = document.createElement("div");
    item.className = "admin-detail-meta-item";
    item.append(
        createAdminTextElement("span", "", label),
        createAdminTextElement("strong", "", value || "-")
    );
    return item;
}

function createAdminStateCard({ type = "", title, message, actionLabel = "", action = null, loading = false }) {
    const card = document.createElement("div");
    card.className = `admin-state-card${type ? ` is-${type}` : ""}`;

    if (loading) {
        const loader = document.createElement("span");
        loader.className = "admin-state-loader";
        loader.setAttribute("aria-hidden", "true");
        card.appendChild(loader);
    }

    const content = document.createElement("div");
    content.className = "admin-state-content";
    content.append(
        createAdminTextElement("h3", "admin-state-title", title),
        createAdminTextElement("p", "admin-state-message", message)
    );

    if (actionLabel && typeof action === "function") {
        const button = document.createElement("button");
        button.className = "admin-state-action";
        button.type = "button";
        button.textContent = actionLabel;
        button.addEventListener("click", action);
        content.appendChild(button);
    }

    card.appendChild(content);
    return card;
}

function setAdminListState(list, options) {
    list.replaceChildren(createAdminStateCard(options));
}

function getActiveAdminDetailRow() {
    if (!adminPanelState.detailRotationId) return null;
    return adminPanelState.rotations.find(row => String(row.id) === String(adminPanelState.detailRotationId)) || null;
}

function openAdminDetail(rotationId) {
    adminPanelState.detailRotationId = String(rotationId || "");
    renderAdminDetailPanel();
    renderAdminReviewList();
}

function closeAdminDetail() {
    adminPanelState.detailRotationId = "";
    renderAdminDetailPanel();
    renderAdminReviewList();
}

function renderAdminDetailPanel() {
    const panel = document.getElementById("adminDetailPanel");
    if (!panel) return;

    const row = getActiveAdminDetailRow();
    panel.replaceChildren();

    if (!row) {
        adminPanelState.detailRotationId = "";
        panel.hidden = true;
        return;
    }

    panel.hidden = false;

    const rotationId = String(row.id || "");
    const isBusy = adminPanelState.actionIds.has(rotationId);
    const author = row.author_name ? row.author_name : "Anonymous";
    const skillCount = normalizeAdminList(row.rotation_skill_ids).length;

    const header = document.createElement("div");
    header.className = "admin-detail-header";

    const titleWrap = document.createElement("div");
    titleWrap.append(
        createAdminTextElement("h3", "admin-detail-title", row.title || "Untitled rotation"),
        createAdminTextElement(
            "div",
            "admin-detail-subtitle",
            [`by ${author}`, formatAdminDate(row.created_at), `${skillCount} skill${skillCount === 1 ? "" : "s"}`]
                .filter(Boolean)
                .join(" - ")
        )
    );

    const closeButton = document.createElement("button");
    closeButton.className = "admin-detail-close";
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", closeAdminDetail);
    header.append(titleWrap, closeButton);

    const team = document.createElement("div");
    team.className = "admin-detail-team";
    const operatorsForRow = getAdminTeamOperators(row);
    if (operatorsForRow.length) {
        operatorsForRow.slice(0, 4).forEach((operator, index) => {
            team.appendChild(createAdminOperatorDetail(operator, index));
        });
    } else {
        team.appendChild(createAdminOperatorPlaceholder());
    }

    const rotationPreview = document.createElement("div");
    rotationPreview.className = "admin-detail-rotation";
    if (typeof createCommunityRotationPreview === "function") {
        rotationPreview.appendChild(createCommunityRotationPreview(row, { isExpanded: true }));
    } else {
        rotationPreview.appendChild(createAdminRotationPreview(row));
    }

    const description = createAdminTextElement(
        "p",
        "admin-detail-description",
        row.description || "No description added."
    );

    const metaGrid = document.createElement("div");
    metaGrid.className = "admin-detail-meta-grid";
    metaGrid.append(
        createAdminDetailMetaBlock("Status", formatAdminReviewState(row)),
        createAdminDetailMetaBlock("Elements", normalizeAdminList(row.element_types).map(formatAdminLabel).join(", ")),
        createAdminDetailMetaBlock("Classes", normalizeAdminList(row.operator_classes).map(formatAdminLabel).join(", ")),
        createAdminDetailMetaBlock("Views", String(Number(row.view_count) || 0)),
        createAdminDetailMetaBlock("Likes", String(Number(row.likes_count) || 0)),
        createAdminDetailMetaBlock("Reviewed", formatAdminDate(row.reviewed_at))
    );

    const note = createAdminReviewNote(row, "admin-detail-note");

    const shareCode = document.createElement("code");
    shareCode.className = "admin-detail-code";
    shareCode.textContent = row.share_code || "No share code";

    const actions = document.createElement("div");
    actions.className = "admin-detail-actions";
    getAdminRowActions(row, isBusy).forEach(action => actions.appendChild(action));

    panel.append(header, team, rotationPreview, description, metaGrid);
    if (note) panel.appendChild(note);
    panel.append(shareCode, actions);
}

function createAdminActionButton(label, onClick, options = {}) {
    const button = document.createElement("button");
    button.className = [
        "admin-action-btn",
        options.primary ? "admin-action-primary" : "",
        options.danger ? "admin-action-danger" : ""
    ].filter(Boolean).join(" ");
    button.type = "button";
    button.textContent = label;
    button.disabled = options.disabled === true;
    button.addEventListener("click", onClick);
    return button;
}

function createAdminReviewCard(row) {
    const card = document.createElement("article");
    const rotationId = String(row?.id || "");
    const isBusy = adminPanelState.actionIds.has(rotationId);
    const isActive = adminPanelState.detailRotationId === rotationId;
    card.className = `admin-review-card${isBusy ? " is-busy" : ""}${isActive ? " is-active" : ""}`;

    const header = document.createElement("div");
    header.className = "admin-review-card-header";

    const titleWrap = document.createElement("div");
    const title = createAdminTextElement("h3", "admin-review-title", row.title || "Untitled rotation");
    const author = row.author_name ? row.author_name : "Anonymous";
    const date = formatAdminDate(row.created_at);
    titleWrap.append(
        title,
        createAdminTextElement("div", "admin-review-meta", [`by ${author}`, date].filter(Boolean).join(" - "))
    );

    const stats = createAdminTextElement(
        "span",
        "admin-review-stat",
        formatAdminReviewState(row)
    );
    header.append(titleWrap, stats);

    const description = createAdminTextElement(
        "p",
        "admin-review-description",
        row.description || "No description added."
    );

    const actions = document.createElement("div");
    actions.className = "admin-review-actions";

    getAdminRowActions(row, isBusy, isActive).forEach(action => actions.appendChild(action));

    const note = createAdminReviewNote(row);

    card.append(
        header,
        createAdminTeamPreview(row),
        createAdminRotationPreview(row),
        description,
        createAdminChipRow(row)
    );
    if (note) card.appendChild(note);
    card.appendChild(actions);

    return card;
}

function getAdminRowActions(row, isBusy, isActive = false) {
    const state = getAdminReviewState(row);
    const actions = [
        createAdminActionButton(isActive ? "Hide details" : "Details", () => {
            if (isActive) {
                closeAdminDetail();
            } else {
                openAdminDetail(row.id);
            }
        }, { disabled: isBusy }),
        createAdminActionButton("Load preview", () => loadAdminRotationPreview(row), { disabled: isBusy })
    ];

    if (state === "pending") {
        actions.push(
            createAdminActionButton("Reject", () => reviewAdminRotationState(row.id, "rejected"), { danger: true, disabled: isBusy }),
            createAdminActionButton(isBusy ? "Saving..." : "Approve", () => reviewAdminRotationState(row.id, "approved"), { primary: true, disabled: isBusy })
        );
    } else if (state === "approved") {
        actions.push(
            createAdminActionButton("Hide", () => reviewAdminRotationState(row.id, "rejected"), { danger: true, disabled: isBusy })
        );
    } else {
        actions.push(
            createAdminActionButton("Restore", () => reviewAdminRotationState(row.id, "pending"), { disabled: isBusy }),
            createAdminActionButton(isBusy ? "Saving..." : "Approve", () => reviewAdminRotationState(row.id, "approved"), { primary: true, disabled: isBusy })
        );
    }

    return actions;
}

function renderAdminReviewList() {
    const list = document.getElementById("adminReviewList");
    if (!list) return;

    list.innerHTML = "";

    if (adminPanelState.loading) {
        const activeTab = getActiveAdminTab();
        setAdminListState(list, {
            type: "loading",
            title: activeTab.loadingTitle,
            message: activeTab.loadingMessage,
            loading: true
        });
        return;
    }

    if (adminPanelState.reviewError) {
        setAdminListState(list, {
            type: "error",
            title: "Review queue unavailable",
            message: adminPanelState.reviewError,
            actionLabel: "Try again",
            action: fetchAdminPendingRotations
        });
        return;
    }

    if (!adminPanelState.loaded) {
        setAdminListState(list, {
            title: "Ready for review",
            message: "Pending rotations will appear here after the first refresh."
        });
        return;
    }

    if (!adminPanelState.rotations.length) {
        const activeTab = getActiveAdminTab();
        setAdminListState(list, {
            type: "empty",
            title: activeTab.emptyTitle,
            message: activeTab.emptyMessage,
            actionLabel: "Refresh",
            action: fetchAdminReviewRotations
        });
        return;
    }

    adminPanelState.rotations.forEach(row => {
        list.appendChild(createAdminReviewCard(row));
    });
}

function renderAdminPanel() {
    const loginPanel = document.getElementById("adminLoginPanel");
    const reviewPanel = document.getElementById("adminReviewPanel");
    const userEmail = document.getElementById("adminUserEmail");
    const signOutButton = document.getElementById("adminLoginSignOutBtn");
    const loginButton = document.getElementById("adminLoginButton");

    const canReview = Boolean(adminPanelState.session && adminPanelState.isAdmin);

    if (loginPanel) loginPanel.hidden = canReview;
    if (reviewPanel) reviewPanel.hidden = !canReview;
    if (userEmail) userEmail.textContent = adminPanelState.session?.user?.email || "Admin";
    if (signOutButton) signOutButton.hidden = !adminPanelState.session || canReview;
    if (loginButton) loginButton.disabled = adminPanelState.checkingAuth;

    renderAdminAuthStatus();
    renderAdminReviewStatus();
    renderAdminReviewTabs();
    renderAdminDetailPanel();
    renderAdminReviewList();
    updateAdminEntryVisibility();
}

function updateAdminEntryVisibility() {
    const openButton = document.getElementById("openAdminPanelBtn");
    const modal = document.getElementById("adminModal");
    const canShowAdmin = Boolean(adminPanelState.session && adminPanelState.isAdmin);

    if (openButton) openButton.hidden = !canShowAdmin;
    if (!canShowAdmin && modal?.classList.contains("open")) {
        modal.classList.remove("open");
    }
}

async function refreshAdminSession({ loadPending = true } = {}) {
    const client = getAdminSupabaseClient();
    adminPanelState.checkingAuth = true;
    renderAdminPanel();

    if (!client) {
        adminPanelState.session = null;
        adminPanelState.isAdmin = false;
        adminPanelState.checkingAuth = false;
        setAdminAuthStatus("Supabase is not available right now.", "is-error");
        renderAdminPanel();
        return;
    }

    try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;

        adminPanelState.session = data?.session || null;
        adminPanelState.isAdmin = false;
        adminPanelState.reviewError = "";

        if (!adminPanelState.session) {
            setAdminAuthStatus("");
            return;
        }

        const { data: isAdmin, error: adminError } = await client.rpc("is_app_admin");
        if (adminError) {
            throw new Error("Admin database setup is missing. Run supabase/admin_panel.sql first.");
        }

        adminPanelState.isAdmin = isAdmin === true;
        if (!adminPanelState.isAdmin) {
            setAdminAuthStatus("Signed in, but this account is not listed as an admin.", "is-error");
            return;
        }

        setAdminAuthStatus("");
        if (loadPending) {
            await fetchAdminReviewRotations();
        }
    } catch (error) {
        console.error("Admin session check failed:", error);
        adminPanelState.isAdmin = false;
        setAdminAuthStatus(error.message || "Admin login could not be checked.", "is-error");
    } finally {
        adminPanelState.checkingAuth = false;
        renderAdminPanel();
    }
}

function applyAdminTabFilters(query, tabId) {
    if (tabId === "approved") {
        return query
            .eq("is_public", true)
            .eq("is_approved", true)
            .eq("is_hidden", false);
    }

    if (tabId === "rejected") {
        return query
            .eq("is_public", true)
            .eq("is_approved", false)
            .eq("is_hidden", true);
    }

    return query
        .eq("is_public", true)
        .eq("is_approved", false)
        .eq("is_hidden", false);
}

function applyAdminTabOrdering(query, tabId) {
    if (tabId === "pending") {
        return query.order("created_at", { ascending: true });
    }

    return query
        .order("reviewed_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false });
}

async function fetchAdminReviewRotations() {
    const client = getAdminSupabaseClient();
    if (!client || !adminPanelState.isAdmin) return;

    const activeTabId = adminPanelState.activeTab;
    adminPanelState.loading = true;
    adminPanelState.loaded = false;
    adminPanelState.reviewError = "";
    setAdminReviewStatus("");
    renderAdminReviewList();

    try {
        let query = client
            .from("community_rotations")
            .select("id,title,description,author_name,share_code,team_operator_ids,rotation_skill_ids,element_types,operator_classes,likes_count,view_count,is_approved,is_hidden,review_note,reviewed_at,created_at,updated_at")
            .eq("game", "arknights_endfield");

        query = applyAdminTabOrdering(applyAdminTabFilters(query, activeTabId), activeTabId);
        const { data, error } = await query;

        if (error) throw error;

        adminPanelState.rotations = Array.isArray(data) ? data : [];
        adminPanelState.loaded = true;
        if (adminPanelState.detailRotationId && !adminPanelState.rotations.some(row => String(row.id) === adminPanelState.detailRotationId)) {
            adminPanelState.detailRotationId = "";
        }
    } catch (error) {
        console.error("Admin community rotations could not be loaded:", error);
        adminPanelState.loaded = true;
        adminPanelState.rotations = [];
        adminPanelState.reviewError = "Review history could not be loaded. Run the latest supabase/admin_panel.sql and check your admin access.";
        setAdminReviewStatus("");
    } finally {
        adminPanelState.loading = false;
        renderAdminDetailPanel();
        renderAdminReviewList();
    }
}

async function fetchAdminPendingRotations() {
    return fetchAdminReviewRotations();
}

function setAdminReviewTab(tabId) {
    if (!ADMIN_REVIEW_TABS.some(tab => tab.id === tabId) || adminPanelState.activeTab === tabId) return;

    adminPanelState.activeTab = tabId;
    adminPanelState.detailRotationId = "";
    adminPanelState.rotations = [];
    adminPanelState.loaded = false;
    adminPanelState.reviewError = "";
    setAdminReviewStatus("");
    renderAdminPanel();
    fetchAdminReviewRotations();
}

async function signInAdmin(event) {
    event.preventDefault();
    const client = getAdminSupabaseClient();
    if (!client) {
        setAdminAuthStatus("Supabase is not available right now.", "is-error");
        return;
    }

    const email = document.getElementById("adminEmailInput")?.value || "";
    const password = document.getElementById("adminPasswordInput")?.value || "";
    const loginButton = document.getElementById("adminLoginButton");

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "Signing in...";
    }
    setAdminAuthStatus("Checking admin access...");

    try {
        const { error } = await client.auth.signInWithPassword({
            email: email.trim(),
            password
        });

        if (error) throw error;

        const passwordInput = document.getElementById("adminPasswordInput");
        if (passwordInput) passwordInput.value = "";
        await refreshAdminSession();
    } catch (error) {
        console.error("Admin sign in failed:", error);
        setAdminAuthStatus("Sign in failed. Check the email, password, and admin setup.", "is-error");
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = "Sign in";
        }
    }
}

async function signOutAdmin() {
    const client = getAdminSupabaseClient();
    if (!client) return;

    try {
        await client.auth.signOut();
    } catch (error) {
        console.warn("Admin sign out failed:", error);
    }

    adminPanelState.session = null;
    adminPanelState.isAdmin = false;
    adminPanelState.rotations = [];
    adminPanelState.loaded = false;
    adminPanelState.reviewError = "";
    adminPanelState.detailRotationId = "";
    setAdminAuthStatus("");
    setAdminReviewStatus("");
    renderAdminPanel();
    updateAdminEntryVisibility();
}

function loadAdminRotationPreview(row) {
    if (!row?.share_code || typeof applyBuildShareCode !== "function") {
        setAdminReviewStatus("This submitted rotation cannot be loaded.", "is-error");
        return;
    }

    const shouldLoad = confirm("Load this submitted rotation into the builder preview? Your current local setup will be replaced.");
    if (!shouldLoad) return;

    try {
        applyBuildShareCode(row.share_code);
        setAdminReviewStatus("Rotation loaded into the builder preview.", "is-success");
    } catch (error) {
        console.error("Admin preview load failed:", error);
        setAdminReviewStatus("This submitted rotation could not be loaded.", "is-error");
    }
}

function isMissingReviewNoteFunction(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return message.includes("could not find")
        || message.includes("schema cache")
        || message.includes("admin_review_note")
        || message.includes("review_community_rotation");
}

function isMissingReviewStateFunction(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return message.includes("set_community_rotation_review_state")
        || message.includes("could not find")
        || message.includes("schema cache");
}

async function callReviewCommunityRotation(client, rotationId, approve, reviewNote) {
    if (reviewNote) {
        const { error } = await client.rpc("review_community_rotation", {
            target_rotation_id: rotationId,
            approve,
            admin_review_note: reviewNote
        });

        if (!error) return { noteSaved: true };
        if (!isMissingReviewNoteFunction(error)) throw error;
    }

    const { error } = await client.rpc("review_community_rotation", {
        target_rotation_id: rotationId,
        approve
    });

    if (error) throw error;
    return { noteSaved: !reviewNote };
}

async function callSetAdminReviewState(client, rotationId, targetState, reviewNote) {
    const { error } = await client.rpc("set_community_rotation_review_state", {
        target_rotation_id: rotationId,
        review_state: targetState,
        admin_review_note: reviewNote
    });

    if (!error) return { noteSaved: Boolean(reviewNote), usedFallback: false };
    if (!isMissingReviewStateFunction(error)) throw error;

    if (targetState === "pending") {
        throw new Error("Restore requires the latest supabase/admin_panel.sql.");
    }

    const fallback = await callReviewCommunityRotation(client, rotationId, targetState === "approved", reviewNote);
    return { ...fallback, usedFallback: true };
}

function getAdminActionProgressText(targetState) {
    if (targetState === "approved") return "Approving rotation...";
    if (targetState === "pending") return "Restoring rotation...";
    return "Hiding rotation...";
}

function getAdminActionSuccessText(targetState) {
    if (targetState === "approved") return "Rotation approved.";
    if (targetState === "pending") return "Rotation restored to pending.";
    return "Rotation rejected and hidden.";
}

async function reviewAdminRotationState(rotationId, targetState) {
    const client = getAdminSupabaseClient();
    if (!client || !rotationId) return;

    const id = String(rotationId);
    let reviewNote = "";
    if (targetState === "rejected") {
        const note = prompt("Optional internal note. Leave empty if no note is needed:");
        if (note === null) return;
        reviewNote = note.trim();
    }

    adminPanelState.actionIds.add(id);
    setAdminReviewStatus(getAdminActionProgressText(targetState));
    renderAdminReviewList();
    renderAdminDetailPanel();

    try {
        const result = await callSetAdminReviewState(client, id, targetState, reviewNote);

        adminPanelState.rotations = adminPanelState.rotations.filter(row => String(row.id) !== id);
        if (adminPanelState.detailRotationId === id) {
            adminPanelState.detailRotationId = "";
            renderAdminDetailPanel();
        }

        const rejectedWithoutSavedNote = targetState === "rejected" && reviewNote && !result.noteSaved;
        setAdminReviewStatus(
            rejectedWithoutSavedNote
                ? "Rotation hidden. Run the latest admin SQL to save notes next time."
                : result.usedFallback && targetState !== "approved"
                    ? "Rotation updated. Run the latest admin SQL for full history actions."
                    : getAdminActionSuccessText(targetState),
            rejectedWithoutSavedNote || result.usedFallback ? "" : "is-success"
        );
    } catch (error) {
        console.error("Community review action failed:", error);
        setAdminReviewStatus(error.message || "Review action failed. Check admin access and Supabase setup.", "is-error");
    } finally {
        adminPanelState.actionIds.delete(id);
        renderAdminDetailPanel();
        renderAdminReviewList();
    }
}

async function reviewAdminRotation(rotationId, approve) {
    return reviewAdminRotationState(rotationId, approve ? "approved" : "rejected");
}

function openAdminPanel() {
    const modal = document.getElementById("adminModal");
    if (!modal) return;

    modal.classList.add("open");
    refreshAdminSession();
}

function closeAdminPanel() {
    const modal = document.getElementById("adminModal");
    if (!modal) return;

    modal.classList.remove("open");
}

function initAdminPanel() {
    if (adminPanelState.initialized) return;
    adminPanelState.initialized = true;

    const openButton = document.getElementById("openAdminPanelBtn");
    const closeButton = document.getElementById("closeAdminPanelBtn");
    const loginForm = document.getElementById("adminLoginForm");
    const signOutButton = document.getElementById("adminSignOutBtn");
    const loginSignOutButton = document.getElementById("adminLoginSignOutBtn");
    const refreshButton = document.getElementById("adminRefreshBtn");
    const modal = document.getElementById("adminModal");

    if (openButton) openButton.addEventListener("click", openAdminPanel);
    if (closeButton) closeButton.addEventListener("click", closeAdminPanel);
    if (loginForm) loginForm.addEventListener("submit", signInAdmin);
    if (signOutButton) signOutButton.addEventListener("click", signOutAdmin);
    if (loginSignOutButton) loginSignOutButton.addEventListener("click", signOutAdmin);
    if (refreshButton) refreshButton.addEventListener("click", fetchAdminPendingRotations);

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeAdminPanel();
        });
    }

    document.addEventListener("keydown", event => {
        const modalElement = document.getElementById("adminModal");
        if (event.key === "Escape" && modalElement?.classList.contains("open")) {
            closeAdminPanel();
        }
    });

    const client = getAdminSupabaseClient();
    if (client?.auth?.onAuthStateChange) {
        client.auth.onAuthStateChange((_event, session) => {
            adminPanelState.session = session || null;
            adminPanelState.isAdmin = false;
            adminPanelState.rotations = [];
            adminPanelState.loaded = false;
            adminPanelState.detailRotationId = "";
            setAdminAuthStatus("");
            setAdminReviewStatus("");

            if (session) {
                refreshAdminSession({ loadPending: false });
                return;
            }

            renderAdminPanel();
        });
    }

    refreshAdminSession({ loadPending: false });
}

window.initAdminPanel = initAdminPanel;
