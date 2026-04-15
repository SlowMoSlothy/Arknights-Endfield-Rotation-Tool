function normalizeSkillElementType(elementType) {
    if (!elementType) return "neutral";

    const key = String(elementType).trim().toLowerCase();

    const map = {
        // HEAT
        heat: "heat",
        fire: "heat",
        burn: "heat",

        // CRYO
        cryo: "cryo",
        ice: "cryo",
        frost: "cryo",

        // ELECTRIC (Elektro = gelb)
        electric: "electric",
        electro: "electric",
        thunder: "electric",
        lightning: "electric",

        // NATURE
        nature: "nature",
        plant: "nature",
        poison: "nature",

        // PHYSICAL
        physical: "physical",
        neutral: "physical",

        // optional fallback
        default: "neutral"
    };

    return map[key] || "neutral";
}

function getSkillFillMode(skillData) {
    if (skillData.fillMode) {
        return skillData.fillMode === "full" ? "full" : "half";
    }

    const type = String(skillData.type || "").trim().toLowerCase();
    return type === "ultimate" ? "full" : "half";
}

function createSkillIcon(skillData, options = {}) {
    const {
        size = "small",
        useSmallIcon = true,
        extraClasses = []
    } = options;

    const elementType = normalizeSkillElementType(skillData.elementType);
    const fillMode = getSkillFillMode(skillData);

    const root = document.createElement("div");
    root.className = [
        "ef-skill-icon",
        `ef-size-${size}`,
        `ef-element-${elementType}`,
        `ef-fill-${fillMode}`,
        ...extraClasses
    ].join(" ");

    const bg = document.createElement("div");
    bg.className = "ef-skill-fill";

    const ring = document.createElement("div");
    ring.className = "ef-skill-ring";

    const glyphWrap = document.createElement("div");
    glyphWrap.className = "ef-skill-glyph-wrap";

    const img = document.createElement("img");
    img.className = "ef-skill-glyph";
    img.src = useSmallIcon ? (skillData.iconSmall || skillData.icon) : skillData.icon;
    img.alt = skillData.name || "Skill";
    img.draggable = false;

    glyphWrap.appendChild(img);
    root.appendChild(bg);
    root.appendChild(ring);
    root.appendChild(glyphWrap);

    return root;
}