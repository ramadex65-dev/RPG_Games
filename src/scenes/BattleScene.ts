import Phaser from 'phaser';
import { classTextureKey, enemyTextureKey } from '../assets/characters';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { SKILLS } from '../data/skills';
import type { ClassId, Combatant } from '../data/types';
import { applySkill, enemyAi, strike, tickStates, type CombatLogLine } from '../systems/combat';
import { addItem, listPartyConsumables, pruneEmpty, removeItem } from '../systems/inventory';
import { grantXp } from '../systems/party';
import { Registry } from '../systems/registry';
import { saveGame } from '../systems/save';
import { CombatLog } from '../ui/CombatLog';
import { TextMenu } from '../ui/menu';
import { UI } from '../ui/theme';

type Phase = 'command' | 'skill' | 'item' | 'target' | 'animating' | 'won' | 'lost';

export class BattleScene extends Phaser.Scene {
  private heroes: Combatant[] = [];
  private enemies: Combatant[] = [];
  private turnOrder: Combatant[] = [];
  private turnIndex = 0;
  private phase: Phase = 'command';
  private menu: TextMenu | null = null;
  private combatLog!: CombatLog;
  private statusText!: Phaser.GameObjects.Text;
  private enemySprites: Phaser.GameObjects.Image[] = [];
  private heroSprites: Phaser.GameObjects.Image[] = [];
  private pendingSkill: string | null = null;
  private pendingItem: string | null = null;
  private pendingItemOwner = 0;
  private boss = false;

  constructor() {
    super('Battle');
  }

