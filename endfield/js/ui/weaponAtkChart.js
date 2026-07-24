const SIMULATION_ATK_CHART_HEIGHT = 92;
const SIMULATION_DAMAGE_CHART_HEIGHT = 100;
const SIMULATION_ATK_LINE_COLORS = ["#f8f546", "#56d8ff", "#58df91", "#ff9861"];
const SIMULATION_DAMAGE_BASELINE_STORAGE_KEY = "rotationforge.simulationDamageBaseline.v1";
const SIMULATION_DAMAGE_BASELINE_COLLECTION_STORAGE_KEY = "rotationforge.simulationDamageBaselines.v2";
const SIMULATION_DAMAGE_BASELINE_LIMIT = 12;
const SIMULATION_DAMAGE_INTERVAL_SECONDS = 0.1;
let pinnedSimulationDamageMarker = null;
let simulationDamageTooltipPinned = false;
let simulationDamageOutsideListenerBound = false;
let simulationDamageSummaryExpanded = false;

function formatSimulationChartNumber(value, maximumFractionDigits = 1) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "0";
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits
    }).format(numericValue);
}

function getSimulationAtkValueAtTime(points, time) {
    let value = Number(points?.[0]?.value || 0);
    (points || []).forEach(point => {
        if (Number(point.time) <= time + 0.0001) value = Number(point.value) || value;
    });
    return value;
}

function createSimulationAtkStepPath(points, width, pixelsPerSecond, getY) {
    if (!Array.isArray(points) || points.length === 0) return "";
    const first = points[0];
    let pathData = `M ${Math.max(0, Number(first.time) * pixelsPerSecond)} ${getY(Number(first.value))}`;
    let previousValue = Number(first.value);
    points.slice(1).forEach(point => {
        const x = Math.max(0, Math.min(width, Number(point.time) * pixelsPerSecond));
        const nextValue = Number(point.value);
        pathData += ` H ${x}`;
        if (nextValue !== previousValue) pathData += ` V ${getY(nextValue)}`;
        previousValue = nextValue;
    });
    if (Number(points[points.length - 1].time) * pixelsPerSecond < width) pathData += ` H ${width}`;
    return pathData;
}

