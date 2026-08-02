import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { RUINS_ENCOUNTERS } from '../data/enemies';
import type { ClassId } from '../data/types';
import { Audio } from '../systems/audio';
import { Registry } from '../systems/registry';
import { saveGame } from '../systems/save';
import { chestAt, openChest } from '../world/explore';
import { isBlocked, mapPixelSize, RUINS_MAP, TILE, tileColor } from '../world/maps';
import { InventoryScreen } from '../ui/InventoryScreen';
import { QuestLog } from '../ui/QuestLog';
import { UI } from '../ui/theme';

export class RuinsScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private tx = 1;
  private ty = 1;
  private hud!: Phaser.GameObjects.Text;
  private dialog!: Phaser.GameObjects.Text;
  private questLog!: QuestLog;
  private inventoryUi: InventoryScreen | null = null;
  private chestMarks: Phaser.GameObjects.Rectangle[] = [];
  private moveCooldown = 0;
  private stepsSinceFight = 0;
  private blocked = false;
  private cursors!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Ruins');
  }

  create(): void {
    Audio.unlock();
    Audio.playMusic('dungeon');
    const state = Registry.get();
    this.tx = state.location === 'ruins' ? state.playerX : 1;
    this.ty = state.location === 'ruins' ? state.playerY : 1;
    this.tx = Phaser.Math.Clamp(this.tx, 1, RUINS_MAP[0].length - 2);
    this.ty = Phaser.Math.Clamp(this.ty, 1, RUINS_MAP.length - 2);
    state.location = 'ruins';

    const { w, h } = mapPixelSize(RUINS_MAP);
    this.cameras.main.setBounds(0, 0, w, h);
    this.add.rectangle(w / 2, h / 2, w, h, 0x181820);

    for (let y = 0; y < RUINS_MAP.length; y++) {
      for (let x = 0; x < RUINS_MAP[0].length; x++) {
        const tile = RUINS_MAP[y][x];
        let color = tileColor(tile, false);
        if (tile === 2) color = 0x5a7a5a;
        if (tile === 6) color = 0x5b6ee1;
        this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 2, TILE - 2, color);
      }
    }

    this.refreshChests();

    this.add
      .text(1 * TILE + TILE / 2, 13 * TILE + TILE / 2, 'ECHO', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: '#9cf',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const lead = state.party[0];
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
      .text(12, this.scale.height - 22, 'Ruins  •  Blue = Echo Knight  •  Chests (E)  •  I inventory  •  N mute', {
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
    this.input.keyboard!.on('keydown-ENTER', () => this.closeToast());
    this.input.keyboard!.on('keydown-SPACE', () => this.closeToast());
    this.input.keyboard!.on('keydown-E', () => this.interact());
    this.input.keyboard!.on('keydown-I', () => this.toggleInventory());
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.inventoryUi) this.inventoryUi.close();
    });
    this.input.keyboard!.on('keydown-N', () => {
      this.toast(Audio.toggleMute() ? 'Audio muted.' : 'Audio on.');
    });

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

  private refreshChests(): void {
    this.chestMarks.forEach((m) => m.destroy());
    this.chestMarks = [];
    const state = Registry.get();
    for (const c of [
      { x: 15, y: 3, id: 'ruins_alcove' },
      { x: 8, y: 9, id: 'ruins_hall' },
    ]) {
      if (state.chests[c.id]) continue;
      this.chestMarks.push(
        this.add.rectangle(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2, 14, 12, 0xd4a017).setDepth(3),
      );
    }
  }

  private tryMove(dx: number, dy: number): void {
    const nx = this.tx + dx;
    const ny = this.ty + dy;
    if (isBlocked(RUINS_MAP, nx, ny)) return;
    this.tx = nx;
    this.ty = ny;
    this.player.setPosition(this.tx * TILE + TILE / 2, this.ty * TILE + TILE / 2);
    this.moveCooldown = 120;
    Audio.sfx('step');
    const state = Registry.get();
    state.playerX = this.tx;
    state.playerY = this.ty;

    const tile = RUINS_MAP[this.ty][this.tx];
    if (tile === 2) {
      state.location = 'town';
      state.playerX = 20;
      state.playerY = 14;
      saveGame(state);
      this.scene.start('Town');
      return;
    }
    if (tile === 6) {
      if (state.ruinsCleared) {
        this.toast('The Echo Knight is already defeated.');
        return;
      }
      Registry.setEncounter(['echo_knight'], true);
      Audio.playMusic('boss');
      this.scene.start('Battle');
      return;
    }

    this.stepsSinceFight += 1;
    if (this.stepsSinceFight >= 4 && Math.random() < 0.24) {
      this.stepsSinceFight = 0;
      const pack = RUINS_ENCOUNTERS[Math.floor(Math.random() * RUINS_ENCOUNTERS.length)];
      Registry.setEncounter(pack, false);
      saveGame(state);
      Audio.playMusic('battle');
      this.scene.start('Battle');
    }
  }

  private interact(): void {
    const state = Registry.get();
    const chest = chestAt('ruins', this.tx, this.ty);
    if (chest) {
      const msg = openChest(state, chest);
      Audio.sfx('confirm');
      saveGame(state);
      this.refreshChests();
      this.refreshHud();
      this.toast(msg);
      return;
    }
    this.toast('Echoes of old battles linger in the stone.');
  }

  private toast(text: string): void {
    this.blocked = true;
    this.dialog.setText(text + '\n\n[Enter] continue').setVisible(true);
  }

  private closeToast(): void {
    if (!this.blocked) return;
    this.dialog.setVisible(false);
    this.blocked = false;
  }

  private refreshHud(): void {
    const s = Registry.get();
    this.hud.setText(
      `Ruins   Gold ${s.gold}   ` +
        s.party.map((h) => `${h.name} ${h.currentHp}/${h.stats.hp}`).join('  |  '),
    );
    this.questLog.refresh();
  }
}
