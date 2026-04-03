let rotation = [];
let selectedTeam = [];

function renderTeamSelection() {
    const container = document.getElementById("teamSelection");
    container.innerHTML = "";

    operators.forEach(op => {

        const label = document.createElement("label");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = op.id;

        checkbox.checked = selectedTeam.includes(op.id);

        checkbox.onchange = () => {

            if (checkbox.checked) {
                if (selectedTeam.length >= 3) {
                    checkbox.checked = false;
                    alert("Maximal 3 Operatoren!");
                    return;
                }
                selectedTeam.push(op.id);
            } else {
                selectedTeam = selectedTeam.filter(id => id !== op.id);
            }

            saveTeam();
            renderSkills();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" " + op.name));

        container.appendChild(label);
    });
}

// Skill suchen
function getSkillById(id) {
    for (const op of operators) {
        const skill = op.skills.find(s => s.id === id);
        if (skill) return { ...skill, operator: op.name };
    }
    return null;
}

function saveTeam() {
    localStorage.setItem("team", JSON.stringify(selectedTeam));
}

function loadTeam() {
    const saved = localStorage.getItem("team");
    if (saved) {
        selectedTeam = JSON.parse(saved);
    }
}

// Skills anzeigen
function renderSkills() {
    const list = document.getElementById("skillList");
    list.innerHTML = "";

    const activeOperators = operators.filter(op =>
        selectedTeam.includes(op.id)
    );

    activeOperators.forEach(op => {

        const title = document.createElement("h4");
        title.textContent = op.name;
        list.appendChild(title);

        op.skills.forEach(skill => {

            const div = document.createElement("div");
            div.className = "skill";
            div.dataset.id = skill.id;

            const inner = document.createElement("div");
            inner.className = "skill-inner";

            const img = document.createElement("img");
            img.src = skill.icon;

            inner.appendChild(img);
            div.appendChild(inner);

            list.appendChild(div);
        });
    });
}

// Grid rendern
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
            row.style.justifyContent = "flex-end";
        } else {
            row.style.justifyContent = "flex-start";
        }

        rowItems.forEach((entry, index) => {

            const skillData = getSkillById(entry.id);

            const skillDiv = document.createElement("div");
            skillDiv.className = "skill";
            skillDiv.dataset.id = entry.id;
            skillDiv.dataset.uid = entry.uid;

            const inner = document.createElement("div");
            inner.className = "skill-inner";

            const img = document.createElement("img");
            img.src = skillData.icon;

            inner.appendChild(img);
            skillDiv.appendChild(inner);

            // ❌
            const removeBtn = document.createElement("div");
            removeBtn.className = "remove-btn";
            removeBtn.textContent = "×";

            removeBtn.onclick = (e) => {
                e.stopPropagation();
                rotation = rotation.filter(s => s.uid !== entry.uid);
                localStorage.setItem("rotation", JSON.stringify(rotation));
                renderRotationGrid();
            };

            skillDiv.appendChild(removeBtn);

            // Tooltip
            const tooltip = document.createElement("div");
            tooltip.className = "tooltip";
            tooltip.innerHTML = `
                <b>${skillData.name}</b><br>
                <i>${skillData.operator}</i><br>
                CD: ${skillData.cooldown}s<br>
                Energy: ${skillData.energy}
            `;

            skillDiv.appendChild(tooltip);

            row.appendChild(skillDiv);

            if (index < rowItems.length - 1) {
                const arrow = document.createElement("div");
                arrow.className = "arrow";
                arrow.textContent = isReverse ? "←" : "→";
                row.appendChild(arrow);
            }
        });

        grid.appendChild(row);

        // ↓ Pfeil exakt positionieren
        if (i + chunkSize < rotation.length) {

            const downWrapper = document.createElement("div");
            downWrapper.className = "arrow down";

            const arrow = document.createElement("span");
            arrow.textContent = "↓";

            grid.appendChild(downWrapper);
            downWrapper.appendChild(arrow);

            setTimeout(() => {

                const skills = row.querySelectorAll(".skill");
                const target = isReverse ? skills[0] : skills[skills.length - 1];

                const rowRect = row.getBoundingClientRect();
                const skillRect = target.getBoundingClientRect();

                const offset = skillRect.left - rowRect.left + skillRect.width / 2;
                arrow.style.left = offset + "px";

            }, 0);
        }
    }

    container.appendChild(grid);
}

// Drag & Drop
function initDragDrop() {
    new Sortable(document.getElementById("skillList"), {
        group: { name: "skills", pull: "clone", put: false },
        sort: false
    });

    new Sortable(document.getElementById("rotation"), {
        group: "skills",
        animation: 150,
        onAdd: (evt) => {
            evt.item.dataset.uid = crypto.randomUUID();
            saveRotation();
        },
        onUpdate: saveRotation
    });
}

// Speichern
function saveRotation() {
    const items = document.querySelectorAll("#rotation .skill");

    rotation = Array.from(items).map(el => ({
        uid: el.dataset.uid,
        id: parseInt(el.dataset.id)
    }));

    localStorage.setItem("rotation", JSON.stringify(rotation));
    renderRotationGrid();
}

// Laden
function loadRotation() {
    const saved = localStorage.getItem("rotation");
    if (!saved) return;

    rotation = JSON.parse(saved);
    renderRotationGrid();
}

// Export
function exportImage() {
    const element = document.getElementById("rotation");

    element.classList.add("export-mode");

    html2canvas(element, {
        backgroundColor: "#121212",
        scale: 2
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "rotation.png";
        link.href = canvas.toDataURL();
        link.click();

        element.classList.remove("export-mode");
    });
}

window.exportImage = exportImage;

// Init
loadTeam();
renderTeamSelection();
renderSkills();
initDragDrop();
loadRotation();