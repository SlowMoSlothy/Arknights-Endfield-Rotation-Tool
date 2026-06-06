const equipmentEditorState = {
    operatorId: null,
    savedSnapshot: "",
    isDirty: false,
    gearPicker: null,
    weaponPicker: null
};

const EQUIPMENT_GEAR_SLOTS = ["armor", "gloves", "kit1", "kit2"];
const EQUIPMENT_REFINEMENT_MAX = 3;
const EQUIPMENT_REFINEMENT_MULTIPLIER_STEP = 0.1;
const EQUIPMENT_REFINEMENT_FIELDS = [
    { key: "main", field: "refinementMain", label: "Main" },
    { key: "second", field: "refinementSecond", label: "Second" },
    { key: "special", field: "refinementSpecial", label: "Special" }
];
const EQUIPMENT_WEAPON_ESSENCE_FIELDS = [
    { key: "primary", field: "essencePrimary", label: "Primary", max: 6 },
    { key: "secondary", field: "essenceSecondary", label: "Secondary", max: 6 },
    { key: "skill", field: "essenceSkill", label: "Weapon Skill", max: 4 }
];
const EQUIPMENT_WEAPON_BREAKTHROUGH_LEVEL_CAPS = [20, 40, 60, 80, 90];
const EQUIPMENT_CORE_ATTRIBUTES = [
    { key: "strength", label: "Strength", shortLabel: "STR", aliases: ["strength", "str"], baseField: "baseStrength", levelOneField: "baseStrengthLevel1" },
    { key: "agility", label: "Agility", shortLabel: "AGI", aliases: ["agility", "agi"], baseField: "baseAgility", levelOneField: "baseAgilityLevel1" },
    { key: "intellect", label: "Intellect", shortLabel: "INT", aliases: ["intellect", "int"], baseField: "baseIntellect", levelOneField: "baseIntellectLevel1" },
    { key: "will", label: "Will", shortLabel: "WIL", aliases: ["will", "wil", "willpower"], baseField: "baseWill", levelOneField: "baseWillLevel1" }
];
const EQUIPMENT_DERIVED_STATS = [
    {
        key: "hp",
        label: "HP",
        aliases: ["hp", "max hp", "maxhp", "health", "max health"],
        mode: "combined"
    },
    {
        key: "atk",
        label: "ATK",
        aliases: ["atk", "attack", "fixed atk", "fixed attack"],
        percentAliases: ["atk", "atk %", "attack", "attack %", "atk bonus", "attack bonus"],
        mode: "atk"
    }
];

function normalizeEquipmentWeaponType(value) {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const aliases = {
        guns: "handcannon",
        gun: "handcannon",
        hand_cannon: "handcannon",
        orbiter: "arts_unit",
        orbiters: "arts_unit",
        polearms: "polearm",
        greatsword: "great_sword"
    };

    return aliases[normalized] || normalized;
}

function getEquipmentWeaponTypeLabel(weaponType) {
    const key = normalizeEquipmentWeaponType(weaponType);
    const match = ENDFIELD_WEAPON_TYPES.find(type => type.id === key);
    return match?.name || weaponType || "Unknown weapon type";
}

function getOperatorWeaponType(operator) {
    return normalizeEquipmentWeaponType(
        operator?.weaponType ||
        OPERATOR_WEAPON_TYPES?.[operator?.id] ||
        operator?.rawData?.weaponType
    );
}

function getEquipmentWeaponById(weaponId) {
    return ENDFIELD_WEAPONS.find(weapon => String(weapon.id) === String(weaponId)) || null;
}

function getWeaponRarityClass(weapon) {
    return `rarity-${getEquipmentRarityValue(weapon)}`;
}

function getItemRarityClass(item) {
    return `rarity-${getEquipmentRarityValue(item)}`;
}

function getEquipmentRarityValue(item) {
    const match = String(item?.rarity || "").match(/\d+/);
    const rarity = match ? Number(match[0]) : 0;
    return Number.isFinite(rarity) ? rarity : 0;
}

function getEquipmentSlotLabel(slot) {
    return {
        armor: "Body",
        gloves: "Hands",
        kit1: "Kit 1",
        kit2: "Kit 2"
    }[slot] || slot;
}

