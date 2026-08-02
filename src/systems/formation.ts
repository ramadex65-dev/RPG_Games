import { ITEMS } from '../data/items';
import { SKILLS } from '../data/skills';
import type { Combatant } from '../data/types';

export type FormationRow = 'front' | 'back';

/** Armor rating for formation — equipped armor DEF, then total DEF. */
export function armorWeight(hero: Combatant): number {
  const armorId = hero.equipment.armor;
  const fromArmor = armorId && ITEMS[armorId] ? (ITEMS[armorId].defBonus ?? 0) : 0;
  return fromArmor * 100 + hero.stats.def;
}

/** The two highest-armor living slots in the party stand front; everyone else back. */
export function frontLineHeroes(party: Combatant[]): Combatant[] {
  const ranked = party
    .map((h, i) => ({ h, i, w: armorWeight(h) }))
    .sort((a, b) => b.w - a.w || a.i - b.i);
  return ranked.slice(0, Math.min(2, ranked.length)).map((x) => x.h);
}

export function formationRow(hero: Combatant, party: Combatant[]): FormationRow {
  return frontLineHeroes(party).some((h) => h.id === hero.id) ? 'front' : 'back';
}

export function formationLabel(hero: Combatant, party: Combatant[]): string {
  return formationRow(hero, party) === 'front' ? 'Front' : 'Back';
}

/** Magical skills are ranged; physical / basic attacks / utility are melee. */
export function isRangedAttack(skillId?: string | null): boolean {
  if (!skillId) return false;
  const skill = SKILLS[skillId];
  return !!skill && skill.kind === 'magical';
}

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function weightedPick(heroes: Combatant[], weightOf: (h: Combatant) => number): Combatant {
  const weights = heroes.map(weightOf);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pickRandom(heroes);
  let roll = Math.random() * total;
  for (let i = 0; i < heroes.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return heroes[i];
  }
  return heroes[heroes.length - 1];
}

/**
 * Melee: strongly prefer front line.
 * Ranged: uniform random among living allies.
 */
export function pickHeroTarget(heroes: Combatant[], ranged: boolean): Combatant | null {
  const living = heroes.filter((h) => h.currentHp > 0);
  if (!living.length) return null;
  if (ranged) return pickRandom(living);

  const front = living.filter((h) => formationRow(h, heroes) === 'front');
  const back = living.filter((h) => formationRow(h, heroes) === 'back');
  if (front.length && !back.length) return pickRandom(front);
  if (back.length && !front.length) return pickRandom(back);

  // ~80% front when both rows exist (weight 4 vs 1).
  return weightedPick(living, (h) => (formationRow(h, heroes) === 'front' ? 4 : 1));
}

/** Battle sprite slots: front closer to enemies, back toward the right. */
export function battleSlotPosition(
  hero: Combatant,
  party: Combatant[],
): { x: number; y: number } {
  const row = formationRow(hero, party);
  const peers = party.filter((h) => formationRow(h, party) === row);
  const slot = Math.max(0, peers.indexOf(hero));
  const x = row === 'front' ? 500 : 620;
  const y = 105 + slot * 78;
  return { x, y };
}
