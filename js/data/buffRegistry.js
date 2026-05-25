const BUFF_REGISTRY = {
    melting_flames: {
        name: "Melting Flames",
        iconBase: "assets/ui/buffs/laevatain/melting_flames",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    electrification: {
        name: "Electrification",
        iconBase: "assets/ui/buffs/electrification",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    electric_amp: {
        name: "Electric Amp",
        iconBase: "assets/ui/buffs/electric_amp",
        stackable: false,
        maxStacks: 0,
        extension: "svg"
    },
    arts_amp: {
        name: "Arts Amp",
        iconBase: "assets/ui/buffs/arts_amp",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },

    cryo_amp: {
        name: "Cryo Amp",
        iconBase: "assets/ui/buffs/cryo_amp",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    auxiliary_crystal: {
    name: "Auxiliary Crystal",
    iconBase: "assets/operators/skills/xaihi/bs_small",
    stackable: true,
    maxStacks: 2,
    extension: "png",
    consumeOnSkillType: "final_strike",
    consumeStacks: 1,
    onFullyConsumedEffect: "auxiliary_crystal_used_up"
},
    atk_up: {
        name: "ATK Up",
        iconBase: "assets/ui/buffs/atk_up",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    crit_up: {
        name: "Crit Up",
        iconBase: "assets/ui/buffs/crit_up",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    link: {
        name: "Link",
        iconBase: "assets/ui/buffs/link",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    hypothermic_perfusion: {
        name: "Hypothermic Perfusion",
        iconBase: "assets/operators/skills/lastrite/bs_small",
        stackable: false,
        maxStacks: 0,
        extension: "png",
        consumeOnSkillType: "final_strike",
        consumeStacks: 1
    }
    ,
    shield: {
        name: "Shield",
        iconBase: "assets/ui/buffs/ember/shield",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    protection: {
        name: "Protection",
        iconBase: "assets/ui/buffs/protection",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    whirlpool: {
        name: "Whirlpool",
        iconBase: "assets/operators/skills/tangtang/65px-Combo-Tangtang",
        stackable: true,
        maxStacks: 2,
        extension: "webp"
    },
    rossi_crit_buff: {
        name: "Crit Rate / Crit DMG",
        iconBase: "assets/buffs/rossi/crit_buff",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    }
};

function normalizeBuffKey(buffData) {
    return String(
        buffData?.id ||
        buffData?.appliesEffect ||
        buffData?.name ||
        ""
    ).trim().toLowerCase().replace(/\s+/g, "_");
}

function getBuffStackCount(buffData, registryEntry) {
    const rawStack =
        buffData?.stackCount ??
        buffData?.currentStacks ??
        buffData?.stacks ??
        buffData?.stacksApplied ??
        1;

    const stack = Number(rawStack);
    const maxStacks = Number(buffData?.maxStacks || registryEntry?.maxStacks || 4);

    if (!Number.isFinite(stack)) return 1;
    return Math.max(1, Math.min(stack, maxStacks));
}

function resolveBuffIcon(buffData) {
    if (!buffData) return null;

    if (buffData.icon) {
        return buffData.icon;
    }

    const key = normalizeBuffKey(buffData);
    const registryEntry = BUFF_REGISTRY[key];

    if (!registryEntry) return null;

    if (registryEntry.icon) {
        return registryEntry.icon;
    }

    if (registryEntry.stackable && registryEntry.iconBase) {
        const stack = getBuffStackCount(buffData, registryEntry);
        const extension = registryEntry.extension || "png";
        return `${registryEntry.iconBase}_${stack}.${extension}`;
    }

    if (registryEntry.iconBase) {
        const extension = registryEntry.extension || "png";
        return `${registryEntry.iconBase}.${extension}`;
    }

    return null;
}

function getBuffDisplayName(buffData) {
    const key = normalizeBuffKey(buffData);
    return buffData?.name || BUFF_REGISTRY[key]?.name || buffData?.id || "Buff";
}