function getEquipmentCoreAttributeKey(label) {
    const normalized = String(label || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");

    return EQUIPMENT_CORE_ATTRIBUTES.find(attribute => (
        attribute.aliases.some(alias => alias.replace(/[^a-z0-9]+/g, "") === normalized)
    ))?.key || "";
}

function getEquipmentWeaponEssenceLevel(value, max = 6) {
    const level = Number(value || 0);
    if (!Number.isFinite(level)) return 0;

    return Math.max(0, Math.min(max, Math.round(level)));
}

function getEquipmentWeaponEssenceState(source = {}) {
    return {
        primary: getEquipmentWeaponEssenceLevel(source.essencePrimary ?? source.primary, 6),
        secondary: getEquipmentWeaponEssenceLevel(source.essenceSecondary ?? source.secondary, 6),
        skill: getEquipmentWeaponEssenceLevel(source.essenceSkill ?? source.skill, 4)
    };
}

function getEquipmentWeaponEssenceData(weapon) {
    const data = weapon?.essenceData || weapon?.rawData?.essenceData;
    return data?.verified === true ? data : null;
}

function getEquipmentWeaponBreakthroughStage(level) {
    const numericLevel = Math.max(1, Number(level) || 1);
    const stage = EQUIPMENT_WEAPON_BREAKTHROUGH_LEVEL_CAPS.findIndex(cap => numericLevel <= cap);
    return stage >= 0 ? stage : EQUIPMENT_WEAPON_BREAKTHROUGH_LEVEL_CAPS.length - 1;
}

function getEquipmentWeaponLevelForEssence(source = null) {
    const value = source?.level ?? getEquipmentInputValue("weapon.level");
    return getEquipmentLevelNumber(value || 90);
}

function getEquipmentWeaponEssenceLine(weapon, field) {
    const data = getEquipmentWeaponEssenceData(weapon);
    if (!data || field === "skill") return null;

    const line = data[field];
    if (!line || !Array.isArray(line.values) || line.values.length !== 9) return null;

    const values = line.values.map(Number);
    if (values.some(value => !Number.isFinite(value))) return null;

    return {
        ...line,
        values,
        isPercent: line.isPercent === true
    };
}

function getEquipmentWeaponBaseStatRank(weapon, field, weaponLevel) {
    const data = getEquipmentWeaponEssenceData(weapon);
    const ranks = data?.baseRanks?.[field];
    if (!Array.isArray(ranks) || ranks.length < 5) return null;

    const rank = Number(ranks[getEquipmentWeaponBreakthroughStage(weaponLevel)]);
    return Number.isFinite(rank) ? Math.max(1, Math.min(9, Math.round(rank))) : null;
}

function resolveEquipmentWeaponEssenceLabel(weapon, field, operator = getEquipmentEditorOperator()) {
    const data = getEquipmentWeaponEssenceData(weapon);
    if (field === "primary") {
        const label = String(data?.primary?.label || weapon?.mainAttribute || "").trim();
        return /^main attribute$/i.test(label)
            ? getOperatorEquipmentMainAttribute(operator) || "Main Attribute"
            : label || "Primary Attribute";
    }
    if (field === "secondary") {
        return String(data?.secondary?.label || weapon?.secondaryAttribute || "").trim();
    }

    return String(data?.skill?.name || weapon?.passiveName || weapon?.setEffect || "").trim() || "Weapon Skill";
}

function getEquipmentWeaponEssenceStatConfig(
    weapon,
    field,
    operator = getEquipmentEditorOperator(),
    weaponLevel = getEquipmentWeaponLevelForEssence()
) {
    if (!weapon || field === "skill") return null;

    const line = getEquipmentWeaponEssenceLine(weapon, field);
    const baseRank = getEquipmentWeaponBaseStatRank(weapon, field, weaponLevel);
    if (!line || !baseRank) return null;

    const rawLabel = resolveEquipmentWeaponEssenceLabel(weapon, field, operator);
    if (!rawLabel) return null;

    const coreAttribute = getEquipmentCoreAttributeKey(rawLabel);
    return {
        label: coreAttribute
            ? EQUIPMENT_CORE_ATTRIBUTES.find(attribute => attribute.key === coreAttribute)?.label || rawLabel
            : rawLabel,
        values: line.values,
        baseRank,
        isPercent: line.isPercent
    };
}

function getEquipmentWeaponEssenceRankState(
    weapon,
    field,
    level,
    operator = getEquipmentEditorOperator(),
    weaponLevel = getEquipmentWeaponLevelForEssence()
) {
    const config = getEquipmentWeaponEssenceStatConfig(weapon, field, operator, weaponLevel);
    if (!config) return null;

    const essenceLevel = getEquipmentWeaponEssenceLevel(level, 6);
    const targetRank = Math.min(9, config.baseRank + essenceLevel);
    const baseValue = config.values[config.baseRank - 1];
    const targetValue = config.values[targetRank - 1];
    if (!Number.isFinite(baseValue) || !Number.isFinite(targetValue)) return null;

    return {
        ...config,
        essenceLevel,
        targetRank,
        baseValue,
        targetValue,
        bonusValue: targetValue - baseValue
    };
}

function formatEquipmentExactStatValue(value, isPercent, showSign = false) {
    if (!Number.isFinite(value)) return "";

    const sign = showSign && value >= 0 ? "+" : "";
    const decimals = Math.abs(value % 1) > 0.001
        ? (Math.abs((value * 10) % 1) > 0.001 ? 2 : 1)
        : 0;
    return `${sign}${value.toFixed(decimals)}${isPercent ? "%" : ""}`;
}

function formatEquipmentWeaponEssenceBonus(
    weapon,
    field,
    level,
    operator = getEquipmentEditorOperator(),
    weaponLevel = getEquipmentWeaponLevelForEssence()
) {
    const config = getEquipmentWeaponEssenceRankState(weapon, field, level, operator, weaponLevel);
    if (!config || !level) return "";

    return `${config.label} ${formatEquipmentExactStatValue(config.bonusValue, config.isPercent, true)}`;
}

function collectEquipmentWeaponStatEntries(set) {
    const weapon = getEquipmentWeaponById(set?.weapon?.weaponId);
    if (!weapon) return [];

    const essence = getEquipmentWeaponEssenceState(set.weapon);
    return ["primary", "secondary"].map(field => {
        const level = essence[field];
        const rank = getEquipmentWeaponEssenceRankState(
            weapon,
            field,
            level,
            getEquipmentEditorOperator(),
            getEquipmentWeaponLevelForEssence(set.weapon)
        );
        return rank
            ? `${rank.label} ${formatEquipmentExactStatValue(rank.targetValue, rank.isPercent, true)}`
            : "";
    }).filter(Boolean);
}

function hasEquipmentGearPieceData(piece) {
    return Boolean(
        piece?.pieceId ||
        piece?.name ||
        piece?.setName ||
        piece?.mainStat ||
        piece?.subStats
    );
}

function getWeaponFallbackImage(weapon) {
    return getEquipmentItemFallbackImage(weapon, "weapon");
}

function getEquipmentItemFallbackImage(item, type = "gear") {
    const rarity = getEquipmentRarityValue(item);
    const colors = {
        6: ["#ff6b59", "#711a16"],
        5: ["#ffca59", "#7a4a0a"],
        4: ["#82bdff", "#284b72"],
        3: ["#b8c0c7", "#3c454d"]
    }[rarity] || ["#a0aaa9", "#34393b"];
    const initials = String(item?.name || "?")
        .split(/\s+/)
        .map(part => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    const itemPath = type === "weapon"
        ? "M12 45 43 14l7 7-31 31h-7z"
        : "M18 14h28l6 13-6 23H18l-6-23z";
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
            <defs>
                <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stop-color="${colors[0]}"/>
                    <stop offset="1" stop-color="${colors[1]}"/>
                </linearGradient>
            </defs>
            <rect width="64" height="64" rx="10" fill="#111416"/>
            <path d="${itemPath}" fill="url(#g)"/>
            <path d="M18 14h28" fill="none" stroke="${colors[0]}" stroke-width="4" stroke-linecap="round"/>
            <text x="32" y="40" text-anchor="middle" font-family="Arial" font-size="16" font-weight="800" fill="#ffffff">${initials}</text>
        </svg>`;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getWeaponImageSource(weapon) {
    return weapon?.iconPath || weapon?.icon || `assets/weapons/${weapon.id}.png`;
}

function getGearImageSource(piece) {
    return piece?.iconPath || piece?.icon || `assets/gear/${piece.id}.png`;
}

function handleWeaponImageError(image, weapon) {
    if (image.dataset.fallbackApplied === "true") return;

    image.dataset.fallbackApplied = "true";
    image.src = getWeaponFallbackImage(weapon);
}

function handleGearImageError(image, piece) {
    if (image.dataset.fallbackApplied === "true") return;

    image.dataset.fallbackApplied = "true";
    image.src = getEquipmentItemFallbackImage(piece, "gear");
}

function escapeEquipmentTooltipText(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function ensureGlobalEquipmentTooltip() {
    let tooltip = document.getElementById("globalEquipmentTooltip");

    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "globalEquipmentTooltip";
        tooltip.className = "global-tooltip";
        document.body.appendChild(tooltip);
    }

    return tooltip;
}

function getEquipmentItemMainStat(item) {
    return item?.mainStat || item?.mainAttribute || item?.main_stat || "";
}

function getEquipmentItemSubStats(item) {
    return item?.subStats || item?.secondaryAttribute || item?.secondary_attribute || "";
}

function getEquipmentItemSetEffect(item) {
    return item?.setEffect || item?.set_effect || item?.rawData?.setEffect || item?.rawData?.set_effect || "";
}

function buildEquipmentTooltipLine(label, value) {
    if (!value) return "";

    return `
        <div class="equipment-tooltip-line">
            <span>${escapeEquipmentTooltipText(label)}</span>
            <strong>${escapeEquipmentTooltipText(value)}</strong>
        </div>
    `;
}

function buildEquipmentTooltipHtml(item, metaFallback = "") {
    const rarity = getEquipmentRarityValue(item);
    const title = escapeEquipmentTooltipText(item?.name || metaFallback || "Equipment");
    const itemType = item?.weaponType
        ? getEquipmentWeaponTypeLabel(item.weaponType)
        : metaFallback;
    const details = [
        buildEquipmentTooltipLine("Rarity", rarity ? `${rarity} Star` : ""),
        buildEquipmentTooltipLine(item?.weaponType ? "Type" : "Slot", itemType),
        buildEquipmentTooltipLine("Set", item?.setName || ""),
        buildEquipmentTooltipLine("Main Stat", getEquipmentItemMainStat(item)),
        buildEquipmentTooltipLine("Sub Stats", getEquipmentItemSubStats(item)),
        buildEquipmentTooltipLine("Passive", item?.passiveName || ""),
        buildEquipmentTooltipLine("Set Effect", getEquipmentItemSetEffect(item))
    ].filter(Boolean).join("");

    return `
        <div class="tooltip-card tooltip-element-neutral">
            <div class="tooltip-header">
                <div class="tooltip-title">${title}</div>
                <div class="tooltip-accent-line"></div>
            </div>
            ${details ? `<div class="equipment-tooltip-lines">${details}</div>` : ""}
        </div>
    `;
}

function positionEquipmentTooltip(targetEl) {
    const tooltip = ensureGlobalEquipmentTooltip();
    const rect = targetEl.getBoundingClientRect();
    const margin = 8;
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    let top = rect.top - tooltipRect.height - margin;

    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) left = window.innerWidth - tooltipRect.width - 8;
    if (top < 8) top = rect.bottom + margin;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function showEquipmentTooltip(targetEl, item, metaFallback = "") {
    if (!item?.name && !metaFallback) return;

    const tooltip = ensureGlobalEquipmentTooltip();
    tooltip.innerHTML = buildEquipmentTooltipHtml(item, metaFallback);
    tooltip.classList.add("visible");
    requestAnimationFrame(() => positionEquipmentTooltip(targetEl));
}

function hideEquipmentTooltip() {
    const tooltip = document.getElementById("globalEquipmentTooltip");
    if (!tooltip) return;
    tooltip.classList.remove("visible");
}

function attachEquipmentTooltipEvents(targetEl, item, metaFallback = "") {
    targetEl.addEventListener("mouseenter", () => showEquipmentTooltip(targetEl, item, metaFallback));
    targetEl.addEventListener("focus", () => showEquipmentTooltip(targetEl, item, metaFallback));
    targetEl.addEventListener("mouseleave", hideEquipmentTooltip);
    targetEl.addEventListener("blur", hideEquipmentTooltip);
    targetEl.addEventListener("mousemove", () => {
        const tooltip = document.getElementById("globalEquipmentTooltip");
        if (tooltip?.classList.contains("visible")) positionEquipmentTooltip(targetEl);
    });
}

function getWeaponsForOperator(operator) {
    const weaponType = getOperatorWeaponType(operator);
    return ENDFIELD_WEAPONS
        .filter(weapon => normalizeEquipmentWeaponType(weapon.weaponType) === weaponType)
        .sort((a, b) => Number(b.rarity || 0) - Number(a.rarity || 0) || String(a.name).localeCompare(String(b.name)));
}

function getGearPiecesForSlot(slot) {
    const databaseSlot = {
        armor: "body",
        gloves: "hands"
    }[slot] || slot;

    return ENDFIELD_GEAR_PIECES
        .filter(piece => {
            const pieceSlot = String(piece.slot || "").toLowerCase();
            if ((slot === "kit1" || slot === "kit2") && pieceSlot === "kit") {
                return true;
            }
            return pieceSlot === databaseSlot || pieceSlot === slot;
        })
        .sort((a, b) => Number(b.rarity || 0) - Number(a.rarity || 0) || String(a.name).localeCompare(String(b.name)));
}

function getGearPieceById(pieceId) {
    return ENDFIELD_GEAR_PIECES.find(piece => String(piece.id) === String(pieceId)) || null;
}

function getCatalogGearPiece(piece) {
    return getGearPieceById(piece?.pieceId) ||
        ENDFIELD_GEAR_PIECES.find(catalogPiece => (
            piece?.name &&
            String(catalogPiece.name || "").toLowerCase() === String(piece.name).toLowerCase()
        )) ||
        null;
}

function normalizeEquipmentFilterText(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u00e6/g, "ae")
        .replace(/\s+/g, " ");
}

function getEquipmentPieceStatLabels(piece) {
    return [
        ...splitEquipmentStatEntries(getEquipmentItemMainStat(piece)),
        ...splitEquipmentStatEntries(getEquipmentItemSubStats(piece))
    ].map(entry => parseEquipmentStatEntry(entry)?.label || entry.replace(/\s+[+-]?\s*\d+(?:[.,]\d+)?%?$/, "").trim())
        .filter(Boolean);
}

function getEquipmentGearSearchText(piece) {
    return normalizeEquipmentFilterText([
        piece?.name,
        piece?.setName,
        getEquipmentItemMainStat(piece),
        getEquipmentItemSubStats(piece),
        piece?.passiveName,
        getEquipmentItemSetEffect(piece),
        getEquipmentRarityValue(piece) ? `${getEquipmentRarityValue(piece)} star` : ""
    ].filter(Boolean).join(" "));
}

function getUniqueSortedValues(values) {
    return Array.from(new Set(values.filter(Boolean)))
        .sort((a, b) => String(a).localeCompare(String(b)));
}

function createEquipmentFilterSelect(label, values) {
    const select = document.createElement("select");
    select.className = "equipment-filter-select";
    select.setAttribute("aria-label", label);
    select.hidden = values.length <= 1;

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = label;
    select.appendChild(allOption);

    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    return select;
}

function compareEquipmentPiecesBySort(sortValue, first, second) {
    const pieceA = first.piece;
    const pieceB = second.piece;
    const rarityA = getEquipmentRarityValue(pieceA);
    const rarityB = getEquipmentRarityValue(pieceB);
    const nameA = String(pieceA?.name || "");
    const nameB = String(pieceB?.name || "");
    const setA = String(pieceA?.setName || "");
    const setB = String(pieceB?.setName || "");
    const statA = getEquipmentPieceStatLabels(pieceA)[0] || "";
    const statB = getEquipmentPieceStatLabels(pieceB)[0] || "";

    if (sortValue === "rarity_asc") {
        return rarityA - rarityB || nameA.localeCompare(nameB);
    }
    if (sortValue === "name") {
        return nameA.localeCompare(nameB);
    }
    if (sortValue === "set") {
        return setA.localeCompare(setB) || rarityB - rarityA || nameA.localeCompare(nameB);
    }
    if (sortValue === "stat") {
        return statA.localeCompare(statB) || rarityB - rarityA || nameA.localeCompare(nameB);
    }

    return rarityB - rarityA || nameA.localeCompare(nameB);
}

function getEquipmentCurrentSetName(slot, set = readEquipmentEditorForm()) {
    const setSummaries = collectGearSetSummaries(set);
    const activeSet = setSummaries.find(summary => summary.count >= 3);
    if (activeSet) return activeSet.name;

    const slotSetName = String(set.gear?.[slot]?.setName || "").trim();
    if (slotSetName) return slotSetName;

    return setSummaries[0]?.name || "";
}

function collectParsedGearStatTotals(set) {
    const totals = new Map();

    const entries = [];
    Object.values(set.gear).forEach(piece => {
        getRefinedEquipmentStatEntries(piece).forEach(entry => {
            entries.push(entry);
        });
    });
    entries.push(...collectEquipmentWeaponStatEntries(set));

    entries.forEach(entry => {
        const parsed = parseEquipmentStatEntry(entry);
        if (!parsed) return;

        const existing = totals.get(parsed.key);
        if (existing) {
            existing.value += parsed.value;
            existing.decimals = Math.max(existing.decimals, parsed.decimals);
        } else {
            totals.set(parsed.key, { ...parsed });
        }
    });

    return totals;
}

function getEquipmentRefinementLevel(value) {
    const level = Number(value || 0);
    if (!Number.isFinite(level)) return 0;

    return Math.max(0, Math.min(EQUIPMENT_REFINEMENT_MAX, Math.round(level)));
}

function getEquipmentGearRefinement(piece) {
    const source = piece && typeof piece === "object" ? piece : {};
    const legacy = source.refinement && typeof source.refinement === "object" ? source.refinement : {};

    return {
        main: getEquipmentRefinementLevel(source.refinementMain ?? legacy.main),
        second: getEquipmentRefinementLevel(source.refinementSecond ?? legacy.second),
        special: getEquipmentRefinementLevel(source.refinementSpecial ?? legacy.special)
    };
}

function getEquipmentRefinementMultiplier(level) {
    return 1 + (getEquipmentRefinementLevel(level) * EQUIPMENT_REFINEMENT_MULTIPLIER_STEP);
}

function truncateEquipmentStatValue(value, decimals = 0) {
    const safeDecimals = Math.max(0, Math.min(4, Number(decimals) || 0));
    const factor = 10 ** safeDecimals;
    const scaled = value * factor;

    return (value >= 0 ? Math.floor(scaled) : Math.ceil(scaled)) / factor;
}

function formatParsedEquipmentStatEntry(parsed) {
    const decimals = Math.min(parsed.decimals || 0, 2);
    const sign = parsed.value >= 0 ? "+" : "";
    const value = decimals > 0
        ? parsed.value.toFixed(decimals)
        : String(Math.round(parsed.value));

    return `${parsed.label} ${sign}${value}${parsed.isPercent ? "%" : ""}`;
}

function refineEquipmentStatEntry(entry, level) {
    const parsed = parseEquipmentStatEntry(entry);
    if (!parsed) return entry;

    const multiplier = getEquipmentRefinementMultiplier(level);
    const value = truncateEquipmentStatValue(parsed.value * multiplier, parsed.decimals);

    return formatParsedEquipmentStatEntry({
        ...parsed,
        value
    });
}

function getEquipmentRefinementStatRows(piece) {
    const mainEntries = splitEquipmentStatEntries(piece?.mainStat);
    const subEntries = splitEquipmentStatEntries(piece?.subStats);
    const rows = [];
    const getEntryLabel = entry => parseEquipmentStatEntry(entry)?.label || "Stat";

    mainEntries.forEach(entry => {
        rows.push({ field: "refinementMain", key: "main", label: getEntryLabel(entry), entry });
    });
    subEntries.forEach((entry, index) => {
        rows.push(index === 0
            ? { field: "refinementSecond", key: "second", label: getEntryLabel(entry), entry }
            : { field: "refinementSpecial", key: "special", label: getEntryLabel(entry), entry });
    });

    return rows.filter(row => parseEquipmentStatEntry(row.entry));
}

function getRefinedEquipmentStatEntries(piece) {
    const refinement = getEquipmentGearRefinement(piece);
    return getEquipmentRefinementStatRows(piece).map(row => refineEquipmentStatEntry(row.entry, refinement[row.key]));
}

function formatEquipmentStatDiffValue(diff, stat) {
    const sign = diff > 0 ? "+" : "";
    const decimals = Math.min(stat.decimals || 0, 2);
    const value = decimals > 0
        ? diff.toFixed(decimals)
        : String(Math.round(diff));

    return `${stat.label} ${sign}${value}${stat.isPercent ? "%" : ""}`;
}

function collectEquipmentStatDiffs(currentSet, projectedSet) {
    const currentTotals = collectParsedGearStatTotals(currentSet);
    const projectedTotals = collectParsedGearStatTotals(projectedSet);
    const keys = new Set([...currentTotals.keys(), ...projectedTotals.keys()]);

    return Array.from(keys).map(key => {
        const current = currentTotals.get(key);
        const projected = projectedTotals.get(key);
        const stat = projected || current;
        const diff = (projected?.value || 0) - (current?.value || 0);

        return {
            key,
            label: stat.label,
            value: diff,
            text: formatEquipmentStatDiffValue(diff, stat),
            direction: diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral",
            isPercent: stat.isPercent,
            decimals: stat.decimals
        };
    }).filter(diff => Math.abs(diff.value) > 0.0001)
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.label.localeCompare(b.label));
}

function createEquipmentGearFilterBar(slot, pieces, optionItems, emptyMessage, targetSetName = "", initialFilters = {}, onFilterChange = null) {
    const filterBar = document.createElement("div");
    filterBar.className = "equipment-filter-bar";

    const search = document.createElement("input");
    search.className = "equipment-filter-search";
    search.type = "search";
    search.placeholder = `Search ${getEquipmentSlotLabel(slot)}`;
    search.setAttribute("aria-label", `Search ${getEquipmentSlotLabel(slot)}`);

    const setSelect = createEquipmentFilterSelect(
        "All sets",
        getUniqueSortedValues(pieces.map(piece => piece.setName || ""))
    );
    const raritySelect = createEquipmentFilterSelect(
        "All rarity",
        getUniqueSortedValues(pieces.map(piece => getEquipmentRarityValue(piece)).filter(Boolean).map(String))
            .sort((a, b) => Number(b) - Number(a))
            .map(value => `${value} Star`)
    );
    const statSelect = createEquipmentFilterSelect(
        "All stats",
        getUniqueSortedValues(pieces.flatMap(getEquipmentPieceStatLabels))
    );
    const sortSelect = createEquipmentFilterSelect("Sort", [
        "Rarity high",
        "Rarity low",
        "Name A-Z",
        "Set A-Z",
        "Main Stat"
    ]);
    sortSelect.hidden = false;

    const targetSetButton = document.createElement("button");
    targetSetButton.type = "button";
    targetSetButton.className = "equipment-target-set-filter";
    targetSetButton.textContent = targetSetName ? `Current Set: ${targetSetName}` : "Current Set";
    targetSetButton.hidden = !targetSetName || !pieces.some(piece => piece.setName === targetSetName);
    targetSetButton.setAttribute("aria-pressed", "false");

    const count = document.createElement("span");
    count.className = "equipment-filter-count";

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "equipment-filter-clear";
    clearButton.textContent = "x";
    clearButton.setAttribute("aria-label", "Clear gear filters");

    const empty = document.createElement("div");
    empty.className = "equipment-weapon-empty equipment-filter-empty";
    empty.textContent = emptyMessage;
    empty.hidden = true;

    const chips = document.createElement("div");
    chips.className = "equipment-filter-chips";
    chips.hidden = true;

    const createChip = (label, value, onRemove) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "equipment-filter-chip";
        chip.textContent = `${label}: ${value} x`;
        chip.setAttribute("aria-label", `Remove ${label} filter`);
        chip.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
            applyFilters();
        });
        return chip;
    };

    if (initialFilters.searchText) search.value = initialFilters.searchText;
    if (initialFilters.setName) setSelect.value = initialFilters.setName;
    if (initialFilters.rarity) raritySelect.value = initialFilters.rarity;
    if (initialFilters.statLabel) statSelect.value = initialFilters.statLabel;
    if (initialFilters.sort) sortSelect.value = initialFilters.sort;

    const renderFilterChips = () => {
        const activeChips = [];

        if (search.value.trim()) {
            activeChips.push(createChip("Search", search.value.trim(), () => {
                search.value = "";
            }));
        }
        if (setSelect.value) {
            activeChips.push(createChip("Set", setSelect.value, () => {
                setSelect.value = "";
            }));
        }
        if (raritySelect.value) {
            activeChips.push(createChip("Rarity", raritySelect.value, () => {
                raritySelect.value = "";
            }));
        }
        if (statSelect.value) {
            activeChips.push(createChip("Stat", statSelect.value, () => {
                statSelect.value = "";
            }));
        }
        if (sortSelect.value) {
            activeChips.push(createChip("Sort", sortSelect.value, () => {
                sortSelect.value = "";
            }));
        }

        chips.replaceChildren(...activeChips);
        chips.hidden = activeChips.length === 0;
        clearButton.hidden = activeChips.length === 0;
    };

    const syncTargetSetButton = () => {
        if (targetSetButton.hidden) return;

        const isActive = setSelect.value === targetSetName;
        targetSetButton.classList.toggle("is-active", isActive);
        targetSetButton.setAttribute("aria-pressed", String(isActive));
    };

    const applyFilters = () => {
        const searchTerms = normalizeEquipmentFilterText(search.value).split(" ").filter(Boolean);
        const setValue = setSelect.value;
        const rarityValue = raritySelect.value ? raritySelect.value.replace(/\D+/g, "") : "";
        const statValue = normalizeEquipmentFilterText(statSelect.value);
        const sortMap = {
            "Rarity high": "rarity_desc",
            "Rarity low": "rarity_asc",
            "Name A-Z": "name",
            "Set A-Z": "set",
            "Main Stat": "stat"
        };
        const sortValue = sortMap[sortSelect.value] || "rarity_desc";
        let visibleCount = 0;

        if (typeof onFilterChange === "function") {
            onFilterChange({
                searchText: search.value.trim(),
                setName: setSelect.value,
                rarity: raritySelect.value,
                statLabel: statSelect.value,
                sort: sortSelect.value
            });
        }

        optionItems.forEach(({ element }) => {
            const matchesSearch = searchTerms.every(term => element.dataset.searchText.includes(term));
            const matchesSet = !setValue || element.dataset.setName === setValue;
            const matchesRarity = !rarityValue || element.dataset.rarity === rarityValue;
            const matchesStat = !statValue || element.dataset.stats.split("|").includes(statValue);
            const isVisible = matchesSearch && matchesSet && matchesRarity && matchesStat;

            element.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        count.textContent = `${visibleCount}/${pieces.length}`;
        empty.hidden = visibleCount > 0;
        syncTargetSetButton();
        renderFilterChips();

        optionItems
            .slice()
            .sort((first, second) => compareEquipmentPiecesBySort(sortValue, first, second))
            .forEach(({ element }) => filterBar.parentElement?.insertBefore(element, empty));
    };

    const clearFilters = () => {
        search.value = "";
        setSelect.value = "";
        raritySelect.value = "";
        statSelect.value = "";
        sortSelect.value = "";
        applyFilters();
    };

    [search, setSelect, raritySelect, statSelect, sortSelect].forEach(control => {
        control.addEventListener("input", applyFilters);
        control.addEventListener("change", applyFilters);
    });
    clearButton.addEventListener("click", clearFilters);
    targetSetButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        setSelect.value = setSelect.value === targetSetName ? "" : targetSetName;
        applyFilters();
    });
    filterBar.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        event.preventDefault();
        event.stopPropagation();
        if (search.value || setSelect.value || raritySelect.value || statSelect.value || sortSelect.value) clearFilters();
    });

    filterBar.append(search, targetSetButton, setSelect, raritySelect, statSelect, sortSelect, count, clearButton, chips);
    applyFilters();

    return { filterBar, empty };
}

function getEquipmentEditorOperators() {
    const teamOperators = selectedTeam
        .map(id => operators.find(operator => operator.id === id))
        .filter(Boolean);

    return teamOperators.length ? teamOperators : operators.slice(0, 4);
}

function getEquipmentEditorOperator(operatorId = equipmentEditorState.operatorId) {
    return operators.find(operator => Number(operator.id) === Number(operatorId)) || null;
}

function getOperatorEquipmentMainAttribute(operator) {
    return operator?.mainAttribute ||
        operator?.main_attribute ||
        operator?.rawData?.mainAttribute ||
        operator?.rawData?.main_attribute ||
        "";
}

function getOperatorEquipmentSecondaryAttribute(operator) {
    return operator?.secondaryAttribute ||
        operator?.secondary_attribute ||
        operator?.rawData?.secondaryAttribute ||
        operator?.rawData?.secondary_attribute ||
        "";
}

function setEquipmentEditorStatus(text, className = "") {
    const status = document.getElementById("equipmentEditorStatus");
    if (!status) return;

    status.className = `equipment-editor-status${className ? ` ${className}` : ""}`;
    status.textContent = text;
}

function getEquipmentSaveButton() {
    return document.querySelector(".equipment-editor-primary");
}

function getEquipmentSetSnapshot(set = readEquipmentEditorForm()) {
    const normalized = typeof normalizeOperatorEquipmentSet === "function"
        ? normalizeOperatorEquipmentSet(set)
        : set;

    return JSON.stringify(normalized);
}

function updateEquipmentSaveButton() {
    const button = getEquipmentSaveButton();
    if (!button) return;

    button.classList.toggle("has-unsaved", equipmentEditorState.isDirty);
    button.textContent = equipmentEditorState.isDirty ? "Save Set *" : "Save Set";
}

function markEquipmentEditorClean(set = readEquipmentEditorForm(), message = "Saved") {
    equipmentEditorState.savedSnapshot = getEquipmentSetSnapshot(set);
    equipmentEditorState.isDirty = false;
    updateEquipmentSaveButton();
    setEquipmentEditorStatus(message, "is-success");
}

function refreshEquipmentEditorDirtyState(message = "Unsaved changes") {
    const isDirty = getEquipmentSetSnapshot() !== equipmentEditorState.savedSnapshot;
    equipmentEditorState.isDirty = isDirty;
    updateEquipmentSaveButton();
    setEquipmentEditorStatus(isDirty ? message : "Saved", isDirty ? "is-warning" : "is-success");
}

function confirmEquipmentEditorDiscardChanges() {
    if (!equipmentEditorState.isDirty) return true;

    const operator = getEquipmentEditorOperator();
    return confirm(`Discard unsaved equipment changes for ${operator?.name || "this operator"}?`);
}

function setEquipmentInputValue(name, value) {
    const input = document.querySelector(`[data-equipment-field="${name}"]`);
    if (input) input.value = value || "";
}

function getEquipmentInputValue(name) {
    const input = document.querySelector(`[data-equipment-field="${name}"]`);
    return input ? input.value.trim() : "";
}

function hasEquipmentSlotValue(slot) {
    if (slot === "weapon") {
        return Boolean(
            getEquipmentInputValue("weapon.weaponId") ||
            getEquipmentInputValue("weapon.level")
        );
    }

    return Boolean(
        getEquipmentInputValue(`gear.${slot}.pieceId`) ||
        getEquipmentInputValue(`gear.${slot}.name`) ||
        getEquipmentInputValue(`gear.${slot}.setName`) ||
        getEquipmentInputValue(`gear.${slot}.mainStat`) ||
        getEquipmentInputValue(`gear.${slot}.subStats`) ||
        EQUIPMENT_REFINEMENT_FIELDS.some(config => getEquipmentInputValue(`gear.${slot}.${config.field}`))
    );
}

function updateEquipmentSlotClearButtons() {
    document.querySelectorAll("[data-equipment-clear-slot]").forEach(button => {
        const slot = button.dataset.equipmentClearSlot;
        button.hidden = !hasEquipmentSlotValue(slot);
    });
}

function clearEquipmentGearSlot(slot) {
    [
        "pieceId",
        "name",
        "setName",
        "rarity",
        "mainStat",
        "subStats",
        "refinementMain",
        "refinementSecond",
        "refinementSpecial",
        "notes"
    ].forEach(field => setEquipmentInputValue(`gear.${slot}.${field}`, ""));
}

function clearEquipmentEditorSlot(slot) {
    const operator = getEquipmentEditorOperator();

    if (slot === "weapon") {
        setEquipmentInputValue("weapon.weaponId", "");
        setEquipmentInputValue("weapon.customName", "");
        setEquipmentInputValue("weapon.level", "");
        setEquipmentInputValue("weapon.essencePrimary", "");
        setEquipmentInputValue("weapon.essenceSecondary", "");
        setEquipmentInputValue("weapon.essenceSkill", "");
        setEquipmentInputValue("weapon.notes", "");
        syncEquipmentWeaponLevelSlider();
        renderEquipmentWeaponSelect(operator, "");
    } else if (EQUIPMENT_GEAR_SLOTS.includes(slot)) {
        clearEquipmentGearSlot(slot);
        renderEquipmentGearSelect(slot, "");
        renderEquipmentGearSummary(readEquipmentEditorForm());
    }

    updateEquipmentSlotClearButtons();
    refreshEquipmentEditorDirtyState("Unsaved changes - slot cleared");
}

function getEquipmentLevelNumber(value, fallback = 80, maxLevel = 90) {
    const match = String(value || "").match(/\d+/);
    const level = match ? Number(match[0]) : fallback;
    const safeLevel = Number.isFinite(level) ? level : fallback;
    return Math.max(1, Math.min(maxLevel, Math.round(safeLevel)));
}

function getEquipmentOperatorMaxLevel(operator = getEquipmentEditorOperator()) {
    return getEquipmentNumericDataValue(operator, "baseStatsLevel", "base_stats_level") || 90;
}

function syncEquipmentWeaponLevelSlider() {
    const input = document.querySelector('[data-equipment-field="weapon.level"]');
    const slider = document.getElementById("equipmentWeaponLevelSlider");
    if (!input || !slider) return;

    slider.value = String(getEquipmentLevelNumber(input.value));
}

function syncEquipmentWeaponLevelInput() {
    const input = document.querySelector('[data-equipment-field="weapon.level"]');
    const slider = document.getElementById("equipmentWeaponLevelSlider");
    if (!input || !slider) return;

    input.value = String(getEquipmentLevelNumber(slider.value));
}

function syncEquipmentOperatorLevelSlider() {
    const input = document.querySelector('[data-equipment-field="operator.level"]');
    const slider = document.getElementById("equipmentOperatorLevelSlider");
    if (!input || !slider) return;

    const maxLevel = getEquipmentOperatorMaxLevel();
    input.max = String(maxLevel);
    slider.max = String(maxLevel);
    slider.value = String(getEquipmentLevelNumber(input.value, maxLevel, maxLevel));
}

function syncEquipmentOperatorLevelInput() {
    const input = document.querySelector('[data-equipment-field="operator.level"]');
    const slider = document.getElementById("equipmentOperatorLevelSlider");
    if (!input || !slider) return;

    input.value = String(getEquipmentLevelNumber(slider.value, getEquipmentOperatorMaxLevel(), getEquipmentOperatorMaxLevel()));
}

function fillEquipmentEditorForm(set) {
    setEquipmentInputValue("operator.level", set.operator?.level || getEquipmentOperatorMaxLevel());
    setEquipmentInputValue("weapon.weaponId", set.weapon.weaponId);
    setEquipmentInputValue("weapon.customName", set.weapon.customName);
    setEquipmentInputValue("weapon.level", set.weapon.level);
    setEquipmentInputValue("weapon.essencePrimary", set.weapon.essencePrimary);
    setEquipmentInputValue("weapon.essenceSecondary", set.weapon.essenceSecondary);
    setEquipmentInputValue("weapon.essenceSkill", set.weapon.essenceSkill);
    setEquipmentInputValue("weapon.notes", set.weapon.notes);
    setEquipmentInputValue("stats.mainStat", set.stats.mainStat);
    setEquipmentInputValue("stats.subStats", set.stats.subStats);

    ["armor", "gloves", "kit1", "kit2"].forEach(slot => {
        setEquipmentInputValue(`gear.${slot}.pieceId`, set.gear[slot].pieceId);
        setEquipmentInputValue(`gear.${slot}.name`, set.gear[slot].name);
        setEquipmentInputValue(`gear.${slot}.setName`, set.gear[slot].setName);
        setEquipmentInputValue(`gear.${slot}.rarity`, set.gear[slot].rarity);
        setEquipmentInputValue(`gear.${slot}.mainStat`, set.gear[slot].mainStat);
        setEquipmentInputValue(`gear.${slot}.subStats`, set.gear[slot].subStats);
        setEquipmentInputValue(`gear.${slot}.refinementMain`, set.gear[slot].refinementMain);
        setEquipmentInputValue(`gear.${slot}.refinementSecond`, set.gear[slot].refinementSecond);
        setEquipmentInputValue(`gear.${slot}.refinementSpecial`, set.gear[slot].refinementSpecial);
        setEquipmentInputValue(`gear.${slot}.notes`, set.gear[slot].notes);
    });

    syncEquipmentOperatorLevelSlider();
    syncEquipmentWeaponLevelSlider();
    renderEquipmentWeaponEssenceSummary(set);
    updateEquipmentSlotClearButtons();
}

function readEquipmentEditorForm() {
    const readGearPiece = slot => ({
        pieceId: getEquipmentInputValue(`gear.${slot}.pieceId`),
        name: getEquipmentInputValue(`gear.${slot}.name`),
        setName: getEquipmentInputValue(`gear.${slot}.setName`),
        rarity: getEquipmentInputValue(`gear.${slot}.rarity`),
        mainStat: getEquipmentInputValue(`gear.${slot}.mainStat`),
        subStats: getEquipmentInputValue(`gear.${slot}.subStats`),
        refinementMain: getEquipmentInputValue(`gear.${slot}.refinementMain`),
        refinementSecond: getEquipmentInputValue(`gear.${slot}.refinementSecond`),
        refinementSpecial: getEquipmentInputValue(`gear.${slot}.refinementSpecial`),
        notes: getEquipmentInputValue(`gear.${slot}.notes`)
    });

    return {
        operator: {
            level: getEquipmentInputValue("operator.level")
        },
        weapon: {
            weaponId: getEquipmentInputValue("weapon.weaponId"),
            customName: getEquipmentInputValue("weapon.customName"),
            level: getEquipmentInputValue("weapon.level"),
            essencePrimary: getEquipmentInputValue("weapon.essencePrimary"),
            essenceSecondary: getEquipmentInputValue("weapon.essenceSecondary"),
            essenceSkill: getEquipmentInputValue("weapon.essenceSkill"),
            notes: getEquipmentInputValue("weapon.notes")
        },
        stats: {
            mainStat: getEquipmentInputValue("stats.mainStat"),
            subStats: getEquipmentInputValue("stats.subStats")
        },
        gear: {
            armor: readGearPiece("armor"),
            gloves: readGearPiece("gloves"),
            kit1: readGearPiece("kit1"),
            kit2: readGearPiece("kit2")
        }
    };
}

function createEquipmentOperatorButton(operator) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "equipment-operator-btn";
    button.dataset.operatorId = String(operator.id);
    button.setAttribute("aria-pressed", String(Number(operator.id) === Number(equipmentEditorState.operatorId)));

    if (Number(operator.id) === Number(equipmentEditorState.operatorId)) {
        button.classList.add("is-active");
    }

    const image = document.createElement("img");
    image.src = operator.icon || "";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.textContent = operator.name;

    const badge = document.createElement("small");
    badge.textContent = hasOperatorEquipmentSet(operator.id) ? "Saved" : getEquipmentWeaponTypeLabel(getOperatorWeaponType(operator));

    button.append(image, copy, badge);
    button.addEventListener("click", () => selectEquipmentEditorOperator(operator.id));
    return button;
}

function renderEquipmentOperatorList() {
    const list = document.getElementById("equipmentOperatorList");
    if (!list) return;

    list.replaceChildren(...getEquipmentEditorOperators().map(createEquipmentOperatorButton));
}

function renderEquipmentEditorHeader(operator) {
    const avatar = document.getElementById("equipmentEditorAvatar");
    const name = document.getElementById("equipmentEditorName");
    const meta = document.getElementById("equipmentEditorMeta");

    if (avatar) {
        avatar.src = operator?.icon || "";
        avatar.alt = operator ? `${operator.name} operator avatar` : "";
    }
    if (name) name.textContent = operator?.name || "No operator selected";
    if (meta) {
        meta.textContent = operator
            ? [
                operator.star ? `${operator.star} Star` : "",
                operator.operatorClass,
                formatElementLabel(operator.elementType),
                getEquipmentWeaponTypeLabel(getOperatorWeaponType(operator))
            ].filter(Boolean).join(" - ")
            : "Choose an operator to edit equipment.";
    }

    const gearAvatar = document.getElementById("equipmentGearPreviewAvatar");
    const gearLabel = document.getElementById("equipmentGearPreviewLabel");
    if (gearAvatar) {
        gearAvatar.src = operator?.icon || "";
        gearAvatar.alt = operator ? `${operator.name} gear preview` : "";
    }
    if (gearLabel) {
        gearLabel.textContent = operator ? `${operator.name}/Gear` : "Operator/Gear";
    }
}

function renderEquipmentWeaponSelect(operator, selectedWeaponId = "") {
    const input = document.querySelector('[data-equipment-field="weapon.weaponId"]');
    const select = document.getElementById("equipmentWeaponSelect");
    const typeLabel = document.getElementById("equipmentEditorWeaponType");
    if (!input || !select) return;

    const weapons = getWeaponsForOperator(operator);
    const selectedWeapon = weapons.find(weapon => String(weapon.id) === String(selectedWeaponId)) || null;
    input.value = selectedWeapon?.id || "";
    select.replaceChildren(createEquipmentWeaponDropdown(operator, weapons, selectedWeapon));

    if (typeLabel) {
        typeLabel.textContent = `Weapon type: ${getEquipmentWeaponTypeLabel(getOperatorWeaponType(operator))}`;
    }
    renderEquipmentWeaponEssenceSummary();
    updateEquipmentSlotClearButtons();
}

function renderEquipmentWeaponEssenceSummary(set = readEquipmentEditorForm()) {
    const summary = document.getElementById("equipmentWeaponEssenceSummary");
    if (!summary) return;

    const weapon = getEquipmentWeaponById(set?.weapon?.weaponId);
    const essence = getEquipmentWeaponEssenceState(set?.weapon);
    const parts = EQUIPMENT_WEAPON_ESSENCE_FIELDS
        .filter(config => config.key !== "secondary" || resolveEquipmentWeaponEssenceLabel(weapon, "secondary"))
        .map(config => essence[config.key] ? `${config.label} +${essence[config.key]}` : "")
        .filter(Boolean);

    summary.hidden = !weapon || parts.length === 0;
    summary.textContent = parts.length ? `Essence: ${parts.join(" / ")}` : "";
}

function createEquipmentWeaponImage(weapon) {
    const image = document.createElement("img");
    image.className = `equipment-weapon-image ${getWeaponRarityClass(weapon)}`;
    image.src = getWeaponImageSource(weapon);
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.addEventListener("error", () => handleWeaponImageError(image, weapon));
    return image;
}

function createEquipmentWeaponText(weapon) {
    const text = document.createElement("span");
    text.className = "equipment-weapon-text";

    const name = document.createElement("strong");
    name.textContent = weapon?.name || "Select weapon";
    if (weapon) name.classList.add(getWeaponRarityClass(weapon));

    const meta = document.createElement("small");
    meta.textContent = weapon
        ? [getEquipmentRarityValue(weapon) ? `${getEquipmentRarityValue(weapon)} Star` : "", getEquipmentWeaponTypeLabel(weapon.weaponType)].filter(Boolean).join(" - ")
        : "No weapon selected";

    text.append(name, meta);
    return text;
}

function getEquipmentWeaponSearchText(weapon) {
    return normalizeEquipmentFilterText([
        weapon?.name,
        getEquipmentWeaponTypeLabel(weapon?.weaponType),
        getEquipmentRarityValue(weapon) ? `${getEquipmentRarityValue(weapon)} star` : "",
        weapon?.passiveName,
        weapon?.notes
    ].filter(Boolean).join(" "));
}

function compareEquipmentWeaponsBySort(sortValue, first, second) {
    const weaponA = first.weapon;
    const weaponB = second.weapon;
    const rarityA = getEquipmentRarityValue(weaponA);
    const rarityB = getEquipmentRarityValue(weaponB);
    const nameA = String(weaponA?.name || "");
    const nameB = String(weaponB?.name || "");

    if (sortValue === "rarity_asc") {
        return rarityA - rarityB || nameA.localeCompare(nameB);
    }
    if (sortValue === "name") {
        return nameA.localeCompare(nameB);
    }

    return rarityB - rarityA || nameA.localeCompare(nameB);
}

function applyRarityClass(element, item) {
    element.classList.add(getItemRarityClass(item));
}

function createEquipmentItemText(item, metaFallback = "") {
    const text = document.createElement("span");
    text.className = "equipment-weapon-text";

    const name = document.createElement("strong");
    name.textContent = item?.name || "Select item";
    if (item) name.classList.add(getItemRarityClass(item));

    const meta = document.createElement("small");
    meta.textContent = item
        ? [
            getEquipmentRarityValue(item) ? `${getEquipmentRarityValue(item)} Star` : "",
            item.setName || metaFallback
        ].filter(Boolean).join(" - ")
        : metaFallback;

    text.append(name, meta);
    return text;
}

function createEquipmentWeaponDropdown(operator, weapons, selectedWeapon) {
    const root = document.createElement("div");
    root.className = "equipment-weapon-dropdown equipment-weapon-picker-trigger-wrap";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "equipment-weapon-trigger";
    if (selectedWeapon) applyRarityClass(button, selectedWeapon);
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.disabled = weapons.length === 0;

    if (selectedWeapon) {
        button.append(createEquipmentWeaponImage(selectedWeapon), createEquipmentWeaponText(selectedWeapon));
        attachEquipmentTooltipEvents(button, selectedWeapon, getEquipmentWeaponTypeLabel(selectedWeapon.weaponType));
    } else {
        const emptyImage = document.createElement("span");
        emptyImage.className = "equipment-weapon-image is-empty";
        emptyImage.textContent = "?";
        button.append(emptyImage, createEquipmentWeaponText(null));
    }

    const chevron = document.createElement("span");
    chevron.className = "equipment-weapon-chevron";
    chevron.textContent = "⌄";
    button.appendChild(chevron);

    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openEquipmentWeaponPicker(operator);
    });

    root.append(button);
    return root;
}

function closeEquipmentWeaponMenus() {
    document.querySelectorAll(".equipment-weapon-dropdown.is-open").forEach(dropdown => {
        dropdown.classList.remove("is-open");
        const button = dropdown.querySelector(".equipment-weapon-trigger");
        const list = dropdown.querySelector(".equipment-weapon-menu");
        if (button) button.setAttribute("aria-expanded", "false");
        if (list) list.hidden = true;
    });
}

function getEquipmentWeaponPickerSelectedWeapon() {
    const state = equipmentEditorState.weaponPicker;
    if (!state?.selectedWeaponId) return null;

    const operator = getEquipmentEditorOperator(state.operatorId);
    const weapons = getWeaponsForOperator(operator);
    return weapons.find(weapon => String(weapon.id) === String(state.selectedWeaponId)) || getEquipmentWeaponById(state.selectedWeaponId);
}

function ensureEquipmentWeaponPickerModal() {
    let modal = document.getElementById("equipmentWeaponPickerModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "equipmentWeaponPickerModal";
    modal.className = "equipment-gear-picker-modal equipment-weapon-picker-modal";
    modal.hidden = true;
    modal.innerHTML = `
        <div class="equipment-gear-picker-dialog equipment-weapon-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="equipmentWeaponPickerTitle">
            <header class="equipment-gear-picker-header">
                <div>
                    <span class="equipment-gear-picker-kicker">Weapon Selection</span>
                    <h3 id="equipmentWeaponPickerTitle">Select Weapon</h3>
                </div>
                <button type="button" class="equipment-gear-picker-close" data-weapon-picker-close aria-label="Close weapon selection">x</button>
            </header>
            <div class="equipment-gear-picker-body">
                <section class="equipment-gear-picker-main" data-weapon-picker-main></section>
                <aside class="equipment-gear-picker-side" data-weapon-picker-side></aside>
            </div>
            <footer class="equipment-gear-picker-footer">
                <button type="button" class="equipment-editor-danger" data-weapon-picker-clear>Clear Weapon</button>
                <span data-weapon-picker-status></span>
                <button type="button" class="equipment-editor-secondary" data-weapon-picker-cancel>Cancel</button>
                <button type="button" class="equipment-editor-primary" data-weapon-picker-apply>Apply</button>
            </footer>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
        if (event.target === modal) closeEquipmentWeaponPicker();
    });
    modal.querySelector("[data-weapon-picker-close]")?.addEventListener("click", closeEquipmentWeaponPicker);
    modal.querySelector("[data-weapon-picker-cancel]")?.addEventListener("click", closeEquipmentWeaponPicker);
    modal.querySelector("[data-weapon-picker-clear]")?.addEventListener("click", clearEquipmentWeaponPickerSelection);
    modal.querySelector("[data-weapon-picker-apply]")?.addEventListener("click", applyEquipmentWeaponPickerSelection);

    return modal;
}

