(() => {
    const MAX_ACTIONS = 240;
    const MAX_BYTES = 131072;
    const text = value => String(value || "").slice(0, 160);
    const id = value => value !== null && value !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0
        ? Number(value) : null;
    const record = value => value && typeof value === "object" && !Array.isArray(value);

    function normalize(value) {
        if (!record(value) || value.version !== 1 || typeof value.share_code !== "string"
            || !/^(?:AERT\d+:)?[A-Za-z0-9_-]+$/.test(value.share_code) || value.share_code.length > 60000
            || !["slot", "simulation"].includes(value.mode)
            || !Array.isArray(value.team) || value.team.length > 4
            || !Array.isArray(value.rotation) || !value.rotation.length || value.rotation.length > MAX_ACTIONS) return null;
        try {
            if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_BYTES) return null;
        } catch { return null; }
        const actions = [];
        for (const entry of value.rotation) {
            if (!record(entry) || !["skill", "basicAttack"].includes(entry.actionType)
                || (entry.actionType === "skill" ? id(entry.id) === null : id(entry.operatorId) === null)) return null;
            const action = {
                actionType: entry.actionType, id: id(entry.id), operatorId: id(entry.operatorId),
                name: text(entry.name), type: text(entry.type), shortType: text(entry.shortType),
                autoInserted: entry.autoInserted === true
            };
            for (const key of ["time", "hitCount", "finalHitCount"]) {
                if (typeof entry[key] === "number" && Number.isFinite(entry[key]) && entry[key] >= 0) action[key] = entry[key];
            }
            actions.push(action);
        }
        if (value.team.some(operator => !record(operator) || id(operator.id) === null)) return null;
        return {
            version: 1, share_code: value.share_code, mode: value.mode,
            team: value.team.map(operator => ({ id: id(operator.id), name: text(operator.name) })),
            rotation: actions
        };
    }

    function capture() {
        if (typeof rotation === "undefined" || !Array.isArray(rotation) || !rotation.some(Boolean)) return null;
        try {
            const code = createBuildShareCode();
            const { payload } = createBuildPersistencePayloadFromShareCode(code);
            return normalize({ version: 1, share_code: code, mode: payload.timelineMode,
                team: payload.team, rotation: payload.rotation });
        } catch {
            // A broken or oversized setup must not prevent reporting the problem.
            return null;
        }
    }

    const node = (tag, className, value = "") => {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = value;
        return element;
    };
    function preview(value) {
        const snapshot = normalize(value);
        if (!snapshot) return node("p", "admin-detail-note", value
            ? "The attached rotation could not be read."
            : "No rotation was attached to this report.");
        const details = node("details", "admin-report-rotation");
        const count = snapshot.rotation.length;
        details.appendChild(node("summary", "", `Reported rotation · ${count} action${count === 1 ? "" : "s"} · ${snapshot.mode === "simulation" ? "Simulation" : "Slot mode"}`));
        details.appendChild(node("p", "admin-detail-note", "Captured when the report was sent. Expand the steps below or load this setup to reproduce the issue."));
        const list = node("ol", "admin-report-rotation-steps");
        snapshot.rotation.forEach((action, index) => {
            const skill = action.actionType === "skill" && typeof getSkillById === "function" ? getSkillById(action.id) : null;
            const operatorId = action.operatorId ?? skill?.operatorId;
            const operator = snapshot.team.find(candidate => candidate.id === operatorId);
            const label = action.name || skill?.name || (action.actionType === "basicAttack" ? "Basic attack" : `Unknown skill (#${action.id})`);
            const item = node("li", "admin-report-rotation-step");
            item.appendChild(node("span", "admin-report-step-number", String(index + 1)));
            // Icons come only from the loaded catalog, never from report JSON.
            if (skill?.iconSmall) {
                const image = document.createElement("img");
                image.src = skill.iconSmall;
                image.alt = "";
                image.loading = "lazy";
                item.appendChild(image);
            }
            const copy = node("span", "admin-report-step-copy");
            copy.appendChild(node("strong", "", label));
            const meta = [operator?.name, action.shortType || action.type,
                typeof action.time === "number" ? `${action.time}s` : "",
                action.autoInserted ? "Auto" : ""].filter(Boolean);
            copy.appendChild(node("small", "", meta.join(" · ")));
            item.appendChild(copy);
            list.appendChild(item);
        });
        details.appendChild(list);
        return details;
    }
    window.ReportRotation = { capture, normalize, preview };
})();
