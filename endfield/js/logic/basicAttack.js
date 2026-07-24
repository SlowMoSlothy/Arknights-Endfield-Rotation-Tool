const BASIC_ATTACK_ACTION_TYPE = "basicAttack";
const DEFAULT_BASIC_ATTACK_HITS = 5;
const DEFAULT_BASIC_ATTACK_FINAL_HITS = 1;
const DEFAULT_BASIC_ATTACK_HIT_INTERVAL_SECONDS = 0.25;
const DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT = 1;

function isPlainBasicAttackObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeBasicAttackElementType(elementType) {
    if (typeof normalizeSkillElementType === "function") {
        return normalizeSkillElementType(elementType);
    }

    const key = String(elementType || "").trim().toLowerCase();
    const map = {
        heat: "heat",
        fire: "heat",
        cryo: "cryo",
        ice: "cryo",
        frost: "cryo",
        electric: "electric",
        electro: "electric",
        lightning: "electric",
        nature: "nature",
        plant: "nature",
        physical: "physical",
        neutral: "physical"
    };

    return map[key] || "neutral";
}

function clampBasicAttackNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(Math.round(number), max));
}

function getBasicAttackOperatorById(operatorId) {
    const id = Number(operatorId);
    if (!Number.isFinite(id) || typeof operators === "undefined" || !Array.isArray(operators)) return null;
    return operators.find(operator => Number(operator.id) === id) || null;
}

function getBasicAttackConfig(operator, overrides = {}) {
    const rawConfig = isPlainBasicAttackObject(operator?.basicAttack) ? operator.basicAttack : {};
    const hasBasicAttackConfig = Object.keys(rawConfig).length > 0 || Object.keys(overrides || {}).some(key => key !== "uid" && key !== "type" && key !== "actionType" && key !== "operatorId");
    const secondsPerSlot = Math.max(
        0.1,
        Number(overrides.secondsPerSlot ?? rawConfig.secondsPerSlot ?? DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT)
        || DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT
    );
    const sequences = normalizeBasicAttackSequences(rawConfig, overrides);
    const sequenceHitCount = sequences.reduce((total, sequence) => total + sequence.hitCount, 0);
    const hitCount = sequences.length > 0
        ? sequenceHitCount
        : clampBasicAttackNumber(
            overrides.hitCount ?? rawConfig.hitCount ?? rawConfig.hits,
            DEFAULT_BASIC_ATTACK_HITS,
            1,
            24
        );
    const finalHitCount = clampBasicAttackNumber(
        overrides.finalHitCount ?? rawConfig.finalHitCount ?? (rawConfig.finalDoubleHit ? 2 : undefined),
        DEFAULT_BASIC_ATTACK_FINAL_HITS,
        1,
        4
    );
    const animations = sequences.length > 0
        ? sequences.map(sequence => ({
            label: sequence.label,
            hits: sequence.hitCount,
            duration: sequence.duration
        }))
        : normalizeBasicAttackAnimations(rawConfig, overrides, hitCount, secondsPerSlot);
    const hitTimings = sequences.length > 0
        ? flattenBasicAttackSequenceHitTimings(sequences)
        : normalizeBasicAttackHitTimings(rawConfig, overrides, hitCount, animations, secondsPerSlot);
    const sequenceCycleDuration = sequences.reduce((total, sequence) => total + sequence.duration, 0);

    return {
        hitCount,
        finalHitCount,
        sequences,
        animations,
        hitTimings,
        secondsPerSlot,
        totalDuration: hitTimings.length ? hitTimings[hitTimings.length - 1].time : 0,
        cycleDuration: Number(overrides.cycleDuration ?? overrides.loopDuration ?? rawConfig.cycleDuration ?? rawConfig.loopDuration ?? rawConfig.sequenceDuration ?? rawConfig.duration) || sequenceCycleDuration || 0,
        hasBasicAttackConfig,
        iconSmall: rawConfig.iconSmall || rawConfig.icon || operator?.icon,
        buffs: Array.isArray(rawConfig.buffs) ? rawConfig.buffs : [],
        debuffs: Array.isArray(rawConfig.debuffs) ? rawConfig.debuffs : [],
        description: rawConfig.description || ""
    };
}

