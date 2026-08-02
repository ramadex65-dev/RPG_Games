import Phaser from 'phaser';
import { activeQuestText } from '../data/quests';
import { Registry } from '../systems/registry';
import { UI } from './theme';

/** Fixed-to-camera quest objective panel. */
export class QuestLog {
  private root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x = 12, y = 36) {
    const bg = scene.add
      .rectangle(0, 0, 280, 52, 0x0c1018, 0.82)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x5a6480);
    const title = scene.add.text(8, 4, 'QUEST', {
      fontFamily: UI.font,
      fontSize: UI.tiny,
      color: UI.color.accent,
    });
    this.body = scene.add.text(8, 18, '', {
      fontFamily: UI.font,
      fontSize: UI.tiny,
      color: UI.color.body,
      wordWrap: { width: 264 },
    });
    this.root = scene.add.container(x, y, [bg, title, this.body]).setScrollFactor(0).setDepth(40);
    this.refresh();
  }

  refresh(): void {
    const state = Registry.get();
    const q = activeQuestText(state);
    this.body.setText(`${q.title}: ${q.body}`);
  }

  destroy(): void {
    this.root.destroy(true);
  }
}
