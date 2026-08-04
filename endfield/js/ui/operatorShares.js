(() => {
    const root = document.querySelector("[data-operator-share-browser]");
    if (!root) return;

    const operatorId = Number(root.dataset.operatorId);
    const operatorName = root.dataset.operatorName || "this operator";
    const panel = document.getElementById("operator-share-results");
    const heading = panel?.querySelector("[data-share-results-title]");
    const status = panel?.querySelector("[data-share-results-status]");
    const list = panel?.querySelector("[data-share-results-list]");
    const buttons = Array.from(root.querySelectorAll("[data-share-type]"));
    const loadedTypes = new Map();

    if (!Number.isInteger(operatorId) || !panel || !heading || !status || !list || buttons.length === 0) return;

    function getClient() {
        return typeof supabaseClient !== "undefined" ? supabaseClient : null;
    }

    function setCount(type, value) {
        const count = root.querySelector(`[data-share-count="${type}"]`);
        if (count) count.textContent = String(Math.max(0, Number(value) || 0));
    }

    function typeLabel(type, singular = false) {
        if (type === "simulation") return singular ? "Simulation" : "Simulations";
        return singular ? "Rotation" : "Rotations";
    }

    function readableDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Unknown date";
        return new Intl.DateTimeFormat(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        }).format(date);
    }

    function createShareCard(item) {
        const card = document.createElement("article");
        card.className = "operator-share-card";

        const copy = document.createElement("div");
        copy.className = "operator-share-card-copy";

        const title = document.createElement("strong");
        title.textContent = `${typeLabel(item.share_type, true)} ${item.short_code}`;

        const team = document.createElement("span");
        const names = Array.isArray(item.operator_names) ? item.operator_names.filter(Boolean) : [];
        team.textContent = names.length > 0 ? names.join(" · ") : operatorName;

        const meta = document.createElement("small");
        meta.textContent = `Created ${readableDate(item.created_at)}`;

        copy.append(title, team, meta);

        const open = document.createElement("a");
        open.className = "operator-share-open";
        open.href = `/endfield/#share=${encodeURIComponent(item.short_code)}`;
        open.textContent = "Open ↗";
        open.setAttribute("aria-label", `Open ${typeLabel(item.share_type, true).toLowerCase()} ${item.short_code}`);

        card.append(copy, open);
        return card;
    }

    function renderShares(type, payload) {
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const total = Math.max(0, Number(payload?.total) || 0);
        list.replaceChildren(...items.map(createShareCard));
        heading.textContent = `${operatorName} ${typeLabel(type)}`;
        status.textContent = total === 0
            ? `No public ${typeLabel(type).toLowerCase()} with ${operatorName} yet.`
            : `${total} public ${total === 1 ? typeLabel(type, true).toLowerCase() : typeLabel(type).toLowerCase()} found${total > items.length ? ` · newest ${items.length} shown` : ""}.`;
        status.hidden = false;
    }

    function setActiveType(type) {
        buttons.forEach(button => {
            const active = button.dataset.shareType === type;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });
    }

    async function loadType(type) {
        panel.hidden = false;
        setActiveType(type);
        heading.textContent = `${operatorName} ${typeLabel(type)}`;

        if (loadedTypes.has(type)) {
            renderShares(type, loadedTypes.get(type));
            panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
            return;
        }

        status.hidden = false;
        status.textContent = `Loading ${typeLabel(type).toLowerCase()}…`;
        list.replaceChildren();

        const client = getClient();
        if (!client?.rpc) {
            status.textContent = "Share data is unavailable right now.";
            return;
        }

        const { data, error } = await client.rpc("list_operator_shares", {
            p_operator_id: operatorId,
            p_share_type: type,
            p_limit: 12,
            p_offset: 0
        });
        if (error) {
            console.error("Operator shares could not be loaded:", error);
            status.textContent = "The shares could not be loaded. Please try again.";
            return;
        }

        loadedTypes.set(type, data || { total: 0, items: [] });
        renderShares(type, loadedTypes.get(type));
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    async function loadSummary() {
        const client = getClient();
        if (!client?.rpc) return;

        const { data, error } = await client.rpc("get_operator_share_summary", {
            p_operator_id: operatorId
        });
        if (error) {
            console.error("Operator share counts could not be loaded:", error);
            buttons.forEach(button => button.classList.add("has-error"));
            return;
        }

        setCount("rotation", data?.rotation_count);
        setCount("simulation", data?.simulation_count);
        buttons.forEach(button => button.classList.remove("is-loading"));
    }

    buttons.forEach(button => {
        button.addEventListener("click", () => loadType(button.dataset.shareType));
    });

    loadSummary();
})();