function normalizeBasicAttackSequences(rawConfig, overrides = {}) {
    const source = overrides.sequences || rawConfig.sequences;
    if (!Array.isArray(source) || source.length === 0) return [];

    return source.map((rawSequence, index) => {
        const sequence = isPlainBasicAttackObject(rawSequence) ? rawSequence : {};
        const hitTimingMode = String(
            sequence.hitTimingMode
            || overrides.hitTimingMode
            || rawConfig.hitTimingMode
            || "absolute"
        ).trim().toLowerCase();
        const rawTimings = Array.isArray(sequence.hitTimings)
            ? sequence.hitTimings
            : (Array.isArray(sequence.hitTimes) ? sequence.hitTimes : []);
        const requestedHitCount = clampBasicAttackNumber(
            sequence.hitCount ?? rawTimings.length,
            Math.max(1, rawTimings.length),
            1,
            24
        );
        const fallbackInterval = Math.max(0.001, Number(sequence.hitInterval) || DEFAULT_BASIC_ATTACK_HIT_INTERVAL_SECONDS);
        const normalizedRawTimings = Array.from({ length: requestedHitCount }, (_, hitIndex) => {
            const rawTiming = rawTimings[hitIndex];
            const value = isPlainBasicAttackObject(rawTiming)
                ? rawTiming.time ?? rawTiming.timeSeconds
                : rawTiming;
            const fallback = hitTimingMode === "intervals" || hitTimingMode === "interval"
                ? fallbackInterval
                : (hitIndex + 1) * fallbackInterval;
            return Math.max(0, Number.isFinite(Number(value)) ? Number(value) : fallback);
        });
        const hitTimings = hitTimingMode === "intervals" || hitTimingMode === "interval"
            ? normalizedRawTimings.reduce((times, interval) => {
                times.push((times[times.length - 1] || 0) + interval);
                return times;
            }, [])
            : normalizedRawTimings.sort((left, right) => left - right);
        const lastHitTime = hitTimings.length > 0 ? Math.max(...hitTimings) : 0;
        const explicitDuration = Number(
            sequence.duration
            ?? sequence.durationSeconds
            ?? sequence.sequenceDuration
        );
        const recoveryDuration = Math.max(
            0,
            Number(sequence.recoveryDuration ?? sequence.recoverySeconds ?? DEFAULT_BASIC_ATTACK_HIT_INTERVAL_SECONDS)
            || 0
        );
        const duration = Number.isFinite(explicitDuration) && explicitDuration > 0
            ? Math.max(explicitDuration, lastHitTime)
            : Math.max(0.1, lastHitTime + recoveryDuration);
        const kind = String(sequence.kind || "normal").trim().toLowerCase().replace(/[\s-]+/g, "_");
        const sequenceIndex = Math.max(1, Math.round(Number(sequence.sequenceIndex) || index + 1));
        const hitMultipliers = Array.isArray(sequence.hitMultipliers)
            ? sequence.hitMultipliers.map(value => Number(value)).filter(Number.isFinite)
            : [];
        const isFinalStrikeSequence = kind === "final_strike"
            || (Array.isArray(sequence.emits) && sequence.emits.includes("final_strike"));
        const eventHitIndex = clampBasicAttackNumber(
            sequence.eventHitIndex,
            requestedHitCount,
            1,
            requestedHitCount
        );

        return {
            ...sequence,
            hitTimingMode,
            kind,
            sequenceIndex,
            label: sequence.label || (kind === "final_strike" ? "FS" : `SEQ ${sequenceIndex}`),
            hitCount: requestedHitCount,
            hitTimings,
            hitMultipliers,
            duration,
            atkMultiplierTotal: Number(sequence.atkMultiplierTotal) || 0,
            staggerMultiplier: Number(sequence.staggerMultiplier) || 0,
            isFinalStrike: isFinalStrikeSequence,
            eventHitIndex
        };
    });
}

function flattenBasicAttackSequenceHitTimings(sequences) {
    const timings = [];
    let sequenceStart = 0;

    sequences.forEach(sequence => {
        sequence.hitTimings.forEach((localTime, hitIndex) => {
            timings.push({
                hit: timings.length + 1,
                time: Math.round((sequenceStart + localTime) * 1000) / 1000,
                localTime: Math.round(localTime * 1000) / 1000,
                hitInSequence: hitIndex + 1,
                sequenceIndex: sequence.sequenceIndex,
                sequenceKind: sequence.kind,
                sequenceLabel: sequence.label,
                sequenceHitCount: sequence.hitCount,
                atkMultiplierTotal: sequence.atkMultiplierTotal,
                hitMultiplier: Number(sequence.hitMultipliers?.[hitIndex]) || null,
                staggerMultiplier: sequence.staggerMultiplier,
                isFinalStrikeSequence: sequence.isFinalStrike === true,
                isFinalStrike: sequence.isFinalStrike === true && hitIndex + 1 === sequence.eventHitIndex
            });
        });
        sequenceStart += sequence.duration;
    });

    return timings;
}

