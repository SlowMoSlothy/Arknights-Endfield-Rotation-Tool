let rotationActionsInitialized = false;

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
    if (!controls || !host || !toggle || !menu || rotationActionsInitialized) return;
    rotationActionsInitialized = true;

    toggle.addEventListener("click", () => {
        const open = menu.hidden;
        menu.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        if (open) controls.querySelector("button:not(:disabled)")?.focus();
    });
    controls.addEventListener("click", event => {
        if (event.target.closest("button:not(:disabled)")) closeRotationActions(true);
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
}
