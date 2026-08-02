import Phaser from 'phaser';

function shade(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.floor(((color >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.floor(((color >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.floor((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

/** Draw a cozy timber storefront with awning and crates. */
function drawStore(g: Phaser.GameObjects.Graphics): void {
  // Ground pad
  g.fillStyle(0x5a4a38, 1);
  g.fillRect(4, 70, 88, 10);

  // Building body
  g.fillStyle(0xb8894a, 1);
  g.fillRect(12, 28, 72, 48);

  // Timber beams
  g.fillStyle(0x6a4528, 1);
  g.fillRect(12, 28, 72, 4);
  g.fillRect(12, 28, 4, 48);
  g.fillRect(80, 28, 4, 48);
  g.fillRect(44, 32, 4, 44);

  // Roof
  g.fillStyle(0x8b3a2a, 1);
  g.fillTriangle(8, 30, 48, 6, 88, 30);
  g.fillStyle(shade(0x8b3a2a, 0.75), 1);
  g.fillTriangle(18, 30, 48, 12, 78, 30);

  // Awning
  g.fillStyle(0xd4a017, 1);
  g.fillRect(18, 40, 28, 8);
  g.fillStyle(0xc0392b, 1);
  for (let i = 0; i < 4; i++) g.fillRect(18 + i * 7, 40, 3, 8);

  // Window
  g.fillStyle(0x7ec8e3, 1);
  g.fillRect(22, 50, 14, 12);
  g.lineStyle(1, 0x3a2a18, 1);
  g.strokeRect(22, 50, 14, 12);
  g.lineBetween(29, 50, 29, 62);
  g.lineBetween(22, 56, 36, 56);

  // Door
  g.fillStyle(0x5a3420, 1);
  g.fillRect(54, 50, 16, 26);
  g.fillStyle(0xd4a017, 1);
  g.fillCircle(66, 64, 2);

  // Sign
  g.fillStyle(0xf0e0b0, 1);
  g.fillRect(52, 34, 24, 10);
  g.fillStyle(0x3a2a18, 1);
  g.fillRect(55, 37, 4, 4);
  g.fillRect(62, 37, 4, 4);
  g.fillRect(69, 37, 4, 4);

  // Crates
  g.fillStyle(0x8a6234, 1);
  g.fillRect(8, 62, 12, 12);
  g.fillRect(78, 64, 10, 10);
}

/** Draw a warm inn with chimney smoke and hanging lantern. */
function drawInn(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x4a5a3a, 1);
  g.fillRect(4, 72, 88, 8);

  // Stone base
  g.fillStyle(0x7a7a70, 1);
  g.fillRect(14, 50, 68, 28);
  g.fillStyle(0x5a5a52, 1);
  g.fillRect(14, 50, 68, 4);

  // Upper timber
  g.fillStyle(0xd2b48c, 1);
  g.fillRect(18, 26, 60, 28);
  g.fillStyle(0x6a4528, 1);
  g.fillRect(18, 26, 60, 3);
  g.fillRect(18, 26, 3, 28);
  g.fillRect(75, 26, 3, 28);

  // Roof
  g.fillStyle(0x3d5c4a, 1);
  g.fillTriangle(10, 28, 48, 4, 86, 28);
  g.fillStyle(shade(0x3d5c4a, 1.2), 1);
  g.fillTriangle(20, 28, 48, 10, 76, 28);

  // Chimney
  g.fillStyle(0x6a6a62, 1);
  g.fillRect(64, 8, 12, 18);
  g.fillStyle(0x9a9a94, 0.5);
  g.fillCircle(70, 4, 4);
  g.fillCircle(74, 1, 3);

  // Door
  g.fillStyle(0x5a2e1a, 1);
  g.fillRect(40, 52, 16, 26);
  g.fillStyle(0xd4a017, 1);
  g.fillCircle(52, 66, 2);

  // Windows with warm glow
  g.fillStyle(0xffd27a, 1);
  g.fillRect(22, 56, 12, 12);
  g.fillRect(62, 56, 12, 12);
  g.lineStyle(1, 0x3a2a18, 1);
  g.strokeRect(22, 56, 12, 12);
  g.strokeRect(62, 56, 12, 12);

  // Lantern
  g.fillStyle(0x3a2a18, 1);
  g.fillRect(34, 44, 2, 8);
  g.fillStyle(0xffc04a, 1);
  g.fillCircle(35, 54, 4);

  // Sign board
  g.fillStyle(0xf0e0b0, 1);
  g.fillRect(30, 30, 36, 12);
  g.fillStyle(0x8b3a2a, 1);
  g.fillRect(36, 33, 8, 6);
  g.fillRect(48, 33, 12, 6);
}

/** Draw a rocky cave mouth with darkness inside. */
function drawCave(g: Phaser.GameObjects.Graphics): void {
  // Hill / rock mass
  g.fillStyle(0x4a4a52, 1);
  g.fillEllipse(48, 56, 90, 50);
  g.fillStyle(0x3a3a44, 1);
  g.fillEllipse(40, 50, 50, 40);
  g.fillStyle(0x5a5a64, 1);
  g.fillEllipse(66, 52, 36, 34);

  // Dark cave mouth
  g.fillStyle(0x121018, 1);
  g.fillEllipse(48, 58, 36, 34);
  g.fillStyle(0x1a1428, 1);
  g.fillEllipse(48, 60, 24, 24);

  // Inner gloom
  g.fillStyle(0x2a1a40, 0.7);
  g.fillEllipse(48, 62, 12, 14);

  // Rocky rim highlights
  g.fillStyle(0x7a7a84, 1);
  g.fillTriangle(28, 40, 36, 28, 44, 42);
  g.fillTriangle(52, 38, 62, 24, 70, 40);
  g.fillStyle(0x2a2a32, 1);
  g.fillTriangle(30, 70, 20, 58, 38, 62);
  g.fillTriangle(66, 70, 78, 56, 58, 62);

  // Sparse grass at base
  g.fillStyle(0x3d6b3d, 1);
  g.fillRect(10, 74, 8, 4);
  g.fillRect(78, 74, 10, 4);
  g.fillRect(40, 76, 16, 3);
}

export function generateBuildingTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });

  g.clear();
  drawStore(g);
  g.generateTexture('building_store', 96, 80);

  g.clear();
  drawInn(g);
  g.generateTexture('building_inn', 96, 80);

  g.clear();
  drawCave(g);
  g.generateTexture('building_cave', 96, 80);

  g.destroy();
}
