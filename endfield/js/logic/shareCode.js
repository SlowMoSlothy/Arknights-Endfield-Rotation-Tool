const BUILD_SHARE_CODE_PREFIX_V1 = "AERT1:";
const BUILD_SHARE_CODE_PREFIX_V2 = "AERT2:";
const BUILD_SHARE_CODE_PREFIX_V3 = "AERT3:";
const BUILD_SHARE_CODE_PREFIX_V4 = "AERT4:";
const BUILD_SHARE_CODE_PREFIX_V5 = "AERT5:";
const BUILD_SHARE_CODE_PREFIX_V6 = "AERT6:";
const BUILD_SHARE_CODE_PREFIX_V7 = "AERT7:";
const BUILD_SHARE_CODE_PREFIX_V8 = "AERT8:";
const BUILD_SHARE_CODE_PREFIX_V9 = "AERT9:";
const BUILD_SHARE_CODE_PREFIX = "AERT10:";
const BUILD_SHARE_HASH_KEY = "setup";
const BUILD_SHARE_UI_FLAG_SIMULATION_MODE = 1;
const BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND = 2;
const BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION = 4;
const BUILD_SHARE_UI_FLAG_DAMAGE_MODE_NORMAL = 8;
const BUILD_SHARE_UI_FLAG_DAMAGE_MODE_CRITICAL = 16;
const BUILD_SHARE_UI_FLAG_MASK = BUILD_SHARE_UI_FLAG_SIMULATION_MODE
    | BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND
    | BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION;
const BUILD_SHARE_UI_FLAG_MASK_V10 = BUILD_SHARE_UI_FLAG_MASK
    | BUILD_SHARE_UI_FLAG_DAMAGE_MODE_NORMAL
    | BUILD_SHARE_UI_FLAG_DAMAGE_MODE_CRITICAL;
const BUILD_SHARE_MAX_ROTATION_ENTRIES = 240;
const BUILD_SHARE_MAX_WEAPON_LOADOUTS = 4;
const BUILD_SHARE_MAX_WEAPON_KEY_LENGTH = 120;
const BUILD_PERSISTENCE_PAYLOAD_VERSION = 10;

