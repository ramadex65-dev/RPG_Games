import type { FloorChest, GeneratedFloor, LocationId } from '../data/types';
import { rollChestLoot } from '../systems/loot';

type Rect = { x: number; y: number; w: number; h: number };

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function carve(map: number[][], x: number, y: number): void {
  if (y <= 0 || x <= 0 || y >= map.length - 1 || x >= map[0].length - 1) return;
  map[y][x] = 0;
}

function carveRoom(map: number[][], r: Rect): void {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) carve(map, x, y);
  }
}

function carveH(map: number[][], x1: number, x2: number, y: number): void {
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) carve(map, x, y);
}

function carveV(map: number[][], y1: number, y2: number, x: number): void {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) carve(map, x, y);
}

function center(r: Rect): { x: number; y: number } {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function floors(map: number[][]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 1; y < map.length - 1; y++) {
    for (let x = 1; x < map[0].length - 1; x++) {
      if (map[y][x] === 0) out.push({ x, y });
    }
  }
  return out;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Procedural dungeon / ruins layout.
 * Tiles: 0 floor, 1 wall, 2 town exit, 6 boss.
 */
export function generateFloor(
  kind: 'dungeon' | 'ruins',
  partyLevel: number,
): GeneratedFloor {
  const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
  const width = kind === 'dungeon' ? 22 : 18;
  const height = 15;
  const map: number[][] = Array.from({ length: height }, () => Array(width).fill(1));

  const rooms: Rect[] = [];
  const attempts = kind === 'dungeon' ? 28 : 22;
  for (let i = 0; i < attempts && rooms.length < (kind === 'dungeon' ? 8 : 7); i++) {
    const w = randInt(3, 6);
    const h = randInt(3, 5);
    const x = randInt(1, width - w - 2);
    const y = randInt(1, height - h - 2);
    const next = { x, y, w, h };
    const overlaps = rooms.some(
      (r) =>
        next.x <= r.x + r.w + 1 &&
        next.x + next.w + 1 >= r.x &&
        next.y <= r.y + r.h + 1 &&
        next.y + next.h + 1 >= r.y,
    );
    if (overlaps) continue;
    rooms.push(next);
    carveRoom(map, next);
  }

  // Guarantee at least a few rooms
  while (rooms.length < 4) {
    const w = randInt(4, 5);
    const h = randInt(3, 4);
    const x = randInt(1, width - w - 2);
    const y = randInt(1, height - h - 2);
    const next = { x, y, w, h };
    rooms.push(next);
    carveRoom(map, next);
  }

  // Connect rooms in order
  for (let i = 1; i < rooms.length; i++) {
    const a = center(rooms[i - 1]);
    const b = center(rooms[i]);
    if (Math.random() < 0.5) {
      carveH(map, a.x, b.x, a.y);
      carveV(map, a.y, b.y, b.x);
    } else {
      carveV(map, a.y, b.y, a.x);
      carveH(map, a.x, b.x, b.y);
    }
  }

  const walk = floors(map);
  // Entrance: prefer top half / near first room
  const entranceRoom = rooms[0];
  const entrance = center(entranceRoom);
  map[entrance.y][entrance.x] = 2;

  // Boss: farthest floor from entrance
  let boss = walk[0];
  let best = -1;
  for (const p of walk) {
    if (p.x === entrance.x && p.y === entrance.y) continue;
    const d = dist(p, entrance);
    if (d > best) {
      best = d;
      boss = p;
    }
  }
  map[boss.y][boss.x] = 6;

  // Chests on open floors away from entrance/boss
  const chestCount = randInt(2, kind === 'dungeon' ? 4 : 3);
  const candidates = walk
    .filter((p) => dist(p, entrance) >= 3 && dist(p, boss) >= 2 && map[p.y][p.x] === 0)
    .sort(() => Math.random() - 0.5);

  const chests: FloorChest[] = [];
  for (let i = 0; i < chestCount && i < candidates.length; i++) {
    const p = candidates[i];
    const loot = rollChestLoot(partyLevel, kind);
    chests.push({
      id: `${kind}_${seed}_${i}_${p.x}_${p.y}`,
      x: p.x,
      y: p.y,
      opened: false,
      gold: loot.gold,
      itemId: loot.itemId,
      itemQty: loot.itemQty,
    });
  }

  return {
    kind,
    seed,
    map,
    entrance: { x: entrance.x, y: entrance.y },
    boss: { x: boss.x, y: boss.y },
    chests,
  };
}

export function floorFor(location: LocationId, state: { caveFloor?: GeneratedFloor; ruinsFloor?: GeneratedFloor }): GeneratedFloor | null {
  if (location === 'dungeon') return state.caveFloor ?? null;
  if (location === 'ruins') return state.ruinsFloor ?? null;
  return null;
}
