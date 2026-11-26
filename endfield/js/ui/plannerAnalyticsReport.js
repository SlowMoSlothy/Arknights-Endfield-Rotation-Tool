const plannerAnalyticsReport = { days: 7, entryKind: "all", deviceType: "all", data: null, request: 0, focusDevice: null };
const PLANNER_USAGE_DEVICES = [["all", "All devices"], ["mobile", "Phone"], ["tablet", "Tablet"], ["desktop", "PC"], ["unknown", "Unknown"]];

async function fetchPlannerAnalyticsReport() {
    const client = getAdminSupabaseClient();
    if (!client || !adminPanelState.isAdmin) return;
    const request = ++plannerAnalyticsReport.request;
    adminPanelState.loading = true;
    adminPanelState.loaded = false;
    adminPanelState.reviewError = "";
    plannerAnalyticsReport.data = null;
    renderAdminReviewList();
    const current = () => request === plannerAnalyticsReport.request
        && adminPanelState.activeTab === "usage" && adminPanelState.isAdmin;
    try {
        const { data, error } = await client.rpc("get_planner_funnel", {
            p_days: plannerAnalyticsReport.days, p_entry_kind: plannerAnalyticsReport.entryKind,
            p_device_type: plannerAnalyticsReport.deviceType
        });
        if (error) throw error;
        if (current()) plannerAnalyticsReport.data = data;
    } catch {
        if (current()) adminPanelState.reviewError = "Usage could not be loaded. Run supabase/planner_analytics_devices.sql after planner_analytics.sql, then refresh.";
    } finally {
        if (current()) {
            adminPanelState.loading = false;
            adminPanelState.loaded = true;
            renderAdminReviewList();
            plannerAnalyticsReport.focusDevice = null;
        }
    }
}

