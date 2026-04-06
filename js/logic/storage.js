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
function saveRotation() {
    localStorage.setItem("rotation", JSON.stringify(rotation));
    renderRotation();
}

function loadRotation() {
    const saved = localStorage.getItem("rotation");
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
            rotation = new Array(10).fill(null);
            parsed.slice(0, 10).forEach((entry, index) => {
                rotation[index] = entry ?? null;
            });
        }
    } catch (error) {
        console.error("Rotation konnte nicht geladen werden:", error);
        rotation = new Array(10).fill(null);
    }
}
function clearRotation() {
    rotation = new Array(10).fill(null);
    localStorage.removeItem("rotation");
    renderRotation();
}