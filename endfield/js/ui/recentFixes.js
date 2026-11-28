(() => {
    // Release fixes without an issue report travel with the deployed code.
    const releaseEntries = [{
        entry_key: "conditional-operator-effects",
        title: "Conditional operator effects",
        summary: "Corrected conditional effects for Wulfgard, Tangtang and Zhuang Fangyi in Slot mode, including reaction consumption, Whirlpool-based Arts Susceptibility and stack-scaled effects. Fixed Lifeng's pre-hit Vulnerability check and Laevatain's four-stack replacement and consumption in combo detection.",
        thank_you: "",
        fixed_at: "2026-11-28T15:16:54Z"
    }, {
        entry_key: "my-rotations-compact-preview",
        title: "My Rotations · Layout",
        summary: "Fixed oversized vertical skill previews. Saved rotations now use compact cards with numbered skill icons, clearer team portraits and accessible actions. Full rotations remain available in the details.",
        thank_you: "",
        fixed_at: "2026-11-27T21:56:58Z"
    }];
    const root = document.getElementById("recentFixesEntries");
    if (!root) return;
    const status = document.getElementById("recentFixesStatus");
    const retry = document.getElementById("recentFixesRetry");
    const dateFormat = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Berlin"
    });
    const dayFormat = new Intl.DateTimeFormat("en-CA", {
        year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Berlin"
    });
    let request = null;
    let generation = 0;
    const node = (tag, className, value) => {
        const element = document.createElement(tag);
        element.className = className;
        if (value) element.textContent = value;
        return element;
    };
    function group(entries) {
        const result = new Map();
        [...entries].sort((a, b) => Date.parse(b.fixed_at) - Date.parse(a.fixed_at)).forEach(entry => {
            const day = dayFormat.format(new Date(entry.fixed_at));
            if (!result.has(day)) result.set(day, []);
            result.get(day).push(entry);
        });
        return [...result.entries()];
    }
    function dateGroup([day, entries]) {
        const section = node("section", "planner-fixes-date-group");
        const dateLabel = dateFormat.format(new Date(entries[0].fixed_at));
        section.setAttribute("aria-label", dateLabel);
        const heading = node("h3", "planner-fixes-date");
        const time = node("time", "", dateLabel);
        time.dateTime = day;
        heading.appendChild(time);
        const list = node("ul", "planner-fixes-list");
        entries.forEach(entry => {
            const item = node("li", "");
            const article = node("article", "");
            const header = node("div", "planner-fix-heading");
            header.appendChild(node("h4", "", entry.title));
            article.append(header, node("p", "", entry.summary));
            if (entry.thank_you) article.appendChild(node("p", "planner-fix-thanks", entry.thank_you));
            item.appendChild(article);
            list.appendChild(item);
        });
        section.append(heading, list);
        return section;
    }
    function render(entries) {
        if (!Array.isArray(entries) || entries.some(entry => !entry ||
            typeof entry.entry_key !== "string" || !entry.entry_key ||
            typeof entry.title !== "string" || typeof entry.summary !== "string" ||
            typeof entry.thank_you !== "string" || !Number.isFinite(Date.parse(entry.fixed_at)))) {
            throw new Error("Invalid fix history");
        }
        const merged = new Map(releaseEntries.map(entry => [entry.entry_key, entry]));
        entries.forEach(entry => merged.set(entry.entry_key, entry));
        const groups = group([...merged.values()]);
        if (!groups.length) {
            root.replaceChildren(node("p", "", "No recent fixes yet."));
            return;
        }
        const content = [dateGroup(groups[0])];
        if (groups.length > 1) {
            const history = node("details", "planner-fixes-history");
            const count = groups.slice(1).reduce((sum, [, rows]) => sum + rows.length, 0);
            history.appendChild(node("summary", "", `Earlier fixes (${count})`));
            groups.slice(1).forEach(item => history.appendChild(dateGroup(item)));
            content.push(history);
        }
        root.replaceChildren(...content);
    }
    function refresh({ force = false } = {}) {
        if (request && !force) return request;
        const current = ++generation;
        request = (async () => {
            await Promise.resolve();
            try {
                if (typeof supabaseClient === "undefined" || !supabaseClient?.rpc) throw new Error("Service unavailable");
                const { data, error } = await supabaseClient.rpc("list_recent_fixes", { p_limit: 100 });
                if (error) throw error;
                if (current !== generation) return false;
                render(data);
                if (status) { status.textContent = ""; status.hidden = true; }
                if (retry) retry.hidden = true;
                return true;
            } catch {
                if (current !== generation) return false;
                // Keep the existing history if the new service is unavailable.
                if (status) { status.textContent = "Latest fixes could not be loaded. Showing the last available history."; status.hidden = false; }
                if (retry) retry.hidden = false;
                return false;
            } finally {
                if (current === generation) request = null;
            }
        })();
        return request;
    }
    window.RecentFixes = { refresh };
    retry?.addEventListener("click", () => refresh());
    if (typeof window.IntersectionObserver === "function") {
        const observer = new window.IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            void refresh();
        }, { rootMargin: "300px" });
        observer.observe(root);
    } else {
        void refresh();
    }
})();
