const plannerAnalyticsReport = { days: 7, entryKind: "all", data: null, request: 0 };

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
            p_days: plannerAnalyticsReport.days, p_entry_kind: plannerAnalyticsReport.entryKind
        });
        if (error) throw error;
        if (current()) plannerAnalyticsReport.data = data;
    } catch {
        if (current()) adminPanelState.reviewError = "Usage could not be loaded. Run supabase/planner_analytics.sql after admin_panel.sql, then refresh.";
    } finally {
        if (current()) {
            adminPanelState.loading = false;
            adminPanelState.loaded = true;
            renderAdminReviewList();
        }
    }
}

function renderPlannerAnalyticsReport(list) {
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
    section.append(toolbar, createAdminTextElement("p", "", "One visit means one page load, not one unique person. Each step counts at most once per visit. Steps can be skipped when using existing setups."));
    const counts = plannerAnalyticsReport.data?.counts || {};
    const total = Number(counts.builder_opened) || 0;
    if (!total) {
        section.appendChild(createAdminTextElement("p", "", "No measured visits for these filters yet. Collection starts after the migration and website update are live; earlier activity cannot be reconstructed."));
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
    section.append(table, createAdminTextElement("p", "", "Only production visits with usage measurement allowed by the browser are counted. Signed-in admins are excluded, including the current visit when signing in later. Older anonymous visits cannot be identified retroactively. Loading an example or restoring a rotation does not count as manually placing a skill. A denied clipboard write does not undo a successful publication."));
    list.appendChild(section);
}
