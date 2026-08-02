import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { canEquip, ITEMS } from '../data/items';
import type { ClassId, Combatant } from '../data/types';
import { Audio } from '../systems/audio';
import { equipItem, equipPreview, pruneEmpty } from '../systems/inventory';
import { Registry } from '../systems/registry';
import { saveGame } from '../systems/save';
import { UI } from './theme';

/**
 * Full-party inventory / gear screen.
 * Open with I — click portraits to switch, click bag gear to equip.
 */
export class InventoryScreen {
  private root: Phaser.GameObjects.Container;
  private selected = 0;
  private closed = false;

  constructor(
    private scene: Phaser.Scene,
    private onClose: () => void,
  ) {
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(80);
    this.build();
  }

  private heroes(): Combatant[] {
    const s = Registry.get();
    return [...s.party, ...s.reserve];
  }

  private build(): void {
    this.root.removeAll(true);
    const { width, height } = this.scene.scale;
    const dim = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72);
    const panel = this.scene.add
      .rectangle(width / 2, height / 2, 720, 520, 0x121820, 0.98)
      .setStrokeStyle(2, 0xc2a35a);

    const title = this.scene.add
      .text(width / 2, 60, 'INVENTORY & GEAR', {
        fontFamily: UI.font,
        fontSize: '20px',
        color: UI.color.cream,
      })
      .setOrigin(0.5);

