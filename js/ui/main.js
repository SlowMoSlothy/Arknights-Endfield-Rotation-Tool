let rotation = [];

// ------------------
// Skills rendern
// ------------------
function renderSkills() {
    const list = document.getElementById("skillList");
    list.innerHTML = "";

    skills.forEach(skill => {
        const div = document.createElement("div");
        div.className = "skill";
        div.textContent = skill.name;
        div.dataset.id = skill.id;

        list.appendChild(div);
    });
}

// ------------------
// Rotation speichern
// ------------------
function saveRotation() {
    const items = document.querySelectorAll("#rotation .skill");

    rotation = Array.from(items).map(el => ({
        id: parseInt(el.dataset.id),
        name: el.textContent.replace(/^\d+\.\s/, "")
    }));

    localStorage.setItem("rotation", JSON.stringify(rotation));
}

// ------------------
// Rotation laden
// ------------------
function loadRotation() {
    const saved = localStorage.getItem("rotation");
    if (!saved) return;

    const container = document.getElementById("rotation");

    JSON.parse(saved).forEach(skill => {
        const div = document.createElement("div");
        div.className = "skill";
        div.textContent = skill.name;
        div.dataset.id = skill.id;

        container.appendChild(div);
    });
}

// ------------------
// Sortable aktivieren
// ------------------
function initDragDrop() {

    // Skills (Quelle)
    new Sortable(document.getElementById("skillList"), {
        group: {
            name: "skills",
            pull: "clone",
            put: false
        },
        sort: false
    });

    // Rotation (Ziel + reorder)
    new Sortable(document.getElementById("rotation"), {
        group: {
            name: "skills",
            pull: true,
            put: true
        },
        animation: 150,

        onAdd: function () {
            updateNumbers();
            saveRotation();
        },

        onUpdate: function () {
            updateNumbers();
            saveRotation();
        }
    });
}

// ------------------
// Nummerierung
// ------------------
function updateNumbers() {
    const items = document.querySelectorAll("#rotation .skill");

    items.forEach((el, index) => {
        const name = el.textContent.replace(/^\d+\.\s/, "");
        el.textContent = `${index + 1}. ${name}`;
    });
}

// ------------------
// Entfernen per Klick
// ------------------
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("skill") &&
        e.target.parentElement.id === "rotation") {

        e.target.remove();
        updateNumbers();
        saveRotation();
    }
});

// ------------------
// Init
// ------------------
renderSkills();
initDragDrop();
loadRotation();
updateNumbers();