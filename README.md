# Seven Traditions

A classic party-based JRPG prototype built with **Phaser 3 + TypeScript + Vite**.

Seven D&D-inspired classes; pick **4** for your party. Explore a town, delve a dungeon, fight turn-based battles, and defeat the **Ley Wraith**.

## Run locally (no Phaser credits)

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Controls

| Context | Keys |
|---------|------|
| Menus | ↑↓ / W S, Enter/Space confirm, Esc back |
| Party select | Enter toggle class, **C** confirm 4 |
| Town / Dungeon / Ruins | WASD / Arrows move, **E** talk/enter, **I** inventory/gear, **M** menu (town), **N** mute |
| Battle | Attack / Skills / Items / Defend / Flee · PgUp/PgDn scroll log · **N** mute |

## Features

- Procedural SFX + scene music (no external audio assets)
- Battle polish: attack lunge, hit flash, animated HP bars, current-turn highlight
- Larger scrollable town (Market / Temple / Cave Road / Ruins) with NPCs
- Quest log with chained objectives
- Per-character inventory (**I**) with click-to-equip gear view + mouse-friendly class gear shop
- Elemental weaknesses/resists (shown as Weak! / Resist! in combat)
- Ley Wraith **phase 2** below 50% HP
- Recruit the other 3 classes (`M` → Recruit) + Formation swaps
- Second dungeon: **Ruins of Echoes** + Echo Knight mini-boss
- Treasure chests in cave and ruins
- Victory / clear screen after both bosses fall

## Classes

Fighter, Paladin, Barbarian, Thief, Cleric, Mage, Druid

## What’s in the MVP

- Title + continue (localStorage)
- Party select (4 of 7)
- Town: shop, inn, dungeon entrance
- Dungeon: random encounters + boss tile
- Turn-based combat with class skills, items, XP/level-ups
- Procedural placeholder graphics (no asset pipeline / no cloud credits)

## Scripts

- `npm run dev` — local playtest
- `npm run typecheck` — TypeScript check
- `npm run build` — production build
