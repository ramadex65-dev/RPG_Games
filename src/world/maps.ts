/**
 * Town tiles:
 * 0 grass, 1 wall, 3 shop door, 4 inn door, 5 cave, 8 market path, 9 temple path, 10 ruins
 */

function row(s: string): number[] {
  return [...s].map((ch) => {
    switch (ch) {
      case '#':
        return 1;
      case 'S':
        return 3;
      case 'I':
        return 4;
      case 'C':
        return 5;
      case 'R':
        return 10;
      case 'm':
        return 8;
      case 't':
        return 9;
      default:
        return 0;
    }
  });
}

/** Larger town: Market west, Temple east, Cave south, Ruins southeast. */
export const TOWN_MAP: number[][] = [
  row('########################'),
  row('#......................#'),
  row('#..##....##....##..##..#'),
  row('#..##....S......I..##..#'),
  row('#........mmmm..tt......#'),
  row('#..##....mmmm..tt..##..#'),
  row('#........mmmm..tt......#'),
  row('#..mmmmmmmmmm..tttttt..#'),
  row('#........mm......tt....#'),
  row('#..##....mm..##..tt##..#'),
  row('#........mm......tt....#'),
  row('#........mmmmmmmmmm....#'),
  row('#..##..........##......#'),
  row('#......................#'),
  row('#......####.C.####..R..#'),
  row('#......#.........#.....#'),
  row('#......................#'),
  row('########################'),
];

export const DUNGEON_MAP: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

/** Ruins of Echoes — second dungeon */
export const RUINS_MAP: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const TILE = 40;

export interface ChestDef {
  id: string;
  map: 'dungeon' | 'ruins';
  x: number;
  y: number;
  gold: number;
  itemId?: string;
}

export const CHESTS: ChestDef[] = [
  { id: 'cave_cache', map: 'dungeon', x: 3, y: 5, gold: 40, itemId: 'hi_potion' },
  { id: 'cave_side', map: 'dungeon', x: 14, y: 7, gold: 25, itemId: 'ether' },
  { id: 'ruins_alcove', map: 'ruins', x: 15, y: 3, gold: 55, itemId: 'hi_potion' },
  { id: 'ruins_hall', map: 'ruins', x: 8, y: 9, gold: 35 },
];

export function mapPixelSize(map: number[][]): { w: number; h: number } {
  return { w: map[0].length * TILE, h: map.length * TILE };
}

export function isBlocked(map: number[][], tx: number, ty: number): boolean {
  if (ty < 0 || tx < 0 || ty >= map.length || tx >= map[0].length) return true;
  return map[ty][tx] === 1;
}

export function tileColor(tile: number, town = true): number {
  if (tile === 1) return town ? 0x3a4a3a : 0x2a2433;
  if (tile === 8) return 0x6a5a40;
  if (tile === 9) return 0x5a7a5a;
  if (tile === 10) return 0x6a6a8a;
  if (!town && tile === 0) return 0x3a3348;
  if (!town && tile === 2) return 0x4f7a4f;
  if (!town && tile === 6) return 0x8b4dff;
  return town ? 0x4f7a4f : 0x3a3348;
}
