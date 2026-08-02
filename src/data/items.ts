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
    description: 'Fighter armor. +5 DEF.',
    kind: 'armor',
    price: 95,
    defBonus: 5,
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
    description: 'Paladin armor. +4 DEF, +2 MDF.',
    kind: 'armor',
    price: 100,
    defBonus: 4,
    mdfBonus: 2,
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
    description: 'Barbarian armor. +3 DEF, +1 AGI.',
    kind: 'armor',
    price: 75,
    defBonus: 3,
    agiBonus: 1,
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
    description: 'Thief armor. +2 DEF, +3 AGI.',
    kind: 'armor',
    price: 80,
    defBonus: 2,
    agiBonus: 3,
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
    description: 'Cleric robes. +3 DEF, +3 MDF.',
    kind: 'armor',
    price: 90,
    defBonus: 3,
    mdfBonus: 3,
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
    description: 'Mage robes. +2 DEF, +4 MDF.',
    kind: 'armor',
    price: 90,
    defBonus: 2,
    mdfBonus: 4,
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
    description: 'Druid armor. +3 DEF, +2 MDF.',
    kind: 'armor',
    price: 85,
    defBonus: 3,
    mdfBonus: 2,
    classes: ['druid'],
  },
};

/** Shared consumables always in the shop. */
export const SHOP_CONSUMABLES = ['potion', 'hi_potion', 'ether'];

/** Class gear pairs sold when that class is in the party. */
export const CLASS_GEAR: Record<ClassId, { weapon: string; armor: string }> = {
  fighter: { weapon: 'iron_blade', armor: 'plate_mail' },
  paladin: { weapon: 'holy_longsword', armor: 'sanctified_mail' },
  barbarian: { weapon: 'greataxe', armor: 'hide_armor' },
  thief: { weapon: 'steel_daggers', armor: 'shadow_leather' },
  cleric: { weapon: 'blessed_mace', armor: 'vestments' },
  mage: { weapon: 'arcane_staff', armor: 'wizard_robe' },
  druid: { weapon: 'oaken_staff', armor: 'barkskin_wrap' },
};

export function canEquip(itemId: string, classId: ClassId | undefined): boolean {
  const item = ITEMS[itemId];
  if (!item || (item.kind !== 'weapon' && item.kind !== 'armor')) return false;
  if (!item.classes || item.classes.length === 0) return true;
  return !!classId && item.classes.includes(classId);
}

export function shopStockForParty(classIds: ClassId[]): string[] {
  const gear: string[] = [];
  for (const id of classIds) {
    const pair = CLASS_GEAR[id];
    if (pair) {
      gear.push(pair.weapon, pair.armor);
    }
  }
  return [...SHOP_CONSUMABLES, ...gear];
}
