// Shared by the classic-script planner and the static catalog generator.
// Display assets only: database identities and original portraits stay intact.
globalThis.ROTATIONFORGE_OPERATOR_PORTRAITS = Object.freeze({
    akekuri: "Akekuri", alesh: "Alesh", antal: "Antal", arcane: "Arcane",
    arclight: "Arclight", ardelia: "Ardelia", argent_flow: "Argent_Flow",
    avywenna: "Avywenna", camille: "Camille", catcher: "Catcher",
    chen_qianyu: "Chen", da_pan: "Dapan", ember: "Ember",
    endministrator: "Endmin", estella: "Estella", fluorite: "Fluorite",
    gilberta: "Gilberta", kay: "Kay", laevatain: "Laevatain",
    last_rite: "Last_Rite", lifeng: "Lifeng", liino: "Liino", mi_fu: "Mi_Fu",
    perlica: "Perlica", pogranichnik: "Pogranichnik", purrchena: "Purrchena",
    rossi: "Rossi", si: "Si", snowshine: "Snowshine", tangtang: "Tangtang",
    typhoeus: "typhoeus", wulfgard: "Wulfgard", xaihi: "Xaihi",
    yvonne: "Yvonne", zhuang: "Zhuang"
});

// Large skill portraits can still point at legacy avatar paths. Keep glyphs intact.
globalThis.resolveOperatorPortraitAsset = function (assetPath) {
    if (typeof assetPath !== "string") return assetPath;
    const match = assetPath.match(/^(?:\/?endfield\/|\/)?assets\/operators\/avatars\/([^/]+)\.(?:png|webp|svg)(?:\?[^#]*)?$/i);
    if (!match) return assetPath;
    const name = Object.values(globalThis.ROTATIONFORGE_OPERATOR_PORTRAITS)
        .find(value => value.toLowerCase() === match[1].toLowerCase());
    return name ? `assets/operators/avatars/refined/${name}.png` : assetPath;
};
