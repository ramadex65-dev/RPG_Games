export type Element =
  | 'physical'
  | 'fire'
  | 'ice'
  | 'thunder'
  | 'holy'
  | 'nature'
  | 'dark';

export type ClassId =
  | 'fighter'
  | 'paladin'
  | 'barbarian'
  | 'thief'
  | 'cleric'
  | 'mage'
  | 'druid';

export interface Stats {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  mat: number;
  mdf: number;
  agi: number;
  luk: number;
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  learnLevel: number;
  target: 'enemy' | 'enemies' | 'ally' | 'allies' | 'self';
  power: number;
  element: Element;
  kind: 'physical' | 'magical' | 'heal' | 'buff' | 'utility';
  stateId?: string;
  stateTurns?: number;
  undeadBonus?: number;
  stealChance?: number;
}

export interface ClassDef {
  id: ClassId;
  name: string;
  role: string;
  description: string;
  color: number;
  base: Stats;
  growth: Stats;
  skills: string[];
}

export interface EnemyDef {
  id: string;
  name: string;
  color: number;
  level: number;
  stats: Stats;
  xp: number;
  gold: number;
  skills: string[];
  isBoss?: boolean;
  undead?: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  kind: 'consumable' | 'weapon' | 'armor';
  price: number;
  healHp?: number;
  healMp?: number;
  atkBonus?: number;
  defBonus?: number;
  matBonus?: number;
  mdfBonus?: number;
  agiBonus?: number;
  /** Empty / omitted = any class. */
  classes?: ClassId[];
}

export interface Combatant {
  id: string;
  name: string;
  isPlayer: boolean;
  classId?: ClassId;
  level: number;
  xp: number;
  stats: Stats;
  currentHp: number;
  currentMp: number;
  skills: string[];
  states: { id: string; turns: number }[];
  color: number;
  undead?: boolean;
  equipment: { weapon?: string; armor?: string };
  inventory: InventoryItem[];
}

export interface InventoryItem {
  id: string;
  qty: number;
}

export interface GameState {
  party: Combatant[];
  gold: number;
  /** @deprecated kept for save migration only */
  inventory?: InventoryItem[];
  flags: Record<string, boolean>;
  location: 'town' | 'dungeon';
  playerX: number;
  playerY: number;
  dungeonCleared: boolean;
}
