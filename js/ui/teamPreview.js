
function renderSelectedOperators() {
    const container = document.getElementById("selectedOperators");
    if (!container) return;

    container.innerHTML = "";

    selectedTeam
        .filter(id => id !== null)
        .forEach(id => {
            const op = operators.find(o => o.id === id);
            if (!op) return;

            const item = document.createElement("div");
            item.className = "team-preview-operator";

            const img = document.createElement("img");
            img.src = op.icon;
            img.alt = op.name;

            const name = document.createElement("div");
            name.textContent = op.name;

            item.appendChild(img);
            item.appendChild(name);
            container.appendChild(item);
        });
}