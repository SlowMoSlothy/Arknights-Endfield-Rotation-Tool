# Planner effect icons

The shared resolver in `endfield/js/data/effectIcons.js` covers all registered statuses and the effect keys in the public operator skill data checked on 2026-11-03. Both buff and debuff resolvers use it. Combat data and trigger behavior are unchanged.

Original PNGs: `https://endfield-assets.fffdan.com/vfs/Bundle/file/assets/beyond/dynamicassets/gameplay/ui/sprites/bufficon/` (downloaded 2026-11-03). File provenance and explicit decisions are recorded in `tools/data/effect-icon-map.json`. The artwork remains the property of its rights holders.

Canonical `appliesEffect` is preferred over an instance ID or stale database image path. Existing numbered infliction, Vulnerable, Melting Flame and Auxiliary Crystal sprites retain their stack artwork; generic sprites get a separate stack badge. Original source-skill glyphs are explicitly labeled below and are not claimed to be dedicated status sprites.

No unique icon was identified for some trigger-only, generic or unverified statuses. Those are intentionally omitted from compact icon trays; their mechanics and inspector text remain. Unknown DB image paths are not emitted; failed runtime image requests are hidden. Weapon artwork remains handled separately.

| Effect key | Artwork / decision |
| --- | --- |
| `artful_intent` | Hidden: no unambiguous original status sprite |
| `arts_amp` | assets/ui/effects/icon_battle_affix_spell_enhance.png |
| `arts_infliction` | Hidden: no unambiguous original status sprite |
| `arts_infliction_consumed` | Hidden: no unambiguous original status sprite |
| `arts_reaction` | Hidden: no unambiguous original status sprite |
| `arts_reaction_consumed` | Hidden: no unambiguous original status sprite |
| `arts_susceptibility` | assets/ui/effects/icon_battle_affix_spell_vulnerable.png |
| `atk_up` | assets/ui/effects/icon_battle_buff_atk_up.png |
| `auxiliary_crystal` | numbered sprites: assets/operators/skills/xaihi/bs_small_1.png |
| `auxiliary_crystal_used_up` | Hidden: no unambiguous original status sprite |
| `breach` | assets/ui/effects/icon_damagetxt_fracture.png |
| `combustion` | assets/ui/effects/icon_battle_burning.png |
| `combustion_consumed` | assets/ui/effects/icon_battle_burning.png |
| `corrosion` | assets/ui/effects/icon_battle_corrupt.png |
| `corrosion_consumed` | assets/ui/effects/icon_battle_corrupt.png |
| `crit_up` | assets/ui/effects/icon_battle_crit_up.png |
| `crush` | assets/ui/effects/icon_damagetxt_crush.png |
| `cryo_amp` | assets/ui/effects/icon_battle_affix_cryst_enhance.png |
| `cryo_burst` | Hidden: no unambiguous original status sprite |
| `cryo_infliction` | numbered sprites: assets/ui/debuffs/cryo_infliction_1.png |
| `cryo_susceptibility` | assets/ui/effects/icon_battle_affix_cryst_vulnerable.png |
| `dive_attack` | Hidden: no unambiguous original status sprite |
| `electric_amp` | assets/ui/effects/icon_battle_affix_pulse_enhance.png |
| `electric_infliction` | numbered sprites: assets/ui/debuffs/electric_infliction_1.png |
| `electric_susceptibility` | assets/ui/effects/icon_battle_affix_pulse_vulnerable.png |
| `electrification` | assets/ui/effects/icon_battle_conduct.png |
| `electrification_consumed` | assets/ui/effects/icon_battle_conduct.png |
| `final_strike` | Hidden: no unambiguous original status sprite |
| `firefang_vesperwings` | assets/operators/skills/rossi/ult_small.png — Original source-skill glyph; distinct status sprite not identified |
| `focus` | assets/operators/skills/yvonne/cs_small.png — Original source-skill glyph; distinct status sprite not identified |
| `gloompurge_arts_amp` | assets/ui/effects/icon_battle_affix_spell_enhance.png |
| `gloompurger_array` | assets/operators/skills/zhuang/ult_small.png — Original source-skill glyph; distinct status sprite not identified |
| `heat_amp` | assets/ui/effects/icon_battle_affix_fire_enhance.png |
| `heat_followup` | Hidden: no unambiguous original status sprite |
| `heat_infliction` | numbered sprites: assets/ui/debuffs/heat_infliction_1.png |
| `heat_susceptibility` | assets/ui/effects/icon_battle_affix_fire_vulnerable.png |
| `hp_treatment` | assets/ui/effects/icon_battle_buff_heal.png |
| `hypothermic_perfusion` | assets/ui/effects/icon_battle_lastrite_buff.png |
| `immobilization` | Hidden: no unambiguous original status sprite |
| `imprisonment` | assets/operators/skills/zhuang/bs_small.png — Original source-skill glyph; distinct status sprite not identified |
| `inksoul` | Hidden: no unambiguous original status sprite |
| `knock_down` | assets/ui/effects/icon_damagetxt_knockdown.png |
| `lift` | assets/ui/effects/icon_damagetxt_airborne.png |
| `liino_cosmovoice_stance` | assets/ui/effects/icon_battle_buff_liino_ultskill_music.png |
| `liino_vocalist_stance` | assets/ui/effects/icon_battle_buff_liino_normalskill_music.png |
| `link` | assets/ui/effects/icon_skill_lifeng_debuff.png |
| `melting_flames` | numbered sprites: assets/ui/buffs/laevatain/melting_flames_1.png |
| `nature_burst_damage_taken` | assets/ui/effects/icon_battle_nature_taken_up.png |
| `nature_infliction` | numbered sprites: assets/ui/debuffs/nature_infliction_1.png |
| `nature_susceptibility` | assets/ui/effects/icon_battle_affix_natural_vulnerable.png |
| `olden_stare` | assets/ui/effects/icon_battle_tangtang_ultskilldebuff.png |
| `operator_attacked` | Hidden: no unambiguous original status sprite |
| `operator_attacked_low_hp` | Hidden: no unambiguous original status sprite |
| `originium_crystal` | assets/ui/effects/icon_skill_endmin_debuff.png |
| `originium_crystal_consumed` | Hidden: no unambiguous original status sprite |
| `physical_susceptibility` | assets/ui/effects/icon_battle_affix_physical_vulnerable.png |
| `protection` | assets/ui/effects/icon_battle_affix_shelter.png |
| `pull` | Hidden: no unambiguous original status sprite |
| `push` | assets/ui/effects/knockback.png |
| `rossi_crit_buff` | assets/ui/effects/icon_battle_crit_up.png |
| `shield` | assets/ui/effects/icon_battle_shield.png |
| `slow` | assets/ui/effects/icon_battle_affix_slow.png |
| `solidification` | assets/ui/effects/icon_battle_frozen.png |
| `solidification_consumed` | assets/ui/effects/icon_battle_frozen.png |
| `sp_recovery` | Hidden: no unambiguous original status sprite |
| `stagger` | Hidden: no unambiguous original status sprite |
| `steel_oath` | assets/ui/effects/icon_battle_pograni_buff.png |
| `vulnerable` | numbered sprites: assets/ui/debuffs/vulnerable_1.png |
| `vulnerable_consumed` | assets/ui/debuffs/vulnerable_1.png — Vulnerable artwork; consumption is described by the effect name |
| `weaken` | assets/ui/effects/icon_battle_affix_weak.png |
| `weakness` | Hidden: no unambiguous original status sprite |
| `whirlpool` | assets/ui/effects/icon_battle_tangtang_comboskillwater.png |
| `yvonne_next_attack_final_strike` | Hidden: no unambiguous original status sprite |
