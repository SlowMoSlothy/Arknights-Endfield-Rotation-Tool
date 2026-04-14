function exportImage() {
    const element = document.getElementById("rotationDropZone");
    if (!element) return;

    const previousClass = element.className;
    const previousStyle = element.getAttribute("style") || "";

    // Für Export volle Breite des Inhalts erzwingen
    element.classList.add("export-mode");

// NEU
element.style.overflow = "visible";
element.style.width = "max-content";
element.style.maxWidth = "none";

// 👉 Hintergrund + Abstand
element.style.background = "#000";
element.style.padding = "20px";
element.style.borderRadius = "12px";

    html2canvas(element, {
        backgroundColor: #000,
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "rotation.png";
        link.href = canvas.toDataURL("image/png");
        link.click();

        element.className = previousClass;
        element.setAttribute("style", previousStyle);
    }).catch(err => {
        console.error("Export failed:", err);
        element.className = previousClass;
        element.setAttribute("style", previousStyle);
    });
}