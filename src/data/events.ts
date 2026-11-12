import type { GameState } from './types';
import { ITEMS } from './items';
import { addItem, pruneEmpty, removeItem } from '../systems/inventory';
import { TREASURE_IDS } from '../systems/loot';

export type EventLocale = 'dungeon' | 'ruins';

export interface EventOutcome {
  message: string;
  /** Start a battle with these enemy ids after the toast. */
  enemies?: string[];
  /** Set exploration stepsSinceFight to this (sooner next check). */
  stepsBoost?: number;
}

export interface EventChoiceOption {
  label: string;
  detail?: string;
  run: () => EventOutcome;
}

export type RolledEvent =
  | { kind: 'instant'; title: string; outcome: EventOutcome }
  | { kind: 'choice'; title: string; body: string; options: EventChoiceOption[] };

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function living(state: GameState) {
  return state.party.filter((h) => h.currentHp > 0);
}

function partyLevel(state: GameState): number {
  if (!state.party.length) return 1;
  return Math.max(1, Math.round(state.party.reduce((s, h) => s + h.level, 0) / state.party.length));
}

function lead(state: GameState) {
  return state.party[0];
}

function placeName(locale: EventLocale): string {
  return locale === 'ruins' ? 'ruins' : 'cave';
}

/** After a wander check fires: 20% event, 80% combat. */
export function rollWanderBranch(): 'event' | 'combat' {
  return Math.random() < 0.2 ? 'event' : 'combat';
}

function healPartyHp(state: GameState, pct: number): string {
  const heroes = living(state);
  if (!heroes.length) return 'No one is conscious to drink.';
  for (const h of heroes) {
    const gain = Math.max(1, Math.floor(h.stats.hp * pct));
    h.currentHp = Math.min(h.stats.hp, h.currentHp + gain);
  }
  return `The party recovers ${Math.round(pct * 100)}% HP.`;
}

function healPartyMp(state: GameState, pct: number): string {
  const heroes = living(state);
  if (!heroes.length) return 'No one is conscious to pray.';
  for (const h of heroes) {
    const gain = Math.max(1, Math.floor(h.stats.mp * pct));
    h.currentMp = Math.min(h.stats.mp, h.currentMp + gain);
  }
  return `The party recovers ${Math.round(pct * 100)}% MP.`;
}

function damageHero(state: GameState, pct: number, minDmg: number): string {
  const heroes = living(state);
  if (!heroes.length) return 'The hazard finds no prey.';
  const h = pick(heroes);
  const dmg = Math.max(minDmg, Math.floor(h.stats.hp * pct));
  h.currentHp = Math.max(1, h.currentHp - dmg);
  return `${h.name} takes ${dmg} damage!`;
}

function damageParty(state: GameState, pct: number): string {
  const heroes = living(state);
  if (!heroes.length) return 'The vapor drifts past empty air.';
  for (const h of heroes) {
    const dmg = Math.max(1, Math.floor(h.stats.hp * pct));
    h.currentHp = Math.max(1, h.currentHp - dmg);
  }
  return `Foul air burns the party (${Math.round(pct * 100)}% HP each).`;
}

function bagConsumables(state: GameState): { ownerIndex: number; itemId: string }[] {
  const out: { ownerIndex: number; itemId: string }[] = [];
  state.party.forEach((h, ownerIndex) => {
    h.inventory = pruneEmpty(h.inventory);
    for (const stack of h.inventory) {
      const def = ITEMS[stack.id];
      if (def?.kind === 'consumable' && stack.qty > 0) {
        out.push({ ownerIndex, itemId: stack.id });
      }
    }
  });
  return out;
}

const EVENT_IDS = [
  'spring',
  'shrine',
  'cache',
  'herb',
  'gem',
  'merchant',
  'trap',
  'gas',
  'collapse',
  'echo',
  'rest',
  'idol',
  'thief',
  'scholar',
  'duel',
  'blessing',
] as const;

type EventId = (typeof EVENT_IDS)[number];

