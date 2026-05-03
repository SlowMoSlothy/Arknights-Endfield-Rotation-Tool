const DEBUFF_REGISTRY = {
    electric_infliction: {
        name: "Electric Infliction",
        iconBase: "assets/ui/debuffs/electric_infliction",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    electrification: {
        name: "Electrification",
        iconBase: "assets/ui/debuffs/electrification",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    electrification_consumed: {
        name: "Electrification consumed",
        iconBase: "assets/ui/debuffs/electrification_consumed",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    combustion: {
        name: "Combustion",
        iconBase: "assets/ui/debuffs/combustion",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    corrosion: {
        name: "Corrosion",
        iconBase: "assets/ui/debuffs/corrosion",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    crush: {
        name: "Crush",
        iconBase: "assets/ui/debuffs/crush",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    solidification: {
        name: "Solidification",
        iconBase: "assets/ui/debuffs/solidification",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    arts_reaction: {
        name: "Arts Reaction",
        iconBase: "assets/ui/debuffs/arts_reaction",
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
    arts_susceptibility: {
        name: "Arts Susceptibility",
        iconBase: "assets/ui/debuffs/arts_susceptibility",
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
    heat_followup: {
        name: "Heat Follow-Up",
        iconBase: "assets/ui/debuffs/heat_followup",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    cryo_infliction: {
        name: "Cryo Infliction",
        iconBase: "assets/ui/debuffs/cryo_infliction",
        stackable: true,
        maxStacks: 4,
        extension: "png"
    },
    cryo_susceptibility: {
        name: "Cryo Susceptibility",
        iconBase: "assets/ui/debuffs/cryo_susceptibility",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    physical_susceptibility: {
        name: "Physical Susceptibility",
        iconBase: "assets/ui/debuffs/physical_susceptibility",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    pull: {
        name: "Pull",
        iconBase: "assets/ui/debuffs/pull",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    auxiliary_crystal: {
        name: "Auxiliary Crystal",
        iconBase: "assets/ui/debuffs/auxiliary_crystal",
        stackable: true,
        maxStacks: 2,
        extension: "png"
    },
    auxiliary_crystal_used_up: {
        name: "Auxiliary Crystal Used Up",
        iconBase: "assets/ui/debuffs/auxiliary_crystal_used_up",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    arts_amp: {
        name: "Arts Amp",
        iconBase: "assets/ui/debuffs/arts_amp",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    cryo_amp: {
        name: "Cryo Amp",
        iconBase: "assets/ui/debuffs/cryo_amp",
        stackable: false,
        maxStacks: 0,
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
    slow: {
        name: "Slow",
        iconBase: "assets/ui/debuffs/slow",
        stackable: false,
        maxStacks: 0,
        extension: "webp"
    },
    lift: {
        name: "Lift",
        iconBase: "assets/ui/debuffs/lift",
        stackable: false,
        maxStacks: 0,
        extension: "svg"
    },
    stagger: {
        name: "Stagger",
        iconBase: "assets/ui/debuffs/stagger",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    knock_down: {
        name: "Knock Down",
        iconBase: "assets/ui/debuffs/knock_down",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    operator_attacked: {
        name: "Operator Attacked",
        iconBase: "assets/ui/debuffs/operator_attacked",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    operator_attacked_low_hp: {
        name: "Operator Attacked (Low HP)",
        iconBase: "assets/ui/debuffs/operator_attacked_low_hp",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    hp_treatment: {
        name: "HP Treatment",
        iconBase: "assets/ui/debuffs/hp_treatment",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    shield: {
        name: "Shield",
        iconBase: "assets/ui/debuffs/shield",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    focus: {
        name: "Focus",
        iconBase: "assets/ui/debuffs/focus",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    electric_susceptibility: {
        name: "Electric Susceptibility",
        iconBase: "assets/ui/debuffs/electric_susceptibility",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    heat_susceptibility: {
        name: "Heat Susceptibility",
        iconBase: "assets/ui/debuffs/heat_susceptibility",
        stackable: false,
        maxStacks: 0,
        extension: "png"
    },
    heat_amp: {
        name: "Heat Amp",
        iconBase: "assets/ui/debuffs/heat_amp",
        stackable: false,
        maxStacks: 0,
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