function log(text) {
    const li = document.createElement("li");
    li.textContent = text;
    document.getElementById("log").appendChild(li);
}

function renderOperators() {
    const container = document.getElementById("operators");
    container.innerHTML = "";

    operators.forEach(op => {
        const div = document.createElement("div");
        div.className = "operator";

        div.innerHTML = `
            <b>${op.name}</b><br>
            Energie: ${op.energy.toFixed(1)} / ${op.maxEnergy}
        `;

        container.appendChild(div);
    });
}

// Game Loop
setInterval(() => {
    time += 0.1;

    regenEnergy();
    autoRotation();
    renderOperators();

}, 100);