import type { ClassDef } from './types';

export const CLASSES: ClassDef[] = [
  {
    id: 'fighter',
    name: 'Fighter',
    role: 'Frontline DPS / Tank',
    description: 'Reliable martial expert. High ATK and DEF, no magic.',
    color: 0xc45c26,
    base: { hp: 42, mp: 8, atk: 12, def: 10, mat: 4, mdf: 6, agi: 8, luk: 6 },
    growth: { hp: 8, mp: 1, atk: 3, def: 2, mat: 0, mdf: 1, agi: 1, luk: 1 },
    skills: ['power_strike', 'second_wind', 'action_surge'],
  },
  {
    id: 'paladin',
    name: 'Paladin',
    role: 'Holy Tank / Support',
    description: 'Smites undead, heals allies, and holds the line.',
    color: 0xe8c547,
    base: { hp: 40, mp: 16, atk: 10, def: 11, mat: 7, mdf: 9, agi: 7, luk: 6 },
    growth: { hp: 7, mp: 3, atk: 2, def: 2, mat: 1, mdf: 2, agi: 1, luk: 1 },
    skills: ['lay_on_hands', 'divine_smite', 'aura_protection'],
  },
  {
    id: 'barbarian',
    name: 'Barbarian',
    role: 'Burst Bruiser',
    description: 'Huge physical damage. Rage trades defense for fury.',
    color: 0xb33a3a,
    base: { hp: 48, mp: 4, atk: 14, def: 7, mat: 3, mdf: 4, agi: 9, luk: 5 },
    growth: { hp: 9, mp: 0, atk: 3, def: 1, mat: 0, mdf: 0, agi: 2, luk: 1 },
    skills: ['rage', 'reckless_attack'],
  },
  {
    id: 'thief',
    name: 'Thief',
    role: 'Speed / Utility',
    description: 'First strikes, crits, stealth, and stealing.',
    color: 0x6b8f71,
    base: { hp: 30, mp: 12, atk: 10, def: 6, mat: 5, mdf: 6, agi: 14, luk: 12 },
    growth: { hp: 5, mp: 2, atk: 2, def: 1, mat: 1, mdf: 1, agi: 3, luk: 2 },
    skills: ['sneak_attack', 'hide', 'steal'],
  },
  {
    id: 'cleric',
    name: 'Cleric',
    role: 'Healer / Support',
    description: 'Best restoration and divine party buffs.',
    color: 0xf2f0e4,
    base: { hp: 34, mp: 28, atk: 6, def: 8, mat: 9, mdf: 12, agi: 7, luk: 7 },
    growth: { hp: 5, mp: 5, atk: 1, def: 1, mat: 2, mdf: 2, agi: 1, luk: 1 },
    skills: ['cure_wounds', 'bless', 'mass_cure'],
  },
  {
    id: 'mage',
    name: 'Mage',
    role: 'Arcane Nuker',
    description: 'Highest spell damage and crowd control. Fragile.',
    color: 0x5b6ee1,
    base: { hp: 26, mp: 36, atk: 4, def: 4, mat: 14, mdf: 10, agi: 8, luk: 8 },
    growth: { hp: 3, mp: 6, atk: 0, def: 0, mat: 3, mdf: 2, agi: 1, luk: 1 },
    skills: ['magic_missile', 'fireball', 'shield'],
  },
  {
    id: 'druid',
    name: 'Druid',
    role: 'Nature Caster',
    description: 'Flexible nature magic: damage, bind, and healing.',
    color: 0x3d8b5a,
    base: { hp: 32, mp: 30, atk: 7, def: 7, mat: 11, mdf: 11, agi: 9, luk: 7 },
    growth: { hp: 5, mp: 5, atk: 1, def: 1, mat: 2, mdf: 2, agi: 2, luk: 1 },
    skills: ['thorn_whip', 'entangle', 'healing_spirit'],
  },
];

export function getClass(id: string): ClassDef {
  const found = CLASSES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown class: ${id}`);
  return found;
}
