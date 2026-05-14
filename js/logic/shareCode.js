const BUILD_SHARE_CODE_PREFIX_V1 = "AERT1:";
const BUILD_SHARE_CODE_PREFIX = "AERT2:";
const BUILD_SHARE_HASH_KEY = "setup";

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

        return {
            id: entry.id,
            autoInserted: entry.autoInserted === true
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

        const autoInsertedFlag = entry.autoInserted === true ? 1 : 0;
        writeVarInt(bytes, (Number(entry.id) * 2) + autoInsertedFlag + 1);
    });

    const activeUltimateStateIds = getActiveUltimateStateIds();
    writeVarInt(bytes, activeUltimateStateIds.length);
    activeUltimateStateIds.forEach(operatorId => {
        writeVarInt(bytes, operatorId);
    });

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
        if (hash.startsWith(BUILD_SHARE_CODE_PREFIX) || hash.startsWith(BUILD_SHARE_CODE_PREFIX_V1)) {
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
        return parseCompactBuildShareCode(trimmed.slice(BUILD_SHARE_CODE_PREFIX.length));
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
        const storedEntry = readVarInt(cursor);
        if (storedEntry === 0) {
            importedRotation.push(null);
            continue;
        }

        const packedEntry = storedEntry - 1;
        importedRotation.push({
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

    if (hash.startsWith(BUILD_SHARE_CODE_PREFIX) || hash.startsWith(BUILD_SHARE_CODE_PREFIX_V1)) {
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

        const skillId = Number(typeof entry === "object" ? entry.id : entry);
        if (!Number.isFinite(skillId) || !getSkillById(skillId)) {
            throw new Error(`Unknown skill id: ${skillId}`);
        }

        return {
            uid: crypto.randomUUID(),
            id: skillId,
            autoInserted: typeof entry === "object" && entry.autoInserted === true
        };
    });

    return normalizedRotation.length > 0 ? normalizedRotation : [null];
}

function applyBuildShareCode(code) {
    const payload = parseBuildShareCode(code);

    selectedTeam = normalizeImportedTeam(payload.team);
    rotation = normalizeImportedRotation(payload.rotation);
    operatorUltimateStates = payload.operatorUltimateStates && typeof payload.operatorUltimateStates === "object"
        ? payload.operatorUltimateStates
        : {};
    activeSlotIndex = null;

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
