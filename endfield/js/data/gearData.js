// gearData.js

const SET_BONUS_DATABASE = {
    aic_light: {
        name: "AIC Light Set Bonus",
        description: "3-Piece: Wearer's HP +500. When the wearer defeats an enemy, ATK +20 for 5s."
    },
    aic_heavy: {
        name: "AIC Heavy Set Bonus",
        description: "3-Piece: Wearer's HP +500. When the wearer defeats an enemy, restore 100 HP. Cooldown: 5s."
    },
    roving_msgr: {
        name: "Roving MSGR Set Bonus",
        description: "3-Piece: Wearer's Agility +50. When the wearer's HP is above 80%, Physical DMG +20%."
    },
    armored_msgr: {
        name: "Armored MSGR Set Bonus",
        description: "3-Piece: Wearer's Strength +50. When wearer's HP is below 50%, they gain +30% DMG Reduction."
    },
    mordvolt_resistant: {
        name: "Mordvolt Resistant Set Bonus",
        description: "3-Piece: Wearer's Will +50. When wearer's HP is below 50%, they gain +30% Treatment Effect."
    },
    mordvolt_insulation: {
        name: "Mordvolt Insulation Set Bonus",
        description: "3-Piece: Wearer's Intellect +50. When wearer's HP is above 80%, they gain +20% Arts DMG Dealt."
    },
    aburrey_legacy: {
        name: "Aburrey's Legacy Set Bonus",
        description: "3-Piece: Wearer's Skill DMG +24%. Casting any skill (battle/combo/ultimate) grants wearer +5% ATK for 15s (stacks up to 3 times)."
    },
    catastrophe: {
        name: "Catastrophe Set Bonus",
        description: "3-Piece: Wearer's Ultimate Gain Efficiency +20%. Recovers 50 SP immediately at the start of battle."
    },
    bonekrusha: {
        name: "Bonekrusha Set Bonus",
        description: "3-Piece: ATK +15%. Casting combo skills grants 1 stack of 'Bonekrushing Smash' (up to 2 stacks), boosting the next battle skill's DMG Dealt by +30%."
    },
    eternal_xiranite: {
        name: "Eternal Xiranite Set Bonus",
        description: "3-Piece: Wearer's HP +1000. After applying Amp, Protected, Susceptibility, or Weakened, teammates gain +16% DMG Dealt for 15s."
    },
    frontiers: {
        name: "Frontiers Set Bonus",
        description: "3-Piece: Wearer's Combo Skill CDR +15%. After recovering SP via skill, the team gains +18% DMG for 12s. Cooldown: 30s."
    },
    hot_work: {
        name: "Hot Work Set Bonus",
        description: "3-Piece: Wearer's Arts Intensity +30. When wearer applies Combustion, Heat DMG +60% for 8s. When wearer applies Corrosion, Nature DMG +60% for 8s."
    },
    lynx: {
        name: "LYNX Set Bonus",
        description: "3-Piece: Wearer's HP Treatment Efficiency +20%. Treating allies grants them +15% DMG Reduction (boosted to +30% if healing overflows Max HP) for 10s."
    },
    mi_security: {
        name: "MI Security Set Bonus",
        description: "3-Piece: Wearer's Crit Rate +5%. Scoring critical hits grants +5% ATK for 5s (up to 5 stacks). At max stacks, Crit Rate +5%."
    },
    pulser_labs: {
        name: "Pulser Labs Set Bonus",
        description: "3-Piece: Wearer's Arts Intensity +30. Applying Electrification grants +60% Electric DMG for 8s. Applying Solidification grants +60% Cryo DMG for 8s."
    },
    swordmancer: {
        name: "Swordmancer Set Bonus",
        description: "3-Piece: Wearer's Stagger Efficiency Bonus +20%. After applying a physical status, deals 250% ATK as Physical DMG and 10 Stagger. Cooldown: 15s."
    },
    tide_surge: {
        name: "Tide Surge Set Bonus",
        description: "3-Piece: Wearer's Arts Intensity +24. Applying 3 stacks of Arts Infliction and triggering Arts Burst deals +100% DMG and reduces target's Elemental Resistance by 15% for 10s."
    },
    type_50_yinglung: {
        name: "Type 50 Yinglung Set Bonus",
        description: "3-Piece: Wearer's ATK +15%. When teammates cast battle skills, wearer gains 1 stack of 'Yinglung's Edge' (up to 3 stacks), each stack boosting wearer's next combo skill DMG by +20%."
    },
    aethertech: {
        name: "Ã†thertech Set Bonus",
        description: "3-Piece: Wearer's ATK +8%. Applying Vulnerable grants Physical DMG +8% for 15s (up to 4 stacks). At 4 stacks, gain +16% Physical DMG for 10s."
    }
};