function isEquipmentWeaponPickerOpen() {
    const modal = document.getElementById("equipmentWeaponPickerModal");
    return Boolean(modal && !modal.hidden);
}

function closeEquipmentWeaponPicker() {
    const modal = document.getElementById("equipmentWeaponPickerModal");
    if (modal) {
        modal.hidden = true;
        modal.classList.remove("is-open");
    }
    equipmentEditorState.weaponPicker = null;
    hideEquipmentTooltip();
}

function createEquipmentWeaponPickerFilterBar(operator, weapons, optionItems, initialFilters = {}, onFilterChange = null) {
    const filterBar = document.createElement("div");
    filterBar.className = "equipment-filter-bar equipment-weapon-picker-filter";

    const weaponTypeLabel = getEquipmentWeaponTypeLabel(getOperatorWeaponType(operator));
    const search = document.createElement("input");
    search.className = "equipment-filter-search";
    search.type = "search";
    search.placeholder = `Search ${weaponTypeLabel}`;
    search.setAttribute("aria-label", `Search ${weaponTypeLabel} weapons`);

    const raritySelect = createEquipmentFilterSelect(
        "All rarity",
        getUniqueSortedValues(weapons.map(weapon => getEquipmentRarityValue(weapon)).filter(Boolean).map(String))
            .sort((a, b) => Number(b) - Number(a))
            .map(value => `${value} Star`)
    );
    const sortSelect = createEquipmentFilterSelect("Sort", [
        "Rarity high",
        "Rarity low",
        "Name A-Z"
    ]);
    sortSelect.hidden = false;

    const count = document.createElement("span");
    count.className = "equipment-filter-count";

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "equipment-filter-clear";
    clearButton.textContent = "x";
    clearButton.setAttribute("aria-label", "Clear weapon filters");

    const chips = document.createElement("div");
    chips.className = "equipment-filter-chips";
    chips.hidden = true;

    const empty = document.createElement("div");
    empty.className = "equipment-weapon-empty equipment-filter-empty";
    empty.textContent = `No ${weaponTypeLabel} weapons match the filters.`;
    empty.hidden = true;

    const createChip = (label, value, onRemove) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "equipment-filter-chip";
        chip.textContent = `${label}: ${value} x`;
        chip.setAttribute("aria-label", `Remove ${label} filter`);
        chip.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
            applyFilters();
        });
        return chip;
    };

    if (initialFilters.searchText) search.value = initialFilters.searchText;
    if (initialFilters.rarity) raritySelect.value = initialFilters.rarity;
    if (initialFilters.sort) sortSelect.value = initialFilters.sort;

    const renderFilterChips = () => {
        const activeChips = [];
        if (search.value.trim()) {
            activeChips.push(createChip("Search", search.value.trim(), () => {
                search.value = "";
            }));
        }
        if (raritySelect.value) {
            activeChips.push(createChip("Rarity", raritySelect.value, () => {
                raritySelect.value = "";
            }));
        }
        if (sortSelect.value) {
            activeChips.push(createChip("Sort", sortSelect.value, () => {
                sortSelect.value = "";
            }));
        }

        chips.replaceChildren(...activeChips);
        chips.hidden = activeChips.length === 0;
        clearButton.hidden = activeChips.length === 0;
    };

    const applyFilters = () => {
        const searchTerms = normalizeEquipmentFilterText(search.value).split(" ").filter(Boolean);
        const rarityValue = raritySelect.value ? raritySelect.value.replace(/\D+/g, "") : "";
        const sortMap = {
            "Rarity high": "rarity_desc",
            "Rarity low": "rarity_asc",
            "Name A-Z": "name"
        };
        const sortValue = sortMap[sortSelect.value] || "rarity_desc";
        let visibleCount = 0;

        if (typeof onFilterChange === "function") {
            onFilterChange({
                searchText: search.value.trim(),
                rarity: raritySelect.value,
                sort: sortSelect.value
            });
        }

        optionItems.forEach(({ element }) => {
            const matchesSearch = searchTerms.every(term => element.dataset.searchText.includes(term));
            const matchesRarity = !rarityValue || element.dataset.rarity === rarityValue;
            const isVisible = matchesSearch && matchesRarity;

            element.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        count.textContent = `${visibleCount}/${weapons.length}`;
        empty.hidden = visibleCount > 0;
        renderFilterChips();

        optionItems
            .slice()
            .sort((first, second) => compareEquipmentWeaponsBySort(sortValue, first, second))
            .forEach(({ element }) => filterBar.parentElement?.insertBefore(element, empty));
    };

    const clearFilters = () => {
        search.value = "";
        raritySelect.value = "";
        sortSelect.value = "";
        applyFilters();
    };

    [search, raritySelect, sortSelect].forEach(control => {
        control.addEventListener("input", applyFilters);
        control.addEventListener("change", applyFilters);
    });
    clearButton.addEventListener("click", clearFilters);
    filterBar.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        event.preventDefault();
        event.stopPropagation();
        if (search.value || raritySelect.value || sortSelect.value) clearFilters();
    });

    filterBar.append(search, raritySelect, sortSelect, count, clearButton, chips);
    applyFilters();

    return { filterBar, empty };
}

