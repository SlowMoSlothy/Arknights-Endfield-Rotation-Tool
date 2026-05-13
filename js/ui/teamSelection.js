function showBuilderScreen() {
    const selectionScreen = document.getElementById("selectionScreen");
    const builderScreen = document.getElementById("builderScreen");

    if (selectionScreen) {
        selectionScreen.style.display = "none";
    }

    if (builderScreen) {
        builderScreen.style.display = "block";
    }

    renderSelectedOperators();
    renderSkills();
    renderRotation();
    initSkillDragDrop();
    initTapInput();
}

function openTeamSelectionModal(slotIndex = null) {
    const selectionScreen = document.getElementById("selectionScreen");
    const builderScreen = document.getElementById("builderScreen");
    const closeButton = document.getElementById("closeTeamModalBtn");

    if (builderScreen) {
        builderScreen.style.display = "block";
    }

    if (selectionScreen) {
        selectionScreen.style.display = "block";
        selectionScreen.classList.add("team-modal-open");
    }

    document.body.classList.add("team-selection-modal-open");

    if (closeButton && closeButton.parentElement !== document.body) {
        document.body.appendChild(closeButton);
    }

    if (slotIndex !== null) {
        activeSlotIndex = slotIndex;
    } else if (activeSlotIndex === null) {
        const firstEmptySlot = selectedTeam.findIndex(x => x === null);
        activeSlotIndex = firstEmptySlot >= 0 ? firstEmptySlot : 0;
    }

    renderTeamSlots();
    renderOperatorFilters();
    renderOperatorList();
    highlightActiveSlot();
}

function closeTeamSelectionModal() {
    const selectionScreen = document.getElementById("selectionScreen");

    document.body.classList.remove("team-selection-modal-open");

    if (selectionScreen) {
        selectionScreen.classList.remove("team-modal-open");
        selectionScreen.style.display = "none";
    }
}
function backToSelection() {
    openTeamSelectionModal();
}

function confirmTeam() {
    const team = selectedTeam.filter(x => x !== null);

    if (team.length === 0) {
        alert("Bitte mindestens einen Operator wählen!");
        return;
    }

    saveTeam();

    closeTeamSelectionModal();
showBuilderScreen();
}
function renderTeamSlots() {
    const container = document.getElementById("teamSlots");
    if (!container) return;

    container.innerHTML = "";

    selectedTeam.forEach((opId, index) => {
        const slot = document.createElement("div");
        slot.className = "team-slot";

        if (!opId) {
            slot.classList.add("empty");
        } else {
            const op = operators.find(o => o.id === opId);
            if (op) {
                const elementType = getOperatorMainElement(op);
                slot.classList.add("filled", `operator-element-${elementType}`);

                const img = document.createElement("img");
                img.src = op.icon;
                img.alt = op.name;
                slot.appendChild(img);

                const remove = document.createElement("div");
                remove.className = "slot-remove";
                remove.textContent = "×";

                remove.onclick = (e) => {
                    e.stopPropagation();
                    selectedTeam[index] = null;
                    saveTeam();
                    clearRotation();
                    renderTeamSlots();
                    renderOperatorList();
                };

                slot.appendChild(remove);
            }
        }

        slot.onclick = () => {
            activeSlotIndex = index;
            highlightActiveSlot();
        };

        container.appendChild(slot);
    });

    highlightActiveSlot();
}

function getOperatorMainElement(op) {
    return op?.elementType || "neutral";
}

const OPERATOR_CLASS_FILTERS = ["Vanguard", "Guard", "Defender", "Striker", "Caster", "Supporter"];
const OPERATOR_ELEMENT_FILTERS = ["heat", "cryo", "electric", "nature", "physical"];

function normalizeFilterText(value) {
    return String(value || "").trim().toLowerCase();
}

function formatElementLabel(value) {
    const labels = {
        heat: "Heat",
        cryo: "Cryo",
        electric: "Electric",
        nature: "Nature",
        physical: "Physical",
        neutral: "Neutral"
    };

    return labels[value] || value;
}