function normalizeBasicAttackAnimations(rawConfig, overrides, hitCount, secondsPerSlot = DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT) {
    const source = overrides.animations
        || overrides.hitAnimations
        || rawConfig.animations
        || rawConfig.hitAnimations
        || rawConfig.animationGroups;

    if (Array.isArray(source) && source.length) {
        const normalized = [];
        let assignedHits = 0;

        source.forEach((animation, index) => {
            if (!isPlainBasicAttackObject(animation)) return;
            const hits = clampBasicAttackNumber(animation.hits ?? animation.hitCount, 1, 1, hitCount);
            const duration = Math.max(0, Number(animation.duration ?? animation.durationSeconds ?? 0) || 0);
            assignedHits += hits;
            normalized.push({
                label: animation.label || `A${index + 1}`,
                hits,
                duration
            });
        });

        const remainingHits = hitCount - assignedHits;
        if (remainingHits > 0) {
            normalized.push({
                label: `A${normalized.length + 1}`,
                hits: remainingHits,
                duration: remainingHits * DEFAULT_BASIC_ATTACK_HIT_INTERVAL_SECONDS
            });
        }

        return normalized;
    }

    if (rawConfig.firstAnimationHits || rawConfig.firstAnimationDuration) {
        const firstHits = clampBasicAttackNumber(rawConfig.firstAnimationHits, 1, 1, hitCount);
        const firstDuration = Math.max(0, Number(rawConfig.firstAnimationDuration || rawConfig.firstAnimationDurationSeconds || DEFAULT_BASIC_ATTACK_HIT_INTERVAL_SECONDS) || 0);
        const animations = [{
            label: "A1",
            hits: firstHits,
            duration: firstDuration
        }];
        const remainingHits = hitCount - firstHits;

        if (remainingHits > 0) {
            const remainingDuration = Math.max(
                DEFAULT_BASIC_ATTACK_HIT_INTERVAL_SECONDS,
                secondsPerSlot - firstDuration
            );
            animations.push({
                label: "A2",
                hits: remainingHits,
                duration: remainingDuration
            });
        }

        return animations;
    }

    return [{
        label: "A1",
        hits: hitCount,
        duration: secondsPerSlot
    }];
}

function normalizeBasicAttackHitTimings(rawConfig, overrides, hitCount, animations, secondsPerSlot = DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT) {
    const source = overrides.hitTimings || overrides.hitTimes || rawConfig.hitTimings || rawConfig.hitTimes;

    if (Array.isArray(source) && source.length) {
        const fallbackInterval = secondsPerSlot / Math.max(1, hitCount);
        return Array.from({ length: hitCount }, (_, index) => {
            const rawHit = source[index];
            const time = isPlainBasicAttackObject(rawHit) ? rawHit.time ?? rawHit.timeSeconds : rawHit;
            return {
                hit: index + 1,
                time: Math.max(0, Number(time) || ((index + 1) * fallbackInterval))
            };
        });
    }

    const timings = [];
    let elapsed = 0;

    animations.forEach(animation => {
        const hits = clampBasicAttackNumber(animation.hits, 1, 1, hitCount);
        const duration = Math.max(0, Number(animation.duration) || hits * DEFAULT_BASIC_ATTACK_HIT_INTERVAL_SECONDS);
        for (let index = 0; index < hits && timings.length < hitCount; index++) {
            timings.push({
                hit: timings.length + 1,
                time: elapsed + (duration * (index + 1) / hits)
            });
        }
        elapsed += duration;
    });

    while (timings.length < hitCount) {
        const fallbackInterval = secondsPerSlot / Math.max(1, hitCount);
        timings.push({
            hit: timings.length + 1,
            time: (timings.length + 1) * fallbackInterval
        });
    }

    return timings.map(timing => ({
        hit: timing.hit,
        time: Math.round(timing.time * 100) / 100
    }));
}