function createEquipmentWeaponPickerOption(weapon, selectedWeaponId) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `equipment-weapon-option equipment-tile-option equipment-weapon-picker-option ${getWeaponRarityClass(weapon)}`;
    applyRarityClass(item, weapon);
    item.role = "option";
    item.dataset.searchText = getEquipmentWeaponSearchText(weapon);
    item.dataset.rarity = String(getEquipmentRarityValue(weapon) || "");

    const isSelected = String(weapon.id) === String(selectedWeaponId || "");
    if (isSelected) item.classList.add("is-picker-selected");
    item.setAttribute("aria-selected", String(isSelected));

    const meta = document.createElement("div");
    meta.className = "equipment-tile-compare";
    meta.append(
        createEquipmentTileCompareBadge(getEquipmentWeaponTypeLabel(weapon.weaponType), "neutral"),
        createEquipmentTileCompareBadge(`${getEquipmentRarityValue(weapon) || "?"} Star`, getEquipmentRarityValue(weapon) >= 5 ? "warning" : "neutral")
    );

    item.append(createEquipmentWeaponImage(weapon), createEquipmentWeaponText(weapon), meta);
    item.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const state = equipmentEditorState.weaponPicker;
        if (!state) return;

        if (String(state.selectedWeaponId || "") !== String(weapon.id)) {
            state.essence = getEquipmentWeaponEssenceState();
        }
        state.selectedWeaponId = weapon.id;
        renderEquipmentWeaponPicker();
    });
    return item;
}

function createEquipmentWeaponEssenceControl(weapon, operator, state) {
    const essence = getEquipmentWeaponEssenceState(state?.essence);
    const essenceData = getEquipmentWeaponEssenceData(weapon);
    const weaponLevel = getEquipmentWeaponLevelForEssence();
    const root = document.createElement("section");
    root.className = "equipment-weapon-essence";

    const title = document.createElement("div");
    title.className = "equipment-gear-picker-refinement-title";
    const heading = document.createElement("strong");
    heading.textContent = "Essence";
    const hint = document.createElement("span");
    hint.textContent = "Matching effects";
    title.append(heading, hint);
    root.appendChild(title);

    EQUIPMENT_WEAPON_ESSENCE_FIELDS.forEach(config => {
        const label = resolveEquipmentWeaponEssenceLabel(weapon, config.key, operator);
        if (config.key === "secondary" && !label) return;
        const maxLevel = Number(essenceData?.maxEssence?.[config.key]) || config.max;
        const hasExactValues = config.key === "skill"
            ? Array.isArray(essenceData?.skill?.descriptions) && essenceData.skill.descriptions.length === 9
            : Boolean(getEquipmentWeaponEssenceStatConfig(weapon, config.key, operator, weaponLevel));

        const row = document.createElement("div");
        row.className = "equipment-gear-picker-refinement-row equipment-weapon-essence-row";
        row.classList.toggle("is-unverified", !hasExactValues);

        const rowHeader = document.createElement("div");
        rowHeader.className = "equipment-weapon-essence-row-header";
        const rowLabel = document.createElement("span");
        rowLabel.textContent = label || config.label;
        const rank = document.createElement("small");
        const level = essence[config.key];
        const bonus = formatEquipmentWeaponEssenceBonus(weapon, config.key, level, operator);
        if (!hasExactValues) {
            rank.textContent = "Exact values missing";
        } else if (config.key === "skill") {
            rank.textContent = level ? `Skill rank ${level}/9` : "No Essence effect";
            if (level) {
                rank.title = essenceData.skill.descriptions[level - 1] || "";
            }
        } else {
            const rankState = getEquipmentWeaponEssenceRankState(
                weapon,
                config.key,
                level,
                operator,
                weaponLevel
            );
            rank.textContent = bonus
                ? `${bonus} · Rank ${rankState.baseRank}→${rankState.targetRank}`
                : `Base rank ${rankState?.baseRank || "-"}`;
        }
        rowHeader.append(rowLabel, rank);

        const levels = document.createElement("div");
        levels.className = "equipment-gear-picker-refinement-levels";
        levels.style.setProperty("--essence-level-count", String(maxLevel + 1));
        for (let nextLevel = 0; nextLevel <= maxLevel; nextLevel += 1) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "equipment-gear-picker-refinement-level";
            button.textContent = `+${nextLevel}`;
            button.classList.toggle("is-active", nextLevel === level);
            button.disabled = !hasExactValues && nextLevel > 0;
            button.setAttribute("aria-label", `${label || config.label} essence level +${nextLevel}`);
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                if (!equipmentEditorState.weaponPicker) return;

                equipmentEditorState.weaponPicker.essence = {
                    ...getEquipmentWeaponEssenceState(equipmentEditorState.weaponPicker.essence),
                    [config.key]: nextLevel
                };
                renderEquipmentWeaponPicker();
            });
            levels.appendChild(button);
        }

        row.append(rowHeader, levels);
        root.appendChild(row);
    });

    const note = document.createElement("p");
    note.className = "equipment-weapon-essence-note";
    note.textContent = essenceData
        ? "Verified rank values. Weapon level determines the breakthrough base rank."
        : "No verified rank table loaded. Non-zero Essence values stay disabled.";
    root.appendChild(note);
    return root;
}

function createEquipmentWeaponPickerSide(weapon, operator, state) {
    const side = document.createElement("div");
    side.className = "equipment-gear-picker-detail equipment-weapon-picker-detail";

    const title = document.createElement("h4");
    title.textContent = "Selection";
    side.appendChild(title);

    if (!weapon) {
        const empty = document.createElement("p");
        empty.className = "equipment-gear-picker-empty";
        empty.textContent = "Choose a weapon to see details.";
        side.appendChild(empty);
        return side;
    }

    const header = document.createElement("div");
    header.className = "equipment-gear-picker-selected";
    applyRarityClass(header, weapon);
    header.append(createEquipmentWeaponImage(weapon), createEquipmentWeaponText(weapon));

    const stats = document.createElement("div");
    stats.className = "equipment-gear-picker-stat-grid";
    stats.append(
        createEquipmentGearPickerStatLine("Operator", operator?.name || "-"),
        createEquipmentGearPickerStatLine("Weapon Type", getEquipmentWeaponTypeLabel(weapon.weaponType)),
        createEquipmentGearPickerStatLine("Rarity", getEquipmentRarityValue(weapon) ? `${getEquipmentRarityValue(weapon)} Star` : ""),
        createEquipmentGearPickerStatLine("Passive", weapon.passiveName || "No passive stored"),
        createEquipmentGearPickerStatLine("Notes", weapon.notes || "")
    );

    side.append(header, stats, createEquipmentWeaponEssenceControl(weapon, operator, state));
    return side;
}

