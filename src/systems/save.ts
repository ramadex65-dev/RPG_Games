import type { ClassId, Combatant, GameState, InventoryItem } from '../data/types';
import { addItem } from './inventory';
import { createHero } from './party';

const SAVE_KEY = 'seven_traditions_save_v2';
const LEGACY_KEY = 'seven_traditions_save_v1';

export function defaultState(): GameState {
  return {
    party: [],
    gold: 120,
    flags: { tutorialShown: false },
    location: 'town',
    playerX: 8,
    playerY: 8,
    dungeonCleared: false,
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

function migrateState(parsed: GameState): GameState {
  const party = (parsed.party ?? []).map(migrateHero);
  if (Array.isArray(parsed.inventory) && parsed.inventory.length && party[0]) {
    for (const stack of parsed.inventory) {
      addItem(party[0].inventory, stack.id, stack.qty);
    }
  }
  return {
    ...defaultState(),
    ...parsed,
    party,
    inventory: undefined,
  };
}

export function saveGame(state: GameState): void {
  const clean: GameState = { ...state, inventory: undefined };
  localStorage.setItem(SAVE_KEY, JSON.stringify(clean));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;
  try {
    return migrateState(JSON.parse(raw) as GameState);
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) != null || localStorage.getItem(LEGACY_KEY) != null;
}
