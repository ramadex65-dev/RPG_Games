import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { CAVE_ENCOUNTERS } from '../data/enemies';
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

export class DungeonScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private floor!: GeneratedFloor;
  private tx = 1;
  private ty = 1;
  private hud!: Phaser.GameObjects.Text;
  private dialog!: Phaser.GameObjects.Text;
  private questLog!: QuestLog;
  private inventoryUi: InventoryScreen | null = null;
  private chestMarks: Phaser.GameObjects.Rectangle[] = [];
  private bossLabel!: Phaser.GameObjects.Text;
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
    // Keep layout across battles; regenerate when missing (fresh town entry).
    if (!state.caveFloor) {
      state.caveFloor = generateFloor('dungeon', partyLevel());
      state.playerX = state.caveFloor.entrance.x;
      state.playerY = state.caveFloor.entrance.y;
    }
    this.floor = state.caveFloor;
    const map = this.floor.map;

    this.tx = state.location === 'dungeon' ? state.playerX : this.floor.entrance.x;
    this.ty = state.location === 'dungeon' ? state.playerY : this.floor.entrance.y;
    this.tx = Phaser.Math.Clamp(this.tx, 1, map[0].length - 2);
    this.ty = Phaser.Math.Clamp(this.ty, 1, map.length - 2);
    if (isBlocked(map, this.tx, this.ty)) {
      this.tx = this.floor.entrance.x;
      this.ty = this.floor.entrance.y;
    }
    state.location = 'dungeon';
    state.playerX = this.tx;
    state.playerY = this.ty;

    const { w, h } = mapPixelSize(map);
    this.cameras.main.setBounds(0, 0, w, h);
    this.add.rectangle(w / 2, h / 2, w, h, 0x141018);

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[0].length; x++) {
        const tile = map[y][x];
        let color = tileColor(tile, false);
        if (tile === 2) color = 0x4f7a4f;
        if (tile === 6) color = 0x8b4dff;
        this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 2, TILE - 2, color);
      }
    }

    this.bossLabel = this.add
      .text(this.floor.boss.x * TILE + TILE / 2, this.floor.boss.y * TILE + TILE / 2, 'WRAITH', {
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
      .text(
        12,
        this.scale.height - 22,
        'Purple = Ley Wraith  •  Gold = chest (E)  •  I inventory  •  Green = town  •  Layout random each entry',
        {
          fontFamily: UI.font,
          fontSize: UI.tiny,
          color: UI.color.muted,
          backgroundColor: '#00000066',
          padding: { x: 4, y: 2 },
        },
      )
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
        const muted = Audio.toggleMute();
        this.toast(muted ? 'Audio muted.' : 'Audio on.');
      },
    });

    if (!state.flags.tutorialShown) {
      state.flags.tutorialShown = true;
      this.toast('These halls shift with each descent. Seek chests, then the Ley Wraith.');
    }

    saveGame(state);
    this.refreshHud();
  }

  private map() {
    return this.floor.map;
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
    const map = this.map();
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

    const tile = map[this.ty][this.tx];
    if (tile === 2) {
      state.location = 'town';
      state.playerX = 12;
      state.playerY = 14;
      state.caveFloor = undefined; // next entry reshuffles
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
    for (const c of this.floor.chests) {
      if (c.opened || state.chests[c.id]) continue;
      this.chestMarks.push(
        this.add.rectangle(c.x * TILE + TILE / 2, c.y * TILE + TILE / 2, 14, 12, 0xd4a017).setDepth(3),
      );
    }
  }

  private interact(): void {
    if (this.blocked || this.inventoryUi) return;
    const state = Registry.get();
    const chest = chestAt(state, 'dungeon', this.tx, this.ty);
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

  private closeToast(): void {
    if (!this.blocked || this.inventoryUi) return;
    this.dialog.setVisible(false);
    this.blocked = false;
  }

  private refreshHud(): void {
    const s = Registry.get();
    const open = this.floor.chests.filter((c) => !c.opened && !s.chests[c.id]).length;
    this.hud.setText(
      `Dungeon (seed ${this.floor.seed.toString(16).slice(0, 4)})  Chests ${open}  Gold ${s.gold}   ` +
        s.party.map((h) => `${h.name} ${h.currentHp}/${h.stats.hp}`).join('  |  '),
    );
    this.questLog.refresh();
    void this.bossLabel;
  }
}