function createSimulationWeaponAtkChart(timeline, durationSeconds, pixelsPerSecond) {
    const series = (Array.isArray(timeline) ? timeline : []).filter(item => item?.points?.length);
    if (series.length === 0) return null;
    const duration = Math.max(0.1, Number(durationSeconds) || 0.1);
    const width = Math.max(1, duration * pixelsPerSecond);
    const values = series.flatMap(item => item.points.map(point => Number(point.value) || 0));
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = Math.max(20, rawMax - rawMin);
    const domainMin = Math.max(0, rawMin - range * 0.14);
    const domainMax = rawMax + range * 0.14;
    const chartTop = 17;
    const chartBottom = SIMULATION_ATK_CHART_HEIGHT - 12;
    const chartHeight = chartBottom - chartTop;
    const getY = value => chartTop + ((domainMax - value) / Math.max(1, domainMax - domainMin)) * chartHeight;
    const track = document.createElement("div");
    track.className = "rotation-sim-atk-track";
    track.style.width = width + "px";
    track.setAttribute("aria-label", "Current operator ATK over time");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("rotation-sim-atk-svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + SIMULATION_ATK_CHART_HEIGHT);
    svg.setAttribute("preserveAspectRatio", "none");
    [0, 0.5, 1].forEach(position => {
        const y = chartTop + chartHeight * position;
        const guide = document.createElementNS("http://www.w3.org/2000/svg", "line");
        guide.classList.add("rotation-sim-atk-guide");
        guide.setAttribute("x1", "0");
        guide.setAttribute("x2", String(width));
        guide.setAttribute("y1", String(y));
        guide.setAttribute("y2", String(y));
        svg.appendChild(guide);
    });
    series.forEach((item, index) => {
        const color = SIMULATION_ATK_LINE_COLORS[index % SIMULATION_ATK_LINE_COLORS.length];
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const pathData = createSimulationAtkStepPath(item.points, width, pixelsPerSecond, getY);
        path.classList.add("rotation-sim-atk-line");
        path.setAttribute("d", pathData);
        path.style.setProperty("--atk-line-color", color);
        svg.appendChild(path);
        item.points.slice(1).forEach((point, pointIndex) => {
            const previous = item.points[pointIndex];
            if (Number(previous?.value) === Number(point.value)) return;
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            marker.classList.add("rotation-sim-atk-change");
            marker.setAttribute("cx", String(Number(point.time) * pixelsPerSecond));
            marker.setAttribute("cy", String(getY(Number(point.value))));
            marker.setAttribute("r", "3.5");
            marker.style.setProperty("--atk-line-color", color);
            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = item.operatorName + ": " + formatSimulationChartNumber(point.value) + " ATK at " + Number(point.time).toFixed(1) + "s";
            marker.appendChild(title);
            svg.appendChild(marker);
        });
    });
    const crosshair = document.createElementNS("http://www.w3.org/2000/svg", "line");
    crosshair.classList.add("rotation-sim-atk-crosshair");
    crosshair.setAttribute("y1", "0");
    crosshair.setAttribute("y2", String(SIMULATION_ATK_CHART_HEIGHT));
    svg.appendChild(crosshair);
    track.appendChild(svg);
    const legend = document.createElement("div");
    legend.className = "rotation-sim-atk-legend";
    series.forEach((item, index) => {
        const entry = document.createElement("span");
        entry.style.setProperty("--atk-line-color", SIMULATION_ATK_LINE_COLORS[index % SIMULATION_ATK_LINE_COLORS.length]);
        const startAtk = Number(item.points[0]?.value || 0);
        const peakAtk = Math.max(startAtk, ...item.points.map(point => Number(point.value) || 0));
        entry.textContent = peakAtk > startAtk
            ? `${item.operatorName}: ${formatSimulationChartNumber(startAtk)} -> ${formatSimulationChartNumber(peakAtk)} ATK`
            : `${item.operatorName}: ${formatSimulationChartNumber(startAtk)} ATK`;
        legend.appendChild(entry);
    });
    track.appendChild(legend);
    const tooltip = document.createElement("div");
    tooltip.className = "rotation-sim-atk-tooltip";
    track.appendChild(tooltip);
    track.addEventListener("pointermove", event => {
        const rect = track.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const time = (x / Math.max(1, rect.width)) * duration;
        crosshair.setAttribute("x1", String(time * pixelsPerSecond));
        crosshair.setAttribute("x2", String(time * pixelsPerSecond));
        crosshair.classList.add("is-visible");
        tooltip.replaceChildren();
        const timeLabel = document.createElement("strong");
        timeLabel.textContent = (Math.round(time * 10) / 10) + "s";
        tooltip.appendChild(timeLabel);
        series.forEach((item, index) => {
            const row = document.createElement("span");
            row.style.setProperty("--atk-line-color", SIMULATION_ATK_LINE_COLORS[index % SIMULATION_ATK_LINE_COLORS.length]);
            row.textContent = item.operatorName + ": " + formatSimulationChartNumber(getSimulationAtkValueAtTime(item.points, time)) + " ATK";
            tooltip.appendChild(row);
        });
        tooltip.style.left = Math.max(8, Math.min(rect.width - 170, x + 12)) + "px";
        tooltip.classList.add("is-visible");
    });
    track.addEventListener("pointerleave", () => {
        crosshair.classList.remove("is-visible");
        tooltip.classList.remove("is-visible");
    });
    return track;
}

function buildSimulationDamageTimeline(events) {
    const seriesByOperator = new Map();
    (Array.isArray(events) ? events : [])
        .filter(event => {
            const damage = event?.damageBreakdown;
            return damage
                && damage.status !== "missing-profile"
                && Number.isFinite(Number(damage.preMitigationDamage));
        })
        .sort((left, right) => (Number(left.time) || 0) - (Number(right.time) || 0))
        .forEach(event => {
            const operatorId = Number(event.sourceOperatorId);
            const key = Number.isFinite(operatorId) ? String(operatorId) : "unknown";
            if (!seriesByOperator.has(key)) {
                const operatorName = typeof getSimulationOperatorName === "function"
                    ? getSimulationOperatorName(operatorId)
                    : (event.operatorName || "Operator");
                seriesByOperator.set(key, {
                    operatorId: Number.isFinite(operatorId) ? operatorId : null,
                    operatorName,
                    points: [{ time: 0, value: 0, damage: 0, skillName: "Start" }]
                });
            }

            const series = seriesByOperator.get(key);
            const time = Math.max(0, Number(event.time) || 0);
            const damageValue = typeof getSimulationDisplayedDamage === "function"
                ? getSimulationDisplayedDamage(event.damageBreakdown)
                : (event.damageBreakdown.expectedFinalDamage
                    ?? event.damageBreakdown.finalDamage
                    ?? event.damageBreakdown.preMitigationDamage);
            const damage = Math.max(0, Math.round(Number(damageValue) || 0));
            const damageEvent = {
                skillName: event.skillData?.name || "Skill",
                damage,
                breakdown: event.damageBreakdown,
                kind: event.kind || "",
                element: String(event.skillData?.damageProfile?.element || event.skillData?.elementType || event.damageBreakdown?.element || "neutral").toLowerCase(),
                atkMultiplier: event.skillData?.damageProfile?.atkMultiplier ?? event.damageBreakdown?.atkMultiplier ?? null,
                triggerSourceName: event.triggerSourceName || ""
            };
            const previous = series.points[series.points.length - 1];
            if (previous && Math.abs(previous.time - time) < 0.0001 && previous.time !== 0) {
                previous.damage += damage;
                previous.value += damage;
                previous.skillName += ` + ${event.skillData?.name || "Skill"}`;
                previous.events.push(damageEvent);
            } else {
                series.points.push({
                    time,
                    value: Number(previous?.value || 0) + damage,
                    damage,
                    skillName: event.skillData?.name || "Skill",
                    events: [damageEvent]
                });
            }
        });
    return [...seriesByOperator.values()];
}

function buildSimulationDamageSummary(timeline, teamLoadouts = window.__simulationWeaponAtkSource?.teamLoadouts || []) {
    const loadoutsByOperator = new Map((teamLoadouts || []).filter(Boolean).map(loadout => [String(loadout.operatorId), loadout]));
    const operators = (Array.isArray(timeline) ? timeline : [])
        .map((series, index) => {
            const points = Array.isArray(series?.points) ? series.points.slice(1) : [];
            const totalDamage = points.reduce((total, point) => total + Math.max(0, Number(point.damage) || 0), 0);
            const hits = points.flatMap(point => {
                const events = Array.isArray(point.events) && point.events.length
                    ? point.events
                    : [{ skillName: point.skillName, damage: point.damage }];
                return events.map(event => ({
                    operatorId: series.operatorId,
                    operatorName: series.operatorName || "Operator",
                    skillName: event.skillName || point.skillName || "Skill",
                    damage: Math.max(0, Number(event.damage) || 0),
                    time: Math.max(0, Number(point.time) || 0)
                }));
            });
            const loadout = loadoutsByOperator.get(String(series.operatorId));
            return {
                operatorId: series.operatorId,
                operatorName: series.operatorName || "Operator",
                color: SIMULATION_ATK_LINE_COLORS[index % SIMULATION_ATK_LINE_COLORS.length],
                totalDamage,
                hits,
                totalAtk: Number(loadout?.totalAtk) || 0,
                weaponName: loadout?.weaponName || "No weapon",
                potential: Number(loadout?.potential) || 1,
                loadoutLabel: loadout ? `${loadout.weaponName || "Weapon"} / P${Number(loadout.potential) || 1}` : "Loadout unavailable"
            };
        })
        .filter(operator => operator.totalDamage > 0);
    const totalDamage = operators.reduce((total, operator) => total + operator.totalDamage, 0);
    const durationSeconds = Math.max(0, ...operators.flatMap(operator => operator.hits.map(hit => hit.time)));
    const strongestHit = operators
        .flatMap(operator => operator.hits)
        .reduce((strongest, hit) => !strongest || hit.damage > strongest.damage ? hit : strongest, null);

    return {
        totalDamage,
        durationSeconds,
        dps: durationSeconds > 0 ? totalDamage / durationSeconds : totalDamage,
        strongestHit,
        damageMode: typeof getSimulationDamageMode === "function" ? getSimulationDamageMode() : "expected",
        operators: operators.map(operator => ({
            ...operator,
            sharePercent: totalDamage > 0 ? (operator.totalDamage / totalDamage) * 100 : 0,
            dps: durationSeconds > 0 ? operator.totalDamage / durationSeconds : operator.totalDamage
        }))
    };
}

function getSimulationPercentDelta(current, baseline) {
    const baselineValue = Number(baseline) || 0;
    if (baselineValue === 0) return null;
    return ((Number(current) || 0) - baselineValue) / Math.abs(baselineValue) * 100;
}

function buildSimulationDamageComparison(summary, baseline) {
    if (!summary || !baseline) return null;
    const baselineOperators = new Map((baseline.operators || []).map(operator => [
        String(operator.operatorId ?? operator.operatorName),
        operator
    ]));
    return {
        totalDamageDelta: Number(summary.totalDamage || 0) - Number(baseline.totalDamage || 0),
        totalDamagePercent: getSimulationPercentDelta(summary.totalDamage, baseline.totalDamage),
        dpsDelta: Number(summary.dps || 0) - Number(baseline.dps || 0),
        dpsPercent: getSimulationPercentDelta(summary.dps, baseline.dps),
        strongestHitDelta: Number(summary.strongestHit?.damage || 0) - Number(baseline.strongestHit?.damage || 0),
        strongestHitPercent: getSimulationPercentDelta(summary.strongestHit?.damage, baseline.strongestHit?.damage),
        operators: summary.operators.map(operator => {
            const key = String(operator.operatorId ?? operator.operatorName);
            const baselineOperator = baselineOperators.get(key) || {};
            return {
                key,
                damageDelta: Number(operator.totalDamage || 0) - Number(baselineOperator.totalDamage || 0),
                damagePercent: getSimulationPercentDelta(operator.totalDamage, baselineOperator.totalDamage),
                dpsDelta: Number(operator.dps || 0) - Number(baselineOperator.dps || 0),
                dpsPercent: getSimulationPercentDelta(operator.dps, baselineOperator.dps),
                atkDelta: Number(operator.totalAtk || 0) - Number(baselineOperator.totalAtk || 0),
                atkPercent: getSimulationPercentDelta(operator.totalAtk, baselineOperator.totalAtk)
            };
        })
    };
}

function createSimulationDamageBaselineSnapshot(summary) {
    return {
        totalDamage: Number(summary?.totalDamage) || 0,
        durationSeconds: Number(summary?.durationSeconds) || 0,
        dps: Number(summary?.dps) || 0,
        damageMode: summary?.damageMode || "expected",
        strongestHit: summary?.strongestHit ? { ...summary.strongestHit } : null,
        operators: (summary?.operators || []).map(operator => ({
            operatorId: operator.operatorId,
            operatorName: operator.operatorName,
            totalDamage: Number(operator.totalDamage) || 0,
            sharePercent: Number(operator.sharePercent) || 0,
            dps: Number(operator.dps) || 0,
            totalAtk: Number(operator.totalAtk) || 0,
            weaponName: operator.weaponName || "No weapon",
            potential: Number(operator.potential) || 1,
            loadoutLabel: operator.loadoutLabel || "Loadout unavailable"
        }))
    };
}

function normalizeSimulationDamageBaselineName(value, fallback = "Baseline") {
    return String(value || "").trim().slice(0, 48) || fallback;
}

function normalizeSimulationDamageBaselineCollection(value) {
    const items = (Array.isArray(value?.items) ? value.items : [])
        .filter(item => item?.summary)
        .slice(-SIMULATION_DAMAGE_BASELINE_LIMIT)
        .map((item, index) => ({
            id: String(item.id || `baseline-${index + 1}`),
            name: normalizeSimulationDamageBaselineName(item.name, `Baseline ${index + 1}`),
            createdAt: item.createdAt || new Date().toISOString(),
            summary: createSimulationDamageBaselineSnapshot(item.summary)
        }));
    const requestedActiveId = String(value?.activeId || "");
    return {
        activeId: items.some(item => item.id === requestedActiveId) ? requestedActiveId : (items.at(-1)?.id || ""),
        items
    };
}

function readSimulationDamageBaselines() {
    try {
        const storedCollection = window.localStorage.getItem(SIMULATION_DAMAGE_BASELINE_COLLECTION_STORAGE_KEY);
        if (storedCollection) return normalizeSimulationDamageBaselineCollection(JSON.parse(storedCollection));
        const legacyValue = window.localStorage.getItem(SIMULATION_DAMAGE_BASELINE_STORAGE_KEY);
        if (!legacyValue) return normalizeSimulationDamageBaselineCollection(null);
        const collection = normalizeSimulationDamageBaselineCollection({
            items: [{ id: "legacy-baseline", name: "Baseline 1", summary: JSON.parse(legacyValue) }],
            activeId: "legacy-baseline"
        });
        writeSimulationDamageBaselines(collection);
        return collection;
    } catch {
        return normalizeSimulationDamageBaselineCollection(null);
    }
}

function writeSimulationDamageBaselines(collection) {
    try {
        window.localStorage.setItem(SIMULATION_DAMAGE_BASELINE_COLLECTION_STORAGE_KEY, JSON.stringify(normalizeSimulationDamageBaselineCollection(collection)));
        return true;
    } catch {
        return false;
    }
}

function saveSimulationDamageBaseline(collection, summary, name, baselineId = "") {
    const normalized = normalizeSimulationDamageBaselineCollection(collection);
    const existingIndex = normalized.items.findIndex(item => item.id === baselineId);
    const item = {
        id: existingIndex >= 0 ? baselineId : `baseline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: normalizeSimulationDamageBaselineName(name, `Baseline ${normalized.items.length + 1}`),
        createdAt: existingIndex >= 0 ? normalized.items[existingIndex].createdAt : new Date().toISOString(),
        summary: createSimulationDamageBaselineSnapshot(summary)
    };
    if (existingIndex >= 0) normalized.items.splice(existingIndex, 1, item);
    else normalized.items.push(item);
    if (normalized.items.length > SIMULATION_DAMAGE_BASELINE_LIMIT) normalized.items.splice(0, normalized.items.length - SIMULATION_DAMAGE_BASELINE_LIMIT);
    normalized.activeId = item.id;
    return normalized;
}

function createSimulationDamageDelta(value, percent = null, label = "vs baseline") {
    const delta = document.createElement("small");
    const numericValue = Math.round(Number(value) || 0);
    delta.className = `rotation-sim-damage-delta ${numericValue > 0 ? "is-positive" : numericValue < 0 ? "is-negative" : "is-neutral"}`;
    const percentText = Number.isFinite(percent) ? ` (${percent > 0 ? "+" : ""}${formatSimulationChartNumber(percent)}%)` : "";
    delta.textContent = `${numericValue > 0 ? "+" : ""}${formatSimulationChartNumber(numericValue, 0)}${percentText} ${label}`;
    return delta;
}

function createSimulationDamageSummary(timeline) {
    const summary = buildSimulationDamageSummary(timeline);
    if (summary.totalDamage <= 0) return null;
    let baselineCollection = readSimulationDamageBaselines();
    const activeBaselineItem = baselineCollection.items.find(item => item.id === baselineCollection.activeId) || null;
    const baseline = activeBaselineItem?.summary || null;
    const comparison = buildSimulationDamageComparison(summary, baseline);
    const root = document.createElement("details");
    root.className = "rotation-sim-damage-summary";
    root.setAttribute("aria-label", "Rotation damage summary");
    root.open = simulationDamageSummaryExpanded;
    root.addEventListener("toggle", () => {
        simulationDamageSummaryExpanded = root.open;
    });

    const heading = document.createElement("summary");
    heading.className = "rotation-sim-damage-summary-heading";
    const headingCopy = document.createElement("div");
    const kicker = document.createElement("span");
    kicker.textContent = "Rotation analysis";
    const title = document.createElement("strong");
    title.textContent = "Damage summary";
    headingCopy.append(kicker, title);

    const compactMetrics = document.createElement("div");
    compactMetrics.className = "rotation-sim-damage-summary-compact";
    [
        ["DMG", summary.totalDamage],
        ["DPS", summary.dps],
        ["Time", `${formatSimulationChartNumber(summary.durationSeconds)}s`],
        ["Best", summary.strongestHit?.damage || 0]
    ].forEach(([labelText, rawValue]) => {
        const item = document.createElement("span");
        const value = document.createElement("strong");
        value.textContent = typeof rawValue === "number"
            ? formatSimulationChartNumber(rawValue, 0)
            : rawValue;
        const label = document.createElement("small");
        label.textContent = labelText;
        item.append(value, label);
        compactMetrics.appendChild(item);
    });

    const disclosureLabel = document.createElement("span");
    disclosureLabel.className = "rotation-sim-damage-summary-disclosure";
    const disclosureText = document.createElement("span");
    disclosureText.textContent = "Details";
    const disclosureIcon = document.createElement("span");
    disclosureIcon.className = "rotation-sim-damage-summary-chevron";
    disclosureIcon.setAttribute("aria-hidden", "true");
    disclosureLabel.append(disclosureText, disclosureIcon);
    heading.append(headingCopy, compactMetrics, disclosureLabel);

    const content = document.createElement("div");
    content.className = "rotation-sim-damage-summary-content";
    const actions = document.createElement("div");
    actions.className = "rotation-sim-damage-summary-actions";
    const baselineSelect = document.createElement("select");
    baselineSelect.setAttribute("aria-label", "Saved damage baseline");
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = baselineCollection.items.length ? "Select baseline" : "No baselines saved";
    baselineSelect.appendChild(emptyOption);
    baselineCollection.items.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name;
        option.selected = item.id === baselineCollection.activeId;
        baselineSelect.appendChild(option);
    });
    baselineSelect.addEventListener("change", () => {
        baselineCollection.activeId = baselineSelect.value;
        if (writeSimulationDamageBaselines(baselineCollection)) mountSimulationDamageSummary();
    });
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 48;
    nameInput.setAttribute("aria-label", "Baseline name");
    nameInput.placeholder = "Baseline name";
    nameInput.value = activeBaselineItem?.name || `Loadout ${baselineCollection.items.length + 1}`;
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = activeBaselineItem ? "Save new" : "Save baseline";
    saveButton.addEventListener("click", () => {
        const nextCollection = saveSimulationDamageBaseline(baselineCollection, summary, nameInput.value);
        if (writeSimulationDamageBaselines(nextCollection)) mountSimulationDamageSummary();
    });
    actions.append(baselineSelect, nameInput, saveButton);
    if (activeBaselineItem) {
        const updateButton = document.createElement("button");
        updateButton.type = "button";
        updateButton.textContent = "Update";
        updateButton.addEventListener("click", () => {
            const nextCollection = saveSimulationDamageBaseline(baselineCollection, summary, nameInput.value, activeBaselineItem.id);
            if (writeSimulationDamageBaselines(nextCollection)) mountSimulationDamageSummary();
        });
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "is-secondary";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => {
            baselineCollection.items = baselineCollection.items.filter(item => item.id !== activeBaselineItem.id);
            baselineCollection.activeId = baselineCollection.items.at(-1)?.id || "";
            if (writeSimulationDamageBaselines(baselineCollection)) mountSimulationDamageSummary();
        });
        actions.append(updateButton, deleteButton);
    }
    content.appendChild(actions);

    const metrics = document.createElement("div");
    metrics.className = "rotation-sim-damage-summary-metrics";
    const metricData = [
        ["Team damage", `${formatSimulationChartNumber(summary.totalDamage, 0)} DMG`, comparison?.totalDamageDelta, comparison?.totalDamagePercent],
        ["Average DPS", `${formatSimulationChartNumber(summary.dps, 0)} DPS`, comparison?.dpsDelta, comparison?.dpsPercent],
        ["Duration", `${formatSimulationChartNumber(summary.durationSeconds)}s`, null],
        ["Strongest hit", `${formatSimulationChartNumber(summary.strongestHit?.damage || 0, 0)} DMG`, comparison?.strongestHitDelta, comparison?.strongestHitPercent]
    ];
    metricData.forEach(([labelText, valueText, deltaValue, deltaPercent], index) => {
        const metric = document.createElement("div");
        metric.className = "rotation-sim-damage-summary-metric";
        const label = document.createElement("span");
        label.textContent = labelText;
        const value = document.createElement("strong");
        value.textContent = valueText;
        metric.append(label, value);
        if (Number.isFinite(deltaValue)) metric.appendChild(createSimulationDamageDelta(deltaValue, deltaPercent));
        if (index === 3 && summary.strongestHit) {
            const detail = document.createElement("small");
            detail.textContent = `${summary.strongestHit.operatorName} / ${summary.strongestHit.skillName}`;
            metric.appendChild(detail);
        }
        metrics.appendChild(metric);
    });

    const breakdown = document.createElement("div");
    breakdown.className = "rotation-sim-damage-breakdown";
    summary.operators.forEach(operator => {
        const card = document.createElement("div");
        card.className = "rotation-sim-damage-operator";
        card.style.setProperty("--damage-operator-color", operator.color);
        const cardHeader = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = operator.operatorName;
        const share = document.createElement("span");
        share.textContent = `${formatSimulationChartNumber(operator.sharePercent)}%`;
        cardHeader.append(name, share);
        const damage = document.createElement("b");
        damage.textContent = `${formatSimulationChartNumber(operator.totalDamage, 0)} DMG`;
        const loadout = document.createElement("small");
        loadout.className = "rotation-sim-damage-operator-loadout";
        loadout.textContent = `${operator.loadoutLabel} / ${formatSimulationChartNumber(operator.totalAtk, 0)} ATK / ${formatSimulationChartNumber(operator.dps, 0)} DPS`;
        const bar = document.createElement("div");
        bar.className = "rotation-sim-damage-operator-bar";
        const fill = document.createElement("span");
        fill.style.width = `${Math.max(2, operator.sharePercent)}%`;
        bar.appendChild(fill);
        card.append(cardHeader, damage, loadout, bar);
        const operatorDelta = comparison?.operators.find(item => item.key === String(operator.operatorId ?? operator.operatorName));
        if (operatorDelta) {
            const deltas = document.createElement("div");
            deltas.className = "rotation-sim-damage-operator-deltas";
            deltas.append(
                createSimulationDamageDelta(operatorDelta.damageDelta, operatorDelta.damagePercent, "DMG"),
                createSimulationDamageDelta(operatorDelta.atkDelta, operatorDelta.atkPercent, "ATK"),
                createSimulationDamageDelta(operatorDelta.dpsDelta, operatorDelta.dpsPercent, "DPS")
            );
            card.appendChild(deltas);
        }
        breakdown.appendChild(card);
    });

    content.append(metrics, breakdown);
    root.append(heading, content);
    return root;
}

function formatSimulationDamageTooltipPercent(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "-";
    return `${formatSimulationChartNumber(numericValue)}%`;
}

function mapSimulationDamageTooltipSource(source, eventTime, fallbackValue = "") {
    const toOptionalNumber = value => value === null || value === undefined || value === "" ? NaN : Number(value);
    const startedAt = toOptionalNumber(source?.startedAt);
    const expiresAt = toOptionalNumber(source?.expiresAt);
    const remainingSeconds = toOptionalNumber(source?.remainingSeconds);
    let timingLabel = "Always active";
    if (Number.isFinite(startedAt) && Number.isFinite(expiresAt)) {
        const remaining = Number.isFinite(remainingSeconds)
            ? remainingSeconds
            : Math.max(0, Math.round((expiresAt - eventTime) * 10) / 10);
        timingLabel = `Active ${formatSimulationChartNumber(startedAt)}s - ${formatSimulationChartNumber(expiresAt)}s / ${formatSimulationChartNumber(remaining)}s left`;
    } else if (Number.isFinite(startedAt)) {
        timingLabel = `Active since ${formatSimulationChartNumber(startedAt)}s`;
    }
    return {
        name: source?.name || "Effect",
        valueLabel: source?.valueLabel || fallbackValue,
        icon: source?.icon || "",
        sourceLabel: source?.sourceLabel || "",
        timingLabel,
        stacks: Math.max(1, Number(source?.stacks) || 1),
        verified: source?.verified === true,
        reason: source?.reason || ""
    };
}

function mergeSimulationDamageTooltipSources(sources, eventTime, valueBuilder = null) {
    const groups = new Map();
    (sources || []).forEach(source => {
        const key = source.effectKey || `${source.name}:${source.sourceLabel}:${source.icon}`;
        const mapped = mapSimulationDamageTooltipSource(
            source,
            eventTime,
            typeof valueBuilder === "function" ? valueBuilder(source) : ""
        );
        if (!groups.has(key)) {
            groups.set(key, { ...mapped, values: mapped.valueLabel ? [mapped.valueLabel] : [] });
            return;
        }
        const current = groups.get(key);
        if (mapped.valueLabel && !current.values.includes(mapped.valueLabel)) current.values.push(mapped.valueLabel);
        current.stacks = Math.max(current.stacks, mapped.stacks);
    });
    return [...groups.values()].map(source => ({
        ...source,
        valueLabel: source.values.join(" / ")
    }));
}

function buildSimulationDamageTooltipData(operatorName, point) {
    const events = Array.isArray(point?.events) && point.events.length
        ? point.events
        : [{ skillName: point?.skillName || "Skill", damage: point?.damage || 0, breakdown: point?.breakdown }];
    return {
        operatorName: operatorName || "Operator",
        timeLabel: `${formatSimulationChartNumber(point?.time || 0)}s`,
        totalDamage: Number(point?.damage) || 0,
        cumulativeDamage: Number(point?.value) || 0,
        events: events.map(item => {
            const breakdown = item?.breakdown || {};
            const mitigation = breakdown.mitigation || null;
            const effectContext = breakdown.effectContext || {};
            const eventTime = Number(effectContext.eventTime ?? point?.time) || 0;
            return {
                skillName: item?.skillName || "Skill",
                kind: item?.kind || "",
                element: item?.element || breakdown.element || "neutral",
                triggerSourceName: item?.triggerSourceName || "",
                damage: Number(item?.damage) || 0,
                attack: Number(breakdown.attack) || 0,
                scaling: Number.isFinite(Number(breakdown.atkMultiplier))
                    ? formatSimulationDamageMultiplier(breakdown.atkMultiplier)
                    : "Missing profile",
                rawDamage: breakdown.rawSkillDamage ?? null,
                outgoingBonus: Number(breakdown.outgoing?.totalPercent) || 0,
                attackSources: mergeSimulationDamageTooltipSources(effectContext.attackSources, eventTime),
                outgoingSources: mergeSimulationDamageTooltipSources(
                    effectContext.outgoingSources || breakdown.outgoing?.sources,
                    eventTime,
                    source => `+${formatSimulationChartNumber(source.valuePercent)}% DMG`
                ),
                mitigationSources: mergeSimulationDamageTooltipSources(effectContext.mitigationSources || mitigation?.sources, eventTime),
                critSources: mergeSimulationDamageTooltipSources(effectContext.critSources, eventTime),
                otherActiveEffects: mergeSimulationDamageTooltipSources(effectContext.otherActiveEffects, eventTime),
                inactiveRequirements: (effectContext.inactiveRequirements || []).map(source => ({
                    ...mapSimulationDamageTooltipSource(source, eventTime),
                    timingLabel: "Not active for this hit"
                })),
                enemyName: breakdown.enemyName || "Not configured",
                effectiveDefense: mitigation?.effectiveDefense ?? null,
                resistanceDamagePercent: mitigation
                    ? Math.round(Number(mitigation.resistanceMultiplier || 0) * 1000) / 10
                    : null,
                susceptibility: mitigation?.susceptibilityPercent ?? null,
                normalDamage: breakdown.finalDamage ?? breakdown.preMitigationDamage ?? null,
                critRate: breakdown.canCrit ? breakdown.critRatePercent : null,
                critDamage: breakdown.canCrit ? breakdown.critDamagePercent : null,
                criticalDamage: breakdown.canCrit ? breakdown.criticalHitDamage : null,
                expectedDamage: breakdown.expectedFinalDamage ?? breakdown.finalDamage ?? breakdown.preMitigationDamage ?? null,
                verified: breakdown.status === "verified"
            };
        })
    };
}

function ensureSimulationDamageTooltip() {
    let tooltip = document.getElementById("simulationDamageTooltip");
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.id = "simulationDamageTooltip";
    tooltip.className = "rotation-sim-damage-tooltip";
    tooltip.setAttribute("role", "tooltip");
    document.body.appendChild(tooltip);
    if (!simulationDamageOutsideListenerBound) {
        document.addEventListener("pointerdown", event => {
            const target = event.target;
            if (target?.closest?.(".rotation-sim-damage-hit-target, .rotation-sim-arts-burst-chip, #simulationDamageTooltip")) return;
            hideSimulationDamageTooltip(true);
        });
        simulationDamageOutsideListenerBound = true;
    }
    return tooltip;
}

function appendSimulationDamageTooltipRow(parent, label, value, className = "") {
    const row = document.createElement("div");
    row.className = `rotation-sim-damage-tooltip-row${className ? ` ${className}` : ""}`;
    const key = document.createElement("span");
    key.textContent = label;
    const output = document.createElement("strong");
    output.textContent = value;
    row.append(key, output);
    parent.appendChild(row);
}

function appendSimulationDamageTooltipSources(parent, titleText, sources, className = "") {
    if (!Array.isArray(sources) || sources.length === 0) return;
    const group = document.createElement("div");
    group.className = `rotation-sim-damage-source-group${className ? ` ${className}` : ""}`;
    const title = document.createElement("h5");
    title.textContent = titleText;
    group.appendChild(title);
    const list = document.createElement("div");
    list.className = "rotation-sim-damage-source-list";
    sources.forEach(source => {
        const card = document.createElement("div");
        card.className = "rotation-sim-damage-source";
        const visual = document.createElement("span");
        visual.className = "rotation-sim-damage-source-icon";
        if (source.icon) {
            const image = document.createElement("img");
            image.src = source.icon;
            image.alt = "";
            image.addEventListener("error", () => visual.classList.add("is-fallback"), { once: true });
            visual.appendChild(image);
        } else {
            visual.classList.add("is-fallback");
        }
        const copy = document.createElement("div");
        const heading = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = source.name;
        const value = document.createElement("span");
        value.textContent = source.reason || source.valueLabel || "Active";
        heading.append(name, value);
        const origin = document.createElement("small");
        origin.textContent = [
            source.sourceLabel,
            source.stacks > 1 ? `${source.stacks} stacks` : "",
            source.timingLabel
        ].filter(Boolean).join(" / ");
        copy.append(heading, origin);
        card.append(visual, copy);
        list.appendChild(card);
    });
    group.appendChild(list);
    parent.appendChild(group);
}

function renderSimulationDamageTooltip(tooltip, data) {
    tooltip.replaceChildren();
    const header = document.createElement("div");
    header.className = "rotation-sim-damage-tooltip-header";
    const heading = document.createElement("strong");
    heading.textContent = `${data.operatorName} · ${data.timeLabel}`;
    const total = document.createElement("span");
    total.textContent = `${formatSimulationChartNumber(data.totalDamage, 0)} DMG`;
    header.append(heading, total);
    tooltip.appendChild(header);

    data.events.forEach((item, index) => {
        const section = document.createElement("section");
        section.className = "rotation-sim-damage-tooltip-section";
        const title = document.createElement("h4");
        title.textContent = item.skillName;
        section.appendChild(title);
        if (item.kind === "arts-burst") {
            appendSimulationDamageTooltipRow(section, "Type", `${String(item.element || "Arts").toUpperCase()} Arts Burst`, "is-burst");
            if (item.triggerSourceName) appendSimulationDamageTooltipRow(section, "Triggered by", item.triggerSourceName);
        }
        appendSimulationDamageTooltipRow(section, "Displayed damage", formatSimulationChartNumber(item.damage, 0), "is-highlight");
        appendSimulationDamageTooltipRow(section, "ATK × scaling", `${formatSimulationChartNumber(item.attack)} × ${item.scaling}`);
        if (item.rawDamage !== null) appendSimulationDamageTooltipRow(section, "Raw skill damage", formatSimulationChartNumber(item.rawDamage, 0));
        appendSimulationDamageTooltipRow(section, "Outgoing bonus", `+${formatSimulationChartNumber(item.outgoingBonus)}%`);
        appendSimulationDamageTooltipRow(section, "Enemy", item.enemyName);
        if (item.effectiveDefense !== null) appendSimulationDamageTooltipRow(section, "DEF / RES", `${formatSimulationChartNumber(item.effectiveDefense)} / ${formatSimulationDamageTooltipPercent(item.resistanceDamagePercent)} damage`);
        if (item.susceptibility !== null && Number(item.susceptibility) !== 0) appendSimulationDamageTooltipRow(section, "Susceptibility", `+${formatSimulationChartNumber(item.susceptibility)}%`);
        if (item.normalDamage !== null) appendSimulationDamageTooltipRow(section, "Normal / expected", `${formatSimulationChartNumber(item.normalDamage, 0)} / ${formatSimulationChartNumber(item.expectedDamage, 0)}`);
        if (item.criticalDamage !== null) appendSimulationDamageTooltipRow(section, "Critical", `${formatSimulationChartNumber(item.criticalDamage, 0)} (${formatSimulationDamageTooltipPercent(item.critRate)} CR · +${formatSimulationDamageTooltipPercent(item.critDamage)} CD)`);
        appendSimulationDamageTooltipSources(section, "ATK sources", item.attackSources);
        appendSimulationDamageTooltipSources(section, "Damage bonuses", item.outgoingSources);
        appendSimulationDamageTooltipSources(section, "Crit buffs", item.critSources);
        appendSimulationDamageTooltipSources(section, "Enemy debuffs", item.mitigationSources, "is-debuff");
        appendSimulationDamageTooltipSources(section, "Other active effects", item.otherActiveEffects, "is-muted");
        appendSimulationDamageTooltipSources(section, "Inactive weapon conditions", item.inactiveRequirements, "is-inactive");
        const dataState = document.createElement("small");
        dataState.textContent = item.verified ? "Verified damage profile" : "Unverified damage profile";
        dataState.className = item.verified ? "is-verified" : "is-unverified";
        section.appendChild(dataState);
        tooltip.appendChild(section);
        if (index < data.events.length - 1) tooltip.appendChild(document.createElement("hr"));
    });

    const footer = document.createElement("div");
    footer.className = "rotation-sim-damage-tooltip-footer";
    footer.textContent = `Cumulative: ${formatSimulationChartNumber(data.cumulativeDamage, 0)} DMG`;
    tooltip.appendChild(footer);
}

function getSimulationDamageTooltipPlacement(markerRect, tooltipSize, viewport, margin = 14) {
    const edge = 8;
    const width = Math.min(Number(tooltipSize?.width) || 0, Math.max(0, viewport.width - edge * 2));
    const height = Math.min(Number(tooltipSize?.height) || 0, Math.max(0, viewport.height - edge * 2));
    const centerX = markerRect.left + markerRect.width / 2;
    const centerY = markerRect.top + markerRect.height / 2;
    const clampX = value => Math.max(edge, Math.min(viewport.width - width - edge, value));
    const clampY = value => Math.max(edge, Math.min(viewport.height - height - edge, value));
    const spaceRight = viewport.width - markerRect.right - margin - edge;
    const spaceLeft = markerRect.left - margin - edge;
    const spaceBelow = viewport.height - markerRect.bottom - margin - edge;
    const spaceAbove = markerRect.top - margin - edge;

    if (spaceRight >= width) {
        return { left: markerRect.right + margin, top: clampY(centerY - height / 2), placement: "right" };
    }
    if (spaceLeft >= width) {
        return { left: markerRect.left - width - margin, top: clampY(centerY - height / 2), placement: "left" };
    }
    if (spaceBelow >= height) {
        return { left: clampX(centerX - width / 2), top: markerRect.bottom + margin, placement: "below" };
    }
    if (spaceAbove >= height) {
        return { left: clampX(centerX - width / 2), top: markerRect.top - height - margin, placement: "above" };
    }

    const useRight = spaceRight >= spaceLeft;
    return {
        left: useRight ? markerRect.right + margin : markerRect.left - width - margin,
        top: clampY(centerY - height / 2),
        placement: useRight ? "right-clipped" : "left-clipped"
    };
}

function positionSimulationDamageTooltip(tooltip, marker) {
    const rect = marker.getBoundingClientRect();
    const placement = getSimulationDamageTooltipPlacement(
        rect,
        { width: tooltip.offsetWidth, height: tooltip.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight }
    );
    tooltip.style.left = `${placement.left}px`;
    tooltip.style.top = `${placement.top}px`;
    tooltip.dataset.placement = placement.placement;
}

function getPinnedSimulationDamageMarker() {
    if (pinnedSimulationDamageMarker && !pinnedSimulationDamageMarker.isConnected) {
        pinnedSimulationDamageMarker = null;
    }
    return pinnedSimulationDamageMarker;
}

function showSimulationDamageTooltip(marker, operatorName, point, force = false) {
    const pinnedMarker = getPinnedSimulationDamageMarker();
    if (!force && simulationDamageTooltipPinned && pinnedMarker !== marker) return;
    const tooltip = ensureSimulationDamageTooltip();
    renderSimulationDamageTooltip(tooltip, buildSimulationDamageTooltipData(operatorName, point));
    tooltip.classList.add("is-visible");
    positionSimulationDamageTooltip(tooltip, marker);
}

function pinSimulationDamageTooltip(marker, operatorName, point) {
    getPinnedSimulationDamageMarker()?.classList.remove("is-pinned");
    pinnedSimulationDamageMarker = marker;
    simulationDamageTooltipPinned = true;
    marker.classList.add("is-pinned");
    const tooltip = ensureSimulationDamageTooltip();
    tooltip.classList.add("is-pinned");
    showSimulationDamageTooltip(marker, operatorName, point, true);
}

function hideSimulationDamageTooltip(force = false) {
    if (!force && simulationDamageTooltipPinned) return;
    pinnedSimulationDamageMarker?.classList.remove("is-pinned");
    pinnedSimulationDamageMarker = null;
    simulationDamageTooltipPinned = false;
    document.getElementById("simulationDamageTooltip")?.classList.remove("is-pinned", "is-visible");
}

function buildSimulationDamageIntervalSeries(points, durationSeconds, intervalSeconds = SIMULATION_DAMAGE_INTERVAL_SECONDS) {
    const interval = Math.max(0.01, Number(intervalSeconds) || SIMULATION_DAMAGE_INTERVAL_SECONDS);
    const duration = Math.max(interval, Number(durationSeconds) || interval);
    const stepCount = Math.max(1, Math.ceil(duration / interval));
    const damageByStep = new Map();

    (Array.isArray(points) ? points.slice(1) : []).forEach(point => {
        const damage = Math.max(0, Number(point?.damage) || 0);
        if (damage <= 0) return;
        const time = Math.max(0, Number(point?.time) || 0);
        const step = Math.min(stepCount, Math.max(1, Math.floor((time + 0.000001) / interval)));
        damageByStep.set(step, Number(damageByStep.get(step) || 0) + damage);
    });

    return Array.from({ length: stepCount + 1 }, (_, step) => ({
        time: Math.round(step * interval * 1000) / 1000,
        damage: step === 0 ? 0 : Number(damageByStep.get(step) || 0)
    }));
}

function createSimulationDamageLinePath(points, pixelsPerSecond, getY, durationSeconds) {
    return buildSimulationDamageIntervalSeries(points, durationSeconds)
        .map((point, index) => {
            const x = Math.max(0, Number(point.time) * pixelsPerSecond);
            const y = getY(Number(point.damage) || 0);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");
}

function createSimulationArtsBurstChipLayer(series, intervalSeries, width, pixelsPerSecond, getY) {
    const layer = document.createElement("div");
    layer.className = "rotation-sim-arts-burst-chips";
    const collisions = new Map();

    series.forEach((item, seriesIndex) => {
        item.points.slice(1).forEach(point => {
            const burstEvents = (Array.isArray(point.events) ? point.events : [])
                .filter(event => event?.kind === "arts-burst");
            if (burstEvents.length === 0) return;

            const intervalStep = Math.min(
                intervalSeries[seriesIndex].length - 1,
                Math.max(1, Math.floor(((Number(point.time) || 0) + 0.000001) / SIMULATION_DAMAGE_INTERVAL_SECONDS))
            );
            const intervalPoint = intervalSeries[seriesIndex][intervalStep];
            const collisionKey = String(Math.round((Number(point.time) || 0) * 1000));
            const collisionIndex = collisions.get(collisionKey) || 0;
            collisions.set(collisionKey, collisionIndex + 1);

            const primary = burstEvents[0];
            const element = String(primary.element || "arts").toLowerCase();
            const multiplier = Number(primary.atkMultiplier ?? primary.breakdown?.atkMultiplier);
            const scaling = Number.isFinite(multiplier) ? `${formatSimulationChartNumber(multiplier * 100, 0)}% ATK` : "ARTS";
            const burstDamage = burstEvents.reduce((total, event) => total + Math.max(0, Number(event.damage) || 0), 0);
            const tooltipPoint = {
                ...point,
                damage: burstDamage,
                skillName: burstEvents.map(event => event.skillName).join(" + "),
                events: burstEvents
            };
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "rotation-sim-arts-burst-chip";
            chip.dataset.element = element;
            chip.style.left = `${Math.max(0, Math.min(width, (Number(point.time) || 0) * pixelsPerSecond))}px`;
            chip.style.top = `${Math.max(34, Math.min(78, getY(intervalPoint.damage) + 13 + collisionIndex * 19))}px`;
            chip.setAttribute("aria-describedby", "simulationDamageTooltip");
            chip.setAttribute("aria-label", `${primary.skillName}, ${scaling}, ${formatSimulationChartNumber(burstDamage, 0)} damage at ${formatSimulationChartNumber(point.time)} seconds`);

            const dot = document.createElement("span");
            dot.className = "rotation-sim-arts-burst-dot";
            const label = document.createElement("strong");
            label.textContent = `${element.toUpperCase()} BURST${burstEvents.length > 1 ? ` x${burstEvents.length}` : ""}`;
            const value = document.createElement("small");
            value.textContent = scaling;
            chip.append(dot, label, value);
            chip.addEventListener("pointerenter", () => showSimulationDamageTooltip(chip, item.operatorName, tooltipPoint));
            chip.addEventListener("pointerleave", hideSimulationDamageTooltip);
            chip.addEventListener("focus", () => showSimulationDamageTooltip(chip, item.operatorName, tooltipPoint));
            chip.addEventListener("blur", hideSimulationDamageTooltip);
            chip.addEventListener("pointerdown", event => {
                event.preventDefault();
                event.stopPropagation();
                pinSimulationDamageTooltip(chip, item.operatorName, tooltipPoint);
            });
            chip.addEventListener("click", event => {
                event.stopPropagation();
                pinSimulationDamageTooltip(chip, item.operatorName, tooltipPoint);
            });
            layer.appendChild(chip);
        });
    });
    return layer.childElementCount > 0 ? layer : null;
}

function buildSimulationDamagePerSecond(timeline, durationSeconds) {
    const duration = Math.max(0.1, Number(durationSeconds) || 0.1);
    const lastSecond = Math.max(0, Math.ceil(duration) - 1);
    const totals = new Map();
    (Array.isArray(timeline) ? timeline : []).forEach(series => {
        (Array.isArray(series?.points) ? series.points.slice(1) : []).forEach(point => {
            const damage = Math.max(0, Number(point?.damage) || 0);
            if (damage <= 0) return;
            const rawSecond = Math.max(0, Math.floor((Number(point?.time) || 0) + 0.000001));
            const second = Math.min(lastSecond, rawSecond);
            totals.set(second, Number(totals.get(second) || 0) + damage);
        });
    });
    return [...totals.entries()]
        .map(([second, damage]) => ({ second, damage }))
        .filter(item => item.damage > 0)
        .sort((left, right) => left.second - right.second);
}

function appendSimulationDamagePerSecondBackground(svg, seconds, duration, pixelsPerSecond, chartTop, chartBottom, maximum) {
    if (seconds.length === 0) return null;
    const scaleMaximum = Math.max(1, Number(maximum) || 0);
    const barGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    barGroup.classList.add("rotation-sim-damage-per-second");
    const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    labelGroup.classList.add("rotation-sim-damage-per-second-labels");

    seconds.forEach(item => {
        const availableWidth = Math.max(3, Math.min(pixelsPerSecond, (duration - item.second) * pixelsPerSecond));
        const barWidth = Math.max(2, availableWidth);
        const height = Math.max(3, (item.damage / scaleMaximum) * (chartBottom - chartTop));
        const x = item.second * pixelsPerSecond;
        const y = chartBottom - height;
        const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bar.classList.add("rotation-sim-damage-second-bar");
        bar.setAttribute("x", String(x));
        bar.setAttribute("y", String(y));
        bar.setAttribute("width", String(barWidth));
        bar.setAttribute("height", String(height));
        bar.setAttribute("rx", "0");
        const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        title.textContent = `${formatSimulationChartNumber(item.damage, 0)} DMG during ${item.second}-${item.second + 1}s`;
        bar.appendChild(title);
        barGroup.appendChild(bar);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.classList.add("rotation-sim-damage-second-label");
        label.setAttribute("x", String(x + (barWidth / 2)));
        label.setAttribute("y", String(Math.max(chartTop + 9, Math.min(chartBottom - 11, y - 10))));
        label.setAttribute("text-anchor", "middle");
        label.textContent = formatSimulationChartNumber(item.damage, 0);
        labelGroup.appendChild(label);
    });
    svg.appendChild(barGroup);
    return labelGroup;
}

function createSimulationDamageChart(timeline, durationSeconds, pixelsPerSecond) {
    const series = (Array.isArray(timeline) ? timeline : []).filter(item => item?.points?.length > 1);
    if (series.length === 0) return null;
    const duration = Math.max(0.1, Number(durationSeconds) || 0.1);
    const width = Math.max(1, duration * pixelsPerSecond);
    const intervalSeries = series.map(item => buildSimulationDamageIntervalSeries(item.points, duration));
    const damagePerSecond = buildSimulationDamagePerSecond(series, duration);
    const maximum = Math.max(
        1,
        ...intervalSeries.flatMap(points => points.map(point => Number(point.damage) || 0)),
        ...damagePerSecond.map(item => Number(item.damage) || 0)
    );
    const chartTop = 25;
    const chartBottom = SIMULATION_DAMAGE_CHART_HEIGHT - 12;
    const getY = value => chartBottom - (Number(value) / maximum) * (chartBottom - chartTop);
    const track = document.createElement("div");
    track.className = "rotation-sim-damage-track";
    track.style.width = width + "px";
    const damageMode = typeof getSimulationDamageMode === "function" ? getSimulationDamageMode() : "expected";
    const damageModeLabel = damageMode === "critical" ? "critical" : damageMode === "normal" ? "normal" : "expected";
    track.setAttribute("aria-label", `${damageModeLabel} damage events over time`);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("rotation-sim-damage-svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${SIMULATION_DAMAGE_CHART_HEIGHT}`);
    svg.setAttribute("preserveAspectRatio", "none");

    [0, 0.5, 1].forEach(position => {
        const y = chartTop + (chartBottom - chartTop) * position;
        const guide = document.createElementNS("http://www.w3.org/2000/svg", "line");
        guide.classList.add("rotation-sim-atk-guide");
        guide.setAttribute("x1", "0");
        guide.setAttribute("x2", String(width));
        guide.setAttribute("y1", String(y));
        guide.setAttribute("y2", String(y));
        svg.appendChild(guide);
    });

    const damagePerSecondLabels = appendSimulationDamagePerSecondBackground(
        svg,
        damagePerSecond,
        duration,
        pixelsPerSecond,
        chartTop,
        chartBottom,
        maximum
    );

    series.forEach((item, index) => {
        const color = SIMULATION_ATK_LINE_COLORS[index % SIMULATION_ATK_LINE_COLORS.length];
        const pathData = createSimulationDamageLinePath(item.points, pixelsPerSecond, getY, duration);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add("rotation-sim-damage-line");
        path.setAttribute("d", pathData);
        path.style.setProperty("--atk-line-color", color);
        svg.appendChild(path);

        item.points.slice(1).forEach(point => {
            const intervalStep = Math.min(
                intervalSeries[index].length - 1,
                Math.max(1, Math.floor(((Number(point.time) || 0) + 0.000001) / SIMULATION_DAMAGE_INTERVAL_SECONDS))
            );
            const intervalPoint = intervalSeries[index][intervalStep];
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            marker.classList.add("rotation-sim-damage-hit-target");
            marker.setAttribute("x", String((intervalPoint.time * pixelsPerSecond) - 6));
            marker.setAttribute("y", String(getY(intervalPoint.damage) - 7));
            marker.setAttribute("width", "12");
            marker.setAttribute("height", "14");
            marker.setAttribute("rx", "3");
            marker.setAttribute("tabindex", "0");
            marker.setAttribute("role", "img");
            marker.setAttribute("aria-describedby", "simulationDamageTooltip");
            marker.setAttribute("aria-label", `${item.operatorName}: ${point.skillName}, ${formatSimulationChartNumber(point.damage, 0)} damage at ${formatSimulationChartNumber(point.time)} seconds`);
            marker.addEventListener("pointerenter", () => showSimulationDamageTooltip(marker, item.operatorName, point));
            marker.addEventListener("pointerleave", hideSimulationDamageTooltip);
            marker.addEventListener("focus", () => showSimulationDamageTooltip(marker, item.operatorName, point));
            marker.addEventListener("blur", hideSimulationDamageTooltip);
            marker.addEventListener("pointerdown", event => {
                event.preventDefault();
                event.stopPropagation();
                pinSimulationDamageTooltip(marker, item.operatorName, point);
            });
            marker.addEventListener("click", event => {
                event.stopPropagation();
                pinSimulationDamageTooltip(marker, item.operatorName, point);
            });
            svg.appendChild(marker);
        });
    });
    if (damagePerSecondLabels) svg.appendChild(damagePerSecondLabels);
    track.appendChild(svg);
    const burstChipLayer = createSimulationArtsBurstChipLayer(series, intervalSeries, width, pixelsPerSecond, getY);
    if (burstChipLayer) track.appendChild(burstChipLayer);

    const legend = document.createElement("div");
    legend.className = "rotation-sim-atk-legend rotation-sim-damage-legend";
    series.forEach((item, index) => {
        const entry = document.createElement("span");
        entry.style.setProperty("--atk-line-color", SIMULATION_ATK_LINE_COLORS[index % SIMULATION_ATK_LINE_COLORS.length]);
        entry.textContent = `${item.operatorName}: ${formatSimulationChartNumber(item.points[item.points.length - 1].value, 0)} ${damageModeLabel} DMG`;
        legend.appendChild(entry);
    });
    track.appendChild(legend);
    return track;
}

function mountSimulationWeaponAtkChart() {
    const timeline = window.__simulationWeaponAtkTimeline;
    const meta = window.__simulationWeaponAtkTimelineMeta;
    const body = document.querySelector(".rotation-sim-body");
    const labels = document.querySelector(".rotation-sim-labels");
    const spTrack = body?.querySelector(".rotation-sim-sp-track");
    if (!body || !labels || !spTrack || !meta || !Array.isArray(timeline) || timeline.length === 0) return;
    const chart = createSimulationWeaponAtkChart(timeline, meta.duration, meta.pixelsPerSecond);
    if (!chart) return;
    chart.dataset.simulationTrack = "atk";
    spTrack.insertAdjacentElement("afterend", chart);
    const atkLabel = typeof createRotationTimelineLabel === "function"
        ? createRotationTimelineLabel("ATK", "atk")
        : document.createElement("div");
    if (!atkLabel.textContent) atkLabel.textContent = "ATK";
    atkLabel.dataset.timelineLabel = "atk";
    atkLabel.dataset.simulationTrack = "atk";
    labels.children[2]?.insertAdjacentElement("afterend", atkLabel);
    body.classList.add("has-atk-chart");
    labels.classList.add("has-atk-chart");
    if (typeof applySimulationTrackLayout === "function") applySimulationTrackLayout(labels, body);
}

function mountSimulationDamageChart() {
    const timeline = window.__simulationDamageTimeline;
    const meta = window.__simulationWeaponAtkTimelineMeta;
    const body = document.querySelector(".rotation-sim-body");
    const labels = document.querySelector(".rotation-sim-labels");
    const atkTrack = body?.querySelector(".rotation-sim-atk-track");
    if (!body || !labels || !atkTrack || !meta || !Array.isArray(timeline)) return;
    const chart = createSimulationDamageChart(timeline, meta.duration, meta.pixelsPerSecond);
    if (!chart) return;
    chart.dataset.simulationTrack = "damage";
    atkTrack.insertAdjacentElement("afterend", chart);
    const damageLabel = typeof createRotationTimelineLabel === "function"
        ? createRotationTimelineLabel("DMG", "damage")
        : document.createElement("div");
    if (!damageLabel.textContent) damageLabel.textContent = "DMG";
    damageLabel.dataset.simulationTrack = "damage";
    labels.querySelector('[data-timeline-label="atk"]')?.insertAdjacentElement("afterend", damageLabel);
    body.classList.add("has-damage-chart");
    labels.classList.add("has-damage-chart");
    if (typeof applySimulationTrackLayout === "function") applySimulationTrackLayout(labels, body);
    mountSimulationDamageSummary();
}

function mountSimulationDamageSummary() {
    document.querySelector(".rotation-sim-damage-summary")?.remove();
    const trackScroll = document.querySelector(".rotation-sim-track-scroll");
    const timelineControls = document.querySelector(".rotation-sim-timeline-controls");
    const summary = createSimulationDamageSummary(window.__simulationDamageTimeline);
    if (!trackScroll || !summary) return;
    if (timelineControls && timelineControls.parentElement === trackScroll.parentElement) {
        timelineControls.insertAdjacentElement("beforebegin", summary);
        return;
    }
    trackScroll.insertAdjacentElement("beforebegin", summary);
}

window.createSimulationWeaponAtkChart = createSimulationWeaponAtkChart;
window.formatSimulationChartNumber = formatSimulationChartNumber;
window.createSimulationAtkStepPath = createSimulationAtkStepPath;
window.mountSimulationWeaponAtkChart = mountSimulationWeaponAtkChart;
window.buildSimulationDamageTimeline = buildSimulationDamageTimeline;
window.buildSimulationDamageSummary = buildSimulationDamageSummary;
window.buildSimulationDamageComparison = buildSimulationDamageComparison;
window.normalizeSimulationDamageBaselineCollection = normalizeSimulationDamageBaselineCollection;
window.saveSimulationDamageBaseline = saveSimulationDamageBaseline;
window.createSimulationDamageSummary = createSimulationDamageSummary;
window.mountSimulationDamageSummary = mountSimulationDamageSummary;
window.createSimulationDamageLinePath = createSimulationDamageLinePath;
window.createSimulationDamageImpulsePath = createSimulationDamageLinePath;
window.buildSimulationDamageIntervalSeries = buildSimulationDamageIntervalSeries;
window.buildSimulationDamageTooltipData = buildSimulationDamageTooltipData;
window.getSimulationDamageTooltipPlacement = getSimulationDamageTooltipPlacement;
window.buildSimulationDamagePerSecond = buildSimulationDamagePerSecond;
window.createSimulationDamageChart = createSimulationDamageChart;
window.mountSimulationDamageChart = mountSimulationDamageChart;
