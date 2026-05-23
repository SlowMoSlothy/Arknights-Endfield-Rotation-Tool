const BUILD_SHARE_CODE_PREFIX_V1 = "AERT1:";
const BUILD_SHARE_CODE_PREFIX_V2 = "AERT2:";
const BUILD_SHARE_CODE_PREFIX_V3 = "AERT3:";
const BUILD_SHARE_CODE_PREFIX_V4 = "AERT4:";
const BUILD_SHARE_CODE_PREFIX = "AERT5:";
const BUILD_SHARE_HASH_KEY = "setup";
const BUILD_SHARE_UI_FLAG_SIMULATION_MODE = 1;
const BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND = 2;
const BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION = 4;

function hasKnownBuildShareCodePrefix(value) {
    return [
        BUILD_SHARE_CODE_PREFIX,
        BUILD_SHARE_CODE_PREFIX_V4,
        BUILD_SHARE_CODE_PREFIX_V3,
        BUILD_SHARE_CODE_PREFIX_V2,
        BUILD_SHARE_CODE_PREFIX_V1
    ].some(prefix => String(value || "").startsWith(prefix));
}

function encodeShareText(text) {
    return btoa(text)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function decodeShareText(text) {
    const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return atob(padded);
}

function encodeShareBytes(bytes) {
    let binary = "";
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function decodeShareBytes(text) {
    const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    return Array.from(binary, char => char.charCodeAt(0));
}

function writeVarInt(bytes, value) {
    let remaining = Math.max(0, Math.floor(Number(value) || 0));

    while (remaining >= 0x80) {
        bytes.push((remaining % 0x80) | 0x80);
        remaining = Math.floor(remaining / 0x80);
    }

    bytes.push(remaining);
}

function readVarInt(cursor) {
    let value = 0;
    let multiplier = 1;

    while (cursor.index < cursor.bytes.length) {
        const byte = cursor.bytes[cursor.index++];
        value += (byte & 0x7f) * multiplier;

        if ((byte & 0x80) === 0) {
            return value;
        }

        multiplier *= 0x80;
    }

    throw new Error("Share code ended unexpectedly.");
}

function getShareableRotation() {
    const entries = rotation.map(entry => {
        if (!entry) return null;
        const time = Number(entry.time);
        const shareTime = Number.isFinite(time)
            ? { time: Math.max(0, Math.round(time * 10) / 10) }
            : {};

        if (typeof isBasicAttackEntry === "function" && isBasicAttackEntry(entry)) {
            return {
                type: BASIC_ATTACK_ACTION_TYPE,
                operatorId: Number(entry.operatorId),
                hitCount: Number(entry.hitCount || DEFAULT_BASIC_ATTACK_HITS),
                finalHitCount: Number(entry.finalHitCount || DEFAULT_BASIC_ATTACK_FINAL_HITS),
                ...shareTime
            };
        }

        return {
            type: "skill",
            id: entry.id,
            autoInserted: entry.autoInserted === true,
            ...shareTime
        };
    });

    while (entries.length > 0 && entries[entries.length - 1] === null) {
        entries.pop();
    }

    return entries;
}

function getActiveUltimateStateIds() {
    return Object.keys(operatorUltimateStates)
        .filter(operatorId => operatorUltimateStates[operatorId] === true)
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
}

function getShareableUiSettings() {
    const timelineMode = typeof uiSettings !== "undefined" && uiSettings?.timelineMode === "simulation"
        ? "simulation"
        : "slot";
    const fallbackSpPerSecond = typeof DEFAULT_SIMULATION_SP_PER_SECOND !== "undefined"
        ? DEFAULT_SIMULATION_SP_PER_SECOND
        : 8;
    const spPerSecond = Number(typeof uiSettings !== "undefined"
        ? uiSettings?.simulationSpPerSecond
        : fallbackSpPerSecond);

    const simulationDurationSeconds = Number(typeof uiSettings !== "undefined"
        ? uiSettings?.simulationDurationSeconds
        : NaN);

    const settings = {
        timelineMode,
        simulationSpPerSecond: Number.isFinite(spPerSecond) && spPerSecond >= 0
            ? Math.round(spPerSecond * 10) / 10
            : fallbackSpPerSecond
    };

    if (Number.isFinite(simulationDurationSeconds) && simulationDurationSeconds > 0) {
        settings.simulationDurationSeconds = Math.round(simulationDurationSeconds * 10) / 10;
    }

    return settings;
}

function createCompactShareBytes() {
    const bytes = [];
    selectedTeam.slice(0, 4).forEach(operatorId => {
        writeVarInt(bytes, operatorId === null || operatorId === undefined ? 0 : Number(operatorId) + 1);
    });

    const shareableRotation = getShareableRotation();
    writeVarInt(bytes, shareableRotation.length);
    shareableRotation.forEach(entry => {
        if (!entry) {
            writeVarInt(bytes, 0);
            return;
        }

        if (entry.type === BASIC_ATTACK_ACTION_TYPE) {
            const time = Number(entry.time);
            const hasTime = Number.isFinite(time);
            writeVarInt(bytes, 2);
            writeVarInt(bytes, Number(entry.operatorId) + 1);
            writeVarInt(bytes, Number(entry.hitCount) || DEFAULT_BASIC_ATTACK_HITS);
            writeVarInt(bytes, Number(entry.finalHitCount) || DEFAULT_BASIC_ATTACK_FINAL_HITS);
            writeVarInt(bytes, hasTime ? 1 : 0);
            if (hasTime) writeVarInt(bytes, Math.max(0, Math.round(time * 10)));
            return;
        }

        const autoInsertedFlag = entry.autoInserted === true ? 1 : 0;
        const time = Number(entry.time);
        const hasTime = Number.isFinite(time);
        writeVarInt(bytes, 1);
        writeVarInt(bytes, Number(entry.id));
        writeVarInt(bytes, autoInsertedFlag);
        writeVarInt(bytes, hasTime ? 1 : 0);
        if (hasTime) writeVarInt(bytes, Math.max(0, Math.round(time * 10)));
    });

    const activeUltimateStateIds = getActiveUltimateStateIds();
    writeVarInt(bytes, activeUltimateStateIds.length);
    activeUltimateStateIds.forEach(operatorId => {
        writeVarInt(bytes, operatorId);
    });

    const shareableUiSettings = getShareableUiSettings();
    let uiFlags = 0;
    if (shareableUiSettings.timelineMode === "simulation") uiFlags |= BUILD_SHARE_UI_FLAG_SIMULATION_MODE;
    if (Number.isFinite(Number(shareableUiSettings.simulationSpPerSecond))) {
        uiFlags |= BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND;
    }
    if (Number.isFinite(Number(shareableUiSettings.simulationDurationSeconds))) {
        uiFlags |= BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION;
    }

    writeVarInt(bytes, uiFlags);
    if (uiFlags & BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND) {
        writeVarInt(bytes, Math.max(0, Math.round(Number(shareableUiSettings.simulationSpPerSecond) * 10)));
    }
    if (uiFlags & BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION) {
        writeVarInt(bytes, Math.max(0, Math.round(Number(shareableUiSettings.simulationDurationSeconds) * 10)));
    }

    return bytes;
}

function createBuildShareCode() {
    return `${BUILD_SHARE_CODE_PREFIX}${encodeShareBytes(createCompactShareBytes())}`;
}

function getBuildShareBaseUrl() {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
        return `${window.location.origin}${window.location.pathname}`;
    }

    return typeof builderWatermarkUrl === "undefined"
        ? window.location.href.split("#")[0]
        : builderWatermarkUrl;
}

function createBuildShareLink() {
    const code = createBuildShareCode();
    return `${getBuildShareBaseUrl()}#${BUILD_SHARE_HASH_KEY}=${encodeURIComponent(code)}`;
}

async function copyBuildShareCode() {
    if (typeof hasCreatedRotation === "function" && !hasCreatedRotation()) {
        return false;
    }

    const code = createBuildShareCode();

    try {
        await navigator.clipboard.writeText(code);
        alert(`Share-Code kopiert (${code.length} Zeichen).`);
    } catch (error) {
        console.warn("Clipboard copy failed, falling back to prompt:", error);
        prompt("Share-Code kopieren:", code);
    }

    return true;
}

async function copyBuildShareLink() {
    if (typeof hasCreatedRotation === "function" && !hasCreatedRotation()) {
        return false;
    }

    const link = createBuildShareLink();

    try {
        await navigator.clipboard.writeText(link);
        alert("Share-Link kopiert.");
    } catch (error) {
        console.warn("Clipboard copy failed, falling back to prompt:", error);
        prompt("Share-Link kopieren:", link);
    }

    return true;
}

function extractBuildShareCode(input) {
    const trimmed = String(input || "").trim();
    if (!trimmed) return "";

    try {
        const url = new URL(trimmed);
        const searchCode = url.searchParams.get(BUILD_SHARE_HASH_KEY);
        if (searchCode) return searchCode;

        const hash = url.hash.replace(/^#/, "");
        if (hasKnownBuildShareCodePrefix(hash)) {
            return hash;
        }

        const hashCode = new URLSearchParams(hash).get(BUILD_SHARE_HASH_KEY);
        if (hashCode) return hashCode;
    } catch (error) {
        // Plain share codes are expected here; only full URLs need URL parsing.
    }

    if (trimmed.startsWith(`${BUILD_SHARE_HASH_KEY}=`)) {
        return new URLSearchParams(trimmed).get(BUILD_SHARE_HASH_KEY) || "";
    }

    return trimmed;
}

function parseBuildShareCode(code) {
    const trimmed = extractBuildShareCode(code);

    if (trimmed.startsWith(BUILD_SHARE_CODE_PREFIX)) {
        return parseCompactBuildShareCodeV5(trimmed.slice(BUILD_SHARE_CODE_PREFIX.length));
    }

    if (trimmed.startsWith(BUILD_SHARE_CODE_PREFIX_V4)) {
        return parseCompactBuildShareCodeV4(trimmed.slice(BUILD_SHARE_CODE_PREFIX_V4.length));
    }

    if (trimmed.startsWith(BUILD_SHARE_CODE_PREFIX_V3)) {
        return parseCompactBuildShareCode(trimmed.slice(BUILD_SHARE_CODE_PREFIX_V3.length));
    }

    if (trimmed.startsWith(BUILD_SHARE_CODE_PREFIX_V2)) {
        return parseCompactBuildShareCodeV2(trimmed.slice(BUILD_SHARE_CODE_PREFIX_V2.length));
    }

    return parseLegacyBuildShareCode(trimmed);
}

function parseLegacyBuildShareCode(code) {
    const encoded = code.startsWith(BUILD_SHARE_CODE_PREFIX_V1)
        ? code.slice(BUILD_SHARE_CODE_PREFIX_V1.length)
        : code;

    if (!encoded) {
        throw new Error("Share code is empty.");
    }

    const payload = JSON.parse(decodeShareText(encoded.replace(/\s/g, "")));
    if (!payload || payload.v !== 1) {
        throw new Error("Unsupported share code version.");
    }

    return payload;
}

function readOptionalShareTime(cursor) {
    const hasTime = readVarInt(cursor) === 1;
    return hasTime ? Math.max(0, Math.round(readVarInt(cursor)) / 10) : null;
}

function readCompactShareTeam(cursor) {
    return [null, null, null, null].map(() => {
        const storedOperatorId = readVarInt(cursor);
        return storedOperatorId === 0 ? null : storedOperatorId - 1;
    });
}

function readCompactShareRotation(cursor) {
    const rotationLength = readVarInt(cursor);
    const importedRotation = [];
    for (let index = 0; index < rotationLength; index++) {
        const entryType = readVarInt(cursor);
        if (entryType === 0) {
            importedRotation.push(null);
            continue;
        }

        if (entryType === 2) {
            const storedOperatorId = readVarInt(cursor);
            const basicAttackEntry = {
                type: BASIC_ATTACK_ACTION_TYPE,
                operatorId: storedOperatorId - 1,
                hitCount: readVarInt(cursor),
                finalHitCount: readVarInt(cursor)
            };
            const time = readOptionalShareTime(cursor);
            if (time !== null) basicAttackEntry.time = time;
            importedRotation.push(basicAttackEntry);
            continue;
        }

        if (entryType !== 1) {
            throw new Error("Unsupported rotation entry type.");
        }

        const skillEntry = {
            type: "skill",
            id: readVarInt(cursor),
            autoInserted: readVarInt(cursor) === 1
        };
        const time = readOptionalShareTime(cursor);
        if (time !== null) skillEntry.time = time;
        importedRotation.push(skillEntry);
    }

    return importedRotation;
}

function readCompactShareUltimateStates(cursor) {
    const ultimateStateCount = cursor.index < cursor.bytes.length ? readVarInt(cursor) : 0;
    const importedUltimateStates = {};
    for (let index = 0; index < ultimateStateCount; index++) {
        importedUltimateStates[readVarInt(cursor)] = true;
    }

    return importedUltimateStates;
}

function readCompactShareUiSettingsV5(cursor) {
    const uiFlags = cursor.index < cursor.bytes.length ? readVarInt(cursor) : 0;
    const uiSettingsPayload = {
        timelineMode: (uiFlags & BUILD_SHARE_UI_FLAG_SIMULATION_MODE) ? "simulation" : "slot"
    };

    if ((uiFlags & BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND) && cursor.index < cursor.bytes.length) {
        uiSettingsPayload.simulationSpPerSecond = readVarInt(cursor) / 10;
    }

    if ((uiFlags & BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION) && cursor.index < cursor.bytes.length) {
        uiSettingsPayload.simulationDurationSeconds = readVarInt(cursor) / 10;
    }

    return uiSettingsPayload;
}

function parseCompactBuildShareCodeV5(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = readCompactShareTeam(cursor);
    const importedRotation = readCompactShareRotation(cursor);
    const importedUltimateStates = readCompactShareUltimateStates(cursor);

    return {
        v: 5,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates,
        uiSettings: readCompactShareUiSettingsV5(cursor)
    };
}

function parseCompactBuildShareCodeV4(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = [null, null, null, null].map(() => {
        const storedOperatorId = readVarInt(cursor);
        return storedOperatorId === 0 ? null : storedOperatorId - 1;
    });

    const rotationLength = readVarInt(cursor);
    const importedRotation = [];
    for (let index = 0; index < rotationLength; index++) {
        const entryType = readVarInt(cursor);
        if (entryType === 0) {
            importedRotation.push(null);
            continue;
        }

        if (entryType === 2) {
            const storedOperatorId = readVarInt(cursor);
            const basicAttackEntry = {
                type: BASIC_ATTACK_ACTION_TYPE,
                operatorId: storedOperatorId - 1,
                hitCount: readVarInt(cursor),
                finalHitCount: readVarInt(cursor)
            };
            const time = readOptionalShareTime(cursor);
            if (time !== null) basicAttackEntry.time = time;
            importedRotation.push(basicAttackEntry);
            continue;
        }

        if (entryType !== 1) {
            throw new Error("Unsupported rotation entry type.");
        }

        const skillEntry = {
            type: "skill",
            id: readVarInt(cursor),
            autoInserted: readVarInt(cursor) === 1
        };
        const time = readOptionalShareTime(cursor);
        if (time !== null) skillEntry.time = time;
        importedRotation.push(skillEntry);
    }

    const ultimateStateCount = cursor.index < bytes.length ? readVarInt(cursor) : 0;
    const importedUltimateStates = {};
    for (let index = 0; index < ultimateStateCount; index++) {
        importedUltimateStates[readVarInt(cursor)] = true;
    }

    const timelineMode = cursor.index < bytes.length && readVarInt(cursor) === 1
        ? "simulation"
        : "slot";
    const spPerSecond = cursor.index < bytes.length
        ? readVarInt(cursor) / 10
        : null;

    return {
        v: 4,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates,
        uiSettings: {
            timelineMode,
            ...(Number.isFinite(spPerSecond) ? { simulationSpPerSecond: spPerSecond } : {})
        }
    };
}

function parseCompactBuildShareCode(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = [null, null, null, null].map(() => {
        const storedOperatorId = readVarInt(cursor);
        return storedOperatorId === 0 ? null : storedOperatorId - 1;
    });

    const rotationLength = readVarInt(cursor);
    const importedRotation = [];
    for (let index = 0; index < rotationLength; index++) {
        const entryType = readVarInt(cursor);
        if (entryType === 0) {
            importedRotation.push(null);
            continue;
        }

        if (entryType === 2) {
            const storedOperatorId = readVarInt(cursor);
            importedRotation.push({
                type: BASIC_ATTACK_ACTION_TYPE,
                operatorId: storedOperatorId - 1,
                hitCount: readVarInt(cursor),
                finalHitCount: readVarInt(cursor)
            });
            continue;
        }

        if (entryType !== 1) {
            throw new Error("Unsupported rotation entry type.");
        }

        importedRotation.push({
            type: "skill",
            id: readVarInt(cursor),
            autoInserted: readVarInt(cursor) === 1
        });
    }

    const ultimateStateCount = cursor.index < bytes.length ? readVarInt(cursor) : 0;
    const importedUltimateStates = {};
    for (let index = 0; index < ultimateStateCount; index++) {
        importedUltimateStates[readVarInt(cursor)] = true;
    }

    return {
        v: 3,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates
    };
}

function parseCompactBuildShareCodeV2(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = [null, null, null, null].map(() => {
        const storedOperatorId = readVarInt(cursor);
        return storedOperatorId === 0 ? null : storedOperatorId - 1;
    });

    const rotationLength = readVarInt(cursor);
    const importedRotation = [];
    for (let index = 0; index < rotationLength; index++) {
        const storedEntry = readVarInt(cursor);
        if (storedEntry === 0) {
            importedRotation.push(null);
            continue;
        }

        const packedEntry = storedEntry - 1;
        importedRotation.push({
            type: "skill",
            id: Math.floor(packedEntry / 2),
            autoInserted: (packedEntry % 2) === 1
        });
    }

    const ultimateStateCount = cursor.index < bytes.length ? readVarInt(cursor) : 0;
    const importedUltimateStates = {};
    for (let index = 0; index < ultimateStateCount; index++) {
        importedUltimateStates[readVarInt(cursor)] = true;
    }

    return {
        v: 2,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates
    };
}

function getBuildShareCodeFromUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    const queryCode = searchParams.get(BUILD_SHARE_HASH_KEY);
    if (queryCode) return queryCode;

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return null;

    if (hasKnownBuildShareCodePrefix(hash)) {
        return hash;
    }

    const hashParams = new URLSearchParams(hash);
    return hashParams.get(BUILD_SHARE_HASH_KEY);
}

function loadBuildShareCodeFromUrl() {
    const code = getBuildShareCodeFromUrl();
    if (!code) return false;

    try {
        applyBuildShareCode(decodeURIComponent(code));
        return true;
    } catch (error) {
        console.error("Share link import failed:", error);
        alert("Der Share-Link konnte nicht geladen werden.");
        return false;
    }
}

function normalizeImportedTeam(team) {
    const normalizedTeam = [null, null, null, null];
    if (!Array.isArray(team)) return normalizedTeam;

    team.slice(0, 4).forEach((value, index) => {
        if (value === null || value === undefined) return;

        const operatorId = Number(value);
        if (operators.some(op => op.id === operatorId)) {
            normalizedTeam[index] = operatorId;
        }
    });

    return normalizedTeam;
}

function normalizeImportedRotation(importedRotation) {
    if (!Array.isArray(importedRotation)) return [null];

    const normalizedRotation = importedRotation.map(entry => {
        if (!entry) return null;

        if (typeof isBasicAttackEntry === "function" && isBasicAttackEntry(entry)) {
            const operatorId = Number(entry.operatorId);
            const basicAttackEntry = createBasicAttackRotationEntry(operatorId, entry);
            if (!basicAttackEntry) {
                throw new Error(`Unknown basic attack operator id: ${operatorId}`);
            }
            const time = Number(entry.time);
            if (Number.isFinite(time) && time >= 0) {
                basicAttackEntry.time = Math.round(time * 10) / 10;
            }
            return basicAttackEntry;
        }

        const skillId = Number(typeof entry === "object" ? entry.id : entry);
        if (!Number.isFinite(skillId) || !getSkillById(skillId)) {
            throw new Error(`Unknown skill id: ${skillId}`);
        }

        const normalizedEntry = {
            uid: crypto.randomUUID(),
            id: skillId,
            autoInserted: typeof entry === "object" && entry.autoInserted === true
        };

        const time = Number(typeof entry === "object" ? entry.time : NaN);
        if (Number.isFinite(time) && time >= 0) {
            normalizedEntry.time = Math.round(time * 10) / 10;
        }

        return normalizedEntry;
    });

    return normalizedRotation.length > 0 ? normalizedRotation : [null];
}

function applyImportedUiSettings(payload) {
    const importedSettings = payload?.uiSettings;
    if (!importedSettings || typeof uiSettings === "undefined") return;

    if (importedSettings.timelineMode === "slot" || importedSettings.timelineMode === "simulation") {
        uiSettings.timelineMode = importedSettings.timelineMode;
    }

    const spPerSecond = Number(importedSettings.simulationSpPerSecond);
    if (Number.isFinite(spPerSecond) && spPerSecond >= 0) {
        uiSettings.simulationSpPerSecond = Math.round(spPerSecond * 10) / 10;
    }

    const simulationDurationSeconds = Number(importedSettings.simulationDurationSeconds);
    if (Number.isFinite(simulationDurationSeconds) && simulationDurationSeconds > 0) {
        uiSettings.simulationDurationSeconds = Math.round(simulationDurationSeconds * 10) / 10;
    }

    if (typeof saveUiSettings === "function") saveUiSettings();
    if (typeof applyUiSettings === "function") applyUiSettings();
}

function applyBuildShareCode(code) {
    const payload = parseBuildShareCode(code);

    selectedTeam = normalizeImportedTeam(payload.team);
    rotation = normalizeImportedRotation(payload.rotation);
    operatorUltimateStates = payload.operatorUltimateStates && typeof payload.operatorUltimateStates === "object"
        ? payload.operatorUltimateStates
        : {};
    activeSlotIndex = null;
    applyImportedUiSettings(payload);

    compactRotation();
    ensureSlotCount(rotation.filter(entry => entry !== null).length + 1);

    saveTeam();
    localStorage.setItem("rotation", JSON.stringify(rotation));
    localStorage.setItem("operatorUltimateStates", JSON.stringify(operatorUltimateStates));

    if (typeof renderTeamSlots === "function") renderTeamSlots();
    if (typeof renderOperatorList === "function") renderOperatorList();
    if (typeof renderSelectedOperators === "function") renderSelectedOperators();
    if (typeof renderSkills === "function") renderSkills();
    if (typeof renderRotation === "function") renderRotation();
    if (typeof initSkillDragDrop === "function") initSkillDragDrop();
}

function loadBuildShareCode() {
    const code = prompt("Paste share code or share link:");
    if (!code) return;

    try {
        applyBuildShareCode(code);
        alert("Team und Rotation wurden geladen.");
    } catch (error) {
        console.error("Share code import failed:", error);
        alert("Der Share-Code konnte nicht geladen werden.");
    }
}
