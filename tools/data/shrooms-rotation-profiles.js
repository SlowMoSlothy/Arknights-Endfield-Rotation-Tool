// 2026-11-25 source export, rank 12 without potentials. Mimino is a preview:
// only her announced mechanics are known; null values must stay unavailable.
export const KAY_SOURCE = 'https://www.endfieldtools.dev/localdb/optimized/characters/details/chr_0040_sweetpie.json';
export const MIMINO_SOURCE = 'https://endfieldtools.dev/characters/mimino/';
export const KAY_LIMITATIONS = 'Rank 12, no potential modifiers. Animation timings, automatic movement/pickups, Picnic Snack quantities and talent damage buffs are not simulated. Place weapon pickups explicitly; Battle Skill salvages all dropped weapons.';
export const MIMINO_LIMITATIONS = 'Announced preview; damage, SP costs, cooldowns, device lifetime, zone values/durations and potentials are not yet published. Only device attachment, detonation and the announced Combo conditions are modeled. Ultimate forcibly applies Lift.';
export const kayResources = [
  { effect: 'kay_weapons', name: 'Weapons', initialStacks: 3, maxStacks: 3 },
  { effect: 'kay_dropped_weapons', name: 'Dropped Weapons', initialStacks: 0, maxStacks: 3 },
  { effect: 'kay_hot_edgy_naives', name: 'Hot Edgy Naives', initialStacks: 0, maxStacks: 3 }
];
export const miminoResources = [{ effect: 'mimino_device', name: 'Portable Device', initialStacks: 0, maxStacks: 1 }];
const effect = (id, name, extra = {}) => ({ id, appliesEffect: id, name, visible: true, persistsForCombo: true, ...extra });
const infliction = () => effect('nature_infliction', 'Nature Infliction', { stackable: true, stacksApplied: 1, maxStacks: 4 });
const vulnerable = () => effect('vulnerable', 'Vulnerable', { stackable: true, stacksApplied: 1, maxStacks: 4 });
const salvage = count => ({ effect: 'kay_dropped_weapons', consume: count,
  grants: [{ effect: 'kay_weapons', maxStacks: 3 }, { effect: 'kay_hot_edgy_naives', maxStacks: 3 }] });
