function getExportWatermarkUrl() {
    const configuredUrl = typeof builderWatermarkUrl === "string" ? builderWatermarkUrl.trim() : "";
    if (configuredUrl) {
        return configuredUrl.split("#")[0];
    }

    const currentUrl = window.location.href;
    if (currentUrl.startsWith("http://") || currentUrl.startsWith("https://")) {
        return currentUrl.split("#")[0];
    }

    return "";
}

function addExportWatermark(clonedDoc, clonedRotation, url) {
    if (!url) return;

    const watermark = clonedDoc.createElement("div");
    watermark.className = "export-watermark";
    watermark.textContent = `Builder: ${url}`;
    watermark.style.marginTop = "12px";
    watermark.style.paddingLeft = "6px";
    watermark.style.paddingTop = "8px";
    watermark.style.borderTop = "1px solid rgba(160,170,169,0.24)";
    watermark.style.color = "rgba(248,245,70,0.76)";
    watermark.style.fontSize = "11px";
    watermark.style.fontWeight = "700";
    watermark.style.letterSpacing = "0.02em";
    watermark.style.textAlign = "left";
    watermark.style.lineHeight = "1.4";
    watermark.style.whiteSpace = "normal";
    watermark.style.wordBreak = "break-word";
    watermark.style.overflowWrap = "anywhere";
    watermark.style.textShadow = "none";

    clonedRotation.appendChild(watermark);
}

function isLocalFileExportBlocked() {
    return window.location.protocol === "file:";
}

function showExportSecurityMessage() {
    alert(
        "Der Export kann nicht direkt aus einer lokalen file:// Seite erstellt werden.\n\n" +
        "Bitte starte den Builder ueber einen lokalen Webserver oder die GitHub-Pages-Adresse. " +
        "Dann kann der Browser die Bilder sicher in das Export-Bild einbetten."
    );
}

function isCanvasSecurityError(error) {
    return error?.name === "SecurityError" ||
        String(error?.message || "").toLowerCase().includes("tainted");
}

function exportImage() {
    const element = document.getElementById("rotation");
    if (!element) return;

    if (isLocalFileExportBlocked()) {
        showExportSecurityMessage();
        return;
    }

    const watermarkUrl = getExportWatermarkUrl();

    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    const originalOverflow = element.style.overflow;

    const exportWidth = Math.ceil(Math.max(element.scrollWidth, element.offsetWidth));
    const exportHeight = Math.ceil(Math.max(element.scrollHeight, element.offsetHeight)) + (watermarkUrl ? 80 : 0);
    element.classList.add("export-mode");
    element.style.width = `${exportWidth}px`;
    element.style.maxWidth = "none";
    element.style.overflow = "visible";

    html2canvas(element, {
        backgroundColor: "#121212",
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: exportWidth,
        windowHeight: exportHeight,
        width: exportWidth,
        height: exportHeight,

        onclone: (clonedDoc) => {
            const clonedRotation = clonedDoc.getElementById("rotation");
            if (!clonedRotation) return;

            clonedRotation.classList.add("export-mode");
            clonedRotation.style.width = `${exportWidth}px`;
            clonedRotation.style.maxWidth = "none";
            clonedRotation.style.overflow = "visible";

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
    }).catch(error => {
        console.error("Export failed:", error);
        if (isCanvasSecurityError(error)) {
            showExportSecurityMessage();
        }
    }).finally(() => {
        element.style.width = originalWidth;
        element.style.maxWidth = originalMaxWidth;
        element.style.overflow = originalOverflow;
        element.classList.remove("export-mode");
    });
}
