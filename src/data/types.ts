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
  weak?: Element[];
  resist?: Element[];
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  kind: 'consumable' | 'weapon' | 'armor' | 'treasure';
  price: number;
  healHp?: number;
  healMp?: number;
  atkBonus?: number;
  defBonus?: number;
  matBonus?: number;
  mdfBonus?: number;
  agiBonus?: number;
  classes?: ClassId[];
}

export interface FloorChest {
  id: string;
  x: number;
  y: number;
  opened: boolean;
  gold: number;
  itemId?: string;
  itemQty?: number;
}

export interface GeneratedFloor {
  kind: 'dungeon' | 'ruins';
  seed: number;
  map: number[][];
  entrance: { x: number; y: number };
  boss: { x: number; y: number };
  chests: FloorChest[];
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
  /** Enemy affinity mirror for combatants spawned from defs */
  weak?: Element[];
  resist?: Element[];
  /** Boss phase tracking */
  phase2?: boolean;
}

export interface InventoryItem {
  id: string;
  qty: number;
}

export type LocationId = 'town' | 'dungeon' | 'ruins';

/** One-shot buff from a dungeon event, applied in the next battle only. */
export interface NextBattleBuff {
  heroId: string;
  stat: 'atk' | 'def';
  amount: number;
}

export interface GameState {
  party: Combatant[];
  /** Recruited heroes not in the active four */
  reserve: Combatant[];
  gold: number;
  inventory?: InventoryItem[];
  flags: Record<string, boolean>;
  /** Legacy opened-chest flags (migrated runs may still use these) */
  chests: Record<string, boolean>;
  /** Active procedural cave layout for this delve */
  caveFloor?: GeneratedFloor;
  /** Active procedural ruins layout for this delve */
  ruinsFloor?: GeneratedFloor;
  location: LocationId;
  playerX: number;
  playerY: number;
  dungeonCleared: boolean;
  ruinsCleared: boolean;
  /** Tradition’s Sign — cleared when the next battle starts */
  nextBattleBuff?: NextBattleBuff;
}
