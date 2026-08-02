import { ITEMS } from '../data/items';
import type { FloorChest, GameState, GeneratedFloor } from '../data/types';
import { addItem } from '../systems/inventory';

export function activeFloor(state: GameState, map: 'dungeon' | 'ruins'): GeneratedFloor | null {
  return map === 'dungeon' ? state.caveFloor ?? null : state.ruinsFloor ?? null;
}

export function chestAt(state: GameState, map: 'dungeon' | 'ruins', x: number, y: number): FloorChest | undefined {
  const floor = activeFloor(state, map);
  return floor?.chests.find((c) => c.x === x && c.y === y);
}

export function openChest(state: GameState, chest: FloorChest): string {
  if (chest.opened || state.chests[chest.id]) return 'The chest is empty.';
  chest.opened = true;
  state.chests[chest.id] = true;

  const parts: string[] = [];
  if (chest.gold > 0) {
    state.gold += chest.gold;
    parts.push(`+${chest.gold} gold`);
  }

  const qty = chest.itemQty ?? 1;
  if (chest.itemId && qty > 0) {
    const lead = state.party[0];
    const def = ITEMS[chest.itemId];
    if (lead && def) {
      addItem(lead.inventory, chest.itemId, qty);
      const name = def.name;
      parts.push(qty > 1 ? `${name} x${qty}` : name);
    }
  }

  if (!parts.length) return 'The chest rattles… empty.';
  return `Chest! ${parts.join('  ·  ')}`;
}
