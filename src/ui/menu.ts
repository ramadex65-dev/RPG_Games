import Phaser from 'phaser';
import { UI } from './theme';

export interface MenuItem {
  label: string;
  disabled?: boolean;
}

/** Simple keyboard menu helper for Phaser scenes. */
export class TextMenu {
  private index = 0;
  private items: MenuItem[] = [];
  private texts: Phaser.GameObjects.Text[] = [];
  private onSelect: (index: number, item: MenuItem) => void;

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    items: MenuItem[],
    onSelect: (index: number, item: MenuItem) => void,
    private style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: UI.font,
      fontSize: UI.menu,
      color: UI.color.body,
    },
    private lineHeight = UI.menuLine,
  ) {
    this.onSelect = onSelect;
    this.setItems(items);
  }

  setItems(items: MenuItem[]): void {
    this.texts.forEach((t) => t.destroy());
    this.texts = [];
    this.items = items;
    this.index = 0;
    items.forEach((item, i) => {
      const t = this.scene.add
        .text(this.x, this.y + i * this.lineHeight, item.label, this.style)
        .setOrigin(0, 0);
      if (item.disabled) t.setColor('#666');
      this.texts.push(t);
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
    this.refresh();
  }

  confirm(): void {
    const item = this.items[this.index];
    if (!item || item.disabled) return;
    this.onSelect(this.index, item);
  }

  getIndex(): number {
    return this.index;
  }

  destroy(): void {
    this.texts.forEach((t) => t.destroy());
  }

  private refresh(): void {
    this.texts.forEach((t, i) => {
      const prefix = i === this.index ? '▸ ' : '  ';
      t.setText(prefix + this.items[i].label);
      if (this.items[i].disabled) t.setColor('#666');
      else t.setColor(i === this.index ? UI.color.accent : UI.color.body);
    });
  }
}
