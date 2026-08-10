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
    },
    {
        id: "reports",
        label: "Reports",
        loadingTitle: "Loading issue reports",
        loadingMessage: "Fetching anonymous reports from RotationForge.",
        emptyTitle: "No issue reports",
        emptyMessage: "Anonymous reports submitted from the Rotation Builder will appear here."
    },
    {
        id: "operators",
        label: "Operators",
        loadingTitle: "Loading operators",
        loadingMessage: "Fetching public visibility settings from Supabase.",
        emptyTitle: "No operators found",
        emptyMessage: "No Endfield operators are available in Supabase."
    },
    {
        id: "batk",
        label: "BATK Editor",
        loadingTitle: "Loading BATK profiles",
        loadingMessage: "Fetching operators and Basic Attack sequences from Supabase.",
        emptyTitle: "No BATK data found",
        emptyMessage: "Choose an operator and create the first Basic Attack profile."
    }
];

const ADMIN_OPERATOR_STAR_OPTIONS = [4, 5, 6].map(value => ({
    value: String(value),
    label: `${value} stars`
}));

const ADMIN_OPERATOR_CLASS_OPTIONS = [
    "Caster",
    "Defender",
    "Guard",
    "Striker",
    "Supporter",
    "Vanguard"
].map(value => ({ value, label: value }));

const ADMIN_OPERATOR_ELEMENT_OPTIONS = [
    { value: "physical", label: "Physical" },
    { value: "heat", label: "Heat" },
    { value: "electric", label: "Electric" },
    { value: "cryo", label: "Cryo" },
    { value: "nature", label: "Nature" }
];

const ADMIN_OPERATOR_WEAPON_OPTIONS = [
    { value: "arts_unit", label: "Arts Unit" },
    { value: "great_sword", label: "Great Sword" },
    { value: "handcannon", label: "Handcannon" },
    { value: "polearm", label: "Polearm" },
    { value: "sword", label: "Sword" }
];

const adminPanelState = {
    session: null,
    isAdmin: false,
    username: "",
    rotations: [],
    reports: [],
    operators: [],
    operatorEditor: null,
    operatorSaving: false,
    batkRows: [],
    batkEditor: null,
    batkSaving: false,
    activeTab: "pending",
    loaded: false,
    loading: false,
    checkingAuth: false,
    reviewError: "",
    detailRotationId: "",
    actionIds: new Set(),
    reportActionIds: new Set(),
    operatorActionIds: new Set(),
    authStatus: "",
    authStatusClass: "",
    reviewStatus: "",
    reviewStatusClass: "",
    initialized: false
};

function getAdminSupabaseClient() {
    return typeof supabaseClient !== "undefined" ? supabaseClient : null;
}

function getAdminFallbackUsername(session = adminPanelState.session) {
    const metadataUsername = String(session?.user?.user_metadata?.username || "").trim();
    if (metadataUsername) return metadataUsername;

    const emailPrefix = String(session?.user?.email || "").split("@")[0].trim();
    return emailPrefix || "Admin";
}

async function loadAdminUsername(client) {
    adminPanelState.username = getAdminFallbackUsername();
    const userId = adminPanelState.session?.user?.id;
    if (!client || !userId) return;

    try {
        const { data, error } = await client
            .from("user_profiles")
            .select("username")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) throw error;
        const username = String(data?.username || "").trim();
        if (username) adminPanelState.username = username;
    } catch (error) {
        console.warn("Admin username could not be loaded; using the account fallback.", error);
    }
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

    if (adminPanelState.activeTab === "operators" || adminPanelState.activeTab === "reports") {
        adminPanelState.detailRotationId = "";
        panel.replaceChildren();
        panel.hidden = true;
        return;
    }

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

function formatAdminReportType(value) {
    const labels = {
        missing_data: "Missing data",
        incorrect_data: "Incorrect data",
        bug: "Not working",
        other: "Other"
    };
    return labels[value] || formatAdminLabel(value) || "Report";
}

function formatAdminReportStatus(value) {
    const status = String(value || "pending").toLowerCase();
    if (status === "resolved") return "Resolved";
    if (status === "dismissed") return "Dismissed";
    return "Pending";
}

function getSafeAdminReportPageUrl(value) {
    try {
        const url = new URL(String(value || ""), window.location.origin);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
        return "";
    }
}

