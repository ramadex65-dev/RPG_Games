import {
  CLASS_GEAR,
  CLASS_GEAR_TIER2,
  CLASS_GEAR_TIER3,
  ITEMS,
  SHOP_CONSUMABLES,
} from '../data/items';
import type { ClassId } from '../data/types';

/** Sellable treasure found in chests (not equippable). */
export const TREASURE_IDS = [
  'rough_gem',
  'ancient_coin',
  'silver_band',
  'relic_shard',
  'ornate_idol',
] as const;

const ALL_GEAR: string[] = [
  ...Object.values(CLASS_GEAR),
  ...Object.values(CLASS_GEAR_TIER2),
  ...Object.values(CLASS_GEAR_TIER3),
].flatMap((g) => [g.weapon, g.armor]);

function randInt(min: number, max: number): number {
  const a = Math.min(min, max);
  const b = Math.max(min, max);
  return a + Math.floor(Math.random() * (b - a + 1));
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export interface ChestLoot {
  gold: number;
  itemId?: string;
  itemQty?: number;
}

/**
 * Random chest contents scaled by party level.
 * Can yield gold, consumables, sellable treasure, or gear.
 */
export function rollChestLoot(partyLevel: number, kind: 'dungeon' | 'ruins'): ChestLoot {
  const tier = Math.max(1, Math.min(6, partyLevel + randInt(-1, 1) + (kind === 'ruins' ? 1 : 0)));
  const roll = Math.random();

  // Always a chance at gold; amount scales with tier
  const goldBase = kind === 'ruins' ? 22 : 14;
  let gold = randInt(goldBase * tier, goldBase * tier * 2 + 10);
  let itemId: string | undefined;
  let itemQty: number | undefined;

  if (roll < 0.28) {
    // Gold only — richer purse
    gold = randInt(goldBase * tier * 2, goldBase * tier * 3 + 20);
  } else if (roll < 0.52) {
    // Consumables
    itemId = pick(SHOP_CONSUMABLES);
    itemQty = randInt(1, Math.min(3, 1 + Math.floor(tier / 2)));
    if (tier >= 3 && Math.random() < 0.35) itemId = 'hi_potion';
  } else if (roll < 0.78) {
    // Sellable treasure (tier picks better idols more often)
    const treasurePool =
      tier >= 4
        ? TREASURE_IDS
        : tier >= 2
          ? TREASURE_IDS.slice(0, 4)
          : TREASURE_IDS.slice(0, 3);
    itemId = pick(treasurePool);
    itemQty = randInt(1, tier >= 4 ? 2 : 1);
  } else {
    // Gear
    itemId = pick(ALL_GEAR);
    itemQty = 1;
    gold = randInt(Math.floor(gold * 0.4), Math.floor(gold * 0.8));
  }

  // Small chance of bonus second treasure pile (extra gold)
  if (Math.random() < 0.15) gold += randInt(8, 12 + tier * 6);

  return { gold, itemId, itemQty };
}

/** Shop buyback rate for selling. */
export function sellPrice(itemId: string): number {
  const item = ITEMS[itemId];
  if (!item) return 1;
  return Math.max(1, Math.floor(item.price * 0.5));
}

export function isSellable(itemId: string): boolean {
  const item = ITEMS[itemId];
  if (!item) return false;
  return item.kind === 'consumable' || item.kind === 'weapon' || item.kind === 'armor' || item.kind === 'treasure';
}

export function gearForClasses(classIds: ClassId[]): string[] {
  const out: string[] = [];
  for (const id of classIds) {
    const pair = CLASS_GEAR[id];
    if (pair) out.push(pair.weapon, pair.armor);
  }
  return out;
}
