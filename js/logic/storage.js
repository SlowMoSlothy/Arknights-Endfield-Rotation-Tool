function saveTeam() {
    localStorage.setItem("team", JSON.stringify(selectedTeam));
}

function loadTeam() {
    const saved = localStorage.getItem("team");
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        selectedTeam = [null, null, null, null];

        if (Array.isArray(parsed)) {
            parsed.slice(0, 4).forEach((id, index) => {
                selectedTeam[index] = id ?? null;
            });
        }
    } catch (error) {
        console.error("Team konnte nicht geladen werden:", error);
        selectedTeam = [null, null, null, null];
    }
}
function loadOperatorUltimateStates() {
    const saved = localStorage.getItem("operatorUltimateStates");
    if (!saved) {
        operatorUltimateStates = {};
        return;
    }

    try {
        const parsed = JSON.parse(saved);
        operatorUltimateStates = parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        console.error("Ultimate states could not be loaded:", error);
        operatorUltimateStates = {};
    }
}
function saveRotation() {
    localStorage.setItem("rotation", JSON.stringify(rotation));
    localStorage.setItem("operatorUltimateStates", JSON.stringify(operatorUltimateStates));
    renderRotation();
}

function loadRotation() {
    const saved = localStorage.getItem("rotation");

    // Wenn nichts gespeichert ist: genau 1 leerer Slot
    if (!saved) {
        rotation = [null];
        return;
    }

    try {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed) && parsed.length > 0) {
            rotation = [...parsed];

            // Mindestens 1 Slot behalten
            if (rotation.length === 0) {
                rotation = [null];
            }
        } else {
            rotation = [null];
        }
    } catch (error) {
        console.error("Rotation konnte nicht geladen werden:", error);
        rotation = [null];
    }
}

function clearRotation() {
    operatorUltimateStates = {};
    localStorage.removeItem("operatorUltimateStates");
    rotation = [null];
    localStorage.removeItem("rotation");
    renderRotation();
}