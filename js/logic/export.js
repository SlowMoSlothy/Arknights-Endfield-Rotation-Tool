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

function getExportTeamOperators() {
    if (!Array.isArray(selectedTeam) || !Array.isArray(operators)) {
        return [];
    }

    return selectedTeam
        .map(operatorId => operators.find(operator => operator.id === operatorId))
        .filter(Boolean);
}

function getExportTeamWidth(teamOperators) {
    if (!teamOperators.length) return 0;
    return 74 + (teamOperators.length * 156) + ((teamOperators.length - 1) * 10);
}

function getExportElementColor(elementType) {
    const colors = {
        cryo: "#56d8ff",
        electric: "#f8f546",
        heat: "#ff5a4a",
        nature: "#53ff8c",
        physical: "#d0d4d8",
        neutral: "#a0aaa9"
    };

    return colors[String(elementType || "neutral").toLowerCase()] || colors.neutral;
}

function preloadExportTeamImages(teamOperators) {
    return Promise.all(teamOperators.map(operator => new Promise(resolve => {
        if (!operator?.icon) {
            resolve();
            return;
        }

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = resolve;
        image.onerror = resolve;
        image.src = new URL(operator.icon, document.baseURI).href;

        if (image.complete) {
            resolve();
        }
    })));
}

function createExportTeamStrip(targetDoc, teamOperators) {
    if (!teamOperators.length) return null;

    const teamStrip = targetDoc.createElement("div");
    teamStrip.className = "export-team-strip";
    teamStrip.style.display = "flex";
    teamStrip.style.alignItems = "center";
    teamStrip.style.gap = "10px";
    teamStrip.style.margin = "0 0 18px";
    teamStrip.style.padding = "0 0 18px";
    teamStrip.style.borderBottom = "1px solid rgba(160,170,169,0.22)";
    teamStrip.style.whiteSpace = "nowrap";

    const label = targetDoc.createElement("div");
    label.textContent = "Team";
    label.style.color = "#F8F546";
    label.style.fontSize = "13px";
    label.style.fontWeight = "900";
    label.style.letterSpacing = "0.04em";
    label.style.textTransform = "uppercase";
    label.style.paddingRight = "6px";
    teamStrip.appendChild(label);

    teamOperators.forEach((operator, index) => {
        const color = getExportElementColor(operator.elementType);
        const card = targetDoc.createElement("div");
        card.style.width = "146px";
        card.style.height = "58px";
        card.style.display = "flex";
        card.style.alignItems = "center";
        card.style.gap = "8px";
        card.style.padding = "6px 9px 6px 6px";
        card.style.boxSizing = "border-box";
        card.style.borderRadius = "10px";
        card.style.border = `1px solid ${index === 0 ? "#F8F546" : "rgba(160,170,169,0.28)"}`;
        card.style.background = "linear-gradient(180deg, rgba(30,34,36,0.96), rgba(10,12,14,0.98))";
        card.style.overflow = "hidden";

        const avatarWrap = targetDoc.createElement("div");
        avatarWrap.style.width = "44px";
        avatarWrap.style.height = "44px";
        avatarWrap.style.flex = "0 0 44px";
        avatarWrap.style.borderRadius = "9px";
        avatarWrap.style.overflow = "hidden";
        avatarWrap.style.border = `1px solid ${color}`;
        avatarWrap.style.background = "rgba(0,0,0,0.5)";

        const image = targetDoc.createElement("img");
        image.src = new URL(operator.icon, document.baseURI).href;
        image.alt = operator.name;
        image.crossOrigin = "anonymous";
        image.style.width = "100%";
        image.style.height = "100%";
        image.style.objectFit = "cover";
        image.style.display = "block";
        avatarWrap.appendChild(image);
        card.appendChild(avatarWrap);

        const textWrap = targetDoc.createElement("div");
        textWrap.style.minWidth = "0";
        textWrap.style.flex = "1 1 auto";
        textWrap.style.display = "flex";
        textWrap.style.flexDirection = "column";
        textWrap.style.alignItems = "flex-start";
        textWrap.style.justifyContent = "center";
        textWrap.style.gap = "3px";

        const name = targetDoc.createElement("div");
        name.textContent = operator.name;
        name.style.color = "#ffffff";
        name.style.fontSize = "13px";
        name.style.fontWeight = "900";
        name.style.lineHeight = "1";
        name.style.overflow = "hidden";
        name.style.textOverflow = "ellipsis";
        name.style.whiteSpace = "nowrap";
        textWrap.appendChild(name);

        const accent = targetDoc.createElement("div");
        accent.style.width = "100%";
        accent.style.maxWidth = "58px";
        accent.style.height = "3px";
        accent.style.borderRadius = "999px";
        accent.style.background = color;
        textWrap.appendChild(accent);

        if (index === 0) {
            const role = targetDoc.createElement("div");
            role.textContent = "Leader";
            role.style.color = "#F8F546";
            role.style.fontSize = "9px";
            role.style.fontWeight = "800";
            role.style.lineHeight = "1";
            role.style.textTransform = "uppercase";
            textWrap.appendChild(role);
        }

        card.appendChild(textWrap);
        teamStrip.appendChild(card);
    });

    return teamStrip;
}

