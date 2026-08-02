import type { GameState } from '../data/types';
import { createHero } from './party';

const SAVE_KEY = 'seven_traditions_save_v1';

export function defaultState(): GameState {
  return {
    party: [],
    gold: 80,
    inventory: [
      { id: 'potion', qty: 3 },
      { id: 'ether', qty: 1 },
    ],
    flags: { tutorialShown: false },
    location: 'town',
    playerX: 8,
    playerY: 8,
    dungeonCleared: false,
  };
}

export function startNewGame(classIds: string[]): GameState {
  const state = defaultState();
  state.party = classIds.map((id, i) => createHero(id as never, 1, i));
  return state;
}

export function saveGame(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) != null;
}
