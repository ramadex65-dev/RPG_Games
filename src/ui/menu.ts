import Phaser from 'phaser';
import { Audio } from '../systems/audio';
import { UI } from './theme';

export interface MenuItem {
  label: string;
  disabled?: boolean;
  /** Optional second line shown under the label (shop stats, etc.) */
  detail?: string;
}

export interface TextMenuOptions {
  style?: Phaser.Types.GameObjects.Text.TextStyle;
  lineHeight?: number;
  rowWidth?: number;
  /** Draw visible row backgrounds. Default false (invisible hit pads still clickable). */
  rows?: boolean;
  /** Attach created objects to this container */
  container?: Phaser.GameObjects.Container;
  /** Fired when highlight moves (keyboard or mouse). */
  onHighlight?: (index: number, item: MenuItem) => void;
  /** Render depth for menu visuals. Default 30. */
  depth?: number;
}

/** Shared options for battle command / skill / target lists. */
export const BATTLE_MENU: TextMenuOptions = {
  rows: true,
  rowWidth: 240,
  lineHeight: 26,
  depth: 55,
  style: {
    fontFamily: UI.font,
    fontSize: UI.menu,
    color: UI.color.body,
  },
};

/** Keyboard + mouse menu helper. */
export class TextMenu {
  private index = 0;
  private items: MenuItem[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private details: Phaser.GameObjects.Text[] = [];
  private rows: Phaser.GameObjects.Rectangle[] = [];
  private onSelect: (index: number, item: MenuItem) => void;
  private lineHeight: number;
  private rowWidth: number;
  private style: Phaser.Types.GameObjects.Text.TextStyle;
  private useRows: boolean;
  private depth: number;
  private container?: Phaser.GameObjects.Container;
  private onHighlight?: (index: number, item: MenuItem) => void;
  /** Prevents double-fire from overlapping row+text pointer events. */
  private locked = false;

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    items: MenuItem[],
    onSelect: (index: number, item: MenuItem) => void,
    options: TextMenuOptions = {},
  ) {
    this.onSelect = onSelect;
    this.style = options.style ?? {
      fontFamily: UI.font,
      fontSize: UI.menu,
      color: UI.color.body,
    };
    this.useRows = options.rows === true;
    this.lineHeight = options.lineHeight ?? (this.useRows ? 40 : UI.menuLine);
    this.rowWidth = options.rowWidth ?? 360;
    this.depth = options.depth ?? 30;
    this.container = options.container;
    this.onHighlight = options.onHighlight;
    this.setItems(items);
  }

  setItems(items: MenuItem[]): void {
    this.destroyVisuals();
    this.items = items;
    this.index = Math.min(this.index, Math.max(0, items.length - 1));
    items.forEach((item, i) => {
      const rowY = this.y + i * this.lineHeight;
      const row = this.scene.add
        .rectangle(
          this.x + this.rowWidth / 2,
          rowY + this.lineHeight / 2 - 2,
          this.rowWidth,
          this.lineHeight - 3,
          this.useRows ? 0x1a2233 : 0x000000,
          this.useRows ? 0.95 : 0.001,
        )
        .setDepth(this.depth)
        .setInteractive({ useHandCursor: !item.disabled });

      if (this.useRows) row.setStrokeStyle(1, 0x3a4558);

      row.on('pointerover', () => {
        if (item.disabled) return;
        if (this.index !== i) Audio.sfx('menu');
        this.index = i;
        this.refresh();
      });
      row.on('pointerdown', () => {
        if (item.disabled) return;
        this.index = i;
        this.refresh();
        this.confirm();
      });
      this.rows.push(row);
      this.container?.add(row);

      const textY = item.detail ? rowY + 2 : rowY + (this.lineHeight - 14) / 2;
      const t = this.scene.add
        .text(this.x + 10, textY, item.label, this.style)
        .setOrigin(0, 0)
        .setDepth(this.depth + 1);
      // Text is non-interactive so only the row pad receives clicks (avoids double confirm).
      t.disableInteractive();
      if (item.disabled) t.setColor('#666');
      this.texts.push(t);
      this.container?.add(t);

      if (item.detail) {
        const d = this.scene.add
          .text(this.x + 14, rowY + 16, item.detail, {
            fontFamily: UI.font,
            fontSize: UI.tiny,
            color: UI.color.muted,
          })
          .setOrigin(0, 0)
          .setDepth(this.depth + 1);
        this.details.push(d);
        this.container?.add(d);
      } else {
        this.details.push(this.scene.add.text(0, 0, '').setVisible(false));
      }
    });
    this.refresh();
  }

  move(delta: number): void {
    if (!this.items.length) return;
    let next = this.index;
    for (let i = 0; i < this.items.length; i++) {
      next = (next + delta + this.items.length) % this.items.length;
      if (!this.items[next].disabled) break;
    }
    this.index = next;
    Audio.sfx('menu');
    this.refresh();
  }

  confirm(): void {
    if (this.locked) return;
    const item = this.items[this.index];
    if (!item || item.disabled) return;
    this.locked = true;
    Audio.sfx('confirm');
    try {
      this.onSelect(this.index, item);
    } catch {
      this.locked = false;
    }
  }

  getIndex(): number {
    return this.index;
  }

  destroy(): void {
    this.destroyVisuals();
  }

  private destroyVisuals(): void {
    this.texts.forEach((t) => t.destroy());
    this.details.forEach((t) => t.destroy());
    this.rows.forEach((r) => r.destroy());
    this.texts = [];
    this.details = [];
    this.rows = [];
  }

  private refresh(): void {
    this.texts.forEach((t, i) => {
      const prefix = i === this.index ? '▸ ' : '  ';
      t.setText(prefix + this.items[i].label);
      if (this.items[i].disabled) t.setColor('#666');
      else t.setColor(i === this.index ? UI.color.accent : UI.color.body);
      if (this.rows[i]) {
        if (this.useRows) {
          this.rows[i].setFillStyle(i === this.index ? 0x2a3a55 : 0x1a2233, 0.95);
          this.rows[i].setStrokeStyle(1, i === this.index ? 0xc2a35a : 0x3a4558);
        }
      }
    });
    const item = this.items[this.index];
    if (item) this.onHighlight?.(this.index, item);
  }
}
