import Phaser from 'phaser';
import { classTextureKey, enemyTextureKey } from '../assets/characters';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { SKILLS } from '../data/skills';
import type { ClassId, Combatant } from '../data/types';
import {
  applySkill,
  enemyAi,
  maybeBossPhase,
  strike,
  tickStates,
  type CombatLogLine,
} from '../systems/combat';
import { Audio } from '../systems/audio';
import { addItem, listPartyConsumables, pruneEmpty, removeItem } from '../systems/inventory';
import { battleSlotPosition, formationLabel } from '../systems/formation';
import { bindSceneKeys } from '../systems/keys';
import { grantXp, refreshHeroStats, xpToNext } from '../systems/party';
import { Registry } from '../systems/registry';
import { saveGame } from '../systems/save';
import { CombatLog } from '../ui/CombatLog';
import { BATTLE_MENU, TextMenu } from '../ui/menu';
import { UI } from '../ui/theme';

type Phase = 'command' | 'skill' | 'item' | 'target' | 'animating' | 'xp' | 'won' | 'lost';

interface HpBar {
  bg: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  maxW: number;
}

interface XpRow {
  name: string;
  gained: number;
  xpBefore: number;
  needBefore: number;
  xpAfter: number;
  needAfter: number;
  levelBefore: number;
  levelAfter: number;
  survived: boolean;
}

export class BattleScene extends Phaser.Scene {
  private heroes: Combatant[] = [];
  private enemies: Combatant[] = [];
  private turnOrder: Combatant[] = [];
  private turnIndex = 0;
  private phase: Phase = 'command';
  private menu: TextMenu | null = null;
  private combatLog!: CombatLog;
  private statusText!: Phaser.GameObjects.Text;
  private turnBanner!: Phaser.GameObjects.Text;
  private enemySprites: Phaser.GameObjects.Image[] = [];
  private heroSprites: Phaser.GameObjects.Image[] = [];
  private enemyBars: HpBar[] = [];
  private heroBars: HpBar[] = [];
  private turnGlow!: Phaser.GameObjects.Ellipse;
  private pendingSkill: string | null = null;
  private pendingItem: string | null = null;
  private pendingItemOwner = 0;
  private boss = false;
  private xpOverlay: Phaser.GameObjects.Container | null = null;
  private battleXp = 0;

  constructor() {
    super('Battle');
  }

  create(): void {
    // Scene instances are reused — clear leftover battle UI state.
    this.menu?.destroy();
    this.menu = null;
    this.xpOverlay?.destroy(true);
    this.xpOverlay = null;
    this.enemySprites = [];
    this.heroSprites = [];
    this.enemyBars = [];
    this.heroBars = [];
    this.turnOrder = [];
    this.turnIndex = 0;
    this.phase = 'command';
    this.pendingSkill = null;
    this.pendingItem = null;
    this.pendingItemOwner = 0;
    this.battleXp = 0;

    Audio.unlock();
    const encounter = Registry.consumeEncounter();
    this.boss = encounter?.boss ?? false;
    Audio.playMusic(this.boss ? 'boss' : 'battle');

    const state = Registry.get();
    // Fight with live party references so HP/MP changes persist on flee/return.
    for (const h of state.party) refreshHeroStats(h);
    this.heroes = state.party;

    // Tradition’s Sign — one-shot buff for this battle only.
    const buff = state.nextBattleBuff;
    if (buff) {
      const favored = this.heroes.find((h) => h.id === buff.heroId);
      if (favored) {
        if (buff.stat === 'atk') favored.stats.atk += buff.amount;
        else favored.stats.def += buff.amount;
      }
      state.nextBattleBuff = undefined;
    }

    const ids = encounter?.enemies ?? ['slime'];
    this.enemies = ids.map((id, i) => {
      const def = ENEMIES[id];
      return {
        id: `${id}_${i}`,
        name: def.name,
        isPlayer: false,
        level: def.level,
        xp: 0,
        stats: { ...def.stats },
        currentHp: def.stats.hp,
        currentMp: def.stats.mp,
        skills: [...def.skills],
        states: [],
        color: def.color,
        undead: def.undead,
        weak: def.weak,
        resist: def.resist,
        equipment: {},
        inventory: [],
        phase2: false,
      };
    });

    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x1a1428);
    this.add.rectangle(this.scale.width / 2, 200, this.scale.width, 200, 0x2a2038);

