import Phaser from 'phaser';

function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.floor(((color >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.floor(((color >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.floor((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

function drawNpc(g: Phaser.GameObjects.Graphics, accent: number, beard = false): void {
  const skin = 0xe8c4a0;
  g.fillStyle(0x2a2a32, 1);
  g.fillRect(14, 40, 6, 14);
  g.fillRect(24, 40, 6, 14);
  g.fillStyle(accent, 1);
  g.fillRect(13, 24, 18, 18);
  g.fillStyle(skin, 1);
  g.fillCircle(22, 16, 8);
  g.fillStyle(0x3a2a1a, 1);
  g.fillCircle(22, 12, 7);
  g.fillStyle(0x1a1020, 1);
  g.fillRect(18, 16, 2, 2);
  g.fillRect(24, 16, 2, 2);
  if (beard) {
    g.fillStyle(0xd0d0d0, 1);
    g.fillRect(18, 20, 8, 5);
  }
  g.fillStyle(shade(accent, 0.7), 1);
  g.fillRect(10, 26, 4, 12);
  g.fillRect(30, 26, 4, 12);
}

export interface TownNpc {
  id: string;
  name: string;
  x: number;
  y: number;
  texture: string;
  dialog: string[];
}

export const TOWN_NPCS: TownNpc[] = [
  {
    id: 'elder',
    name: 'Elder Bran',
    x: 18,
    y: 6,
    texture: 'npc_elder',
    dialog: [
      'Elder Bran: The ley lines scream beneath the southern cave.',
      'Outfit your four at the market store, rest at the inn, then face the Ley Wraith.',
    ],
  },
  {
    id: 'guard',
    name: 'Gate Guard',
    x: 11,
    y: 12,
    texture: 'npc_guard',
    dialog: [
      'Guard: Market west, temple east. Cave south. Ruins of Echoes southeast.',
      'Recruit unused Traditions from the Party Menu. I will pray you return.',
    ],
  },
  {
    id: 'merchant',
    name: 'Street Hawker',
    x: 5,
    y: 7,
    texture: 'npc_merchant',
    dialog: [
      'Hawker: Blades for fighters, staves for mages — the store stocks what your party can wear!',
      'Prices are fair. Death is not.',
    ],
  },
  {
    id: 'acolyte',
    name: 'Temple Acolyte',
    x: 20,
    y: 4,
    texture: 'npc_acolyte',
    dialog: [
      'Acolyte: Light still holds in the temple green.',
      'Open Menu → Recruit to call the Traditions you did not choose at the start.',
      'Holy and nature magic wound undead and the Ley Wraith — remember their weaknesses.',
    ],
  },
  {
    id: 'kid',
    name: 'Village Child',
    x: 15,
    y: 9,
    texture: 'npc_kid',
    dialog: [
      'Child: Mama says not to go near the cave. It hums at night.',
      '…You are going anyway, aren\'t you?',
    ],
  },
];

export function generateNpcTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  const defs: [string, number, boolean][] = [
    ['npc_elder', 0x8a7a5a, true],
    ['npc_guard', 0x4a6a8a, false],
    ['npc_merchant', 0xc2a35a, false],
    ['npc_acolyte', 0xf2f0e4, false],
    ['npc_kid', 0x6b8f71, false],
  ];
  for (const [key, color, beard] of defs) {
    g.clear();
    drawNpc(g, color, beard);
    g.generateTexture(key, 44, 56);
  }
  g.destroy();
}
