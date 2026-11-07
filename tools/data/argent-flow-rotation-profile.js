// Rank 12 data reviewed against the public game-data export on 2026-11-06.
// Animation timings, Sunderization damage and talent/potential modifiers are not
// implemented here. The Ultimate total assumes its complete charge connects.
export const ARGENT_FLOW_SOURCE = 'https://endfieldtools.dev/localdb/optimized/characters/details/chr_0037_minghe.json';
export const ARGENT_FLOW_LIMITATIONS = 'Rank 12 actions and the 20-second Bolt Rush replacement are implemented. Animation timings, Sunderization/talent damage and potential modifiers remain unverified in the simulator. Ultimate damage assumes the complete charge hits; non-weak enemies can end it early.';
const effect = (id, name, extra = {}) => ({ id, name, appliesEffect: id, visible: true, persistsForCombo: true, stackable: false, ...extra });
const infliction = () => effect('electric_infliction', 'Electric Infliction', { stackable: true, stacksApplied: 1, maxStacks: 4 });
const vulnerable = () => effect('vulnerable', 'Vulnerable', { stackable: true, stacksApplied: 1, maxStacks: 4 });
const skill = (id, name, type, shortType, multiplier, element, extra = {}) => ({
  id, operatorId: 34, name, type, shortType, skillLevel: 12,
  icon: 'assets/operators/avatars/Argent_Flow.png',
  iconSmall: `assets/operators/skills/argent_flow/${shortType.toLowerCase()}.png`,
  elementType: element, cooldown: 0, energy: 0, sp_cost: 0,
  damageProfile: { atkMultiplier: multiplier, hitCount: 1, element, verified: true, sourceUrl: ARGENT_FLOW_SOURCE },
  sourceNote: ARGENT_FLOW_LIMITATIONS,
  simulationLimitations: ARGENT_FLOW_LIMITATIONS,
  ...extra
});

export const argentFlowBoltRush = skill(3405, 'Bolt Rush', 'Battle Skill', 'BS2', 7, 'electric', {
  energy: 100, sp_cost: 100, stagger: 10,
  description: 'After Stars Shifted, replaces Darkness Cowed for 20s. Deals Electric DMG and forcibly applies Electrification. Consumes all Electric Infliction, raising this Electrification’s Status Level by 1 per stack consumed. Consuming Electric Infliction also applies 1 Vulnerability stack. Sunderization and talent damage are not calculated.',
  forcedArtsStatus: {
    consumeInfliction: 'electric_infliction', statusEffect: 'electrification', baseStatusLevel: 1,
    statusApplication: { name: 'Electrification', iconBase: 'assets/ui/debuffs/electrification' },
    onConsumedInfliction: vulnerable()
  }
});

export const argentFlowSkills = [
  skill(3401, 'Dust Resplendent', 'Final Strike', 'FS', 1.35, 'physical', {
    description: 'Physical Final Strike. Deals 23 Stagger.', stagger: 23,
    debuffs: [effect('final_strike', 'Final Strike', { persistsForCombo: false, transientTrigger: true })]
  }),
  skill(3402, 'Darkness Cowed', 'Battle Skill', 'BS', 3.5, 'physical', {
    energy: 100, sp_cost: 100, stagger: 10,
    description: 'Sweeps his lance for Physical DMG and applies Lift. After Stars Shifted, this skill becomes Bolt Rush for 20s.',
    physicalStatusResolution: {
      statusEffect: 'lift', statusName: 'Lift', vulnerabilityMode: 'stack',
      vulnerableApplication: { name: 'Vulnerable', stacksApplied: 1, maxStacks: 4 },
      statusApplication: { name: 'Lift', iconBase: 'assets/ui/debuffs/lift' }
    }
  }),
  skill(3403, 'Stars Shifted', 'Combo Skill', 'CS', 3.6, 'electric', {
    cooldown: 18, ultimateEnergyGain: 10, stagger: 10, allowSelfTrigger: true,
    description: 'Triggers when an enemy becomes Vulnerable. Deals Electric DMG and applies Electric Infliction with its final hit. Replaces Darkness Cowed with Bolt Rush for 20s.',
    comboTriggers: [{ effect: 'vulnerable', minStacks: 1 }],
    debuffs: [infliction()]
  }),
  skill(3404, 'Heavens Sundered', 'Ultimate', 'Ult', 14.25, 'electric', {
    cooldown: 15, energy: 80, stagger: 10,
    description: 'The charge, Cleansing Cleave and Ground Pierce deal Electric DMG. Cleansing Cleave applies 1 Electric Infliction; Ground Pierce applies Crush. A non-weak enemy can stop the charge early. Sunderization explosions are not calculated.',
    damageSequences: [
      { name: 'Charge (complete)', atkMultiplier: 1.75, element: 'electric' },
      { name: 'Cleansing Cleave', atkMultiplier: 5, element: 'electric' },
      { name: 'Ground Pierce', atkMultiplier: 7.5, element: 'electric' }
    ],
    debuffs: [infliction()],
    physicalStatusResolution: {
      statusEffect: 'crush', statusName: 'Crush', vulnerabilityMode: 'consume',
      vulnerableApplication: { name: 'Vulnerable', stacksApplied: 1, maxStacks: 4 },
      statusApplication: { name: 'Crush' }
    }
  }),
  argentFlowBoltRush,
  skill(900034, 'Dive Attack', 'Dive Attack', 'Dive', 1.8, 'physical', {
    iconSmall: 'assets/operators/skills/shared/dive_attack.png',
    description: 'A mid-air Basic Attack that deals Physical DMG to nearby enemies.',
    normalAttackDamage: true, formActionKey: 'dive_attack'
  })
];

export const argentFlowForm = {
  game: 'arknights_endfield', form_key: 'argent_flow_bolt_rush', operator_id: 34,
  name: 'Bolt Rush', activation_skill_id: 3403, duration_seconds: 20, priority: 100,
  icon_path: argentFlowBoltRush.iconSmall, visible: true, enabled: true, verified: true,
  source_url: ARGENT_FLOW_SOURCE,
  source_note: 'Stars Shifted temporarily replaces Darkness Cowed with Bolt Rush for 20 seconds.',
  raw_data: {}
};

export const argentFlowFormVariant = {
  game: 'arknights_endfield', form_key: argentFlowForm.form_key, operator_id: 34,
  action_key: 'skill:3402', action_override: { ...argentFlowBoltRush, physicalStatusResolution: null },
  priority: 100, enabled: true, verified: true, source_url: ARGENT_FLOW_SOURCE,
  source_note: ARGENT_FLOW_LIMITATIONS, raw_data: {}
};
