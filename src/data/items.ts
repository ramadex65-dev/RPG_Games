import type { ItemDef } from './types';

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
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: '+4 ATK.',
    kind: 'weapon',
    price: 80,
    atkBonus: 4,
  },
  leather_armor: {
    id: 'leather_armor',
    name: 'Leather Armor',
    description: '+3 DEF.',
    kind: 'armor',
    price: 70,
    defBonus: 3,
  },
};

export const SHOP_STOCK = ['potion', 'hi_potion', 'ether', 'iron_sword', 'leather_armor'];
