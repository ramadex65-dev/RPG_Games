import Phaser from 'phaser';
import { classTextureKey } from '../assets/characters';
import { TOWN_NPCS } from '../assets/npcs';
import { getClass } from '../data/classes';
import { canEquip, ITEMS, shopStockForParty } from '../data/items';
import { activeQuestText } from '../data/quests';
import type { ClassId, Combatant } from '../data/types';
import { Audio } from '../systems/audio';
import {
  addItem,
  equipItem,
  equipPreview,
  pruneEmpty,
  removeItem,
  shopBonusBits,
  shopItemRows,
  unequipSlot,
} from '../systems/inventory';
import { bindSceneKeys } from '../systems/keys';
import { isSellable, sellPrice } from '../systems/loot';
import { missingClassIds, recruitClass, swapWithReserve } from '../systems/party';
import { Registry } from '../systems/registry';
import { saveGame } from '../systems/save';
import { generateFloor } from '../world/generate';
import { isBlocked, mapPixelSize, TILE, tileColor, TOWN_MAP } from '../world/maps';
import { InventoryScreen } from '../ui/InventoryScreen';
import { TextMenu } from '../ui/menu';
import { QuestLog } from '../ui/QuestLog';
import { UI } from '../ui/theme';

type Mode = 'explore' | 'dialog' | 'shop' | 'menu' | 'inventory';