    this.turnGlow = this.add.ellipse(0, 0, 70, 20, 0xffe08a, 0.35).setVisible(false).setDepth(1);

    this.enemies.forEach((e, i) => {
      const x = 160 + i * 120;
      const y = 150;
      const baseId = e.id.replace(/_\d+$/, '');
      const sprite = this.add.image(x, y, enemyTextureKey(baseId)).setScale(this.boss ? 1.35 : 1.15).setDepth(2);
      this.enemySprites.push(sprite);
      this.add
        .text(x, y + 42, e.name, {
          fontFamily: UI.font,
          fontSize: UI.tiny,
          color: '#f0e8d8',
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.enemyBars.push(this.makeBar(x - 22, y + 52, 44, e.color, 1));
    });

    this.heroes.forEach((h) => {
      const { x, y } = battleSlotPosition(h, this.heroes);
      const key = classTextureKey(h.classId as ClassId);
      this.heroSprites.push(this.add.image(x, y, key).setScale(1.05).setDepth(2));
      this.add
        .text(x, y + 38, `${h.name}`, {
          fontFamily: UI.font,
          fontSize: UI.tiny,
          color: UI.color.cream,
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.add
        .text(x, y + 50, formationLabel(h, this.heroes), {
          fontFamily: UI.font,
          fontSize: '9px',
          color: formationLabel(h, this.heroes) === 'Front' ? '#c2a35a' : '#8ab4d4',
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.heroBars.push(this.makeBar(x - 22, y + 60, 44, 0x58c26a, h.currentHp / Math.max(1, h.stats.hp)));
    });

    this.statusText = this.add.text(28, 310, '', {
      fontFamily: UI.font,
      fontSize: UI.small,
      color: UI.color.body,
      lineSpacing: 3,
    });

    this.turnBanner = this.add
      .text(400, 288, '', {
        fontFamily: UI.font,
        fontSize: UI.small,
        color: UI.color.accent,
        backgroundColor: '#00000088',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5, 0);

    this.combatLog = new CombatLog(this, 400, 305, 372, 140);

    this.add.text(28, 14, this.boss ? 'BOSS BATTLE' : 'BATTLE', {
      fontFamily: UI.font,
      fontSize: '16px',
      color: this.boss ? '#d48cff' : UI.color.cream,
    });
    this.add.text(28, 34, 'Front = 2 highest armor  ·  Rest = Back  ·  Melee prefers Front  ·  Magic hits anyone', {
      fontFamily: UI.font,
      fontSize: UI.tiny,
      color: UI.color.muted,
    });

    this.combatLog.clear();
    this.buildTurnOrder();
    this.pushLog({ text: this.boss ? 'The Ley Wraith emerges!' : 'Enemies draw near!' });
    this.pushLog({
      text: 'Formation: the two heaviest armors hold the Front; melee prefers them; spells strike at random.',
      color: '#8ab4d4',
    });
    if (buff) {
      const favored = this.heroes.find((h) => h.id === buff.heroId);
      if (favored) {
        this.pushLog({
          text: `${favored.name} carries a tradition's favor (+${buff.amount} ${buff.stat.toUpperCase()})!`,
          color: '#d48cff',
        });
      }
    }
    this.refreshStatus();
    this.bindKeys();
    this.beginTurn();
  }

  private makeBar(x: number, y: number, w: number, color: number, ratio = 1): HpBar {
    const bg = this.add.rectangle(x, y, w, 5, 0x1a1020).setOrigin(0, 0.5).setDepth(3);
    const fill = this.add.rectangle(x, y, w, 5, color).setOrigin(0, 0.5).setDepth(4);
    const bar = { bg, fill, maxW: w };
    this.setBar(bar, ratio, false);
    return bar;
  }

  private bindKeys(): void {
    bindSceneKeys(this, {
      'keydown-UP': () => this.menu?.move(-1),
      'keydown-DOWN': () => this.menu?.move(1),
      'keydown-W': () => this.menu?.move(-1),
      'keydown-S': () => this.menu?.move(1),
      'keydown-ENTER': () => this.onConfirm(),
      'keydown-SPACE': () => this.onConfirm(),
      'keydown-ESC': () => {
        Audio.sfx('cancel');
        this.onCancel();
      },
      'keydown-PAGE_UP': () => this.combatLog.nudgeScroll(-1),
      'keydown-PAGE_DOWN': () => this.combatLog.nudgeScroll(1),
      'keydown-N': () => {
        Audio.toggleMute();
      },
    });
  }

  private onConfirm(): void {
    if (this.phase === 'xp' || this.phase === 'won') {
      this.xpOverlay?.destroy(true);
      this.xpOverlay = null;
      this.finishWin();
      return;
    }
    if (this.phase === 'lost') {
      this.stripTempStatBuffs();
      saveGame(Registry.get());
      this.scene.start('GameOver');
      return;
    }
    if (this.phase === 'animating') return;
    this.menu?.confirm();
  }

  private onCancel(): void {
    if (this.phase === 'skill' || this.phase === 'item' || this.phase === 'target') {
      this.pendingSkill = null;
      this.pendingItem = null;
      this.showCommandMenu();
    }
  }

  private spriteFor(c: Combatant | null | undefined): Phaser.GameObjects.Image | undefined {
    if (!c) return undefined;
    if (c.isPlayer) {
      const i = this.heroes.indexOf(c);
      return i >= 0 ? this.heroSprites[i] : undefined;
    }
    const i = this.enemies.indexOf(c);
    return i >= 0 ? this.enemySprites[i] : undefined;
  }

  private highlightTurn(actor: Combatant): void {
    const heroBase = 1.05;
    const enemyBase = this.boss ? 1.35 : 1.15;
    this.heroSprites.forEach((s) => {
      s.clearTint();
      s.setScale(heroBase);
    });
    this.enemySprites.forEach((s) => {
      s.clearTint();
      s.setScale(enemyBase);
    });

    const spr = this.spriteFor(actor);
    if (!spr) {
      this.turnGlow.setVisible(false);
      this.turnBanner.setText('');
      return;
    }
    const base = actor.isPlayer ? heroBase : enemyBase;
    spr.setTint(0xfff2c0);
    spr.setScale(base * 1.1);
    this.turnGlow.setPosition(spr.x, spr.y + 34).setVisible(true);
    this.turnBanner.setText(`TURN: ${actor.name}`);
  }

  private animateStrike(
    actor: Combatant,
    targets: Combatant[],
    kind: 'hit' | 'heal',
    then: () => void,
  ): void {
    const safeThen = (): void => {
      try {
        then();
      } catch {
        // Never leave combat stuck in animating if resolution throws.
        this.advance();
      }
    };

    const livingTargets = targets.filter((t): t is Combatant => !!t && t.currentHp !== undefined);
    const spr = this.spriteFor(actor);
    if (!spr) {
      safeThen();
      return;
    }
    const originX = spr.x;
    const dir = actor.isPlayer ? -1 : 1;
    const primary = livingTargets[0] ? this.spriteFor(livingTargets[0]) : undefined;

    this.tweens.add({
      targets: spr,
      x: originX + dir * 28,
      duration: 90,
      yoyo: true,
      onYoyo: () => {
        try {
          if (kind === 'heal') Audio.sfx('heal');
          else Audio.sfx('hit');
          for (const t of livingTargets) {
            const ts = this.spriteFor(t);
            if (!ts) continue;
            if (kind === 'heal') {
              ts.setTint(0x80ffb0);
              this.time.delayedCall(120, () => {
                if (ts.active) ts.clearTint();
              });
            } else {
              this.tweens.add({
                targets: ts,
                alpha: 0.3,
                duration: 50,
                yoyo: true,
                repeat: 2,
                onComplete: () => {
                  if (ts.active) ts.setAlpha(t.currentHp <= 0 ? 0.2 : 1);
                },
              });
              ts.setTint(0xff6060);
              this.time.delayedCall(140, () => {
                if (ts.active && t.currentHp > 0) ts.clearTint();
              });
            }
          }
          if (primary?.active) {
            this.tweens.add({
              targets: primary,
              x: primary.x - dir * 8,
              duration: 60,
              yoyo: true,
            });
          }
        } catch {
          /* visual only */
        }
      },
      onComplete: () => {
        if (spr.active) spr.x = originX;
        safeThen();
      },
    });
  }

  private buildTurnOrder(): void {
    this.turnOrder = [...this.heroes, ...this.enemies]
      .filter((c) => c.currentHp > 0)
      .sort((a, b) => b.stats.agi - a.stats.agi);
    this.turnIndex = 0;
  }

  private currentActor(): Combatant | null {
    while (this.turnIndex < this.turnOrder.length) {
      const c = this.turnOrder[this.turnIndex];
      if (c.currentHp > 0) return c;
      this.turnIndex += 1;
    }
    return null;
  }

  private beginTurn(): void {
    if (this.checkEnd()) return;
    if (this.turnIndex >= this.turnOrder.length) {
      this.buildTurnOrder();
    }
    let actor = this.currentActor();
    if (!actor) {
      this.buildTurnOrder();
      actor = this.currentActor();
    }
    if (!actor) {
      // No valid actor but battle not over — force an end check / skip safely.
      if (!this.checkEnd()) this.advance();
      return;
    }

    this.highlightTurn(actor);
    this.pushLog({ text: `— ${actor.name}'s turn —`, color: '#ffe08a' });
    for (const line of tickStates(actor)) this.pushLog(line);

    if (actor.currentHp <= 0) {
      this.advance();
      return;
    }

    if (actor.states.some((s) => s.id === 'bind') && Math.random() < 0.35) {
      this.pushLog({ text: `${actor.name} is entangled and can't move!`, color: '#fa6' });
      this.advance();
      return;
    }

    if (actor.isPlayer) this.showCommandMenu();
    else this.time.delayedCall(400, () => this.runEnemy(actor));
  }

  private showCommandMenu(): void {
    this.phase = 'command';
    this.menu?.destroy();
    const actor = this.currentActor();
    if (!actor || actor.currentHp <= 0) {
      this.advance();
      return;
    }
    this.menu = new TextMenu(
      this,
      20,
      448,
      [{ label: 'Attack' }, { label: 'Skills' }, { label: 'Items' }, { label: 'Defend' }, { label: 'Flee' }],
      (_i, item) => {
        if (item.label === 'Attack') {
          this.pendingSkill = '__strike__';
          this.showEnemyTargets();
        } else if (item.label === 'Skills') this.showSkillMenu(actor);
        else if (item.label === 'Items') this.showItemMenu();
        else if (item.label === 'Defend') {
          actor.states = actor.states.filter((s) => s.id !== 'shield');
          actor.states.push({ id: 'shield', turns: 1 });
          this.pushLog({ text: `${actor.name} braces for impact.`, color: '#8cf' });
          this.advance();
        } else if (item.label === 'Flee') {
          if (this.boss) {
            this.pushLog({ text: 'Cannot flee from the Ley Wraith!', color: '#f66' });
            this.showCommandMenu();
          } else if (Math.random() < 0.55) {
            this.pushLog({ text: 'You fled!' });
            this.finishFlee();
          } else {
            this.pushLog({ text: 'Could not escape!', color: '#fa6' });
            this.advance();
          }
        }
      },
      BATTLE_MENU,
    );
  }

  private showSkillMenu(actor: Combatant): void {
    this.phase = 'skill';
    this.menu?.destroy();
    const items = actor.skills.map((id) => {
      const s = SKILLS[id];
      return {
        label: `${s.name} (${s.mpCost} MP)`,
        disabled: actor.currentMp < s.mpCost,
      };
    });
    items.push({ label: 'Back', disabled: false });
    this.menu = new TextMenu(
      this,
      20,
      448,
      items,
      (index) => {
        if (index >= actor.skills.length) {
          this.showCommandMenu();
          return;
        }
        this.pendingSkill = actor.skills[index];
        const skill = SKILLS[this.pendingSkill];
        if (skill.target === 'self' || skill.target === 'allies' || skill.target === 'ally') {
          if (skill.target === 'self') this.resolvePlayerAction([actor]);
          else if (skill.target === 'allies') this.resolvePlayerAction(this.heroes.filter((h) => h.currentHp > 0));
          else this.showAllyTargets();
        } else if (skill.target === 'enemies') {
          this.resolvePlayerAction(this.enemies.filter((e) => e.currentHp > 0));
        } else {
          this.showEnemyTargets();
        }
      },
      BATTLE_MENU,
    );
  }

  private showItemMenu(): void {
    this.phase = 'item';
    this.menu?.destroy();
    const inv = listPartyConsumables(this.heroes);
    const items = inv.map((i) => ({ label: i.label }));
    items.push({ label: 'Back' });
    this.menu = new TextMenu(
      this,
      20,
      448,
      items,
      (index) => {
        if (index >= inv.length) {
          this.showCommandMenu();
          return;
        }
        this.pendingItem = inv[index].itemId;
        this.pendingItemOwner = inv[index].ownerIndex;
        this.showAllyTargets();
      },
      { ...BATTLE_MENU, rowWidth: 300, maxVisible: 5 },
    );
  }

  private showEnemyTargets(): void {
    this.phase = 'target';
    this.menu?.destroy();
    const living = this.enemies.filter((e) => e.currentHp > 0);
    this.menu = new TextMenu(
      this,
      20,
      448,
      [...living.map((e) => ({ label: e.name })), { label: 'Back' }],
      (index) => {
        if (index >= living.length) {
          this.showCommandMenu();
          return;
        }
        this.resolvePlayerAction([living[index]]);
      },
      BATTLE_MENU,
    );
  }

  private showAllyTargets(): void {
    this.phase = 'target';
    this.menu?.destroy();
    const living = this.heroes.filter((h) => h.currentHp > 0);
    this.menu = new TextMenu(
      this,
      20,
      448,
      [...living.map((h) => ({ label: h.name })), { label: 'Back' }],
      (index) => {
        if (index >= living.length) {
          this.showCommandMenu();
          return;
        }
        this.resolvePlayerAction([living[index]]);
      },
      BATTLE_MENU,
    );
  }

  private resolvePlayerAction(targets: Combatant[]): void {
    const actor = this.currentActor();
    if (!actor || this.phase === 'animating') return;
    this.menu?.destroy();
    this.menu = null;
    this.phase = 'animating';

    const livingTargets = targets.filter((t) => t && t.currentHp > 0);
    if (!livingTargets.length && !this.pendingItem) {
      this.pushLog({ text: 'No valid target.', color: '#fa6' });
      this.pendingSkill = null;
      this.showCommandMenu();
      return;
    }

    if (this.pendingItem) {
      const item = ITEMS[this.pendingItem];
      const target = livingTargets[0] ?? targets[0];
      const owner = this.heroes[this.pendingItemOwner];
      if (!item || !target || !owner || !removeItem(owner.inventory, this.pendingItem, 1)) {
        this.pushLog({ text: 'No item left in that bag!', color: '#f66' });
        this.pendingItem = null;
        this.showCommandMenu();
        return;
      }
      owner.inventory = pruneEmpty(owner.inventory);
      this.animateStrike(actor, [target], 'heal', () => {
        if (item.healHp) {
          target.currentHp = Math.min(target.stats.hp, target.currentHp + item.healHp);
          this.pushLog({
            text: `${actor.name} uses ${owner.name}'s ${item.name} on ${target.name} (+${item.healHp} HP).`,
            color: '#7f7',
          });
        }
        if (item.healMp) {
          target.currentMp = Math.min(target.stats.mp, target.currentMp + item.healMp);
          this.pushLog({ text: `${target.name} recovers ${item.healMp} MP.`, color: '#8cf' });
        }
        this.pendingItem = null;
        this.refreshStatus();
        this.advance();
      });
      return;
    }

    const skillId = this.pendingSkill;
    this.pendingSkill = null;
    const isHeal =
      !!skillId &&
      skillId !== '__strike__' &&
      SKILLS[skillId]?.kind === 'heal';

    this.animateStrike(actor, livingTargets, isHeal ? 'heal' : 'hit', () => {
      if (skillId === '__strike__') {
        for (const line of strike(actor, livingTargets[0])) this.pushLog(line);
      } else if (skillId) {
        const result = applySkill(
          actor,
          skillId,
          livingTargets,
          this.heroes.filter((h) => h.currentHp > 0),
        );
        for (const line of result.logs) this.pushLog(line);
        if (result.stolenGold) Registry.get().gold += result.stolenGold;
        if (result.stolenItem) addItem(actor.inventory, result.stolenItem, 1);
      }
      this.refreshStatus();
      this.updateEnemyVisuals();
      this.advance();
    });
  }

  private runEnemy(actor: Combatant): void {
    if (this.checkEnd()) return;
    if (actor.currentHp <= 0) {
      this.advance();
      return;
    }
    this.phase = 'animating';
    for (const line of maybeBossPhase(actor)) this.pushLog(line);
    const { skillId, target } = enemyAi(actor, this.heroes);
    if (!target) {
      this.advance();
      return;
    }
    const skill = skillId ? SKILLS[skillId] : null;
    const targets =
      skill?.target === 'enemies' ? this.heroes.filter((h) => h.currentHp > 0) : [target];
    if (!targets.length) {
      this.advance();
      return;
    }
    const isHeal = skill?.kind === 'heal';

    this.animateStrike(actor, targets, isHeal ? 'heal' : 'hit', () => {
      if (skillId) {
        const result = applySkill(
          actor,
          skillId,
          targets,
          this.enemies.filter((e) => e.currentHp > 0),
        );
        for (const line of result.logs) this.pushLog(line);
      } else {
        for (const line of strike(actor, target)) this.pushLog(line);
      }
      this.refreshStatus();
      this.advance();
    });
  }

  private advance(): void {
    this.turnIndex += 1;
    this.menu?.destroy();
    this.menu = null;
    this.time.delayedCall(280, () => {
      if (this.phase === 'won' || this.phase === 'lost') return;
      if (!this.checkEnd()) this.beginTurn();
    });
  }

  private checkEnd(): boolean {
    const heroesAlive = this.heroes.some((h) => h.currentHp > 0);
    const enemiesAlive = this.enemies.some((e) => e.currentHp > 0);
    if (!heroesAlive) {
      this.phase = 'lost';
      this.menu?.destroy();
      this.turnGlow.setVisible(false);
      Audio.sfx('defeat');
      this.pushLog({ text: 'Your party has fallen... Press Enter.', color: '#f66' });
      return true;
    }
    if (!enemiesAlive) {
      this.menu?.destroy();
      this.turnGlow.setVisible(false);
      Audio.sfx('victory');
      this.resolveRewards();
      return true;
    }
    return false;
  }

  private resolveRewards(): void {
    const state = Registry.get();
    let xp = 0;
    let gold = 0;
    for (const e of this.enemies) {
      const baseId = e.id.replace(/_\d+$/, '');
      const def = ENEMIES[baseId];
      if (!def) continue;
      xp += def.xp;
      gold += def.gold;
    }
    this.battleXp = xp;
    state.gold += gold;
    this.pushLog({ text: `Gained ${xp} XP and ${gold} gold.`, color: '#ffe08a' });

    const rows: XpRow[] = [];
    for (const h of this.heroes) {
      const levelBefore = h.level;
      const xpBefore = h.xp;
      const needBefore = xpToNext(h.level);
      const survived = h.currentHp > 0;
      if (survived) {
        const notes = grantXp(h, xp);
        for (const n of notes) this.pushLog({ text: n, color: '#9cf' });
      }
      rows.push({
        name: h.name,
        gained: survived ? xp : 0,
        xpBefore,
        needBefore,
        xpAfter: h.xp,
        needAfter: xpToNext(h.level),
        levelBefore,
        levelAfter: h.level,
        survived,
      });
    }

    if (this.boss) {
      const bossId = this.enemies[0]?.id.replace(/_\d+$/, '') ?? '';
      if (bossId === 'ley_wraith') {
        state.dungeonCleared = true;
        state.flags.quest_main_complete = true;
        this.pushLog({
          text: 'Quest update: The Ley Wraith is banished. Seek the Ruins of Echoes.',
          color: '#d48cff',
        });
      }
      if (bossId === 'echo_knight') {
        state.ruinsCleared = true;
        this.pushLog({
          text: 'Quest update: The Echo Knight falls. The ruins are still.',
          color: '#9cf',
        });
      }
      if (state.dungeonCleared && state.ruinsCleared) {
        state.flags.game_cleared = true;
        this.pushLog({ text: 'Both threats are ended — the Circle endures!', color: '#ffe08a' });
      }
    }
    this.syncParty();
    saveGame(Registry.get());
    this.showXpSummary(rows, gold);
  }

  private showXpSummary(rows: XpRow[], gold: number): void {
    this.phase = 'xp';
    this.xpOverlay?.destroy(true);
    const { width, height } = this.scale;
    const root = this.add.container(0, 0).setDepth(90);
    root.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72));
    root.add(
      this.add
        .rectangle(width / 2, height / 2, 520, 420, 0x121820, 0.98)
        .setStrokeStyle(2, 0xc2a35a),
    );
    root.add(
      this.add
        .text(width / 2, 110, 'VICTORY', {
          fontFamily: UI.font,
          fontSize: '22px',
          color: UI.color.accent,
        })
        .setOrigin(0.5),
    );
    root.add(
      this.add
        .text(width / 2, 140, `Battle rewards: +${this.battleXp} XP   +${gold}g`, {
          fontFamily: UI.font,
          fontSize: UI.small,
          color: UI.color.cream,
        })
        .setOrigin(0.5),
    );

    const barW = 360;
    rows.forEach((row, i) => {
      const y = 175 + i * 58;
      const title = row.survived
        ? row.levelAfter > row.levelBefore
          ? `${row.name}  Lv ${row.levelBefore} → ${row.levelAfter}  LEVEL UP!`
          : `${row.name}  Lv ${row.levelAfter}   +${row.gained} XP`
        : `${row.name}  (KO — no XP)`;
      root.add(
        this.add.text(120, y, title, {
          fontFamily: UI.font,
          fontSize: UI.small,
          color: row.levelAfter > row.levelBefore ? '#9f9' : UI.color.body,
        }),
      );

      const bg = this.add.rectangle(120, y + 24, barW, 12, 0x1a1020).setOrigin(0, 0.5);
      const fill = this.add.rectangle(120, y + 24, 1, 12, 0x58c26a).setOrigin(0, 0.5);
      root.add([bg, fill]);

      const startRatio = row.survived ? Phaser.Math.Clamp(row.xpBefore / Math.max(1, row.needBefore), 0, 1) : 0;
      const endRatio = row.survived ? Phaser.Math.Clamp(row.xpAfter / Math.max(1, row.needAfter), 0, 1) : 0;
      const midFull = row.levelAfter > row.levelBefore;
      const anim = { w: Math.max(1, barW * startRatio) };
      fill.setSize(anim.w, 12);

      const tweenTo = (targetW: number, delay: number, onDone?: () => void) => {
        this.tweens.add({
          targets: anim,
          w: Math.max(1, targetW),
          duration: 420,
          delay,
          ease: 'Sine.easeOut',
          onUpdate: () => fill.setSize(Math.max(1, anim.w), 12),
          onComplete: () => onDone?.(),
        });
      };

      if (midFull) {
        tweenTo(barW, 0, () => {
          anim.w = 1;
          fill.setSize(1, 12);
          tweenTo(barW * endRatio, 80);
        });
      } else {
        tweenTo(barW * endRatio, 0);
      }

      const prog = row.survived
        ? `${row.xpAfter} / ${row.needAfter} to next level`
        : 'Defeated';
      root.add(
        this.add.text(120, y + 36, prog, {
          fontFamily: UI.font,
          fontSize: UI.tiny,
          color: UI.color.muted,
        }),
      );
    });

    root.add(
      this.add
        .text(width / 2, 520, 'Press Enter to continue', {
          fontFamily: UI.font,
          fontSize: UI.small,
          color: UI.color.accent,
        })
        .setOrigin(0.5),
    );
    this.xpOverlay = root;
    this.pushLog({ text: 'Victory! Review XP, then press Enter.', color: '#9f9' });
  }

  private stripTempStatBuffs(): void {
    // Rebuild base+gear stats so event ATK/DEF buffs do not linger on the map.
    for (const h of this.heroes) {
      h.states = h.states.filter((s) => s.id !== 'shield' && s.id !== 'hide');
      const hp = h.currentHp;
      const mp = h.currentMp;
      refreshHeroStats(h);
      h.currentHp = Math.min(hp, h.stats.hp);
      h.currentMp = Math.min(mp, h.stats.mp);
    }
  }

  private finishFlee(): void {
    this.stripTempStatBuffs();
    saveGame(Registry.get());
    this.combatLog.clear();
    Audio.playMusic('dungeon');
    const loc = Registry.get().location;
    this.scene.start(loc === 'ruins' ? 'Ruins' : 'Dungeon');
  }

  private finishWin(): void {
    this.stripTempStatBuffs();
    this.syncParty();
    saveGame(Registry.get());
    this.combatLog.clear();
    const state = Registry.get();
    if (state.flags.game_cleared && this.boss) {
      this.scene.start('Victory');
      return;
    }
    if (this.boss) {
      Audio.playMusic('town');
      this.scene.start('Town');
      return;
    }
    const loc = state.location;
    if (loc === 'ruins') {
      Audio.playMusic('dungeon');
      this.scene.start('Ruins');
    } else {
      Audio.playMusic('dungeon');
      this.scene.start('Dungeon');
    }
  }

  private syncParty(): void {
    // Heroes are live Registry.party refs; keep nested fields tidy after rewards.
    const state = Registry.get();
    state.party = this.heroes.map((h) => ({
      ...h,
      stats: { ...h.stats },
      states: h.states.map((s) => ({ ...s })),
      skills: [...h.skills],
      inventory: h.inventory.map((i) => ({ ...i })),
      equipment: { ...h.equipment },
    }));
  }

  private pushLog(line: CombatLogLine): void {
    this.combatLog.push(line);
  }

  private setBar(bar: HpBar, ratio: number, _animate = true): void {
    const w = Math.max(0.001, bar.maxW * Phaser.Math.Clamp(ratio, 0, 1));
    this.tweens.killTweensOf(bar.fill);
    // Direct resize — tweening Rectangle width was unreliable and could stall updates.
    bar.fill.setSize(w, 5);
  }

  private refreshStatus(): void {
    this.statusText.setText(
      this.heroes
        .map(
          (h) =>
            `${h.currentHp <= 0 ? '✝' : '●'} ${h.name} [${formationLabel(h, this.heroes)}]  HP ${Math.max(0, h.currentHp)}/${h.stats.hp}  MP ${h.currentMp}/${h.stats.mp}`,
        )
        .join('\n'),
    );
    this.heroes.forEach((h, i) => {
      this.heroSprites[i]?.setAlpha(h.currentHp <= 0 ? 0.25 : 1);
      if (this.heroBars[i]) this.setBar(this.heroBars[i], h.currentHp / h.stats.hp);
    });
    this.enemies.forEach((e, i) => {
      if (this.enemyBars[i]) this.setBar(this.enemyBars[i], e.currentHp / e.stats.hp);
    });
  }

  private updateEnemyVisuals(): void {
    this.enemies.forEach((e, i) => {
      this.enemySprites[i]?.setAlpha(e.currentHp <= 0 ? 0.2 : 1);
    });
  }
}
