import { ITEMS } from '../data/items';
import type { Combatant, InventoryItem, Stats } from '../data/types';

export function addItem(bag: InventoryItem[], itemId: string, qty = 1): void {
  const stack = bag.find((i) => i.id === itemId);
  if (stack) stack.qty += qty;
  else bag.push({ id: itemId, qty });
}

export function removeItem(bag: InventoryItem[], itemId: string, qty = 1): boolean {
  const stack = bag.find((i) => i.id === itemId);
  if (!stack || stack.qty < qty) return false;
  stack.qty -= qty;
  return true;
}

export function pruneEmpty(bag: InventoryItem[]): InventoryItem[] {
  return bag.filter((i) => i.qty > 0);
}

export function applyEquipBonuses(hero: Combatant, itemId: string, sign: 1 | -1): void {
  const item = ITEMS[itemId];
  if (!item) return;
  hero.stats.atk += (item.atkBonus ?? 0) * sign;
  hero.stats.def += (item.defBonus ?? 0) * sign;
  hero.stats.mat += (item.matBonus ?? 0) * sign;
  hero.stats.mdf += (item.mdfBonus ?? 0) * sign;
  hero.stats.agi += (item.agiBonus ?? 0) * sign;
}

export function unequipSlot(hero: Combatant, slot: 'weapon' | 'armor'): string | null {
  const current = hero.equipment[slot];
  if (!current) return null;
  applyEquipBonuses(hero, current, -1);
  delete hero.equipment[slot];
  return current;
}

export function equipItem(hero: Combatant, itemId: string): string {
  const item = ITEMS[itemId];
  if (!item || (item.kind !== 'weapon' && item.kind !== 'armor')) {
    return 'That cannot be equipped.';
  }
  const slot = item.kind === 'weapon' ? 'weapon' : 'armor';
  const bagQty = hero.inventory.find((i) => i.id === itemId)?.qty ?? 0;
  const alreadyEquipped = hero.equipment[slot] === itemId;
  if (bagQty <= 0 && !alreadyEquipped) return 'Item not in inventory.';

  // Unequip current
  const current = hero.equipment[slot];
  if (current) {
    applyEquipBonuses(hero, current, -1);
    addItem(hero.inventory, current, 1);
  }

  if (!alreadyEquipped) {
    removeItem(hero.inventory, itemId, 1);
    hero.inventory = pruneEmpty(hero.inventory);
  }

  hero.equipment[slot] = itemId;
  applyEquipBonuses(hero, itemId, 1);
  return `Equipped ${item.name} on ${hero.name}.`;
}

export function formatBag(hero: Combatant): string {
  const w = hero.equipment.weapon ? ITEMS[hero.equipment.weapon]?.name : '—';
  const a = hero.equipment.armor ? ITEMS[hero.equipment.armor]?.name : '—';
  const bag =
    hero.inventory.length === 0
      ? '(empty)'
      : hero.inventory.map((i) => `${ITEMS[i.id]?.name ?? i.id} x${i.qty}`).join(', ');
  return `${hero.name}\n  Weapon: ${w}\n  Armor: ${a}\n  Bag: ${bag}\n  ATK ${hero.stats.atk}  DEF ${hero.stats.def}  MAT ${hero.stats.mat}  MDF ${hero.stats.mdf}  AGI ${hero.stats.agi}`;
}

function bonusLine(label: string, delta: number): string {
  if (!delta) return '';
  return `${label}${delta > 0 ? '+' : ''}${delta} `;
}

/** Preview equipping itemId onto hero (does not mutate). */
export function equipPreview(hero: Combatant, itemId: string): string {
  const item = ITEMS[itemId];
  if (!item || (item.kind !== 'weapon' && item.kind !== 'armor')) return item?.description ?? '';
  const slot = item.kind === 'weapon' ? 'weapon' : 'armor';
  const currentId = hero.equipment[slot];
  const cur = currentId ? ITEMS[currentId] : null;
  const keys: (keyof Stats)[] = ['atk', 'def', 'mat', 'mdf', 'agi'];
  const map: Record<string, keyof typeof item> = {
    atk: 'atkBonus',
    def: 'defBonus',
    mat: 'matBonus',
    mdf: 'mdfBonus',
    agi: 'agiBonus',
  };
  let out = `${item.name}: `;
  for (const k of keys) {
    const next = (item[map[k]] as number | undefined) ?? 0;
    const prev = cur ? ((cur[map[k]] as number | undefined) ?? 0) : 0;
    out += bonusLine(k.toUpperCase() + ' ', next - prev);
  }
  if (cur) out += `(replaces ${cur.name})`;
  else out += '(empty slot)';
  return out.trim();
}

export function shopItemLabel(itemId: string, hero?: Combatant): string {
  const item = ITEMS[itemId];
  if (!item) return itemId;
  const who =
    item.classes && item.classes.length ? ` [${item.classes.map((c) => c.slice(0, 3)).join('/')}]` : '';
  let label = `${item.name} — ${item.price}g${who}`;
  if (hero && (item.kind === 'weapon' || item.kind === 'armor')) {
    label += ` | ${equipPreview(hero, itemId)}`;
  } else if (item.kind === 'weapon' || item.kind === 'armor') {
    const bits = shopBonusBits(itemId);
    if (bits) label += ` (${bits})`;
  }
  return label;
}

export function shopBonusBits(itemId: string): string {
  const item = ITEMS[itemId];
  if (!item) return '';
  return [
    item.atkBonus ? `ATK+${item.atkBonus}` : '',
    item.defBonus ? `DEF+${item.defBonus}` : '',
    item.matBonus ? `MAT+${item.matBonus}` : '',
    item.mdfBonus ? `MDF+${item.mdfBonus}` : '',
    item.agiBonus ? `AGI+${item.agiBonus}` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Compact two-line shop row: name/price + classes/bonuses. */
export function shopItemRows(itemId: string): { label: string; detail: string } {
  const item = ITEMS[itemId];
  if (!item) return { label: itemId, detail: '' };
  const who =
    item.classes && item.classes.length
      ? item.classes.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')
      : 'All';
  const bits = shopBonusBits(itemId);
  return {
    label: `${item.name}   ${item.price}g`,
    detail: bits ? `${who}  ·  ${bits}` : `${who}  ·  ${item.description}`,
  };
}

/** All consumables across the party, tagged by owner index. */
export function listPartyConsumables(party: Combatant[]): { ownerIndex: number; itemId: string; qty: number; label: string }[] {
  const out: { ownerIndex: number; itemId: string; qty: number; label: string }[] = [];
  party.forEach((h, ownerIndex) => {
    for (const stack of h.inventory) {
      const def = ITEMS[stack.id];
      if (!def || def.kind !== 'consumable' || stack.qty <= 0) continue;
      out.push({
        ownerIndex,
        itemId: stack.id,
        qty: stack.qty,
        label: `${def.name} x${stack.qty} (${h.name})`,
      });
    }
  });
  return out;
}