function addExportTeamStrip(targetDoc, targetRotation, teamOperators) {
    const teamStrip = createExportTeamStrip(targetDoc, teamOperators);
    if (!teamStrip) return null;

    const dropZone = targetRotation.querySelector("#rotationDropZone");
    targetRotation.insertBefore(teamStrip, dropZone || targetRotation.firstChild);
    return teamStrip;
}

function cleanupExportRotationClone(clonedRotation) {
    clonedRotation.querySelectorAll(".rotation-slot").forEach(slot => {
        if (!slot.querySelector(".rotation-skill")) {
            slot.style.display = "none";
        }
    });

    clonedRotation.querySelectorAll(".rotation-arrow.is-unused").forEach(arrow => {
        arrow.style.display = "none";
    });
}

function addExportWatermark(clonedDoc, clonedRotation, url) {
    if (!url) return;

    const watermark = clonedDoc.createElement("div");
    watermark.className = "export-watermark";
    watermark.textContent = `Builder: ${url}`;
    watermark.style.marginTop = "26px";
    watermark.style.paddingLeft = "6px";
    watermark.style.paddingTop = "10px";
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
    if (!element) return Promise.resolve(false);

    if (typeof hasCreatedRotation === "function" && !hasCreatedRotation()) {
        return Promise.resolve(false);
    }

    if (isLocalFileExportBlocked()) {
        showExportSecurityMessage();
        return Promise.resolve(false);
    }

    const watermarkUrl = getExportWatermarkUrl();
    const exportTeamOperators = getExportTeamOperators();
    const exportTeamHeight = exportTeamOperators.length ? 104 : 0;
    const exportTeamWidth = getExportTeamWidth(exportTeamOperators);

    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    const originalOverflow = element.style.overflow;
    let originalTeamStrip = null;

    element.classList.add("export-mode");

    const exportWidth = Math.ceil(Math.max(element.scrollWidth, element.offsetWidth, exportTeamWidth));
    const exportHeight = Math.ceil(Math.max(element.scrollHeight, element.offsetHeight)) + exportTeamHeight + (watermarkUrl ? 120 : 0);
    const exportViewportWidth = document.documentElement.clientWidth || window.innerWidth || exportWidth;
    element.style.width = `${exportWidth}px`;
    element.style.maxWidth = "none";
    element.style.overflow = "visible";

    originalTeamStrip = addExportTeamStrip(document, element, exportTeamOperators);
    if (originalTeamStrip) {
        originalTeamStrip.style.visibility = "hidden";
    }

    return preloadExportTeamImages(exportTeamOperators).then(() => html2canvas(element, {
        backgroundColor: "#121212",
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: exportViewportWidth,
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

            const clonedTeamStrip = clonedRotation.querySelector(".export-team-strip");
            if (clonedTeamStrip) {
                clonedTeamStrip.style.visibility = "visible";
            }

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

            cleanupExportRotationClone(clonedRotation);
            addExportWatermark(clonedDoc, clonedRotation, watermarkUrl);
        }
    })).then(canvas => {
        const link = document.createElement("a");
        link.download = "rotation.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        return true;
    }).catch(error => {
        console.error("Export failed:", error);
        if (isCanvasSecurityError(error)) {
            showExportSecurityMessage();
        }
        return false;
    }).finally(() => {
        element.style.width = originalWidth;
        element.style.maxWidth = originalMaxWidth;
        element.style.overflow = originalOverflow;
        element.classList.remove("export-mode");
        if (originalTeamStrip) {
            originalTeamStrip.remove();
        }
    });
}
