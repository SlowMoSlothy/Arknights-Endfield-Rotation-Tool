# Planner effect icons

The shared resolver in `endfield/js/data/effectIcons.js` uses the reviewed decisions in `tools/data/effect-icon-map.json`. Both buff and debuff trays, including the enemy panel, use this resolver. Combat data, visibility flags, durations and triggers are unchanged.

## Original artwork

The complete public game `bufficon` directory was downloaded on 2026-11-26: **159 original graphics**, 361054 bytes in total. These are game artwork distributed through a community asset mirror, not an official game API. The artwork remains the property of its rights holders.

- Discovery: [public status icon manifest](https://endfield-assets.fffdan.com/vfs/Bundle/search/ui/sprites/bufficon?suffix=.png)
- Provenance: `tools/data/original-effect-icons.json` records every source URL, local file, byte length and SHA-256 checksum.
- Local images: `endfield/assets/ui/effects/original/`.
- The provider can return WebP for PNG source URLs. Downloaded bytes are preserved; local extensions match the actual format.
- Refresh downloaded artwork with `npm run sync:effect-icons`; review mappings before assigning new statuses.
- Regenerate this document and the runtime mapping with `npm run build:effect-icons`.

## Reviewed mapping

73 effect keys: **54 original-status assignments**, **2 retained numbered artwork assignments**, **17 explicit no-icon decisions**. Numbered legacy artwork is retained where no unambiguous original replacement was identified. Action notifications and generic triggers need not have a status icon. An area or entity is not assigned an unrelated operator's skill glyph.

Corrections include Camille's Battle Skill bat, Antal's Focus, Arcane's combo seal (Imprisonment), Si's ink mark (Artful Intent), and the Weakness/Weaken alias. These operator-specific assignments are inferred from the original asset names and the operators' recorded skill data; they are not claims of a populated BuffTable (that endpoint returned no records during this audit).

Canonical `appliesEffect` takes precedence over instance IDs and stale database image paths. Original infliction and Vulnerability artwork is framed by a white contour: each stack adds one quarter of the ring (1–4). This overlay preserves the original downloaded artwork. Other unnumbered stackable statuses use a number badge. Failed image requests hide cleanly; effect names and mechanics remain in inspectors.

| Effect key | Artwork | Decision |
| --- | --- | --- |
| `artful_intent` | assets/ui/effects/original/icon_battle_buff_jsspsi_inkmark.webp | Si (internal ID jsspsi) Battle Skill ink mark; inferred from original asset name and Artful Intent skill data. |
| `arts_amp` | assets/ui/effects/original/icon_battle_affix_spell_enhance.webp | Original status sprite |
| `arts_infliction` | No dedicated icon | Generic Arts Infliction trigger; the element-specific statuses have original icons. |
| `arts_infliction_consumed` | No dedicated icon | Generic consumption event; no unique elemental status. |
| `arts_reaction` | No dedicated icon | Generic Arts Reaction trigger; individual reactions have their own original icons. |
| `arts_reaction_consumed` | No dedicated icon | Generic reaction consumption event; no unique status. |
| `arts_susceptibility` | assets/ui/effects/original/icon_battle_affix_spell_vulnerable.webp | Original status sprite |
| `atk_up` | assets/ui/effects/original/icon_battle_buff_atk_up.webp | Original status sprite |
| `auxiliary_crystal` | assets/operators/skills/xaihi/bs_small_1.png, assets/operators/skills/xaihi/bs_small_2.png | Retained existing numbered Auxiliary Crystal artwork; no unambiguous dedicated replacement in the original bufficon catalog. |
| `auxiliary_crystal_used_up` | No dedicated icon | Crystal depletion trigger, not an active status. |
| `breach` | assets/ui/effects/original/icon_damagetxt_fracture.webp | Original status sprite |
| `combustion` | assets/ui/effects/original/icon_battle_burning.webp | Original status sprite |
| `combustion_consumed` | assets/ui/effects/original/icon_battle_burning.webp | Original status sprite |
| `corrosion` | assets/ui/effects/original/icon_battle_corrupt.webp | Original status sprite |
| `corrosion_consumed` | assets/ui/effects/original/icon_battle_corrupt.webp | Original status sprite |
| `crit_up` | assets/ui/effects/original/icon_battle_crit_up.webp | Original status sprite |
| `crush` | assets/ui/effects/original/icon_damagetxt_crush.webp | Original status sprite |
| `cryo_amp` | assets/ui/effects/original/icon_battle_affix_cryst_enhance.webp | Original status sprite |
| `cryo_burst` | No dedicated icon | Instant Cryo Burst damage event; no unambiguous dedicated status sprite identified. |
| `cryo_infliction` | assets/ui/effects/original/icon_energy_fusion_cryst.webp | Original Cryo Infliction glyph; each stack adds a quarter of the white contour. |
| `cryo_susceptibility` | assets/ui/effects/original/icon_battle_affix_cryst_vulnerable.webp | Original status sprite |
| `dive_attack` | No dedicated icon | Action trigger, not an active status. |
| `electric_amp` | assets/ui/effects/original/icon_battle_affix_pulse_enhance.webp | Original status sprite |
| `electric_infliction` | assets/ui/effects/original/icon_energy_fusion_pulse.webp | Original Electric Infliction glyph; each stack adds a quarter of the white contour. |
| `electric_susceptibility` | assets/ui/effects/original/icon_battle_affix_pulse_vulnerable.webp | Original status sprite |
| `electrification` | assets/ui/effects/original/icon_battle_conduct.webp | Original status sprite |
| `electrification_consumed` | assets/ui/effects/original/icon_battle_conduct.webp | Original status sprite |
| `final_strike` | No dedicated icon | Action trigger, not an active status. |
| `firefang_vesperwings` | assets/ui/effects/original/icon_battle_camille_normal_skill_bat.webp | Original status sprite |
| `focus` | assets/ui/effects/original/icon_battle_antal_buff.webp | Antal Focus; original operator-specific status glyph. Replaces unrelated Yvonne Combo Skill artwork. |
| `gloompurge_arts_amp` | assets/ui/effects/original/icon_battle_affix_spell_enhance.webp | Original status sprite |
| `gloompurger_array` | No dedicated icon | Arcane area/trigger state; no dedicated status glyph identified in the complete bufficon catalog. Removed unrelated Zhuang Ultimate artwork. Name remains in inspectors. |
| `heat_amp` | assets/ui/effects/original/icon_battle_affix_fire_enhance.webp | Original status sprite |
| `heat_followup` | No dedicated icon | Instant follow-up damage event, not an active status. |
| `heat_infliction` | assets/ui/effects/original/icon_energy_fusion_fire.webp | Original Heat Infliction glyph; each stack adds a quarter of the white contour. |
| `heat_susceptibility` | assets/ui/effects/original/icon_battle_affix_fire_vulnerable.webp | Original status sprite |
| `hp_treatment` | assets/ui/effects/original/icon_battle_buff_heal.webp | Original status sprite |
| `hypothermic_perfusion` | assets/ui/effects/original/icon_battle_lastrite_buff.webp | Original status sprite |
| `immobilization` | No dedicated icon | No unambiguous dedicated Immobilization sprite identified; do not substitute Silence, Solidification or Imprisonment. |
| `imprisonment` | assets/ui/effects/original/icon_battle_buff_lizhiyan_combo_seal.webp | Arcane (internal ID lizhiyan) combo seal; inferred from original asset name and combo skill data. Replaces unrelated Zhuang skill artwork. |
| `inksoul` | No dedicated icon | Si proxy entity; no dedicated status sprite identified. Artful Intent uses the ink mark. |
| `knock_down` | assets/ui/effects/original/icon_damagetxt_knockdown.webp | Original status sprite |
| `lift` | assets/ui/effects/original/icon_damagetxt_airborne.webp | Original status sprite |
| `liino_cosmovoice_stance` | assets/ui/effects/original/icon_battle_buff_liino_ultskill_music.webp | Original status sprite |
| `liino_vocalist_stance` | assets/ui/effects/original/icon_battle_buff_liino_normalskill_music.webp | Original status sprite |
| `link` | assets/ui/effects/original/icon_skill_lifeng_debuff.webp | Original status sprite |
| `melting_flames` | assets/ui/buffs/laevatain/melting_flames_1.png, assets/ui/buffs/laevatain/melting_flames_2.png, assets/ui/buffs/laevatain/melting_flames_3.png, assets/ui/buffs/laevatain/melting_flames_4.png | Retained existing numbered Melting Flames artwork. Original icon_laevat_energy_1–5 files are archived, but their stage semantics are not verified as a replacement for the four planner stacks. |
| `nature_burst_damage_taken` | assets/ui/effects/original/icon_battle_nature_taken_up.webp | Original status sprite |
| `nature_infliction` | assets/ui/effects/original/icon_infliction_nature.webp | Original Nature Infliction glyph; each stack adds a quarter of the white contour. |
| `nature_susceptibility` | assets/ui/effects/original/icon_battle_affix_natural_vulnerable.webp | Original status sprite |
| `olden_stare` | assets/ui/effects/original/icon_battle_tangtang_ultskilldebuff.webp | Original status sprite |
| `operator_attacked` | No dedicated icon | Combat trigger, not an active status. |
| `operator_attacked_low_hp` | No dedicated icon | Combat trigger, not an active status. |
| `originium_crystal` | assets/ui/effects/original/icon_skill_endmin_debuff.webp | Original status sprite |
| `originium_crystal_consumed` | assets/ui/effects/original/icon_skill_endmin_debuff.webp | Original Originium Crystal artwork; consumption is described by the effect name. |
| `physical_susceptibility` | assets/ui/effects/original/icon_battle_affix_physical_vulnerable.webp | Original status sprite |
| `protection` | assets/ui/effects/original/icon_battle_affix_shelter.webp | Original status sprite |
| `pull` | No dedicated icon | Displacement action; no original Pull sprite identified. Do not substitute Knockback. |
| `push` | assets/ui/effects/original/knockback.webp | Original status sprite |
| `rossi_crit_buff` | assets/ui/effects/original/icon_battle_crit_up.webp | Original status sprite |
| `shield` | assets/ui/effects/original/icon_battle_shield.webp | Original status sprite |
| `slow` | assets/ui/effects/original/icon_battle_affix_slow.webp | Original status sprite |
| `solidification` | assets/ui/effects/original/icon_battle_frozen.webp | Original status sprite |
| `solidification_consumed` | assets/ui/effects/original/icon_battle_frozen.webp | Original status sprite |
| `sp_recovery` | assets/ui/effects/original/icon_battle_atb_up.webp | Original SP (internal name ATB) recovery glyph; the event amount and timing remain unchanged. |
| `stagger` | No dedicated icon | Combat resource/damage event, not an active status. |
| `steel_oath` | assets/ui/effects/original/icon_battle_pograni_buff.webp | Original status sprite |
| `vulnerable` | assets/ui/effects/original/icon_battle_affix_vulnerable.webp | Original Vulnerability status glyph; each stack adds a quarter of the white contour. |
| `vulnerable_consumed` | assets/ui/effects/original/icon_battle_affix_vulnerable.webp | Original Vulnerability status glyph; consumption is described by the effect name. |
| `weaken` | assets/ui/effects/original/icon_battle_affix_weak.webp | Original status sprite |
| `weakness` | assets/ui/effects/original/icon_battle_affix_weak.webp | Weakness is the current name of Weaken; both keys use the same original status sprite. |
| `whirlpool` | assets/ui/effects/original/icon_battle_tangtang_comboskillwater.webp | Original status sprite |
| `yvonne_next_attack_final_strike` | No dedicated icon | One-shot action readiness marker; no dedicated original Final Strike-ready sprite identified. |
