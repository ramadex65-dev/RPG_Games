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
  /**
   * Max rows shown at once. When the list is longer, mouse-wheel
   * (and keyboard selection) scrolls the window.
   */
  maxVisible?: number;
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
  private scroll = 0;
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
  private maxVisible: number;
  private container?: Phaser.GameObjects.Container;
  private onHighlight?: (index: number, item: MenuItem) => void;
  /** Prevents double-fire from overlapping row+text pointer events. */
  private locked = false;
  private scrollHint: Phaser.GameObjects.Text | null = null;
  private readonly onWheel: (
    _p: unknown,
    _g: unknown,
    _dx: number,
    dy: number,
  ) => void;

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
    this.maxVisible = options.maxVisible ?? 0;
    this.container = options.container;
    this.onHighlight = options.onHighlight;

    this.onWheel = (_p, _g, _dx, dy) => {
      if (!this.canScroll()) return;
      const bounds = new Phaser.Geom.Rectangle(
        this.x,
        this.y,
        this.rowWidth,
        this.visibleCount() * this.lineHeight,
      );
      const ptr = this.scene.input.activePointer;
      if (!bounds.contains(ptr.x, ptr.y)) return;
      this.nudgeScroll(dy > 0 ? 1 : -1);
    };
    this.scene.input.on('wheel', this.onWheel);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());

    this.setItems(items);
  }

  setItems(items: MenuItem[]): void {
    this.items = items;
    this.index = Math.min(this.index, Math.max(0, items.length - 1));
    this.scroll = Phaser.Math.Clamp(this.scroll, 0, this.maxScroll());
    this.ensureVisible();
    this.rebuild();
  }

  move(delta: number): void {
    if (!this.items.length) return;
    let next = this.index;
    for (let i = 0; i < this.items.length; i++) {
      next = (next + delta + this.items.length) % this.items.length;
      if (!this.items[next].disabled) break;
    }
    this.index = next;
    const prevScroll = this.scroll;
    this.ensureVisible();
    Audio.sfx('menu');
    if (prevScroll !== this.scroll) this.rebuild();
    else this.refresh();
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
    this.scene.input.off('wheel', this.onWheel);
    this.destroyVisuals();
  }

  private canScroll(): boolean {
    return this.maxVisible > 0 && this.items.length > this.maxVisible;
  }

  private maxScroll(): number {
    if (!this.canScroll()) return 0;
    return Math.max(0, this.items.length - this.maxVisible);
  }

  private visibleCount(): number {
    if (!this.maxVisible) return this.items.length;
    return Math.min(this.maxVisible, this.items.length);
  }

  private nudgeScroll(delta: number): void {
    const next = Phaser.Math.Clamp(this.scroll + delta, 0, this.maxScroll());
    if (next === this.scroll) return;
    this.scroll = next;
    if (this.index < this.scroll) this.index = this.scroll;
    if (this.index >= this.scroll + this.visibleCount()) {
      this.index = this.scroll + this.visibleCount() - 1;
    }
    Audio.sfx('menu');
    this.rebuild();
  }

  private ensureVisible(): void {
    if (!this.canScroll()) {
      this.scroll = 0;
      return;
    }
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + this.maxVisible) {
      this.scroll = this.index - this.maxVisible + 1;
    }
    this.scroll = Phaser.Math.Clamp(this.scroll, 0, this.maxScroll());
  }

  private rebuild(): void {
    this.destroyVisuals();
    const start = this.canScroll() ? this.scroll : 0;
    const end = this.canScroll() ? start + this.maxVisible : this.items.length;

    for (let i = start; i < end; i++) {
      const item = this.items[i];
      if (!item) continue;
      const local = i - start;
      const rowY = this.y + local * this.lineHeight;
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
    }

    if (this.canScroll()) {
      this.scrollHint = this.scene.add
        .text(
          this.x + this.rowWidth - 8,
          this.y - 16,
          `Wheel ↕  ${this.scroll + 1}–${Math.min(this.scroll + this.maxVisible, this.items.length)} / ${this.items.length}`,
          {
            fontFamily: UI.font,
            fontSize: UI.tiny,
            color: UI.color.dim,
          },
        )
        .setOrigin(1, 0)
        .setDepth(this.depth + 1);
      this.container?.add(this.scrollHint);
    }

    this.refresh();
  }

  private destroyVisuals(): void {
    this.texts.forEach((t) => t.destroy());
    this.details.forEach((t) => t.destroy());
    this.rows.forEach((r) => r.destroy());
    this.scrollHint?.destroy();
    this.scrollHint = null;
    this.texts = [];
    this.details = [];
    this.rows = [];
  }

  private refresh(): void {
    const start = this.canScroll() ? this.scroll : 0;
    this.texts.forEach((t, local) => {
      const i = start + local;
      const prefix = i === this.index ? '▸ ' : '  ';
      t.setText(prefix + this.items[i].label);
      if (this.items[i].disabled) t.setColor('#666');
      else t.setColor(i === this.index ? UI.color.accent : UI.color.body);
      if (this.rows[local]) {
        if (this.useRows) {
          this.rows[local].setFillStyle(i === this.index ? 0x2a3a55 : 0x1a2233, 0.95);
          this.rows[local].setStrokeStyle(1, i === this.index ? 0xc2a35a : 0x3a4558);
        }
      }
    });
    const item = this.items[this.index];
    if (item) this.onHighlight?.(this.index, item);
  }
}
