const DEBUFF_REGISTRY = {
    electric_infliction: {
        name: "Electric Infliction",
        iconBase: "assets/ui/debuffs/electric_infliction",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    electrification: {
        name: "Electrificationtric",
        iconBase: "assets/ui/debuffs/electrification",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    arts_infliction: {
        name: "Arts Infliction",
        iconBase: "assets/ui/debuffs/arts",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    heat_infliction: {
        name: "Heat Infliction",
        iconBase: "assets/ui/debuffs/heat_infliction",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    cryo_infliction: {
        name: "Cryo Infliction",
        iconBase: "assets/ui/debuffs/cryo_infliction",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    nature_infliction: {
        name: "Nature Infliction",
        iconBase: "assets/ui/debuffs/nature_infliction",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    vulnerable: {
        name: "Vulnerable",
        iconBase: "assets/ui/debuffs/vulnerable",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    final_strike: {
        name: "Final Strike",
        icon: "assets/ui/debuffs/final_strike.png"
    }
};

function normalizeDebuffKey(debuffData) {
    return String(
        debuffData?.id ||
        debuffData?.appliesEffect ||
        debuffData?.name ||
        ""
    ).trim().toLowerCase().replace(/\s+/g, "_");
}

function getDebuffStackCount(debuffData, registryEntry) {
    const rawStack =
        debuffData?.stackCount ??
        debuffData?.currentStacks ??
        debuffData?.stacks ??
        debuffData?.stacksApplied ??
        1;

    const stack = Number(rawStack);
    const maxStacks = Number(debuffData?.maxStacks || registryEntry?.maxStacks || 4);

    if (!Number.isFinite(stack)) return 1;
    return Math.max(1, Math.min(stack, maxStacks));
}

function resolveDebuffIcon(debuffData) {
    if (!debuffData) return null;

    if (debuffData.icon) {
        return debuffData.icon;
    }

    const key = normalizeDebuffKey(debuffData);
    const registryEntry = DEBUFF_REGISTRY[key];

    if (!registryEntry) return null;

    if (registryEntry.icon) {
        return registryEntry.icon;
    }

    if (registryEntry.stackable && registryEntry.iconBase) {
        const stack = getDebuffStackCount(debuffData, registryEntry);
        const extension = registryEntry.extension || "png";
        return `${registryEntry.iconBase}_${stack}.${extension}`;
    }

    if (registryEntry.iconBase) {
        const extension = registryEntry.extension || "png";
        return `${registryEntry.iconBase}.${extension}`;
    }

    return null;
}

function getDebuffDisplayName(debuffData) {
    const key = normalizeDebuffKey(debuffData);
    return debuffData?.name || DEBUFF_REGISTRY[key]?.name || debuffData?.id || "Debuff";
}