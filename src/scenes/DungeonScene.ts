import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { ENCOUNTER_TABLE } from '../data/enemies';
import type { ClassId } from '../data/types';
import { Registry } from '../systems/registry';
import { saveGame } from '../systems/save';
import { DUNGEON_MAP, isBlocked, TILE } from '../world/maps';
import { UI } from '../ui/theme';

export class DungeonScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private tx = 16;
  private ty = 1;
  private hud!: Phaser.GameObjects.Text;
  private dialog!: Phaser.GameObjects.Text;
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
    const state = Registry.get();
    this.tx = state.location === 'dungeon' ? state.playerX : 16;
    this.ty = state.location === 'dungeon' ? state.playerY : 1;
    state.location = 'dungeon';

    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x141018);

    for (let y = 0; y < DUNGEON_MAP.length; y++) {
      for (let x = 0; x < DUNGEON_MAP[0].length; x++) {
        const tile = DUNGEON_MAP[y][x];
        const color =
          tile === 1
            ? 0x2a2433
            : tile === 2
              ? 0x4f7a4f
              : tile === 6
                ? 0x8b4dff
                : 0x3a3348;
        this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 2, TILE - 2, color);
      }
    }

    const lead = Registry.get().party[0];
    const leadKey = lead?.classId ? classTextureKey(lead.classId as ClassId) : 'char_adventurer';
    this.player = this.add
      .image(this.tx * TILE + TILE / 2, this.ty * TILE + TILE / 2, leadKey)
      .setDisplaySize(28, 36)
      .setDepth(5);

    this.hud = this.add
      .text(12, 8, '', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.cream,
        backgroundColor: '#00000088',
        padding: { x: 6, y: 3 },
      })
      .setDepth(20);

    this.dialog = this.add
      .text(40, this.scale.height - 80, '', {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: '#f5f0e4',
        backgroundColor: '#000000cc',
        padding: { x: 10, y: 8 },
        wordWrap: { width: this.scale.width - 80 },
      })
      .setDepth(20)
      .setVisible(false);

    this.add
      .text(12, this.scale.height - 22, 'Purple = Ley Wraith boss   •   Green = return to town', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.muted,
      })
      .setDepth(20);

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

    if (!state.flags.tutorialShown) {
      state.flags.tutorialShown = true;
      this.toast('Dark energy coils through these halls. Survive random battles and face the Ley Wraith.');
    }

    this.refreshHud();
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
    this.moveCooldown = 130;
    const state = Registry.get();
    state.playerX = this.tx;
    state.playerY = this.ty;

    const tile = DUNGEON_MAP[this.ty][this.tx];
    if (tile === 2) {
      state.location = 'town';
      state.playerX = 7;
      state.playerY = 10;
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
      this.scene.start('Battle');
      return;
    }

    this.stepsSinceFight += 1;
    if (this.stepsSinceFight >= 4 && Math.random() < 0.22) {
      this.stepsSinceFight = 0;
      const pack = ENCOUNTER_TABLE[Math.floor(Math.random() * ENCOUNTER_TABLE.length)];
      Registry.setEncounter(pack, false);
      saveGame(state);
      this.scene.start('Battle');
    }
  }

  private interact(): void {
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
  }
}
