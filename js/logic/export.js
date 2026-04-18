function exportImage() {
    const element = document.getElementById("rotationDropZone");
    if (!element) return;

    const previousClass = element.className;
    const previousStyle = element.getAttribute("style") || "";

    element.classList.add("export-mode");
    element.style.width = "max-content";
    element.style.minWidth = "0";
    element.style.maxWidth = "none";
    element.style.overflow = "visible";
    element.style.background = "#000";
    element.style.padding = "24px";
    element.style.borderRadius = "16px";

    html2canvas(element, {
        backgroundColor: "#000",
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
    }).catch(error => {
        console.error("Export failed:", error);
        element.className = previousClass;
        element.setAttribute("style", previousStyle);
    });
}