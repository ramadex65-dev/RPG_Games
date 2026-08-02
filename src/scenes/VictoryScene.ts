import Phaser from 'phaser';
import { Audio } from '../systems/audio';
import { Registry } from '../systems/registry';
import { UI } from '../ui/theme';

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Victory');
  }

  create(): void {
    Audio.playMusic('title');
    Audio.sfx('victory');
    const state = Registry.get();
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x12182a);

    this.add
      .text(width / 2, 100, 'SEVEN TRADITIONS', {
        fontFamily: UI.font,
        fontSize: '28px',
        color: UI.color.cream,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 150, 'The Circle Endures', {
        fontFamily: UI.font,
        fontSize: '18px',
        color: UI.color.accent,
      })
      .setOrigin(0.5);

    const lines = [
      'The Ley Wraith is banished.',
      'The Echo Knight is silenced.',
      '',
      ...state.party.map((h) => `${h.name} — Lv ${h.level}`),
      ...(state.reserve.length
        ? ['', 'Reserve:', ...state.reserve.map((h) => `${h.name} — Lv ${h.level}`)]
        : []),
      '',
      `Gold carried: ${state.gold}`,
      '',
      'Enter — return to town',
    ];

    this.add
      .text(width / 2, 200, lines.join('\n'), {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: UI.color.body,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);

    this.input.keyboard!.on('keydown-ENTER', () => {
      state.location = 'town';
      state.playerX = 11;
      state.playerY = 8;
      this.scene.start('Town');
    });
  }
}
