import type { ClassId, ItemDef } from './types';

export const ITEMS: Record<string, ItemDef> = {
  potion: {
    id: 'potion',
    name: 'Potion',
    description: 'Restores 40 HP.',
    kind: 'consumable',
    price: 20,
    healHp: 40,
  },
  hi_potion: {
    id: 'hi_potion',
    name: 'Hi-Potion',
    description: 'Restores 90 HP.',
    kind: 'consumable',
    price: 55,
    healHp: 90,
  },
  ether: {
    id: 'ether',
    name: 'Ether',
    description: 'Restores 25 MP.',
    kind: 'consumable',
    price: 40,
    healMp: 25,
  },

  // --- Starter gear (equipped at character creation) ---
  training_sword: {
    id: 'training_sword',
    name: 'Training Sword',
    description: 'Starter fighter blade. +2 ATK.',
    kind: 'weapon',
    price: 25,
    atkBonus: 2,
    classes: ['fighter'],
  },
  padded_jacket: {
    id: 'padded_jacket',
    name: 'Padded Jacket',
    description: 'Starter fighter armor. +3 DEF.',
    kind: 'armor',
    price: 25,
    defBonus: 3,
    classes: ['fighter'],
  },
  initiate_blade: {
    id: 'initiate_blade',
    name: 'Initiate Blade',
    description: 'Starter paladin sword. +2 ATK, +1 MDF.',
    kind: 'weapon',
    price: 28,
    atkBonus: 2,
    mdfBonus: 1,
    classes: ['paladin'],
  },
  novice_mail: {
    id: 'novice_mail',
    name: 'Novice Mail',
    description: 'Starter paladin armor. +3 DEF, +1 MDF.',
    kind: 'armor',
    price: 28,
    defBonus: 3,
    mdfBonus: 1,
    classes: ['paladin'],
  },
  woodcutter_axe: {
    id: 'woodcutter_axe',
    name: "Woodcutter's Axe",
    description: 'Starter barbarian axe. +3 ATK.',
    kind: 'weapon',
    price: 25,
    atkBonus: 3,
    classes: ['barbarian'],
  },
  fur_wraps: {
    id: 'fur_wraps',
    name: 'Fur Wraps',
    description: 'Starter barbarian armor. +2 DEF, +1 AGI.',
    kind: 'armor',
    price: 22,
    defBonus: 2,
    agiBonus: 1,
    classes: ['barbarian'],
  },
  rusty_daggers: {
    id: 'rusty_daggers',
    name: 'Rusty Daggers',
    description: 'Starter thief blades. +1 ATK, +2 AGI.',
    kind: 'weapon',
    price: 22,
    atkBonus: 1,
    agiBonus: 2,
    classes: ['thief'],
  },
  worn_leathers: {
    id: 'worn_leathers',
    name: 'Worn Leathers',
    description: 'Starter thief armor. +2 DEF, +2 AGI.',
    kind: 'armor',
    price: 22,
    defBonus: 2,
    agiBonus: 2,
    classes: ['thief'],
  },
  oak_cudgel: {
    id: 'oak_cudgel',
    name: 'Oak Cudgel',
    description: 'Starter cleric mace. +1 ATK, +1 MAT.',
    kind: 'weapon',
    price: 22,
    atkBonus: 1,
    matBonus: 1,
    classes: ['cleric'],
  },
  acolyte_robes: {
    id: 'acolyte_robes',
    name: 'Acolyte Robes',
    description: 'Starter cleric armor. +2 DEF, +2 MDF.',
    kind: 'armor',
    price: 24,
    defBonus: 2,
    mdfBonus: 2,
    classes: ['cleric'],
  },
  apprentice_wand: {
    id: 'apprentice_wand',
    name: 'Apprentice Wand',
    description: 'Starter mage focus. +3 MAT.',
    kind: 'weapon',
    price: 26,
    matBonus: 3,
    classes: ['mage'],
  },
  cloth_robe: {
    id: 'cloth_robe',
    name: 'Cloth Robe',
    description: 'Starter mage robes. +1 DEF, +3 MDF.',
    kind: 'armor',
    price: 24,
    defBonus: 1,
    mdfBonus: 3,
    classes: ['mage'],
  },
  living_branch: {
    id: 'living_branch',
    name: 'Living Branch',
    description: 'Starter druid staff. +2 MAT, +1 ATK.',
    kind: 'weapon',
    price: 24,
    matBonus: 2,
    atkBonus: 1,
    classes: ['druid'],
  },
  leaf_cloak: {
    id: 'leaf_cloak',
    name: 'Leaf Cloak',
    description: 'Starter druid wrap. +2 DEF, +2 MDF.',
    kind: 'armor',
    price: 24,
    defBonus: 2,
    mdfBonus: 2,
    classes: ['druid'],
  },

  // --- Shop upgrades ---
  // Fighter
  iron_blade: {
    id: 'iron_blade',
    name: 'Iron Blade',
    description: 'Fighter sword. +5 ATK.',
    kind: 'weapon',
    price: 90,
    atkBonus: 5,
    classes: ['fighter'],
  },
  plate_mail: {
    id: 'plate_mail',
    name: 'Plate Mail',
    description: 'Fighter armor. +9 DEF.',
    kind: 'armor',
    price: 95,
    defBonus: 9,
    classes: ['fighter'],
  },

  // Paladin
  holy_longsword: {
    id: 'holy_longsword',
    name: 'Holy Longsword',
    description: 'Paladin blade. +4 ATK, +2 MDF.',
    kind: 'weapon',
    price: 100,
    atkBonus: 4,
    mdfBonus: 2,
    classes: ['paladin'],
  },
  sanctified_mail: {
    id: 'sanctified_mail',
    name: 'Sanctified Mail',
    description: 'Paladin armor. +8 DEF, +4 MDF.',
    kind: 'armor',
    price: 100,
    defBonus: 8,
    mdfBonus: 4,
    classes: ['paladin'],
  },

  // Barbarian
  greataxe: {
    id: 'greataxe',
    name: 'Greataxe',
    description: 'Barbarian axe. +7 ATK.',
    kind: 'weapon',
    price: 95,
    atkBonus: 7,
    classes: ['barbarian'],
  },
  hide_armor: {
    id: 'hide_armor',
    name: 'Hide Armor',
    description: 'Barbarian armor. +6 DEF, +2 AGI.',
    kind: 'armor',
    price: 75,
    defBonus: 6,
    agiBonus: 2,
    classes: ['barbarian'],
  },

  // Thief
  steel_daggers: {
    id: 'steel_daggers',
    name: 'Steel Daggers',
    description: 'Thief weapons. +3 ATK, +3 AGI.',
    kind: 'weapon',
    price: 85,
    atkBonus: 3,
    agiBonus: 3,
    classes: ['thief'],
  },
  shadow_leather: {
    id: 'shadow_leather',
    name: 'Shadow Leather',
    description: 'Thief armor. +5 DEF, +4 AGI.',
    kind: 'armor',
    price: 80,
    defBonus: 5,
    agiBonus: 4,
    classes: ['thief'],
  },

  // Cleric
  blessed_mace: {
    id: 'blessed_mace',
    name: 'Blessed Mace',
    description: 'Cleric mace. +3 ATK, +2 MAT.',
    kind: 'weapon',
    price: 85,
    atkBonus: 3,
    matBonus: 2,
    classes: ['cleric'],
  },
  vestments: {
    id: 'vestments',
    name: 'Holy Vestments',
    description: 'Cleric robes. +6 DEF, +6 MDF.',
    kind: 'armor',
    price: 90,
    defBonus: 6,
    mdfBonus: 6,
    classes: ['cleric'],
  },

  // Mage
  arcane_staff: {
    id: 'arcane_staff',
    name: 'Arcane Staff',
    description: 'Mage staff. +6 MAT.',
    kind: 'weapon',
    price: 100,
    matBonus: 6,
    classes: ['mage'],
  },
  wizard_robe: {
    id: 'wizard_robe',
    name: 'Wizard Robe',
    description: 'Mage robes. +4 DEF, +8 MDF.',
    kind: 'armor',
    price: 90,
    defBonus: 4,
    mdfBonus: 8,
    classes: ['mage'],
  },

  // Druid
  oaken_staff: {
    id: 'oaken_staff',
    name: 'Oaken Staff',
    description: 'Druid staff. +4 MAT, +1 ATK.',
    kind: 'weapon',
    price: 90,
    matBonus: 4,
    atkBonus: 1,
    classes: ['druid'],
  },
  barkskin_wrap: {
    id: 'barkskin_wrap',
    name: 'Barkskin Wrap',
    description: 'Druid armor. +6 DEF, +5 MDF.',
    kind: 'armor',
    price: 85,
    defBonus: 6,
    mdfBonus: 5,
    classes: ['druid'],
  },

  // --- Tier 2 (shop at party Lv3+) ---
  steel_blade: {
    id: 'steel_blade',
    name: 'Steel Blade',
    description: 'Fighter upgrade. +8 ATK.',
    kind: 'weapon',
    price: 160,
    atkBonus: 8,
    classes: ['fighter'],
  },
  reinforced_plate: {
    id: 'reinforced_plate',
    name: 'Reinforced Plate',
    description: 'Fighter upgrade. +13 DEF.',
    kind: 'armor',
    price: 165,
    defBonus: 13,
    classes: ['fighter'],
  },
  radiant_blade: {
    id: 'radiant_blade',
    name: 'Radiant Blade',
    description: 'Paladin upgrade. +7 ATK, +3 MDF.',
    kind: 'weapon',
    price: 170,
    atkBonus: 7,
    mdfBonus: 3,
    classes: ['paladin'],
  },
  guardian_mail: {
    id: 'guardian_mail',
    name: 'Guardian Mail',
    description: 'Paladin upgrade. +12 DEF, +6 MDF.',
    kind: 'armor',
    price: 175,
    defBonus: 12,
    mdfBonus: 6,
    classes: ['paladin'],
  },
  war_axe: {
    id: 'war_axe',
    name: 'War Axe',
    description: 'Barbarian upgrade. +11 ATK.',
    kind: 'weapon',
    price: 165,
    atkBonus: 11,
    classes: ['barbarian'],
  },
  beast_hide: {
    id: 'beast_hide',
    name: 'Beast Hide',
    description: 'Barbarian upgrade. +9 DEF, +3 AGI.',
    kind: 'armor',
    price: 140,
    defBonus: 9,
    agiBonus: 3,
    classes: ['barbarian'],
  },
  assassin_blades: {
    id: 'assassin_blades',
    name: 'Assassin Blades',
    description: 'Thief upgrade. +5 ATK, +5 AGI.',
    kind: 'weapon',
    price: 155,
    atkBonus: 5,
    agiBonus: 5,
    classes: ['thief'],
  },
  night_leather: {
    id: 'night_leather',
    name: 'Night Leather',
    description: 'Thief upgrade. +8 DEF, +6 AGI.',
    kind: 'armor',
    price: 150,
    defBonus: 8,
    agiBonus: 6,
    classes: ['thief'],
  },
  sanctum_mace: {
    id: 'sanctum_mace',
    name: 'Sanctum Mace',
    description: 'Cleric upgrade. +5 ATK, +4 MAT.',
    kind: 'weapon',
    price: 155,
    atkBonus: 5,
    matBonus: 4,
    classes: ['cleric'],
  },
  bishop_vestments: {
    id: 'bishop_vestments',
    name: 'Bishop Vestments',
    description: 'Cleric upgrade. +9 DEF, +9 MDF.',
    kind: 'armor',
    price: 160,
    defBonus: 9,
    mdfBonus: 9,
    classes: ['cleric'],
  },
  crystal_staff: {
    id: 'crystal_staff',
    name: 'Crystal Staff',
    description: 'Mage upgrade. +10 MAT.',
    kind: 'weapon',
    price: 175,
    matBonus: 10,
    classes: ['mage'],
  },
  runed_robe: {
    id: 'runed_robe',
    name: 'Runed Robe',
    description: 'Mage upgrade. +6 DEF, +12 MDF.',
    kind: 'armor',
    price: 165,
    defBonus: 6,
    mdfBonus: 12,
    classes: ['mage'],
  },
  heartwood_staff: {
    id: 'heartwood_staff',
    name: 'Heartwood Staff',
    description: 'Druid upgrade. +7 MAT, +2 ATK.',
    kind: 'weapon',
    price: 160,
    matBonus: 7,
    atkBonus: 2,
    classes: ['druid'],
  },
  ironbark_wrap: {
    id: 'ironbark_wrap',
    name: 'Ironbark Wrap',
    description: 'Druid upgrade. +9 DEF, +8 MDF.',
    kind: 'armor',
    price: 155,
    defBonus: 9,
    mdfBonus: 8,
    classes: ['druid'],
  },

  // --- Tier 3 (shop at party Lv5+) ---
  mythril_blade: {
    id: 'mythril_blade',
    name: 'Mythril Blade',
    description: 'Fighter masterwork. +12 ATK.',
    kind: 'weapon',
    price: 280,
    atkBonus: 12,
    classes: ['fighter'],
  },
  dragon_plate: {
    id: 'dragon_plate',
    name: 'Dragon Plate',
    description: 'Fighter masterwork. +18 DEF.',
    kind: 'armor',
    price: 290,
    defBonus: 18,
    classes: ['fighter'],
  },
  dawnbringer: {
    id: 'dawnbringer',
    name: 'Dawnbringer',
    description: 'Paladin masterwork. +10 ATK, +5 MDF.',
    kind: 'weapon',
    price: 300,
    atkBonus: 10,
    mdfBonus: 5,
    classes: ['paladin'],
  },
  aegis_mail: {
    id: 'aegis_mail',
    name: 'Aegis Mail',
    description: 'Paladin masterwork. +16 DEF, +9 MDF.',
    kind: 'armor',
    price: 305,
    defBonus: 16,
    mdfBonus: 9,
    classes: ['paladin'],
  },
  berserker_axe: {
    id: 'berserker_axe',
    name: 'Berserker Axe',
    description: 'Barbarian masterwork. +16 ATK.',
    kind: 'weapon',
    price: 285,
    atkBonus: 16,
    classes: ['barbarian'],
  },
  wyvern_hide: {
    id: 'wyvern_hide',
    name: 'Wyvern Hide',
    description: 'Barbarian masterwork. +13 DEF, +5 AGI.',
    kind: 'armor',
    price: 260,
    defBonus: 13,
    agiBonus: 5,
    classes: ['barbarian'],
  },
  shadowfang: {
    id: 'shadowfang',
    name: 'Shadowfang',
    description: 'Thief masterwork. +8 ATK, +8 AGI.',
    kind: 'weapon',
    price: 275,
    atkBonus: 8,
    agiBonus: 8,
    classes: ['thief'],
  },
  ghost_leather: {
    id: 'ghost_leather',
    name: 'Ghost Leather',
    description: 'Thief masterwork. +11 DEF, +9 AGI.',
    kind: 'armor',
    price: 270,
    defBonus: 11,
    agiBonus: 9,
    classes: ['thief'],
  },
  judicator: {
    id: 'judicator',
    name: 'Judicator',
    description: 'Cleric masterwork. +7 ATK, +6 MAT.',
    kind: 'weapon',
    price: 275,
    atkBonus: 7,
    matBonus: 6,
    classes: ['cleric'],
  },
  archon_vestments: {
    id: 'archon_vestments',
    name: 'Archon Vestments',
    description: 'Cleric masterwork. +13 DEF, +13 MDF.',
    kind: 'armor',
    price: 285,
    defBonus: 13,
    mdfBonus: 13,
    classes: ['cleric'],
  },
  void_staff: {
    id: 'void_staff',
    name: 'Void Staff',
    description: 'Mage masterwork. +15 MAT.',
    kind: 'weapon',
    price: 310,
    matBonus: 15,
    classes: ['mage'],
  },
  archmage_robe: {
    id: 'archmage_robe',
    name: 'Archmage Robe',
    description: 'Mage masterwork. +9 DEF, +17 MDF.',
    kind: 'armor',
    price: 300,
    defBonus: 9,
    mdfBonus: 17,
    classes: ['mage'],
  },
  worldroot_staff: {
    id: 'worldroot_staff',
    name: 'Worldroot Staff',
    description: 'Druid masterwork. +11 MAT, +3 ATK.',
    kind: 'weapon',
    price: 285,
    matBonus: 11,
    atkBonus: 3,
    classes: ['druid'],
  },
  elder_bark: {
    id: 'elder_bark',
    name: 'Elder Bark',
    description: 'Druid masterwork. +13 DEF, +12 MDF.',
    kind: 'armor',
    price: 280,
    defBonus: 13,
    mdfBonus: 12,
    classes: ['druid'],
  },

  // Sellable dungeon treasure
  rough_gem: {
    id: 'rough_gem',
    name: 'Rough Gem',
    description: 'Uncut stone. Merchants pay modestly.',
    kind: 'treasure',
    price: 36,
  },
  ancient_coin: {
    id: 'ancient_coin',
    name: 'Ancient Coin',
    description: 'Strange minting from a lost age.',
    kind: 'treasure',
    price: 48,
  },
  silver_band: {
    id: 'silver_band',
    name: 'Silver Band',
    description: 'Plain ring of decent silver.',
    kind: 'treasure',
    price: 64,
  },
  relic_shard: {
    id: 'relic_shard',
    name: 'Relic Shard',
    description: 'Fragment of a broken holy relic.',
    kind: 'treasure',
    price: 90,
  },
  ornate_idol: {
    id: 'ornate_idol',
    name: 'Ornate Idol',
    description: 'Collectors in town will pay well.',
    kind: 'treasure',
    price: 130,
  },
};

