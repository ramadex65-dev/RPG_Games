import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { PartySelectScene } from './scenes/PartySelectScene';
import { TownScene } from './scenes/TownScene';
import { DungeonScene } from './scenes/DungeonScene';
import { RuinsScene } from './scenes/RuinsScene';
import { BattleScene } from './scenes/BattleScene';
import { GameOverScene } from './scenes/GameOverScene';
import { VictoryScene } from './scenes/VictoryScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 600,
  backgroundColor: '#0b1020',
  scene: [
    BootScene,
    TitleScene,
    PartySelectScene,
    TownScene,
    DungeonScene,
    RuinsScene,
    BattleScene,
    GameOverScene,
    VictoryScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
