const SIMULATION_ATK_CHART_HEIGHT = 92;
const SIMULATION_DAMAGE_CHART_HEIGHT = 100;
const SIMULATION_ATK_LINE_COLORS = ["#f8f546", "#56d8ff", "#58df91", "#ff9861"];
const SIMULATION_DAMAGE_BASELINE_STORAGE_KEY = "rotationforge.simulationDamageBaseline.v1";
let pinnedSimulationDamageMarker = null;
let simulationDamageTooltipPinned = false;
let simulationDamageOutsideListenerBound = false;

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
                breakdown: event.damageBreakdown
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

function buildSimulationDamageSummary(timeline) {
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
            return {
                operatorId: series.operatorId,
                operatorName: series.operatorName || "Operator",
                color: SIMULATION_ATK_LINE_COLORS[index % SIMULATION_ATK_LINE_COLORS.length],
                totalDamage,
                hits
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
            sharePercent: totalDamage > 0 ? (operator.totalDamage / totalDamage) * 100 : 0
        }))
    };
}

function buildSimulationDamageComparison(summary, baseline) {
    if (!summary || !baseline) return null;
    const baselineOperators = new Map((baseline.operators || []).map(operator => [
        String(operator.operatorId ?? operator.operatorName),
        operator
    ]));
    return {
        totalDamageDelta: Number(summary.totalDamage || 0) - Number(baseline.totalDamage || 0),
        dpsDelta: Number(summary.dps || 0) - Number(baseline.dps || 0),
        operators: summary.operators.map(operator => {
            const key = String(operator.operatorId ?? operator.operatorName);
            return {
                key,
                damageDelta: Number(operator.totalDamage || 0) - Number(baselineOperators.get(key)?.totalDamage || 0)
            };
        })
    };
}