/** Shared consumables always in the shop. */
export const SHOP_CONSUMABLES = ['potion', 'hi_potion', 'ether'];

/** Tier 1 shop / starting gear. */
export const CLASS_GEAR: Record<ClassId, { weapon: string; armor: string }> = {
  fighter: { weapon: 'iron_blade', armor: 'plate_mail' },
  paladin: { weapon: 'holy_longsword', armor: 'sanctified_mail' },
  barbarian: { weapon: 'greataxe', armor: 'hide_armor' },
  thief: { weapon: 'steel_daggers', armor: 'shadow_leather' },
  cleric: { weapon: 'blessed_mace', armor: 'vestments' },
  mage: { weapon: 'arcane_staff', armor: 'wizard_robe' },
  druid: { weapon: 'oaken_staff', armor: 'barkskin_wrap' },
};

/** Same as shop tier 1 — heroes begin fully equipped. */
export const CLASS_STARTER_GEAR = CLASS_GEAR;

/** Level-gated upgrades (tier 2 at Lv3+, tier 3 at Lv5+). */
export const CLASS_GEAR_TIER2: Record<ClassId, { weapon: string; armor: string }> = {
  fighter: { weapon: 'steel_blade', armor: 'reinforced_plate' },
  paladin: { weapon: 'radiant_blade', armor: 'guardian_mail' },
  barbarian: { weapon: 'war_axe', armor: 'beast_hide' },
  thief: { weapon: 'assassin_blades', armor: 'night_leather' },
  cleric: { weapon: 'sanctum_mace', armor: 'bishop_vestments' },
  mage: { weapon: 'crystal_staff', armor: 'runed_robe' },
  druid: { weapon: 'heartwood_staff', armor: 'ironbark_wrap' },
};