function resolveInstant(id: EventId, state: GameState, locale: EventLocale): EventOutcome {
  const lvl = partyLevel(state);
  const place = placeName(locale);

  switch (id) {
    case 'spring':
      return {
        message: `Hidden Spring — A clear pool glows faintly in the ${place}.\n${healPartyHp(state, 0.25)}`,
      };
    case 'shrine':
      return {
        message: `Quiet Shrine — An old shrine still holds a blessing.\n${healPartyMp(state, 0.2)}`,
      };
    case 'cache': {
      const gold = randInt(15, 40) + Math.floor(lvl * 2);
      state.gold += gold;
      return {
        message: `Traveler’s Cache — A half-buried satchel yields ${gold}g.`,
      };
    }
    case 'herb': {
      const hero = lead(state);
      const itemId = lvl >= 3 ? 'hi_potion' : 'potion';
      if (!hero) return { message: 'Cave Herbs — No one to carry them.' };
      addItem(hero.inventory, itemId, 1);
      return {
        message: `Cave Herbs — ${hero.name} gathers 1× ${ITEMS[itemId].name}.`,
      };
    }
    case 'gem': {
      const hero = lead(state);
      if (!hero) return { message: 'Glitter in the Dark — Nothing to pocket it.' };
      const itemId = pick(TREASURE_IDS);
      addItem(hero.inventory, itemId, 1);
      return {
        message: `Glitter in the Dark — ${hero.name} pries free 1× ${ITEMS[itemId].name}.`,
      };
    }
    case 'trap':
      return {
        message: `Pressure Plate — The floor clicks.\n${damageHero(state, 0.12, 3)}`,
      };
    case 'gas':
      return {
        message: `Foul Vapor — A sour cloud rolls through.\n${damageParty(state, 0.08)}`,
      };
    case 'collapse': {
      const loss = Math.min(state.gold, randInt(8, 18));
      if (loss <= 0) {
        return {
          message: 'Loose Ceiling — Dust and stone rain down. You have no gold to lose in the scramble.',
        };
      }
      state.gold -= loss;
      return {
        message: `Loose Ceiling — In the scramble you lose ${loss}g.`,
      };
    }
    case 'echo':
      return {
        message: `Misleading Echo — Voices pull you off the path through the ${place}. Trouble feels closer.`,
        stepsBoost: 2,
      };
    case 'rest': {
      const hp = healPartyHp(state, 0.1);
      const mp = healPartyMp(state, 0.1);
      return {
        message: `Safe Alcove — A quiet nook, briefly secure.\n${hp}\n${mp}`,
      };
    }
    case 'thief': {
      const bags = bagConsumables(state);
      if (bags.length) {
        const steal = pick(bags);
        const hero = state.party[steal.ownerIndex];
        removeItem(hero.inventory, steal.itemId, 1);
        hero.inventory = pruneEmpty(hero.inventory);
        return {
          message: `Cutpurse Shadow — Something brushes the pack. ${hero.name} loses 1× ${ITEMS[steal.itemId].name}!`,
        };
      }
      const loss = Math.min(state.gold, 10);
      state.gold -= loss;
      return {
        message:
          loss > 0
            ? `Cutpurse Shadow — No potions to snatch; they lift ${loss}g instead.`
            : 'Cutpurse Shadow — They find neither coin nor potion. Empty-handed, they flee.',
      };
    }
    case 'scholar': {
      const gold = randInt(10, 20);
      state.gold += gold;
      const lore =
        locale === 'ruins'
          ? '“The Echo Knight is a memory given steel — strike the body, quiet the song.”'
          : '“The Ley Wraith drinks from the breach. Seal it, and the halls will sleep.”';
      return {
        message: `Lost Scholar — A researcher presses ${gold}g into your hand.\n${lore}`,
      };
    }
    case 'blessing': {
      const heroes = living(state);
      if (!heroes.length) {
        return { message: "Tradition’s Sign — Favor finds no living soul." };
      }
      const hero = pick(heroes);
      const stat = Math.random() < 0.5 ? 'atk' : 'def';
      state.nextBattleBuff = { heroId: hero.id, stat, amount: 2 };
      return {
        message: `Tradition’s Sign — ${hero.name} feels favored (+2 ${stat.toUpperCase()} in the next battle).`,
      };
    }
    default:
      return { message: 'Nothing happens.' };
  }
}

