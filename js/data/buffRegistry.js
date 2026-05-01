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
        iconBase: "assets/ui/buffs/hypothermic_perfusion",
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