function renderEquipmentWeaponPicker() {
    const modal = ensureEquipmentWeaponPickerModal();
    const state = equipmentEditorState.weaponPicker;
    if (!state) return;

    const operator = getEquipmentEditorOperator(state.operatorId);
    const weapons = getWeaponsForOperator(operator);
    const selectedWeapon = getEquipmentWeaponPickerSelectedWeapon();
    const main = modal.querySelector("[data-weapon-picker-main]");
    const side = modal.querySelector("[data-weapon-picker-side]");
    const title = modal.querySelector("#equipmentWeaponPickerTitle");
    const status = modal.querySelector("[data-weapon-picker-status]");
    const applyButton = modal.querySelector("[data-weapon-picker-apply]");
    const clearButton = modal.querySelector("[data-weapon-picker-clear]");
    if (!main || !side) return;

    const weaponTypeLabel = getEquipmentWeaponTypeLabel(getOperatorWeaponType(operator));
    if (title) title.textContent = `Select ${weaponTypeLabel}`;
    if (status) status.textContent = selectedWeapon ? `Ready: ${selectedWeapon.name}` : "Pick a weapon first.";
    if (applyButton) applyButton.disabled = !selectedWeapon;
    if (clearButton) clearButton.disabled = !selectedWeapon && !hasEquipmentSlotValue("weapon");

    const content = document.createElement("div");
    content.className = "equipment-gear-picker-list equipment-weapon-picker-list";
    content.role = "listbox";

    if (!weapons.length) {
        const empty = document.createElement("div");
        empty.className = "equipment-weapon-empty";
        empty.textContent = `No ${weaponTypeLabel} weapons available.`;
        content.appendChild(empty);
    } else {
        const optionItems = weapons.map(weapon => ({
            weapon,
            element: createEquipmentWeaponPickerOption(weapon, state.selectedWeaponId)
        }));
        const filters = createEquipmentWeaponPickerFilterBar(
            operator,
            weapons,
            optionItems,
            state.filters || {},
            nextFilters => {
                if (equipmentEditorState.weaponPicker) equipmentEditorState.weaponPicker.filters = nextFilters;
            }
        );
        content.append(filters.filterBar, ...optionItems.map(option => option.element), filters.empty);
    }

    main.replaceChildren(content);
    side.replaceChildren(createEquipmentWeaponPickerSide(selectedWeapon, operator, state));

    requestAnimationFrame(() => {
        const selected = modal.querySelector(".equipment-weapon-picker-list .is-picker-selected");
        if (selected) selected.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
}

function openEquipmentWeaponPicker(operator = getEquipmentEditorOperator()) {
    if (!operator) return false;

    closeEquipmentGearPicker({ restoreSummary: false });
    closeEquipmentWeaponMenus();
    hideEquipmentTooltip();

    equipmentEditorState.weaponPicker = {
        operatorId: operator.id,
        selectedWeaponId: getEquipmentInputValue("weapon.weaponId"),
        essence: getEquipmentWeaponEssenceState({
            essencePrimary: getEquipmentInputValue("weapon.essencePrimary"),
            essenceSecondary: getEquipmentInputValue("weapon.essenceSecondary"),
            essenceSkill: getEquipmentInputValue("weapon.essenceSkill")
        }),
        filters: {}
    };

    const modal = ensureEquipmentWeaponPickerModal();
    modal.hidden = false;
    modal.classList.add("is-open");
    renderEquipmentWeaponPicker();

    requestAnimationFrame(() => {
        modal.querySelector(".equipment-filter-search")?.focus();
    });
    return true;
}

function applyEquipmentWeaponPickerSelection() {
    const state = equipmentEditorState.weaponPicker;
    const operator = getEquipmentEditorOperator(state?.operatorId);
    const weapon = getEquipmentWeaponPickerSelectedWeapon();
    if (!state || !operator || !weapon) return;

    const essence = getEquipmentWeaponEssenceState(state.essence);
    setEquipmentInputValue("weapon.weaponId", weapon.id);
    setEquipmentInputValue("weapon.essencePrimary", essence.primary || "");
    setEquipmentInputValue("weapon.essenceSecondary", essence.secondary || "");
    setEquipmentInputValue("weapon.essenceSkill", essence.skill || "");
    renderEquipmentWeaponSelect(operator, weapon.id);
    renderEquipmentGearSummary(readEquipmentEditorForm());
    updateEquipmentSlotClearButtons();
    refreshEquipmentEditorDirtyState("Unsaved changes - weapon selected");
    closeEquipmentWeaponPicker();
}

function clearEquipmentWeaponPickerSelection() {
    const state = equipmentEditorState.weaponPicker;
    const operator = getEquipmentEditorOperator(state?.operatorId);
    if (!state || !operator) return;

    setEquipmentInputValue("weapon.weaponId", "");
    setEquipmentInputValue("weapon.customName", "");
    setEquipmentInputValue("weapon.level", "");
    setEquipmentInputValue("weapon.essencePrimary", "");
    setEquipmentInputValue("weapon.essenceSecondary", "");
    setEquipmentInputValue("weapon.essenceSkill", "");
    setEquipmentInputValue("weapon.notes", "");
    syncEquipmentWeaponLevelSlider();
    renderEquipmentWeaponSelect(operator, "");
    renderEquipmentGearSummary(readEquipmentEditorForm());
    updateEquipmentSlotClearButtons();
    refreshEquipmentEditorDirtyState("Unsaved changes - weapon cleared");
    closeEquipmentWeaponPicker();
}

function createEquipmentGearImage(piece) {
    const image = document.createElement("img");
    image.className = `equipment-weapon-image ${getItemRarityClass(piece)}`;
    image.src = getGearImageSource(piece);
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.addEventListener("error", () => handleGearImageError(image, piece));
    return image;
}

function applyEquipmentGearPieceToInputs(slot, piece) {
    if (!piece) return;

    setEquipmentInputValue(`gear.${slot}.pieceId`, piece.id);
    setEquipmentInputValue(`gear.${slot}.name`, piece.name || "");
    setEquipmentInputValue(`gear.${slot}.setName`, piece.setName || "");
    setEquipmentInputValue(`gear.${slot}.rarity`, getEquipmentRarityValue(piece) ? `${getEquipmentRarityValue(piece)} Star` : "");
    setEquipmentInputValue(`gear.${slot}.mainStat`, getEquipmentItemMainStat(piece));
    setEquipmentInputValue(`gear.${slot}.subStats`, getEquipmentItemSubStats(piece));
    setEquipmentInputValue(`gear.${slot}.notes`, piece.notes || "");
}

function resetEquipmentGearRefinement(slot) {
    EQUIPMENT_REFINEMENT_FIELDS.forEach(config => {
        setEquipmentInputValue(`gear.${slot}.${config.field}`, "");
    });
}

function createEquipmentGearPieceFormValue(piece, refinement = null) {
    return {
        pieceId: piece?.id || "",
        name: piece?.name || "",
        setName: piece?.setName || "",
        rarity: getEquipmentRarityValue(piece) ? `${getEquipmentRarityValue(piece)} Star` : "",
        mainStat: getEquipmentItemMainStat(piece),
        subStats: getEquipmentItemSubStats(piece),
        refinementMain: refinement ? String(getEquipmentRefinementLevel(refinement.main)) : "",
        refinementSecond: refinement ? String(getEquipmentRefinementLevel(refinement.second)) : "",
        refinementSpecial: refinement ? String(getEquipmentRefinementLevel(refinement.special)) : "",
        notes: piece?.notes || ""
    };
}

function getProjectedEquipmentSetForPiece(slot, piece, baseSet = readEquipmentEditorForm(), refinement = null) {
    return {
        ...baseSet,
        gear: {
            ...baseSet.gear,
            [slot]: createEquipmentGearPieceFormValue(piece, refinement)
        }
    };
}

function updateEquipmentSetPreview(preview, slot, piece) {
    if (!preview) return;

    const setName = String(piece?.setName || "").trim();
    if (!piece || !setName) {
        preview.hidden = true;
        preview.replaceChildren();
        return;
    }

    const currentSet = readEquipmentEditorForm();
    const projectedSet = getProjectedEquipmentSetForPiece(slot, piece, currentSet);
    const summary = collectGearSetSummaries(projectedSet).find(candidate => candidate.name === setName);
    const count = summary?.count || 1;
    const isActive = count >= 3;
    const needed = Math.max(3 - count, 0);
    const effectText = summary?.effect || getEquipmentItemSetEffect(piece) || "No set effect stored yet.";

    const title = document.createElement("strong");
    title.textContent = setName;

    const status = document.createElement("span");
    status.className = `equipment-set-preview-status${isActive ? " is-active" : ""}`;
    status.textContent = isActive ? `Active after select: ${count}/3` : `After select: ${count}/3 - ${needed} more`;

    const effect = document.createElement("p");
    effect.textContent = effectText;

    preview.replaceChildren(title, status, effect);
    preview.hidden = false;
}

function createEquipmentSetPreview(slot, piece) {
    const preview = document.createElement("div");
    preview.className = "equipment-set-preview";
    preview.setAttribute("aria-live", "polite");
    updateEquipmentSetPreview(preview, slot, piece);
    return preview;
}

function canRefineEquipmentGearPiece(piece) {
    return getEquipmentRarityValue(piece) >= 5;
}

function createEquipmentRefinementSelect(slot, row, formPiece) {
    const wrapper = document.createElement("label");
    wrapper.className = "equipment-refinement-field";

    const label = document.createElement("span");
    label.textContent = row.label;

    const select = document.createElement("select");
    select.setAttribute("aria-label", `${row.label} refinement`);

    for (let level = 0; level <= EQUIPMENT_REFINEMENT_MAX; level += 1) {
        const option = document.createElement("option");
        option.value = String(level);
        option.textContent = `+${level}`;
        select.appendChild(option);
    }

    const value = document.createElement("small");
    const refreshValue = () => {
        const refined = refineEquipmentStatEntry(row.entry, select.value);
        value.textContent = refined.replace(/^.+?\s+/, "");
        wrapper.title = `${row.label}: ${row.entry} -> ${refined}`;
    };

    select.value = String(getEquipmentRefinementLevel(formPiece?.[row.field]));
    select.addEventListener("change", () => {
        setEquipmentInputValue(`gear.${slot}.${row.field}`, select.value === "0" ? "" : select.value);
        refreshValue();
        renderEquipmentGearSummary(readEquipmentEditorForm());
        updateEquipmentSlotClearButtons();
        refreshEquipmentEditorDirtyState(`Unsaved changes - ${getEquipmentSlotLabel(slot)} refined`);
    });

    refreshValue();
    wrapper.append(label, select, value);
    return wrapper;
}

function createEquipmentRefinementControls(slot, selectedPiece) {
    if (!selectedPiece || !canRefineEquipmentGearPiece(selectedPiece)) return null;

    const formPiece = readEquipmentEditorForm().gear?.[slot] || {};
    const pieceWithStoredStats = {
        ...selectedPiece,
        mainStat: formPiece.mainStat || getEquipmentItemMainStat(selectedPiece),
        subStats: formPiece.subStats || getEquipmentItemSubStats(selectedPiece)
    };
    const rows = getEquipmentRefinementStatRows(pieceWithStoredStats).slice(0, EQUIPMENT_REFINEMENT_FIELDS.length);
    if (!rows.length) return null;

    const root = document.createElement("div");
    root.className = "equipment-refinement-controls";

    const header = document.createElement("div");
    header.className = "equipment-refinement-header";

    const title = document.createElement("strong");
    title.textContent = "Refinement";

    const hint = document.createElement("span");
    hint.textContent = "Artifice +0-+3";

    header.append(title, hint);

    const fields = document.createElement("div");
    fields.className = "equipment-refinement-fields";
    fields.replaceChildren(...rows.map(row => createEquipmentRefinementSelect(slot, row, formPiece)));

    root.append(header, fields);
    return root;
}

function createEquipmentPickerRefinementState(formPiece = {}) {
    return {
        main: getEquipmentRefinementLevel(formPiece.refinementMain),
        second: getEquipmentRefinementLevel(formPiece.refinementSecond),
        special: getEquipmentRefinementLevel(formPiece.refinementSpecial)
    };
}

function getEmptyEquipmentRefinementState() {
    return { main: 0, second: 0, special: 0 };
}

function getEquipmentGearPickerSelectedPiece() {
    const state = equipmentEditorState.gearPicker;
    return state?.selectedPieceId ? getGearPieceById(state.selectedPieceId) : null;
}

function getEquipmentGearPickerSelectedPieceWithStats() {
    const state = equipmentEditorState.gearPicker;
    const piece = getEquipmentGearPickerSelectedPiece();
    if (!state || !piece) return null;

    const formPiece = readEquipmentEditorForm().gear?.[state.slot] || {};
    const isCurrentPiece = String(formPiece.pieceId || "") === String(piece.id || "");
    return {
        ...piece,
        mainStat: isCurrentPiece && formPiece.mainStat ? formPiece.mainStat : getEquipmentItemMainStat(piece),
        subStats: isCurrentPiece && formPiece.subStats ? formPiece.subStats : getEquipmentItemSubStats(piece)
    };
}

function getEquipmentGearPickerProjectedSet() {
    const state = equipmentEditorState.gearPicker;
    const piece = getEquipmentGearPickerSelectedPieceWithStats();
    if (!state || !piece) return readEquipmentEditorForm();

    return getProjectedEquipmentSetForPiece(state.slot, piece, readEquipmentEditorForm(), state.refinement);
}

function ensureEquipmentGearPickerModal() {
    let modal = document.getElementById("equipmentGearPickerModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "equipmentGearPickerModal";
    modal.className = "equipment-gear-picker-modal";
    modal.hidden = true;
    modal.innerHTML = `
        <div class="equipment-gear-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="equipmentGearPickerTitle">
            <header class="equipment-gear-picker-header">
                <div>
                    <span class="equipment-gear-picker-kicker">Gear Selection</span>
                    <h3 id="equipmentGearPickerTitle">Select Gear</h3>
                </div>
                <button type="button" class="equipment-gear-picker-close" data-gear-picker-close aria-label="Close gear selection">x</button>
            </header>
            <div class="equipment-gear-picker-body">
                <section class="equipment-gear-picker-main" data-gear-picker-main></section>
                <aside class="equipment-gear-picker-side" data-gear-picker-side></aside>
            </div>
            <footer class="equipment-gear-picker-footer">
                <button type="button" class="equipment-editor-danger" data-gear-picker-clear>Clear Slot</button>
                <span data-gear-picker-status></span>
                <button type="button" class="equipment-editor-secondary" data-gear-picker-cancel>Cancel</button>
                <button type="button" class="equipment-editor-primary" data-gear-picker-apply>Apply</button>
            </footer>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
        if (event.target === modal) closeEquipmentGearPicker();
    });
    modal.querySelector("[data-gear-picker-close]")?.addEventListener("click", closeEquipmentGearPicker);
    modal.querySelector("[data-gear-picker-cancel]")?.addEventListener("click", closeEquipmentGearPicker);
    modal.querySelector("[data-gear-picker-clear]")?.addEventListener("click", clearEquipmentGearPickerSelection);
    modal.querySelector("[data-gear-picker-apply]")?.addEventListener("click", applyEquipmentGearPickerSelection);

    return modal;
}

function isEquipmentGearPickerOpen() {
    const modal = document.getElementById("equipmentGearPickerModal");
    return Boolean(modal && !modal.hidden);
}

function closeEquipmentGearPicker(options = {}) {
    const modal = document.getElementById("equipmentGearPickerModal");
    if (modal) {
        modal.hidden = true;
        modal.classList.remove("is-open");
    }
    equipmentEditorState.gearPicker = null;
    hideEquipmentTooltip();
    if (options.restoreSummary !== false) renderEquipmentGearSummary(readEquipmentEditorForm());
}

function createEquipmentGearPickerStatLine(label, value) {
    const item = document.createElement("div");
    item.className = "equipment-gear-picker-stat-line";
    const name = document.createElement("span");
    name.textContent = label;
    const content = document.createElement("strong");
    content.textContent = value || "-";
    item.append(name, content);
    return item;
}

function createEquipmentGearPickerRefinementRow(row, level) {
    const state = equipmentEditorState.gearPicker;
    const item = document.createElement("div");
    item.className = "equipment-gear-picker-refinement-row";

    const value = document.createElement("span");
    value.textContent = refineEquipmentStatEntry(row.entry, level);

    const levels = document.createElement("div");
    levels.className = "equipment-gear-picker-refinement-levels";
    for (let refinementLevel = 0; refinementLevel <= EQUIPMENT_REFINEMENT_MAX; refinementLevel += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "equipment-gear-picker-refinement-level";
        button.textContent = `+${refinementLevel}`;
        button.setAttribute("aria-pressed", String(refinementLevel === level));
        if (refinementLevel === level) button.classList.add("is-active");
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            if (!state) return;

            state.refinement[row.key] = refinementLevel;
            renderEquipmentGearPicker();
        });
        levels.appendChild(button);
    }

    item.append(value, levels);
    return item;
}

function createEquipmentGearPickerAnalysisPill(text, tone = "neutral") {
    const pill = document.createElement("span");
    pill.className = `equipment-gear-picker-analysis-pill is-${tone}`;
    pill.textContent = text;
    return pill;
}

function createEquipmentGearPickerAnalysisNote(text, tone = "neutral") {
    const note = document.createElement("span");
    note.className = `equipment-gear-picker-analysis-note is-${tone}`;
    note.textContent = text;
    return note;
}

function createEquipmentGearPickerAnalysisSection(titleText, children) {
    const section = document.createElement("div");
    section.className = "equipment-gear-picker-analysis-section";

    const title = document.createElement("strong");
    title.textContent = titleText;
    section.appendChild(title);

    const content = document.createElement("div");
    content.className = "equipment-gear-picker-analysis-content";
    content.replaceChildren(...children);
    section.appendChild(content);

    return section;
}

function getEquipmentSetSummaryMap(set) {
    const map = new Map();
    collectGearSetSummaries(set).forEach(summary => {
        map.set(summary.name, summary);
    });
    return map;
}

function collectEquipmentPickerSetChanges(currentSet, projectedSet, selectedSetName = "") {
    const currentMap = getEquipmentSetSummaryMap(currentSet);
    const projectedMap = getEquipmentSetSummaryMap(projectedSet);
    const names = new Set([
        ...currentMap.keys(),
        ...projectedMap.keys(),
        selectedSetName
    ].filter(Boolean));

    return Array.from(names).map(name => {
        const before = currentMap.get(name) || { count: 0, effect: "" };
        const after = projectedMap.get(name) || { count: 0, effect: "" };
        const beforeActive = before.count >= 3;
        const afterActive = after.count >= 3;
        let tone = "neutral";
        let text = "";

        if (!beforeActive && afterActive) {
            tone = "positive";
            text = `${name}: bonus activates (${after.count}/3)`;
        } else if (beforeActive && !afterActive) {
            tone = "negative";
            text = `${name}: bonus lost (${after.count}/3)`;
        } else if (after.count > before.count) {
            tone = after.count === 2 ? "warning" : "positive";
            text = `${name}: ${before.count}/3 -> ${after.count}/3`;
        } else if (after.count < before.count) {
            tone = "warning";
            text = `${name}: ${before.count}/3 -> ${after.count}/3`;
        } else if (afterActive) {
            tone = "positive";
            text = `${name}: stays active (${after.count}/3)`;
        } else if (name === selectedSetName) {
            tone = after.count === 2 ? "warning" : "neutral";
            text = `${name}: after select ${after.count}/3`;
        }

        if (!text) return null;
        return { name, text, tone, beforeCount: before.count, afterCount: after.count, beforeActive, afterActive };
    }).filter(Boolean)
        .sort((a, b) => {
            if (a.name === selectedSetName) return -1;
            if (b.name === selectedSetName) return 1;
            if (a.tone !== b.tone) return a.tone === "positive" ? -1 : b.tone === "positive" ? 1 : 0;
            return a.name.localeCompare(b.name);
        });
}

function collectEquipmentPickerOperatorFit(piece) {
    const operator = getEquipmentEditorOperator();
    const pieceKeys = new Set(getEquipmentPieceStatLabels(piece).map(getEquipmentCoreAttributeKey).filter(Boolean));
    const mainAttributeKey = getEquipmentCoreAttributeKey(getOperatorEquipmentMainAttribute(operator));
    const focus = [
        {
            role: "Main",
            label: getOperatorEquipmentMainAttribute(operator),
            key: mainAttributeKey,
            tone: "main"
        },
        {
            role: "Second",
            label: getOperatorEquipmentSecondaryAttribute(operator),
            key: getEquipmentCoreAttributeKey(getOperatorEquipmentSecondaryAttribute(operator)),
            tone: "second"
        }
    ].filter(item => item.label && item.key && !(item.role === "Second" && item.key === mainAttributeKey));

    return focus.map(item => {
        const isMatch = pieceKeys.has(item.key);
        return {
            ...item,
            isMatch,
            text: `${item.role}: ${item.label}`,
            tone: isMatch ? item.tone : "neutral"
        };
    });
}

function collectEquipmentPickerRefinementImpact(piece, refinement) {
    return getEquipmentRefinementStatRows(piece)
        .slice(0, EQUIPMENT_REFINEMENT_FIELDS.length)
        .map(row => {
            const level = getEquipmentRefinementLevel(refinement?.[row.key]);
            const base = parseEquipmentStatEntry(refineEquipmentStatEntry(row.entry, 0));
            const refined = parseEquipmentStatEntry(refineEquipmentStatEntry(row.entry, level));
            if (!base || !refined || !level) return null;

            const diff = refined.value - base.value;
            if (Math.abs(diff) < 0.0001) return null;

            return {
                text: `${formatEquipmentStatDiffValue(diff, refined)} at +${level}`,
                tone: diff > 0 ? "positive" : "negative"
            };
        })
        .filter(Boolean);
}

function getEquipmentPickerRecommendation(piece, statDiffs, setChanges, fitItems) {
    const activatedSet = setChanges.find(change => !change.beforeActive && change.afterActive);
    const lostSet = setChanges.find(change => change.beforeActive && !change.afterActive);
    const matchedFocus = fitItems.filter(item => item.isMatch);
    const positiveStats = statDiffs.filter(diff => diff.direction === "positive");
    const negativeStats = statDiffs.filter(diff => diff.direction === "negative");

    if (lostSet) {
        return {
            tone: "negative",
            label: "Careful",
            text: `${lostSet.name} would lose its active set bonus.`
        };
    }

    if (activatedSet && matchedFocus.length) {
        return {
            tone: "positive",
            label: "Strong pick",
            text: `${activatedSet.name} activates and the item supports ${matchedFocus.map(item => item.role).join(" + ")}.`
        };
    }

    if (activatedSet) {
        return {
            tone: "positive",
            label: "Set upgrade",
            text: `${activatedSet.name} set bonus becomes active.`
        };
    }

    if (matchedFocus.length >= 2) {
        return {
            tone: "positive",
            label: "Focus match",
            text: "This item matches Main and Second focus."
        };
    }

    if (matchedFocus.length) {
        return {
            tone: "positive",
            label: "Good fit",
            text: `This item supports ${matchedFocus[0].role}: ${matchedFocus[0].label}.`
        };
    }

    if (positiveStats.length && !negativeStats.length) {
        return {
            tone: "positive",
            label: "Stat gain",
            text: "This is a pure stat gain, but no focus stat is matched."
        };
    }

    if (negativeStats.length > positiveStats.length) {
        return {
            tone: "warning",
            label: "Tradeoff",
            text: "This swap has more losses than gains."
        };
    }

    return {
        tone: piece?.setName ? "neutral" : "warning",
        label: "Neutral",
        text: piece?.setName ? "No major upgrade signal yet." : "No set stored for this item."
    };
}

function createEquipmentGearPickerDecisionPanel(piece) {
    const state = equipmentEditorState.gearPicker;
    const currentSet = readEquipmentEditorForm();
    const projectedSet = getEquipmentGearPickerProjectedSet();
    const statDiffs = collectEquipmentStatDiffs(currentSet, projectedSet);
    const setChanges = collectEquipmentPickerSetChanges(currentSet, projectedSet, piece?.setName || "");
    const fitItems = collectEquipmentPickerOperatorFit(piece);
    const refinementImpact = collectEquipmentPickerRefinementImpact(piece, state?.refinement || {});
    const recommendation = getEquipmentPickerRecommendation(piece, statDiffs, setChanges, fitItems);

    const panel = document.createElement("div");
    panel.className = `equipment-gear-picker-analysis is-${recommendation.tone}`;

    const header = document.createElement("div");
    header.className = "equipment-gear-picker-analysis-header";
    const title = document.createElement("strong");
    title.textContent = "Selection Check";
    const badge = document.createElement("span");
    badge.className = `equipment-gear-picker-analysis-badge is-${recommendation.tone}`;
    badge.textContent = recommendation.label;
    header.append(title, badge);

    panel.append(
        header,
        createEquipmentGearPickerAnalysisNote(recommendation.text, recommendation.tone),
        createEquipmentGearPickerAnalysisSection(
            "Operator fit",
            fitItems.length
                ? fitItems.map(item => createEquipmentGearPickerAnalysisPill(item.text, item.tone))
                : [createEquipmentGearPickerAnalysisPill("No operator focus stored", "neutral")]
        ),
        createEquipmentGearPickerAnalysisSection(
            "Set impact",
            setChanges.length
                ? setChanges.slice(0, 3).map(change => createEquipmentGearPickerAnalysisPill(change.text, change.tone))
                : [createEquipmentGearPickerAnalysisPill("No set change", "neutral")]
        ),
        createEquipmentGearPickerAnalysisSection(
            "Value change",
            statDiffs.length
                ? statDiffs.slice(0, 4).map(diff => createEquipmentGearPickerAnalysisPill(diff.text, diff.direction))
                : [createEquipmentGearPickerAnalysisPill("No stat change", "neutral")]
        ),
        createEquipmentGearPickerAnalysisSection(
            "Artifice impact",
            refinementImpact.length
                ? refinementImpact.map(impact => createEquipmentGearPickerAnalysisPill(impact.text, impact.tone))
                : [createEquipmentGearPickerAnalysisPill(canRefineEquipmentGearPiece(piece) ? "Set +1 to +3 to preview gains" : "5 Star gear can use Artifice", "neutral")]
        )
    );

    return panel;
}

function createEquipmentGearPickerSide(piece) {
    const state = equipmentEditorState.gearPicker;
    const side = document.createElement("div");
    side.className = "equipment-gear-picker-detail";

    const title = document.createElement("h4");
    title.textContent = "Selection";
    side.appendChild(title);

    if (!state || !piece) {
        const empty = document.createElement("p");
        empty.className = "equipment-gear-picker-empty";
        empty.textContent = "Choose an item to see stats and refinement.";
        side.appendChild(empty);
        return side;
    }

    const header = document.createElement("div");
    header.className = "equipment-gear-picker-selected";
    applyRarityClass(header, piece);
    header.append(createEquipmentGearImage(piece), createEquipmentItemText(piece, getEquipmentSlotLabel(state.slot)));

    const stats = document.createElement("div");
    stats.className = "equipment-gear-picker-stat-grid";
    stats.append(
        createEquipmentGearPickerStatLine("Slot", getEquipmentSlotLabel(state.slot)),
        createEquipmentGearPickerStatLine("Set", piece.setName || "No set"),
        createEquipmentGearPickerStatLine("Rarity", getEquipmentRarityValue(piece) ? `${getEquipmentRarityValue(piece)} Star` : ""),
        createEquipmentGearPickerStatLine("Item Stat", getEquipmentItemMainStat(piece)),
        createEquipmentGearPickerStatLine("Bonus Stats", getEquipmentItemSubStats(piece))
    );

    side.append(header, stats);
    side.appendChild(createEquipmentGearPickerDecisionPanel(piece));

    const refinement = document.createElement("div");
    refinement.className = "equipment-gear-picker-refinement";
    const refinementTitle = document.createElement("div");
    refinementTitle.className = "equipment-gear-picker-refinement-title";
    const refinementHeading = document.createElement("strong");
    refinementHeading.textContent = "Refinement";
    const refinementHint = document.createElement("span");
    refinementHint.textContent = "Artifice +0 to +3";
    refinementTitle.append(refinementHeading, refinementHint);
    refinement.appendChild(refinementTitle);

    if (!canRefineEquipmentGearPiece(piece)) {
        const message = document.createElement("p");
        message.className = "equipment-gear-picker-empty";
        message.textContent = "Refinement is available for 5 Star gear.";
        refinement.appendChild(message);
    } else {
        const rows = getEquipmentRefinementStatRows(piece).slice(0, EQUIPMENT_REFINEMENT_FIELDS.length);
        if (rows.length) {
            rows.forEach(row => {
                refinement.appendChild(createEquipmentGearPickerRefinementRow(row, getEquipmentRefinementLevel(state.refinement[row.key])));
            });
        } else {
            const message = document.createElement("p");
            message.className = "equipment-gear-picker-empty";
            message.textContent = "No refinable stat values stored for this item.";
            refinement.appendChild(message);
        }
    }
    side.appendChild(refinement);

    return side;
}

function createEquipmentGearPickerOption(slot, piece, currentSet, currentSetCounts, targetSetName, selectedPieceId) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `equipment-weapon-option equipment-tile-option equipment-gear-picker-option ${getItemRarityClass(piece)}`;
    applyRarityClass(item, piece);

    const pieceSetName = String(piece.setName || "");
    const projectedSet = getProjectedEquipmentSetForPiece(slot, piece, currentSet);
    const projectedCount = collectGearSetSummaries(projectedSet).find(summary => summary.name === pieceSetName)?.count || 0;
    const currentCount = currentSetCounts[pieceSetName] || 0;
    const isSelected = String(piece.id) === String(selectedPieceId || "");

    if (pieceSetName && pieceSetName === targetSetName) item.classList.add("is-target-set");
    if (pieceSetName && projectedCount >= 3 && currentCount < 3) item.classList.add("is-set-completer");
    if (isSelected) item.classList.add("is-picker-selected");
    item.role = "option";
    item.setAttribute("aria-selected", String(isSelected));
    item.dataset.searchText = getEquipmentGearSearchText(piece);
    item.dataset.setName = piece.setName || "";
    item.dataset.rarity = String(getEquipmentRarityValue(piece) || "");
    item.dataset.stats = getEquipmentPieceStatLabels(piece).map(normalizeEquipmentFilterText).join("|");
    item.append(
        createEquipmentGearImage(piece),
        createEquipmentItemText(piece, getEquipmentSlotLabel(slot)),
        createEquipmentTileComparison(slot, piece, currentSet, projectedSet, projectedCount, currentCount)
    );
    item.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const state = equipmentEditorState.gearPicker;
        if (!state) return;

        const wasSelected = String(state.selectedPieceId || "") === String(piece.id || "");
        const formPiece = readEquipmentEditorForm().gear?.[slot] || {};
        const isCurrentPiece = String(formPiece.pieceId || "") === String(piece.id || "");
        state.selectedPieceId = piece.id;
        if (!wasSelected) {
            state.refinement = isCurrentPiece
                ? createEquipmentPickerRefinementState(formPiece)
                : getEmptyEquipmentRefinementState();
        }
        renderEquipmentGearPicker();
    });
    return item;
}

function renderEquipmentGearPicker() {
    const modal = ensureEquipmentGearPickerModal();
    const state = equipmentEditorState.gearPicker;
    if (!state) return;

    const pieces = getGearPiecesForSlot(state.slot);
    const selectedPiece = getEquipmentGearPickerSelectedPieceWithStats();
    const projectedSet = selectedPiece ? getEquipmentGearPickerProjectedSet() : readEquipmentEditorForm();
    const main = modal.querySelector("[data-gear-picker-main]");
    const side = modal.querySelector("[data-gear-picker-side]");
    const title = modal.querySelector("#equipmentGearPickerTitle");
    const status = modal.querySelector("[data-gear-picker-status]");
    const applyButton = modal.querySelector("[data-gear-picker-apply]");
    const clearButton = modal.querySelector("[data-gear-picker-clear]");
    if (!main || !side) return;

    if (title) title.textContent = `Select ${getEquipmentSlotLabel(state.slot)}`;
    if (status) status.textContent = selectedPiece ? `Ready: ${selectedPiece.name}` : "Pick an item first.";
    if (applyButton) applyButton.disabled = !selectedPiece;
    if (clearButton) clearButton.disabled = !selectedPiece && !hasEquipmentSlotValue(state.slot);

    const content = document.createElement("div");
    content.className = "equipment-gear-picker-list";
    content.role = "listbox";

    if (!pieces.length) {
        const empty = document.createElement("div");
        empty.className = "equipment-weapon-empty";
        empty.textContent = `No ${getEquipmentSlotLabel(state.slot)} catalog entries yet.`;
        content.appendChild(empty);
    } else {
        const currentSet = readEquipmentEditorForm();
        const currentSetCounts = countGearSets(currentSet);
        const availableSetNames = new Set(pieces.map(piece => piece.setName).filter(Boolean));
        let targetSetName = state.filters?.setName || getEquipmentCurrentSetName(state.slot, currentSet);
        if (targetSetName && !availableSetNames.has(targetSetName)) {
            targetSetName = collectGearSetSummaries(currentSet)
                .find(summary => availableSetNames.has(summary.name))?.name || "";
        }

        const optionItems = pieces.map(piece => ({
            piece,
            element: createEquipmentGearPickerOption(
                state.slot,
                piece,
                currentSet,
                currentSetCounts,
                targetSetName,
                state.selectedPieceId
            )
        }));
        const filters = createEquipmentGearFilterBar(
            state.slot,
            pieces,
            optionItems,
            `No ${getEquipmentSlotLabel(state.slot)} entries match the filters.`,
            targetSetName,
            state.filters || {},
            nextFilters => {
                if (equipmentEditorState.gearPicker) equipmentEditorState.gearPicker.filters = nextFilters;
            }
        );
        const setPreview = createEquipmentSetPreview(state.slot, selectedPiece || pieces[0]);
        if (selectedPiece) updateEquipmentSetPreview(setPreview, state.slot, selectedPiece);
        content.append(filters.filterBar, setPreview, ...optionItems.map(option => option.element), filters.empty);
    }

    main.replaceChildren(content);
    side.replaceChildren(createEquipmentGearPickerSide(selectedPiece));

    renderEquipmentGearSummary(projectedSet, selectedPiece ? {
        baseSet: readEquipmentEditorForm(),
        item: selectedPiece
    } : null);

    requestAnimationFrame(() => {
        const selected = modal.querySelector(".equipment-gear-picker-list .is-picker-selected");
        if (selected) selected.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
}

function openEquipmentGearPicker(slot, filters = {}) {
    if (!EQUIPMENT_GEAR_SLOTS.includes(slot)) return false;

    closeEquipmentWeaponPicker();
    closeEquipmentWeaponMenus();
    hideEquipmentTooltip();

    const currentSet = readEquipmentEditorForm();
    const currentPiece = currentSet.gear?.[slot] || {};
    const selectedPiece = currentPiece.pieceId ? getGearPieceById(currentPiece.pieceId) : null;
    equipmentEditorState.gearPicker = {
        slot,
        selectedPieceId: selectedPiece?.id || "",
        refinement: selectedPiece ? createEquipmentPickerRefinementState(currentPiece) : getEmptyEquipmentRefinementState(),
        filters: { ...filters }
    };

    const modal = ensureEquipmentGearPickerModal();
    modal.hidden = false;
    modal.classList.add("is-open");
    renderEquipmentGearPicker();

    requestAnimationFrame(() => {
        modal.querySelector(".equipment-filter-search")?.focus();
    });
    return true;
}

function applyEquipmentGearPickerSelection() {
    const state = equipmentEditorState.gearPicker;
    const piece = getEquipmentGearPickerSelectedPieceWithStats();
    if (!state || !piece) return;

    applyEquipmentGearPieceToInputs(state.slot, piece);
    EQUIPMENT_REFINEMENT_FIELDS.forEach(config => {
        const level = getEquipmentRefinementLevel(state.refinement?.[config.key]);
        setEquipmentInputValue(`gear.${state.slot}.${config.field}`, level ? String(level) : "");
    });
    renderEquipmentGearSelects(readEquipmentEditorForm());
    updateEquipmentSlotClearButtons();
    refreshEquipmentEditorDirtyState(`Unsaved changes - ${getEquipmentSlotLabel(state.slot)} updated`);
    closeEquipmentGearPicker({ restoreSummary: false });
}

function clearEquipmentGearPickerSelection() {
    const state = equipmentEditorState.gearPicker;
    if (!state) return;

    clearEquipmentGearSlot(state.slot);
    renderEquipmentGearSelect(state.slot, "");
    renderEquipmentGearSummary(readEquipmentEditorForm());
    updateEquipmentSlotClearButtons();
    refreshEquipmentEditorDirtyState("Unsaved changes - slot cleared");
    closeEquipmentGearPicker({ restoreSummary: false });
}

function createEquipmentGearDropdown(slot, pieces, selectedPiece) {
    const root = document.createElement("div");
    root.className = "equipment-weapon-dropdown equipment-gear-dropdown";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "equipment-weapon-trigger equipment-gear-trigger";
    if (selectedPiece) applyRarityClass(button, selectedPiece);
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.disabled = pieces.length === 0;

    if (selectedPiece) {
        button.append(createEquipmentGearImage(selectedPiece), createEquipmentItemText(selectedPiece, getEquipmentSlotLabel(slot)));
        attachEquipmentTooltipEvents(button, selectedPiece, getEquipmentSlotLabel(slot));
    } else {
        const emptyImage = document.createElement("span");
        emptyImage.className = "equipment-weapon-image is-empty";
        emptyImage.textContent = "?";
        button.append(emptyImage, createEquipmentItemText(null, `Select ${getEquipmentSlotLabel(slot)}`));
    }

    const chevron = document.createElement("span");
    chevron.className = "equipment-weapon-chevron";
    chevron.textContent = "⌄";
    button.appendChild(chevron);

    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openEquipmentGearPicker(slot);
    });

    root.append(button);
    return root;
}

function renderEquipmentGearSelect(slot, selectedPieceId = "") {
    const container = document.querySelector(`[data-gear-slot="${slot}"]`);
    if (!container) return;

    const pieces = getGearPiecesForSlot(slot);
    const selectedPiece = pieces.find(piece => String(piece.id) === String(selectedPieceId)) || getGearPieceById(selectedPieceId);
    if (selectedPiece) applyEquipmentGearPieceToInputs(slot, selectedPiece);
    container.replaceChildren(createEquipmentGearDropdown(slot, pieces, selectedPiece));
    updateEquipmentSlotClearButtons();
}

function renderEquipmentGearSelects(set) {
    ["armor", "gloves", "kit1", "kit2"].forEach(slot => {
        renderEquipmentGearSelect(slot, set.gear[slot].pieceId);
    });
    renderEquipmentGearSummary(readEquipmentEditorForm());
}

function splitEquipmentStatEntries(value) {
    return String(value || "")
        .split(/[,;\n]+/)
        .map(entry => entry.trim())
        .filter(Boolean);
}

function parseEquipmentStatEntry(entry) {
    const normalized = String(entry || "").replace(/\s+/g, " ").trim();
    const match = normalized.match(/^(.+?)\s+([+-]?\s*\d+(?:[.,]\d+)?)(%)?$/);
    if (!match) return null;

    const label = match[1].replace(/:+$/, "").trim();
    const rawNumber = match[2].replace(/\s+/g, "").replace(",", ".");
    const value = Number(rawNumber);
    if (!label || !Number.isFinite(value)) return null;

    const decimalPart = rawNumber.split(".")[1] || "";
    return {
        label,
        key: `${label.toLowerCase()}|${match[3] ? "percent" : "flat"}`,
        value,
        isPercent: Boolean(match[3]),
        decimals: decimalPart.length
    };
}

function formatEquipmentStatTotal(total) {
    const sign = total.value >= 0 ? "+" : "";
    const decimals = Math.min(total.decimals, 2);
    const formattedValue = decimals > 0
        ? total.value.toFixed(decimals)
        : String(Math.round(total.value));

    return `${total.label} ${sign}${formattedValue}${total.isPercent ? "%" : ""}`;
}

function collectParsedEquipmentStatTotalsFromEntries(entries) {
    const totals = new Map();

    entries.forEach(entry => {
        const parsed = parseEquipmentStatEntry(entry);
        if (!parsed || parsed.isPercent) return;

        const existing = totals.get(parsed.key);
        if (existing) {
            existing.value += parsed.value;
            existing.decimals = Math.max(existing.decimals, parsed.decimals);
        } else {
            totals.set(parsed.key, { ...parsed });
        }
    });

    return totals;
}

function getEquipmentAttributeTotal(totals, attributeKey) {
    let total = 0;
    if (!totals?.forEach) return total;

    totals.forEach(stat => {
        if (getEquipmentCoreAttributeKey(stat.label) === attributeKey) {
            total += Number(stat.value) || 0;
        }
    });

    return total;
}

function collectOperatorAttributeBaseTotals(set) {
    const totals = collectParsedEquipmentStatTotalsFromEntries([
        ...splitEquipmentStatEntries(set?.stats?.mainStat),
        ...splitEquipmentStatEntries(set?.stats?.subStats)
    ]);
    const operator = getEquipmentEditorOperator();

    EQUIPMENT_CORE_ATTRIBUTES.forEach(attribute => {
        const value = calculateEquipmentOperatorStatAtLevel(
            set,
            attribute.baseField,
            attribute.levelOneField
        );
        if (!Number.isFinite(value)) return;

        const key = `${attribute.label.toLowerCase()}|flat`;
        const existing = totals.get(key);
        if (existing) {
            existing.value += value;
        } else {
            totals.set(key, {
                label: attribute.label,
                key,
                value,
                isPercent: false,
                decimals: 0
            });
        }
    });

    return totals;
}

function collectEquipmentAttributeSummaries(set, comparisonSet = null) {
    const showDelta = Boolean(comparisonSet);
    const baseTotals = collectOperatorAttributeBaseTotals(set);
    const gearTotals = collectParsedGearStatTotals(set);
    const comparisonBaseTotals = comparisonSet ? collectOperatorAttributeBaseTotals(comparisonSet) : baseTotals;
    const comparisonGearTotals = comparisonSet ? collectParsedGearStatTotals(comparisonSet) : null;
    const operator = getEquipmentEditorOperator();
    const mainAttributeKey = getEquipmentCoreAttributeKey(getOperatorEquipmentMainAttribute(operator));
    const secondaryAttributeKey = getEquipmentCoreAttributeKey(getOperatorEquipmentSecondaryAttribute(operator));

    return EQUIPMENT_CORE_ATTRIBUTES.map(attribute => {
        const baseValue = getEquipmentAttributeTotal(baseTotals, attribute.key);
        const gearValue = getEquipmentAttributeTotal(gearTotals, attribute.key);
        const totalValue = baseValue + gearValue;
        const comparisonTotal = comparisonSet
            ? getEquipmentAttributeTotal(comparisonBaseTotals, attribute.key) + getEquipmentAttributeTotal(comparisonGearTotals, attribute.key)
            : baseValue;
        const delta = showDelta ? totalValue - comparisonTotal : 0;

        return {
            ...attribute,
            totalValue,
            delta,
            showDelta,
            focusRole: attribute.key === mainAttributeKey
                ? "main"
                : attribute.key === secondaryAttributeKey ? "secondary" : ""
        };
    });
}

function formatEquipmentAttributeValue(value) {
    if (!Number.isFinite(value)) return "0";
    return Math.abs(value % 1) > 0.0001 ? value.toFixed(1) : String(Math.round(value));
}

function normalizeEquipmentStatLabel(label) {
    return String(label || "")
        .trim()
        .toLowerCase()
        .replace(/%/g, " percent ")
        .replace(/[^a-z0-9]+/g, "");
}

function matchesEquipmentStatAlias(label, aliases) {
    const normalized = normalizeEquipmentStatLabel(label);
    return aliases.some(alias => normalizeEquipmentStatLabel(alias) === normalized);
}

function collectEquipmentStatTotalByAliases(totals, aliases, isPercent) {
    const summary = { value: 0, decimals: 0, hasValue: false };
    if (!totals?.forEach) return summary;

    totals.forEach(stat => {
        if (!matchesEquipmentStatAlias(stat.label, aliases) || stat.isPercent !== isPercent) return;
        summary.value += Number(stat.value) || 0;
        summary.decimals = Math.max(summary.decimals, stat.decimals || 0);
        summary.hasValue = true;
    });

    return summary;
}

function calculateEquipmentAttributeAtkBonus(set) {
    const operator = getEquipmentEditorOperator();
    const mainAttributeKey = getEquipmentCoreAttributeKey(getOperatorEquipmentMainAttribute(operator));
    const secondaryAttributeKey = getEquipmentCoreAttributeKey(getOperatorEquipmentSecondaryAttribute(operator));
    const attributes = collectEquipmentAttributeSummaries(set);
    const getValue = key => attributes.find(attribute => attribute.key === key)?.totalValue || 0;
    const mainValue = mainAttributeKey ? getValue(mainAttributeKey) : 0;
    const secondaryValue = secondaryAttributeKey && secondaryAttributeKey !== mainAttributeKey
        ? getValue(secondaryAttributeKey)
        : 0;

    return (mainValue * 0.5) + (secondaryValue * 0.2);
}

function calculateEquipmentStrengthHpBonus(set) {
    const strength = collectEquipmentAttributeSummaries(set)
        .find(attribute => attribute.key === "strength")?.totalValue || 0;

    return strength * 5;
}

function getEquipmentNumericDataValue(entity, ...keys) {
    for (const key of keys) {
        const value = entity?.[key] ?? entity?.rawData?.[key];
        if (value === null || value === undefined || value === "") continue;

        const numeric = Number(value);
        if (Number.isFinite(numeric)) return numeric;
    }

    return null;
}

function calculateEquipmentOperatorStatAtLevel(set, maxField, levelOneField, options = {}) {
    const operator = getEquipmentEditorOperator();
    const maxValue = getEquipmentNumericDataValue(operator, maxField);
    if (!Number.isFinite(maxValue)) return null;

    const maxLevel = getEquipmentOperatorMaxLevel(operator);
    const levelOneValue = getEquipmentNumericDataValue(operator, levelOneField);
    const requestedLevel = Number(set?.operator?.level);
    const level = Math.min(maxLevel, Math.max(1, Number.isFinite(requestedLevel) ? requestedLevel : maxLevel));
    if (!Number.isFinite(levelOneValue) || maxLevel <= 1) return maxValue;

    const value = levelOneValue + ((maxValue - levelOneValue) * ((level - 1) / (maxLevel - 1)));
    return options.round ? Math.round(value) : Math.round(value * 10) / 10;
}

function calculateEquipmentWeaponAtkAtLevel(set) {
    const weapon = getEquipmentWeaponById(set?.weapon?.weaponId);
    if (!weapon) return 0;

    const maxAtk = getEquipmentNumericDataValue(weapon, "baseAtk", "base_atk");
    if (!Number.isFinite(maxAtk)) return 0;

    const maxLevel = getEquipmentNumericDataValue(weapon, "baseStatsLevel", "base_stats_level") || 90;
    const levelOneAtk = getEquipmentNumericDataValue(weapon, "baseAtkLevel1", "base_atk_level_1") ||
        Math.round(maxAtk / 9.8);
    const requestedLevel = Number(set?.weapon?.level);
    const level = Math.min(maxLevel, Math.max(1, Number.isFinite(requestedLevel) ? requestedLevel : maxLevel));
    if (maxLevel <= 1) return maxAtk;

    return Math.round(levelOneAtk + ((maxAtk - levelOneAtk) * ((level - 1) / (maxLevel - 1))));
}

function collectEquipmentDerivedTotals(set) {
    const operator = getEquipmentEditorOperator();
    const gearTotals = collectParsedGearStatTotals(set);
    const hpConfig = EQUIPMENT_DERIVED_STATS.find(stat => stat.key === "hp");
    const atkConfig = EQUIPMENT_DERIVED_STATS.find(stat => stat.key === "atk");
    const operatorBaseHp = calculateEquipmentOperatorStatAtLevel(set, "baseHp", "baseHpLevel1", { round: true });
    const operatorBaseAtk = calculateEquipmentOperatorStatAtLevel(set, "baseAtk", "baseAtkLevel1", { round: true });
    const hpFlat = collectEquipmentStatTotalByAliases(gearTotals, hpConfig.aliases, false);
    const hpPercent = collectEquipmentStatTotalByAliases(gearTotals, hpConfig.aliases, true);
    const atkFlat = collectEquipmentStatTotalByAliases(gearTotals, atkConfig.aliases, false);
    const atkPercent = collectEquipmentStatTotalByAliases(gearTotals, atkConfig.percentAliases, true);
    const strengthHpBonus = calculateEquipmentStrengthHpBonus(set);
    const attributeAtkBonus = calculateEquipmentAttributeAtkBonus(set);
    const weaponAtk = calculateEquipmentWeaponAtkAtLevel(set);
    const hpBeforePercent = Number.isFinite(operatorBaseHp)
        ? operatorBaseHp + strengthHpBonus + hpFlat.value
        : null;
    const hp = Number.isFinite(hpBeforePercent)
        ? hpBeforePercent * (1 + (hpPercent.value / 100))
        : null;
    const attackBase = Number.isFinite(operatorBaseAtk)
        ? operatorBaseAtk + weaponAtk
        : null;
    const atk = Number.isFinite(attackBase)
        ? (attackBase * (1 + (attributeAtkBonus / 100)) * (1 + (atkPercent.value / 100))) + atkFlat.value
        : null;

    return {
        hp,
        atk,
        operatorBaseHp,
        operatorBaseAtk,
        strengthHpBonus,
        attributeAtkBonus,
        weaponAtk,
        hpFlat: hpFlat.value,
        hpPercent: hpPercent.value,
        atkFlat: atkFlat.value,
        atkPercent: atkPercent.value
    };
}

function formatEquipmentDerivedStatNumber(value, isPercent, showSign = false, decimals = 0) {
    if (!Number.isFinite(value)) return isPercent ? "0%" : "0";
    const sign = showSign && value >= 0 ? "+" : "";
    const decimalPlaces = Math.max(
        Math.min(decimals || 0, 2),
        Math.abs(value % 1) > 0.0001 ? 1 : 0
    );
    const formatted = decimalPlaces > 0 ? value.toFixed(decimalPlaces) : String(Math.round(value));

    return `${sign}${formatted}${isPercent ? "%" : ""}`;
}

function formatEquipmentDerivedCombinedValue(flatValue, percentValue, options = {}) {
    const {
        percentFirst = false,
        showFlatSign = false,
        showPercentSign = true,
        flatDecimals = 0,
        percentDecimals = 1
    } = options;
    const hasFlat = Math.abs(flatValue || 0) > 0.0001;
    const hasPercent = Math.abs(percentValue || 0) > 0.0001;
    const flatText = hasFlat ? formatEquipmentDerivedStatNumber(flatValue, false, showFlatSign, flatDecimals) : "";
    const percentText = hasPercent ? formatEquipmentDerivedStatNumber(percentValue, true, showPercentSign, percentDecimals) : "";
    const parts = percentFirst ? [percentText, flatText] : [flatText, percentText];

    return parts.filter(Boolean).join(" / ") || "0";
}

function getEquipmentDerivedDeltaDirection(flatDelta, percentDelta) {
    const hasPositive = flatDelta > 0.0001 || percentDelta > 0.0001;
    const hasNegative = flatDelta < -0.0001 || percentDelta < -0.0001;
    if (hasPositive && hasNegative) return "mixed";
    if (hasPositive) return "positive";
    if (hasNegative) return "negative";
    return "neutral";
}

function collectEquipmentDerivedStatSummaries(set, comparisonSet = null) {
    const hpConfig = EQUIPMENT_DERIVED_STATS.find(stat => stat.key === "hp");
    const atkConfig = EQUIPMENT_DERIVED_STATS.find(stat => stat.key === "atk");
    const totals = collectEquipmentDerivedTotals(set);
    const comparisonTotals = comparisonSet ? collectEquipmentDerivedTotals(comparisonSet) : null;
    const hpDelta = comparisonTotals && Number.isFinite(totals.hp) && Number.isFinite(comparisonTotals.hp)
        ? totals.hp - comparisonTotals.hp
        : 0;
    const atkDelta = comparisonTotals && Number.isFinite(totals.atk) && Number.isFinite(comparisonTotals.atk)
        ? totals.atk - comparisonTotals.atk
        : 0;

    return [
        {
            key: hpConfig.key,
            label: hpConfig.label,
            valueText: Number.isFinite(totals.hp) ? String(Math.round(totals.hp)) : "--",
            deltaText: formatEquipmentDerivedStatNumber(hpDelta, false, true),
            direction: getEquipmentDerivedDeltaDirection(hpDelta, 0),
            showDelta: Boolean(comparisonSet) && Number.isFinite(totals.hp) && Number.isFinite(comparisonTotals?.hp),
            title: Number.isFinite(totals.hp)
                ? `HP = Base ${formatEquipmentDerivedStatNumber(totals.operatorBaseHp, false)} + Strength x 5 (${formatEquipmentDerivedStatNumber(totals.strengthHpBonus, false)})${totals.hpFlat ? ` + ${formatEquipmentDerivedStatNumber(totals.hpFlat, false)} flat HP` : ""}${totals.hpPercent ? `, then ${formatEquipmentDerivedStatNumber(totals.hpPercent, true, true)} HP` : ""}.`
                : "HP data is not available for this operator yet."
        },
        {
            key: atkConfig.key,
            label: atkConfig.label,
            valueText: Number.isFinite(totals.atk) ? String(Math.round(totals.atk)) : "--",
            deltaText: formatEquipmentDerivedStatNumber(atkDelta, false, true),
            direction: getEquipmentDerivedDeltaDirection(atkDelta, 0),
            showDelta: Boolean(comparisonSet) && Number.isFinite(totals.atk) && Number.isFinite(comparisonTotals?.atk),
            title: Number.isFinite(totals.atk)
                ? `ATK uses operator ${formatEquipmentDerivedStatNumber(totals.operatorBaseAtk, false)} + weapon ${formatEquipmentDerivedStatNumber(totals.weaponAtk, false)}, Main/Second ${formatEquipmentDerivedStatNumber(totals.attributeAtkBonus, true, true)}${totals.atkPercent ? `, ATK bonus ${formatEquipmentDerivedStatNumber(totals.atkPercent, true, true)}` : ""}${totals.atkFlat ? ` and ${formatEquipmentDerivedStatNumber(totals.atkFlat, false, true)} fixed ATK` : ""}.`
                : "ATK data is not available for this operator yet."
        }
    ];
}

function createEquipmentAttributeChip(attribute) {
    const chip = document.createElement("div");
    const direction = attribute.delta > 0 ? "positive" : attribute.delta < 0 ? "negative" : "neutral";
    chip.className = [
        "equipment-attribute-chip",
        `is-${direction}`,
        attribute.focusRole ? `is-${attribute.focusRole}-attribute` : ""
    ].filter(Boolean).join(" ");

    const label = document.createElement("span");
    label.className = "equipment-attribute-label";
    label.textContent = attribute.label;

    const header = document.createElement("div");
    header.className = "equipment-attribute-header";
    header.appendChild(label);

    if (attribute.focusRole) {
        const focus = document.createElement("span");
        focus.className = `equipment-attribute-focus is-${attribute.focusRole}`;
        focus.textContent = attribute.focusRole === "main" ? "Main" : "Second";
        header.appendChild(focus);
    }

    const valueRow = document.createElement("div");
    valueRow.className = "equipment-attribute-value-row";

    const total = document.createElement("strong");
    total.textContent = formatEquipmentAttributeValue(attribute.totalValue);

    valueRow.appendChild(total);
    let deltaText = "0";
    if (attribute.showDelta && direction !== "neutral") {
        const delta = document.createElement("em");
        delta.className = `equipment-attribute-delta is-${direction}`;
        const sign = attribute.delta > 0 ? "+" : "";
        deltaText = `${sign}${formatEquipmentAttributeValue(attribute.delta)}`;
        delta.textContent = deltaText;
        valueRow.appendChild(delta);
    }
    chip.append(header, valueRow);
    chip.title = attribute.showDelta
        ? `${attribute.label}: ${formatEquipmentAttributeValue(attribute.totalValue)} (${deltaText})`
        : `${attribute.label}: ${formatEquipmentAttributeValue(attribute.totalValue)}`;

    return chip;
}

function ensureEquipmentDerivedChipContainer(attributeContainer) {
    let container = document.getElementById("equipmentDerivedChips");
    if (container) return container;

    container = document.createElement("div");
    container.id = "equipmentDerivedChips";
    container.className = "equipment-derived-chips";
    container.setAttribute("aria-label", "HP and ATK");
    attributeContainer.insertAdjacentElement("afterend", container);

    return container;
}

function createEquipmentDerivedChip(stat) {
    const chip = document.createElement("div");
    chip.className = [
        "equipment-derived-chip",
        `is-${stat.key}`,
        stat.direction ? `is-${stat.direction}` : ""
    ].filter(Boolean).join(" ");

    const label = document.createElement("span");
    label.className = "equipment-derived-label";
    label.textContent = stat.label;

    const valueRow = document.createElement("div");
    valueRow.className = "equipment-derived-value-row";

    const value = document.createElement("strong");
    value.textContent = stat.valueText;
    valueRow.appendChild(value);

    if (stat.showDelta && stat.direction !== "neutral") {
        const delta = document.createElement("em");
        delta.className = `equipment-derived-delta is-${stat.direction}`;
        delta.textContent = stat.deltaText;
        valueRow.appendChild(delta);
    }

    chip.append(label, valueRow);
    chip.title = stat.title;

    return chip;
}

function renderEquipmentDerivedChips(set, comparisonSet = null) {
    const attributeContainer = document.getElementById("equipmentAttributeChips");
    if (!attributeContainer) return;

    const container = ensureEquipmentDerivedChipContainer(attributeContainer);
    container.replaceChildren(...collectEquipmentDerivedStatSummaries(set, comparisonSet).map(createEquipmentDerivedChip));
}

function renderEquipmentAttributeChips(set, comparisonSet = null) {
    const container = document.getElementById("equipmentAttributeChips");
    if (!container) return;

    container.replaceChildren(...collectEquipmentAttributeSummaries(set, comparisonSet).map(createEquipmentAttributeChip));
    renderEquipmentDerivedChips(set, comparisonSet);
}

function collectGearStatSummaryItems(set) {
    const rawEntries = [];
    const rawEntryKeys = new Set();

    Object.values(set.gear).forEach(piece => {
        getRefinedEquipmentStatEntries(piece).forEach(entry => {
            const parsed = parseEquipmentStatEntry(entry);
            if (!parsed) {
                const key = entry.toLowerCase();
                if (!rawEntryKeys.has(key)) {
                    rawEntryKeys.add(key);
                    rawEntries.push(entry);
                }
                return;
            }
        });
    });

    const totals = collectParsedGearStatTotals(set);
    return [
        ...Array.from(totals.entries()).map(([key, total]) => ({
            key,
            text: formatEquipmentStatTotal(total),
            label: total.label,
            value: total.value,
            isPercent: total.isPercent,
            decimals: total.decimals
        })),
        ...rawEntries.map(entry => ({
            key: `raw:${entry.toLowerCase()}`,
            text: entry,
            label: entry,
            value: 0,
            isPercent: false
        }))
    ];
}

function collectGearStats(set) {
    return collectGearStatSummaryItems(set).map(item => item.text);
}

function countGearSets(set) {
    return collectGearSetSummaries(set).reduce((counts, summary) => {
        counts[summary.name] = summary.count;
        return counts;
    }, {});
}

function collectGearSetSummaries(set) {
    const summaries = new Map();

    Object.values(set.gear).forEach(piece => {
        const catalogPiece = getCatalogGearPiece(piece);
        const setName = String(piece.setName || catalogPiece?.setName || "").trim();
        if (!setName) return;

        if (!summaries.has(setName)) {
            summaries.set(setName, {
                name: setName,
                count: 0,
                effect: "",
                pieces: []
            });
        }

        const summary = summaries.get(setName);
        const setEffect = getEquipmentItemSetEffect(catalogPiece) || getEquipmentItemSetEffect(piece);
        summary.count += 1;
        if (setEffect && !summary.effect) summary.effect = setEffect;
        if (piece.name || catalogPiece?.name) summary.pieces.push(piece.name || catalogPiece.name);
    });

    return Array.from(summaries.values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function createEquipmentBonusItem(stat) {
    const item = document.createElement("div");
    item.className = "equipment-bonus-item";

    const total = document.createElement("span");
    total.className = "equipment-bonus-total";
    total.textContent = stat.text;
    item.appendChild(total);

    return item;
}

function createEquipmentBonusPreviewItem(previewItem, statDiffs) {
    const item = document.createElement("div");
    item.className = "equipment-bonus-preview-item";

    const title = document.createElement("span");
    title.className = "equipment-bonus-preview-title";
    title.textContent = `Preview: ${previewItem?.name || "Selected item"}`;

    const diffList = document.createElement("div");
    diffList.className = "equipment-bonus-preview-diffs";
    const visibleDiffs = statDiffs.slice(0, 5);

    if (visibleDiffs.length) {
        visibleDiffs.forEach(diff => {
            const badge = document.createElement("span");
            badge.className = `equipment-bonus-diff-pill is-${diff.direction}`;
            badge.textContent = diff.text;
            diffList.appendChild(badge);
        });

        if (statDiffs.length > visibleDiffs.length) {
            const more = document.createElement("span");
            more.className = "equipment-bonus-diff-pill is-neutral";
            more.textContent = `+${statDiffs.length - visibleDiffs.length} more`;
            diffList.appendChild(more);
        }
    } else {
        const badge = document.createElement("span");
        badge.className = "equipment-bonus-diff-pill is-neutral";
        badge.textContent = "No stat change";
        diffList.appendChild(badge);
    }

    item.append(title, diffList);
    return item;
}

function getEquipmentFocusStats(stats) {
    return stats
        .filter(stat => Number.isFinite(stat.value) && Math.abs(stat.value) > 0.0001)
        .slice()
        .sort((a, b) => {
            const weightedA = Math.abs(a.value) * (a.isPercent ? 3 : 1);
            const weightedB = Math.abs(b.value) * (b.isPercent ? 3 : 1);
            return weightedB - weightedA || a.label.localeCompare(b.label);
        })
        .slice(0, 3);
}

function getEquipmentSetFocusName(setSummaries, preview = null) {
    const previewSetName = String(preview?.item?.setName || "").trim();
    if (previewSetName) return previewSetName;

    return setSummaries.find(summary => summary.count >= 3)?.name ||
        setSummaries.find(summary => summary.count === 2)?.name ||
        setSummaries[0]?.name ||
        "";
}

function getEquipmentSetFocusSlot(setName, set) {
    if (!setName) return "";

    const preferredSlots = ["armor", "kit1", "gloves", "kit2"];
    const hasSetForSlot = slot => getGearPiecesForSlot(slot).some(piece => String(piece.setName || "") === setName);

    return preferredSlots.find(slot => !hasEquipmentGearPieceData(set.gear?.[slot]) && hasSetForSlot(slot)) ||
        preferredSlots.find(slot => String(set.gear?.[slot]?.setName || "") !== setName && hasSetForSlot(slot)) ||
        preferredSlots.find(slot => !hasEquipmentGearPieceData(set.gear?.[slot])) ||
        preferredSlots.find(slot => String(set.gear?.[slot]?.setName || "") !== setName) ||
        preferredSlots[0];
}

function setEquipmentFilterSelectValue(select, value) {
    if (!select) return false;

    const option = Array.from(select.options).find(candidate => candidate.value === value);
    if (!option) return false;

    select.value = value;
    return true;
}

function focusEquipmentGearFilter(slot, filters = {}, set = readEquipmentEditorForm()) {
    const opened = openEquipmentGearPicker(slot, filters);
    if (!opened) return;

    const activeParts = [
        filters.searchText ? `"${filters.searchText}"` : "",
        filters.setName || "",
        filters.statLabel || ""
    ].filter(Boolean);
    const label = activeParts.length ? activeParts.join(" + ") : getEquipmentSlotLabel(slot);
    setEquipmentEditorStatus(`Opened ${getEquipmentSlotLabel(slot)} selection for ${label}.`, "is-success");
}

function focusEquipmentSetFilter(setName, set = readEquipmentEditorForm()) {
    const slot = getEquipmentSetFocusSlot(setName, set);
    if (!setName || !slot) return;

    focusEquipmentGearFilter(slot, { setName }, set);
}

function createEquipmentBuildChip(text, tone = "neutral") {
    const chip = document.createElement("span");
    chip.className = `equipment-build-chip is-${tone}`;
    chip.textContent = text;
    return chip;
}

function createEquipmentBuildNote(text, tone = "neutral") {
    const note = document.createElement("span");
    note.className = `equipment-build-note is-${tone}`;
    note.textContent = text;
    return note;
}

function getUniqueEquipmentLabels(labels) {
    const seen = new Set();

    return labels
        .map(label => String(label || "").trim())
        .filter(Boolean)
        .filter(label => {
            const key = normalizeEquipmentFilterText(label);
            if (!key || seen.has(key)) return false;

            seen.add(key);
            return true;
        });
}

function getEquipmentBuildDesiredStatLabels(stats) {
    const operator = getEquipmentEditorOperator();
    const operatorFocus = [
        getOperatorEquipmentMainAttribute(operator),
        getOperatorEquipmentSecondaryAttribute(operator)
    ].map(label => {
        const coreKey = getEquipmentCoreAttributeKey(label);
        return EQUIPMENT_CORE_ATTRIBUTES.find(attribute => attribute.key === coreKey)?.label || label;
    });

    return getUniqueEquipmentLabels([
        ...operatorFocus,
        ...getEquipmentFocusStats(stats).map(stat => stat.label)
    ]).slice(0, 5);
}

function getEquipmentPieceStatLabelGroups(piece) {
    const getLabels = value => splitEquipmentStatEntries(value)
        .map(entry => parseEquipmentStatEntry(entry)?.label || entry.replace(/\s+[+-]?\s*\d+(?:[.,]\d+)?%?$/, "").trim())
        .filter(Boolean);

    return {
        main: getLabels(getEquipmentItemMainStat(piece)),
        sub: getLabels(getEquipmentItemSubStats(piece))
    };
}

function getEquipmentPieceFocusMatch(piece, desiredStatLabels) {
    const desired = new Set(desiredStatLabels.map(normalizeEquipmentFilterText).filter(Boolean));
    const groups = getEquipmentPieceStatLabelGroups(piece);
    const matches = [];
    let score = 0;

    groups.main.forEach(label => {
        if (!desired.has(normalizeEquipmentFilterText(label))) return;

        matches.push(label);
        score += 34;
    });
    groups.sub.forEach(label => {
        if (!desired.has(normalizeEquipmentFilterText(label))) return;

        matches.push(label);
        score += 18;
    });

    return {
        score,
        labels: getUniqueEquipmentLabels(matches)
    };
}

function getEquipmentPieceOperatorFocusRoles(piece) {
    const operator = getEquipmentEditorOperator();
    const mainKey = getEquipmentCoreAttributeKey(getOperatorEquipmentMainAttribute(operator));
    const secondKey = getEquipmentCoreAttributeKey(getOperatorEquipmentSecondaryAttribute(operator));
    const pieceKeys = new Set(getEquipmentPieceStatLabels(piece).map(getEquipmentCoreAttributeKey).filter(Boolean));
    const roles = [];

    if (mainKey && pieceKeys.has(mainKey)) {
        roles.push({ text: "Main", tone: "main" });
    }
    if (secondKey && secondKey !== mainKey && pieceKeys.has(secondKey)) {
        roles.push({ text: "Second", tone: "second" });
    }

    return roles;
}

function createEquipmentTileCompareBadge(text, tone = "neutral") {
    const badge = document.createElement("span");
    badge.className = `equipment-tile-compare-badge is-${tone}`;
    badge.textContent = text;
    return badge;
}

function createEquipmentTileComparison(slot, piece, currentSet, projectedSet, projectedCount = 0, currentCount = 0) {
    const compare = document.createElement("div");
    compare.className = "equipment-tile-compare";

    if (piece?.setName) {
        let setText = "";
        let setTone = "neutral";
        if (projectedCount >= 3 && currentCount < 3) {
            setText = "Set active";
            setTone = "positive";
        } else if (projectedCount >= 3) {
            setText = `${projectedCount}/3 set`;
            setTone = "positive";
        } else if (projectedCount === 2) {
            setText = "2/3 set";
            setTone = "warning";
        }
        if (setText) compare.appendChild(createEquipmentTileCompareBadge(setText, setTone));
    }

    collectEquipmentStatDiffs(currentSet, projectedSet)
        .filter(diff => diff.direction !== "neutral")
        .slice(0, 2)
        .forEach(diff => {
            compare.appendChild(createEquipmentTileCompareBadge(diff.text, diff.direction));
        });

    if (!compare.children.length) {
        const slotHasValue = hasEquipmentGearPieceData(currentSet.gear?.[slot]);
        compare.appendChild(createEquipmentTileCompareBadge(slotHasValue ? "Sidegrade" : "New piece", "neutral"));
    }

    return compare;
}

function getEquipmentSelectedPieceIds(set, exceptSlot = "") {
    const ids = new Set();

    EQUIPMENT_GEAR_SLOTS.forEach(slot => {
        if (slot === exceptSlot) return;

        const pieceId = set.gear?.[slot]?.pieceId;
        if (pieceId) ids.add(String(pieceId));
    });

    return ids;
}

function getEquipmentBestPieceForSlot(slot, set, options = {}) {
    const selectedPieceIds = getEquipmentSelectedPieceIds(set, slot);
    const setCounts = countGearSets(set);
    const desiredStatLabels = options.statLabels || [];
    const targetSetName = String(options.setName || "").trim();
    const currentPieceId = String(set.gear?.[slot]?.pieceId || "");

    return getGearPiecesForSlot(slot)
        .filter(piece => String(piece.id) !== currentPieceId)
        .filter(piece => !selectedPieceIds.has(String(piece.id)))
        .map(piece => {
            const pieceSetName = String(piece.setName || "").trim();
            const statMatch = getEquipmentPieceFocusMatch(piece, desiredStatLabels);
            let score = getEquipmentRarityValue(piece) * 7 + statMatch.score;

            if (targetSetName && pieceSetName === targetSetName) score += 120;
            if (pieceSetName && (setCounts[pieceSetName] || 0) === 2) score += 52;
            if (pieceSetName && (setCounts[pieceSetName] || 0) === 1) score += 18;
            if (!targetSetName && pieceSetName) score += Math.min(setCounts[pieceSetName] || 0, 2) * 18;

            return { piece, score, statMatch };
        })
        .sort((a, b) => b.score - a.score || getEquipmentRarityValue(b.piece) - getEquipmentRarityValue(a.piece) || String(a.piece.name).localeCompare(String(b.piece.name)))[0] || null;
}

function createEquipmentBuildSuggestion(title, body, slot, filters, tone = "neutral", piece = null) {
    return {
        title,
        body,
        slot,
        filters,
        tone,
        pieceId: piece?.id || ""
    };
}

function equipEquipmentBuildSuggestion(suggestion) {
    const slot = suggestion?.slot;
    const piece = getGearPieceById(suggestion?.pieceId);
    if (!slot || !piece) return false;

    closeEquipmentWeaponMenus();
    applyEquipmentGearPieceToInputs(slot, piece);
    resetEquipmentGearRefinement(slot);
    renderEquipmentGearSelects(readEquipmentEditorForm());
    updateEquipmentSlotClearButtons();
    refreshEquipmentEditorDirtyState(`${piece.name} equipped in ${getEquipmentSlotLabel(slot)} - unsaved`);
    return true;
}

function collectEquipmentBuildSuggestions(set, stats, setSummaries, preview = null) {
    const suggestions = [];
    const seen = new Set();
    const desiredStatLabels = getEquipmentBuildDesiredStatLabels(stats);
    const missingGearSlots = EQUIPMENT_GEAR_SLOTS.filter(slot => !hasEquipmentGearPieceData(set.gear?.[slot]));
    const closestSet = setSummaries.find(summary => summary.count < 3 && summary.count > 0);
    const focusSetName = getEquipmentSetFocusName(setSummaries, preview);
    const kitSetNames = ["kit1", "kit2"]
        .map(slot => String(set.gear?.[slot]?.setName || "").trim())
        .filter(Boolean);
    const splitKits = kitSetNames.length === 2 && kitSetNames[0] !== kitSetNames[1];

    const addSuggestion = suggestion => {
        if (!suggestion?.slot) return;

        const key = [
            suggestion.slot,
            suggestion.filters?.setName || "",
            suggestion.filters?.statLabel || "",
            suggestion.filters?.searchText || "",
            suggestion.title
        ].join("|");
        if (seen.has(key) || suggestions.length >= 4) return;

        seen.add(key);
        suggestions.push(suggestion);
    };

    if (closestSet?.count === 2) {
        const slot = getEquipmentSetFocusSlot(closestSet.name, set);
        const best = getEquipmentBestPieceForSlot(slot, set, {
            setName: closestSet.name,
            statLabels: desiredStatLabels
        });

        if (best) {
            const matches = best.statMatch.labels.length ? ` - matches ${best.statMatch.labels.join(", ")}` : "";
            addSuggestion(createEquipmentBuildSuggestion(
                `${closestSet.name} complete`,
                `${getEquipmentSlotLabel(slot)}: ${best.piece.name}${matches}`,
                slot,
                { setName: closestSet.name, searchText: best.piece.name },
                "success",
                best.piece
            ));
        }
    }

    if (splitKits) {
        const targetSummary = setSummaries
            .filter(summary => kitSetNames.includes(summary.name))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];
        const targetKitSlot = targetSummary
            ? ["kit1", "kit2"].find(slot => String(set.gear?.[slot]?.setName || "") !== targetSummary.name)
            : "";
        const best = targetKitSlot ? getEquipmentBestPieceForSlot(targetKitSlot, set, {
            setName: targetSummary.name,
            statLabels: desiredStatLabels
        }) : null;

        addSuggestion(createEquipmentBuildSuggestion(
            "Kits align",
            best
                ? `${getEquipmentSlotLabel(targetKitSlot)}: ${best.piece.name} keeps ${targetSummary.name} together.`
                : `Use the same set on Kit 1 and Kit 2.`,
            targetKitSlot || "kit2",
            {
                setName: targetSummary?.name || kitSetNames[0],
                searchText: best?.piece?.name || ""
            },
            "warning",
            best?.piece || null
        ));
    }

    missingGearSlots.slice(0, 2).forEach(slot => {
        const best = getEquipmentBestPieceForSlot(slot, set, {
            setName: focusSetName,
            statLabels: desiredStatLabels
        });
        if (!best) return;

        const statText = best.statMatch.labels.length
            ? ` - ${best.statMatch.labels.join(", ")}`
            : "";
        addSuggestion(createEquipmentBuildSuggestion(
            `Fill ${getEquipmentSlotLabel(slot)}`,
            `${best.piece.name} (${best.piece.setName || "no set"}${statText})`,
            slot,
            {
                setName: best.piece.setName || focusSetName,
                searchText: best.piece.name
            },
            "warning",
            best.piece
        ));
    });

    if (desiredStatLabels.length) {
        const statLabel = desiredStatLabels[0];
        const slot = missingGearSlots[0] || getEquipmentSetFocusSlot(focusSetName, set) || EQUIPMENT_GEAR_SLOTS[0];
        const best = getEquipmentBestPieceForSlot(slot, set, {
            statLabels: [statLabel],
            setName: focusSetName
        });
        addSuggestion(createEquipmentBuildSuggestion(
            `Prioritize ${statLabel}`,
            best
                ? `${getEquipmentSlotLabel(slot)}: ${best.piece.name} supports the operator focus.`
                : `Show pieces that support the operator focus.`,
            slot,
            {
                statLabel,
                setName: best?.piece?.setName || "",
                searchText: best?.piece?.name || ""
            },
            "neutral",
            best?.piece || null
        ));
    }

    return suggestions;
}

function createEquipmentBuildSuggestionItem(suggestion, set) {
    const item = document.createElement("div");
    item.className = `equipment-build-suggestion is-${suggestion.tone || "neutral"}`;

    const copy = document.createElement("span");
    copy.className = "equipment-build-suggestion-copy";

    const title = document.createElement("strong");
    title.textContent = suggestion.title;

    const body = document.createElement("small");
    body.textContent = suggestion.body;

    copy.append(title, body);

    const actions = document.createElement("span");
    actions.className = "equipment-build-suggestion-actions";

    if (suggestion.pieceId) {
        const equipAction = document.createElement("button");
        equipAction.type = "button";
        equipAction.className = "equipment-build-action equipment-build-suggestion-action is-primary";
        equipAction.textContent = "Equip";
        equipAction.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            equipEquipmentBuildSuggestion(suggestion);
        });
        actions.appendChild(equipAction);
    }

    const viewAction = document.createElement("button");
    viewAction.type = "button";
    viewAction.className = "equipment-build-action equipment-build-suggestion-action is-secondary";
    viewAction.textContent = "View";
    viewAction.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        focusEquipmentGearFilter(suggestion.slot, suggestion.filters || {}, set);
    });
    actions.appendChild(viewAction);

    item.append(copy, actions);
    return item;
}

function createEquipmentBuildAnalysisItem(set, stats, setSummaries, preview = null) {
    const item = document.createElement("div");
    const isPreview = Boolean(preview?.baseSet);
    item.className = `equipment-build-analysis${isPreview ? " is-previewing" : ""}`;

    const gearSlots = EQUIPMENT_GEAR_SLOTS.filter(slot => hasEquipmentGearPieceData(set.gear?.[slot]));
    const missingGearSlots = EQUIPMENT_GEAR_SLOTS.filter(slot => !hasEquipmentGearPieceData(set.gear?.[slot]));
    const hasWeapon = Boolean(set.weapon?.weaponId || set.weapon?.customName);
    const activeSets = setSummaries.filter(summary => summary.count >= 3);
    const closestSet = setSummaries.find(summary => summary.count < 3 && summary.count > 0);
    const focusStats = getEquipmentFocusStats(stats);
    const focusSetName = getEquipmentSetFocusName(setSummaries, preview);
    const kitSetNames = ["kit1", "kit2"]
        .map(slot => String(set.gear?.[slot]?.setName || "").trim())
        .filter(Boolean);
    const splitKits = kitSetNames.length === 2 && kitSetNames[0] !== kitSetNames[1];
    const pairedKitSet = kitSetNames.length === 2 && kitSetNames[0] === kitSetNames[1]
        ? setSummaries.find(summary => summary.name === kitSetNames[0])
        : null;

    let rating = "Incomplete";
    let tone = "warning";
    if (!missingGearSlots.length && hasWeapon && activeSets.length) {
        rating = "Set online";
        tone = "success";
    } else if (!missingGearSlots.length && hasWeapon && closestSet?.count === 2) {
        rating = "One piece away";
        tone = "warning";
    } else if (!missingGearSlots.length && hasWeapon) {
        rating = "Needs set plan";
        tone = "neutral";
    }

    const header = document.createElement("div");
    header.className = "equipment-build-analysis-header";
    const title = document.createElement("strong");
    title.textContent = "Build Check";
    const badge = document.createElement("span");
    badge.className = `equipment-build-rating is-${tone}`;
    badge.textContent = rating;
    header.append(title, badge);

    const chips = document.createElement("div");
    chips.className = "equipment-build-chips";
    chips.append(
        createEquipmentBuildChip(`Gear ${gearSlots.length}/4`, missingGearSlots.length ? "warning" : "success"),
        createEquipmentBuildChip(hasWeapon ? "Weapon OK" : "No weapon", hasWeapon ? "success" : "warning")
    );
    if (activeSets.length) {
        chips.append(createEquipmentBuildChip(`${activeSets[0].name} ${activeSets[0].count}/3`, "success"));
    } else if (closestSet) {
        chips.append(createEquipmentBuildChip(`${closestSet.name} ${closestSet.count}/3`, closestSet.count === 2 ? "warning" : "neutral"));
    } else {
        chips.append(createEquipmentBuildChip("No set plan", "warning"));
    }

    const notes = document.createElement("div");
    notes.className = "equipment-build-notes";

    if (focusStats.length) {
        notes.append(createEquipmentBuildNote(
            `Operator Focus: ${focusStats.map(stat => stat.label).join(", ")}`,
            "success"
        ));
    }

    if (missingGearSlots.length) {
        notes.append(createEquipmentBuildNote(
            `Empty slots: ${missingGearSlots.map(getEquipmentSlotLabel).join(", ")}`,
            "warning"
        ));
    }

    if (activeSets.length) {
        notes.append(createEquipmentBuildNote(
            `${activeSets[0].name} set bonus is active.`,
            "success"
        ));
    } else if (closestSet) {
        notes.append(createEquipmentBuildNote(
            `${closestSet.name} needs ${3 - closestSet.count} more for the set bonus.`,
            closestSet.count === 2 ? "warning" : "neutral"
        ));
    }

    if (splitKits) {
        notes.append(createEquipmentBuildNote("Kit 1 and Kit 2 are split across different sets.", "warning"));
    } else if (pairedKitSet && pairedKitSet.count < 3) {
        notes.append(createEquipmentBuildNote(
            `Both kits support ${pairedKitSet.name}, but one more matching piece is needed.`,
            "warning"
        ));
    }

    if (!notes.children.length) {
        notes.append(createEquipmentBuildNote("Add gear pieces to unlock build guidance.", "neutral"));
    }

    const suggestions = collectEquipmentBuildSuggestions(set, stats, setSummaries, preview);
    const suggestionBlock = document.createElement("div");
    suggestionBlock.className = "equipment-build-suggestions";

    if (suggestions.length) {
        const suggestionTitle = document.createElement("strong");
        suggestionTitle.className = "equipment-build-suggestions-title";
        suggestionTitle.textContent = "Suggestions";

        const suggestionList = document.createElement("div");
        suggestionList.className = "equipment-build-suggestion-list";
        suggestionList.replaceChildren(...suggestions.map(suggestion => createEquipmentBuildSuggestionItem(suggestion, set)));

        suggestionBlock.append(suggestionTitle, suggestionList);
    }

    item.append(header, chips, notes);
    if (suggestions.length) item.appendChild(suggestionBlock);

    if (focusSetName && !suggestions.length) {
        const action = document.createElement("button");
        action.type = "button";
        action.className = "equipment-build-action";
        action.textContent = `Filter ${focusSetName}`;
        action.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            focusEquipmentSetFilter(focusSetName, set);
        });
        item.appendChild(action);
    }

    return item;
}

function renderEquipmentGearSummary(set, preview = null) {
    const bonusList = document.getElementById("equipmentGearBonusList");
    const setList = document.getElementById("equipmentSetEffectsList");
    if (!bonusList || !setList) return;

    const isPreview = Boolean(preview?.baseSet);
    const statDiffs = isPreview ? collectEquipmentStatDiffs(preview.baseSet, set) : [];
    const stats = collectGearStatSummaryItems(set);
    const bonusItems = [];

    renderEquipmentAttributeChips(set, isPreview ? preview.baseSet : null);
    bonusList.classList.toggle("is-previewing", isPreview);

    if (isPreview && preview?.item?.name) {
        bonusItems.push(createEquipmentBonusPreviewItem(preview.item, statDiffs));
    }

    const setSummaries = collectGearSetSummaries(set);
    bonusItems.push(createEquipmentBuildAnalysisItem(set, stats, setSummaries, preview));

    if (stats.length) {
        stats.forEach(stat => {
            bonusItems.push(createEquipmentBonusItem(stat));
        });
    } else {
        bonusItems.push(createEquipmentBonusItem({ key: "empty", text: "No gear stats yet" }));
    }

    bonusList.replaceChildren(...bonusItems);

    const emptySummary = { name: "No set", count: 0, effect: "", pieces: [] };
    setList.replaceChildren(...(setSummaries.length ? setSummaries : [emptySummary]).map(summary => {
        const item = document.createElement("div");
        const count = summary.count;
        const isActive = count >= 3;
        item.className = `equipment-set-item${isActive ? " is-active" : count ? " is-pending" : " is-empty"}`;
        const title = document.createElement("strong");
        title.textContent = summary.name;
        const meta = document.createElement("span");
        meta.textContent = count
            ? `${isActive ? "Active" : "Inactive"}: ${count}/3${isActive ? "" : ` - ${3 - count} more`}`
            : "No set selected";
        item.append(title, meta);
        if (summary.effect) {
            const effect = document.createElement("p");
            effect.className = "equipment-set-effect";
            effect.textContent = summary.effect;
            item.appendChild(effect);
            attachEquipmentTooltipEvents(item, {
                name: summary.name,
                setName: summary.name,
                setEffect: summary.effect
            }, "Set Effect");
        }
        return item;
    }));
    updateEquipmentSlotClearButtons();
}

function selectEquipmentEditorOperator(operatorId) {
    const operator = getEquipmentEditorOperator(operatorId);
    if (!operator) return;

    const modal = document.getElementById("equipmentEditorModal");
    const isSameOperator = Number(operator.id) === Number(equipmentEditorState.operatorId);
    if (isSameOperator && modal?.classList.contains("open")) return;
    if (!isSameOperator && !confirmEquipmentEditorDiscardChanges()) return;

    closeEquipmentGearPicker({ restoreSummary: false });
    closeEquipmentWeaponPicker();
    equipmentEditorState.operatorId = operator.id;
    const set = getOperatorEquipmentSet(operator.id);
    renderEquipmentEditorHeader(operator);
    renderEquipmentWeaponSelect(operator, set.weapon.weaponId);
    fillEquipmentEditorForm(set);
    renderEquipmentGearSelects(set);
    renderEquipmentOperatorList();
    markEquipmentEditorClean(set);
}

function getEquipmentEditorInitialOperatorId(preferredOperatorId = null) {
    if (preferredOperatorId && operators.some(operator => Number(operator.id) === Number(preferredOperatorId))) {
        return preferredOperatorId;
    }

    const firstTeamOperator = selectedTeam.find(Boolean);
    if (firstTeamOperator) return firstTeamOperator;

    return operators[0]?.id || null;
}

function openEquipmentEditor(operatorId = null) {
    const modal = document.getElementById("equipmentEditorModal");
    if (!modal) return;

    const initialOperatorId = getEquipmentEditorInitialOperatorId(operatorId);
    if (initialOperatorId) {
        selectEquipmentEditorOperator(initialOperatorId);
    } else {
        const emptySet = createEmptyOperatorEquipmentSet();
        renderEquipmentEditorHeader(null);
        fillEquipmentEditorForm(emptySet);
        renderEquipmentGearSelects(emptySet);
        markEquipmentEditorClean(emptySet);
    }

    modal.classList.add("open");
}

function closeEquipmentEditor() {
    if (!confirmEquipmentEditorDiscardChanges()) return;

    const modal = document.getElementById("equipmentEditorModal");
    if (modal) modal.classList.remove("open");
    closeEquipmentGearPicker({ restoreSummary: false });
    closeEquipmentWeaponPicker();
    closeEquipmentWeaponMenus();
    equipmentEditorState.isDirty = false;
    updateEquipmentSaveButton();
}

function saveEquipmentEditorSet(event) {
    event.preventDefault();

    const operator = getEquipmentEditorOperator();
    if (!operator) return;

    const savedSet = readEquipmentEditorForm();
    setOperatorEquipmentSet(operator.id, savedSet);
    renderEquipmentOperatorList();
    renderSelectedOperators();
    markEquipmentEditorClean(savedSet, "Equipment set saved");
}

function clearEquipmentEditorSet() {
    const operator = getEquipmentEditorOperator();
    if (!operator) return;

    const shouldClear = confirm(`Clear equipment set for ${operator.name}?`);
    if (!shouldClear) return;

    clearOperatorEquipmentSet(operator.id);
    const emptySet = createEmptyOperatorEquipmentSet();
    renderEquipmentWeaponSelect(operator, "");
    fillEquipmentEditorForm(emptySet);
    renderEquipmentGearSelects(emptySet);
    renderEquipmentOperatorList();
    renderSelectedOperators();
    markEquipmentEditorClean(emptySet, "Equipment set cleared");
}

function createOperatorEquipmentSummary(operatorId) {
    if (!hasOperatorEquipmentSet(operatorId)) return null;

    const set = getOperatorEquipmentSet(operatorId);
    const selectedWeapon = getEquipmentWeaponById(set.weapon.weaponId);
    const summary = document.createElement("div");
    summary.className = "team-equipment-summary";

    const weapon = document.createElement("span");
    weapon.textContent = selectedWeapon?.name || set.weapon.customName || "Weapon saved";

    const gear = document.createElement("span");
    gear.textContent = set.gear.armor.setName || set.gear.armor.name || "Gear saved";

    summary.append(weapon, gear);
    return summary;
}

function initEquipmentEditor() {
    loadOperatorEquipmentSets();

    const openButton = document.getElementById("openEquipmentEditorBtn");
    const closeButton = document.getElementById("closeEquipmentEditorBtn");
    const cancelButton = document.getElementById("cancelEquipmentEditorBtn");
    const clearButton = document.getElementById("clearEquipmentEditorBtn");
    const modal = document.getElementById("equipmentEditorModal");
    const form = document.getElementById("equipmentEditorForm");

    if (openButton) openButton.addEventListener("click", () => openEquipmentEditor());
    if (closeButton) closeButton.addEventListener("click", closeEquipmentEditor);
    if (cancelButton) cancelButton.addEventListener("click", closeEquipmentEditor);
    if (clearButton) clearButton.addEventListener("click", clearEquipmentEditorSet);
    document.querySelectorAll("[data-equipment-clear-slot]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            clearEquipmentEditorSlot(button.dataset.equipmentClearSlot);
        });
    });
    if (form) {
        form.addEventListener("submit", saveEquipmentEditorSet);
        form.addEventListener("input", () => {
            renderEquipmentGearSummary(readEquipmentEditorForm());
            updateEquipmentSlotClearButtons();
            refreshEquipmentEditorDirtyState();
        });
    }

    const levelInput = document.querySelector('[data-equipment-field="weapon.level"]');
    const levelSlider = document.getElementById("equipmentWeaponLevelSlider");
    if (levelInput) {
        levelInput.addEventListener("input", syncEquipmentWeaponLevelSlider);
        levelInput.addEventListener("change", () => {
            levelInput.value = String(getEquipmentLevelNumber(levelInput.value));
            syncEquipmentWeaponLevelSlider();
        });
    }
    if (levelSlider) {
        levelSlider.addEventListener("input", () => {
            syncEquipmentWeaponLevelInput();
            renderEquipmentGearSummary(readEquipmentEditorForm());
            renderEquipmentWeaponEssenceSummary();
            refreshEquipmentEditorDirtyState("Unsaved changes - level changed");
        });
    }

    const operatorLevelInput = document.querySelector('[data-equipment-field="operator.level"]');
    const operatorLevelSlider = document.getElementById("equipmentOperatorLevelSlider");
    if (operatorLevelInput) {
        operatorLevelInput.addEventListener("input", syncEquipmentOperatorLevelSlider);
        operatorLevelInput.addEventListener("change", () => {
            const maxLevel = getEquipmentOperatorMaxLevel();
            operatorLevelInput.value = String(getEquipmentLevelNumber(operatorLevelInput.value, maxLevel, maxLevel));
            syncEquipmentOperatorLevelSlider();
        });
    }
    if (operatorLevelSlider) {
        operatorLevelSlider.addEventListener("input", () => {
            syncEquipmentOperatorLevelInput();
            refreshEquipmentEditorDirtyState("Unsaved changes - operator level changed");
        });
    }

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeEquipmentEditor();
        });
    }

    document.addEventListener("keydown", event => {
        const modalElement = document.getElementById("equipmentEditorModal");
        if (event.key === "Escape" && modalElement?.classList.contains("open")) {
            if (isEquipmentWeaponPickerOpen()) {
                event.preventDefault();
                closeEquipmentWeaponPicker();
                return;
            }
            if (isEquipmentGearPickerOpen()) {
                event.preventDefault();
                closeEquipmentGearPicker();
                return;
            }
            closeEquipmentWeaponMenus();
            closeEquipmentEditor();
        }
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".equipment-weapon-dropdown")) {
            closeEquipmentWeaponMenus();
        }
    });
}

window.initEquipmentEditor = initEquipmentEditor;
window.openEquipmentEditor = openEquipmentEditor;
window.closeEquipmentEditor = closeEquipmentEditor;
window.createOperatorEquipmentSummary = createOperatorEquipmentSummary;