function readSimulationDamageBaseline() {
    try {
        const value = window.localStorage.getItem(SIMULATION_DAMAGE_BASELINE_STORAGE_KEY);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

function writeSimulationDamageBaseline(summary) {
    try {
        window.localStorage.setItem(SIMULATION_DAMAGE_BASELINE_STORAGE_KEY, JSON.stringify(summary));
        return true;
    } catch {
        return false;
    }
}

function clearSimulationDamageBaseline() {
    try {
        window.localStorage.removeItem(SIMULATION_DAMAGE_BASELINE_STORAGE_KEY);
    } catch {
        // Local storage may be unavailable in privacy-restricted contexts.
    }
}

function createSimulationDamageDelta(value) {
    const delta = document.createElement("small");
    const numericValue = Math.round(Number(value) || 0);
    delta.className = `rotation-sim-damage-delta ${numericValue > 0 ? "is-positive" : numericValue < 0 ? "is-negative" : "is-neutral"}`;
    delta.textContent = `${numericValue > 0 ? "+" : ""}${formatSimulationChartNumber(numericValue, 0)} vs baseline`;
    return delta;
}

function createSimulationDamageSummary(timeline) {
    const summary = buildSimulationDamageSummary(timeline);
    if (summary.totalDamage <= 0) return null;
    const baseline = readSimulationDamageBaseline();
    const comparison = buildSimulationDamageComparison(summary, baseline);
    const root = document.createElement("section");
    root.className = "rotation-sim-damage-summary";
    root.setAttribute("aria-label", "Rotation damage summary");

    const heading = document.createElement("div");
    heading.className = "rotation-sim-damage-summary-heading";
    const headingCopy = document.createElement("div");
    const kicker = document.createElement("span");
    kicker.textContent = "Rotation analysis";
    const title = document.createElement("strong");
    title.textContent = "Damage summary";
    headingCopy.append(kicker, title);
    const actions = document.createElement("div");
    actions.className = "rotation-sim-damage-summary-actions";
    const baselineButton = document.createElement("button");
    baselineButton.type = "button";
    baselineButton.textContent = baseline ? "Update baseline" : "Set baseline";
    baselineButton.addEventListener("click", () => {
        if (writeSimulationDamageBaseline(summary)) mountSimulationDamageSummary();
    });
    actions.appendChild(baselineButton);
    if (baseline) {
        const clearButton = document.createElement("button");
        clearButton.type = "button";
        clearButton.className = "is-secondary";
        clearButton.textContent = "Clear";
        clearButton.addEventListener("click", () => {
            clearSimulationDamageBaseline();
            mountSimulationDamageSummary();
        });
        actions.appendChild(clearButton);
    }
    heading.append(headingCopy, actions);

    const metrics = document.createElement("div");
    metrics.className = "rotation-sim-damage-summary-metrics";
    const metricData = [
        ["Team damage", `${formatSimulationChartNumber(summary.totalDamage, 0)} DMG`, comparison?.totalDamageDelta],
        ["Average DPS", `${formatSimulationChartNumber(summary.dps, 0)} DPS`, comparison?.dpsDelta],
        ["Duration", `${formatSimulationChartNumber(summary.durationSeconds)}s`, null],
        ["Strongest hit", `${formatSimulationChartNumber(summary.strongestHit?.damage || 0, 0)} DMG`, null]
    ];
    metricData.forEach(([labelText, valueText, deltaValue], index) => {
        const metric = document.createElement("div");
        metric.className = "rotation-sim-damage-summary-metric";
        const label = document.createElement("span");
        label.textContent = labelText;
        const value = document.createElement("strong");
        value.textContent = valueText;
        metric.append(label, value);
        if (Number.isFinite(deltaValue)) metric.appendChild(createSimulationDamageDelta(deltaValue));
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
        const bar = document.createElement("div");
        bar.className = "rotation-sim-damage-operator-bar";
        const fill = document.createElement("span");
        fill.style.width = `${Math.max(2, operator.sharePercent)}%`;
        bar.appendChild(fill);
        card.append(cardHeader, damage, bar);
        const operatorDelta = comparison?.operators.find(item => item.key === String(operator.operatorId ?? operator.operatorName));
        if (operatorDelta) card.appendChild(createSimulationDamageDelta(operatorDelta.damageDelta));
        breakdown.appendChild(card);
    });

    root.append(heading, metrics, breakdown);
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
            if (target?.closest?.(".rotation-sim-damage-hit, #simulationDamageTooltip")) return;
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

function createSimulationDamageImpulsePath(points, pixelsPerSecond, getY, baselineY) {
    return (Array.isArray(points) ? points : [])
        .slice(1)
        .map(point => {
            const x = Math.max(0, Number(point.time) * pixelsPerSecond);
            return `M ${x} ${baselineY} V ${getY(Number(point.damage) || 0)}`;
        })
        .join(" ");
}

function createSimulationDamageChart(timeline, durationSeconds, pixelsPerSecond) {
    const series = (Array.isArray(timeline) ? timeline : []).filter(item => item?.points?.length > 1);
    if (series.length === 0) return null;
    const duration = Math.max(0.1, Number(durationSeconds) || 0.1);
    const width = Math.max(1, duration * pixelsPerSecond);
    const maximum = Math.max(1, ...series.flatMap(item => item.points.map(point => Number(point.damage) || 0)));
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

    series.forEach((item, index) => {
        const color = SIMULATION_ATK_LINE_COLORS[index % SIMULATION_ATK_LINE_COLORS.length];
        const pathData = createSimulationDamageImpulsePath(item.points, pixelsPerSecond, getY, chartBottom);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.classList.add("rotation-sim-damage-line");
        path.setAttribute("d", pathData);
        path.style.setProperty("--atk-line-color", color);
        svg.appendChild(path);

        item.points.slice(1).forEach(point => {
            const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            marker.classList.add("rotation-sim-damage-hit");
            marker.setAttribute("cx", String(Number(point.time) * pixelsPerSecond));
            marker.setAttribute("cy", String(getY(point.damage)));
            marker.setAttribute("r", "4");
            marker.style.setProperty("--atk-line-color", color);
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
    track.appendChild(svg);

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
    spTrack.insertAdjacentElement("afterend", chart);
    const atkLabel = typeof createRotationTimelineLabel === "function"
        ? createRotationTimelineLabel("ATK")
        : document.createElement("div");
    if (!atkLabel.textContent) atkLabel.textContent = "ATK";
    atkLabel.dataset.timelineLabel = "atk";
    labels.children[2]?.insertAdjacentElement("afterend", atkLabel);
    body.classList.add("has-atk-chart");
    labels.classList.add("has-atk-chart");
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
    atkTrack.insertAdjacentElement("afterend", chart);
    const damageLabel = typeof createRotationTimelineLabel === "function"
        ? createRotationTimelineLabel("DMG")
        : document.createElement("div");
    if (!damageLabel.textContent) damageLabel.textContent = "DMG";
    labels.querySelector('[data-timeline-label="atk"]')?.insertAdjacentElement("afterend", damageLabel);
    body.classList.add("has-damage-chart");
    labels.classList.add("has-damage-chart");
    mountSimulationDamageSummary();
}

function mountSimulationDamageSummary() {
    document.querySelector(".rotation-sim-damage-summary")?.remove();
    const trackScroll = document.querySelector(".rotation-sim-track-scroll");
    const summary = createSimulationDamageSummary(window.__simulationDamageTimeline);
    if (!trackScroll || !summary) return;
    trackScroll.insertAdjacentElement("beforebegin", summary);
}

window.createSimulationWeaponAtkChart = createSimulationWeaponAtkChart;
window.formatSimulationChartNumber = formatSimulationChartNumber;
window.createSimulationAtkStepPath = createSimulationAtkStepPath;
window.mountSimulationWeaponAtkChart = mountSimulationWeaponAtkChart;
window.buildSimulationDamageTimeline = buildSimulationDamageTimeline;
window.buildSimulationDamageSummary = buildSimulationDamageSummary;
window.buildSimulationDamageComparison = buildSimulationDamageComparison;
window.createSimulationDamageSummary = createSimulationDamageSummary;
window.mountSimulationDamageSummary = mountSimulationDamageSummary;
window.createSimulationDamageImpulsePath = createSimulationDamageImpulsePath;
window.buildSimulationDamageTooltipData = buildSimulationDamageTooltipData;
window.getSimulationDamageTooltipPlacement = getSimulationDamageTooltipPlacement;
window.createSimulationDamageChart = createSimulationDamageChart;
window.mountSimulationDamageChart = mountSimulationDamageChart;