function getFilterIconPath(filterKey, value) {
    if (filterKey === "operatorClass") {
        return `assets/ui/classes/${normalizeFilterText(value)}.webp`;
    }

    if (filterKey === "element") {
        return `assets/ui/elements/${normalizeFilterText(value)}.webp`;
    }

    return "";
}

function createOperatorCardMeta(op, elementType) {
    const meta = document.createElement("div");
    meta.className = "operator-card-meta";

    const star = document.createElement("span");
    star.className = "operator-card-star";
    star.textContent = `${op.star || "-"} \u2605`;
    meta.appendChild(star);

    if (op.operatorClass) {
        const classIcon = document.createElement("img");
        classIcon.className = "operator-card-meta-icon operator-card-class-icon";
        classIcon.src = getFilterIconPath("operatorClass", op.operatorClass);
        classIcon.alt = "";
        classIcon.title = op.operatorClass;
        classIcon.setAttribute("aria-hidden", "true");
        meta.appendChild(classIcon);
    }

    if (elementType) {
        const elementIcon = document.createElement("img");
        elementIcon.className = "operator-card-meta-icon operator-card-element-icon";
        elementIcon.src = getFilterIconPath("element", elementType);
        elementIcon.alt = "";
        elementIcon.title = formatElementLabel(elementType);
        elementIcon.setAttribute("aria-hidden", "true");
        meta.appendChild(elementIcon);
    }

    return meta;
}

function getAvailableStars() {
    return [...new Set(operators.map(op => Number(op.star)).filter(Number.isFinite))]
        .sort((a, b) => b - a);
}

function getAvailableClasses() {
    const available = new Set(operators.map(op => op.operatorClass).filter(Boolean));
    const ordered = OPERATOR_CLASS_FILTERS.filter(value => available.has(value));
    const extra = [...available].filter(value => !ordered.includes(value)).sort();

    return [...ordered, ...extra];
}

function getAvailableElements() {
    const available = new Set(operators.map(op => getOperatorMainElement(op)).filter(Boolean));
    const ordered = OPERATOR_ELEMENT_FILTERS.filter(value => available.has(value));
    const extra = [...available].filter(value => !ordered.includes(value)).sort();

    return [...ordered, ...extra];
}

function operatorMatchesFilters(op) {
    const search = normalizeFilterText(operatorFilterState.search);
    const name = normalizeFilterText(op.name);
    const operatorClass = normalizeFilterText(op.operatorClass);
    const element = normalizeFilterText(getOperatorMainElement(op));
    const star = String(op.star || "");

    if (search && !name.includes(search)) return false;
    if (operatorFilterState.star !== "all" && star !== operatorFilterState.star) return false;
    if (operatorFilterState.operatorClass !== "all" && operatorClass !== normalizeFilterText(operatorFilterState.operatorClass)) return false;
    if (operatorFilterState.element !== "all" && element !== operatorFilterState.element) return false;

    return true;
}

function hasActiveOperatorFilters() {
    return Boolean(
        operatorFilterState.search ||
        operatorFilterState.star !== "all" ||
        operatorFilterState.operatorClass !== "all" ||
        operatorFilterState.element !== "all"
    );
}

function setOperatorFilter(filterKey, value) {
    operatorFilterState[filterKey] = value;
    renderOperatorFilters();
    renderOperatorList();
}

function resetOperatorFilters() {
    operatorFilterState = {
        search: "",
        star: "all",
        operatorClass: "all",
        element: "all"
    };

    renderOperatorFilters();
    renderOperatorList();
}

function createOperatorFilterButton(filterKey, value, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "operator-filter-btn";

    const iconPath = value !== "all" ? getFilterIconPath(filterKey, value) : "";

    if (iconPath) {
        const icon = document.createElement("img");
        icon.className = "operator-filter-icon";
        icon.src = iconPath;
        icon.alt = "";
        icon.setAttribute("aria-hidden", "true");
        button.classList.add("has-icon");
        button.appendChild(icon);
    }

    const text = document.createElement("span");
    text.textContent = label;
    button.appendChild(text);

    if (operatorFilterState[filterKey] === value) {
        button.classList.add("active");
    }

    button.addEventListener("click", () => setOperatorFilter(filterKey, value));

    return button;
}

