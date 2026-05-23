const UI_SIZE_OPTIONS = {
    medium: "medium",
    large: "large",
    xl: "xl",
    xxl: "xxl"
};

const TIMELINE_MODE_OPTIONS = {
    slot: "slot",
    simulation: "simulation"
};

const DEFAULT_SIMULATION_SP_PER_SECOND = 8;

let uiSettings = {
    rotationSkillSize: UI_SIZE_OPTIONS.medium,
    timelineMode: TIMELINE_MODE_OPTIONS.slot,
    simulationSpPerSecond: DEFAULT_SIMULATION_SP_PER_SECOND,
    simulationDurationSeconds: null
};

function loadUiSettings() {
    const saved = localStorage.getItem("uiSettings");
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
            uiSettings = {
                ...uiSettings,
                ...parsed
            };
        }
    } catch (error) {
        console.error("UI settings could not be loaded:", error);
    }
}

function saveUiSettings() {
    localStorage.setItem("uiSettings", JSON.stringify(uiSettings));
}

function applyUiSettings() {
    const root = document.documentElement;
    root.classList.remove("rotation-size-small");

    // 🔥 automatisch alle size Klassen entfernen
    Object.values(UI_SIZE_OPTIONS).forEach(size => {
        root.classList.remove(`rotation-size-${size}`);
    });

    const size = Object.values(UI_SIZE_OPTIONS).includes(uiSettings.rotationSkillSize)
        ? uiSettings.rotationSkillSize
        : UI_SIZE_OPTIONS.medium;
    uiSettings.rotationSkillSize = size;
    root.classList.add(`rotation-size-${size}`);

    const timelineMode = Object.values(TIMELINE_MODE_OPTIONS).includes(uiSettings.timelineMode)
        ? uiSettings.timelineMode
        : TIMELINE_MODE_OPTIONS.slot;
    uiSettings.timelineMode = timelineMode;
    root.classList.toggle("rotation-mode-simulation", timelineMode === TIMELINE_MODE_OPTIONS.simulation);

    const spPerSecond = Number(uiSettings.simulationSpPerSecond);
    uiSettings.simulationSpPerSecond = Number.isFinite(spPerSecond) && spPerSecond >= 0
        ? spPerSecond
        : DEFAULT_SIMULATION_SP_PER_SECOND;

    const simulationDurationSeconds = Number(uiSettings.simulationDurationSeconds);
    uiSettings.simulationDurationSeconds = Number.isFinite(simulationDurationSeconds) && simulationDurationSeconds > 0
        ? Math.round(simulationDurationSeconds * 10) / 10
        : null;

    updateSettingsUi();
}

function setRotationSkillSize(size) {
    if (!Object.values(UI_SIZE_OPTIONS).includes(size)) return;

    uiSettings.rotationSkillSize = size;
    saveUiSettings();
    applyUiSettings();

    if (typeof renderRotation === "function") {
        renderRotation();
    }
}

function setTimelineMode(mode) {
    if (!Object.values(TIMELINE_MODE_OPTIONS).includes(mode)) return;

    uiSettings.timelineMode = mode;
    saveUiSettings();
    applyUiSettings();

    if (typeof renderRotation === "function") {
        renderRotation();
    }

    if (typeof renderSkills === "function") {
        renderSkills();
    }

    if (typeof initSkillDragDrop === "function") {
        initSkillDragDrop();
    }
}

function setSimulationSpPerSecond(value) {
    const spPerSecond = Number(value);
    if (!Number.isFinite(spPerSecond) || spPerSecond < 0) return;

    uiSettings.simulationSpPerSecond = Math.round(spPerSecond * 10) / 10;
    saveUiSettings();
    applyUiSettings();

    if (typeof renderRotation === "function") {
        renderRotation();
    }
}

function openSettingsModal() {
    const modal = document.getElementById("settingsModal");
    if (!modal) return;

    modal.classList.add("open");
    updateSettingsUi();
}

function closeSettingsModal() {
    const modal = document.getElementById("settingsModal");
    if (!modal) return;

    modal.classList.remove("open");
}

function updateSettingsUi() {
    document.querySelectorAll("[data-setting='rotationSkillSize']").forEach(btn => {
        const value = btn.dataset.value;
        btn.classList.toggle("active", value === uiSettings.rotationSkillSize);
    });

    document.querySelectorAll("[data-setting='timelineMode']").forEach(btn => {
        const value = btn.dataset.value;
        btn.classList.toggle("active", value === uiSettings.timelineMode);
    });

    const spPerSecondInput = document.getElementById("simulationSpPerSecondInput");
    if (spPerSecondInput) {
        spPerSecondInput.value = String(uiSettings.simulationSpPerSecond);
    }
}

function initUiSettings() {
    loadUiSettings();
    applyUiSettings();

    const openBtn = document.getElementById("openSettingsBtn");
    if (openBtn) {
        openBtn.addEventListener("click", openSettingsModal);
    }

    const closeBtn = document.getElementById("closeSettingsBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", closeSettingsModal);
    }

    const modal = document.getElementById("settingsModal");
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeSettingsModal();
            }
        });
    }

    document.querySelectorAll("[data-setting='rotationSkillSize']").forEach(btn => {
        btn.addEventListener("click", () => {
            const value = btn.dataset.value;
            setRotationSkillSize(value);
        });
    });

    document.querySelectorAll("[data-setting='timelineMode']").forEach(btn => {
        btn.addEventListener("click", () => {
            const value = btn.dataset.value;
            setTimelineMode(value);
        });
    });

    const spPerSecondInput = document.getElementById("simulationSpPerSecondInput");
    if (spPerSecondInput) {
        spPerSecondInput.addEventListener("change", () => {
            setSimulationSpPerSecond(spPerSecondInput.value);
        });
    }
}
