import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { CAVE_ENCOUNTERS } from '../data/enemies';
import type { ClassId } from '../data/types';
import { Audio } from '../systems/audio';
import { Registry } from '../systems/registry';
import { saveGame } from '../systems/save';
import { chestAt, openChest } from '../world/explore';
import { DUNGEON_MAP, isBlocked, mapPixelSize, TILE, tileColor } from '../world/maps';
import { InventoryScreen } from '../ui/InventoryScreen';
import { QuestLog } from '../ui/QuestLog';
import { UI } from '../ui/theme';

export class DungeonScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private tx = 20;
  private ty = 1;
  private hud!: Phaser.GameObjects.Text;
  private dialog!: Phaser.GameObjects.Text;
  private questLog!: QuestLog;
  private inventoryUi: InventoryScreen | null = null;
  private chestMarks: Phaser.GameObjects.Rectangle[] = [];
  private moveCooldown = 0;
  private stepsSinceFight = 0;
  private blocked = false;
  private cursors!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super('Dungeon');
  }

  create(): void {
    Audio.unlock();
    Audio.playMusic('dungeon');

    const state = Registry.get();
    this.tx = state.location === 'dungeon' ? state.playerX : 20;
    this.ty = state.location === 'dungeon' ? state.playerY : 1;
    this.tx = Phaser.Math.Clamp(this.tx, 1, DUNGEON_MAP[0].length - 2);
    this.ty = Phaser.Math.Clamp(this.ty, 1, DUNGEON_MAP.length - 2);
    state.location = 'dungeon';

    const { w, h } = mapPixelSize(DUNGEON_MAP);
    this.cameras.main.setBounds(0, 0, w, h);
    this.add.rectangle(w / 2, h / 2, w, h, 0x141018);

    for (let y = 0; y < DUNGEON_MAP.length; y++) {
      for (let x = 0; x < DUNGEON_MAP[0].length; x++) {
        const tile = DUNGEON_MAP[y][x];
        let color = tileColor(tile, false);
        if (tile === 2) color = 0x4f7a4f;
        if (tile === 6) color = 0x8b4dff;
        this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 2, TILE - 2, color);
      }
    }

    this.add
      .text(1 * TILE + TILE / 2, 13 * TILE + TILE / 2, 'WRAITH', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: '#d48cff',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.refreshChests();

    const lead = Registry.get().party[0];
    const leadKey = lead?.classId ? classTextureKey(lead.classId as ClassId) : 'char_adventurer';
    this.player = this.add
      .image(this.tx * TILE + TILE / 2, this.ty * TILE + TILE / 2, leadKey)
      .setDisplaySize(28, 36)
      .setDepth(5);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);

    this.hud = this.add
      .text(12, 8, '', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.cream,
        backgroundColor: '#00000088',
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0)
      .setDepth(40);

    this.questLog = new QuestLog(this, 12, 34);

    this.dialog = this.add
      .text(40, this.scale.height - 80, '', {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: '#f5f0e4',
        backgroundColor: '#000000cc',
        padding: { x: 10, y: 8 },
        wordWrap: { width: this.scale.width - 80 },
      })
      .setScrollFactor(0)
      .setDepth(50)
      .setVisible(false);

    this.add
      .text(12, this.scale.height - 22, 'Purple = Ley Wraith  •  Gold = chest (E)  •  I inventory  •  Green = town  •  N mute', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.muted,
        backgroundColor: '#00000066',
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(40);

    const kb = this.input.keyboard!;
    this.cursors = {
      left: kb.addKey('LEFT'),
      right: kb.addKey('RIGHT'),
      up: kb.addKey('UP'),
      down: kb.addKey('DOWN'),
      a: kb.addKey('A'),
      d: kb.addKey('D'),
      w: kb.addKey('W'),
      s: kb.addKey('S'),
    };

    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.blocked) {
        this.dialog.setVisible(false);
        this.blocked = false;
      }
    });
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (this.blocked) {
        this.dialog.setVisible(false);
        this.blocked = false;
      }
    });
    this.input.keyboard!.on('keydown-E', () => this.interact());
    this.input.keyboard!.on('keydown-I', () => this.toggleInventory());
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.inventoryUi) this.inventoryUi.close();
    });
    this.input.keyboard!.on('keydown-N', () => {
      const muted = Audio.toggleMute();
      this.toast(muted ? 'Audio muted.' : 'Audio on.');
    });

    if (!state.flags.tutorialShown) {
      state.flags.tutorialShown = true;
      this.toast('Dark energy coils through these halls. Survive random battles and face the Ley Wraith.');
    }

    this.refreshHud();
  }

  private toggleInventory(): void {
    if (this.inventoryUi) {
      this.inventoryUi.close();
      return;
    }
    if (this.blocked) return;
    Audio.sfx('confirm');
    this.blocked = true;
    this.inventoryUi = new InventoryScreen(this, () => {
      this.inventoryUi = null;
      this.blocked = false;
      this.refreshHud();
    });
  }

  update(_t: number, dt: number): void {
    if (this.blocked) return;
    this.moveCooldown = Math.max(0, this.moveCooldown - dt);
    if (this.moveCooldown > 0) return;
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.cursors.a.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.cursors.d.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.cursors.w.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.cursors.s.isDown) dy = 1;
    if (dx || dy) this.tryMove(dx, dy);
  }

  private tryMove(dx: number, dy: number): void {
    const nx = this.tx + dx;
    const ny = this.ty + dy;
    if (isBlocked(DUNGEON_MAP, nx, ny)) return;
    this.tx = nx;
    this.ty = ny;
    this.player.setPosition(this.tx * TILE + TILE / 2, this.ty * TILE + TILE / 2);
    this.moveCooldown = 120;
    Audio.sfx('step');
    const state = Registry.get();
    state.playerX = this.tx;
    state.playerY = this.ty;

    const tile = DUNGEON_MAP[this.ty][this.tx];
    if (tile === 2) {
      state.location = 'town';
      state.playerX = 12;
      state.playerY = 14;
      saveGame(state);
      this.scene.start('Town');
      return;
    }
    if (tile === 6) {
      if (state.dungeonCleared) {
        this.toast('The Ley Wraith has already been banished.');
        return;
      }
      Registry.setEncounter(['ley_wraith'], true);
      Audio.playMusic('boss');
      this.scene.start('Battle');
      return;
    }

    this.stepsSinceFight += 1;
    if (this.stepsSinceFight >= 4 && Math.random() < 0.22) {
      this.stepsSinceFight = 0;
      const pack = CAVE_ENCOUNTERS[Math.floor(Math.random() * CAVE_ENCOUNTERS.length)];
      Registry.setEncounter(pack, false);
      saveGame(state);
      Audio.playMusic('battle');
      this.scene.start('Battle');
    }
  }

  private refreshChests(): void {
    this.chestMarks.forEach((m) => m.destroy());
    this.chestMarks = [];
    const state = Registry.get();
    for (const c of [
      { x: 3, y: 5, id: 'cave_cache' },
      { x: 14, y: 7, id: 'cave_side' },
    ]) {
      if (state.chests[c.id]) continue;
      this.chestMarks.push(
        this.add.rectangle(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2, 14, 12, 0xd4a017).setDepth(3),
      );
    }
  }

  private interact(): void {
    const state = Registry.get();
    const chest = chestAt('dungeon', this.tx, this.ty);
    if (chest) {
      const msg = openChest(state, chest);
      Audio.sfx('confirm');
      saveGame(state);
      this.refreshChests();
      this.refreshHud();
      this.toast(msg);
      return;
    }
    this.toast('A cold wind whispers: restore at the inn if you falter.');
  }

  private toast(text: string): void {
    this.blocked = true;
    this.dialog.setText(text + '\n\n[Enter] continue').setVisible(true);
  }

  private refreshHud(): void {
    const s = Registry.get();
    this.hud.setText(
      `Dungeon   Gold ${s.gold}   ` +
        s.party.map((h) => `${h.name} ${h.currentHp}/${h.stats.hp}`).join('  |  '),
    );
    this.questLog.refresh();
  }
}
