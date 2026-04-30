function exportImage() {
    const element = document.getElementById("rotation");
    if (!element) return;

    element.classList.add("export-mode");

    html2canvas(element, {
        backgroundColor: "#121212",
        scale: 2,
        useCORS: true,

        onclone: (clonedDoc) => {
            const clonedRotation = clonedDoc.getElementById("rotation");
            if (!clonedRotation) return;

            clonedRotation.classList.add("export-mode");

            const nodes = [
                clonedRotation,
                ...clonedRotation.querySelectorAll("*")
            ];

            nodes.forEach(node => {
                const style = clonedDoc.defaultView.getComputedStyle(node);

                const colorProps = [
                    "color",
                    "backgroundColor",
                    "borderTopColor",
                    "borderRightColor",
                    "borderBottomColor",
                    "borderLeftColor",
                    "outlineColor",
                    "textDecorationColor"
                ];

                colorProps.forEach(prop => {
                    const value = style[prop];

                    if (value && value.includes("color(")) {
                        if (prop === "color") {
                            node.style[prop] = "#ffffff";
                        } else if (prop === "backgroundColor") {
                            node.style[prop] = "transparent";
                        } else {
                            node.style[prop] = "#555555";
                        }
                    }
                });

                node.style.boxShadow = "none";
                node.style.textShadow = "none";
                node.style.filter = "none";
            });
        }
    }).then(canvas => {
        const link = document.createElement("a");
        link.download = "rotation.png";
        link.href = canvas.toDataURL("image/png");
        link.click();

        element.classList.remove("export-mode");
    }).catch(error => {
        console.error("Export failed:", error);
        element.classList.remove("export-mode");
    });
}