  create(): void {
    const encounter = Registry.consumeEncounter();
    const state = Registry.get();
    this.heroes = state.party.map((h) => ({
      ...h,
      states: [...h.states],
      skills: [...h.skills],
      inventory: h.inventory.map((i) => ({ ...i })),
      equipment: { ...h.equipment },
    }));
    this.boss = encounter?.boss ?? false;
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
        equipment: {},
        inventory: [],
      };
    });

    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x1a1428);
    this.add.rectangle(this.scale.width / 2, 200, this.scale.width, 200, 0x2a2038);

    this.enemies.forEach((e, i) => {
      const x = 160 + i * 120;
      const y = 150;
      const baseId = e.id.replace(/_\d+$/, '');
      const sprite = this.add.image(x, y, enemyTextureKey(baseId)).setScale(this.boss ? 1.35 : 1.15);
      this.enemySprites.push(sprite);
      this.add
        .text(x, y + 42, e.name, {
          fontFamily: UI.font,
          fontSize: UI.tiny,
          color: '#f0e8d8',
        })
        .setOrigin(0.5);
    });

    this.heroes.forEach((h, i) => {
      const x = 520 + (i % 2) * 100;
      const y = 110 + Math.floor(i / 2) * 85;
      const key = classTextureKey(h.classId as ClassId);
      this.heroSprites.push(this.add.image(x, y, key).setScale(1.05));
      this.add
        .text(x, y + 38, h.name, {
          fontFamily: UI.font,
          fontSize: UI.tiny,
          color: UI.color.cream,
        })
        .setOrigin(0.5);
    });

    this.statusText = this.add.text(28, 310, '', {
      fontFamily: UI.font,
      fontSize: UI.small,
      color: UI.color.body,
      lineSpacing: 3,
    });

    this.combatLog = new CombatLog(this, 400, 305, 372, 140);

    this.add.text(28, 14, this.boss ? 'BOSS BATTLE' : 'BATTLE', {
      fontFamily: UI.font,
      fontSize: '16px',
      color: this.boss ? '#d48cff' : UI.color.cream,
    });

    // Fresh log every fight
    this.combatLog.clear();
    this.buildTurnOrder();
    this.pushLog({ text: this.boss ? 'The Ley Wraith emerges!' : 'Enemies draw near!' });
    this.refreshStatus();
    this.bindKeys();
    this.beginTurn();
  }

  private bindKeys(): void {
    this.input.keyboard!.on('keydown-UP', () => this.menu?.move(-1));
    this.input.keyboard!.on('keydown-DOWN', () => this.menu?.move(1));
    this.input.keyboard!.on('keydown-W', () => this.menu?.move(-1));
    this.input.keyboard!.on('keydown-S', () => this.menu?.move(1));
    this.input.keyboard!.on('keydown-ENTER', () => this.onConfirm());
    this.input.keyboard!.on('keydown-SPACE', () => this.onConfirm());
    this.input.keyboard!.on('keydown-ESC', () => this.onCancel());
    this.input.keyboard!.on('keydown-PAGE_UP', () => this.combatLog.nudgeScroll(-1));
    this.input.keyboard!.on('keydown-PAGE_DOWN', () => this.combatLog.nudgeScroll(1));
  }

  private onConfirm(): void {
    if (this.phase === 'won') {
      this.finishWin();
      return;
    }
    if (this.phase === 'lost') {
      this.scene.start('GameOver');
      return;
    }
    this.menu?.confirm();
  }

  private onCancel(): void {
    if (this.phase === 'skill' || this.phase === 'item' || this.phase === 'target') {
      this.pendingSkill = null;
      this.pendingItem = null;
      this.showCommandMenu();
    }
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
    const actor = this.currentActor();
    if (!actor) {
      this.buildTurnOrder();
      this.beginTurn();
      return;
    }

    this.pushLog({ text: `— ${actor.name}'s turn —`, color: '#ffe08a' });
    for (const line of tickStates(actor)) this.pushLog(line);

    if (actor.states.some((s) => s.id === 'bind') && Math.random() < 0.35) {
      this.pushLog({ text: `${actor.name} is entangled and can't move!`, color: '#fa6' });
      this.advance();
      return;
    }

    if (actor.isPlayer) this.showCommandMenu();
    else this.time.delayedCall(450, () => this.runEnemy(actor));
  }

  private showCommandMenu(): void {
    this.phase = 'command';
    this.menu?.destroy();
    const actor = this.currentActor();
    if (!actor) return;
    this.menu = new TextMenu(
      this,
      28,
      455,
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
            this.syncParty();
            this.scene.start('Dungeon');
          } else {
            this.pushLog({ text: 'Could not escape!', color: '#fa6' });
            this.advance();
          }
        }
      },
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
    this.menu = new TextMenu(this, 28, 455, items, (index) => {
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
    });
  }

  private showItemMenu(): void {
    this.phase = 'item';
    this.menu?.destroy();
    const inv = listPartyConsumables(this.heroes);
    const items = inv.map((i) => ({ label: i.label }));
    items.push({ label: 'Back' });
    this.menu = new TextMenu(this, 28, 455, items, (index) => {
      if (index >= inv.length) {
        this.showCommandMenu();
        return;
      }
      this.pendingItem = inv[index].itemId;
      this.pendingItemOwner = inv[index].ownerIndex;
      this.showAllyTargets();
    });
  }

  private showEnemyTargets(): void {
    this.phase = 'target';
    this.menu?.destroy();
    const living = this.enemies.filter((e) => e.currentHp > 0);
    this.menu = new TextMenu(
      this,
      28,
      455,
      [...living.map((e) => ({ label: e.name })), { label: 'Back' }],
      (index) => {
        if (index >= living.length) {
          this.showCommandMenu();
          return;
        }
        this.resolvePlayerAction([living[index]]);
      },
    );
  }

  private showAllyTargets(): void {
    this.phase = 'target';
    this.menu?.destroy();
    const living = this.heroes.filter((h) => h.currentHp > 0);
    this.menu = new TextMenu(
      this,
      28,
      455,
      [...living.map((h) => ({ label: h.name })), { label: 'Back' }],
      (index) => {
        if (index >= living.length) {
          this.showCommandMenu();
          return;
        }
        this.resolvePlayerAction([living[index]]);
      },
    );
  }

  private resolvePlayerAction(targets: Combatant[]): void {
    const actor = this.currentActor();
    if (!actor) return;
    this.menu?.destroy();
    this.menu = null;
    this.phase = 'animating';

    if (this.pendingItem) {
      const item = ITEMS[this.pendingItem];
      const target = targets[0];
      const owner = this.heroes[this.pendingItemOwner];
      if (!owner || !removeItem(owner.inventory, this.pendingItem, 1)) {
        this.pushLog({ text: 'No item left in that bag!', color: '#f66' });
        this.pendingItem = null;
        this.showCommandMenu();
        return;
      }
      owner.inventory = pruneEmpty(owner.inventory);
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
      return;
    }

    if (this.pendingSkill === '__strike__') {
      for (const line of strike(actor, targets[0])) this.pushLog(line);
      this.pendingSkill = null;
      this.refreshStatus();
      this.updateEnemyVisuals();
      this.advance();
      return;
    }

    if (this.pendingSkill) {
      const result = applySkill(
        actor,
        this.pendingSkill,
        targets,
        this.heroes.filter((h) => h.currentHp > 0),
      );
      for (const line of result.logs) this.pushLog(line);
      if (result.stolenGold) Registry.get().gold += result.stolenGold;
      if (result.stolenItem) {
        addItem(actor.inventory, result.stolenItem, 1);
      }
      this.pendingSkill = null;
    }

    this.refreshStatus();
    this.updateEnemyVisuals();
    this.advance();
  }

  private runEnemy(actor: Combatant): void {
    this.phase = 'animating';
    const { skillId, target } = enemyAi(actor, this.heroes);
    if (skillId) {
      const skill = SKILLS[skillId];
      const targets =
        skill.target === 'enemies' ? this.heroes.filter((h) => h.currentHp > 0) : [target];
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
  }

  private advance(): void {
    this.turnIndex += 1;
    this.time.delayedCall(350, () => {
      if (!this.checkEnd()) this.beginTurn();
    });
  }

  private checkEnd(): boolean {
    const heroesAlive = this.heroes.some((h) => h.currentHp > 0);
    const enemiesAlive = this.enemies.some((e) => e.currentHp > 0);
    if (!heroesAlive) {
      this.phase = 'lost';
      this.menu?.destroy();
      this.pushLog({ text: 'Your party has fallen... Press Enter.', color: '#f66' });
      return true;
    }
    if (!enemiesAlive) {
      this.phase = 'won';
      this.menu?.destroy();
      this.resolveRewards();
      this.pushLog({ text: 'Victory! Press Enter to continue.', color: '#9f9' });
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
    state.gold += gold;
    this.pushLog({ text: `Gained ${xp} XP and ${gold} gold.`, color: '#ffe08a' });
    for (const h of this.heroes) {
      if (h.currentHp <= 0) continue;
      const notes = grantXp(h, xp);
      for (const n of notes) this.pushLog({ text: n, color: '#9cf' });
    }
    if (this.boss) {
      state.dungeonCleared = true;
      this.pushLog({
        text: 'The Ley Wraith dissolves into starlight. The ley lines calm.',
        color: '#d48cff',
      });
    }
    this.syncParty();
    saveGame(Registry.get());
  }

  private finishWin(): void {
    this.syncParty();
    saveGame(Registry.get());
    this.combatLog.clear();
    if (this.boss) this.scene.start('Town');
    else this.scene.start('Dungeon');
  }

  private syncParty(): void {
    const state = Registry.get();
    state.party = this.heroes.map((h) => ({
      ...h,
      states: h.states.map((s) => ({ ...s })),
      skills: [...h.skills],
      inventory: h.inventory.map((i) => ({ ...i })),
      equipment: { ...h.equipment },
    }));
  }

  private pushLog(line: CombatLogLine): void {
    this.combatLog.push(line);
  }

  private refreshStatus(): void {
    this.statusText.setText(
      this.heroes
        .map(
          (h) =>
            `${h.currentHp <= 0 ? '✝' : '●'} ${h.name} Lv${h.level}  HP ${Math.max(0, h.currentHp)}/${h.stats.hp}  MP ${h.currentMp}/${h.stats.mp}`,
        )
        .join('\n'),
    );
    this.heroes.forEach((h, i) => {
      this.heroSprites[i]?.setAlpha(h.currentHp <= 0 ? 0.25 : 1);
    });
  }

  private updateEnemyVisuals(): void {
    this.enemies.forEach((e, i) => {
      this.enemySprites[i]?.setAlpha(e.currentHp <= 0 ? 0.2 : 1);
    });
  }
}
