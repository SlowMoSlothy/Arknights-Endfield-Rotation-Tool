// Original status sprites and explicit no-icon decisions. See docs/effect-icons.md.
const PLANNER_EFFECT_ICONS = {
  "artful_intent": {
    "icon": null
  },
  "arts_amp": {
    "icon": "assets/ui/effects/icon_battle_affix_spell_enhance.png"
  },
  "arts_infliction": {
    "icon": null
  },
  "arts_infliction_consumed": {
    "icon": null
  },
  "arts_reaction": {
    "icon": null
  },
  "arts_reaction_consumed": {
    "icon": null
  },
  "arts_susceptibility": {
    "icon": "assets/ui/effects/icon_battle_affix_spell_vulnerable.png"
  },
  "atk_up": {
    "icon": "assets/ui/effects/icon_battle_buff_atk_up.png"
  },
  "auxiliary_crystal": {
    "stackIcons": [
      "assets/operators/skills/xaihi/bs_small_1.png",
      "assets/operators/skills/xaihi/bs_small_2.png"
    ]
  },
  "auxiliary_crystal_used_up": {
    "icon": null
  },
  "breach": {
    "icon": "assets/ui/effects/icon_damagetxt_fracture.png"
  },
  "combustion": {
    "icon": "assets/ui/effects/icon_battle_burning.png"
  },
  "combustion_consumed": {
    "icon": "assets/ui/effects/icon_battle_burning.png"
  },
  "corrosion": {
    "icon": "assets/ui/effects/icon_battle_corrupt.png"
  },
  "corrosion_consumed": {
    "icon": "assets/ui/effects/icon_battle_corrupt.png"
  },
  "crit_up": {
    "icon": "assets/ui/effects/icon_battle_crit_up.png"
  },
  "crush": {
    "icon": "assets/ui/effects/icon_damagetxt_crush.png"
  },
  "cryo_amp": {
    "icon": "assets/ui/effects/icon_battle_affix_cryst_enhance.png"
  },
  "cryo_burst": {
    "icon": null
  },
  "cryo_infliction": {
    "stackIcons": [
      "assets/ui/debuffs/cryo_infliction_1.png",
      "assets/ui/debuffs/cryo_infliction_2.png",
      "assets/ui/debuffs/cryo_infliction_3.png",
      "assets/ui/debuffs/cryo_infliction_4.png"
    ]
  },
  "cryo_susceptibility": {
    "icon": "assets/ui/effects/icon_battle_affix_cryst_vulnerable.png"
  },
  "dive_attack": {
    "icon": null
  },
  "electric_amp": {
    "icon": "assets/ui/effects/icon_battle_affix_pulse_enhance.png"
  },
  "electric_infliction": {
    "stackIcons": [
      "assets/ui/debuffs/electric_infliction_1.png",
      "assets/ui/debuffs/electric_infliction_2.png",
      "assets/ui/debuffs/electric_infliction_3.png",
      "assets/ui/debuffs/electric_infliction_4.png"
    ]
  },
  "electric_susceptibility": {
    "icon": "assets/ui/effects/icon_battle_affix_pulse_vulnerable.png"
  },
  "electrification": {
    "icon": "assets/ui/effects/icon_battle_conduct.png"
  },
  "electrification_consumed": {
    "icon": "assets/ui/effects/icon_battle_conduct.png"
  },
  "final_strike": {
    "icon": null
  },
  "firefang_vesperwings": {
    "icon": "assets/operators/skills/rossi/ult_small.png"
  },
  "focus": {
    "icon": "assets/operators/skills/yvonne/cs_small.png"
  },
  "gloompurge_arts_amp": {
    "icon": "assets/ui/effects/icon_battle_affix_spell_enhance.png"
  },
  "gloompurger_array": {
    "icon": "assets/operators/skills/zhuang/ult_small.png"
  },
  "heat_amp": {
    "icon": "assets/ui/effects/icon_battle_affix_fire_enhance.png"
  },
  "heat_followup": {
    "icon": null
  },
  "heat_infliction": {
    "stackIcons": [
      "assets/ui/debuffs/heat_infliction_1.png",
      "assets/ui/debuffs/heat_infliction_2.png",
      "assets/ui/debuffs/heat_infliction_3.png",
      "assets/ui/debuffs/heat_infliction_4.png"
    ]
  },
  "heat_susceptibility": {
    "icon": "assets/ui/effects/icon_battle_affix_fire_vulnerable.png"
  },
  "hp_treatment": {
    "icon": "assets/ui/effects/icon_battle_buff_heal.png"
  },
  "hypothermic_perfusion": {
    "icon": "assets/ui/effects/icon_battle_lastrite_buff.png"
  },
  "immobilization": {
    "icon": null
  },
  "imprisonment": {
    "icon": "assets/operators/skills/zhuang/bs_small.png"
  },
  "inksoul": {
    "icon": null
  },
  "knock_down": {
    "icon": "assets/ui/effects/icon_damagetxt_knockdown.png"
  },
  "lift": {
    "icon": "assets/ui/effects/icon_damagetxt_airborne.png"
  },
  "liino_cosmovoice_stance": {
    "icon": "assets/ui/effects/icon_battle_buff_liino_ultskill_music.png"
  },
  "liino_vocalist_stance": {
    "icon": "assets/ui/effects/icon_battle_buff_liino_normalskill_music.png"
  },
  "link": {
    "icon": "assets/ui/effects/icon_skill_lifeng_debuff.png"
  },
  "melting_flames": {
    "stackIcons": [
      "assets/ui/buffs/laevatain/melting_flames_1.png",
      "assets/ui/buffs/laevatain/melting_flames_2.png",
      "assets/ui/buffs/laevatain/melting_flames_3.png",
      "assets/ui/buffs/laevatain/melting_flames_4.png"
    ]
  },
  "nature_burst_damage_taken": {
    "icon": "assets/ui/effects/icon_battle_nature_taken_up.png"
  },
  "nature_infliction": {
    "stackIcons": [
      "assets/ui/debuffs/nature_infliction_1.png",
      "assets/ui/debuffs/nature_infliction_2.png",
      "assets/ui/debuffs/nature_infliction_3.png",
      "assets/ui/debuffs/nature_infliction_4.png"
    ]
  },
  "nature_susceptibility": {
    "icon": "assets/ui/effects/icon_battle_affix_natural_vulnerable.png"
  },
  "olden_stare": {
    "icon": "assets/ui/effects/icon_battle_tangtang_ultskilldebuff.png"
  },
  "operator_attacked": {
    "icon": null
  },
  "operator_attacked_low_hp": {
    "icon": null
  },
  "originium_crystal": {
    "icon": "assets/ui/effects/icon_skill_endmin_debuff.png"
  },
  "originium_crystal_consumed": {
    "icon": null
  },
  "physical_susceptibility": {
    "icon": "assets/ui/effects/icon_battle_affix_physical_vulnerable.png"
  },
  "protection": {
    "icon": "assets/ui/effects/icon_battle_affix_shelter.png"
  },
  "pull": {
    "icon": null
  },
  "push": {
    "icon": "assets/ui/effects/knockback.png"
  },
  "rossi_crit_buff": {
    "icon": "assets/ui/effects/icon_battle_crit_up.png"
  },
  "shield": {
    "icon": "assets/ui/effects/icon_battle_shield.png"
  },
  "slow": {
    "icon": "assets/ui/effects/icon_battle_affix_slow.png"
  },
  "solidification": {
    "icon": "assets/ui/effects/icon_battle_frozen.png"
  },
  "solidification_consumed": {
    "icon": "assets/ui/effects/icon_battle_frozen.png"
  },
  "sp_recovery": {
    "icon": null
  },
  "stagger": {
    "icon": null
  },
  "steel_oath": {
    "icon": "assets/ui/effects/icon_battle_pograni_buff.png"
  },
  "vulnerable": {
    "stackIcons": [
      "assets/ui/debuffs/vulnerable_1.png",
      "assets/ui/debuffs/vulnerable_2.png",
      "assets/ui/debuffs/vulnerable_3.png",
      "assets/ui/debuffs/vulnerable_4.png"
    ]
  },
  "vulnerable_consumed": {
    "icon": "assets/ui/debuffs/vulnerable_1.png"
  },
  "weaken": {
    "icon": "assets/ui/effects/icon_battle_affix_weak.png"
  },
  "weakness": {
    "icon": null
  },
  "whirlpool": {
    "icon": "assets/ui/effects/icon_battle_tangtang_comboskillwater.png"
  },
  "yvonne_next_attack_final_strike": {
    "icon": null
  }
};
const PLANNER_LEGACY_EFFECT_ICONS = new Set([
  "assets/ui/buffs/arts_amp.png",
  "assets/ui/buffs/arts_susceptibility.svg",
  "assets/ui/buffs/cryo_amp.png",
  "assets/ui/buffs/cryo_susceptibility.svg",
  "assets/ui/buffs/electric_amp.svg",
  "assets/ui/buffs/ember/shield.png",
  "assets/ui/buffs/laevatain/melting_flames_1.png",
  "assets/ui/buffs/laevatain/melting_flames_2.png",
  "assets/ui/buffs/laevatain/melting_flames_3.png",
  "assets/ui/buffs/laevatain/melting_flames_4.png",
  "assets/ui/buffs/zhuang/electric_amp.png",
  "assets/ui/debuffs/Combustion_consumption.png",
  "assets/ui/debuffs/Corrosion_consumption.png",
  "assets/ui/debuffs/Solidification_consumption.png",
  "assets/ui/debuffs/arts_susceptibility.svg",
  "assets/ui/debuffs/breach.svg",
  "assets/ui/debuffs/combustion.png",
  "assets/ui/debuffs/corrosion.png",
  "assets/ui/debuffs/crush.png",
  "assets/ui/debuffs/cryo_infliction_1.png",
  "assets/ui/debuffs/cryo_infliction_2.png",
  "assets/ui/debuffs/cryo_infliction_3.png",
  "assets/ui/debuffs/cryo_infliction_4.png",
  "assets/ui/debuffs/electric_infliction_1.png",
  "assets/ui/debuffs/electric_infliction_2.png",
  "assets/ui/debuffs/electric_infliction_3.png",
  "assets/ui/debuffs/electric_infliction_4.png",
  "assets/ui/debuffs/electric_susceptibility.png",
  "assets/ui/debuffs/electrification.png",
  "assets/ui/debuffs/electrification_consumed.png",
  "assets/ui/debuffs/elements/arts_susceptibility.svg",
  "assets/ui/debuffs/elements/cryo.webp",
  "assets/ui/debuffs/elements/electric.webp",
  "assets/ui/debuffs/elements/heat.png",
  "assets/ui/debuffs/elements/heat.webp",
  "assets/ui/debuffs/elements/nature.webp",
  "assets/ui/debuffs/elements/physical.webp",
  "assets/ui/debuffs/heat_amp.png",
  "assets/ui/debuffs/heat_infliction_1.png",
  "assets/ui/debuffs/heat_infliction_2.png",
  "assets/ui/debuffs/heat_infliction_3.png",
  "assets/ui/debuffs/heat_infliction_4.png",
  "assets/ui/debuffs/heat_susceptibility.png",
  "assets/ui/debuffs/knock_down.png",
  "assets/ui/debuffs/lift.svg",
  "assets/ui/debuffs/nature_infliction_1.png",
  "assets/ui/debuffs/nature_infliction_2.png",
  "assets/ui/debuffs/nature_infliction_3.png",
  "assets/ui/debuffs/nature_infliction_4.png",
  "assets/ui/debuffs/slow.webp",
  "assets/ui/debuffs/solidification.png",
  "assets/ui/debuffs/stagger.svg",
  "assets/ui/debuffs/vulnerable_1.png",
  "assets/ui/debuffs/vulnerable_2.png",
  "assets/ui/debuffs/vulnerable_3.png",
  "assets/ui/debuffs/vulnerable_4.png"
]);

