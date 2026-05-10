function getExportWatermarkUrl() {
    const currentUrl = window.location.href;
    if (currentUrl.startsWith("http://") || currentUrl.startsWith("https://")) {
        return currentUrl.split("#")[0];
    }

    return typeof builderWatermarkUrl === "undefined" ? "" : builderWatermarkUrl;
}

function addExportWatermark(clonedDoc, clonedRotation, url) {
    if (!url) return;

    const watermark = clonedDoc.createElement("div");
    watermark.className = "export-watermark";
    watermark.textContent = `Builder: ${url}`;
    watermark.style.marginTop = "12px";
    watermark.style.paddingTop = "8px";
    watermark.style.borderTop = "1px solid rgba(160,170,169,0.24)";
    watermark.style.color = "rgba(248,245,70,0.76)";
    watermark.style.fontSize = "12px";
    watermark.style.fontWeight = "700";
    watermark.style.letterSpacing = "0.02em";
    watermark.style.textAlign = "right";
    watermark.style.lineHeight = "1.25";
    watermark.style.whiteSpace = "normal";
    watermark.style.overflowWrap = "anywhere";
    watermark.style.textShadow = "none";

    clonedRotation.appendChild(watermark);
}

function exportImage() {
    const element = document.getElementById("rotation");
    if (!element) return;

    const watermarkUrl = getExportWatermarkUrl();

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

            addExportWatermark(clonedDoc, clonedRotation, watermarkUrl);
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
