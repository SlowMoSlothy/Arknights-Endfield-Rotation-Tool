const equipmentEditorState = {
    operatorId: null
};

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
    const rarity = Number(weapon?.rarity || 0);
    return `rarity-${Number.isFinite(rarity) ? rarity : 0}`;
}

function getItemRarityClass(item) {
    const rarity = Number(item?.rarity || 0);
    return `rarity-${Number.isFinite(rarity) ? rarity : 0}`;
}

function getEquipmentSlotLabel(slot) {
    return {
        armor: "Armor",
        gloves: "Gloves",
        kit1: "Kit 1",
        kit2: "Kit 2"
    }[slot] || slot;
}

function getWeaponFallbackImage(weapon) {
    return getEquipmentItemFallbackImage(weapon, "weapon");
}

function getEquipmentItemFallbackImage(item, type = "gear") {
    const rarity = Number(item?.rarity || 0);
    const colors = {
        6: ["#ffe26b", "#9b6b12"],
        5: ["#dca8ff", "#62407a"],
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

function getWeaponsForOperator(operator) {
    const weaponType = getOperatorWeaponType(operator);
    return ENDFIELD_WEAPONS
        .filter(weapon => normalizeEquipmentWeaponType(weapon.weaponType) === weaponType)
        .sort((a, b) => Number(b.rarity || 0) - Number(a.rarity || 0) || String(a.name).localeCompare(String(b.name)));
}

function getGearPiecesForSlot(slot) {
    return ENDFIELD_GEAR_PIECES
        .filter(piece => String(piece.slot || "").toLowerCase() === slot)
        .sort((a, b) => Number(b.rarity || 0) - Number(a.rarity || 0) || String(a.name).localeCompare(String(b.name)));
}

function getGearPieceById(pieceId) {
    return ENDFIELD_GEAR_PIECES.find(piece => String(piece.id) === String(pieceId)) || null;
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

function setEquipmentEditorStatus(text, className = "") {
    const status = document.getElementById("equipmentEditorStatus");
    if (!status) return;

    status.className = `equipment-editor-status${className ? ` ${className}` : ""}`;
    status.textContent = text;
}

function setEquipmentInputValue(name, value) {
    const input = document.querySelector(`[data-equipment-field="${name}"]`);
    if (input) input.value = value || "";
}

function getEquipmentInputValue(name) {
    const input = document.querySelector(`[data-equipment-field="${name}"]`);
    return input ? input.value.trim() : "";
}

function fillEquipmentEditorForm(set) {
    setEquipmentInputValue("weapon.weaponId", set.weapon.weaponId);
    setEquipmentInputValue("weapon.customName", set.weapon.customName);
    setEquipmentInputValue("weapon.level", set.weapon.level);
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
        setEquipmentInputValue(`gear.${slot}.notes`, set.gear[slot].notes);
    });
}

function readEquipmentEditorForm() {
    const readGearPiece = slot => ({
        pieceId: getEquipmentInputValue(`gear.${slot}.pieceId`),
        name: getEquipmentInputValue(`gear.${slot}.name`),
        setName: getEquipmentInputValue(`gear.${slot}.setName`),
        rarity: getEquipmentInputValue(`gear.${slot}.rarity`),
        mainStat: getEquipmentInputValue(`gear.${slot}.mainStat`),
        subStats: getEquipmentInputValue(`gear.${slot}.subStats`),
        notes: getEquipmentInputValue(`gear.${slot}.notes`)
    });

    return {
        weapon: {
            weaponId: getEquipmentInputValue("weapon.weaponId"),
            customName: getEquipmentInputValue("weapon.customName"),
            level: getEquipmentInputValue("weapon.level"),
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
        ? [weapon.rarity ? `${weapon.rarity} Star` : "", getEquipmentWeaponTypeLabel(weapon.weaponType)].filter(Boolean).join(" - ")
        : "No weapon selected";

    text.append(name, meta);
    return text;
}

function createEquipmentWeaponDropdown(operator, weapons, selectedWeapon) {
    const root = document.createElement("div");
    root.className = "equipment-weapon-dropdown";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "equipment-weapon-trigger";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.disabled = weapons.length === 0;

    if (selectedWeapon) {
        button.append(createEquipmentWeaponImage(selectedWeapon), createEquipmentWeaponText(selectedWeapon));
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

    const list = document.createElement("div");
    list.className = "equipment-weapon-menu";
    list.role = "listbox";
    list.hidden = true;

    if (weapons.length === 0) {
        const empty = document.createElement("div");
        empty.className = "equipment-weapon-empty";
        empty.textContent = `No ${getEquipmentWeaponTypeLabel(getOperatorWeaponType(operator))} weapons available.`;
        list.appendChild(empty);
    } else {
        weapons.forEach(weapon => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = `equipment-weapon-option ${getWeaponRarityClass(weapon)}`;
            item.role = "option";
            item.setAttribute("aria-selected", String(selectedWeapon?.id === weapon.id));
            item.append(createEquipmentWeaponImage(weapon), createEquipmentWeaponText(weapon));
            item.addEventListener("click", () => {
                setEquipmentInputValue("weapon.weaponId", weapon.id);
                renderEquipmentWeaponSelect(operator, weapon.id);
                setEquipmentEditorStatus("");
            });
            list.appendChild(item);
        });
    }

    button.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = list.hidden;
        closeEquipmentWeaponMenus();
        list.hidden = !willOpen;
        button.setAttribute("aria-expanded", String(willOpen));
        root.classList.toggle("is-open", willOpen);
    });

    root.append(button, list);
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

function createEquipmentGearImage(piece) {
    const image = document.createElement("img");
    image.className = `equipment-weapon-image ${getItemRarityClass(piece)}`;
    image.src = getGearImageSource(piece);
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.addEventListener("error", () => handleGearImageError(image, piece));
    return image;
}

function createEquipmentGearDropdown(slot, pieces, selectedPiece) {
    const root = document.createElement("div");
    root.className = "equipment-weapon-dropdown equipment-gear-dropdown";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "equipment-weapon-trigger equipment-gear-trigger";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.disabled = pieces.length === 0;

    if (selectedPiece) {
        button.append(createEquipmentGearImage(selectedPiece), createEquipmentWeaponText(selectedPiece));
    } else {
        const emptyImage = document.createElement("span");
        emptyImage.className = "equipment-weapon-image is-empty";
        emptyImage.textContent = "?";
        button.append(emptyImage, createEquipmentWeaponText({ name: `Select ${getEquipmentSlotLabel(slot)}` }));
    }

    const chevron = document.createElement("span");
    chevron.className = "equipment-weapon-chevron";
    chevron.textContent = "⌄";
    button.appendChild(chevron);

    const list = document.createElement("div");
    list.className = "equipment-weapon-menu equipment-tile-menu";
    list.role = "listbox";
    list.hidden = true;

    if (pieces.length === 0) {
        const empty = document.createElement("div");
        empty.className = "equipment-weapon-empty";
        empty.textContent = `No ${getEquipmentSlotLabel(slot)} catalog entries yet.`;
        list.appendChild(empty);
    } else {
        pieces.forEach(piece => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = `equipment-weapon-option equipment-tile-option ${getItemRarityClass(piece)}`;
            item.role = "option";
            item.setAttribute("aria-selected", String(selectedPiece?.id === piece.id));
            item.append(createEquipmentGearImage(piece), createEquipmentWeaponText(piece));
            item.addEventListener("click", () => {
                setEquipmentInputValue(`gear.${slot}.pieceId`, piece.id);
                setEquipmentInputValue(`gear.${slot}.name`, piece.name || "");
                setEquipmentInputValue(`gear.${slot}.setName`, piece.setName || "");
                setEquipmentInputValue(`gear.${slot}.rarity`, piece.rarity ? `${piece.rarity} Star` : "");
                renderEquipmentGearSelect(slot, piece.id);
                setEquipmentEditorStatus("");
            });
            list.appendChild(item);
        });
    }

    button.addEventListener("click", event => {
        event.stopPropagation();
        const willOpen = list.hidden;
        closeEquipmentWeaponMenus();
        list.hidden = !willOpen;
        button.setAttribute("aria-expanded", String(willOpen));
        root.classList.toggle("is-open", willOpen);
    });

    root.append(button, list);
    return root;
}

function renderEquipmentGearSelect(slot, selectedPieceId = "") {
    const container = document.querySelector(`[data-gear-slot="${slot}"]`);
    if (!container) return;

    const pieces = getGearPiecesForSlot(slot);
    const selectedPiece = pieces.find(piece => String(piece.id) === String(selectedPieceId)) || getGearPieceById(selectedPieceId);
    container.replaceChildren(createEquipmentGearDropdown(slot, pieces, selectedPiece));
}

function renderEquipmentGearSelects(set) {
    ["armor", "gloves", "kit1", "kit2"].forEach(slot => {
        renderEquipmentGearSelect(slot, set.gear[slot].pieceId);
    });
}

function selectEquipmentEditorOperator(operatorId) {
    const operator = getEquipmentEditorOperator(operatorId);
    if (!operator) return;

    equipmentEditorState.operatorId = operator.id;
    const set = getOperatorEquipmentSet(operator.id);
    renderEquipmentEditorHeader(operator);
    renderEquipmentWeaponSelect(operator, set.weapon.weaponId);
    fillEquipmentEditorForm(set);
    renderEquipmentGearSelects(set);
    renderEquipmentOperatorList();
    setEquipmentEditorStatus("");
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
    }

    modal.classList.add("open");
}

function closeEquipmentEditor() {
    const modal = document.getElementById("equipmentEditorModal");
    if (modal) modal.classList.remove("open");
}

function saveEquipmentEditorSet(event) {
    event.preventDefault();

    const operator = getEquipmentEditorOperator();
    if (!operator) return;

    setOperatorEquipmentSet(operator.id, readEquipmentEditorForm());
    renderEquipmentOperatorList();
    renderSelectedOperators();
    setEquipmentEditorStatus("Equipment set saved.", "is-success");
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
    setEquipmentEditorStatus("Equipment set cleared.", "is-success");
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
    if (form) form.addEventListener("submit", saveEquipmentEditorSet);
    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeEquipmentEditor();
        });
    }

    document.addEventListener("keydown", event => {
        const modalElement = document.getElementById("equipmentEditorModal");
        if (event.key === "Escape" && modalElement?.classList.contains("open")) {
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