function getBasicAttackByOperatorId(operatorId, overrides = {}) {
    const operator = getBasicAttackOperatorById(operatorId);
    if (!operator) return null;

    const config = getBasicAttackConfig(operator, overrides);
    const finalCopy = config.finalHitCount > 1
        ? ` The final hit counts as ${config.finalHitCount} hits.`
        : "";

    const attackData = {
        actionType: BASIC_ATTACK_ACTION_TYPE,
        isBasicAttack: true,
        operatorId: Number(operator.id),
        name: `${operator.name} Basic Attack`,
        operator: operator.name,
        type: "Basic Attack",
        shortType: "BATK",
        elementType: normalizeBasicAttackElementType(operator.elementType),
        icon: operator.icon,
        iconSmall: config.iconSmall,
        cooldown: 0,
        energy: 0,
        hitCount: config.hitCount,
        finalHitCount: config.finalHitCount,
        sequences: config.sequences,
        animations: config.animations,
        hitTimings: config.hitTimings,
        secondsPerSlot: config.secondsPerSlot,
        totalDuration: config.totalDuration,
        cycleDuration: config.cycleDuration,
        hasBasicAttackConfig: config.hasBasicAttackConfig,
        description: config.description || `${config.hitCount}-hit basic attack chain.${finalCopy}`,
        buffs: config.buffs,
        debuffs: config.debuffs,
        fillMode: "full"
    };

    const timelineTime = Number(overrides.timelineTime);
    const formIntervals = Array.isArray(overrides.formIntervals) ? overrides.formIntervals : [];
    if (!Number.isFinite(timelineTime) || typeof resolveOperatorFormAction !== "function") return attackData;
    const resolvedAttack = resolveOperatorFormAction(attackData, operator.id, timelineTime, formIntervals);
    if (!resolvedAttack?.isFormVariant || !Array.isArray(resolvedAttack.sequences)) return resolvedAttack;

    const sequences = normalizeBasicAttackSequences({}, {
        sequences: resolvedAttack.sequences,
        hitTimingMode: resolvedAttack.hitTimingMode
    });
    const hitTimings = flattenBasicAttackSequenceHitTimings(sequences);
    return {
        ...resolvedAttack,
        sequences,
        hitCount: sequences.reduce((total, sequence) => total + sequence.hitCount, 0),
        animations: sequences.map(sequence => ({
            label: sequence.label,
            hits: sequence.hitCount,
            duration: sequence.duration
        })),
        hitTimings,
        totalDuration: hitTimings.length > 0 ? hitTimings[hitTimings.length - 1].time : 0,
        cycleDuration: Number(resolvedAttack.cycleDuration) || sequences.reduce((total, sequence) => total + sequence.duration, 0)
    };
}

function getBasicAttackFormSegments(operatorId, durationSeconds, formIntervals = []) {
    const duration = Math.max(0, Number(durationSeconds) || 0);
    const relevantBoundaries = (Array.isArray(formIntervals) ? formIntervals : [])
        .filter(interval => Number(interval.operatorId) === Number(operatorId))
        .flatMap(interval => [Number(interval.start), Number(interval.end)])
        .filter(value => Number.isFinite(value) && value > 0 && value < duration);
    const boundaries = [...new Set([0, ...relevantBoundaries, duration])].sort((left, right) => left - right);

    return boundaries.slice(0, -1).map((start, index) => {
        const end = boundaries[index + 1];
        const sampleTime = Math.min(end - 0.0001, start + 0.0001);
        const attackData = getBasicAttackByOperatorId(operatorId, {
            timelineTime: Math.max(start, sampleTime),
            formIntervals
        });
        return attackData ? {
            start,
            end,
            attackData,
            form: typeof getActiveOperatorForm === "function"
                ? getActiveOperatorForm(operatorId, sampleTime, formIntervals)
                : null
        } : null;
    }).filter(Boolean);
}

function isBasicAttackEntry(entry) {
    return entry?.type === BASIC_ATTACK_ACTION_TYPE || entry?.actionType === BASIC_ATTACK_ACTION_TYPE;
}

function createBasicAttackRotationEntry(operatorId, overrides = {}) {
    const attackData = getBasicAttackByOperatorId(operatorId, overrides);
    if (!attackData) return null;

    return {
        uid: crypto.randomUUID(),
        type: BASIC_ATTACK_ACTION_TYPE,
        operatorId: attackData.operatorId,
        hitCount: attackData.hitCount,
        finalHitCount: attackData.finalHitCount
    };
}

function getRotationActionData(entry) {
    if (!entry) return null;

    if (isBasicAttackEntry(entry)) {
        return getBasicAttackByOperatorId(entry.operatorId, entry);
    }

    if (typeof getSkillById !== "function") return null;
    return getSkillById(entry.id);
}

