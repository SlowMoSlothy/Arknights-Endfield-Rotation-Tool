function renderSelectedOperators() {
    const container = document.getElementById("selectedOperators");
    if (!container) return;

    container.innerHTML = "";

    selectedTeam.forEach((id, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "team-preview-slot";
        item.setAttribute("aria-label", id === null
            ? `Operator fuer Slot ${index + 1} auswaehlen`
            : `Operator in Slot ${index + 1} aendern`);
        item.addEventListener("click", () => openTeamSelectionModal(index));

        if (id === null) {
            item.classList.add("empty");
            item.innerHTML = `<span class="team-preview-plus">+</span>`;
            container.appendChild(item);
            return;
        }

        const op = operators.find(o => o.id === id);
        if (!op) {
            item.classList.add("empty");
            item.innerHTML = `<span class="team-preview-plus">+</span>`;
            container.appendChild(item);
            return;
        }

        item.classList.add("team-preview-operator");
        item.dataset.operatorId = String(op.id);

        const header = document.createElement("div");
        header.className = "team-preview-header";

        const img = document.createElement("img");
        img.src = op.icon;
        img.alt = op.name;
        img.title = "Team aendern";

        const name = document.createElement("div");
        name.textContent = op.name;

        header.appendChild(img);
        header.appendChild(name);

        const buffContainer = document.createElement("div");
        buffContainer.className = "operator-buffs";

        item.appendChild(header);
        item.appendChild(buffContainer);

        if (typeof createOperatorEquipmentSummary === "function") {
            const equipmentSummary = createOperatorEquipmentSummary(op.id);
            if (equipmentSummary) item.appendChild(equipmentSummary);
        }

        container.appendChild(item);
    });
}
