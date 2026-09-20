(() => {
    const roots = Array.from(document.querySelectorAll("[data-profile-engagement]"));
    if (roots.length === 0) return;

    const VISITOR_STORAGE_KEY = "rotationforge.profileVisitorId.v1";
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const countFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

    function getClient() {
        return typeof supabaseClient !== "undefined" ? supabaseClient : null;
    }

    function createVisitorId() {
        if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();

        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    function getVisitorId() {
        try {
            const stored = localStorage.getItem(VISITOR_STORAGE_KEY);
            if (UUID_PATTERN.test(stored || "")) return stored;
        } catch (_) {
            // Privacy settings can block storage. The in-memory ID still lets reactions work.
        }

        const visitorId = createVisitorId();
        try {
            localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
        } catch (_) {}
        return visitorId;
    }

    function formatCount(value) {
        const number = Number(value);
        return countFormatter.format(Number.isFinite(number) && number >= 0 ? number : 0);
    }

    function initialize(root, visitorId) {
        const contentType = root.dataset.contentType;
        const contentId = root.dataset.contentId;
        const summaryOnly = root.dataset.engagementMode === "summary";
        const buttons = Array.from(root.querySelectorAll("[data-profile-reaction]"));
        const status = root.querySelector("[data-engagement-status]");
        let currentReaction = null;
        let busy = false;

        if (!["operator", "enemy"].includes(contentType) || !contentId) return Promise.resolve();
        if (summaryOnly ? buttons.length !== 0 : (!status || buttons.length !== 2)) return Promise.resolve();

        function setBusy(nextBusy) {
            busy = nextBusy;
            root.classList.toggle("is-loading", nextBusy);
            buttons.forEach(button => { button.disabled = nextBusy; });
        }

        function setUnavailable(message) {
            root.classList.remove("is-loading");
            root.classList.add("has-error");
            buttons.forEach(button => { button.disabled = true; });
            if (status) status.textContent = message;
        }

        function setCount(name, value) {
            const target = root.querySelector(`[data-engagement-count="${name}"]`);
            if (target) target.textContent = formatCount(value);
        }

        function render(summary) {
            currentReaction = ["like", "dislike"].includes(summary?.reaction)
                ? summary.reaction
                : null;
            setCount("views", summary?.view_count);
            setCount("likes", summary?.like_count);
            setCount("dislikes", summary?.dislike_count);
            buttons.forEach(button => {
                const selected = button.dataset.profileReaction === currentReaction;
                button.setAttribute("aria-pressed", String(selected));
            });
            root.classList.remove("has-error");
        }

        async function load() {
            const client = getClient();
            if (!client?.rpc) {
                setUnavailable(summaryOnly ? "Engagement summary is unavailable right now." : "Page reactions are unavailable right now.");
                return;
            }

            setBusy(true);
            const { data, error } = await client.rpc(summaryOnly ? "get_profile_engagement" : "record_profile_view", {
                p_content_type: contentType,
                p_content_id: contentId,
                p_visitor_id: visitorId
            });

            if (error) {
                console.warn("Profile engagement could not be loaded:", error);
                setUnavailable(summaryOnly ? "Engagement summary could not be loaded." : "Page reactions could not be loaded.");
                return;
            }

            render(data || {});
            if (status) status.textContent = "Page engagement loaded.";
            setBusy(false);
        }

        async function updateReaction(button) {
            if (busy) return;
            const client = getClient();
            if (!client?.rpc) return;

            const selectedReaction = button.dataset.profileReaction;
            const nextReaction = currentReaction === selectedReaction ? null : selectedReaction;
            setBusy(true);
            status.textContent = "Saving reaction…";

            const { data, error } = await client.rpc("set_profile_reaction", {
                p_content_type: contentType,
                p_content_id: contentId,
                p_visitor_id: visitorId,
                p_reaction: nextReaction
            });

            if (error) {
                console.warn("Profile reaction could not be saved:", error);
                root.classList.add("has-error");
                status.textContent = "Your reaction could not be saved. Please try again.";
                setBusy(false);
                return;
            }

            render(data || {});
            status.textContent = nextReaction ? `Your ${nextReaction} was saved.` : "Your reaction was removed.";
            setBusy(false);
        }

        if (!summaryOnly) buttons.forEach(button => button.addEventListener("click", () => updateReaction(button)));
        return load();
    }

    const visitorId = getVisitorId();
    const profileRoots = roots.filter(root => root.dataset.engagementMode !== "summary");
    const summaryRoots = roots.filter(root => root.dataset.engagementMode === "summary");
    profileRoots.forEach(root => { void initialize(root, visitorId); });

    let nextSummary = 0;
    async function loadSummaryQueue() {
        while (nextSummary < summaryRoots.length) {
            const root = summaryRoots[nextSummary++];
            await initialize(root, visitorId);
        }
    }
    const workerCount = Math.min(6, summaryRoots.length);
    for (let index = 0; index < workerCount; index += 1) void loadSummaryQueue();
})();
