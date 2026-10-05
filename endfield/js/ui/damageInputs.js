function getDamageInputIssues(team, catalog, loadouts, weaponCatalog, enemy, resolvedEnemy) {
    const loadoutIssues = team.filter(id => id != null).flatMap(id => {
        const operator = catalog.find(item => Number(item.id) === Number(id));
        if (!operator) return [];
        const key = loadouts[String(id)]?.weapon?.key;
        const weapon = weaponCatalog.find(item => item.key === key);
        const issue = !weapon ? "No weapon equipped"
            : !Number.isFinite(Number(operator.baseAtk)) || operator.baseAtk == null || Number(operator.baseAtk) <= 0
                ? "Operator ATK is missing"
                : !Number.isFinite(Number(weapon.baseAtk)) || weapon.baseAtk == null || Number(weapon.baseAtk) <= 0
                    ? "Weapon ATK is missing" : "";
        return issue ? [{ id: operator.id, name: operator.name, issue }] : [];
    });
    const raw = enemy?.combatProfile || {};
    const assumptions = [];
    if (raw.defense == null) assumptions.push(`DEF is unknown; calculations use ${resolvedEnemy.defense}.`);
    const missing = ["physical", "heat", "cryo", "electric", "nature", "aether"]
        .filter(element => raw.resistanceMultipliers?.[element] == null);
    if (missing.length) assumptions.push(`Unknown ${missing.join(", ")} resistance: calculations assume 0% resistance.`);
    return { loadoutIssues, assumptions, enemyName: enemy?.name || "No enemy selected", enemyVerified: raw.verified === true };
}

function getCurrentDamageInputIssues() {
    return getDamageInputIssues(selectedTeam, operators, operatorLoadouts, weapons,
        getSelectedEnemy(), getEnemyCombatProfile());
}

function getSimulationDamageInputIssue(event) {
    const id = event?.sourceOperatorId ?? event?.skillData?.operatorId;
    if (id == null || typeof operators === "undefined" || typeof weapons === "undefined") return "";
    return getDamageInputIssues([id], operators, operatorLoadouts, weapons, null, { defense: 100 })
        .loadoutIssues[0]?.issue || "";
}

function createSimulationDamageInputDetails(state, beforeNavigate) {
    const panel = document.createElement("section");
    panel.className = "damage-input-details";
    panel.setAttribute("aria-label", "Damage calculation inputs");
    const title = document.createElement("strong");
    title.textContent = state.loadoutIssues.length ? "Loadout incomplete — damage results are not ready"
        : state.assumptions.length ? "Damage uses estimated enemy values" : "Enemy values have not been verified";
    panel.appendChild(title);
    if (state.loadoutIssues.length) {
        const explanation = document.createElement("p");
        explanation.textContent = "Some operators are missing a weapon or ATK data. Their damage can appear as 0, so team totals and DPS are incomplete.";
        panel.appendChild(explanation);
        const list = document.createElement("ul");
        state.loadoutIssues.forEach(issue => {
            const row = document.createElement("li");
            const label = document.createElement("span");
            label.textContent = `${issue.name}: ${issue.issue}.`;
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = `Open ${issue.name}'s loadout`;
            button.addEventListener("click", () => {
                beforeNavigate();
                openOperatorLoadoutModal(issue.id);
            });
            row.append(label, button);
            list.appendChild(row);
        });
        panel.appendChild(list);
    }
    const enemy = document.createElement("p");
    enemy.textContent = `${state.enemyName}: ${state.assumptions.length
        ? state.assumptions.join(" ")
        : state.enemyVerified ? "Enemy values are verified." : "Enemy values are recorded but have not been verified."}`;
    panel.appendChild(enemy);
    const chooseEnemy = document.createElement("button");
    chooseEnemy.type = "button";
    chooseEnemy.textContent = "Review enemy";
    chooseEnemy.addEventListener("click", () => {
        beforeNavigate();
        document.getElementById("selectEnemyBtn")?.click();
    });
    panel.appendChild(chooseEnemy);
    return panel;
}

function openSimulationDamageInputDialog(trigger) {
    if (document.querySelector(".damage-input-dialog")) return;
    const dialog = document.createElement("dialog");
    dialog.className = "damage-input-dialog";
    dialog.setAttribute("aria-labelledby", "damageInputDialogTitle");
    const heading = document.createElement("div");
    heading.className = "damage-input-dialog-heading";
    const title = document.createElement("h2");
    title.id = "damageInputDialogTitle";
    title.textContent = "Damage calculation inputs";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close calculation details");
    close.addEventListener("click", () => dialog.close());
    heading.append(title, close);
    let navigating = false;
    const details = createSimulationDamageInputDetails(getCurrentDamageInputIssues(), () => {
        navigating = true;
        dialog.close();
    });
    dialog.append(heading, details);
    dialog.addEventListener("close", () => {
        dialog.remove();
        if (!navigating) {
            const returnTarget = trigger.isConnected ? trigger : document.querySelector(".damage-input-open");
            returnTarget?.focus();
        }
    });
    dialog.addEventListener("click", event => {
        const rect = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right
            || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    document.body.appendChild(dialog);
    dialog.showModal();
    close.focus();
}

function mountSimulationDamageInputs() {
    document.querySelector(".rotation-sim-damage-inputs")?.remove();
    if (!selectedTeam.some(id => id != null)) return;
    const anchor = document.querySelector("#skillList");
    if (!anchor) return;
    const state = getCurrentDamageInputIssues();
    if (!state.loadoutIssues.length && !state.assumptions.length && state.enemyVerified) return;
    const notice = document.createElement("section");
    notice.className = "rotation-sim-damage-inputs";
    notice.setAttribute("aria-label", "Damage calculation inputs");
    const label = document.createElement("span");
    label.textContent = state.loadoutIssues.length
        ? `Loadout incomplete: ${state.loadoutIssues.length} operator${state.loadoutIssues.length === 1 ? " needs" : "s need"} equipment or ATK data.`
        : state.assumptions.length ? "Damage uses estimated enemy values." : "Enemy values have not been verified.";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "damage-input-open";
    button.textContent = "View details";
    button.setAttribute("aria-haspopup", "dialog");
    button.addEventListener("click", () => openSimulationDamageInputDialog(button));
    notice.append(label, button);
    anchor.insertAdjacentElement("beforebegin", notice);
}
