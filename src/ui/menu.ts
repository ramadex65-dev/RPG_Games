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
  /** Draw clickable row backgrounds (shop / large lists). Default false. */
  rows?: boolean;
  /** Attach created objects to this container */
  container?: Phaser.GameObjects.Container;
  /** Fired when highlight moves (keyboard or mouse). */
  onHighlight?: (index: number, item: MenuItem) => void;
}

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
  private container?: Phaser.GameObjects.Container;
  private onHighlight?: (index: number, item: MenuItem) => void;

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
      if (this.useRows) {
        const row = this.scene.add
          .rectangle(this.x + this.rowWidth / 2, rowY + this.lineHeight / 2 - 4, this.rowWidth, this.lineHeight - 4, 0x1a2233, 0.95)
          .setStrokeStyle(1, 0x3a4558)
          .setInteractive({ useHandCursor: true });
        row.on('pointerover', () => {
          if (item.disabled) return;
          this.index = i;
          this.refresh();
          Audio.sfx('menu');
        });
        row.on('pointerdown', () => {
          this.index = i;
          this.refresh();
          this.confirm();
        });
        this.rows.push(row);
        this.container?.add(row);
      }

      const t = this.scene.add
        .text(this.x + 10, rowY + (item.detail ? 2 : this.lineHeight / 2 - 8), item.label, this.style)
        .setOrigin(0, 0);
      if (!this.useRows) {
        t.setInteractive({ useHandCursor: true });
        t.on('pointerover', () => {
          if (item.disabled) return;
          this.index = i;
          this.refresh();
        });
        t.on('pointerdown', () => {
          this.index = i;
          this.confirm();
        });
      }
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
          .setOrigin(0, 0);
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
    const item = this.items[this.index];
    if (!item || item.disabled) return;
    Audio.sfx('confirm');
    this.onSelect(this.index, item);
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
        this.rows[i].setFillStyle(i === this.index ? 0x2a3a55 : 0x1a2233, 0.95);
        this.rows[i].setStrokeStyle(1, i === this.index ? 0xc2a35a : 0x3a4558);
      }
    });
    const item = this.items[this.index];
    if (item) this.onHighlight?.(this.index, item);
  }
}
