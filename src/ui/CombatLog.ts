import Phaser from 'phaser';
import type { CombatLogLine } from '../systems/combat';
import { UI } from './theme';

const VISIBLE_LINES = 8;
const LINE_HEIGHT = 14;

/** Newest-first combat log with mouse-wheel / key scrolling. */
export class CombatLog {
  private lines: CombatLogLine[] = [];
  private scroll = 0;
  private panel: Phaser.GameObjects.Rectangle;
  private title: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private texts: Phaser.GameObjects.Text[] = [];
  private maskGfx: Phaser.GameObjects.Graphics;
  private readonly maxHistory = 80;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
  ) {
    this.panel = scene.add
      .rectangle(x + width / 2, y + height / 2, width, height, 0x0c1018, 0.92)
      .setStrokeStyle(1, 0x5a6480)
      .setOrigin(0.5);

    this.title = scene.add.text(x + 8, y + 4, 'Combat Log', {
      fontFamily: UI.font,
      fontSize: UI.tiny,
      color: UI.color.muted,
    });

    this.hint = scene.add
      .text(x + width - 8, y + 4, 'Wheel / PgUp·PgDn', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.dim,
      })
      .setOrigin(1, 0);

    const contentTop = y + 18;
    for (let i = 0; i < VISIBLE_LINES; i++) {
      this.texts.push(
        scene.add.text(x + 8, contentTop + i * LINE_HEIGHT, '', {
          fontFamily: UI.font,
          fontSize: UI.small,
          color: UI.color.body,
          wordWrap: { width: width - 16 },
        }),
      );
    }

    this.maskGfx = scene.make.graphics({ x: 0, y: 0 });
    this.maskGfx.fillStyle(0xffffff);
    this.maskGfx.fillRect(x + 4, contentTop - 2, width - 8, VISIBLE_LINES * LINE_HEIGHT + 4);
    const mask = this.maskGfx.createGeometryMask();
    this.texts.forEach((t) => t.setMask(mask));

    scene.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      const bounds = new Phaser.Geom.Rectangle(this.x, this.y, this.width, this.height);
      const ptr = scene.input.activePointer;
      if (!bounds.contains(ptr.x, ptr.y)) return;
      this.nudgeScroll(dy > 0 ? 1 : -1);
    });
  }

  clear(): void {
    this.lines = [];
    this.scroll = 0;
    this.refresh();
  }

  push(line: CombatLogLine): void {
    // Newest at the top of the list
    this.lines.unshift(line);
    if (this.lines.length > this.maxHistory) this.lines.length = this.maxHistory;
    this.scroll = 0;
    this.refresh();
  }

  nudgeScroll(delta: number): void {
    const maxScroll = Math.max(0, this.lines.length - VISIBLE_LINES);
    this.scroll = Phaser.Math.Clamp(this.scroll + delta, 0, maxScroll);
    this.refresh();
  }

  destroy(): void {
    this.panel.destroy();
    this.title.destroy();
    this.hint.destroy();
    this.texts.forEach((t) => t.destroy());
    this.maskGfx.destroy();
  }

  private refresh(): void {
    const slice = this.lines.slice(this.scroll, this.scroll + VISIBLE_LINES);
    this.texts.forEach((t, i) => {
      const line = slice[i];
      if (!line) {
        t.setText('');
        return;
      }
      t.setText(line.text);
      t.setColor(line.color ?? UI.color.body);
    });
  }
}
