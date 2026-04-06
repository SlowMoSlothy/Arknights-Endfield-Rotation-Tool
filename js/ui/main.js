let rotation = new Array(10).fill(null);
let selectedTeam = [null, null, null, null];
let activeSlotIndex = null;
let skillSourceSortables = [];
let slotSortables = [];

function getSkillById(id) {
    for (const op of operators) {
        const skill = op.skills.find(s => s.id === id);
        if (skill) return { ...skill, operator: op.name };
    }
    return null;
}

function confirmTeam() {
    const team = selectedTeam.filter(x => x !== null);

    if (team.length === 0) {
        alert("Bitte mindestens einen Operator wählen!");
        return;
    }

    saveTeam();

    document.getElementById("selectionScreen").style.display = "none";
    document.getElementById("builderScreen").style.display = "block";

    renderSelectedOperators();
    renderSkills();
    renderRotation();
    initSkillDragDrop();
}

function backToSelection() {
    document.getElementById("selectionScreen").style.display = "block";
    document.getElementById("builderScreen").style.display = "none";
}

function exportImage() {
    const element = document.getElementById("rotation");
    if (!element) return;

    element.classList.add("export-mode");

    html2canvas(element, {
        backgroundColor: "#121212",
        scale: 2,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "rotation.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        element.classList.remove("export-mode");
    }).catch(error => {
        console.error("Export fehlgeschlagen:", error);
        element.classList.remove("export-mode");
    });
}

window.exportImage = exportImage;
window.confirmTeam = confirmTeam;
window.backToSelection = backToSelection;
window.clearRotation = clearRotation;

loadTeam();
loadRotation();
renderTeamSlots();
renderOperatorList();