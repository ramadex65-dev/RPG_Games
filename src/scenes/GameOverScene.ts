import Phaser from 'phaser';
import { loadGame } from '../systems/save';
import { Registry } from '../systems/registry';
import { UI } from '../ui/theme';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x120a12);
    this.add
      .text(width / 2, height / 2 - 36, 'DEFEAT', {
        fontFamily: UI.font,
        fontSize: '28px',
        color: UI.color.danger,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 12, 'Enter: load last save    Esc: title', {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: UI.color.muted,
      })
      .setOrigin(0.5);

    this.input.keyboard!.on('keydown-ENTER', () => {
      const save = loadGame();
      if (save) {
        for (const h of save.party) {
          if (h.currentHp <= 0) h.currentHp = Math.max(1, Math.floor(h.stats.hp * 0.3));
        }
        save.location = 'town';
        save.playerX = 8;
        save.playerY = 8;
        Registry.set(save);
        this.scene.start('Town');
      } else {
        this.scene.start('Title');
      }
    });
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('Title'));
  }
}
