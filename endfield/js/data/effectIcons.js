// Original status sprites and explicit no-icon decisions. See docs/effect-icons.md.
const PLANNER_EFFECT_ICONS = {
  "artful_intent": {
    "icon": "assets/ui/effects/original/icon_battle_buff_jsspsi_inkmark.webp"
  },
  "arts_amp": {
    "icon": "assets/ui/effects/original/icon_battle_affix_spell_enhance.webp"
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
    "icon": "assets/ui/effects/original/icon_battle_affix_spell_vulnerable.webp"
  },
  "atk_up": {
    "icon": "assets/ui/effects/original/icon_battle_buff_atk_up.webp"
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
    "icon": "assets/ui/effects/original/icon_damagetxt_fracture.webp"
  },
  "combustion": {
    "icon": "assets/ui/effects/original/icon_battle_burning.webp"
  },
  "combustion_consumed": {
    "icon": "assets/ui/effects/original/icon_battle_burning.webp"
  },
  "corrosion": {
    "icon": "assets/ui/effects/original/icon_battle_corrupt.webp"
  },
  "corrosion_consumed": {
    "icon": "assets/ui/effects/original/icon_battle_corrupt.webp"
  },
  "crit_up": {
    "icon": "assets/ui/effects/original/icon_battle_crit_up.webp"
  },
  "crush": {
    "icon": "assets/ui/effects/original/icon_damagetxt_crush.webp"
  },
  "cryo_amp": {
    "icon": "assets/ui/effects/original/icon_battle_affix_cryst_enhance.webp"
  },
  "cryo_burst": {
    "icon": null
  },
  "cryo_infliction": {
    "icon": "assets/ui/effects/original/icon_energy_fusion_cryst.webp",
    "stackSegments": 4
  },
  "cryo_susceptibility": {
    "icon": "assets/ui/effects/original/icon_battle_affix_cryst_vulnerable.webp"
  },
  "dive_attack": {
    "icon": null
  },
  "electric_amp": {
    "icon": "assets/ui/effects/original/icon_battle_affix_pulse_enhance.webp"
  },
  "electric_infliction": {
    "icon": "assets/ui/effects/original/icon_energy_fusion_pulse.webp",
    "stackSegments": 4
  },
  "electric_susceptibility": {
    "icon": "assets/ui/effects/original/icon_battle_affix_pulse_vulnerable.webp"
  },
  "electrification": {
    "icon": "assets/ui/effects/original/icon_battle_conduct.webp"
  },
  "electrification_consumed": {
    "icon": "assets/ui/effects/original/icon_battle_conduct.webp"
  },
  "final_strike": {
    "icon": null
  },
  "firefang_vesperwings": {
    "icon": "assets/ui/effects/original/icon_battle_camille_normal_skill_bat.webp"
  },
  "focus": {
    "icon": "assets/ui/effects/original/icon_battle_antal_buff.webp"
  },
  "gloompurge_arts_amp": {
    "icon": "assets/ui/effects/original/icon_battle_affix_spell_enhance.webp"
  },
  "gloompurger_array": {
    "icon": null
  },
  "heat_amp": {
    "icon": "assets/ui/effects/original/icon_battle_affix_fire_enhance.webp"
  },
  "heat_followup": {
    "icon": null
  },
  "heat_infliction": {
    "icon": "assets/ui/effects/original/icon_energy_fusion_fire.webp",
    "stackSegments": 4
  },
  "heat_susceptibility": {
    "icon": "assets/ui/effects/original/icon_battle_affix_fire_vulnerable.webp"
  },
  "hp_treatment": {
    "icon": "assets/ui/effects/original/icon_battle_buff_heal.webp"
  },
  "hypothermic_perfusion": {
    "icon": "assets/ui/effects/original/icon_battle_lastrite_buff.webp"
  },
  "immobilization": {
    "icon": null
  },
  "imprisonment": {
    "icon": "assets/ui/effects/original/icon_battle_buff_lizhiyan_combo_seal.webp"
  },
  "inksoul": {
    "icon": null
  },
  "knock_down": {
    "icon": "assets/ui/effects/original/icon_damagetxt_knockdown.webp"
  },
  "lift": {
    "icon": "assets/ui/effects/original/icon_damagetxt_airborne.webp"
  },
  "liino_cosmovoice_stance": {
    "icon": "assets/ui/effects/original/icon_battle_buff_liino_ultskill_music.webp"
  },
  "liino_vocalist_stance": {
    "icon": "assets/ui/effects/original/icon_battle_buff_liino_normalskill_music.webp"
  },
  "link": {
    "icon": "assets/ui/effects/original/icon_skill_lifeng_debuff.webp"
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
    "icon": "assets/ui/effects/original/icon_battle_nature_taken_up.webp"
  },
  "nature_infliction": {
    "icon": "assets/ui/effects/original/icon_infliction_nature.webp",
    "stackSegments": 4
  },
  "nature_susceptibility": {
    "icon": "assets/ui/effects/original/icon_battle_affix_natural_vulnerable.webp"
  },
  "olden_stare": {
    "icon": "assets/ui/effects/original/icon_battle_tangtang_ultskilldebuff.webp"
  },
  "operator_attacked": {
    "icon": null
  },
  "operator_attacked_low_hp": {
    "icon": null
  },
  "originium_crystal": {
    "icon": "assets/ui/effects/original/icon_skill_endmin_debuff.webp"
  },
  "originium_crystal_consumed": {
    "icon": "assets/ui/effects/original/icon_skill_endmin_debuff.webp"
  },
  "physical_susceptibility": {
    "icon": "assets/ui/effects/original/icon_battle_affix_physical_vulnerable.webp"
  },
  "protection": {
    "icon": "assets/ui/effects/original/icon_battle_affix_shelter.webp"
  },
  "pull": {
    "icon": null
  },
  "push": {
    "icon": "assets/ui/effects/original/knockback.webp"
  },
  "rossi_crit_buff": {
    "icon": "assets/ui/effects/original/icon_battle_crit_up.webp"
  },
  "shield": {
    "icon": "assets/ui/effects/original/icon_battle_shield.webp"
  },
  "slow": {
    "icon": "assets/ui/effects/original/icon_battle_affix_slow.webp"
  },
  "solidification": {
    "icon": "assets/ui/effects/original/icon_battle_frozen.webp"
  },
  "solidification_consumed": {
    "icon": "assets/ui/effects/original/icon_battle_frozen.webp"
  },
  "sp_recovery": {
    "icon": "assets/ui/effects/original/icon_battle_atb_up.webp"
  },
  "stagger": {
    "icon": null
  },
  "steel_oath": {
    "icon": "assets/ui/effects/original/icon_battle_pograni_buff.webp"
  },
  "vulnerable": {
    "icon": "assets/ui/effects/original/icon_shadow_attribute_penetrate.webp",
    "stackSegments": 4
  },
  "vulnerable_consumed": {
    "icon": "assets/ui/effects/original/icon_shadow_attribute_penetrate.webp"
  },
  "weaken": {
    "icon": "assets/ui/effects/original/icon_battle_affix_weak.webp"
  },
  "weakness": {
    "icon": "assets/ui/effects/original/icon_battle_affix_weak.webp"
  },
  "whirlpool": {
    "icon": "assets/ui/effects/original/icon_battle_tangtang_comboskillwater.webp"
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
    if (entry?.stackSegments) {
        const rawCount = Number(effect.stackCount ?? effect.currentStacks ?? effect.stacks ?? effect.stacksApplied ?? 1);
        const count = Number.isFinite(rawCount) ? Math.max(1, Math.min(Math.floor(rawCount), entry.stackSegments)) : 1;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 32 32');
        svg.setAttribute('class', 'planner-effect-stack-ring');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', `${count} of ${entry.stackSegments} stacks`);
        for (let index = 0; index < count; index++) {
            const arc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            for (const [key, value] of Object.entries({ cx: 16, cy: 16, r: 13, pathLength: 360,
                'stroke-dasharray': `${360 / entry.stackSegments - 10} ${360 - 360 / entry.stackSegments + 10}`,
                transform: `rotate(${-135 + index * 360 / entry.stackSegments} 16 16)` })) arc.setAttribute(key, String(value));
            svg.appendChild(arc);
        }
        container.classList.add('planner-effect-with-stack-ring');
        container.style.position = 'relative';
        container.appendChild(svg);
        return;
    }
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
