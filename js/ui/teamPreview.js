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
            item.dataset.operatorId = String(op.id);

            const header = document.createElement("div");
            header.className = "team-preview-header";

            const img = document.createElement("img");
            img.src = op.icon;
            img.alt = op.name;

            const name = document.createElement("div");
            name.textContent = op.name;

            header.appendChild(img);
            header.appendChild(name);

            const buffContainer = document.createElement("div");
            buffContainer.className = "operator-buffs";

            item.appendChild(header);
            item.appendChild(buffContainer);

            container.appendChild(item);
        });
}