function hasKnownBuildShareCodePrefix(value) {
    return [
        BUILD_SHARE_CODE_PREFIX,
        BUILD_SHARE_CODE_PREFIX_V9,
        BUILD_SHARE_CODE_PREFIX_V8,
        BUILD_SHARE_CODE_PREFIX_V7,
        BUILD_SHARE_CODE_PREFIX_V6,
        BUILD_SHARE_CODE_PREFIX_V5,
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

function writeShareString(bytes, value) {
    const codePoints = Array.from(String(value || ""));
    writeVarInt(bytes, codePoints.length);
    codePoints.forEach(char => writeVarInt(bytes, char.codePointAt(0)));
}

function readShareString(cursor, maxLength = BUILD_SHARE_MAX_WEAPON_KEY_LENGTH) {
    const length = readVarInt(cursor);
    if (length > maxLength) throw new Error("Share code contains an invalid string.");

    const codePoints = [];
    for (let index = 0; index < length; index++) {
        codePoints.push(readVarInt(cursor));
    }
    return String.fromCodePoint(...codePoints);
}

function writeSignedVarInt(bytes, value) {
    const integer = Math.trunc(Number(value) || 0);
    writeVarInt(bytes, integer >= 0 ? integer * 2 : (-integer * 2) - 1);
}

function readSignedVarInt(cursor) {
    const encoded = readVarInt(cursor);
    return encoded % 2 === 0 ? encoded / 2 : -((encoded + 1) / 2);
}

// Stable 5-bit alphabet for database keys. Unlike a table index, this remains
// decodable when new weapons are added or their database order changes.
function writePackedShareKey(bytes, value) {
    const key = String(value || "").toLowerCase();
    if (key.length > BUILD_SHARE_MAX_WEAPON_KEY_LENGTH) {
        throw new Error("Share code contains an invalid key.");
    }

    let buffer = 0;
    let bitCount = 0;
    const writeBits = (bits, width) => {
        buffer = (buffer << width) | bits;
        bitCount += width;
        while (bitCount >= 8) {
            bitCount -= 8;
            bytes.push((buffer >> bitCount) & 0xff);
            buffer &= (1 << bitCount) - 1;
        }
    };

    Array.from(key).forEach(char => {
        if (char >= "a" && char <= "z") {
            writeBits(char.charCodeAt(0) - 96, 5);
        } else if (char === "_") {
            writeBits(27, 5);
        } else if (char === "-") {
            writeBits(28, 5);
        } else if (char >= "0" && char <= "9") {
            writeBits(29, 5);
            writeBits(Number(char), 4);
        } else {
            const code = char.charCodeAt(0);
            if (code > 0xff) throw new Error("Share code key contains unsupported characters.");
            writeBits(30, 5);
            writeBits(code, 8);
        }
    });
    writeBits(0, 5);
    if (bitCount > 0) bytes.push((buffer << (8 - bitCount)) & 0xff);
}

function readPackedShareKey(cursor, maxLength = BUILD_SHARE_MAX_WEAPON_KEY_LENGTH) {
    let buffer = 0;
    let bitCount = 0;
    const readBits = width => {
        while (bitCount < width) {
            if (cursor.index >= cursor.bytes.length) throw new Error("Share code ended unexpectedly.");
            buffer = (buffer << 8) | cursor.bytes[cursor.index++];
            bitCount += 8;
        }
        bitCount -= width;
        const value = (buffer >> bitCount) & ((1 << width) - 1);
        buffer &= (1 << bitCount) - 1;
        return value;
    };

    let key = "";
    while (key.length <= maxLength) {
        const token = readBits(5);
        if (token === 0) return key;
        if (token >= 1 && token <= 26) key += String.fromCharCode(96 + token);
        else if (token === 27) key += "_";
        else if (token === 28) key += "-";
        else if (token === 29) key += String(readBits(4));
        else if (token === 30) key += String.fromCharCode(readBits(8));
        else throw new Error("Share code contains an invalid packed key.");
    }
    throw new Error("Share code contains an invalid key.");
}

function getRoundedShareTime(value) {
    const time = Number(value);
    return Number.isFinite(time) && time >= 0
        ? Math.round(time * 10) / 10
        : null;
}

function rotationHasShareTimes(entries) {
    return Array.isArray(entries) && entries.some(entry => entry && Number.isFinite(Number(entry.time)));
}

function getShareableRotation() {
    const sourceRotation = Array.isArray(rotation) ? rotation : [];
    const entries = sourceRotation.map(entry => {
        if (!entry) return null;
        const time = getRoundedShareTime(entry.time);
        const shareTime = time !== null
            ? { time }
            : {};

        if (typeof isBasicAttackEntry === "function" && isBasicAttackEntry(entry)) {
            const operatorId = Number(entry.operatorId);
            if (!Number.isFinite(operatorId) || operatorId < 0) {
                throw new Error("Cannot share rotation with an invalid basic attack operator.");
            }

            return {
                type: BASIC_ATTACK_ACTION_TYPE,
                operatorId,
                hitCount: Number(entry.hitCount || DEFAULT_BASIC_ATTACK_HITS),
                finalHitCount: Number(entry.finalHitCount || DEFAULT_BASIC_ATTACK_FINAL_HITS),
                ...shareTime
            };
        }

        const skillId = Number(entry.id);
        if (!Number.isFinite(skillId) || skillId < 0) {
            throw new Error("Cannot share rotation with an invalid skill.");
        }

        return {
            type: "skill",
            id: skillId,
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
    const states = operatorUltimateStates && typeof operatorUltimateStates === "object"
        ? operatorUltimateStates
        : {};

    return Object.keys(states)
        .filter(operatorId => states[operatorId] === true)
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
}

function uniqueBuildPersistenceLabels(values) {
    const seen = new Set();
    return values
        .map(value => String(value || "").trim().toLowerCase())
        .filter(Boolean)
        .filter(value => {
            if (seen.has(value)) return false;
            seen.add(value);
            return true;
        });
}

function getBuildPersistenceOperator(operatorId) {
    const id = Number(operatorId);
    if (!Number.isFinite(id) || typeof operators === "undefined" || !Array.isArray(operators)) return null;
    return operators.find(operator => Number(operator.id) === id) || null;
}

function getBuildPersistenceAction(entry) {
    if (!entry) return null;
    if (typeof getRotationActionData === "function") {
        return getRotationActionData(entry);
    }
    if (typeof getSkillById === "function" && Number.isFinite(Number(entry.id))) {
        return getSkillById(Number(entry.id));
    }
    return null;
}

function createBuildPersistenceRotationEntry(entry) {
    if (!entry) return null;
    const actionData = getBuildPersistenceAction(entry);
    const time = getRoundedShareTime(entry.time);
    const payloadEntry = {
        actionType: entry.type || "skill",
        id: Number.isFinite(Number(entry.id)) ? Number(entry.id) : null,
        operatorId: Number.isFinite(Number(entry.operatorId)) ? Number(entry.operatorId) : (Number.isFinite(Number(actionData?.operatorId)) ? Number(actionData.operatorId) : null),
        name: actionData?.name || "",
        type: actionData?.type || "",
        shortType: actionData?.shortType || "",
        elementType: actionData?.elementType || "",
        autoInserted: entry.autoInserted === true
    };

    if (time !== null) payloadEntry.time = time;
    if (Number.isFinite(Number(entry.hitCount))) payloadEntry.hitCount = Number(entry.hitCount);
    if (Number.isFinite(Number(entry.finalHitCount))) payloadEntry.finalHitCount = Number(entry.finalHitCount);

    return payloadEntry;
}

function createBuildPersistencePayloadFromShareCode(shareCode, options = {}) {
    const sharePayload = parseBuildShareCode(shareCode);
    const sharedOperatorLoadouts = sharePayload.operatorLoadouts
        || Object.fromEntries(Object.entries(sharePayload.operatorWeaponLoadouts || {}).map(([operatorId, weaponKey]) => [
            operatorId,
            {
                weapon: { key: weaponKey, potential: 1, essence: { primary: 0, secondary: 0, skill: 0 } },
                gloves: null,
                armor: null,
                kit1: null,
                kit2: null
            }
        ]));
    const teamOperatorIds = Array.isArray(sharePayload.team)
        ? sharePayload.team.map(Number).filter(operatorId => Number.isFinite(operatorId) && getBuildPersistenceOperator(operatorId))
        : [];
    const rotationEntries = Array.isArray(sharePayload.rotation) ? sharePayload.rotation.filter(Boolean) : [];
    const rotationPayload = rotationEntries
        .map(createBuildPersistenceRotationEntry)
        .filter(Boolean);
    const rotationSkillIds = rotationPayload
        .map(entry => Number(entry.id))
        .filter(Number.isFinite);
    const teamOperators = teamOperatorIds.map(getBuildPersistenceOperator).filter(Boolean);
    const rotationActions = rotationEntries.map(getBuildPersistenceAction).filter(Boolean);
    const timestampKey = options.timestampKey || "savedAt";
    const timestamp = new Date().toISOString();

    return {
        setupVersion: BUILD_PERSISTENCE_PAYLOAD_VERSION,
        teamOperatorIds,
        rotationSkillIds,
        elementTypes: uniqueBuildPersistenceLabels([
            ...teamOperators.map(operator => operator.elementType),
            ...rotationActions.map(action => action.elementType)
        ]),
        operatorClasses: uniqueBuildPersistenceLabels(teamOperators.map(operator => operator.operatorClass)),
        payload: {
            version: BUILD_PERSISTENCE_PAYLOAD_VERSION,
            shareCodeVersion: Number(sharePayload.v) || 1,
            [timestampKey]: timestamp,
            timelineMode: sharePayload.uiSettings?.timelineMode || "slot",
            uiSettings: sharePayload.uiSettings || {},
            enemyId: sharePayload.enemyId || "training_dummy",
            operatorUltimateStates: sharePayload.operatorUltimateStates || {},
            operatorLoadouts: sharedOperatorLoadouts,
            team: teamOperators.map(operator => ({
                id: operator.id,
                name: operator.name,
                elementType: operator.elementType || "",
                operatorClass: operator.operatorClass || "",
                weaponKey: sharedOperatorLoadouts?.[String(operator.id)]?.weapon?.key || null,
                weaponPotential: sharedOperatorLoadouts?.[String(operator.id)]?.weapon?.potential || null,
                weaponEssence: sharedOperatorLoadouts?.[String(operator.id)]?.weapon?.essence || null
            })),
            rotation: rotationPayload
        }
    };
}

function getShareableUiSettings(shareableRotation = getShareableRotation()) {
    const hasSimulationTiming = rotationHasShareTimes(shareableRotation);
    const timelineMode = hasSimulationTiming || (typeof uiSettings !== "undefined" && uiSettings?.timelineMode === "simulation")
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
        simulationDamageMode: ["normal", "expected", "critical"].includes(uiSettings?.simulationDamageMode)
            ? uiSettings.simulationDamageMode
            : "expected",
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
    for (let index = 0; index < 4; index++) {
        const operatorId = Array.isArray(selectedTeam) ? Number(selectedTeam[index]) : NaN;
        writeVarInt(bytes, Number.isFinite(operatorId) && operatorId >= 0 ? operatorId + 1 : 0);
    }

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

    const shareableUiSettings = getShareableUiSettings(shareableRotation);
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

    const operatorLoadouts = typeof getShareableOperatorLoadouts === "function"
        ? getShareableOperatorLoadouts()
        : {};
    const weaponEntries = Object.entries(operatorLoadouts).slice(0, BUILD_SHARE_MAX_WEAPON_LOADOUTS);
    writeVarInt(bytes, weaponEntries.length);
    weaponEntries.forEach(([operatorId, loadout]) => {
        writeVarInt(bytes, Number(operatorId));
        writeShareString(bytes, loadout?.weapon?.key || "");
        writeVarInt(bytes, Number(loadout?.weapon?.potential) || 1);
        writeVarInt(bytes, Number(loadout?.weapon?.essence?.primary) || 0);
        writeVarInt(bytes, Number(loadout?.weapon?.essence?.secondary) || 0);
        writeVarInt(bytes, Number(loadout?.weapon?.essence?.skill) || 0);
    });

    return bytes;
}

function createCompactShareBytesV9() {
    const bytes = [];
    for (let index = 0; index < 4; index++) {
        const operatorId = Array.isArray(selectedTeam) ? Number(selectedTeam[index]) : NaN;
        writeVarInt(bytes, Number.isFinite(operatorId) && operatorId >= 0 ? operatorId + 1 : 0);
    }

    const shareableRotation = getShareableRotation();
    writeVarInt(bytes, shareableRotation.length);
    let previousTimeTenths = 0;
    shareableRotation.forEach(entry => {
        if (!entry) {
            writeVarInt(bytes, 0);
            return;
        }

        const time = Number(entry.time);
        const hasTime = Number.isFinite(time);
        if (entry.type === BASIC_ATTACK_ACTION_TYPE) {
            writeVarInt(bytes, 2 | (hasTime ? 8 : 0));
            writeVarInt(bytes, Number(entry.operatorId) + 1);
            writeVarInt(bytes, Number(entry.hitCount) || DEFAULT_BASIC_ATTACK_HITS);
            writeVarInt(bytes, Number(entry.finalHitCount) || DEFAULT_BASIC_ATTACK_FINAL_HITS);
        } else {
            writeVarInt(bytes, 1 | (entry.autoInserted === true ? 4 : 0) | (hasTime ? 8 : 0));
            writeVarInt(bytes, Number(entry.id));
        }

        if (hasTime) {
            const timeTenths = Math.max(0, Math.round(time * 10));
            writeSignedVarInt(bytes, timeTenths - previousTimeTenths);
            previousTimeTenths = timeTenths;
        }
    });

    const activeUltimateStateIds = getActiveUltimateStateIds();
    writeVarInt(bytes, activeUltimateStateIds.length);
    activeUltimateStateIds.forEach(operatorId => writeVarInt(bytes, operatorId));

    const shareableUiSettings = getShareableUiSettings(shareableRotation);
    const fallbackSpPerSecond = typeof DEFAULT_SIMULATION_SP_PER_SECOND !== "undefined"
        ? Number(DEFAULT_SIMULATION_SP_PER_SECOND)
        : 8;
    let uiFlags = shareableUiSettings.timelineMode === "simulation" ? BUILD_SHARE_UI_FLAG_SIMULATION_MODE : 0;
    if (Number(shareableUiSettings.simulationSpPerSecond) !== fallbackSpPerSecond) {
        uiFlags |= BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND;
    }
    if (Number.isFinite(Number(shareableUiSettings.simulationDurationSeconds))) {
        uiFlags |= BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION;
    }
    if (shareableUiSettings.simulationDamageMode === "normal") uiFlags |= BUILD_SHARE_UI_FLAG_DAMAGE_MODE_NORMAL;
    if (shareableUiSettings.simulationDamageMode === "critical") uiFlags |= BUILD_SHARE_UI_FLAG_DAMAGE_MODE_CRITICAL;
    writeVarInt(bytes, uiFlags);
    if (uiFlags & BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND) {
        writeVarInt(bytes, Math.max(0, Math.round(Number(shareableUiSettings.simulationSpPerSecond) * 10)));
    }
    if (uiFlags & BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION) {
        writeVarInt(bytes, Math.max(0, Math.round(Number(shareableUiSettings.simulationDurationSeconds) * 10)));
    }

    const enemyId = typeof getSelectedEnemy === "function" ? String(getSelectedEnemy()?.id || "") : "";
    const hasCustomEnemy = Boolean(enemyId && enemyId !== "training_dummy");
    writeVarInt(bytes, hasCustomEnemy ? 1 : 0);
    if (hasCustomEnemy) writePackedShareKey(bytes, enemyId);

    const operatorLoadouts = typeof getShareableOperatorLoadouts === "function"
        ? getShareableOperatorLoadouts()
        : {};
    const weaponEntries = Object.entries(operatorLoadouts).slice(0, BUILD_SHARE_MAX_WEAPON_LOADOUTS);
    writeVarInt(bytes, weaponEntries.length);
    weaponEntries.forEach(([operatorId, loadout]) => {
        const potential = Math.min(5, Math.max(1, Number(loadout?.weapon?.potential) || 1));
        const primary = Math.min(15, Math.max(0, Number(loadout?.weapon?.essence?.primary) || 0));
        const secondary = Math.min(15, Math.max(0, Number(loadout?.weapon?.essence?.secondary) || 0));
        const skill = Math.min(15, Math.max(0, Number(loadout?.weapon?.essence?.skill) || 0));
        const activationBits = (potential - 1) | (primary << 3) | (secondary << 7) | (skill << 11);

        writeVarInt(bytes, Number(operatorId));
        writePackedShareKey(bytes, loadout?.weapon?.key || "");
        writeVarInt(bytes, activationBits);
    });

    return bytes;
}

function createBuildShareCode() {
    const bytes = [];
    writeVarInt(bytes, BUILD_PERSISTENCE_PAYLOAD_VERSION);
    bytes.push(...createCompactShareBytesV9());
    return encodeShareBytes(bytes);
}

function getDisplayBuildShareCode(code = createBuildShareCode()) {
    const trimmed = String(code || "").trim();
    if (!trimmed.startsWith(BUILD_SHARE_CODE_PREFIX)) return trimmed;

    const payloadBytes = decodeShareBytes(trimmed.slice(BUILD_SHARE_CODE_PREFIX.length));
    const displayBytes = [];
    writeVarInt(displayBytes, BUILD_PERSISTENCE_PAYLOAD_VERSION);
    displayBytes.push(...payloadBytes);
    return encodeShareBytes(displayBytes);
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
    const code = getDisplayBuildShareCode();
    return `${getBuildShareBaseUrl()}#${BUILD_SHARE_HASH_KEY}=${encodeURIComponent(code)}`;
}

async function copyBuildShareCode() {
    if (typeof hasCreatedRotation === "function" && !hasCreatedRotation()) {
        return false;
    }

    const code = getDisplayBuildShareCode();

    try {
        await navigator.clipboard.writeText(code);
        alert(`Share code copied (${code.length} characters).`);
    } catch (error) {
        console.warn("Clipboard copy failed, falling back to prompt:", error);
        prompt("Copy share code:", code);
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
        alert("Share link copied.");
    } catch (error) {
        console.warn("Clipboard copy failed, falling back to prompt:", error);
        prompt("Copy share link:", link);
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
        return parseCompactBuildShareCodeV10(trimmed.slice(BUILD_SHARE_CODE_PREFIX.length));
    }

    if (trimmed.startsWith(BUILD_SHARE_CODE_PREFIX_V9)) {
        return parseCompactBuildShareCodeV9(trimmed.slice(BUILD_SHARE_CODE_PREFIX_V9.length));
    }

    if (trimmed.startsWith(BUILD_SHARE_CODE_PREFIX_V8)) {
        return parseCompactBuildShareCodeV8(trimmed.slice(BUILD_SHARE_CODE_PREFIX_V8.length));
    }

    if (trimmed.startsWith(BUILD_SHARE_CODE_PREFIX_V7)) {
        return parseCompactBuildShareCodeV7(trimmed.slice(BUILD_SHARE_CODE_PREFIX_V7.length));
    }

    if (trimmed.startsWith(BUILD_SHARE_CODE_PREFIX_V6)) {
        return parseCompactBuildShareCodeV6(trimmed.slice(BUILD_SHARE_CODE_PREFIX_V6.length));
    }

    if (trimmed.startsWith(BUILD_SHARE_CODE_PREFIX_V5)) {
        return parseCompactBuildShareCodeV5(trimmed.slice(BUILD_SHARE_CODE_PREFIX_V5.length));
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

    // Public codes store the version inside the compact payload instead of
    // exposing it as a readable AERT prefix.
    try {
        return parseVersionedDisplayBuildShareCode(trimmed);
    } catch (error) {
        return parseLegacyBuildShareCode(trimmed);
    }
}

function parseVersionedDisplayBuildShareCode(code) {
    const bytes = decodeShareBytes(code.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const version = readVarInt(cursor);
    const encodedPayload = encodeShareBytes(bytes.slice(cursor.index));

    switch (version) {
        case 10: return parseCompactBuildShareCodeV10(encodedPayload);
        case 9: return parseCompactBuildShareCodeV9(encodedPayload);
        case 8: return parseCompactBuildShareCodeV8(encodedPayload);
        case 7: return parseCompactBuildShareCodeV7(encodedPayload);
        case 6: return parseCompactBuildShareCodeV6(encodedPayload);
        case 5: return parseCompactBuildShareCodeV5(encodedPayload);
        case 4: return parseCompactBuildShareCodeV4(encodedPayload);
        case 3: return parseCompactBuildShareCode(encodedPayload);
        case 2: return parseCompactBuildShareCodeV2(encodedPayload);
        default: throw new Error("Unsupported hidden share code version.");
    }
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
    if (rotationLength > BUILD_SHARE_MAX_ROTATION_ENTRIES) {
        throw new Error("Share code contains too many rotation entries.");
    }

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
    if (uiFlags & ~BUILD_SHARE_UI_FLAG_MASK) {
        throw new Error("Unsupported share code UI settings.");
    }

    const uiSettingsPayload = {
        timelineMode: (uiFlags & BUILD_SHARE_UI_FLAG_SIMULATION_MODE) ? "simulation" : "slot"
    };

    if (uiFlags & BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND) {
        uiSettingsPayload.simulationSpPerSecond = readVarInt(cursor) / 10;
    }

    if (uiFlags & BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION) {
        uiSettingsPayload.simulationDurationSeconds = readVarInt(cursor) / 10;
    }

    return uiSettingsPayload;
}

function readCompactShareUiSettingsV10(cursor) {
    const uiFlags = cursor.index < cursor.bytes.length ? readVarInt(cursor) : 0;
    if (uiFlags & ~BUILD_SHARE_UI_FLAG_MASK_V10) {
        throw new Error("Unsupported share code UI settings.");
    }
    if ((uiFlags & BUILD_SHARE_UI_FLAG_DAMAGE_MODE_NORMAL) && (uiFlags & BUILD_SHARE_UI_FLAG_DAMAGE_MODE_CRITICAL)) {
        throw new Error("Share code contains conflicting damage modes.");
    }

    const uiSettingsPayload = {
        timelineMode: (uiFlags & BUILD_SHARE_UI_FLAG_SIMULATION_MODE) ? "simulation" : "slot",
        simulationDamageMode: (uiFlags & BUILD_SHARE_UI_FLAG_DAMAGE_MODE_NORMAL)
            ? "normal"
            : (uiFlags & BUILD_SHARE_UI_FLAG_DAMAGE_MODE_CRITICAL) ? "critical" : "expected"
    };
    if (uiFlags & BUILD_SHARE_UI_FLAG_HAS_SP_PER_SECOND) {
        uiSettingsPayload.simulationSpPerSecond = readVarInt(cursor) / 10;
    }
    if (uiFlags & BUILD_SHARE_UI_FLAG_HAS_SIMULATION_DURATION) {
        uiSettingsPayload.simulationDurationSeconds = readVarInt(cursor) / 10;
    }
    if (!Object.prototype.hasOwnProperty.call(uiSettingsPayload, "simulationSpPerSecond")) {
        uiSettingsPayload.simulationSpPerSecond = typeof DEFAULT_SIMULATION_SP_PER_SECOND !== "undefined"
            ? Number(DEFAULT_SIMULATION_SP_PER_SECOND)
            : 8;
    }
    return uiSettingsPayload;
}

function readCompactShareWeaponLoadouts(cursor) {
    const count = cursor.index < cursor.bytes.length ? readVarInt(cursor) : 0;
    if (count > BUILD_SHARE_MAX_WEAPON_LOADOUTS) {
        throw new Error("Share code contains too many weapon loadouts.");
    }

    const loadouts = {};
    for (let index = 0; index < count; index++) {
        const operatorId = readVarInt(cursor);
        const weaponKey = readShareString(cursor);
        if (weaponKey) loadouts[String(operatorId)] = weaponKey;
    }
    return loadouts;
}

function readCompactShareOperatorLoadoutsV7(cursor) {
    const count = cursor.index < cursor.bytes.length ? readVarInt(cursor) : 0;
    if (count > BUILD_SHARE_MAX_WEAPON_LOADOUTS) {
        throw new Error("Share code contains too many operator loadouts.");
    }

    const loadouts = {};
    for (let index = 0; index < count; index++) {
        const operatorId = readVarInt(cursor);
        const weaponKey = readShareString(cursor);
        const essence = readVarInt(cursor);
        if (!weaponKey) continue;
        loadouts[String(operatorId)] = {
            weapon: {
                key: weaponKey,
                essence
            },
            gloves: null,
            armor: null,
            kit1: null,
            kit2: null
        };
    }
    return loadouts;
}

function readCompactShareOperatorLoadoutsV8(cursor) {
    const count = cursor.index < cursor.bytes.length ? readVarInt(cursor) : 0;
    if (count > BUILD_SHARE_MAX_WEAPON_LOADOUTS) {
        throw new Error("Share code contains too many operator loadouts.");
    }

    const loadouts = {};
    for (let index = 0; index < count; index++) {
        const operatorId = readVarInt(cursor);
        const weaponKey = readShareString(cursor);
        const potential = readVarInt(cursor);
        const primary = readVarInt(cursor);
        const secondary = readVarInt(cursor);
        const skill = readVarInt(cursor);
        if (!weaponKey) continue;
        loadouts[String(operatorId)] = {
            weapon: {
                key: weaponKey,
                potential,
                essence: { primary, secondary, skill }
            },
            gloves: null,
            armor: null,
            kit1: null,
            kit2: null
        };
    }
    return loadouts;
}

function readCompactShareRotationV9(cursor) {
    const rotationLength = readVarInt(cursor);
    if (rotationLength > BUILD_SHARE_MAX_ROTATION_ENTRIES) {
        throw new Error("Share code contains too many rotation entries.");
    }

    const importedRotation = [];
    let previousTimeTenths = 0;
    for (let index = 0; index < rotationLength; index++) {
        const header = readVarInt(cursor);
        const entryType = header & 3;
        const hasTime = (header & 8) !== 0;
        if (header & ~15) throw new Error("Unsupported compact rotation flags.");
        if (entryType === 0) {
            importedRotation.push(null);
            continue;
        }

        let entry;
        if (entryType === 1) {
            entry = {
                type: "skill",
                id: readVarInt(cursor),
                autoInserted: (header & 4) !== 0
            };
        } else if (entryType === 2) {
            entry = {
                type: BASIC_ATTACK_ACTION_TYPE,
                operatorId: readVarInt(cursor) - 1,
                hitCount: readVarInt(cursor),
                finalHitCount: readVarInt(cursor)
            };
        } else {
            throw new Error("Unsupported rotation entry type.");
        }

        if (hasTime) {
            previousTimeTenths += readSignedVarInt(cursor);
            if (previousTimeTenths < 0) throw new Error("Share code contains an invalid rotation time.");
            entry.time = Math.round(previousTimeTenths) / 10;
        }
        importedRotation.push(entry);
    }
    return importedRotation;
}

function readCompactShareUiSettingsV9(cursor) {
    const settings = readCompactShareUiSettingsV5(cursor);
    if (!Object.prototype.hasOwnProperty.call(settings, "simulationSpPerSecond")) {
        settings.simulationSpPerSecond = typeof DEFAULT_SIMULATION_SP_PER_SECOND !== "undefined"
            ? Number(DEFAULT_SIMULATION_SP_PER_SECOND)
            : 8;
    }
    return settings;
}

function readCompactShareOperatorLoadoutsV9(cursor) {
    const count = cursor.index < cursor.bytes.length ? readVarInt(cursor) : 0;
    if (count > BUILD_SHARE_MAX_WEAPON_LOADOUTS) {
        throw new Error("Share code contains too many operator loadouts.");
    }

    const loadouts = {};
    for (let index = 0; index < count; index++) {
        const operatorId = readVarInt(cursor);
        const weaponKey = readPackedShareKey(cursor);
        const activationBits = readVarInt(cursor);
        if (activationBits & ~0x7fff) throw new Error("Share code contains invalid weapon activation data.");
        if (!weaponKey) continue;
        loadouts[String(operatorId)] = {
            weapon: {
                key: weaponKey,
                potential: (activationBits & 7) + 1,
                essence: {
                    primary: (activationBits >> 3) & 15,
                    secondary: (activationBits >> 7) & 15,
                    skill: (activationBits >> 11) & 15
                }
            },
            gloves: null,
            armor: null,
            kit1: null,
            kit2: null
        };
    }
    return loadouts;
}
function assertCompactShareFullyRead(cursor) {
    if (cursor.index !== cursor.bytes.length) {
        throw new Error("Share code contains unsupported trailing data.");
    }
}

function parseCompactBuildShareCodeV9(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = readCompactShareTeam(cursor);
    const importedRotation = readCompactShareRotationV9(cursor);
    const importedUltimateStates = readCompactShareUltimateStates(cursor);
    const uiSettingsPayload = readCompactShareUiSettingsV9(cursor);
    const hasCustomEnemy = readVarInt(cursor) === 1;
    const enemyId = hasCustomEnemy ? readPackedShareKey(cursor) : "training_dummy";
    const importedOperatorLoadouts = readCompactShareOperatorLoadoutsV9(cursor);
    assertCompactShareFullyRead(cursor);

    return {
        v: 9,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates,
        operatorLoadouts: importedOperatorLoadouts,
        enemyId,
        uiSettings: uiSettingsPayload
    };
}

function parseCompactBuildShareCodeV10(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = readCompactShareTeam(cursor);
    const importedRotation = readCompactShareRotationV9(cursor);
    const importedUltimateStates = readCompactShareUltimateStates(cursor);
    const uiSettingsPayload = readCompactShareUiSettingsV10(cursor);
    const hasCustomEnemy = readVarInt(cursor) === 1;
    const enemyId = hasCustomEnemy ? readPackedShareKey(cursor) : "training_dummy";
    const importedOperatorLoadouts = readCompactShareOperatorLoadoutsV9(cursor);
    assertCompactShareFullyRead(cursor);

    return {
        v: 10,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates,
        operatorLoadouts: importedOperatorLoadouts,
        enemyId,
        uiSettings: uiSettingsPayload
    };
}

function parseCompactBuildShareCodeV8(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = readCompactShareTeam(cursor);
    const importedRotation = readCompactShareRotation(cursor);
    const importedUltimateStates = readCompactShareUltimateStates(cursor);
    const uiSettingsPayload = readCompactShareUiSettingsV5(cursor);
    const importedOperatorLoadouts = readCompactShareOperatorLoadoutsV8(cursor);
    assertCompactShareFullyRead(cursor);

    return {
        v: 8,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates,
        operatorLoadouts: importedOperatorLoadouts,
        uiSettings: uiSettingsPayload
    };
}
function parseCompactBuildShareCodeV7(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = readCompactShareTeam(cursor);
    const importedRotation = readCompactShareRotation(cursor);
    const importedUltimateStates = readCompactShareUltimateStates(cursor);
    const uiSettingsPayload = readCompactShareUiSettingsV5(cursor);
    const importedOperatorLoadouts = readCompactShareOperatorLoadoutsV7(cursor);
    assertCompactShareFullyRead(cursor);

    return {
        v: 7,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates,
        operatorLoadouts: importedOperatorLoadouts,
        uiSettings: uiSettingsPayload
    };
}

function parseCompactBuildShareCodeV6(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = readCompactShareTeam(cursor);
    const importedRotation = readCompactShareRotation(cursor);
    const importedUltimateStates = readCompactShareUltimateStates(cursor);
    const uiSettingsPayload = readCompactShareUiSettingsV5(cursor);
    const importedWeaponLoadouts = readCompactShareWeaponLoadouts(cursor);
    assertCompactShareFullyRead(cursor);

    return {
        v: 6,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates,
        operatorWeaponLoadouts: importedWeaponLoadouts,
        uiSettings: uiSettingsPayload
    };
}

function parseCompactBuildShareCodeV5(encoded) {
    const bytes = decodeShareBytes(encoded.replace(/\s/g, ""));
    const cursor = { bytes, index: 0 };
    const team = readCompactShareTeam(cursor);
    const importedRotation = readCompactShareRotation(cursor);
    const importedUltimateStates = readCompactShareUltimateStates(cursor);
    const uiSettingsPayload = readCompactShareUiSettingsV5(cursor);
    assertCompactShareFullyRead(cursor);

    return {
        v: 5,
        team,
        rotation: importedRotation,
        operatorUltimateStates: importedUltimateStates,
        uiSettings: uiSettingsPayload
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
        alert("The share link could not be loaded.");
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
    if (importedRotation.length > BUILD_SHARE_MAX_ROTATION_ENTRIES) {
        throw new Error("Share code contains too many rotation entries.");
    }

    const normalizedRotation = importedRotation.map(entry => {
        if (!entry) return null;

        if (typeof isBasicAttackEntry === "function" && isBasicAttackEntry(entry)) {
            const operatorId = Number(entry.operatorId);
            const basicAttackEntry = createBasicAttackRotationEntry(operatorId, entry);
            if (!basicAttackEntry) {
                throw new Error(`Unknown basic attack operator id: ${operatorId}`);
            }
            const time = getRoundedShareTime(entry.time);
            if (time !== null) {
                basicAttackEntry.time = time;
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

        const time = getRoundedShareTime(typeof entry === "object" ? entry.time : NaN);
        if (time !== null) {
            normalizedEntry.time = time;
        }

        return normalizedEntry;
    });

    return normalizedRotation.length > 0 ? normalizedRotation : [null];
}

function applyImportedUiSettings(payload) {
    if (typeof uiSettings === "undefined") return;

    const importedSettings = payload?.uiSettings && typeof payload.uiSettings === "object"
        ? payload.uiSettings
        : {};
    const hasSimulationTiming = rotationHasShareTimes(payload?.rotation);
    let changed = false;

    if (importedSettings.timelineMode === "slot" || importedSettings.timelineMode === "simulation") {
        uiSettings.timelineMode = importedSettings.timelineMode;
        changed = true;
    }

    if (hasSimulationTiming && uiSettings.timelineMode !== "simulation") {
        uiSettings.timelineMode = "simulation";
        changed = true;
    }

    const spPerSecond = Number(importedSettings.simulationSpPerSecond);
    if (Number.isFinite(spPerSecond) && spPerSecond >= 0) {
        uiSettings.simulationSpPerSecond = Math.round(spPerSecond * 10) / 10;
        changed = true;
    }

    const simulationDurationSeconds = Number(importedSettings.simulationDurationSeconds);
    if (Number.isFinite(simulationDurationSeconds) && simulationDurationSeconds > 0) {
        uiSettings.simulationDurationSeconds = Math.round(simulationDurationSeconds * 10) / 10;
        changed = true;
    }

    if (["normal", "expected", "critical"].includes(importedSettings.simulationDamageMode)) {
        uiSettings.simulationDamageMode = importedSettings.simulationDamageMode;
        changed = true;
    }

    if (!changed) return;
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
    if (
        payload.enemyId
        && typeof setSelectedEnemy === "function"
        && (typeof enemies === "undefined" || !Array.isArray(enemies) || enemies.some(enemy => enemy.id === payload.enemyId))
    ) {
        setSelectedEnemy(payload.enemyId);
    }
    applyImportedUiSettings(payload);
    if (typeof applyImportedOperatorLoadouts === "function") {
        applyImportedOperatorLoadouts(
            payload.operatorLoadouts || payload.operatorWeaponLoadouts || {},
            selectedTeam
        );
    }

    compactRotation();
    ensureSlotCount(rotation.filter(entry => entry !== null).length + 1);

    saveTeam();
    localStorage.setItem("rotation", JSON.stringify(rotation));
    localStorage.setItem("operatorUltimateStates", JSON.stringify(operatorUltimateStates));

    if (typeof renderTeamSlots === "function") renderTeamSlots();
    if (typeof renderOperatorList === "function") renderOperatorList();
    if (typeof renderSelectedOperators === "function") renderSelectedOperators();
    if (typeof renderSkills === "function") renderSkills();
    if (typeof renderEnemySkillBar === "function") renderEnemySkillBar();
    if (typeof renderRotation === "function") renderRotation();
    if (typeof initSkillDragDrop === "function") initSkillDragDrop();
}

function loadBuildShareCode() {
    const code = prompt("Paste share code or share link:");
    if (!code) return;

    try {
        applyBuildShareCode(code);
        alert("Team and rotation loaded.");
    } catch (error) {
        console.error("Share code import failed:", error);
        alert("The share code could not be loaded.");
    }
}