function createAdminIssueReportCard(row) {
    const reportId = String(row?.id || "");
    const isBusy = adminPanelState.reportActionIds.has(reportId);
    const card = document.createElement("article");
    card.className = `admin-review-card${isBusy ? " is-busy" : ""}`;

    const header = document.createElement("div");
    header.className = "admin-review-card-header";
    const titleWrap = document.createElement("div");
    titleWrap.append(
        createAdminTextElement("h3", "admin-review-title", formatAdminReportType(row.report_type)),
        createAdminTextElement("div", "admin-review-meta", ["Anonymous", formatAdminDate(row.created_at)].filter(Boolean).join(" - "))
    );
    header.append(
        titleWrap,
        createAdminTextElement("span", "admin-review-stat", formatAdminReportStatus(row.status))
    );

    const context = normalizeAdminList(row.team_operator_names).length
        ? normalizeAdminList(row.team_operator_names).join(", ")
        : "No team selected";
    const meta = createAdminTextElement("div", "admin-review-meta", `Team: ${context}`);
    const description = createAdminTextElement("p", "admin-review-description", row.description || "No description provided.");
    const additional = row.additional_information
        ? createAdminTextElement("p", "admin-detail-note", row.additional_information)
        : null;

    const pageLink = document.createElement("a");
    const safePageUrl = getSafeAdminReportPageUrl(row.page_url);
    pageLink.className = "admin-action-btn";
    pageLink.href = safePageUrl || "#";
    pageLink.target = "_blank";
    pageLink.rel = "noopener noreferrer";
    pageLink.textContent = "Open reported page";
    if (!safePageUrl) pageLink.hidden = true;

    const actions = document.createElement("div");
    actions.className = "admin-review-actions";
    actions.appendChild(pageLink);
    if (row.status !== "pending") {
        actions.appendChild(createAdminActionButton("Restore", () => setAdminIssueReportStatus(row.id, "pending"), { disabled: isBusy }));
    }
    if (row.status !== "dismissed") {
        actions.appendChild(createAdminActionButton("Dismiss", () => setAdminIssueReportStatus(row.id, "dismissed"), { danger: true, disabled: isBusy }));
    }
    if (row.status !== "resolved") {
        actions.appendChild(createAdminActionButton(isBusy ? "Saving..." : "Resolve", () => setAdminIssueReportStatus(row.id, "resolved"), { primary: true, disabled: isBusy }));
    }

    card.append(header, meta, description);
    if (additional) card.appendChild(additional);
    if (row.review_note) card.appendChild(createAdminTextElement("p", "admin-detail-note", `Admin note: ${row.review_note}`));
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

function createAdminOperatorVisibilityCard(operator) {
    const operatorId = String(operator?.id || "");
    const isVisible = operator?.is_visible !== false;
    const isBusy = adminPanelState.operatorActionIds.has(operatorId);
    const elementType = String(operator?.element_type || operator?.elementType || "neutral").toLowerCase();
    const operatorClass = operator?.operator_class || operator?.operatorClass || "";
    const card = document.createElement("article");
    card.className = `admin-visibility-card operator-card operator-element-${elementType}${isVisible ? " selected is-visible" : " is-hidden"}${isBusy ? " is-busy" : ""}`;
    card.tabIndex = isBusy ? -1 : 0;
    card.setAttribute("role", "switch");
    card.setAttribute("aria-checked", isVisible ? "true" : "false");
    card.setAttribute("aria-busy", isBusy ? "true" : "false");
    card.setAttribute(
        "aria-label",
        `${operator?.name || "Operator"}: ${isVisible ? "shown" : "hidden"}. Click to ${isVisible ? "hide" : "show"}.`
    );
    card.title = isBusy
        ? "Saving..."
        : `Click to ${isVisible ? "hide" : "show"} ${operator?.name || "operator"}`;

    const avatar = createAdminOperatorAvatar({
        ...operator,
        icon: operator?.icon_path || operator?.icon || ""
    });
    avatar.classList.add("admin-visibility-avatar");

    const cardOperator = {
        ...operator,
        operatorClass,
        elementType
    };
    const meta = typeof createOperatorCardMeta === "function"
        ? createOperatorCardMeta(cardOperator, elementType)
        : createAdminTextElement("div", "operator-card-meta", `${operator?.star || "-"} ★`);

    const name = createAdminTextElement("div", "operator-name", operator?.name || "Operator");

    const state = createAdminTextElement(
        "span",
        `admin-visibility-state ${isVisible ? "is-visible" : "is-hidden"}`,
        isBusy ? "…" : (isVisible ? "✓" : "—")
    );
    state.setAttribute("aria-hidden", "true");

    const toggleVisibility = () => {
        if (isBusy) return;
        setAdminOperatorVisibility(operator.id, !isVisible);
    };
    card.addEventListener("click", toggleVisibility);
    card.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggleVisibility();
    });

    card.append(meta, avatar, name, state);
    return card;
}