export const CLASS_GEAR_TIER3: Record<ClassId, { weapon: string; armor: string }> = {
  fighter: { weapon: 'mythril_blade', armor: 'dragon_plate' },
  paladin: { weapon: 'dawnbringer', armor: 'aegis_mail' },
  barbarian: { weapon: 'berserker_axe', armor: 'wyvern_hide' },
  thief: { weapon: 'shadowfang', armor: 'ghost_leather' },
  cleric: { weapon: 'judicator', armor: 'archon_vestments' },
  mage: { weapon: 'void_staff', armor: 'archmage_robe' },
  druid: { weapon: 'worldroot_staff', armor: 'elder_bark' },
};

export function gearTierForLevel(level: number): 1 | 2 | 3 {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

export function canEquip(itemId: string, classId: ClassId | undefined): boolean {
  const item = ITEMS[itemId];
  if (!item || (item.kind !== 'weapon' && item.kind !== 'armor')) return false;
  if (!item.classes || item.classes.length === 0) return true;
  return !!classId && item.classes.includes(classId);
}

/** Shop stock: consumables + gear up to the party's highest tier. */
export function shopStockForParty(classIds: ClassId[], partyLevel = 1): string[] {
  const tier = gearTierForLevel(partyLevel);
  const gear: string[] = [];
  const seen = new Set<string>();
  const addPair = (pair?: { weapon: string; armor: string }) => {
    if (!pair) return;
    for (const id of [pair.weapon, pair.armor]) {
      if (seen.has(id)) continue;
      seen.add(id);
      gear.push(id);
    }
  };
  for (const id of classIds) {
    addPair(CLASS_GEAR[id]);
    if (tier >= 2) addPair(CLASS_GEAR_TIER2[id]);
    if (tier >= 3) addPair(CLASS_GEAR_TIER3[id]);
  }
  return [...SHOP_CONSUMABLES, ...gear];
}
