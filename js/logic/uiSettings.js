const UI_SIZE_OPTIONS = {
    small: "small",
    medium: "medium",
    large: "large",
    xl: "xl",
    xxl: "xxl"
};

let uiSettings = {
    rotationSkillSize: UI_SIZE_OPTIONS.medium
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

    // 🔥 automatisch alle size Klassen entfernen
    Object.values(UI_SIZE_OPTIONS).forEach(size => {
        root.classList.remove(`rotation-size-${size}`);
    });

    const size = uiSettings.rotationSkillSize || UI_SIZE_OPTIONS.medium;
    root.classList.add(`rotation-size-${size}`);

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
}