const GEAR_DATABASE = {
    gloves: [
        { key: "aic_light_gloves", name: "AIC Tactical Gloves", setKey: "aic_light", rarity: 2, mainStat: "Intellect", mainValue: 23, secStat: "Agility", secValue: 23, subStat: "Combo Skill DMG Bonus %", subValue: 13.5, defValue: 16.8, icon: "assets/gear/aic_light_gloves.png" },
        { key: "aic_heavy_gloves", name: "AIC Gauntlets", setKey: "aic_heavy", rarity: 2, mainStat: "Strength", mainValue: 23, secStat: "Will", secValue: 23, subStat: "Final DMG Reduction %", subValue: 6.3, defValue: 16.8, icon: "assets/gear/aic_heavy_gloves.png" },
        { key: "roving_msgr_gloves", name: "Roving MSGR Fists", setKey: "roving_msgr", rarity: 3, mainStat: "Agility", mainValue: 33, secStat: "Strength", secValue: 22, subStat: "Physical DMG Bonus %", subValue: 9.7, defValue: 21.599999999999998, icon: "assets/gear/roving_msgr_gloves.png" },
        { key: "armored_msgr_gloves", name: "Armored MSGR Gloves", setKey: "armored_msgr", rarity: 3, mainStat: "Strength", mainValue: 33, secStat: "Will", secValue: 22, subStat: "Final DMG Reduction %", subValue: 8, defValue: 21.599999999999998, icon: "assets/gear/armored_msgr_gloves.png" },
        { key: "mordvolt_resistant_gloves", name: "Mordvolt Resistant Gloves", setKey: "mordvolt_resistant", rarity: 3, mainStat: "Will", mainValue: 33, secStat: "Intellect", secValue: 22, subStat: "Treatment Effect %", subValue: 8.8, defValue: 21.599999999999998, icon: "assets/gear/mordvolt_resistant_gloves.png" },
        { key: "mordvolt_insulation_gloves", name: "Mordvolt Insulation Gloves", setKey: "mordvolt_insulation", rarity: 3, mainStat: "Intellect", mainValue: 33, secStat: "Will", secValue: 22, subStat: "Final DMG Reduction %", subValue: 9.2, defValue: 21.599999999999998, icon: "assets/gear/mordvolt_insulation_gloves.png" },
        { key: "aburrey_legacy_gloves", name: "Aburrey Gauntlets", setKey: "aburrey_legacy", rarity: 4, mainStat: "Strength", mainValue: 46, secStat: "Will", secValue: 30, subStat: "DMG Bonus vs. Staggered %", subValue: 35, defValue: 30, icon: "assets/gear/aburrey_legacy_gloves.png" },
        { key: "catastrophe_gloves", name: "Catastrophe Gloves", setKey: "catastrophe", rarity: 4, mainStat: "Will", mainValue: 46, secStat: "Intellect", secValue: 30, subStat: "Arts Intensity", subValue: 24.5, defValue: 30, icon: "assets/gear/catastrophe_gloves.png" },
        { key: "eternal_xiranite_gloves", name: "Eternal Xiranite Gloves", setKey: "eternal_xiranite", rarity: 5, mainStat: "Intellect", mainValue: 65, secStat: "Strength", secValue: 43, subStat: "Ultimate Gain Efficiency %", subValue: 20.5, defValue: 42, icon: "assets/gear/eternal_xiranite_gloves.png" },
        { key: "frontiers_gloves", name: "Frontiers Blight RES Gloves", setKey: "frontiers", rarity: 5, mainStat: "Agility", mainValue: 65, secStat: "Intellect", secValue: 43, subStat: "Battle Skill DMG Bonus %", subValue: 34.5, defValue: 42, icon: "assets/gear/frontiers_gloves.png" },
        { key: "hot_work_gloves", name: "Hot Work Gauntlets", setKey: "hot_work", rarity: 5, mainStat: "Intellect", mainValue: 65, secStat: "Strength", secValue: 43, subStat: "Final DMG Reduction %", subValue: 19.2, defValue: 42, icon: "assets/gear/hot_work_gloves.png" },
        { key: "lynx_gloves", name: "LYNX Gloves", setKey: "lynx", rarity: 5, mainStat: "Strength", mainValue: 65, secStat: "Will", secValue: 43, subStat: "Ultimate Gain Efficiency %", subValue: 20.5, defValue: 42, icon: "assets/gear/lynx_gloves.png" },
        { key: "mi_security_gloves", name: "MI Security Gloves", setKey: "mi_security", rarity: 5, mainStat: "Agility", mainValue: 65, secStat: "Strength", secValue: 43, subStat: "Battle Skill DMG Bonus %", subValue: 34.5, defValue: 42, icon: "assets/gear/mi_security_gloves.png" },
        { key: "pulser_labs_gloves", name: "Pulser Labs Gloves", setKey: "pulser_labs", rarity: 5, mainStat: "Will", mainValue: 65, secStat: "Intellect", secValue: 43, subStat: "Final DMG Reduction %", subValue: 19.2, defValue: 42, icon: "assets/gear/pulser_labs_gloves.png" },
        { key: "swordmancer_gloves", name: "Swordmancer TAC Gauntlets", setKey: "swordmancer", rarity: 5, mainStat: "Strength", mainValue: 65, secStat: "Will", secValue: 43, subStat: "Physical DMG Bonus %", subValue: 19.2, defValue: 42, icon: "assets/gear/swordmancer_gloves.png" },
        { key: "tide_surge_gloves", name: "Tide Surge Gauntlets", setKey: "tide_surge", rarity: 5, mainStat: "Strength", mainValue: 65, secStat: "Will", secValue: 43, subStat: "Final DMG Reduction %", subValue: 19.2, defValue: 42, icon: "assets/gear/tide_surge_gloves.png" },
        { key: "type_50_yinglung_gloves", name: "Type 50 Yinglung Gloves", setKey: "type_50_yinglung", rarity: 5, mainStat: "Agility", mainValue: 65, secStat: "Intellect", secValue: 43, subStat: "Combo Skill DMG Bonus %", subValue: 34.5, defValue: 42, icon: "assets/gear/type_50_yinglung_gloves.png" },
        { key: "aethertech_gloves", name: "Æthertech Gloves", setKey: "aethertech", rarity: 5, mainStat: "Agility", mainValue: 65, secStat: "Strength", secValue: 43, subStat: "Arts Intensity", subValue: 34.5, defValue: 42, icon: "assets/gear/aethertech_gloves.png" }

    ],
    armor: [
        { key: "aic_light_armor", name: "AIC Light Armor", setKey: "aic_light", rarity: 2, mainStat: "Intellect", mainValue: 30, secStat: "Will", secValue: 30, subStat: "Battle Skill DMG Bonus %", subValue: 8.1, defValue: 22.400000000000002, icon: "assets/gear/aic_light_armor.png" },
        { key: "aic_heavy_armor", name: "AIC Heavy Armor", setKey: "aic_heavy", rarity: 2, mainStat: "Strength", mainValue: 30, secStat: "Agility", secValue: 30, subStat: "Final DMG Reduction %", subValue: 3.9, defValue: 22.400000000000002, icon: "assets/gear/aic_heavy_armor.png" },
        { key: "roving_msgr_armor", name: "Roving MSGR Jacket", setKey: "roving_msgr", rarity: 3, mainStat: "Agility", mainValue: 44, secStat: "Intellect", secValue: 29, subStat: "ATK Bonus %", subValue: 16.2, defValue: 28.8, icon: "assets/gear/roving_msgr_armor.png" },
        { key: "armored_msgr_armor", name: "Armored MSGR Jacket", setKey: "armored_msgr", rarity: 3, mainStat: "Strength", mainValue: 44, secStat: "Agility", secValue: 29, subStat: "HP Bonus %", subValue: 10.5, defValue: 28.8, icon: "assets/gear/armored_msgr_armor.png" },
        { key: "mordvolt_resistant_armor", name: "Mordvolt Resistant Vest", setKey: "mordvolt_resistant", rarity: 3, mainStat: "Will", mainValue: 44, secStat: "Agility", secValue: 29, subStat: "HP Bonus %", subValue: 10.5, defValue: 28.8, icon: "assets/gear/mordvolt_resistant_armor.png" },
        { key: "mordvolt_insulation_armor", name: "Mordvolt Insulation Vest", setKey: "mordvolt_insulation", rarity: 3, mainStat: "Intellect", mainValue: 44, secStat: "Strength", secValue: 29, subStat: "ATK Bonus %", subValue: 16.2, defValue: 28.8, icon: "assets/gear/mordvolt_insulation_armor.png" },
        { key: "aburrey_legacy_armor", name: "Aburrey Light Armor", setKey: "aburrey_legacy", rarity: 4, mainStat: "Intellect", mainValue: 61, secStat: "Strength", secValue: 41, subStat: "Ultimate Gain Efficiency %", subValue: 8.8, defValue: 40, icon: "assets/gear/aburrey_legacy_armor.png" },
        { key: "catastrophe_armor", name: "Catastrophe Heavy Armor", setKey: "catastrophe", rarity: 4, mainStat: "Strength", mainValue: 61, secStat: "Intellect", secValue: 41, subStat: "Ultimate DMG Bonus %", subValue: 18.4, defValue: 40, icon: "assets/gear/catastrophe_armor.png" },
        { key: "bonekrusha_armor", name: "Bonekrusha Poncho", setKey: "bonekrusha", rarity: 5, mainStat: "Will", mainValue: 87, secStat: "Strength", secValue: 58, subStat: "Combo Skill DMG Bonus %", subValue: 20.7, defValue: 56, icon: "assets/gear/bonekrusha_armor.png" },
        { key: "eternal_xiranite_armor", name: "Eternal Xiranite Armor", setKey: "eternal_xiranite", rarity: 5, mainStat: "Will", mainValue: 87, secStat: "Intellect", secValue: 58, subStat: "Arts Intensity", subValue: 20.7, defValue: 56, icon: "assets/gear/eternal_xiranite_armor.png" },
        { key: "frontiers_armor", name: "Frontiers Armor", setKey: "frontiers", rarity: 5, mainStat: "Strength", mainValue: 87, secStat: "Intellect", secValue: 58, subStat: "Ultimate DMG Bonus %", subValue: 25.9, defValue: 56, icon: "assets/gear/frontiers_armor.png" },
        { key: "hot_work_armor", name: "Hot Work Exoskeleton", setKey: "hot_work", rarity: 5, mainStat: "Strength", mainValue: 87, secStat: "Agility", secValue: 58, subStat: "Heat DMG Bonus %", subValue: 11.5, defValue: 56, icon: "assets/gear/hot_work_armor.png" },
        { key: "lynx_armor", name: "LYNX Heavy Armor", setKey: "lynx", rarity: 5, mainStat: "Strength", mainValue: 87, secStat: "Will", secValue: 58, subStat: "Treatment Effect %", subValue: 10.4, defValue: 56, icon: "assets/gear/lynx_armor.png" },
        { key: "mi_security_armor", name: "MI Security Armor", setKey: "mi_security", rarity: 5, mainStat: "Agility", mainValue: 87, secStat: "Strength", secValue: 58, subStat: "Arts Intensity", subValue: 20.7, defValue: 56, icon: "assets/gear/mi_security_armor.png" },
        { key: "pulser_labs_armor", name: "Pulser Labs Disruptor Suit", setKey: "pulser_labs", rarity: 5, mainStat: "Intellect", mainValue: 87, secStat: "Will", secValue: 58, subStat: "Arts Intensity", subValue: 20.7, defValue: 56, icon: "assets/gear/pulser_labs_armor.png" },
        { key: "swordmancer_armor", name: "Swordmancer Heavy Armor", setKey: "swordmancer", rarity: 5, mainStat: "Agility", mainValue: 87, secStat: "Strength", secValue: 58, subStat: "Arts Intensity", subValue: 20.7, defValue: 56, icon: "assets/gear/swordmancer_armor.png" },
        { key: "tide_surge_armor", name: "Tide Fall Light Armor", setKey: "tide_surge", rarity: 5, mainStat: "Intellect", mainValue: 87, secStat: "Strength", secValue: 58, subStat: "Ultimate Gain Efficiency %", subValue: 12.3, defValue: 56, icon: "assets/gear/tide_surge_armor.png" },
        { key: "type_50_yinglung_armor", name: "Type 50 Yinglung Heavy Armor", setKey: "type_50_yinglung", rarity: 5, mainStat: "Strength", mainValue: 87, secStat: "Will", secValue: 58, subStat: "Physical DMG Bonus %", subValue: 11.5, defValue: 56, icon: "assets/gear/type_50_yinglung_armor.png" },
        { key: "aethertech_armor", name: "Æthertech Plating", setKey: "aethertech", rarity: 5, mainStat: "Strength", mainValue: 87, secStat: "Will", secValue: 58, subStat: "DMG Bonus vs. Staggered %", subValue: 29.6, defValue: 56, icon: "assets/gear/aethertech_armor.png" }

    ],
    kits: [
        { key: "aic_light_kit", name: "AIC Light Plate", setKey: "aic_light", rarity: 2, mainStat: "Intellect", mainValue: 16, secStat: null, secValue: null, subStat: "Combo Skill DMG Bonus %", subValue: 16.2, defValue: 8.4, icon: "assets/gear/aic_light_kit.png" },
        { key: "aic_heavy_kit", name: "AIC Heavy Plate", setKey: "aic_heavy", rarity: 2, mainStat: "Strength", mainValue: 16, secStat: null, secValue: null, subStat: "Final DMG Reduction %", subValue: 7.5, defValue: 8.4, icon: "assets/gear/aic_heavy_kit.png" },
        { key: "roving_msgr_kit", name: "Roving MSGR Gyro", setKey: "roving_msgr", rarity: 3, mainStat: "Agility", mainValue: 21, secStat: null, secValue: null, subStat: "ATK Bonus %", subValue: 10.5, defValue: 10.799999999999999, icon: "assets/gear/roving_msgr_kit.png" },
        { key: "armored_msgr_kit", name: "Armored MSGR Gyro", setKey: "armored_msgr", rarity: 3, mainStat: "Strength", mainValue: 21, secStat: null, secValue: null, subStat: "ATK Bonus %", subValue: 10.5, defValue: 10.799999999999999, icon: "assets/gear/armored_msgr_kit.png" },
        { key: "mordvolt_resistant_kit", name: "Mordvolt Resistant Battery", setKey: "mordvolt_resistant", rarity: 3, mainStat: "Will", mainValue: 21, secStat: null, secValue: null, subStat: "Treatment Effect %", subValue: 10.5, defValue: 10.799999999999999, icon: "assets/gear/mordvolt_resistant_kit.png" },
        { key: "mordvolt_insulation_kit", name: "Mordvolt Insulation Battery", setKey: "mordvolt_insulation", rarity: 3, mainStat: "Intellect", mainValue: 21, secStat: null, secValue: null, subStat: "Crit Rate %", subValue: 5.2, defValue: 10.799999999999999, icon: "assets/gear/mordvolt_insulation_kit.png" },
        { key: "aburrey_legacy_kit", name: "Aburrey UV Lamp", setKey: "aburrey_legacy", rarity: 4, mainStat: "Strength", mainValue: 23, secStat: "Agility", secValue: 15, subStat: "Skill DMG Bonus %", subValue: 19.6, defValue: 15, icon: "assets/gear/aburrey_legacy_kit.png" },
        { key: "catastrophe_kit", name: "Catastrophe Filter", setKey: "catastrophe", rarity: 4, mainStat: "Will", mainValue: 23, secStat: "Intellect", secValue: 15, subStat: "Arts Intensity", subValue: 29.4, defValue: 15, icon: "assets/gear/catastrophe_kit.png" },
        { key: "bonekrusha_kit", name: "Bonekrusha Figurine", setKey: "bonekrusha", rarity: 5, mainStat: "Will", mainValue: 32, secStat: "Agility", secValue: 21, subStat: "Battle Skill DMG Bonus %", subValue: 41.4, defValue: 21, icon: "assets/gear/bonekrusha_kit.png" },
        { key: "eternal_xiranite_kit", name: "Eternal Xiranite Power Core", setKey: "eternal_xiranite", rarity: 5, mainStat: "Intellect", mainValue: 32, secStat: "Strength", secValue: 21, subStat: "Ultimate Gain Efficiency %", subValue: 24.6, defValue: 21, icon: "assets/gear/eternal_xiranite_kit.png" },
        { key: "frontiers_kit", name: "Frontiers Comm", setKey: "frontiers", rarity: 5, mainStat: "Strength", mainValue: 32, secStat: "Agility", secValue: 21, subStat: "Combo Skill DMG Bonus %", subValue: 41.4, defValue: 21, icon: "assets/gear/frontiers_kit.png" },
        { key: "hot_work_kit", name: "Hot Work Power Bank", setKey: "hot_work", rarity: 5, mainStat: "Strength", mainValue: 32, secStat: "Agility", secValue: 21, subStat: "Arts Intensity", subValue: 41.4, defValue: 21, icon: "assets/gear/hot_work_kit.png" },
        { key: "lynx_kit", name: "LYNX Connector", setKey: "lynx", rarity: 5, mainStat: "Strength", mainValue: 32, secStat: "Will", secValue: 21, subStat: "Treatment Effect %", subValue: 82.9, defValue: 21, icon: "assets/gear/lynx_kit.png" },
        { key: "mi_security_kit", name: "MI Security Toolkit", setKey: "mi_security", rarity: 5, mainStat: "Intellect", mainValue: 32, secStat: "Agility", secValue: 21, subStat: "Crit Rate %", subValue: 10.4, defValue: 21, icon: "assets/gear/mi_security_kit.png" },
        { key: "pulser_labs_kit", name: "Pulser Labs Calibrator", setKey: "pulser_labs", rarity: 5, mainStat: "Intellect", mainValue: 41, secStat: null, secValue: null, subStat: "Arts Intensity", subValue: 41.4, defValue: 21, icon: "assets/gear/pulser_labs_kit.png" },
        { key: "swordmancer_kit", name: "Swordmancer Flint", setKey: "swordmancer", rarity: 5, mainStat: "Agility", mainValue: 32, secStat: "Strength", secValue: 21, subStat: "Physical DMG Bonus %", subValue: 23, defValue: 21, icon: "assets/gear/swordmancer_kit.png" },
        { key: "tide_surge_kit", name: "Hanging River O2 Tube", setKey: "tide_surge", rarity: 5, mainStat: "Strength", mainValue: 32, secStat: "Will", secValue: 21, subStat: "All DMG Bonus %", subValue: 23, defValue: 21, icon: "assets/gear/tide_surge_kit.png" },
        { key: "type_50_yinglung_kit", name: "Type 50 Yinglung Radar", setKey: "type_50_yinglung", rarity: 5, mainStat: "Strength", mainValue: 32, secStat: "Will", secValue: 21, subStat: "Physical DMG Bonus %", subValue: 23, defValue: 21, icon: "assets/gear/type_50_yinglung_kit.png" },
        { key: "aethertech_kit", name: "Æthertech Analysis Band", setKey: "aethertech", rarity: 5, mainStat: "Strength", mainValue: 32, secStat: "Will", secValue: 21, subStat: "Physical DMG Bonus %", subValue: 23, defValue: 21, icon: "assets/gear/aethertech_kit.png" }

    ]
};

function getGearByKey(gearKey, category) {
    const list = GEAR_DATABASE[category];
    if (!Array.isArray(list)) return null;
    return list.find(gear => gear.key === gearKey) || null;
}

window.GEAR_DATABASE = GEAR_DATABASE;
window.SET_BONUS_DATABASE = SET_BONUS_DATABASE;
window.getGearByKey = getGearByKey;

