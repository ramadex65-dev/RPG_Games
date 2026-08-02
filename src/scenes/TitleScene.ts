import Phaser from 'phaser';
import { Audio } from '../systems/audio';
import { hasSave, loadGame } from '../systems/save';
import { Registry } from '../systems/registry';
import { TextMenu } from '../ui/menu';
import { UI } from '../ui/theme';

export class TitleScene extends Phaser.Scene {
  private menu!: TextMenu;

  constructor() {
    super('Title');
  }

  create(): void {
    Audio.unlock();
    Audio.playMusic('title');
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x12182a);

    for (let i = 0; i < 8; i++) {
      this.add
        .rectangle(width / 2, 40 + i * 28, width, 18, 0x1a2440, 0.35 + i * 0.04)
        .setOrigin(0.5);
    }

    this.add
      .text(width / 2, 110, 'SEVEN TRADITIONS', {
        fontFamily: UI.font,
        fontSize: UI.title,
        color: UI.color.cream,
        stroke: '#3a2a10',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 148, 'A classic party JRPG — D&D-inspired classes', {
        fontFamily: UI.font,
        fontSize: UI.subtitle,
        color: UI.color.muted,
      })
      .setOrigin(0.5);

    // Class lineup preview
    const preview = ['fighter', 'paladin', 'thief', 'cleric', 'mage', 'druid', 'barbarian'] as const;
    preview.forEach((id, i) => {
      this.add.image(140 + i * 80, 210, `char_${id}`).setScale(0.85);
    });

    const items = [
      { label: 'New Game' },
      { label: 'Continue', disabled: !hasSave() },
    ];

    this.menu = new TextMenu(this, width / 2 - 50, 280, items, (_i, item) => {
      if (item.label === 'New Game') {
        this.scene.start('PartySelect');
      } else {
        const save = loadGame();
        if (save) {
          Registry.set(save);
          this.scene.start(save.location === 'dungeon' ? 'Dungeon' : 'Town');
        }
      }
    });

    this.add
      .text(width / 2, height - 28, '↑↓ Select   Enter Confirm   Esc Cancel', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.dim,
      })
      .setOrigin(0.5);

    this.input.keyboard!.on('keydown-UP', () => this.menu.move(-1));
    this.input.keyboard!.on('keydown-DOWN', () => this.menu.move(1));
    this.input.keyboard!.on('keydown-W', () => this.menu.move(-1));
    this.input.keyboard!.on('keydown-S', () => this.menu.move(1));
    this.input.keyboard!.on('keydown-ENTER', () => {
      Audio.unlock();
      this.menu.confirm();
    });
    this.input.keyboard!.on('keydown-SPACE', () => {
      Audio.unlock();
      this.menu.confirm();
    });
    this.input.keyboard!.on('keydown-N', () => Audio.toggleMute());
  }
}