const kaySkill = (id, name, type, shortType, multiplier, element, extra = {}) => ({
  id, operatorId: 35, name, type, shortType, skillLevel: 12,
  icon: 'assets/operators/avatars/Kay.png', iconSmall: `assets/operators/skills/kay/${shortType.toLowerCase()}.png`,
  elementType: element, cooldown: 0, energy: 0, sp_cost: 0,
  damageProfile: multiplier === null ? null : { atkMultiplier: multiplier, hitCount: 1, element, verified: true, sourceUrl: KAY_SOURCE },
  simulationLimitations: KAY_LIMITATIONS, ...extra
});
export const kaySkills = [
  kaySkill(3501, 'Wild Wacky-Whack', 'Final Strike', 'FS', 1.32, 'physical', { stagger: 17 }),
  kaySkill(3502, 'Really Heavy Bash', 'Battle Skill', 'BS', 3, 'nature', {
    energy: 100, sp_cost: 100, stagger: 10,
    description: 'Salvages all dropped Weapons, then consumes all Hot Edgy Naives. Deals 300% + 100% per stack (up to 3) Nature DMG and applies Nature Infliction. At 3 stacks, forcibly applies Combustion for 5s.',
    resourceChanges: [salvage('all'), { effect: 'kay_hot_edgy_naives', consume: 'all', capture: 'hot' }],
    resourceDamageScaling: { capture: 'hot', perStack: 1, maxStacks: 3 },
    resourceOutcomes: [{ capture: 'hot', minStacks: 3, debuffs: [effect('combustion', 'Combustion', { durationSeconds: 5 })] }],
    debuffs: [infliction()]
  }),
  kaySkill(3503, 'Really Kwik Smash', 'Combo Skill', 'CS', 0.7, 'nature', {
    cooldown: 6, ultimateEnergyGain: 5, stagger: 5, allowSelfTrigger: true,
    description: 'Requires at least 1 Weapon and a new Nature Infliction or Arts Burst hit. Throws 1 Weapon, recovers 12 SP and forcibly applies Nature Burst. Pick up the dropped Weapon explicitly or salvage it with Battle Skill.',
    resourceRequirements: [{ effect: 'kay_weapons', minStacks: 1 }],
    resourceChanges: [{ effect: 'kay_weapons', consume: 1, grants: [{ effect: 'kay_dropped_weapons', maxStacks: 3 }] }],
    comboTriggers: [{ anyOf: [{ effect: 'nature_infliction' }, { effect: 'arts_burst' }] }],
    comboEventTriggers: ['nature_infliction', 'arts_burst'],
    forcedInflictionBursts: ['nature_infliction'], spRecovery: { amount: 12 }, spReturn: true
  }),
  kaySkill(3504, 'Really Sweet Combi-Bonker!', 'Ultimate', 'Ult', 6, 'nature', {
    cooldown: 20, energy: 150, stagger: 20,
    description: 'Three Nature damage sequences (160%, 200%, 240%), Nature Infliction and 30 SP recovery. Picnic Snack pickups and treatment are not simulated.',
    debuffs: [infliction()], spRecovery: { amount: 30 }, spReturn: true,
    damageSequences: [1.6, 2, 2.4].map((atkMultiplier, i) => ({ name: `Sequence ${i + 1}`, atkMultiplier, element: 'nature' }))
  }),
  kaySkill(3505, 'Salvage Weapon', 'Mechanic Event', 'Pickup', null, 'nature', {
    iconSmall: 'assets/operators/skills/kay/cs.png',
    description: 'Place when the controlled operator touches one dropped Weapon. Restores 1 Weapon and grants 1 Hot Edgy Naives stack. Does nothing when no Weapon is on the battlefield.',
    resourceRequirements: [{ effect: 'kay_dropped_weapons', minStacks: 1 }], resourceChanges: [salvage(1)]
  }),
  kaySkill(900035, 'Dive Attack', 'Dive Attack', 'Dive', 1.8, 'physical', {
    iconSmall: 'assets/operators/skills/shared/dive_attack.png', normalAttackDamage: true, formActionKey: 'dive_attack'
  })
];
const miminoSkill = (id, name, type, shortType, extra = {}) => ({
  id, operatorId: 36, name, type, shortType, icon: 'assets/operators/avatars/Mimino.webp',
  iconSmall: 'assets/operators/avatars/Mimino.webp', elementType: 'physical',
  cooldown: null, energy: null, sp_cost: null, damageProfile: null,
  simulationLimitations: MIMINO_LIMITATIONS, ...extra
});
export const miminoSkills = [
  miminoSkill(3602, 'Counter-Assault Tactic — Attach Device', 'Battle Skill', 'BS', {
    description: 'Attaches a portable device. Recast to detonate, or apply Lift, Knock Down, Solidification or Immobilization to trigger Concentrating Fusillade.',
    resourceChanges: [{ effect: 'mimino_device', set: 1 }]
  }),
  miminoSkill(3605, 'Counter-Assault Tactic — Detonate Device', 'Battle Skill', 'BS2', {
    description: 'Detonates an attached device, deals unquantified Physical DMG, applies Vulnerable, Protection and Physical Amp. Zone values and lifetime are unknown.',
    resourceRequirements: [{ effect: 'mimino_device', minStacks: 1 }],
    resourceChanges: [{ effect: 'mimino_device', consume: 'all' }], debuffs: [vulnerable()]
  }),
  miminoSkill(3603, 'Concentrating Fusillade', 'Combo Skill', 'CS', {
    description: 'Requires a device attached before a new Lift, Knock Down, Solidification or Immobilization. Shoots down the device for Physical DMG and an enhanced buff zone. Numeric values remain unavailable.',
    allowSelfTrigger: true, resourceRequirements: [{ effect: 'mimino_device', minStacks: 1 }],
    resourceChanges: [{ effect: 'mimino_device', consume: 'all' }],
    comboTriggers: [{ anyOf: ['lift', 'knock_down', 'solidification', 'immobilization', 'immobilize'].map(effect => ({ effect })) }],
    comboEventTriggers: ['lift', 'knock_down', 'solidification', 'immobilization', 'immobilize'],
    debuffs: [vulnerable()]
  }),
  miminoSkill(3604, 'Direct LoS Firing', 'Ultimate', 'Ult', {
    description: 'Forcibly applies Lift and Physical Susceptibility, followed by Physical DMG. Damage, cost, susceptibility value and duration are unknown.',
    debuffs: [effect('lift', 'Lift', { transientTrigger: true, persistsForCombo: false })]
  })
];
