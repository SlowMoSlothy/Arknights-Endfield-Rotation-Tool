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
        div.dataset.id = skill.id;

        const img = document.createElement("img");
        img.src = skill.icon;
        img.title = skill.name;

        div.appendChild(img);
        list.appendChild(div);
    });
}

// ------------------
// Rotation speichern
// ------------------
function saveRotation() {
    const items = document.querySelectorAll("#rotation .skill");

    rotation = Array.from(items).map(el => ({
        uid: el.dataset.uid || crypto.randomUUID(),
        id: parseInt(el.dataset.id)
    }));

    localStorage.setItem("rotation", JSON.stringify(rotation));
    renderRotationGrid();
}

// ------------------
// Rotation laden
// ------------------
function loadRotation() {
    const saved = localStorage.getItem("rotation");
    if (!saved) return;

    rotation = JSON.parse(saved);
    renderRotationGrid();
}

// ------------------
// Grid Rendering
// ------------------
function renderRotationGrid() {
    const container = document.getElementById("rotation");
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "rotation-grid";

    const chunkSize = 5;

    for (let i = 0; i < rotation.length; i += chunkSize) {

        let rowItems = rotation.slice(i, i + chunkSize);
        const row = document.createElement("div");
        row.className = "rotation-row";

        const isReverse = (i / chunkSize) % 2 === 1;

        if (isReverse) {
            rowItems = [...rowItems].reverse();
        }

        rowItems.forEach((entry, index) => {

            const skillData = skills.find(s => s.id === entry.id);

            const skillDiv = document.createElement("div");
            skillDiv.className = "skill";
            skillDiv.dataset.id = entry.id;
            skillDiv.dataset.uid = entry.uid;

            const img = document.createElement("img");
            img.src = skillData.icon;
            img.title = skillData.name;

            // ❌ Remove Button
            const removeBtn = document.createElement("div");
            removeBtn.className = "remove-btn";
            removeBtn.textContent = "×";

            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation();

                const uid = skillDiv.dataset.uid;
                rotation = rotation.filter(s => s.uid !== uid);

                localStorage.setItem("rotation", JSON.stringify(rotation));
                renderRotationGrid();
            });

            skillDiv.appendChild(img);
            skillDiv.appendChild(removeBtn);

            row.appendChild(skillDiv);

            // → oder ←
            if (index < rowItems.length - 1) {
                const arrow = document.createElement("div");
                arrow.className = "arrow";
                arrow.textContent = isReverse ? "←" : "→";
                row.appendChild(arrow);
            }
        });

        grid.appendChild(row);

        // ↓ Pfeil
        if (i + chunkSize < rotation.length) {
            const downWrapper = document.createElement("div");
            downWrapper.className = "arrow down " + (isReverse ? "left" : "right");

            const arrow = document.createElement("div");
            arrow.textContent = "↓";

            downWrapper.appendChild(arrow);
            grid.appendChild(downWrapper);
        }
    }

    container.appendChild(grid);
}

// ------------------
// Drag & Drop
// ------------------
function initDragDrop() {

    new Sortable(document.getElementById("skillList"), {
        group: {
            name: "skills",
            pull: "clone",
            put: false
        },
        sort: false
    });

    new Sortable(document.getElementById("rotation"), {
        group: {
            name: "skills",
            pull: true,
            put: true
        },
        animation: 150,

        onAdd: function (evt) {
            const el = evt.item;

            el.dataset.uid = crypto.randomUUID();

            saveRotation();
        },

        onUpdate: function () {
            saveRotation();
        }
    });
}

function exportImage() {
    const element = document.getElementById("rotation");

    // 👉 Export-Modus aktivieren
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

        // 👉 Export-Modus wieder entfernen
        element.classList.remove("export-mode");

    });
}
// ------------------
// Init
// ------------------
renderSkills();
initDragDrop();
loadRotation();
window.exportImage = exportImage;