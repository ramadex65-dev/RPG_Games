import type { GameState } from '../data/types';
import { defaultState } from './save';

let state: GameState = defaultState();
let pendingEncounter: string[] | null = null;
let pendingBoss = false;

export const Registry = {
  get(): GameState {
    return state;
  },
  set(next: GameState): void {
    state = next;
  },
  setEncounter(enemies: string[], boss = false): void {
    pendingEncounter = enemies;
    pendingBoss = boss;
  },
  consumeEncounter(): { enemies: string[]; boss: boolean } | null {
    if (!pendingEncounter) return null;
    const result = { enemies: pendingEncounter, boss: pendingBoss };
    pendingEncounter = null;
    pendingBoss = false;
    return result;
  },
};