function renderPlannerAnalyticsReport(list) {
    if (!adminPanelState.isAdmin) {
        plannerAnalyticsReport.data = null;
        plannerAnalyticsReport.focusDevice = null;
        ++plannerAnalyticsReport.request;
        return;
    }
    const section = createAdminTextElement("section", "planner-usage-report", "");
    const toolbar = createAdminTextElement("div", "planner-usage-filters", "");
    function filter(label, options, selected, change) {
        const field = createAdminTextElement("label", "", label);
        const select = document.createElement("select");
        for (const [value, name] of options) {
            const option = createAdminTextElement("option", "", name);
            option.value = String(value);
            select.appendChild(option);
        }
        select.value = String(selected);
        select.addEventListener("change", () => { change(select.value); fetchPlannerAnalyticsReport(); });
        field.appendChild(select);
        toolbar.appendChild(field);
    }
    filter("Period", [[7, "Last 7 days"], [30, "Last 30 days"]], plannerAnalyticsReport.days,
        value => { plannerAnalyticsReport.days = Number(value); });
    filter("Starting setup", [["all", "All visits"], ["new", "Empty builder"], ["restored", "Local setup restored"], ["shared", "Shared setup opened"]],
        plannerAnalyticsReport.entryKind, value => { plannerAnalyticsReport.entryKind = value; });
    section.appendChild(toolbar);
    const tabs = createAdminTextElement("div", "planner-usage-device-tabs", "");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Device type");
    const available = !adminPanelState.loading && !adminPanelState.reviewError && plannerAnalyticsReport.data;
    const deviceCounts = plannerAnalyticsReport.data?.devices || {};
    const allCount = Object.values(deviceCounts).reduce((sum, count) => sum + Number(count || 0), 0);
    function selectDevice(value) {
        plannerAnalyticsReport.deviceType = value;
        plannerAnalyticsReport.focusDevice = value;
        fetchPlannerAnalyticsReport();
    }
    PLANNER_USAGE_DEVICES.forEach(([value, label], index) => {
        const button = createAdminTextElement("button", "planner-usage-device-tab", "");
        button.type = "button";
        button.id = `plannerUsageDevice-${value}`;
        button.setAttribute("role", "tab");
        button.setAttribute("aria-selected", String(value === plannerAnalyticsReport.deviceType));
        button.setAttribute("aria-controls", "plannerUsageDevicePanel");
        button.tabIndex = value === plannerAnalyticsReport.deviceType ? 0 : -1;
        button.append(createAdminTextElement("span", "", label), createAdminTextElement("strong", "", available
            ? String(value === "all" ? allCount : Number(deviceCounts[value]) || 0) : "—"));
        button.addEventListener("click", () => selectDevice(value));
        button.addEventListener("keydown", event => {
            const next = event.key === "ArrowRight" ? (index + 1) % PLANNER_USAGE_DEVICES.length
                : event.key === "ArrowLeft" ? (index + PLANNER_USAGE_DEVICES.length - 1) % PLANNER_USAGE_DEVICES.length
                    : event.key === "Home" ? 0 : event.key === "End" ? PLANNER_USAGE_DEVICES.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault();
            selectDevice(PLANNER_USAGE_DEVICES[next][0]);
        });
        tabs.appendChild(button);
    });
    section.appendChild(tabs);
    const panel = createAdminTextElement("div", "planner-usage-device-panel", "");
    panel.id = "plannerUsageDevicePanel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `plannerUsageDevice-${plannerAnalyticsReport.deviceType}`);
    panel.setAttribute("aria-busy", String(Boolean(adminPanelState.loading)));
    section.appendChild(panel);
    list.appendChild(section);
    if (plannerAnalyticsReport.focusDevice) document.getElementById(`plannerUsageDevice-${plannerAnalyticsReport.focusDevice}`)?.focus();
    if (adminPanelState.loading || (!adminPanelState.loaded && !plannerAnalyticsReport.data && !adminPanelState.reviewError)) {
        const status = createAdminTextElement("p", "", "Loading usage for this device group…");
        status.setAttribute("role", "status");
        panel.appendChild(status);
        return;
    }
    if (adminPanelState.reviewError) {
        const error = createAdminTextElement("p", "", adminPanelState.reviewError);
        error.setAttribute("role", "alert");
        const retry = createAdminTextElement("button", "planner-usage-retry", "Try again");
        retry.type = "button";
        retry.addEventListener("click", fetchPlannerAnalyticsReport);
        panel.append(error, retry);
        return;
    }
    const reset = plannerAnalyticsReport.data?.reset_at ? new Date(plannerAnalyticsReport.data.reset_at) : null;
    if (reset && !Number.isNaN(reset.getTime())) panel.appendChild(createAdminTextElement("p", "planner-usage-reset-date", `Statistics restarted: ${reset.toLocaleString()}. Earlier visits are excluded.`));
    panel.appendChild(createAdminTextElement("p", "", "One visit means one page load, not one unique person. Each step counts at most once per visit. Steps can be skipped when using existing setups."));
    const counts = plannerAnalyticsReport.data?.counts || {};
    const total = Number(counts.builder_opened) || 0;
    if (!total) {
        panel.appendChild(createAdminTextElement("p", "", "No measured visits for these filters yet. Device grouping starts after the database and website update are live; earlier devices cannot be reconstructed."));
    }
    const table = document.createElement("table");
    const caption = createAdminTextElement("caption", "", "Builder steps reached during the selected visits");
    const head = document.createElement("thead");
    const header = document.createElement("tr");
    for (const text of ["Step", "Visits", "Of opened"]) {
        const cell = createAdminTextElement("th", "", text);
        cell.scope = "col";
        header.appendChild(cell);
    }
    head.appendChild(header);
    const body = document.createElement("tbody");
    for (const [event, label] of [
        ["builder_opened", "Builder opened"], ["builder_ready", "Builder loaded successfully"],
        ["team_selected", "Team selected manually"], ["first_skill_placed", "First action placed manually"],
        ["share_opened", "Share form opened"], ["share_published", "Published successfully"],
        ["builder_failed", "Builder or operator loading failed"], ["share_failed", "Publication failed"],
        ["example_loaded", "Example loaded"]
    ]) {
        const count = Number(counts[event]) || 0;
        const row = document.createElement("tr");
        row.append(createAdminTextElement("td", "", label), createAdminTextElement("td", "", String(count)),
            createAdminTextElement("td", "", total ? `${(count / total * 100).toFixed(1)}%` : "—"));
        body.appendChild(row);
    }
    table.append(caption, head, body);
    panel.append(table,
        createAdminTextElement("p", "", "Device type is estimated once per visit. Unknown includes browsers without a usable device hint. Resizing or rotating the screen does not change the group."),
        createAdminTextElement("p", "", "Only production visits with usage measurement allowed by the browser are counted. Signed-in admins are excluded, including the current visit when signing in later. Older anonymous visits cannot be identified retroactively. Loading an example or restoring a rotation does not count as manually placing a skill. A denied clipboard write does not undo a successful publication."));
}
