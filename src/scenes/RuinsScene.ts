import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { RUINS_ENCOUNTERS } from '../data/enemies';
import type { ClassId, GeneratedFloor } from '../data/types';
import { Audio } from '../systems/audio';
import { bindSceneKeys } from '../systems/keys';
import { Registry } from '../systems/registry';
import { saveGame } from '../systems/save';
import { chestAt, openChest } from '../world/explore';
import { generateFloor } from '../world/generate';
import { isBlocked, mapPixelSize, TILE, tileColor } from '../world/maps';
import { InventoryScreen } from '../ui/InventoryScreen';
import { QuestLog } from '../ui/QuestLog';
import { UI } from '../ui/theme';

function partyLevel(): number {
  const party = Registry.get().party;
  if (!party.length) return 1;
  return Math.max(1, Math.round(party.reduce((s, h) => s + h.level, 0) / party.length));
}

export class RuinsScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private floor!: GeneratedFloor;
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
    this.blocked = false;
    this.inventoryUi = null;
    this.moveCooldown = 0;
    this.stepsSinceFight = 0;
    this.chestMarks.forEach((m) => m.destroy());
    this.chestMarks = [];

    Audio.unlock();
    Audio.playMusic('dungeon');
    const state = Registry.get();
    if (!state.ruinsFloor) {
      state.ruinsFloor = generateFloor('ruins', partyLevel());
      state.playerX = state.ruinsFloor.entrance.x;
      state.playerY = state.ruinsFloor.entrance.y;
    }
    this.floor = state.ruinsFloor;
    const map = this.floor.map;

    this.tx = state.location === 'ruins' ? state.playerX : this.floor.entrance.x;
    this.ty = state.location === 'ruins' ? state.playerY : this.floor.entrance.y;
    this.tx = Phaser.Math.Clamp(this.tx, 1, map[0].length - 2);
    this.ty = Phaser.Math.Clamp(this.ty, 1, map.length - 2);
    if (isBlocked(map, this.tx, this.ty)) {
      this.tx = this.floor.entrance.x;
      this.ty = this.floor.entrance.y;
    }
    state.location = 'ruins';
    state.playerX = this.tx;
    state.playerY = this.ty;

    const { w, h } = mapPixelSize(map);
    this.cameras.main.setBounds(0, 0, w, h);
    this.add.rectangle(w / 2, h / 2, w, h, 0x181820);

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[0].length; x++) {
        const tile = map[y][x];
        let color = tileColor(tile, false);
        if (tile === 2) color = 0x5a7a5a;
        if (tile === 6) color = 0x5b6ee1;
        this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 2, TILE - 2, color);
      }
    }

    this.refreshChests();

    this.add
      .text(this.floor.boss.x * TILE + TILE / 2, this.floor.boss.y * TILE + TILE / 2, 'ECHO', {
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
      .setVisible(false)
      .setInteractive()
      .on('pointerdown', () => this.closeToast());

    this.add
      .text(12, this.scale.height - 22, 'Ruins  •  Blue = Echo Knight  •  Chests (E)  •  I inventory  •  Layout random each entry', {
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
    bindSceneKeys(this, {
      'keydown-ENTER': () => this.closeToast(),
      'keydown-SPACE': () => this.closeToast(),
      'keydown-E': () => this.interact(),
      'keydown-I': () => this.toggleInventory(),
      'keydown-ESC': () => {
        if (this.inventoryUi) this.inventoryUi.close();
        else this.closeToast();
      },
      'keydown-N': () => {
        this.flashHint(Audio.toggleMute() ? 'Audio muted.' : 'Audio on.');
      },
    });

    saveGame(state);
    this.refreshHud();
  }

  private toggleInventory(): void {
    if (this.inventoryUi) {
      this.inventoryUi.close();
      return;
    }
    Audio.sfx('confirm');
    this.blocked = true;
    this.inventoryUi = new InventoryScreen(this, () => {
      this.inventoryUi = null;
      this.blocked = false;
      this.refreshHud();
    });
  }

  update(_t: number, dt: number): void {
    if (this.inventoryUi) return;
    if (this.blocked) this.closeToast();
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
    for (const c of this.floor.chests) {
      if (c.opened || state.chests[c.id]) continue;
      this.chestMarks.push(
        this.add.rectangle(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2, 14, 12, 0xd4a017).setDepth(3),
      );
    }
  }

  private tryMove(dx: number, dy: number): void {
    try {
      const map = this.floor.map;
      const nx = this.tx + dx;
      const ny = this.ty + dy;
      if (isBlocked(map, nx, ny)) return;
      this.tx = nx;
      this.ty = ny;
      this.player.setPosition(this.tx * TILE + TILE / 2, this.ty * TILE + TILE / 2);
      this.moveCooldown = 120;
      Audio.sfx('step');
      const state = Registry.get();
      state.playerX = this.tx;
      state.playerY = this.ty;

      const tile = map[this.ty]?.[this.tx];
      if (tile === 2) {
        state.location = 'town';
        state.playerX = 20;
        state.playerY = 14;
        state.ruinsFloor = undefined;
        saveGame(state);
        this.scene.start('Town');
        return;
      }
      if (tile === 6) {
        if (state.ruinsCleared) {
          this.flashHint('The Echo Knight is already defeated.');
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
    } catch {
      this.moveCooldown = 120;
      this.blocked = false;
    }
  }

  private interact(): void {
    if (this.inventoryUi) return;
    const state = Registry.get();
    const chest = chestAt(state, 'ruins', this.tx, this.ty);
    if (chest) {
      try {
        const msg = openChest(state, chest);
        Audio.sfx('confirm');
        saveGame(state);
        this.refreshChests();
        this.refreshHud();
        this.flashHint(msg, 2600);
      } catch {
        this.flashHint('The chest latch sticks… try again.');
      }
      return;
    }
    this.flashHint('Echoes of old battles linger in the stone.');
  }

  private flashHint(text: string, ms = 1600): void {
    if (this.inventoryUi) return;
    this.blocked = false;
    this.dialog.setText(text).setVisible(true);
    const token = text;
    this.time.delayedCall(ms, () => {
      if (!this.inventoryUi && this.dialog.visible && this.dialog.text === token) {
        this.dialog.setVisible(false);
      }
    });
  }

  private closeToast(): void {
    if (this.inventoryUi) return;
    this.dialog.setVisible(false);
    this.blocked = false;
  }

  private refreshHud(): void {
    const s = Registry.get();
    const open = this.floor.chests.filter((c) => !c.opened && !s.chests[c.id]).length;
    this.hud.setText(
      `Ruins (seed ${this.floor.seed.toString(16).slice(0, 4)})  Chests ${open}  Gold ${s.gold}   ` +
        s.party.map((h) => `${h.name} ${h.currentHp}/${h.stats.hp}`).join('  |  '),
    );
    this.questLog.refresh();
  }
}