function loadAdminOperatorEditor(operatorId) {
    const operator = adminPanelState.operators.find(item => Number(item.id) === Number(operatorId));
    if (!operator) {
        adminPanelState.operatorEditor = null;
        return;
    }

    adminPanelState.operatorEditor = {
        id: Number(operator.id),
        name: String(operator.name || ""),
        slug: String(operator.slug || ""),
        star: String(operator.star || 1),
        operatorClass: String(operator.operator_class || ""),
        elementType: String(operator.element_type || ""),
        weaponType: String(operator.weapon_type || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_")
            .replace(/^greatsword$/, "great_sword"),
        iconPath: String(operator.icon_path || ""),
        sortOrder: String(Number(operator.sort_order) || 0),
        canEnterUltimateState: operator.can_enter_ultimate_state === true,
        isVisible: operator.is_visible !== false
    };
}

function validateAdminOperatorEditor(editor) {
    const name = String(editor?.name || "").trim();
    const slug = String(editor?.slug || "").trim().toLowerCase();
    const star = Number(editor?.star);
    const sortOrder = Number(editor?.sortOrder);

    if (!editor?.id) throw new Error("Choose an operator first.");
    if (!name) throw new Error("Enter an operator name.");
    if (!/^[a-z0-9][a-z0-9_]{0,63}$/.test(slug)) {
        throw new Error("Slug may only contain lowercase letters, numbers, and underscores.");
    }
    if (!ADMIN_OPERATOR_STAR_OPTIONS.some(option => Number(option.value) === star)) {
        throw new Error("Stars must be 4, 5, or 6.");
    }
    if (!Number.isInteger(sortOrder)) throw new Error("Sort order must be a whole number.");
    if (!ADMIN_OPERATOR_CLASS_OPTIONS.some(option => option.value === editor.operatorClass)) throw new Error("Choose a valid class.");
    if (!ADMIN_OPERATOR_ELEMENT_OPTIONS.some(option => option.value === editor.elementType)) throw new Error("Choose a valid element.");
    if (!ADMIN_OPERATOR_WEAPON_OPTIONS.some(option => option.value === editor.weaponType)) throw new Error("Choose a valid weapon type.");
    return {
        name,
        slug,
        star,
        operatorClass: String(editor.operatorClass).trim(),
        elementType: String(editor.elementType).trim().toLowerCase(),
        weaponType: String(editor.weaponType).trim().toLowerCase(),
        iconPath: String(editor.iconPath || "").trim(),
        sortOrder,
        canEnterUltimateState: editor.canEnterUltimateState === true,
        isVisible: editor.isVisible === true
    };
}

function renderAdminOperatorEditor(list) {
    if (!adminPanelState.operators.length) {
        setAdminListState(list, {
            type: "empty",
            title: "No operators found",
            message: "No Endfield operators are available in Supabase.",
            actionLabel: "Refresh",
            action: fetchAdminActiveContent
        });
        return;
    }
    if (!adminPanelState.operatorEditor && adminPanelState.operators.length) {
        loadAdminOperatorEditor(adminPanelState.operators[0].id);
    }
    const editor = adminPanelState.operatorEditor;
    if (!editor) return;

    const shell = document.createElement("section");
    shell.className = "admin-operator-editor";
    const toolbar = document.createElement("div");
    toolbar.className = "admin-operator-toolbar";
    toolbar.appendChild(createAdminBatkInput("Operator", String(editor.id), {
        select: adminPanelState.operators.map(operator => ({ value: String(operator.id), label: operator.name })),
        onInput: value => {
            loadAdminOperatorEditor(Number(value));
            setAdminReviewStatus("");
            renderAdminReviewList();
        }
    }));
    toolbar.appendChild(createAdminTextElement("span", "admin-operator-editor-hint", `Database ID ${editor.id}`));

    const fields = document.createElement("div");
    fields.className = "admin-operator-fields";
    const update = (key, value) => { editor[key] = value; };
    fields.append(
        createAdminBatkInput("Name", editor.name, { onInput: value => update("name", value) }),
        createAdminBatkInput("Slug", editor.slug, { onInput: value => update("slug", value) }),
        createAdminBatkInput("Stars", editor.star, {
            select: ADMIN_OPERATOR_STAR_OPTIONS,
            onInput: value => update("star", value)
        }),
        createAdminBatkInput("Sort order", editor.sortOrder, { type: "number", step: "1", onInput: value => update("sortOrder", value) }),
        createAdminBatkInput("Class", editor.operatorClass, {
            select: ADMIN_OPERATOR_CLASS_OPTIONS,
            onInput: value => update("operatorClass", value)
        }),
        createAdminBatkInput("Element", editor.elementType, {
            select: ADMIN_OPERATOR_ELEMENT_OPTIONS,
            onInput: value => update("elementType", value)
        }),
        createAdminBatkInput("Weapon type", editor.weaponType, {
            select: ADMIN_OPERATOR_WEAPON_OPTIONS,
            onInput: value => update("weaponType", value)
        }),
        createAdminBatkInput("Icon path", editor.iconPath, { wide: true, onInput: value => update("iconPath", value) }),
        createAdminBatkInput("Ultimate state", editor.canEnterUltimateState, { type: "checkbox", onInput: value => update("canEnterUltimateState", value) }),
        createAdminBatkInput("Visible", editor.isVisible, { type: "checkbox", onInput: value => update("isVisible", value) })
    );

    const actions = document.createElement("div");
    actions.className = "admin-operator-actions";
    actions.append(
        createAdminTextElement("span", "admin-operator-editor-hint", "Changes become active in the planner after reload."),
        createAdminActionButton(adminPanelState.operatorSaving ? "Saving..." : "Save operator", saveAdminOperatorProfile, {
            primary: true,
            disabled: adminPanelState.operatorSaving
        })
    );

    const visibilityHeading = document.createElement("div");
    visibilityHeading.className = "admin-batk-section-heading";
    visibilityHeading.append(
        createAdminTextElement("strong", "", "Visibility quick toggles"),
        createAdminTextElement("span", "", "Click a card to show or hide an operator")
    );
    const visibilityGrid = document.createElement("div");
    visibilityGrid.className = "admin-operator-visibility-grid";
    adminPanelState.operators.forEach(operator => visibilityGrid.appendChild(createAdminOperatorVisibilityCard(operator)));

    shell.append(toolbar, fields, actions, visibilityHeading, visibilityGrid);
    list.appendChild(shell);
}

async function saveAdminOperatorProfile() {
    const client = getAdminSupabaseClient();
    const editor = adminPanelState.operatorEditor;
    if (!client || !editor || adminPanelState.operatorSaving) return;

    try {
        const profile = validateAdminOperatorEditor(editor);
        adminPanelState.operatorSaving = true;
        setAdminReviewStatus(`Saving ${profile.name}...`);
        renderAdminReviewList();
        const { data, error } = await client.rpc("update_operator_profile", {
            target_operator_id: editor.id,
            profile_data: profile
        });
        if (error) throw error;
        if (!Array.isArray(data) || !data.length) throw new Error("Supabase returned no updated operator.");

        const saved = data[0];
        adminPanelState.operators = adminPanelState.operators
            .map(operator => Number(operator.id) === Number(saved.id) ? { ...operator, ...saved } : operator)
            .sort((left, right) => Number(left.sort_order) - Number(right.sort_order) || String(left.name).localeCompare(String(right.name)));
        loadAdminOperatorEditor(saved.id);
        setAdminReviewStatus(`${saved.name} saved. Reload the planner to use the updated data.`, "is-success");
    } catch (error) {
        console.error("Operator profile save failed:", error);
        setAdminReviewStatus(error?.message || "Operator could not be saved. Run supabase/operator_admin_editor.sql first.", "is-error");
    } finally {
        adminPanelState.operatorSaving = false;
        renderAdminReviewList();
    }
}

function getAdminBatkProfiles(operatorId) {
    const id = Number(operatorId);
    const profiles = new Map();
    adminPanelState.batkRows
        .filter(row => Number(row.operator_id) === id)
        .sort((left, right) => Number(left.sequence_index) - Number(right.sequence_index))
        .forEach(row => {
            const formKey = String(row.form_key || "base");
            if (!profiles.has(formKey)) profiles.set(formKey, []);
            profiles.get(formKey).push(row);
        });
    return profiles;
}

function createEmptyAdminBatkEditor(operator, formKey = "base") {
    return {
        operatorId: Number(operator?.id) || 0,
        formKey,
        attackName: `${operator?.name || "Operator"} Basic Attack`,
        timingMode: "absolute",
        verified: false,
        description: "",
        iconPath: "",
        sourceUrl: "",
        sourceNote: "",
        sequences: [{
            label: "FS",
            kind: "final_strike",
            duration: "1",
            hitTimings: "0.5",
            hitMultipliers: "",
            atkMultiplierTotal: "1",
            staggerMultiplier: "0",
            eventHitIndex: "1",
            emits: "final_strike",
            endsCycle: true
        }]
    };
}

function loadAdminBatkEditor(operatorId, requestedFormKey = "") {
    const operator = adminPanelState.operators.find(item => Number(item.id) === Number(operatorId));
    if (!operator) {
        adminPanelState.batkEditor = null;
        return;
    }

    const profiles = getAdminBatkProfiles(operator.id);
    const formKey = requestedFormKey && profiles.has(requestedFormKey)
        ? requestedFormKey
        : (profiles.keys().next().value || "base");
    const rows = profiles.get(formKey) || [];

    if (!rows.length) {
        adminPanelState.batkEditor = createEmptyAdminBatkEditor(operator, formKey);
        return;
    }

    const first = rows[0];
    adminPanelState.batkEditor = {
        operatorId: Number(operator.id),
        formKey,
        attackName: first.attack_name || `${operator.name} Basic Attack`,
        timingMode: first.hit_timing_mode || "absolute",
        verified: rows.every(row => row.verified === true),
        description: first.description || "",
        iconPath: first.icon_path || "",
        sourceUrl: first.source_url || "",
        sourceNote: first.source_note || "",
        sequences: rows.map(row => ({
            label: row.label || "",
            kind: row.kind || "normal",
            duration: String(Number(row.duration_seconds) || ""),
            hitTimings: normalizeAdminList(row.hit_timings).join(", "),
            hitMultipliers: normalizeAdminList(row.hit_multipliers).join(", "),
            atkMultiplierTotal: String(Number(row.atk_multiplier_total) || 0),
            staggerMultiplier: String(Number(row.stagger_multiplier) || 0),
            eventHitIndex: row.event_hit_index === null || row.event_hit_index === undefined ? "" : String(row.event_hit_index),
            emits: normalizeAdminList(row.emits).join(", "),
            endsCycle: row.ends_cycle === true
        }))
    };
}

function parseAdminBatkNumberList(value) {
    const text = String(value || "").trim();
    if (!text) return [];
    return text.split(/[;,\s]+/).filter(Boolean).map(Number);
}

function validateAdminBatkEditor(editor) {
    if (!editor?.operatorId) throw new Error("Choose an operator first.");
    if (!/^[a-z0-9][a-z0-9_]{0,63}$/.test(String(editor.formKey || ""))) {
        throw new Error("Form key may only contain lowercase letters, numbers, and underscores.");
    }
    if (!String(editor.attackName || "").trim()) throw new Error("Enter an attack name.");
    if (!editor.sequences.length) throw new Error("Add at least one sequence.");
    if (editor.sequences.filter(sequence => sequence.endsCycle).length !== 1) {
        throw new Error("Exactly one sequence must end the BATK cycle.");
    }

    const sequences = editor.sequences.map((sequence, index) => {
        const duration = Number(sequence.duration);
        const hitTimings = parseAdminBatkNumberList(sequence.hitTimings);
        const hitMultipliers = parseAdminBatkNumberList(sequence.hitMultipliers);
        const atkMultiplierTotal = Number(sequence.atkMultiplierTotal);
        const staggerMultiplier = Number(sequence.staggerMultiplier);
        const eventHitIndex = String(sequence.eventHitIndex || "").trim() === "" ? null : Number(sequence.eventHitIndex);
        const emits = String(sequence.emits || "").split(/[;,]+/).map(value => value.trim()).filter(Boolean);

        if (!Number.isFinite(duration) || duration <= 0) throw new Error(`SEQ ${index + 1}: duration must be positive.`);
        if (!hitTimings.length || hitTimings.some(value => !Number.isFinite(value) || value < 0)) {
            throw new Error(`SEQ ${index + 1}: enter at least one non-negative hit timing.`);
        }
        const lastHit = editor.timingMode === "intervals"
            ? hitTimings.reduce((sum, value) => sum + value, 0)
            : Math.max(...hitTimings);
        if (lastHit > duration + 0.000001) throw new Error(`SEQ ${index + 1}: hits exceed the sequence duration.`);
        if (hitMultipliers.length && hitMultipliers.length !== hitTimings.length) {
            throw new Error(`SEQ ${index + 1}: hit multipliers must match the number of hits.`);
        }
        if (![atkMultiplierTotal, staggerMultiplier].every(value => Number.isFinite(value) && value >= 0)) {
            throw new Error(`SEQ ${index + 1}: multipliers cannot be negative.`);
        }
        if (hitMultipliers.some(value => !Number.isFinite(value) || value < 0)) {
            throw new Error(`SEQ ${index + 1}: per-hit multipliers cannot be negative.`);
        }
        if (eventHitIndex !== null && (!Number.isInteger(eventHitIndex) || eventHitIndex < 1 || eventHitIndex > hitTimings.length)) {
            throw new Error(`SEQ ${index + 1}: event hit must reference an existing hit.`);
        }

        return {
            label: String(sequence.label || "").trim() || (sequence.endsCycle ? "FS" : `SEQ ${index + 1}`),
            kind: sequence.kind === "final_strike" ? "final_strike" : "normal",
            duration,
            hitTimings,
            hitMultipliers,
            atkMultiplierTotal,
            staggerMultiplier,
            eventHitIndex,
            emits,
            endsCycle: sequence.endsCycle === true
        };
    });

    return {
        attackName: String(editor.attackName).trim(),
        timingMode: editor.timingMode === "intervals" ? "intervals" : "absolute",
        verified: editor.verified === true,
        description: String(editor.description || "").trim(),
        iconPath: String(editor.iconPath || "").trim(),
        sourceUrl: String(editor.sourceUrl || "").trim(),
        sourceNote: String(editor.sourceNote || "").trim(),
        sequences
    };
}

function createAdminBatkInput(label, value, options = {}) {
    const field = document.createElement("label");
    field.className = `admin-field admin-batk-field${options.wide ? " is-wide" : ""}`;
    field.appendChild(createAdminTextElement("span", "", label));

    const input = options.select ? document.createElement("select") : document.createElement(options.multiline ? "textarea" : "input");
    input.className = "admin-batk-input";
    if (options.type) input.type = options.type;
    if (options.step) input.step = options.step;
    if (options.min !== undefined) input.min = options.min;
    if (options.placeholder) input.placeholder = options.placeholder;

    if (options.select) {
        options.select.forEach(option => {
            const item = document.createElement("option");
            item.value = option.value;
            item.textContent = option.label;
            item.selected = option.value === value;
            input.appendChild(item);
        });
    } else if (options.type === "checkbox") {
        input.checked = value === true;
        field.classList.add("is-checkbox");
    } else {
        input.value = value ?? "";
    }

    if (typeof options.onInput === "function") {
        input.addEventListener(options.select || options.type === "checkbox" ? "change" : "input", event => {
            options.onInput(options.type === "checkbox" ? event.target.checked : event.target.value);
        });
    }
    field.appendChild(input);
    return field;
}

function renderAdminBatkPreview() {
    const preview = document.getElementById("adminBatkPreview");
    const editor = adminPanelState.batkEditor;
    if (!preview || !editor) return;
    preview.replaceChildren();

    const totalDuration = editor.sequences.reduce((sum, sequence) => sum + Math.max(Number(sequence.duration) || 0, 0), 0) || 1;
    editor.sequences.forEach((sequence, index) => {
        const duration = Math.max(Number(sequence.duration) || 0, 0.001);
        const segment = document.createElement("div");
        segment.className = `admin-batk-preview-segment${sequence.endsCycle ? " is-final" : ""}`;
        segment.style.flexGrow = String(duration / totalDuration);
        segment.style.flexBasis = `${Math.max((duration / totalDuration) * 100, 12)}%`;

        const timingValues = parseAdminBatkNumberList(sequence.hitTimings);
        let cumulative = 0;
        const hitTimes = timingValues.map(value => {
            cumulative = editor.timingMode === "intervals" ? cumulative + value : value;
            return cumulative;
        });
        const track = document.createElement("div");
        track.className = "admin-batk-preview-track";
        hitTimes.forEach((timing, hitIndex) => {
            const hit = createAdminTextElement("span", "admin-batk-preview-hit", String(hitIndex + 1));
            hit.style.left = `${Math.max(3, Math.min(97, (timing / duration) * 100))}%`;
            hit.title = `${Number(timing.toFixed(3))}s`;
            track.appendChild(hit);
        });

        segment.append(
            createAdminTextElement("strong", "", sequence.label || (sequence.endsCycle ? "FS" : `SEQ ${index + 1}`)),
            createAdminTextElement("span", "", `${Number(duration.toFixed(3))}s · ${Number(sequence.atkMultiplierTotal) || 0}x ATK`),
            track
        );
        preview.appendChild(segment);
    });
}

function createAdminBatkSequenceCard(sequence, index) {
    const card = document.createElement("article");
    card.className = `admin-batk-sequence${sequence.endsCycle ? " is-final" : ""}`;
    const heading = document.createElement("div");
    heading.className = "admin-batk-sequence-heading";
    heading.appendChild(createAdminTextElement("strong", "", `Sequence ${index + 1}`));

    const remove = createAdminActionButton("Remove", () => {
        const editor = adminPanelState.batkEditor;
        if (!editor || editor.sequences.length === 1) return;
        const removed = editor.sequences.splice(index, 1)[0];
        if (removed.endsCycle && editor.sequences.length) {
            const last = editor.sequences.at(-1);
            last.endsCycle = true;
            last.kind = "final_strike";
            if (!last.label || /^SEQ\s/i.test(last.label)) last.label = "FS";
        }
        renderAdminReviewList();
    }, { danger: true, disabled: adminPanelState.batkSaving || adminPanelState.batkEditor.sequences.length === 1 });
    heading.appendChild(remove);

    const fields = document.createElement("div");
    fields.className = "admin-batk-sequence-fields";
    const update = (key, value) => {
        sequence[key] = value;
        renderAdminBatkPreview();
    };
    fields.append(
        createAdminBatkInput("Label", sequence.label, { onInput: value => update("label", value) }),
        createAdminBatkInput("Kind", sequence.kind, {
            select: [{ value: "normal", label: "Normal" }, { value: "final_strike", label: "Final Strike" }],
            onInput: value => update("kind", value)
        }),
        createAdminBatkInput("Duration (s)", sequence.duration, { type: "number", min: "0.001", step: "0.001", onInput: value => update("duration", value) }),
        createAdminBatkInput("Total ATK ×", sequence.atkMultiplierTotal, { type: "number", min: "0", step: "0.001", onInput: value => update("atkMultiplierTotal", value) }),
        createAdminBatkInput("Hit timings", sequence.hitTimings, { wide: true, placeholder: "0.267, 0.583", onInput: value => update("hitTimings", value) }),
        createAdminBatkInput("Per-hit multipliers", sequence.hitMultipliers, { wide: true, placeholder: "Optional: 0.25, 0.51", onInput: value => update("hitMultipliers", value) }),
        createAdminBatkInput("Stagger ×", sequence.staggerMultiplier, { type: "number", min: "0", step: "0.001", onInput: value => update("staggerMultiplier", value) }),
        createAdminBatkInput("Event hit #", sequence.eventHitIndex, { type: "number", min: "1", step: "1", onInput: value => update("eventHitIndex", value) }),
        createAdminBatkInput("Emits", sequence.emits, { wide: true, placeholder: "final_strike", onInput: value => update("emits", value) }),
        createAdminBatkInput("Ends cycle", sequence.endsCycle, {
            type: "checkbox",
            onInput: value => {
                adminPanelState.batkEditor.sequences.forEach((item, itemIndex) => {
                    item.endsCycle = itemIndex === index ? value : false;
                    if (value && itemIndex === index) {
                        item.kind = "final_strike";
                        if (!item.label || /^SEQ\s/i.test(item.label)) item.label = "FS";
                        if (!String(item.emits || "").split(/[;,]+/).map(entry => entry.trim()).includes("final_strike")) {
                            item.emits = [item.emits, "final_strike"].filter(Boolean).join(", ");
                        }
                    } else if (value && itemIndex !== index && item.kind === "final_strike") {
                        item.kind = "normal";
                        if (!item.label || item.label === "FS") item.label = `SEQ ${itemIndex + 1}`;
                    }
                });
                renderAdminReviewList();
            }
        })
    );
    card.append(heading, fields);
    return card;
}

function renderAdminBatkEditor(list) {
    list.classList.add("is-batk");
    if (!adminPanelState.operators.length) {
        setAdminListState(list, {
            type: "empty",
            title: "No operators found",
            message: "The BATK editor needs the Endfield operator catalog from Supabase."
        });
        return;
    }

    if (!adminPanelState.batkEditor) loadAdminBatkEditor(adminPanelState.operators[0].id);
    const editor = adminPanelState.batkEditor;
    const profiles = getAdminBatkProfiles(editor.operatorId);
    const shell = document.createElement("section");
    shell.className = "admin-batk-editor";

    const toolbar = document.createElement("div");
    toolbar.className = "admin-batk-toolbar";
    const operatorField = createAdminBatkInput("Operator", String(editor.operatorId), {
        select: adminPanelState.operators.map(operator => ({ value: String(operator.id), label: operator.name })),
        onInput: value => {
            loadAdminBatkEditor(Number(value));
            setAdminReviewStatus("");
            renderAdminReviewList();
        }
    });
    const formOptions = [...profiles.keys()].map(formKey => ({ value: formKey, label: formatAdminLabel(formKey) }));
    formOptions.push({ value: "__new__", label: "+ New profile" });
    const activeFormValue = profiles.has(editor.formKey) ? editor.formKey : "__new__";
    const formField = createAdminBatkInput("Profile", activeFormValue, {
        select: formOptions,
        onInput: value => {
            if (value === "__new__") {
                const operator = adminPanelState.operators.find(item => Number(item.id) === editor.operatorId);
                adminPanelState.batkEditor = createEmptyAdminBatkEditor(operator, "new_form");
            } else {
                loadAdminBatkEditor(editor.operatorId, value);
            }
            setAdminReviewStatus("");
            renderAdminReviewList();
        }
    });
    toolbar.append(operatorField, formField);

    const profileFields = document.createElement("div");
    profileFields.className = "admin-batk-profile-fields";
    const updateProfile = (key, value) => {
        editor[key] = value;
        renderAdminBatkPreview();
    };
    profileFields.append(
        createAdminBatkInput("Form key", editor.formKey, { onInput: value => updateProfile("formKey", value.toLowerCase().replace(/[^a-z0-9_]/g, "_")) }),
        createAdminBatkInput("Attack name", editor.attackName, { wide: true, onInput: value => updateProfile("attackName", value) }),
        createAdminBatkInput("Timing mode", editor.timingMode, {
            select: [{ value: "absolute", label: "Absolute from sequence start" }, { value: "intervals", label: "Intervals between hits" }],
            onInput: value => updateProfile("timingMode", value)
        }),
        createAdminBatkInput("In-game verified", editor.verified, { type: "checkbox", onInput: value => updateProfile("verified", value) }),
        createAdminBatkInput("Description", editor.description, { wide: true, multiline: true, onInput: value => updateProfile("description", value) }),
        createAdminBatkInput("Source URL", editor.sourceUrl, { wide: true, type: "url", onInput: value => updateProfile("sourceUrl", value) }),
        createAdminBatkInput("Icon path", editor.iconPath, { wide: true, onInput: value => updateProfile("iconPath", value) }),
        createAdminBatkInput("Source note", editor.sourceNote, { wide: true, onInput: value => updateProfile("sourceNote", value) })
    );

    const previewHeader = document.createElement("div");
    previewHeader.className = "admin-batk-section-heading";
    previewHeader.append(
        createAdminTextElement("strong", "", "Live preview"),
        createAdminTextElement("span", "", "Hit markers use the selected timing mode")
    );
    const preview = document.createElement("div");
    preview.id = "adminBatkPreview";
    preview.className = "admin-batk-preview";

    const sequencesHeader = document.createElement("div");
    sequencesHeader.className = "admin-batk-section-heading";
    sequencesHeader.appendChild(createAdminTextElement("strong", "", `${editor.sequences.length} sequence${editor.sequences.length === 1 ? "" : "s"}`));
    const addSequence = createAdminActionButton("+ Add sequence", () => {
        editor.sequences.push({
            label: `SEQ ${editor.sequences.length + 1}`,
            kind: "normal",
            duration: "1",
            hitTimings: "0.5",
            hitMultipliers: "",
            atkMultiplierTotal: "1",
            staggerMultiplier: "0",
            eventHitIndex: "",
            emits: "",
            endsCycle: false
        });
        renderAdminReviewList();
    }, { disabled: adminPanelState.batkSaving || editor.sequences.length >= 20 });
    sequencesHeader.appendChild(addSequence);

    const sequenceGrid = document.createElement("div");
    sequenceGrid.className = "admin-batk-sequence-grid";
    editor.sequences.forEach((sequence, index) => sequenceGrid.appendChild(createAdminBatkSequenceCard(sequence, index)));

    const actions = document.createElement("div");
    actions.className = "admin-batk-actions";
    actions.append(
        createAdminTextElement("span", "admin-batk-save-note", "Saving replaces this complete operator/form profile in Supabase."),
        createAdminActionButton(adminPanelState.batkSaving ? "Saving..." : "Save BATK profile", saveAdminBatkProfile, {
            primary: true,
            disabled: adminPanelState.batkSaving
        })
    );

    shell.append(toolbar, profileFields, previewHeader, preview, sequencesHeader, sequenceGrid, actions);
    list.appendChild(shell);
    renderAdminBatkPreview();
}

async function saveAdminBatkProfile() {
    const client = getAdminSupabaseClient();
    const editor = adminPanelState.batkEditor;
    if (!client || !editor || adminPanelState.batkSaving) return;

    try {
        const payload = validateAdminBatkEditor(editor);
        adminPanelState.batkSaving = true;
        setAdminReviewStatus("Saving BATK profile to Supabase...");
        renderAdminReviewList();

        const { data, error } = await client.rpc("replace_operator_basic_attack_profile", {
            target_operator_id: editor.operatorId,
            target_form_key: editor.formKey,
            profile_data: payload
        });
        if (error) throw error;
        if (!Array.isArray(data) || !data.length) throw new Error("Supabase returned no BATK sequences.");

        adminPanelState.batkRows = adminPanelState.batkRows
            .filter(row => !(Number(row.operator_id) === editor.operatorId && String(row.form_key) === editor.formKey))
            .concat(data);
        loadAdminBatkEditor(editor.operatorId, editor.formKey);
        setAdminReviewStatus("BATK profile saved. Planner data is live after reload; static operator pages update with the next GitHub build.", "is-success");
    } catch (error) {
        console.error("BATK profile save failed:", error);
        setAdminReviewStatus(error?.message || "BATK profile could not be saved. Run supabase/basic_attack_admin_editor.sql first.", "is-error");
    } finally {
        adminPanelState.batkSaving = false;
        renderAdminReviewList();
    }
}

function renderAdminReviewList() {
    const list = document.getElementById("adminReviewList");
    if (!list) return;

    list.classList.toggle("is-operators", adminPanelState.activeTab === "operators");
    list.classList.toggle("is-batk", adminPanelState.activeTab === "batk");
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
        const isOperatorTab = adminPanelState.activeTab === "operators";
        const isBatkTab = adminPanelState.activeTab === "batk";
        setAdminListState(list, {
            type: "error",
            title: isBatkTab ? "BATK editor unavailable" : (isOperatorTab ? "Operator settings unavailable" : "Review queue unavailable"),
            message: adminPanelState.reviewError,
            actionLabel: "Try again",
            action: fetchAdminActiveContent
        });
        return;
    }

    if (!adminPanelState.loaded) {
        const isOperatorTab = adminPanelState.activeTab === "operators";
        const isBatkTab = adminPanelState.activeTab === "batk";
        setAdminListState(list, {
            title: isBatkTab ? "Ready to edit BATK profiles" : (isOperatorTab ? "Ready to manage operators" : "Ready for review"),
            message: isBatkTab
                ? "Operator Basic Attack profiles will appear here after the first refresh."
                : isOperatorTab
                ? "Operator visibility settings will appear here after the first refresh."
                : "Pending rotations will appear here after the first refresh."
        });
        return;
    }

    if (adminPanelState.activeTab === "batk") {
        renderAdminBatkEditor(list);
        return;
    }

    if (adminPanelState.activeTab === "operators") {
        renderAdminOperatorEditor(list);
        return;
    }

    if (adminPanelState.activeTab === "reports") {
        if (!adminPanelState.reports.length) {
            const activeTab = getActiveAdminTab();
            setAdminListState(list, {
                type: "empty",
                title: activeTab.emptyTitle,
                message: activeTab.emptyMessage,
                actionLabel: "Refresh",
                action: fetchAdminActiveContent
            });
            return;
        }
        adminPanelState.reports.forEach(row => list.appendChild(createAdminIssueReportCard(row)));
        return;
    }

    const entries = adminPanelState.rotations;

    if (!entries.length) {
        const activeTab = getActiveAdminTab();
        setAdminListState(list, {
            type: "empty",
            title: activeTab.emptyTitle,
            message: activeTab.emptyMessage,
            actionLabel: "Refresh",
            action: fetchAdminActiveContent
        });
        return;
    }

    entries.forEach(row => list.appendChild(createAdminReviewCard(row)));
}