function getPlannerEffectIconEntry(effect) {
    // Database IDs may identify an individual proc; appliesEffect identifies the status.
    for (const value of [effect?.appliesEffect, effect?.id, effect?.name]) {
        const key = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (Object.prototype.hasOwnProperty.call(PLANNER_EFFECT_ICONS, key)) return PLANNER_EFFECT_ICONS[key];
    }
    return null;
}

function resolvePlannerEffectIcon(effect) {
    if (!effect) return null;
    const entry = getPlannerEffectIconEntry(effect);
    if (entry) {
        if (entry.stackIcons) {
            const count = Number(effect.stackCount ?? effect.currentStacks ?? effect.stacks ?? effect.stacksApplied ?? 1);
            const stack = Number.isFinite(count) ? Math.max(1, Math.min(Math.floor(count), entry.stackIcons.length)) : 1;
            return entry.stackIcons[stack - 1];
        }
        return entry.icon;
    }
    // Never emit an unverified legacy DB path. Effects still appear by name in inspectors.
    return PLANNER_LEGACY_EFFECT_ICONS.has(effect.icon) ? effect.icon : null;
}

function guardPlannerEffectImage(image, container = image) {
    image.addEventListener('error', () => {
        container.hidden = true;
        container.style.display = 'none';
    }, {once: true});
}

function appendPlannerEffectStackBadge(container, effect, type) {
    const entry = getPlannerEffectIconEntry(effect);
    if (entry?.stackIcons) return; // Original artwork already contains the stack number.
    const registry = type === 'buff'
        ? (typeof BUFF_REGISTRY !== 'undefined' ? BUFF_REGISTRY : {})
        : (typeof DEBUFF_REGISTRY !== 'undefined' ? DEBUFF_REGISTRY : {});
    const definition = registry[effect.appliesEffect || effect.id] || {};
    if (!(effect.stackable ?? definition.stackable)) return;
    const count = Number(effect.stackCount ?? effect.currentStacks ?? effect.stacks ?? effect.stacksApplied ?? 1);
    if (!Number.isFinite(count) || count <= 1) return;
    const max = Number(effect.maxStacks || definition.maxStacks || count);
    const badge = document.createElement('span');
    badge.className = 'planner-effect-stack-count';
    badge.textContent = String(Math.min(Math.floor(count), max));
    badge.setAttribute('aria-label', `${badge.textContent} stacks`);
    container.style.position = 'relative';
    container.appendChild(badge);
}
