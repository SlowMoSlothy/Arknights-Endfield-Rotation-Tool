(() => {
    "use strict";
    const storageKey = "rotationforge.profileVisitorId.v1";
    let visitorId;
    const cache = new Map();
    const busy = new Set();
    const versions = new Map();
    const errors = new Map();
    const roots = new Set();
    const icons = {
        views: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
        like: '<path d="M7 10v11H3V10h4Zm0 0 5-8c2 0 3 1 2 4l-1 4h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7"/>',
        dislike: '<path d="M7 14V3H3v11h4Zm0 0 5 8c2 0 3-1 2-4l-1-4h6a2 2 0 0 0 2-2l-2-7a3 3 0 0 0-3-2H7"/>'
    };
    function visitor() {
        if (visitorId) return visitorId;
        try { visitorId = localStorage.getItem(storageKey); } catch {}
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId || "")) {
            if (crypto.randomUUID) visitorId = crypto.randomUUID();
            else {
                const bytes = crypto.getRandomValues(new Uint8Array(16));
                bytes[6] = (bytes[6] & 15) | 64;
                bytes[8] = (bytes[8] & 63) | 128;
                const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
                visitorId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
            }
            try { localStorage.setItem(storageKey, visitorId); } catch {}
        }
        return visitorId;
    }
    async function rpc(name, args) {
        if (typeof supabaseClient === "undefined" || !supabaseClient?.rpc) throw new Error("Service unavailable");
        const { data, error } = await supabaseClient.rpc(name, args);
        if (error) throw error;
        return data;
    }
    function summary(data) {
        if (!data || !["view_count", "like_count", "dislike_count"].every(key => Number.isSafeInteger(Number(data[key])) && Number(data[key]) >= 0)) throw new Error("Invalid engagement response");
        return data;
    }
    function paint(code) {
        for (const root of roots) {
            if (!root.isConnected) { roots.delete(root); continue; }
            if (root.dataset.shareCode !== code) continue;
            const data = cache.get(code);
            for (const [key, field] of [["views", "view_count"], ["like", "like_count"], ["dislike", "dislike_count"]]) {
                root.querySelector(`[data-count="${key}"]`).textContent = data ? Number(data[field] || 0).toLocaleString() : "—";
            }
            root.querySelectorAll("[data-reaction]").forEach(button => {
                button.disabled = busy.has(code) || !data;
                button.setAttribute("aria-pressed", String(data?.reaction === button.dataset.reaction));
                const kind = button.dataset.reaction;
                button.setAttribute("aria-label", `${kind === "like" ? "Like" : "Dislike"} (${data ? Number(data[`${kind}_count`] || 0).toLocaleString() : "unavailable"})`);
            });
        }
    }
    function message(code, text) {
        for (const root of roots) if (root.dataset.shareCode === code) root.querySelector("[role=status]").textContent = text;
    }
    async function loadMany(codes) {
        if (!codes.length) return;
        const started = new Map(codes.map(code => [code, versions.get(code) || 0]));
        try {
            const data = await rpc("get_rotation_share_engagement", { p_short_codes: codes, p_visitor_id: visitor() });
            codes.forEach(code => {
                if (started.get(code) !== (versions.get(code) || 0)) return;
                if (data?.[code]) { cache.set(code, summary(data[code])); errors.delete(code); message(code, ""); }
                else { cache.delete(code); errors.set(code, "Stats unavailable. Try Refresh."); message(code, errors.get(code)); }
                paint(code);
            });
        } catch (error) {
            codes.forEach(code => { errors.set(code, "Stats unavailable. Try Refresh."); message(code, errors.get(code)); });
        }
    }
    async function react(code, reaction) {
        if (busy.has(code) || !cache.has(code)) return false;
        busy.add(code);
        versions.set(code, (versions.get(code) || 0) + 1);
        paint(code);
        message(code, "Saving reaction…");
        try {
            const data = await rpc("set_rotation_share_reaction", {
                p_short_code: code, p_visitor_id: visitor(),
                p_reaction: cache.get(code).reaction === reaction ? null : reaction
            });
            cache.set(code, summary(data));
            message(code, "Reaction saved.");
            return true;
        } catch {
            message(code, "Could not save your reaction. Please try again.");
            return false;
        } finally { busy.delete(code); paint(code); }
    }
    function create(code, { recordView = false } = {}) {
        const root = document.createElement("div");
        root.className = "rotation-share-engagement";
        root.dataset.shareCode = code;
        root.setAttribute("role", "group");
        root.setAttribute("aria-label", "Rotation views and reactions");
        const stat = (kind, title, isButton) => {
            const el = document.createElement(isButton ? "button" : "span");
            el.className = "rotation-share-stat";
            el.title = title;
            el.setAttribute("aria-label", title);
            if (isButton) { el.type = "button"; el.dataset.reaction = kind; el.disabled = true; el.setAttribute("aria-pressed", "false"); }
            el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[kind]}</svg><span data-count="${kind}">—</span>`;
            if (isButton) el.addEventListener("click", () => react(code, kind));
            root.append(el);
        };
        stat("views", "Views · one per browser", false);
        stat("like", "Like", true);
        stat("dislike", "Dislike", true);
        const status = document.createElement("span");
        status.className = "rotation-share-social-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        if (!recordView) status.textContent = errors.get(code) || (!cache.has(code) ? "Loading stats…" : "");
        root.append(status);
        roots.add(root);
        // Wait until the caller has attached the root before pruning detached cards.
        queueMicrotask(() => paint(code));
        if (recordView) {
            const started = versions.get(code) || 0;
            rpc("record_rotation_share_view", { p_short_code: code, p_visitor_id: visitor() })
                .then(data => { if (started === (versions.get(code) || 0)) { cache.set(code, summary(data)); paint(code); } })
                .catch(() => { message(code, "Stats unavailable. Reopen this share to retry."); });
        }
        return root;
    }
    window.RotationShareEngagement = { create, loadMany };
})();
