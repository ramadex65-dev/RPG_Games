import Phaser from 'phaser';
import { generateBuildingTextures } from '../assets/buildings';
import { generateCharacterTextures } from '../assets/characters';
import { generateNpcTextures } from '../assets/npcs';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 16, 16);
    g.generateTexture('pixel', 16, 16);
    g.destroy();

    generateCharacterTextures(this);
    generateBuildingTextures(this);
    generateNpcTextures(this);
    this.scene.start('Title');
  }
}