function resolveChoice(id: 'merchant' | 'idol' | 'duel', state: GameState, locale: EventLocale): RolledEvent {
  if (id === 'merchant') {
    return {
      kind: 'choice',
      title: 'Wandering Peddler',
      body: 'A hooded seller offers a sealed vial of ether for 25g.',
      options: [
        {
          label: 'Buy ether (25g)',
          detail: state.gold < 25 ? 'Not enough gold' : '1× Ether to the lead bag',
          run: () => {
            if (state.gold < 25) {
              return { message: 'Wandering Peddler — “Come back with coin.” They melt into shadow.' };
            }
            const hero = lead(state);
            if (!hero) return { message: 'Wandering Peddler — No one to trade with.' };
            state.gold -= 25;
            addItem(hero.inventory, 'ether', 1);
            return { message: `Wandering Peddler — ${hero.name} buys 1× Ether (−25g).` };
          },
        },
        {
          label: 'Refuse',
          detail: 'Walk on',
          run: () => ({ message: 'Wandering Peddler — You decline. The hood nods and vanishes.' }),
        },
      ],
    };
  }

  if (id === 'idol') {
    return {
      kind: 'choice',
      title: 'Cracked Idol',
      body: 'An idol hums with ley energy. Smash it for coin, or leave a quiet offering of rest?',
      options: [
        {
          label: 'Smash it',
          detail: 'Gain 20–50g',
          run: () => {
            const gold = randInt(20, 50);
            state.gold += gold;
            return { message: `Cracked Idol — Shatter! Coins spill from the hollow: +${gold}g.` };
          },
        },
        {
          label: 'Leave it',
          detail: 'Lead hero heals 15% HP',
          run: () => {
            const hero = lead(state);
            if (!hero || hero.currentHp <= 0) {
              return { message: 'Cracked Idol — You leave it be. No one gains the quiet gift.' };
            }
            const gain = Math.max(1, Math.floor(hero.stats.hp * 0.15));
            hero.currentHp = Math.min(hero.stats.hp, hero.currentHp + gain);
            return {
              message: `Cracked Idol — You leave it be. ${hero.name} feels eased (+${gain} HP).`,
            };
          },
        },
      ],
    };
  }

  // duel
  const enemies =
    locale === 'ruins' ? ['ruin_wisp'] : ['slime', 'bat'];
  const packLabel = enemies.map((id) => id.replace('_', ' ')).join(' + ');
  return {
    kind: 'choice',
    title: 'Rival Party',
    body: 'Another group blocks the hall and demands a 20g toll.',
    options: [
      {
        label: 'Pay the toll (20g)',
        detail: state.gold < 20 ? 'Not enough gold — they will attack' : 'Pass in peace',
        run: () => {
          if (state.gold < 20) {
            return {
              message: `Rival Party — Empty purses mean drawn blades! (${packLabel})`,
              enemies,
            };
          }
          state.gold -= 20;
          return { message: 'Rival Party — You pay 20g. They step aside with a smirk.' };
        },
      },
      {
        label: 'Fight them',
        detail: `Battle: ${packLabel}`,
        run: () => ({
          message: `Rival Party — Steel it is! (${packLabel})`,
          enemies,
        }),
      },
    ],
  };
}

/** Roll one random dungeon/ruins event and apply instant effects (choices deferred). */
export function rollDungeonEvent(state: GameState, locale: EventLocale): RolledEvent {
  const id = pick(EVENT_IDS);
  if (id === 'merchant' || id === 'idol' || id === 'duel') {
    return resolveChoice(id, state, locale);
  }
  return { kind: 'instant', title: id, outcome: resolveInstant(id, state, locale) };
}
