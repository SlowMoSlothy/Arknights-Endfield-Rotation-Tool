// A visit lasts one page load. No cookies, persistent visitor IDs or build contents.
(() => {
    const events = new Set([
        "builder_opened", "builder_ready", "builder_failed", "team_selected",
        "first_skill_placed", "share_opened", "share_published", "share_failed", "example_loaded"
    ]);
    const sent = new Set();
    const pending = [];
    let entryKind = "unknown";
    let timer = null;
    let disabled = false;
    let warned = false;
    const visitId = window.crypto?.randomUUID?.();
    const enabled = Boolean(visitId)
        && window.location.hostname === "rotationforge.gg"
        && new URLSearchParams(window.location.search).get("usage") !== "off"
        && navigator.doNotTrack !== "1" && navigator.globalPrivacyControl !== true;

    function flush() {
        clearTimeout(timer);
        timer = null;
        if (!enabled || disabled || !pending.length) return;
        const batch = pending.splice(0);
        // Use the public key, even when the visitor is signed in; no account token is sent.
        try {
            Promise.resolve(fetch(`${SUPABASE_URL}/rest/v1/rpc/record_planner_events`, {
                method: "POST", keepalive: true, credentials: "omit", referrerPolicy: "no-referrer",
                headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
                body: JSON.stringify({ p_visit_id: visitId, p_events: batch })
            })).then(response => {
                if (!response.ok) throw new Error("Usage endpoint unavailable");
            }).catch(() => {
                // Analytics must never interrupt building or sharing. Avoid retries on an absent migration.
                disabled = true;
                if (!warned) console.info("Planner usage measurement is unavailable.");
                warned = true;
            });
        } catch {
            disabled = true;
        }
    }

    window.trackPlannerEvent = function (name) {
        if (!enabled || disabled || !events.has(name) || sent.has(name)) return;
        sent.add(name);
        pending.push({
            event_name: name,
            entry_kind: entryKind,
            mode: typeof uiSettings !== "undefined" && uiSettings?.timelineMode === "simulation" ? "simulation" : "slot"
        });
        if (timer === null) timer = setTimeout(flush, 150);
    };

    window.markPlannerReady = function (kind, hasOperators = true) {
        entryKind = ["new", "restored", "shared"].includes(kind) ? kind : "unknown";
        window.trackPlannerEvent(hasOperators ? "builder_ready" : "builder_failed");
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
    });
    window.trackPlannerEvent("builder_opened");
})();