function createBasicAttackHitRow(attackData, className = "basic-attack-hit-row") {
    const row = document.createElement("div");
    row.className = className;
    row.setAttribute("aria-label", `${attackData.hitCount} basic attack hits`);

    for (let index = 0; index < attackData.hitCount; index++) {
        const dot = document.createElement("span");
        dot.className = "basic-attack-hit-dot";
        if (index === attackData.hitCount - 1 && attackData.finalHitCount > 1) {
            dot.classList.add("is-double");
            dot.title = `${attackData.finalHitCount} hits`;
        }
        row.appendChild(dot);
    }

    return row;
}

function formatBasicAttackSeconds(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    const rounded = Math.round(number * 100) / 100;
    const text = Math.abs(rounded - Math.round(rounded)) < 0.001
        ? String(Math.round(rounded))
        : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return `${text}s`;
}

function getBasicAttackHitTimeline(attackData) {
    const hitTimings = Array.isArray(attackData.hitTimings) ? attackData.hitTimings : [];
    const secondsPerSlot = Math.max(
        0.1,
        Number(attackData.secondsPerSlot ?? DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT)
        || DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT
    );
    const fallbackInterval = secondsPerSlot / Math.max(1, attackData.hitCount);
    return Array.from({ length: attackData.hitCount }, (_, index) => {
        const timing = hitTimings[index] || {};
        return {
            ...(isPlainBasicAttackObject(timing) ? timing : {}),
            hit: index + 1,
            time: Math.max(0, Number(timing.time) || ((index + 1) * fallbackInterval)),
            finalHitCount: timing.isFinalStrike === true
                ? Number(timing.sequenceHitCount || attackData.finalHitCount || 1)
                : (index === attackData.hitCount - 1 && !(Array.isArray(attackData.sequences) && attackData.sequences.length > 0)
                    ? Number(attackData.finalHitCount || 1)
                    : 1)
        };
    });
}

function getBasicAttackTimelineHitLabel(hit) {
    if (hit?.isFinalStrike) return "FS";
    const sequenceIndex = Number(hit?.sequenceIndex);
    if (!Number.isFinite(sequenceIndex)) return String(hit?.hit || "");
    return Number(hit?.sequenceHitCount || 1) > 1
        ? `${sequenceIndex}.${Number(hit?.hitInSequence) || 1}`
        : String(sequenceIndex);
}

function createBasicAttackTimeline(attackData, className = "basic-attack-timeline") {
    const timeline = document.createElement("div");
    timeline.className = className;
    timeline.setAttribute("aria-label", `${attackData.hitCount} basic attack hits`);
    const secondsPerSlot = Math.max(0.1, Number(attackData.secondsPerSlot || DEFAULT_BASIC_ATTACK_SECONDS_PER_SLOT));
    timeline.dataset.secondsPerSlot = String(secondsPerSlot);

    const line = document.createElement("span");
    line.className = "basic-attack-timeline-line";
    timeline.appendChild(line);

    const hits = getBasicAttackHitTimeline(attackData);
    hits.forEach(hit => {
        const marker = document.createElement("span");
        marker.className = "basic-attack-timeline-marker";
        if (hit.finalHitCount > 1) marker.classList.add("is-double");
        const markerPosition = Math.min(100, Math.max(0, (hit.time / secondsPerSlot) * 100));
        marker.style.left = `${Math.round(markerPosition * 1000) / 1000}%`;
        marker.dataset.hit = String(hit.hit);
        marker.textContent = getBasicAttackTimelineHitLabel(hit);
        marker.title = `${hit.sequenceLabel || `Hit ${hit.hit}`}: ${formatBasicAttackSeconds(hit.time)}${hit.sequenceHitCount > 1 ? `, hit ${hit.hitInSequence}/${hit.sequenceHitCount}` : ""}`;
        timeline.appendChild(marker);
    });

    return timeline;
}

function createBasicAttackIcon(attackData, options = {}) {
    const { size = "small", extraClasses = [] } = options;
    const elementType = normalizeBasicAttackElementType(attackData.elementType);
    const root = document.createElement("div");
    root.className = [
        "basic-attack-icon",
        `basic-attack-icon-${size}`,
        `ef-element-${elementType}`,
        ...extraClasses
    ].join(" ");

    const label = document.createElement("span");
    label.className = "basic-attack-icon-label";
    label.textContent = "BA";

    root.append(label, createBasicAttackHitRow(attackData, "basic-attack-icon-hits"));
    return root;
}