function createOperatorFilterGroup(label, filterKey, options) {
    const group = document.createElement("div");
    group.className = "operator-filter-group";

    const groupLabel = document.createElement("div");
    groupLabel.className = "operator-filter-label";
    groupLabel.textContent = label;

    const buttons = document.createElement("div");
    buttons.className = "operator-filter-buttons";
    buttons.appendChild(createOperatorFilterButton(filterKey, "all", "All"));

    options.forEach(option => {
        const value = String(option);
        const buttonLabel = filterKey === "star"
            ? `${value} \u2605`
            : filterKey === "element"
                ? formatElementLabel(value)
                : value;

        buttons.appendChild(createOperatorFilterButton(filterKey, value, buttonLabel));
    });

    group.appendChild(groupLabel);
    group.appendChild(buttons);

    return group;
}

function renderOperatorFilters() {
    const container = document.getElementById("operatorFilters");
    if (!container) return;

    container.innerHTML = "";

    const searchWrap = document.createElement("label");
    searchWrap.className = "operator-search-wrap";

    const searchLabel = document.createElement("span");
    searchLabel.className = "operator-filter-label";
    searchLabel.textContent = "Search";

    const searchInput = document.createElement("input");
    searchInput.className = "operator-search-input";
    searchInput.type = "search";
    searchInput.placeholder = "Operator name";
    searchInput.value = operatorFilterState.search;
    searchInput.addEventListener("input", event => {
        operatorFilterState.search = event.target.value;
        resetButton.disabled = !hasActiveOperatorFilters();
        renderOperatorList();
    });

    searchWrap.appendChild(searchLabel);
    searchWrap.appendChild(searchInput);

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "operator-filter-reset";
    resetButton.textContent = "Reset";
    resetButton.disabled = !hasActiveOperatorFilters();
    resetButton.addEventListener("click", resetOperatorFilters);

    const topRow = document.createElement("div");
    topRow.className = "operator-filter-top";
    topRow.appendChild(searchWrap);
    topRow.appendChild(resetButton);

    container.appendChild(topRow);
    container.appendChild(createOperatorFilterGroup("Stars", "star", getAvailableStars()));
    container.appendChild(createOperatorFilterGroup("Class", "operatorClass", getAvailableClasses()));
    container.appendChild(createOperatorFilterGroup("Element", "element", getAvailableElements()));
}

function renderOperatorList() {
    const grid = document.getElementById("operatorList");
    if (!grid) return;

    grid.innerHTML = "";

    const visibleOperators = operators.filter(operatorMatchesFilters);

    if (visibleOperators.length === 0) {
        const empty = document.createElement("div");
        empty.className = "operator-filter-empty";
        empty.textContent = "No operators match the current filters.";
        grid.appendChild(empty);
        return;
    }

    visibleOperators.forEach(op => {
        const isSelected = selectedTeam.includes(op.id);
        const elementType = getOperatorMainElement(op);

        const card = document.createElement("div");
        card.className = `operator-card operator-element-${elementType}`;

        if (isSelected) {
            card.classList.add("disabled");
            card.classList.add("selected");
            card.title = "Bereits im Team";
        }

        const img = document.createElement("img");
        img.src = op.icon;
        img.alt = op.name;

        const name = document.createElement("div");
        name.className = "operator-name";
        name.textContent = op.name;

        card.appendChild(createOperatorCardMeta(op, elementType));
        card.appendChild(img);
        card.appendChild(name);

        if (!isSelected) {
            card.onclick = () => {
                if (activeSlotIndex === null) return;

                const oldOpId = selectedTeam[activeSlotIndex];
                selectedTeam[activeSlotIndex] = op.id;
                saveTeam();

                if (oldOpId !== op.id) {
                    clearRotation();
                }

                renderTeamSlots();
renderOperatorList();
confirmTeam();
            };
        }

        grid.appendChild(card);
    });
}
function highlightActiveSlot() {
    const slots = document.querySelectorAll(".team-slot");
    slots.forEach((slot, index) => {
        if (index === activeSlotIndex) {
            slot.classList.add("active");
        } else {
            slot.classList.remove("active");
        }
    });
}