export class TownScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private tx = 11;
  private ty = 8;
  private mode: Mode = 'explore';
  private dialogText!: Phaser.GameObjects.Text;
  private hud!: Phaser.GameObjects.Text;
  private districtText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private menu: TextMenu | null = null;
  private inventoryUi: InventoryScreen | null = null;
  private shopDetail: Phaser.GameObjects.Text | null = null;
  private questLog!: QuestLog;
  private moveCooldown = 0;
  private shopStock: string[] = [];
  private pendingBuyId: string | null = null;
  /** Brief status shown inside the shop after buy/sell (store stays open). */
  private shopNotice: string | null = null;
  private dialogQueue: string[] = [];
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
    Audio.unlock();
    Audio.playMusic('town');

    const state = Registry.get();
    this.tx = state.location === 'town' ? state.playerX : 11;
    this.ty = state.location === 'town' ? state.playerY : 8;
    // Clamp legacy saves into new map
    this.tx = Phaser.Math.Clamp(this.tx, 1, TOWN_MAP[0].length - 2);
    this.ty = Phaser.Math.Clamp(this.ty, 1, TOWN_MAP.length - 2);
    state.location = 'town';
    state.playerX = this.tx;
    state.playerY = this.ty;

    const { w, h } = mapPixelSize(TOWN_MAP);
    this.cameras.main.setBounds(0, 0, w, h);
    this.add.rectangle(w / 2, h / 2, w, h, 0x1b2a1f);

    for (let y = 0; y < TOWN_MAP.length; y++) {
      for (let x = 0; x < TOWN_MAP[0].length; x++) {
        const tile = TOWN_MAP[y][x];
        this.add.rectangle(
          x * TILE + TILE / 2,
          y * TILE + TILE / 2,
          TILE - 2,
          TILE - 2,
          tileColor(tile, true),
        );
      }
    }

    // District labels
    this.add
      .text(9 * TILE, 1 * TILE + 8, 'MARKET DISTRICT', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: '#e8d5a0',
      })
      .setOrigin(0.5, 0)
      .setDepth(2);
    this.add
      .text(17 * TILE, 1 * TILE + 8, 'TEMPLE GREEN', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: '#c8e8c0',
      })
      .setOrigin(0.5, 0)
      .setDepth(2);
    this.add
      .text(12 * TILE, 13 * TILE, 'CAVE ROAD', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: '#c8c0d8',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.add.image(9 * TILE + TILE / 2, 2 * TILE + TILE / 2, 'building_store').setDisplaySize(92, 76).setDepth(2);
    this.add.image(16 * TILE + TILE / 2, 2 * TILE + TILE / 2, 'building_inn').setDisplaySize(92, 76).setDepth(2);
    this.add.image(12 * TILE + TILE / 2, 13 * TILE + TILE / 2, 'building_cave').setDisplaySize(100, 82).setDepth(2);
    // Ruins marker (southeast)
    this.add.rectangle(20 * TILE + TILE / 2, 14 * TILE + TILE / 2, 36, 28, 0x4a4a62).setDepth(2);
    this.add
      .text(20 * TILE + TILE / 2, 14 * TILE + TILE / 2, 'RUINS', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: '#c8c8e8',
      })
      .setOrigin(0.5)
      .setDepth(3);

    this.add.rectangle(9 * TILE + TILE / 2, 3 * TILE + TILE / 2 + 8, 20, 10, 0x5a3420).setDepth(1);
    this.add.rectangle(16 * TILE + TILE / 2, 3 * TILE + TILE / 2 + 8, 20, 10, 0x5a2e1a).setDepth(1);

    for (const npc of TOWN_NPCS) {
      this.add
        .image(npc.x * TILE + TILE / 2, npc.y * TILE + TILE / 2, npc.texture)
        .setDisplaySize(26, 34)
        .setDepth(4);
      this.add
        .text(npc.x * TILE + TILE / 2, npc.y * TILE + TILE / 2 + 20, npc.name.split(' ').pop()!, {
          fontFamily: UI.font,
          fontSize: '9px',
          color: '#f5f0e4',
          backgroundColor: '#00000066',
          padding: { x: 2, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(4);
    }

    const lead = Registry.get().party[0];
    const leadKey = lead?.classId ? classTextureKey(lead.classId as ClassId) : 'char_adventurer';
    this.player = this.add
      .image(this.tx * TILE + TILE / 2, this.ty * TILE + TILE / 2, leadKey)
      .setDisplaySize(28, 36)
      .setDepth(5);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

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

    this.districtText = this.add
      .text(this.scale.width - 12, 8, '', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.accent,
        backgroundColor: '#00000088',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(40);

    this.questLog = new QuestLog(this, 12, 34);

    this.dialogText = this.add
      .text(40, this.scale.height - 90, '', {
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

    this.overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(60).setVisible(false);

    this.add
      .text(12, this.scale.height - 22, 'WASD move  •  E talk/enter  •  I inventory  •  M menu  •  N mute', {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: UI.color.muted,
        backgroundColor: '#00000066',
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(40);

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
    bindSceneKeys(this, {
      'keydown-E': () => this.interact(),
      'keydown-ENTER': () => {
        if (this.mode === 'dialog') this.advanceDialog();
        else if (this.mode === 'shop' || this.mode === 'menu') this.menu?.confirm();
      },
      'keydown-SPACE': () => {
        if (this.mode === 'dialog') this.advanceDialog();
        else if (this.mode === 'shop' || this.mode === 'menu') this.menu?.confirm();
      },
      'keydown-ESC': () => {
        if (this.mode === 'inventory') {
          this.inventoryUi?.close();
          return;
        }
        Audio.sfx('cancel');
        this.closeOverlay();
      },
      'keydown-I': () => this.toggleInventory(),
      'keydown-M': () => this.openGameMenu(),
      'keydown-N': () => {
        const muted = Audio.toggleMute();
        this.showDialog(muted ? 'Audio muted.' : 'Audio on.');
      },
      'keydown-UP': () => this.menu?.move(-1),
      'keydown-DOWN': () => this.menu?.move(1),
    });
  }

  private toggleInventory(): void {
    if (this.mode === 'inventory') {
      this.inventoryUi?.close();
      return;
    }
    if (this.mode !== 'explore') return;
    Audio.sfx('confirm');
    this.mode = 'inventory';
    this.inventoryUi = new InventoryScreen(this, () => {
      this.inventoryUi = null;
      this.mode = 'explore';
      this.refreshHud();
    });
  }

  private tryMove(dx: number, dy: number): void {
    const nx = this.tx + dx;
    const ny = this.ty + dy;
    if (isBlocked(TOWN_MAP, nx, ny)) return;
    if (TOWN_NPCS.some((n) => n.x === nx && n.y === ny)) return;
    this.tx = nx;
    this.ty = ny;
    this.player.setPosition(this.tx * TILE + TILE / 2, this.ty * TILE + TILE / 2);
    this.moveCooldown = 130;
    Audio.sfx('step');
    const state = Registry.get();
    state.playerX = this.tx;
    state.playerY = this.ty;
    this.refreshHud();
  }

  private interact(): void {
    if (this.mode !== 'explore') return;
    const npc = TOWN_NPCS.find(
      (n) =>
        (Math.abs(n.x - this.tx) === 1 && n.y === this.ty) ||
        (Math.abs(n.y - this.ty) === 1 && n.x === this.tx) ||
        (n.x === this.tx && n.y === this.ty),
    );
    if (npc) {
      Audio.sfx('confirm');
      this.startDialog(npc.dialog);
      return;
    }

    const tile = TOWN_MAP[this.ty][this.tx];
    const above = this.ty > 0 ? TOWN_MAP[this.ty - 1][this.tx] : 0;
    if (tile === 3 || above === 3) this.openShop();
    else if (tile === 4 || above === 4) this.useInn();
    else if (tile === 5 || above === 5) this.enterDungeon();
    else if (tile === 10 || above === 10) this.enterRuins();
    else this.startDialog(['The wind carries a faint hum from the southern cave and eastern ruins.']);
  }

  private startDialog(lines: string[]): void {
    this.dialogQueue = [...lines];
    this.mode = 'dialog';
    this.advanceDialog();
  }

  private advanceDialog(): void {
    if (!this.dialogQueue.length) {
      this.dialogText.setVisible(false);
      this.mode = 'explore';
      return;
    }
    const line = this.dialogQueue.shift()!;
    this.dialogText
      .setText(line + (this.dialogQueue.length ? '\n\n[Enter] next' : '\n\n[Enter] close'))
      .setVisible(true);
  }

  private showDialog(text: string): void {
    this.startDialog([text]);
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
    Audio.sfx('heal');
    saveGame(state);
    this.refreshHud();
    this.showDialog('Innkeeper: Rest well by the hearth. Your party is fully restored. (-15g)');
  }

  private partyLevel(): number {
    const party = Registry.get().party;
    if (!party.length) return 1;
    return Math.max(1, Math.round(party.reduce((s, h) => s + h.level, 0) / party.length));
  }

  private enterDungeon(): void {
    const state = Registry.get();
    state.location = 'dungeon';
    state.flags.entered_cave = true;
    // Fresh layout + loot every time you enter from town.
    state.caveFloor = generateFloor('dungeon', this.partyLevel());
    state.playerX = state.caveFloor.entrance.x;
    state.playerY = state.caveFloor.entrance.y;
    saveGame(state);
    Audio.playMusic('dungeon');
    this.scene.start('Dungeon');
  }

  private enterRuins(): void {
    const state = Registry.get();
    state.location = 'ruins';
    state.ruinsFloor = generateFloor('ruins', this.partyLevel());
    state.playerX = state.ruinsFloor.entrance.x;
    state.playerY = state.ruinsFloor.entrance.y;
    saveGame(state);
    Audio.playMusic('dungeon');
    this.scene.start('Ruins');
  }

  private openShop(): void {
    Audio.sfx('confirm');
    this.mode = 'shop';
    this.pendingBuyId = null;
    this.shopNotice = null;
    this.showShopHub();
  }

  /** Keep shopping — show a status line on the next shop screen. */
  private shopStay(notice: string, screen: 'hub' | 'buy' | 'sell'): void {
    this.shopNotice = notice;
    this.refreshHud();
    if (screen === 'buy') this.showShopList();
    else if (screen === 'sell') this.showSellList();
    else this.showShopHub();
  }

  private drawShopNotice(y = 102): void {
    if (!this.shopNotice) return;
    const notice = this.add
      .text(400, y, this.shopNotice, {
        fontFamily: UI.font,
        fontSize: UI.tiny,
        color: '#9dce8a',
        backgroundColor: '#0a1810aa',
        padding: { x: 8, y: 3 },
        wordWrap: { width: 640 },
        align: 'center',
      })
      .setOrigin(0.5);
    this.overlay.add(notice);
    this.shopNotice = null;
  }

  private showShopHub(): void {
    this.overlay.removeAll(true);
    this.overlay.setVisible(true);
    this.menu?.destroy();
    const panel = this.add
      .rectangle(400, 280, 420, 260, 0x0e141c, 0.98)
      .setStrokeStyle(2, 0xc2a35a);
    const title = this.add
      .text(400, 180, 'GENERAL STORE', {
        fontFamily: UI.font,
        fontSize: '18px',
        color: UI.color.cream,
      })
      .setOrigin(0.5);
    const gold = this.add
      .text(400, 208, `Your gold: ${Registry.get().gold}g`, {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: UI.color.accent,
      })
      .setOrigin(0.5);
    this.overlay.add([panel, title, gold]);
    this.drawShopNotice(230);
    this.menu = new TextMenu(
      this,
      220,
      250,
      [
        { label: 'Buy', detail: 'Gear and supplies for your party' },
        { label: 'Sell', detail: 'Trade loot and spare items for gold' },
        { label: 'Leave', detail: 'Return to town' },
      ],
      (_i, item) => {
        if (item.label === 'Buy') {
          const state = Registry.get();
          this.shopStock = shopStockForParty(
            state.party.map((p) => p.classId as ClassId),
            this.partyLevel(),
          );
          this.showShopList();
        } else if (item.label === 'Sell') this.showSellList();
        else this.closeOverlay();
      },
      {
        rows: true,
        rowWidth: 320,
        lineHeight: 44,
        container: this.overlay,
        style: { fontFamily: UI.font, fontSize: '14px', color: UI.color.body },
      },
    );
  }

  private showShopList(): void {
    this.overlay.removeAll(true);
    this.overlay.setVisible(true);
    this.menu?.destroy();

    const panel = this.add
      .rectangle(400, 300, 700, 500, 0x0e141c, 0.98)
      .setStrokeStyle(2, 0xc2a35a);
    const headerBar = this.add.rectangle(400, 70, 700, 48, 0x1a2838, 1);
    const lvl = this.partyLevel();
    const tier = lvl >= 5 ? 3 : lvl >= 3 ? 2 : 1;
    const title = this.add
      .text(400, 62, 'GENERAL STORE', {
        fontFamily: UI.font,
        fontSize: '18px',
        color: UI.color.cream,
      })
      .setOrigin(0.5);
    const gold = this.add
      .text(
        400,
        84,
        `Gold: ${Registry.get().gold}g   ·   Party Lv ${lvl}  ·  Gear tier ${tier} (better at Lv3 / Lv5)`,
        {
          fontFamily: UI.font,
          fontSize: UI.tiny,
          color: UI.color.accent,
        },
      )
      .setOrigin(0.5);

    const listBg = this.add
      .rectangle(230, 320, 340, 400, 0x121a26, 1)
      .setStrokeStyle(1, 0x3a4558);
    const detailBg = this.add
      .rectangle(560, 300, 280, 360, 0x162030, 1)
      .setStrokeStyle(1, 0x5a6480);
    const detailTitle = this.add.text(430, 130, 'ITEM DETAILS', {
      fontFamily: UI.font,
      fontSize: UI.tiny,
      color: UI.color.accent,
    });
    this.shopDetail = this.add.text(430, 155, 'Hover or select an item.', {
      fontFamily: UI.font,
      fontSize: UI.body,
      color: UI.color.body,
      wordWrap: { width: 250 },
      lineSpacing: 5,
    });

    this.overlay.add([panel, headerBar, title, gold, listBg, detailBg, detailTitle, this.shopDetail]);
    this.drawShopNotice(102);

    const party = Registry.get().party;
    const rows = this.shopStock.map((id) => {
      const r = shopItemRows(id);
      const wornBy = party
        .filter((h) => h.equipment.weapon === id || h.equipment.armor === id)
        .map((h) => h.name);
      return {
        label: wornBy.length ? `${r.label}  ◆ equipped` : r.label,
        detail: wornBy.length ? `Equipped: ${wornBy.join(', ')}` : r.detail,
      };
    });

    this.menu = new TextMenu(
      this,
      70,
      130,
      [...rows, { label: 'Back', detail: 'Return to Buy / Sell' }],
      (index) => {
        if (index >= this.shopStock.length) {
          this.showShopHub();
          return;
        }
        this.chooseBuyer(this.shopStock[index]);
      },
      {
        rows: true,
        rowWidth: 320,
        lineHeight: 42,
        maxVisible: 8,
        container: this.overlay,
        style: {
          fontFamily: UI.font,
          fontSize: '13px',
          color: UI.color.body,
        },
        onHighlight: (index) => this.refreshShopDetail(index),
      },
    );
    this.refreshShopDetail(0);
  }

  private collectSellables(): {
    ownerIndex: number;
    itemId: string;
    qty: number;
    equipped: boolean;
    slot?: 'weapon' | 'armor';
    label: string;
  }[] {
    const party = Registry.get().party;
    const out: {
      ownerIndex: number;
      itemId: string;
      qty: number;
      equipped: boolean;
      slot?: 'weapon' | 'armor';
      label: string;
    }[] = [];
    party.forEach((h, ownerIndex) => {
      for (const slot of ['weapon', 'armor'] as const) {
        const id = h.equipment[slot];
        if (!id || !isSellable(id)) continue;
        const def = ITEMS[id];
        if (!def) continue;
        out.push({
          ownerIndex,
          itemId: id,
          qty: 1,
          equipped: true,
          slot,
          label: `◆ ${def.name}  [Equipped · ${h.name}] — ${sellPrice(id)}g`,
        });
      }

      h.inventory = pruneEmpty(h.inventory);
      for (const stack of h.inventory) {
        if (!isSellable(stack.id) || stack.qty <= 0) continue;
        const def = ITEMS[stack.id];
        if (!def) continue;
        out.push({
          ownerIndex,
          itemId: stack.id,
          qty: stack.qty,
          equipped: false,
          label: `${def.name} x${stack.qty} (${h.name}) — ${sellPrice(stack.id)}g`,
        });
      }
    });
    return out;
  }

  private showSellList(): void {
    this.overlay.removeAll(true);
    this.menu?.destroy();
    const sellables = this.collectSellables();
    const panel = this.add
      .rectangle(400, 300, 640, 460, 0x0e141c, 0.98)
      .setStrokeStyle(2, 0xc2a35a);
    const title = this.add
      .text(400, 90, 'SELL LOOT', {
        fontFamily: UI.font,
        fontSize: '18px',
        color: UI.color.cream,
      })
      .setOrigin(0.5);
    const hint = this.add
      .text(
        400,
        118,
        `Merchant buys at half price.  ◆ = equipped.  Gold: ${Registry.get().gold}g`,
        {
          fontFamily: UI.font,
          fontSize: UI.tiny,
          color: UI.color.accent,
        },
      )
      .setOrigin(0.5);
    this.overlay.add([panel, title, hint]);
    this.drawShopNotice(138);

    if (!sellables.length) {
      this.menu = new TextMenu(
        this,
        240,
        200,
        [{ label: 'Nothing to sell', detail: 'Find treasure in the cave or ruins' }, { label: 'Back' }],
        () => this.showShopHub(),
        { rows: true, rowWidth: 320, lineHeight: 42, container: this.overlay },
      );
      return;
    }

    this.menu = new TextMenu(
      this,
      100,
      160,
      [
        ...sellables.map((s) => ({
          label: s.label,
          detail: s.equipped
            ? `EQUIPPED — confirm to unequip & sell for ${sellPrice(s.itemId)}g`
            : `Sell one for ${sellPrice(s.itemId)}g`,
        })),
        { label: 'Back', detail: 'Return to counter' },
      ],
      (index) => {
        if (index >= sellables.length) {
          this.showShopHub();
          return;
        }
        const entry = sellables[index];
        if (entry.equipped) {
          this.confirmSellEquipped(entry);
          return;
        }
        this.sellBagItem(entry);
      },
      {
        rows: true,
        rowWidth: 560,
        lineHeight: 40,
        maxVisible: 8,
        container: this.overlay,
        style: { fontFamily: UI.font, fontSize: '13px', color: UI.color.body },
      },
    );
  }

  private sellBagItem(entry: { ownerIndex: number; itemId: string }): void {
    const state = Registry.get();
    const hero = state.party[entry.ownerIndex];
    if (!hero || !removeItem(hero.inventory, entry.itemId, 1)) {
      this.shopStay('That item is gone.', 'sell');
      return;
    }
    hero.inventory = pruneEmpty(hero.inventory);
    const payout = sellPrice(entry.itemId);
    state.gold += payout;
    saveGame(state);
    this.shopStay(`Sold ${ITEMS[entry.itemId]?.name ?? 'item'} for ${payout}g.`, 'sell');
  }

  private confirmSellEquipped(entry: {
    ownerIndex: number;
    itemId: string;
    slot?: 'weapon' | 'armor';
  }): void {
    const state = Registry.get();
    const hero = state.party[entry.ownerIndex];
    const def = ITEMS[entry.itemId];
    const slot = entry.slot;
    if (!hero || !def || !slot || hero.equipment[slot] !== entry.itemId) {
      this.shopStay('That gear is no longer equipped.', 'sell');
      return;
    }
    const payout = sellPrice(entry.itemId);

    this.overlay.removeAll(true);
    this.menu?.destroy();
    const panel = this.add
      .rectangle(400, 300, 560, 300, 0x0e141c, 0.98)
      .setStrokeStyle(2, 0xc2a35a);
    const title = this.add
      .text(400, 160, 'Sell equipped gear?', {
        fontFamily: UI.font,
        fontSize: '18px',
        color: UI.color.cream,
      })
      .setOrigin(0.5);
    const body = this.add
      .text(
        400,
        200,
        `${hero.name} is wearing ${def.name}.\nUnequip and sell it for ${payout}g?`,
        {
          fontFamily: UI.font,
          fontSize: UI.small,
          color: UI.color.muted,
          align: 'center',
          wordWrap: { width: 480 },
        },
      )
      .setOrigin(0.5, 0);
    this.overlay.add([panel, title, body]);

    this.menu = new TextMenu(
      this,
      180,
      270,
      [
        { label: `Yes — sell ${def.name}`, detail: `Unequip from ${hero.name}, gain ${payout}g` },
        { label: 'No — keep it', detail: 'Return to sell list' },
      ],
      (index) => {
        if (index === 1) {
          this.showSellList();
          return;
        }
        const live = Registry.get();
        const h = live.party[entry.ownerIndex];
        if (!h || h.equipment[slot] !== entry.itemId) {
          this.shopStay('That gear is no longer equipped.', 'sell');
          return;
        }
        unequipSlot(h, slot);
        live.gold += payout;
        saveGame(live);
        this.shopStay(`Sold ${def.name} (unequipped from ${h.name}) for ${payout}g.`, 'sell');
      },
      {
        rows: true,
        rowWidth: 400,
        lineHeight: 44,
        container: this.overlay,
        style: { fontFamily: UI.font, fontSize: '13px', color: UI.color.body },
      },
    );
  }

  private refreshShopDetail(index: number): void {
    if (!this.shopDetail) return;
    if (index >= this.shopStock.length) {
      this.shopDetail.setText('Back to the store counter.');
      return;
    }
    const id = this.shopStock[index];
    const item = ITEMS[id];
    if (!item) return;
    const who =
      item.classes && item.classes.length
        ? item.classes.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')
        : 'Anyone';
    const bits = shopBonusBits(id);
    const party = Registry.get().party;
    const fit = party.filter((h) => canEquip(id, h.classId)).map((h) => h.name);
    const wornBy = party
      .filter((h) => h.equipment.weapon === id || h.equipment.armor === id)
      .map((h) => h.name);
    const fitLine =
      item.kind === 'weapon' || item.kind === 'armor'
        ? fit.length
          ? `Fits: ${fit.join(', ')}`
          : 'No one in party can use this.'
        : 'Goes into a bag (battle use).';
    this.shopDetail.setText(
      [
        item.name,
        `${item.price} gold`,
        '',
        item.description,
        bits ? `Bonuses: ${bits}` : '',
        `Classes: ${who}`,
        '',
        fitLine,
        wornBy.length ? `◆ Equipped by: ${wornBy.join(', ')}` : '',
        '',
        'Click / Enter to buy',
      ]
        .filter((l) => l !== undefined && l !== '')
        .join('\n'),
    );
  }

  private chooseBuyer(itemId: string): void {
    const item = ITEMS[itemId];
    const state = Registry.get();
    if (state.gold < item.price) {
      this.shopStay(`Not enough gold for ${item.name}.`, 'buy');
      return;
    }

    let candidates = state.party;
    if (item.kind === 'weapon' || item.kind === 'armor') {
      candidates = state.party.filter((h) => canEquip(itemId, h.classId));
      if (!candidates.length) {
        this.shopStay(`No one in your party can use ${item.name}.`, 'buy');
        return;
      }
    }

    this.pendingBuyId = itemId;
    this.overlay.removeAll(true);
    this.menu?.destroy();

    const panel = this.add
      .rectangle(400, 300, 620, 420, 0x0e141c, 0.98)
      .setStrokeStyle(2, 0xc2a35a);
    const title = this.add
      .text(400, 110, `Buy ${item.name}`, {
        fontFamily: UI.font,
        fontSize: '18px',
        color: UI.color.cream,
      })
      .setOrigin(0.5);
    const preview = this.add
      .text(400, 140, `${item.description}\nClick a character to give the item.`, {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: UI.color.muted,
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5, 0);
    this.overlay.add([panel, title, preview]);

    this.menu = new TextMenu(
      this,
      140,
      190,
      [
        ...candidates.map((h) => {
          const already =
            (item.kind === 'weapon' && h.equipment.weapon === itemId) ||
            (item.kind === 'armor' && h.equipment.armor === itemId);
          const cmp =
            item.kind === 'weapon' || item.kind === 'armor'
              ? already
                ? `◆ Already equipped`
                : equipPreview(h, itemId)
              : 'Goes in bag';
          return {
            label: already ? `${h.name}  ◆ equipped` : h.name,
            detail: cmp,
          };
        }),
        { label: 'Back', detail: 'Return to stock list' },
      ],
      (index) => {
        if (index >= candidates.length) {
          this.showShopList();
          return;
        }
        this.buyFor(candidates[index]);
      },
      {
        rows: true,
        rowWidth: 520,
        lineHeight: 48,
        container: this.overlay,
        style: { fontFamily: UI.font, fontSize: '14px', color: UI.color.body },
      },
    );
  }

  private buyFor(hero: Combatant): void {
    const state = Registry.get();
    const itemId = this.pendingBuyId!;
    const item = ITEMS[itemId];
    if (!item) return;
    if (state.gold < item.price) {
      this.shopStay(`Not enough gold for ${item.name}.`, 'buy');
      return;
    }

    if (item.kind === 'weapon' || item.kind === 'armor') {
      const slot = item.kind === 'weapon' ? 'weapon' : 'armor';
      const equipped = hero.equipment[slot];
      if (equipped && equipped !== itemId) {
        this.showEquipReplacePrompt(hero, itemId, equipped);
        return;
      }
    }

    this.completePurchase(hero, itemId, 'auto');
  }

  /** Ask whether to sell the worn gear when buying a replacement. */
  private showEquipReplacePrompt(hero: Combatant, newId: string, oldId: string): void {
    const neu = ITEMS[newId];
    const old = ITEMS[oldId];
    if (!neu || !old) {
      this.completePurchase(hero, newId, 'auto');
      return;
    }
    const payout = sellPrice(oldId);

    this.overlay.removeAll(true);
    this.menu?.destroy();
    const panel = this.add
      .rectangle(400, 300, 620, 360, 0x0e141c, 0.98)
      .setStrokeStyle(2, 0xc2a35a);
    const title = this.add
      .text(400, 130, `${hero.name} already wears ${old.name}`, {
        fontFamily: UI.font,
        fontSize: '16px',
        color: UI.color.cream,
      })
      .setOrigin(0.5);
    const body = this.add
      .text(
        400,
        165,
        `Buying ${neu.name} (${neu.price}g).\nSell the equipped ${old.name} for ${payout}g when you equip the new piece?`,
        {
          fontFamily: UI.font,
          fontSize: UI.small,
          color: UI.color.muted,
          align: 'center',
          wordWrap: { width: 540 },
        },
      )
      .setOrigin(0.5, 0);
    this.overlay.add([panel, title, body]);

    this.menu = new TextMenu(
      this,
      140,
      230,
      [
        {
          label: `Equip & sell ${old.name}`,
          detail: `Wear ${neu.name}, merchant pays ${payout}g for ${old.name}`,
        },
        {
          label: `Equip & keep ${old.name}`,
          detail: `${old.name} goes into ${hero.name}'s bag`,
        },
        {
          label: `Bag only — keep wearing ${old.name}`,
          detail: `${neu.name} goes in the bag; equip later with I`,
        },
        { label: 'Back', detail: 'Pick a different character' },
      ],
      (index) => {
        if (index === 0) this.completePurchase(hero, newId, 'equip-sell');
        else if (index === 1) this.completePurchase(hero, newId, 'equip-keep');
        else if (index === 2) this.completePurchase(hero, newId, 'bag');
        else this.chooseBuyer(newId);
      },
      {
        rows: true,
        rowWidth: 520,
        lineHeight: 44,
        container: this.overlay,
        style: { fontFamily: UI.font, fontSize: '13px', color: UI.color.body },
      },
    );
  }

  private completePurchase(
    hero: Combatant,
    itemId: string,
    mode: 'auto' | 'equip-sell' | 'equip-keep' | 'bag',
  ): void {
    const state = Registry.get();
    const item = ITEMS[itemId];
    if (!item) return;
    if (state.gold < item.price) {
      this.shopStay(`Not enough gold for ${item.name}.`, 'buy');
      return;
    }

    state.gold -= item.price;
    addItem(hero.inventory, itemId, 1);

    let note = `Bought ${item.name} for ${hero.name}.`;
    if (item.kind === 'weapon' || item.kind === 'armor') {
      const slot = item.kind === 'weapon' ? 'weapon' : 'armor';
      const oldId = hero.equipment[slot];

      if (mode === 'bag') {
        note += ' (in bag — press I to equip)';
      } else if (mode === 'equip-sell' && oldId) {
        const payout = sellPrice(oldId);
        const oldName = ITEMS[oldId]?.name ?? 'item';
        note = equipItem(hero, itemId);
        if (removeItem(hero.inventory, oldId, 1)) {
          hero.inventory = pruneEmpty(hero.inventory);
          state.gold += payout;
          note += ` Sold ${oldName} for ${payout}g.`;
        }
      } else if (mode === 'equip-keep' || (mode === 'auto' && !oldId)) {
        note = equipItem(hero, itemId);
      } else {
        note += ' (in bag — press I to equip)';
      }
    }

    this.pendingBuyId = null;
    saveGame(state);
    this.shopStay(`${note}  ·  ${state.gold}g left`, 'buy');
  }

  private openGameMenu(): void {
    if (this.mode !== 'explore') return;
    Audio.sfx('confirm');
    this.mode = 'menu';
    this.overlay.removeAll(true);
    this.overlay.setVisible(true);
    this.menu?.destroy();

    const panel = this.add.rectangle(400, 250, 380, 280, 0x111820, 0.96).setStrokeStyle(2, 0x8a93a8);
    const title = this.add.text(250, 130, 'Party Menu', {
      fontFamily: UI.font,
      fontSize: '16px',
      color: UI.color.cream,
    });
    this.overlay.add([panel, title]);

    this.menu = new TextMenu(
      this,
      260,
      160,
      [
        { label: 'Inventory' },
        { label: 'Formation' },
        { label: 'Recruit' },
        { label: 'Quest Log' },
        { label: 'Status' },
        { label: 'Save Game' },
        { label: 'Close' },
      ],
      (_i, item) => {
        if (item.label === 'Inventory') {
          this.closeOverlay();
          this.toggleInventory();
        } else if (item.label === 'Formation') this.openFormation();
        else if (item.label === 'Recruit') this.openRecruit();
        else if (item.label === 'Quest Log') {
          this.questLog.refresh();
          this.closeOverlay();
          const q = activeQuestText(Registry.get());
          this.showDialog(`${q.title}\n${q.body}`);
        } else if (item.label === 'Status') {
          const s = Registry.get();
          const lines = [
            ...s.party.map(
              (h) =>
                `● ${h.name} Lv${h.level}  HP ${h.currentHp}/${h.stats.hp}  ATK ${h.stats.atk} DEF ${h.stats.def}`,
            ),
            ...(s.reserve.length
              ? ['— Reserve —', ...s.reserve.map((h) => `○ ${h.name} Lv${h.level}`)]
              : []),
          ].join('\n');
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

  private openRecruit(): void {
    const state = Registry.get();
    const missing = missingClassIds(state);
    this.overlay.removeAll(true);
    this.menu?.destroy();
    const panel = this.add.rectangle(400, 260, 460, 300, 0x111820, 0.96).setStrokeStyle(2, 0x8a93a8);
    const title = this.add.text(200, 130, 'Hall of Traditions — Recruit', {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.color.cream,
    });
    const hint = this.add.text(200, 152, 'Unused classes join your reserve.', {
      fontFamily: UI.font,
      fontSize: UI.tiny,
      color: UI.color.muted,
    });
    this.overlay.add([panel, title, hint]);
    if (!missing.length) {
      this.menu = new TextMenu(this, 220, 190, [{ label: 'All seven walk with you.' }, { label: 'Back' }], () =>
        this.openGameMenu(),
      );
      return;
    }
    this.menu = new TextMenu(
      this,
      220,
      190,
      [...missing.map((id) => ({ label: `Recruit ${getClass(id).name}` })), { label: 'Back' }],
      (index) => {
        if (index >= missing.length) {
          this.openGameMenu();
          return;
        }
        const msg = recruitClass(state, missing[index]);
        saveGame(state);
        this.closeOverlay();
        this.showDialog(msg);
      },
    );
  }

  private openFormation(): void {
    const state = Registry.get();
    this.overlay.removeAll(true);
    this.menu?.destroy();
    if (!state.reserve.length) {
      const panel = this.add.rectangle(400, 240, 400, 200, 0x111820, 0.96).setStrokeStyle(2, 0x8a93a8);
      const title = this.add.text(230, 160, 'No reserve members yet. Recruit first.', {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: UI.color.body,
        wordWrap: { width: 340 },
      });
      this.overlay.add([panel, title]);
      this.menu = new TextMenu(this, 260, 220, [{ label: 'Back' }], () => this.openGameMenu());
      return;
    }

    const panel = this.add.rectangle(400, 270, 480, 340, 0x111820, 0.96).setStrokeStyle(2, 0x8a93a8);
    const title = this.add.text(200, 120, 'Swap who leaves the active four:', {
      fontFamily: UI.font,
      fontSize: '14px',
      color: UI.color.cream,
    });
    this.overlay.add([panel, title]);
    this.menu = new TextMenu(
      this,
      220,
      160,
      [...state.party.map((h) => ({ label: `Replace ${h.name}` })), { label: 'Back' }],
      (partyIndex) => {
        if (partyIndex >= state.party.length) {
          this.openGameMenu();
          return;
        }
        this.pickReserveSwap(partyIndex);
      },
    );
  }

  private pickReserveSwap(partyIndex: number): void {
    const state = Registry.get();
    this.overlay.removeAll(true);
    this.menu?.destroy();
    const panel = this.add.rectangle(400, 270, 480, 340, 0x111820, 0.96).setStrokeStyle(2, 0x8a93a8);
    const title = this.add.text(200, 120, `Bring in which reserve for ${state.party[partyIndex].name}?`, {
      fontFamily: UI.font,
      fontSize: '13px',
      color: UI.color.cream,
      wordWrap: { width: 420 },
    });
    this.overlay.add([panel, title]);
    this.menu = new TextMenu(
      this,
      220,
      170,
      [...state.reserve.map((h) => ({ label: h.name })), { label: 'Back' }],
      (reserveIndex) => {
        if (reserveIndex >= state.reserve.length) {
          this.openFormation();
          return;
        }
        const msg = swapWithReserve(state, partyIndex, reserveIndex);
        saveGame(state);
        // Refresh overworld sprite if lead changed
        const lead = state.party[0];
        if (lead?.classId) {
          this.player.setTexture(`char_${lead.classId}`);
        }
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
    if (this.mode !== 'dialog' && this.mode !== 'inventory') this.mode = 'explore';
  }

  private refreshHud(): void {
    const s = Registry.get();
    this.hud.setText(
      `Gold ${s.gold}   ` +
        s.party.map((h) => `${h.name} ${h.currentHp}/${h.stats.hp}`).join('  |  '),
    );
    const tile = TOWN_MAP[this.ty]?.[this.tx] ?? 0;
    let district = 'Village Paths';
    if (this.tx <= 11 || tile === 8) district = 'Market District';
    if (this.tx >= 14 || tile === 9) district = 'Temple Green';
    if (this.ty >= 13) district = 'Cave Road';
    if (tile === 10 || (this.tx >= 18 && this.ty >= 13)) district = 'Ruins Approach';
    this.districtText.setText(district);
    this.questLog.refresh();
  }
}
