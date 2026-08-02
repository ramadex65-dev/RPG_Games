import Phaser from 'phaser';
import type { ClassId } from '../data/types';

const W = 48;
const H = 64;

function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.floor(((color >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.floor(((color >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.floor((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

function drawHumanoid(
  g: Phaser.GameObjects.Graphics,
  accent: number,
  opts: {
    hair?: number;
    weapon?: 'sword' | 'axe' | 'dagger' | 'staff' | 'mace' | 'none';
    robe?: boolean;
    cape?: boolean;
    helm?: boolean;
  } = {},
): void {
  const skin = 0xe8c4a0;
  const dark = shade(accent, 0.55);
  const mid = accent;
  const light = shade(accent, 1.25);

  // Legs
  g.fillStyle(0x2a2a32, 1);
  g.fillRect(16, 44, 6, 16);
  g.fillRect(26, 44, 6, 16);

  // Boots
  g.fillStyle(0x1a1520, 1);
  g.fillRect(15, 56, 8, 5);
  g.fillRect(25, 56, 8, 5);

  // Torso
  if (opts.robe) {
    g.fillStyle(mid, 1);
    g.fillTriangle(14, 28, 34, 28, 30, 52);
    g.fillTriangle(14, 28, 18, 52, 30, 52);
    g.fillStyle(dark, 1);
    g.fillRect(20, 30, 8, 18);
  } else {
    g.fillStyle(mid, 1);
    g.fillRoundedRect(15, 26, 18, 20, 3);
    g.fillStyle(dark, 1);
    g.fillRect(17, 28, 14, 4);
  }

  // Cape
  if (opts.cape) {
    g.fillStyle(light, 0.9);
    g.fillTriangle(14, 28, 10, 50, 20, 46);
  }

  // Arms
  g.fillStyle(skin, 1);
  g.fillRect(10, 28, 5, 14);
  g.fillRect(33, 28, 5, 14);
  g.fillStyle(mid, 1);
  g.fillRect(10, 28, 5, 6);
  g.fillRect(33, 28, 5, 6);

  // Head
  g.fillStyle(skin, 1);
  g.fillCircle(24, 18, 8);

  // Hair / helm
  if (opts.helm) {
    g.fillStyle(0xc0c0c8, 1);
    g.fillCircle(24, 16, 8);
    g.fillRect(16, 16, 16, 6);
    g.fillStyle(0x888890, 1);
    g.fillRect(22, 8, 4, 6);
  } else {
    g.fillStyle(opts.hair ?? 0x3a2a1a, 1);
    g.fillCircle(24, 14, 8);
    g.fillRect(16, 14, 16, 5);
  }

  // Eyes
  g.fillStyle(0x1a1020, 1);
  g.fillRect(20, 18, 2, 2);
  g.fillRect(26, 18, 2, 2);

  // Weapon
  const w = opts.weapon ?? 'none';
  if (w === 'sword' || w === 'mace') {
    g.fillStyle(0xb0b0b8, 1);
    g.fillRect(36, 20, 3, 22);
    g.fillStyle(0x8a6a30, 1);
    g.fillRect(34, 40, 7, 3);
    if (w === 'mace') {
      g.fillStyle(0x909098, 1);
      g.fillCircle(37, 20, 5);
    }
  } else if (w === 'axe') {
    g.fillStyle(0x8a6a30, 1);
    g.fillRect(36, 22, 3, 20);
    g.fillStyle(0xa0a0a8, 1);
    g.fillTriangle(36, 22, 46, 18, 46, 30);
  } else if (w === 'dagger') {
    g.fillStyle(0xc0c0c8, 1);
    g.fillRect(36, 30, 2, 14);
    g.fillStyle(0x6a8f71, 1);
    g.fillRect(34, 42, 6, 2);
  } else if (w === 'staff') {
    g.fillStyle(0x6a4a28, 1);
    g.fillRect(37, 12, 3, 36);
    g.fillStyle(light, 1);
    g.fillCircle(38, 12, 5);
  }
}

function drawSlime(g: Phaser.GameObjects.Graphics, color: number): void {
  g.fillStyle(shade(color, 0.7), 1);
  g.fillEllipse(24, 44, 36, 20);
  g.fillStyle(color, 1);
  g.fillEllipse(24, 36, 32, 28);
  g.fillStyle(shade(color, 1.3), 0.5);
  g.fillEllipse(18, 30, 10, 8);
  g.fillStyle(0x1a1020, 1);
  g.fillCircle(18, 34, 3);
  g.fillCircle(30, 34, 3);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(17, 33, 1);
  g.fillCircle(29, 33, 1);
}

function drawBat(g: Phaser.GameObjects.Graphics, color: number): void {
  g.fillStyle(shade(color, 0.8), 1);
  g.fillTriangle(4, 30, 18, 28, 16, 40);
  g.fillTriangle(44, 30, 30, 28, 32, 40);
  g.fillStyle(color, 1);
  g.fillEllipse(24, 34, 16, 14);
  g.fillStyle(0x1a1020, 1);
  g.fillCircle(20, 32, 2);
  g.fillCircle(28, 32, 2);
  g.fillStyle(0xe8c4a0, 1);
  g.fillTriangle(22, 20, 24, 14, 26, 20);
  g.fillTriangle(26, 20, 28, 14, 30, 20);
}

function drawSkeleton(g: Phaser.GameObjects.Graphics, color: number): void {
  g.fillStyle(color, 1);
  g.fillCircle(24, 16, 8);
  g.fillRect(21, 24, 6, 4);
  g.fillRect(18, 28, 12, 16);
  g.fillRect(14, 30, 4, 12);
  g.fillRect(30, 30, 4, 12);
  g.fillRect(18, 44, 4, 14);
  g.fillRect(26, 44, 4, 14);
  g.fillStyle(0x1a1020, 1);
  g.fillRect(20, 16, 3, 3);
  g.fillRect(26, 16, 3, 3);
  g.fillRect(22, 22, 4, 2);
  g.lineStyle(1, shade(color, 0.7), 1);
  g.strokeRect(19, 32, 10, 3);
  g.strokeRect(19, 37, 10, 3);
  g.fillStyle(0xb0b0b8, 1);
  g.fillRect(34, 28, 2, 18);
}

function drawShade(g: Phaser.GameObjects.Graphics, color: number): void {
  g.fillStyle(color, 0.85);
  g.fillEllipse(24, 40, 28, 36);
  g.fillStyle(shade(color, 1.4), 0.5);
  g.fillCircle(24, 22, 10);
  g.fillStyle(0xd48cff, 1);
  g.fillCircle(20, 22, 2);
  g.fillCircle(28, 22, 2);
  g.fillStyle(0x8b4dff, 0.6);
  g.fillTriangle(14, 50, 24, 58, 34, 50);
}

function drawWraith(g: Phaser.GameObjects.Graphics, color: number): void {
  g.fillStyle(color, 0.9);
  g.fillTriangle(24, 8, 8, 56, 40, 56);
  g.fillStyle(shade(color, 1.3), 0.7);
  g.fillCircle(24, 20, 10);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(20, 20, 3);
  g.fillCircle(28, 20, 3);
  g.fillStyle(0x1a1020, 1);
  g.fillCircle(20, 20, 1);
  g.fillCircle(28, 20, 1);
  g.fillStyle(0xd48cff, 0.8);
  g.fillCircle(24, 36, 4);
  g.fillCircle(16, 48, 3);
  g.fillCircle(32, 48, 3);
}

const CLASS_LOOK: Record<
  ClassId,
  { accent: number; hair?: number; weapon: 'sword' | 'axe' | 'dagger' | 'staff' | 'mace' | 'none'; robe?: boolean; cape?: boolean; helm?: boolean }
> = {
  fighter: { accent: 0xc45c26, hair: 0x4a3020, weapon: 'sword', helm: true },
  paladin: { accent: 0xe8c547, hair: 0xd4c090, weapon: 'sword', cape: true, helm: true },
  barbarian: { accent: 0xb33a3a, hair: 0x5a2010, weapon: 'axe' },
  thief: { accent: 0x6b8f71, hair: 0x1a1a1a, weapon: 'dagger' },
  cleric: { accent: 0xf2f0e4, hair: 0xc8b080, weapon: 'mace', robe: true },
  mage: { accent: 0x5b6ee1, hair: 0x304060, weapon: 'staff', robe: true, cape: true },
  druid: { accent: 0x3d8b5a, hair: 0x3a6020, weapon: 'staff', robe: true },
};

export function classTextureKey(id: ClassId): string {
  return `char_${id}`;
}

export function enemyTextureKey(id: string): string {
  return `enemy_${id}`;
}

export function generateCharacterTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });

  (Object.keys(CLASS_LOOK) as ClassId[]).forEach((id) => {
    g.clear();
    drawHumanoid(g, CLASS_LOOK[id].accent, CLASS_LOOK[id]);
    g.generateTexture(classTextureKey(id), W, H);
  });

  // Overworld party lead (generic adventurer)
  g.clear();
  drawHumanoid(g, 0xf0d9a0, { hair: 0x3a2a1a, weapon: 'sword' });
  g.generateTexture('char_adventurer', W, H);

  const enemies: Record<string, (gg: Phaser.GameObjects.Graphics) => void> = {
    slime: (gg) => drawSlime(gg, 0x58c26a),
    bat: (gg) => drawBat(gg, 0x6a5a7a),
    skeleton: (gg) => drawSkeleton(gg, 0xd9d2c5),
    shade: (gg) => drawShade(gg, 0x3a2f4a),
    ruin_wisp: (gg) => drawShade(gg, 0x7ec8e3),
    stone_guard: (gg) => drawSkeleton(gg, 0x8a8a84),
    echo_knight: (gg) => drawHumanoid(gg, 0x5b6ee1, { helm: true, weapon: 'sword', cape: true }),
    ley_wraith: (gg) => drawWraith(gg, 0x8b4dff),
  };

  for (const [id, draw] of Object.entries(enemies)) {
    g.clear();
    draw(g);
    g.generateTexture(enemyTextureKey(id), W, H);
  }

  g.destroy();
}
