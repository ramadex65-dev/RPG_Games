import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { ITEMS, SHOP_STOCK } from '../data/items';
import type { ClassId } from '../data/types';
import { Registry } from '../systems/registry';
import { saveGame } from '../systems/save';
import { isBlocked, TILE, TOWN_MAP } from '../world/maps';
import { TextMenu } from '../ui/menu';
import { UI } from '../ui/theme';

type Mode = 'explore' | 'dialog' | 'shop' | 'menu';

export class TownScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private tx = 8;
  private ty = 8;
  private mode: Mode = 'explore';
  private dialogText!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private menu: TextMenu | null = null;
  private moveCooldown = 0;
  private keys!: {
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
    super('Town');
  }

  create(): void {
    const state = Registry.get();
    this.tx = state.location === 'town' ? state.playerX : 8;
    this.ty = state.location === 'town' ? state.playerY : 8;
    state.location = 'town';

    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x1b2a1f);

    for (let y = 0; y < TOWN_MAP.length; y++) {
      for (let x = 0; x < TOWN_MAP[0].length; x++) {
        const tile = TOWN_MAP[y][x];
        const color =
          tile === 1
            ? 0x3a4a3a
            : tile === 3
              ? 0xc2a35a
              : tile === 4
                ? 0x6ea8c8
                : tile === 5
                  ? 0x6b4a8a
                  : 0x4f7a4f;
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
      .setScrollFactor(0)
      .setDepth(20);

    this.dialogText = this.add
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

    this.overlay = this.add.container(0, 0).setDepth(30).setVisible(false);

    this.add
      .text(12, this.scale.height - 22, 'WASD/Arrows move  •  E interact  •  M menu  •  Shop=gold  Inn=blue  Cave=purple', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.muted,
      })
      .setDepth(20);

    const kb = this.input.keyboard!;
    this.keys = {
      left: kb.addKey('LEFT'),
      right: kb.addKey('RIGHT'),
      up: kb.addKey('UP'),
      down: kb.addKey('DOWN'),
      a: kb.addKey('A'),
      d: kb.addKey('D'),
      w: kb.addKey('W'),
      s: kb.addKey('S'),
    };

    this.refreshHud();
    this.bindKeys();
  }

  update(_t: number, dt: number): void {
    if (this.mode !== 'explore') return;
    this.moveCooldown = Math.max(0, this.moveCooldown - dt);
    if (this.moveCooldown > 0) return;
    let dx = 0;
    let dy = 0;
    if (this.keys.left.isDown || this.keys.a.isDown) dx = -1;
    else if (this.keys.right.isDown || this.keys.d.isDown) dx = 1;
    else if (this.keys.up.isDown || this.keys.w.isDown) dy = -1;
    else if (this.keys.down.isDown || this.keys.s.isDown) dy = 1;
    if (dx || dy) this.tryMove(dx, dy);
  }

  private bindKeys(): void {
    this.input.keyboard!.on('keydown-E', () => this.interact());
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.mode === 'dialog') this.closeDialog();
      else if (this.mode === 'shop' || this.mode === 'menu') this.menu?.confirm();
    });
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (this.mode === 'dialog') this.closeDialog();
      else if (this.mode === 'shop' || this.mode === 'menu') this.menu?.confirm();
    });
    this.input.keyboard!.on('keydown-ESC', () => this.closeOverlay());
    this.input.keyboard!.on('keydown-M', () => this.openGameMenu());
    this.input.keyboard!.on('keydown-UP', () => this.menu?.move(-1));
    this.input.keyboard!.on('keydown-DOWN', () => this.menu?.move(1));
  }

  private tryMove(dx: number, dy: number): void {
    const nx = this.tx + dx;
    const ny = this.ty + dy;
    if (isBlocked(TOWN_MAP, nx, ny)) return;
    this.tx = nx;
    this.ty = ny;
    this.player.setPosition(this.tx * TILE + TILE / 2, this.ty * TILE + TILE / 2);
    this.moveCooldown = 140;
    const state = Registry.get();
    state.playerX = this.tx;
    state.playerY = this.ty;
  }

  private interact(): void {
    if (this.mode !== 'explore') return;
    const tile = TOWN_MAP[this.ty][this.tx];
    if (tile === 3) this.openShop();
    else if (tile === 4) this.useInn();
    else if (tile === 5) this.enterDungeon();
    else this.showDialog('Elder: The Ley Wraith stirs beneath the cave. Choose your four carefully.');
  }

  private showDialog(text: string): void {
    this.mode = 'dialog';
    this.dialogText.setText(text + '\n\n[Enter] continue').setVisible(true);
  }

  private closeDialog(): void {
    this.dialogText.setVisible(false);
    this.mode = 'explore';
  }

  private useInn(): void {
    const state = Registry.get();
    const cost = 15;
    if (state.gold < cost) {
      this.showDialog('Innkeeper: You need 15 gold to rest.');
      return;
    }
    state.gold -= cost;
    for (const h of state.party) {
      h.currentHp = h.stats.hp;
      h.currentMp = h.stats.mp;
      h.states = [];
    }
    saveGame(state);
    this.refreshHud();
    this.showDialog('Innkeeper: Rest well. Your party is fully restored. (-15g)');
  }

  private enterDungeon(): void {
    const state = Registry.get();
    state.location = 'dungeon';
    state.playerX = 16;
    state.playerY = 1;
    saveGame(state);
    this.scene.start('Dungeon');
  }

  private openShop(): void {
    this.mode = 'shop';
    this.overlay.removeAll(true);
    this.overlay.setVisible(true);
    const panel = this.add.rectangle(400, 260, 420, 320, 0x111820, 0.95).setStrokeStyle(2, 0xc2a35a);
    const title = this.add.text(240, 120, 'General Store', {
      fontFamily: UI.font,
      fontSize: '16px',
      color: UI.color.cream,
    });
    this.overlay.add([panel, title]);
    this.menu = new TextMenu(
      this,
      250,
      160,
      [
        ...SHOP_STOCK.map((id) => ({
          label: `${ITEMS[id].name} — ${ITEMS[id].price}g`,
        })),
        { label: 'Leave' },
      ],
      (index) => {
        if (index >= SHOP_STOCK.length) {
          this.closeOverlay();
          return;
        }
        this.buy(SHOP_STOCK[index]);
      },
    );
  }

  private buy(itemId: string): void {
    const state = Registry.get();
    const item = ITEMS[itemId];
    if (state.gold < item.price) {
      this.showDialog(`Not enough gold for ${item.name}.`);
      this.closeOverlay();
      return;
    }
    state.gold -= item.price;
    if (item.kind === 'weapon') {
      for (const h of state.party) {
        h.equipment = h.equipment ?? {};
        if (!h.equipment.weapon) {
          h.equipment.weapon = itemId;
          h.stats.atk += item.atkBonus ?? 0;
          break;
        }
      }
    } else if (item.kind === 'armor') {
      for (const h of state.party) {
        h.equipment = h.equipment ?? {};
        if (!h.equipment.armor) {
          h.equipment.armor = itemId;
          h.stats.def += item.defBonus ?? 0;
          break;
        }
      }
    } else {
      const stack = state.inventory.find((i) => i.id === itemId);
      if (stack) stack.qty += 1;
      else state.inventory.push({ id: itemId, qty: 1 });
    }
    saveGame(state);
    this.refreshHud();
    this.showDialog(`Bought ${item.name}.`);
    this.closeOverlay();
  }

  private openGameMenu(): void {
    if (this.mode !== 'explore') return;
    this.mode = 'menu';
    this.overlay.removeAll(true);
    this.overlay.setVisible(true);
    const panel = this.add.rectangle(400, 240, 360, 220, 0x111820, 0.95).setStrokeStyle(2, 0x8a93a8);
    const title = this.add.text(260, 150, 'Party Menu', {
      fontFamily: UI.font,
      fontSize: '16px',
      color: UI.color.cream,
    });
    this.overlay.add([panel, title]);
    this.menu = new TextMenu(
      this,
      270,
      190,
      [{ label: 'Save Game' }, { label: 'Status' }, { label: 'Close' }],
      (_i, item) => {
        if (item.label === 'Save Game') {
          saveGame(Registry.get());
          this.closeOverlay();
          this.showDialog('Game saved.');
        } else if (item.label === 'Status') {
          const s = Registry.get();
          const lines = s.party
            .map((h) => `${h.name} Lv${h.level}  HP ${h.currentHp}/${h.stats.hp}  MP ${h.currentMp}/${h.stats.mp}`)
            .join('\n');
          this.closeOverlay();
          this.showDialog(lines);
        } else {
          this.closeOverlay();
        }
      },
    );
  }

  private closeOverlay(): void {
    this.menu?.destroy();
    this.menu = null;
    this.overlay.removeAll(true);
    this.overlay.setVisible(false);
    if (this.mode !== 'dialog') this.mode = 'explore';
  }

  private refreshHud(): void {
    const s = Registry.get();
    this.hud.setText(
      `Gold ${s.gold}   ` +
        s.party.map((h) => `${h.name} ${h.currentHp}/${h.stats.hp}`).join('  |  '),
    );
  }
}
