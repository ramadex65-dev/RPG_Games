import type { ClassId, Combatant, GameState, InventoryItem } from '../data/types';
import { addItem } from './inventory';
import { createHero } from './party';

const SAVE_KEY = 'seven_traditions_save_v3';
const LEGACY_KEYS = ['seven_traditions_save_v2', 'seven_traditions_save_v1'];

export function defaultState(): GameState {
  return {
    party: [],
    reserve: [],
    gold: 120,
    flags: { tutorialShown: false },
    chests: {},
    location: 'town',
    playerX: 11,
    playerY: 8,
    dungeonCleared: false,
    ruinsCleared: false,
  };
}

export function startNewGame(classIds: string[]): GameState {
  const state = defaultState();
  state.party = classIds.map((id, i) => createHero(id as ClassId, 1, i));
  return state;
}

function migrateHero(raw: Partial<Combatant>): Combatant {
  const classId = (raw.classId as ClassId) ?? 'fighter';
  const base = createHero(classId, raw.level ?? 1, 0);
  const inventory: InventoryItem[] = Array.isArray(raw.inventory)
    ? raw.inventory.map((i) => ({ ...i }))
    : [];

  return {
    ...base,
    ...raw,
    classId,
    name: raw.name ?? base.name,
    stats: raw.stats ?? base.stats,
    currentHp: raw.currentHp ?? base.currentHp,
    currentMp: raw.currentMp ?? base.currentMp,
    skills: raw.skills ?? base.skills,
    states: raw.states ?? [],
    equipment: raw.equipment ?? {},
    inventory: inventory.length ? inventory : base.inventory,
    color: raw.color ?? base.color,
    isPlayer: true,
  };
}

function migrateState(parsed: Partial<GameState>): GameState {
  const party = (parsed.party ?? []).map(migrateHero);
  const reserve = (parsed.reserve ?? []).map(migrateHero);
  if (Array.isArray(parsed.inventory) && parsed.inventory.length && party[0]) {
    for (const stack of parsed.inventory) {
      addItem(party[0].inventory, stack.id, stack.qty);
    }
  }
  return {
    ...defaultState(),
    ...parsed,
    party,
    reserve,
    chests: parsed.chests ?? {},
    ruinsCleared: parsed.ruinsCleared ?? false,
    inventory: undefined,
  };
}

export function saveGame(state: GameState): void {
  const clean: GameState = { ...state, inventory: undefined };
  localStorage.setItem(SAVE_KEY, JSON.stringify(clean));
}

export function loadGame(): GameState | null {
  let raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    for (const k of LEGACY_KEYS) {
      raw = localStorage.getItem(k);
      if (raw) break;
    }
  }
  if (!raw) return null;
  try {
    return migrateState(JSON.parse(raw) as GameState);
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  if (localStorage.getItem(SAVE_KEY)) return true;
  return LEGACY_KEYS.some((k) => localStorage.getItem(k) != null);
}
