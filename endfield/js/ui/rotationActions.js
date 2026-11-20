let rotationActionsMedia = null;

function isMobileRotationActions() {
    return rotationActionsMedia?.matches === true;
}

function closeRotationActions(restoreFocus = false) {
    const menu = document.getElementById("rotationActionsMenu");
    const toggle = document.getElementById("rotationActionsToggle");
    if (!menu || !toggle) return;
    const wasOpen = !menu.hidden;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (wasOpen && restoreFocus) toggle.focus();
}

function initRotationActions() {
    const controls = document.getElementById("rotationActionControls");
    const host = document.getElementById("rotationActionsHost");
    const toggle = document.getElementById("rotationActionsToggle");
    const menu = document.getElementById("rotationActionsMenu");
    const toolbar = document.querySelector("#rotationBuilderPanel > .rotation-actions");
    if (!controls || !host || !toggle || !menu || !toolbar || rotationActionsMedia) return;

    const desktopOrder = [...controls.children];
    const mobileOrder = ["copyShareLinkBtn", "copyShareCodeBtn", "saveRotationMenuBtn"]
        .map(id => document.getElementById(id)?.closest(".rotation-action-tooltip-host"));
    rotationActionsMedia = window.matchMedia("(max-width: 900px)");
    const syncLayout = () => {
        const mobile = isMobileRotationActions();
        const active = document.activeElement;
        const controlHadFocus = controls.contains(active);
        closeRotationActions();
        closeRotationSaveMenu();
        // Reuse the actual controls so disabled states and existing actions stay in sync.
        (mobile ? menu : toolbar).appendChild(controls);
        const order = mobile ? [...mobileOrder.filter(Boolean), ...desktopOrder.filter(item => !mobileOrder.includes(item))] : desktopOrder;
        order.forEach(item => controls.appendChild(item));
        const saveButton = document.getElementById("saveRotationMenuBtn");
        if (saveButton) {
            saveButton.setAttribute("aria-label", mobile ? "Save to My Rotations" : "Save Rotation in...");
            saveButton.setAttribute("aria-haspopup", mobile ? "dialog" : "menu");
        }
        if (mobile && controlHadFocus) toggle.focus();
        if (!mobile && (controlHadFocus || active === toggle)) {
            (controlHadFocus ? active : controls.querySelector("button:not(:disabled)"))?.focus();
        }
    };

    toggle.addEventListener("click", () => {
        if (!isMobileRotationActions()) return;
        const open = menu.hidden;
        menu.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        if (open) controls.querySelector("button:not(:disabled)")?.focus();
    });
    controls.addEventListener("click", event => {
        if (isMobileRotationActions() && event.target.closest("button:not(:disabled)")) closeRotationActions(true);
    }, true);
    document.addEventListener("click", event => {
        if (!host.contains(event.target)) closeRotationActions();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !menu.hidden) closeRotationActions(true);
    });
    host.addEventListener("focusout", event => {
        if (event.relatedTarget && !host.contains(event.relatedTarget)) closeRotationActions();
    });
    rotationActionsMedia.addEventListener("change", syncLayout);
    syncLayout();
}
