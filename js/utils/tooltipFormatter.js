function formatTooltipDescription(text) {
    if (!text) return "";

    const EFFECT_MAP = {
        heat: {
            icon: "assets/debuffs/heat.png",
            label: "Hitze"
        },
        lift: {
            icon: "assets/debuffs/lift.png",
            label: "Lift"
        },
        electric: {
            icon: "assets/debuffs/electric.png",
            label: "Shock"
        },
        nature: {
            icon: "assets/debuffs/nature.png",
            label: "Nature"
        }
    };

    return text.replace(/\[(\w+)\]/g, (match, key) => {
        const effect = EFFECT_MAP[key];
        if (!effect) return match;

        return `
            <span class="tooltip-effect">
                <img class="tooltip-inline-icon" src="${effect.icon}" alt="${key}">
                <span class="effect-text">${effect.label}</span>
            </span>
        `;
    });
}