    const hint = this.scene.add
      .text(width / 2, 88, 'Click a character  •  Click bag gear to equip  •  I / Esc close', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.muted,
      })
      .setOrigin(0.5);

    this.root.add([dim, panel, title, hint]);

    const heroes = this.heroes();
    if (!heroes.length) {
      this.root.add(
        this.scene.add
          .text(width / 2, height / 2, 'No party yet.', {
            fontFamily: UI.font,
            fontSize: UI.body,
            color: UI.color.body,
          })
          .setOrigin(0.5),
      );
      return;
    }
    this.selected = Phaser.Math.Clamp(this.selected, 0, heroes.length - 1);

    // Character tabs
    heroes.forEach((h, i) => {
      const tx = 90 + i * 88;
      const ty = 130;
      const tab = this.scene.add
        .rectangle(tx, ty, 78, 70, i === this.selected ? 0x2a3a55 : 0x1a2233, 1)
        .setStrokeStyle(1, i === this.selected ? 0xc2a35a : 0x4a5568)
        .setInteractive({ useHandCursor: true });
      const img = this.scene.add
        .image(tx, ty - 8, classTextureKey((h.classId as ClassId) ?? 'fighter'))
        .setDisplaySize(28, 36);
      const name = this.scene.add
        .text(tx, ty + 24, h.name, {
          fontFamily: UI.font,
          fontSize: '10px',
          color: i === this.selected ? UI.color.accent : UI.color.body,
        })
        .setOrigin(0.5);
      tab.on('pointerover', () => tab.setFillStyle(0x2a3a55));
      tab.on('pointerout', () => {
        if (i !== this.selected) tab.setFillStyle(0x1a2233);
      });
      tab.on('pointerdown', () => {
        Audio.sfx('menu');
        this.selected = i;
        this.build();
      });
      this.root.add([tab, img, name]);
    });

    this.buildDetail(heroes[this.selected]);
  }

  private buildDetail(hero: Combatant): void {
    hero.inventory = pruneEmpty(hero.inventory);
    const left = 70;
    const top = 190;

    const portrait = this.scene.add
      .image(left + 50, top + 50, classTextureKey((hero.classId as ClassId) ?? 'fighter'))
      .setDisplaySize(64, 84);
    const header = this.scene.add.text(left + 100, top, `${hero.name}  ·  Lv ${hero.level}`, {
      fontFamily: UI.font,
      fontSize: '16px',
      color: UI.color.cream,
    });
    const stats = this.scene.add.text(
      left + 100,
      top + 24,
      `HP ${hero.currentHp}/${hero.stats.hp}   MP ${hero.currentMp}/${hero.stats.mp}\nATK ${hero.stats.atk}  DEF ${hero.stats.def}  MAT ${hero.stats.mat}  MDF ${hero.stats.mdf}  AGI ${hero.stats.agi}`,
      {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: UI.color.body,
        lineSpacing: 4,
      },
    );

    const wName = hero.equipment.weapon ? ITEMS[hero.equipment.weapon]?.name ?? '—' : '— empty —';
    const aName = hero.equipment.armor ? ITEMS[hero.equipment.armor]?.name ?? '—' : '— empty —';

    const gearBox = this.scene.add
      .rectangle(400, top + 110, 640, 70, 0x1a2233, 1)
      .setStrokeStyle(1, 0x5a6480);
    const gearTitle = this.scene.add.text(90, top + 82, 'EQUIPPED', {
      fontFamily: UI.font,
      fontSize: UI.tiny,
      color: UI.color.accent,
    });
    const gearText = this.scene.add.text(90, top + 100, `Weapon:  ${wName}\nArmor:   ${aName}`, {
      fontFamily: UI.font,
      fontSize: UI.body,
      color: UI.color.body,
      lineSpacing: 6,
    });

    const bagTitle = this.scene.add.text(90, top + 160, 'BAG — click gear to equip', {
      fontFamily: UI.font,
      fontSize: UI.tiny,
      color: UI.color.accent,
    });

    this.root.add([portrait, header, stats, gearBox, gearTitle, gearText, bagTitle]);

    const bag = hero.inventory;
    if (!bag.length) {
      this.root.add(
        this.scene.add.text(90, top + 185, '(empty)', {
          fontFamily: UI.font,
          fontSize: UI.small,
          color: UI.color.muted,
        }),
      );
    }

    bag.forEach((stack, i) => {
      const def = ITEMS[stack.id];
      if (!def) return;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = 90 + col * 310;
      const by = top + 185 + row * 44;
      const canEq =
        (def.kind === 'weapon' || def.kind === 'armor') && canEquip(stack.id, hero.classId);
      const rowBg = this.scene.add
        .rectangle(bx + 145, by + 16, 290, 38, canEq ? 0x243044 : 0x1a2233, 1)
        .setStrokeStyle(1, canEq ? 0x6a7a90 : 0x3a4558);
      const label = this.scene.add.text(bx + 8, by + 4, `${def.name}  ×${stack.qty}`, {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: canEq ? UI.color.cream : UI.color.body,
      });
      const detail = this.scene.add.text(
        bx + 8,
        by + 20,
        canEq ? equipPreview(hero, stack.id) : def.description,
        {
          fontFamily: UI.font,
          fontSize: UI.tiny,
          color: UI.color.muted,
        },
      );
      this.root.add([rowBg, label, detail]);
      if (canEq) {
        rowBg.setInteractive({ useHandCursor: true });
        rowBg.on('pointerover', () => rowBg.setFillStyle(0x2a3a55));
        rowBg.on('pointerout', () => rowBg.setFillStyle(0x243044));
        rowBg.on('pointerdown', () => {
          const msg = equipItem(hero, stack.id);
          Audio.sfx('confirm');
          saveGame(Registry.get());
          this.build();
          // brief toast via title flash
          void msg;
        });
      }
    });

    const closeBtn = this.scene.add
      .rectangle(400, 545, 120, 32, 0x2a3a55, 1)
      .setStrokeStyle(1, 0xc2a35a)
      .setInteractive({ useHandCursor: true });
    const closeTxt = this.scene.add
      .text(400, 545, 'Close (I)', {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: UI.color.cream,
      })
      .setOrigin(0.5);
    closeBtn.on('pointerdown', () => this.close());
    this.root.add([closeBtn, closeTxt]);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    Audio.sfx('cancel');
    this.root.destroy(true);
    this.onClose();
  }

  destroy(): void {
    if (!this.closed) {
      this.closed = true;
      this.root.destroy(true);
    }
  }
}
