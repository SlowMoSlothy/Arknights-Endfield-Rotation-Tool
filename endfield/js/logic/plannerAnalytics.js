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
    let eligibility = "checking";
    let authVersion = 0;
    let sentBatch = false;
    let adminVisit = false;
    const visitId = window.crypto?.randomUUID?.();
    const enabled = Boolean(visitId)
        && window.location.hostname === "rotationforge.gg"
        && new URLSearchParams(window.location.search).get("usage") !== "off"
        && navigator.doNotTrack !== "1" && navigator.globalPrivacyControl !== true;

    function flush() {
        clearTimeout(timer);
        timer = null;
        if (!enabled || disabled || eligibility !== "allowed" || !pending.length) return;
        const batch = pending.splice(0);
        // Use the public key, even when the visitor is signed in; no account token is sent.
        try {
            sentBatch = true;
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

    function scheduleFlush() {
        if (eligibility === "allowed" && pending.length && timer === null) timer = setTimeout(flush, 150);
    }

    function pauseCollection() {
        eligibility = "checking";
        clearTimeout(timer);
        timer = null;
    }

    function stopCollection() {
        disabled = true;
        pending.length = 0;
        clearTimeout(timer);
        timer = null;
    }

    async function checkSession(client, session, version) {
        try {
            const result = session ? await client.rpc("is_app_admin") : { data: false };
            if (version !== authVersion || adminVisit) return;
            if (result.error || typeof result.data !== "boolean") throw new Error("Admin status unavailable");
            if (result.data) {
                adminVisit = true;
                stopCollection();
                // A sign-in can happen after anonymous batches were already sent. Exclude the
                // entire current visit, including batches that are still in flight.
                if (sentBatch) {
                    const { error } = await client.rpc("exclude_planner_visit", { p_visit_id: visitId });
                    if (error) console.info("Admin visit exclusion is unavailable. Update supabase/planner_analytics.sql.");
                }
                return;
            }
            if (!disabled) {
                eligibility = "allowed";
                scheduleFlush();
            }
        } catch {
            if (version === authVersion) stopCollection();
        }
    }

    function checkVisitor() {
        const client = typeof supabaseClient !== "undefined" ? supabaseClient : null;
        if (!client?.auth?.getSession || !client.auth.onAuthStateChange) {
            stopCollection();
            return;
        }
        const initialVersion = authVersion;
        client.auth.onAuthStateChange((_event, session) => {
            if (adminVisit || (disabled && !sentBatch)) return;
            const version = ++authVersion;
            pauseCollection();
            // Run outside Supabase's auth callback so RPC cannot wait on the same auth lock.
            setTimeout(() => { checkSession(client, session, version); }, 0);
        });
        Promise.resolve(client.auth.getSession()).then(({ data, error }) => {
            if (initialVersion !== authVersion || disabled) return;
            if (error) stopCollection();
            else checkSession(client, data?.session || null, initialVersion);
        }).catch(() => { if (initialVersion === authVersion) stopCollection(); });
    }

    window.trackPlannerEvent = function (name) {
        if (!enabled || disabled || !events.has(name) || sent.has(name)) return;
        sent.add(name);
        pending.push({
            event_name: name,
            entry_kind: entryKind,
            mode: typeof uiSettings !== "undefined" && uiSettings?.timelineMode === "simulation" ? "simulation" : "slot"
        });
        scheduleFlush();
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
    if (enabled) {
        try { checkVisitor(); } catch { stopCollection(); }
    }
})();
