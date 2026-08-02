import type { GameState } from '../data/types';
import { addItem } from '../systems/inventory';
import { CHESTS, type ChestDef } from './maps';

export function chestAt(map: 'dungeon' | 'ruins', x: number, y: number): ChestDef | undefined {
  return CHESTS.find((c) => c.map === map && c.x === x && c.y === y);
}

export function openChest(state: GameState, chest: ChestDef): string {
  if (state.chests[chest.id]) return 'The chest is empty.';
  state.chests[chest.id] = true;
  state.gold += chest.gold;
  const lead = state.party[0];
  let msg = `Chest! +${chest.gold} gold.`;
  if (chest.itemId && lead) {
    addItem(lead.inventory, chest.itemId, 1);
    msg += ` ${lead.name} receives an item.`;
  }
  return msg;
}