function renderAdminPanel() {
    const loginPanel = document.getElementById("adminLoginPanel");
    const reviewPanel = document.getElementById("adminReviewPanel");
    const userName = document.getElementById("adminUserName");
    const signOutButton = document.getElementById("adminLoginSignOutBtn");
    const loginButton = document.getElementById("adminLoginButton");

    const canReview = Boolean(adminPanelState.session && adminPanelState.isAdmin);

    if (loginPanel) loginPanel.hidden = canReview;
    if (reviewPanel) reviewPanel.hidden = !canReview;
    if (userName) userName.textContent = adminPanelState.username || getAdminFallbackUsername();
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
    const panel = document.getElementById("adminPanelView");
    const canShowAdmin = Boolean(adminPanelState.session && adminPanelState.isAdmin);

    if (openButton) openButton.hidden = !canShowAdmin;
    if (!canShowAdmin && panel && !panel.hidden) {
        closeAdminPanel();
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
        adminPanelState.username = getAdminFallbackUsername(adminPanelState.session);
        adminPanelState.rotations = [];
        adminPanelState.operators = [];
        adminPanelState.operatorEditor = null;
        adminPanelState.batkRows = [];
        adminPanelState.batkEditor = null;
        adminPanelState.actionIds.clear();
        adminPanelState.operatorActionIds.clear();
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

        await loadAdminUsername(client);
        setAdminAuthStatus("");
        if (loadPending) {
            await fetchAdminActiveContent();
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
            .select("id,title,description,author_name,share_code,setup_version,team_operator_ids,rotation_skill_ids,element_types,operator_classes,payload,likes_count,view_count,is_approved,is_hidden,review_note,reviewed_at,created_at,updated_at")
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

async function fetchAdminOperators() {
    const client = getAdminSupabaseClient();
    if (!client || !adminPanelState.isAdmin) return;

    adminPanelState.loading = true;
    adminPanelState.loaded = false;
    adminPanelState.reviewError = "";
    setAdminReviewStatus("");
    renderAdminReviewList();

    try {
        const { data, error } = await client
            .from("operators")
            .select("*")
            .eq("game", "arknights_endfield")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

        if (error) throw error;

        adminPanelState.operators = Array.isArray(data) ? data : [];
        const selectedId = adminPanelState.operatorEditor?.id;
        loadAdminOperatorEditor(
            adminPanelState.operators.some(operator => Number(operator.id) === Number(selectedId))
                ? selectedId
                : adminPanelState.operators[0]?.id
        );
        adminPanelState.loaded = true;
    } catch (error) {
        console.error("Admin operator visibility could not be loaded:", error);
        adminPanelState.loaded = true;
        adminPanelState.operators = [];
        adminPanelState.reviewError = "Operator data could not be loaded. Run the latest operator admin migrations and refresh.";
    } finally {
        adminPanelState.loading = false;
        renderAdminReviewList();
    }
}

async function fetchAdminBatkData() {
    const client = getAdminSupabaseClient();
    if (!client || !adminPanelState.isAdmin) return;

    adminPanelState.loading = true;
    adminPanelState.loaded = false;
    adminPanelState.reviewError = "";
    setAdminReviewStatus("");
    renderAdminReviewList();

    try {
        const [operatorResult, batkResult] = await Promise.all([
            client
                .from("operators")
                .select("id,name,slug,icon_path,sort_order")
                .eq("game", "arknights_endfield")
                .order("sort_order", { ascending: true })
                .order("name", { ascending: true }),
            client
                .from("operator_basic_attack_sequences")
                .select("*")
                .eq("game", "arknights_endfield")
                .order("operator_id", { ascending: true })
                .order("form_key", { ascending: true })
                .order("sequence_index", { ascending: true })
        ]);

        if (operatorResult.error) throw operatorResult.error;
        if (batkResult.error) throw batkResult.error;

        adminPanelState.operators = Array.isArray(operatorResult.data) ? operatorResult.data : [];
        adminPanelState.batkRows = Array.isArray(batkResult.data) ? batkResult.data : [];
        adminPanelState.loaded = true;

        const currentOperatorStillExists = adminPanelState.operators.some(operator => (
            Number(operator.id) === Number(adminPanelState.batkEditor?.operatorId)
        ));
        if (!currentOperatorStillExists) {
            adminPanelState.batkEditor = null;
        } else {
            loadAdminBatkEditor(adminPanelState.batkEditor.operatorId, adminPanelState.batkEditor.formKey);
        }
    } catch (error) {
        console.error("Admin BATK profiles could not be loaded:", error);
        adminPanelState.loaded = true;
        adminPanelState.operators = [];
        adminPanelState.batkRows = [];
        adminPanelState.batkEditor = null;
        adminPanelState.reviewError = "BATK profiles could not be loaded. Check Supabase access and the Basic Attack table.";
    } finally {
        adminPanelState.loading = false;
        renderAdminReviewList();
    }
}

async function fetchAdminIssueReports() {
    const client = getAdminSupabaseClient();
    if (!client || !adminPanelState.isAdmin) return;

    adminPanelState.loading = true;
    adminPanelState.loaded = false;
    adminPanelState.reviewError = "";
    setAdminReviewStatus("");
    renderAdminReviewList();

    try {
        const { data, error } = await client
            .from("issue_reports")
            .select("id,report_type,description,additional_information,page_url,team_operator_ids,team_operator_names,status,review_note,reviewed_at,created_at,updated_at")
            .eq("game", "arknights_endfield")
            .order("created_at", { ascending: false });
        if (error) throw error;
        adminPanelState.reports = Array.isArray(data) ? data : [];
        adminPanelState.loaded = true;
    } catch (error) {
        console.error("Admin issue reports could not be loaded:", error);
        adminPanelState.reports = [];
        adminPanelState.loaded = true;
        adminPanelState.reviewError = "Issue reports could not be loaded. Run the latest supabase/issue_reports.sql and refresh.";
    } finally {
        adminPanelState.loading = false;
        renderAdminReviewList();
    }
}

async function setAdminIssueReportStatus(reportId, status) {
    const client = getAdminSupabaseClient();
    if (!client || !reportId) return;

    let reviewNote = "";
    if (status === "dismissed") {
        const note = prompt("Optional internal note. Leave empty if no note is needed:");
        if (note === null) return;
        reviewNote = note.trim();
    }

    const id = String(reportId);
    adminPanelState.reportActionIds.add(id);
    setAdminReviewStatus(`Setting report to ${formatAdminReportStatus(status).toLowerCase()}...`);
    renderAdminReviewList();

    try {
        const { data, error } = await client.rpc("set_issue_report_status", {
            target_report_id: reportId,
            report_status: status,
            admin_review_note: reviewNote
        });
        if (error) throw error;
        const updated = Array.isArray(data) ? data[0] : data;
        adminPanelState.reports = adminPanelState.reports.map(row => (
            String(row.id) === id ? { ...row, ...updated, status, review_note: reviewNote } : row
        ));
        setAdminReviewStatus(`Report marked as ${formatAdminReportStatus(status).toLowerCase()}.`, "is-success");
    } catch (error) {
        console.error("Issue report status update failed:", error);
        setAdminReviewStatus(error?.message || "Report status could not be updated.", "is-error");
    } finally {
        adminPanelState.reportActionIds.delete(id);
        renderAdminReviewList();
    }
}

async function fetchAdminActiveContent() {
    if (adminPanelState.activeTab === "reports") return fetchAdminIssueReports();
    if (adminPanelState.activeTab === "operators") return fetchAdminOperators();
    if (adminPanelState.activeTab === "batk") return fetchAdminBatkData();
    return fetchAdminReviewRotations();
}

async function fetchAdminPendingRotations() {
    return fetchAdminActiveContent();
}

function setAdminReviewTab(tabId) {
    if (!ADMIN_REVIEW_TABS.some(tab => tab.id === tabId) || adminPanelState.activeTab === tabId) return;

    adminPanelState.activeTab = tabId;
    adminPanelState.detailRotationId = "";
    adminPanelState.rotations = [];
    adminPanelState.reports = [];
    adminPanelState.operators = [];
    adminPanelState.operatorEditor = null;
    adminPanelState.batkRows = [];
    adminPanelState.batkEditor = null;
    adminPanelState.actionIds.clear();
    adminPanelState.reportActionIds.clear();
    adminPanelState.operatorActionIds.clear();
    adminPanelState.loaded = false;
    adminPanelState.reviewError = "";
    setAdminReviewStatus("");
    renderAdminPanel();
    fetchAdminActiveContent();
}

async function setAdminOperatorVisibility(operatorId, shouldBeVisible) {
    const client = getAdminSupabaseClient();
    if (!client || !operatorId) return;

    const id = String(operatorId);
    const operator = adminPanelState.operators.find(item => String(item.id) === id);
    adminPanelState.operatorActionIds.add(id);
    setAdminReviewStatus(`${shouldBeVisible ? "Showing" : "Hiding"} ${operator?.name || "operator"}...`);
    renderAdminReviewList();

    try {
        const { data, error } = await client.rpc("set_operator_visibility", {
            target_operator_id: Number(operatorId),
            should_be_visible: shouldBeVisible === true
        });

        if (error) throw error;
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Supabase did not update the operator.");
        }

        adminPanelState.operators = adminPanelState.operators.map(item => (
            String(item.id) === id
                ? { ...item, is_visible: shouldBeVisible === true, updated_at: data[0]?.updated_at || item.updated_at }
                : item
        ));
        if (Number(adminPanelState.operatorEditor?.id) === Number(operatorId)) {
            adminPanelState.operatorEditor.isVisible = shouldBeVisible === true;
        }
        setAdminReviewStatus(
            `${operator?.name || "Operator"}: ${shouldBeVisible ? "shown" : "hidden"}. Planner: reload; operator pages: next build.`,
            "is-success"
        );
    } catch (error) {
        console.error("Operator visibility update failed:", error);
        setAdminReviewStatus(
            error?.message || "Operator visibility could not be saved. Run supabase/operator_visibility_admin.sql and check admin access.",
            "is-error"
        );
    } finally {
        adminPanelState.operatorActionIds.delete(id);
        renderAdminReviewList();
    }
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
    adminPanelState.username = "";
    adminPanelState.rotations = [];
    adminPanelState.operators = [];
    adminPanelState.batkRows = [];
    adminPanelState.batkEditor = null;
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
    const panel = document.getElementById("adminPanelView");
    if (!panel) return;

    panel.hidden = false;
    document.body.classList.add("admin-page-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    refreshAdminSession();
}

function closeAdminPanel() {
    const panel = document.getElementById("adminPanelView");
    if (!panel) return;

    panel.hidden = true;
    document.body.classList.remove("admin-page-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    if (openButton) openButton.addEventListener("click", openAdminPanel);
    if (closeButton) closeButton.addEventListener("click", closeAdminPanel);
    if (loginForm) loginForm.addEventListener("submit", signInAdmin);
    if (signOutButton) signOutButton.addEventListener("click", signOutAdmin);
    if (loginSignOutButton) loginSignOutButton.addEventListener("click", signOutAdmin);
    if (refreshButton) refreshButton.addEventListener("click", fetchAdminPendingRotations);

    document.addEventListener("keydown", event => {
        const panel = document.getElementById("adminPanelView");
        if (event.key === "Escape" && panel && !panel.hidden) {
            closeAdminPanel();
        }
    });

    const client = getAdminSupabaseClient();
    if (client?.auth?.onAuthStateChange) {
        client.auth.onAuthStateChange((_event, session) => {
            adminPanelState.session = session || null;
            adminPanelState.isAdmin = false;
            adminPanelState.username = getAdminFallbackUsername(session);
            adminPanelState.rotations = [];
            adminPanelState.operators = [];
            adminPanelState.batkRows = [];
            adminPanelState.batkEditor = null;
            adminPanelState.actionIds.clear();
            adminPanelState.operatorActionIds.clear();
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
