import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { canEquip, ITEMS, shopStockForParty } from '../data/items';
import type { ClassId, Combatant } from '../data/types';
import { addItem, equipItem, formatBag, pruneEmpty } from '../systems/inventory';
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
  private shopStock: string[] = [];
  private pendingBuyId: string | null = null;
  private invHeroIndex = 0;
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
        // Special tiles get grass under buildings; walls stay solid
        const color = tile === 1 ? 0x3a4a3a : 0x4f7a4f;
        this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 2, TILE - 2, color);
      }
    }

    // Building art sits above door tiles (store / inn / cave)
    this.add.image(6 * TILE + TILE / 2, 2 * TILE + TILE / 2, 'building_store').setDisplaySize(92, 76).setDepth(2);
    this.add.image(9 * TILE + TILE / 2, 2 * TILE + TILE / 2, 'building_inn').setDisplaySize(92, 76).setDepth(2);
    this.add.image(7 * TILE + TILE / 2, 9 * TILE + TILE / 2 + 6, 'building_cave').setDisplaySize(100, 82).setDepth(2);

    // Door mats underfoot
    this.add.rectangle(6 * TILE + TILE / 2, 3 * TILE + TILE / 2 + 8, 20, 10, 0x5a3420).setDepth(1);
    this.add.rectangle(9 * TILE + TILE / 2, 3 * TILE + TILE / 2 + 8, 20, 10, 0x5a2e1a).setDepth(1);

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
      .text(12, this.scale.height - 22, 'WASD move  •  E interact  •  M menu  •  Stand on store / inn / cave door', {
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
    // Also allow interacting from the tile south of buildings (doorway feel)
    const above = this.ty > 0 ? TOWN_MAP[this.ty - 1][this.tx] : 0;
    if (tile === 3 || above === 3) this.openShop();
    else if (tile === 4 || above === 4) this.useInn();
    else if (tile === 5 || above === 5) this.enterDungeon();
    else this.showDialog('Elder: The Ley Wraith stirs beneath the cave. Outfit your party at the store.');
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
    this.showDialog('Innkeeper: Rest well by the hearth. Your party is fully restored. (-15g)');
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
    this.pendingBuyId = null;
    const state = Registry.get();
    this.shopStock = shopStockForParty(state.party.map((p) => p.classId as ClassId));
    this.showShopList();
  }

  private showShopList(): void {
    this.overlay.removeAll(true);
    this.overlay.setVisible(true);
    this.menu?.destroy();

    const panel = this.add.rectangle(400, 270, 480, 380, 0x111820, 0.96).setStrokeStyle(2, 0xc2a35a);
    const title = this.add.text(200, 100, 'General Store — gear for your party', {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.color.cream,
    });
    const gold = this.add.text(200, 122, `Gold: ${Registry.get().gold}`, {
      fontFamily: UI.font,
      fontSize: UI.small,
      color: UI.color.accent,
    });
    this.overlay.add([panel, title, gold]);

    this.menu = new TextMenu(
      this,
      210,
      148,
      [
        ...this.shopStock.map((id) => {
          const item = ITEMS[id];
          const who =
            item.classes && item.classes.length
              ? ` [${item.classes.map((c) => c.slice(0, 3)).join('/')}]`
              : '';
          return { label: `${item.name} — ${item.price}g${who}` };
        }),
        { label: 'Leave' },
      ],
      (index) => {
        if (index >= this.shopStock.length) {
          this.closeOverlay();
          return;
        }
        this.chooseBuyer(this.shopStock[index]);
      },
    );
  }

  private chooseBuyer(itemId: string): void {
    const item = ITEMS[itemId];
    const state = Registry.get();
    if (state.gold < item.price) {
      this.showDialog(`Not enough gold for ${item.name}.`);
      this.closeOverlay();
      return;
    }

    let candidates = state.party;
    if (item.kind === 'weapon' || item.kind === 'armor') {
      candidates = state.party.filter((h) => canEquip(itemId, h.classId));
      if (!candidates.length) {
        this.showDialog(`No one in your party can use ${item.name}.`);
        this.closeOverlay();
        return;
      }
    }

    this.pendingBuyId = itemId;
    this.overlay.removeAll(true);
    this.menu?.destroy();

    const panel = this.add.rectangle(400, 250, 420, 280, 0x111820, 0.96).setStrokeStyle(2, 0xc2a35a);
    const title = this.add.text(230, 130, `Give ${item.name} to…`, {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.color.cream,
    });
    this.overlay.add([panel, title]);

    this.menu = new TextMenu(
      this,
      240,
      170,
      [...candidates.map((h) => ({ label: h.name })), { label: 'Back' }],
      (index) => {
        if (index >= candidates.length) {
          this.showShopList();
          return;
        }
        this.buyFor(candidates[index]);
      },
    );
  }

  private buyFor(hero: Combatant): void {
    const state = Registry.get();
    const itemId = this.pendingBuyId!;
    const item = ITEMS[itemId];
    if (state.gold < item.price) {
      this.showDialog(`Not enough gold for ${item.name}.`);
      this.closeOverlay();
      return;
    }

    state.gold -= item.price;
    addItem(hero.inventory, itemId, 1);

    let note = `Bought ${item.name} for ${hero.name}.`;
    if (item.kind === 'weapon' || item.kind === 'armor') {
      // Auto-equip if that slot is empty
      const slot = item.kind === 'weapon' ? 'weapon' : 'armor';
      if (!hero.equipment[slot]) {
        note = equipItem(hero, itemId);
      } else {
        note += ' (in bag — equip from Menu → Inventory)';
      }
    }

    saveGame(state);
    this.refreshHud();
    this.closeOverlay();
    this.showDialog(note);
  }

  private openGameMenu(): void {
    if (this.mode !== 'explore') return;
    this.mode = 'menu';
    this.overlay.removeAll(true);
    this.overlay.setVisible(true);
    this.menu?.destroy();

    const panel = this.add.rectangle(400, 250, 380, 260, 0x111820, 0.96).setStrokeStyle(2, 0x8a93a8);
    const title = this.add.text(250, 140, 'Party Menu', {
      fontFamily: UI.font,
      fontSize: '16px',
      color: UI.color.cream,
    });
    this.overlay.add([panel, title]);

    this.menu = new TextMenu(
      this,
      260,
      180,
      [{ label: 'Inventory' }, { label: 'Status' }, { label: 'Save Game' }, { label: 'Close' }],
      (_i, item) => {
        if (item.label === 'Inventory') this.openInventoryPicker();
        else if (item.label === 'Status') {
          const s = Registry.get();
          const lines = s.party
            .map(
              (h) =>
                `${h.name} Lv${h.level}  HP ${h.currentHp}/${h.stats.hp}  MP ${h.currentMp}/${h.stats.mp}`,
            )
            .join('\n');
          this.closeOverlay();
          this.showDialog(lines);
        } else if (item.label === 'Save Game') {
          saveGame(Registry.get());
          this.closeOverlay();
          this.showDialog('Game saved.');
        } else {
          this.closeOverlay();
        }
      },
    );
  }

  private openInventoryPicker(): void {
    const party = Registry.get().party;
    this.overlay.removeAll(true);
    this.menu?.destroy();
    const panel = this.add.rectangle(400, 250, 400, 280, 0x111820, 0.96).setStrokeStyle(2, 0x8a93a8);
    const title = this.add.text(240, 130, 'Whose inventory?', {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.color.cream,
    });
    this.overlay.add([panel, title]);

    this.menu = new TextMenu(
      this,
      250,
      170,
      [...party.map((h) => ({ label: h.name })), { label: 'Back' }],
      (index) => {
        if (index >= party.length) {
          this.openGameMenu();
          return;
        }
        this.invHeroIndex = index;
        this.openHeroInventory();
      },
    );
  }

  private openHeroInventory(): void {
    const hero = Registry.get().party[this.invHeroIndex];
    hero.inventory = pruneEmpty(hero.inventory);
    this.overlay.removeAll(true);
    this.menu?.destroy();

    const panel = this.add.rectangle(400, 270, 500, 360, 0x111820, 0.96).setStrokeStyle(2, 0x8a93a8);
    const title = this.add.text(180, 110, `${hero.name}'s Inventory`, {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.color.cream,
    });
    const summary = this.add.text(180, 132, formatBag(hero), {
      fontFamily: UI.font,
      fontSize: UI.tiny,
      color: UI.color.body,
      lineSpacing: 2,
    });
    this.overlay.add([panel, title, summary]);

    const equipables = hero.inventory.filter((i) => {
      const def = ITEMS[i.id];
      return def && (def.kind === 'weapon' || def.kind === 'armor') && canEquip(i.id, hero.classId);
    });

    this.menu = new TextMenu(
      this,
      190,
      220,
      [
        ...equipables.map((i) => ({ label: `Equip ${ITEMS[i.id].name}` })),
        { label: 'Back' },
      ],
      (index) => {
        if (index >= equipables.length) {
          this.openInventoryPicker();
          return;
        }
        const msg = equipItem(hero, equipables[index].id);
        saveGame(Registry.get());
        this.closeOverlay();
        this.showDialog(msg);
      },
    );
  }

  private closeOverlay(): void {
    this.menu?.destroy();
    this.menu = null;
    this.overlay.removeAll(true);
    this.overlay.setVisible(false);
    this.pendingBuyId = null;
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
