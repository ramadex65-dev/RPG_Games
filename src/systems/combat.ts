import { SKILLS } from '../data/skills';
import type { Combatant, SkillDef } from '../data/types';
import { effectiveStats } from './party';

export interface CombatLogLine {
  text: string;
  color?: string;
}

export interface SkillResult {
  logs: CombatLogLine[];
  stolenGold?: number;
  stolenItem?: string;
}

function critChance(attacker: Combatant): number {
  return Math.min(0.35, 0.05 + effectiveStats(attacker).luk * 0.008);
}

function affinityMultiplier(defender: Combatant, element: SkillDef['element']): { mult: number; note?: string } {
  if (defender.weak?.includes(element)) return { mult: 1.5, note: 'Weak!' };
  if (defender.resist?.includes(element)) return { mult: 0.5, note: 'Resist!' };
  return { mult: 1 };
}

function damageFormula(
  attacker: Combatant,
  defender: Combatant,
  skill: SkillDef,
  crit: boolean,
): { dmg: number; affinity?: string } {
  const a = effectiveStats(attacker);
  const d = effectiveStats(defender);
  const offense = skill.kind === 'magical' ? a.mat : a.atk;
  const defense = skill.kind === 'magical' ? d.mdf : d.def;
  let raw = Math.max(1, Math.floor(offense * skill.power - defense * 0.45));
  if (skill.undeadBonus && defender.undead) {
    raw = Math.floor(raw * (1 + skill.undeadBonus));
  }
  const aff = affinityMultiplier(defender, skill.element);
  raw = Math.max(1, Math.floor(raw * aff.mult));
  if (crit) raw = Math.floor(raw * 1.5);
  if (defender.states.some((s) => s.id === 'reckless')) {
    raw = Math.floor(raw * 1.25);
  }
  return { dmg: Math.max(1, raw), affinity: aff.note };
}

export function tickStates(c: Combatant): CombatLogLine[] {
  const logs: CombatLogLine[] = [];
  c.states = c.states
    .map((s) => ({ ...s, turns: s.turns - 1 }))
    .filter((s) => {
      if (s.turns <= 0) {
        logs.push({ text: `${c.name}'s ${s.id.replace('_', ' ')} faded.`, color: '#aaa' });
        return false;
      }
      return true;
    });
  return logs;
}

export function applySkill(
  user: Combatant,
  skillId: string,
  targets: Combatant[],
  livingAllies: Combatant[],
): SkillResult {
  const skill = SKILLS[skillId];
  const logs: CombatLogLine[] = [];
  if (!skill) return { logs: [{ text: 'Unknown skill.', color: '#f66' }] };
  if (user.currentMp < skill.mpCost) {
    return { logs: [{ text: `${user.name} needs more MP!`, color: '#f66' }] };
  }
  user.currentMp -= skill.mpCost;
  logs.push({ text: `${user.name} uses ${skill.name}!` });

  let stolenGold: number | undefined;
  let stolenItem: string | undefined;

  if (skill.kind === 'utility' && skill.stealChance != null) {
    const target = targets[0];
    if (Math.random() < skill.stealChance) {
      stolenGold = 8 + Math.floor(Math.random() * 18);
      logs.push({ text: `Stole ${stolenGold} gold from ${target.name}!`, color: '#9f9' });
    } else if (Math.random() < 0.25) {
      stolenItem = 'potion';
      logs.push({ text: `Stole a Potion from ${target.name}!`, color: '#9f9' });
    } else {
      logs.push({ text: 'Steal failed...', color: '#fa6' });
    }
    return { logs, stolenGold, stolenItem };
  }

  const recipients =
    skill.target === 'allies'
      ? livingAllies
      : skill.target === 'self'
        ? [user]
        : targets;

  for (const target of recipients) {
    if (skill.kind === 'heal') {
      const amount = Math.max(1, Math.floor(target.stats.hp * skill.power));
      target.currentHp = Math.min(target.stats.hp, target.currentHp + amount);
      logs.push({ text: `${target.name} recovers ${amount} HP.`, color: '#7f7' });
      continue;
    }

    if (skill.kind === 'buff' && skill.stateId) {
      target.states = target.states.filter((s) => s.id !== skill.stateId);
      target.states.push({ id: skill.stateId, turns: skill.stateTurns ?? 2 });
      logs.push({ text: `${target.name} gains ${skill.stateId.replace('_', ' ')}.`, color: '#8cf' });
      continue;
    }

    if (target.currentHp <= 0) continue;
    if (target.states.some((s) => s.id === 'hide') && Math.random() < 0.55) {
      logs.push({ text: `${target.name} dodges from hiding!`, color: '#8cf' });
      continue;
    }

    const crit = Math.random() < critChance(user);
    let { dmg, affinity } = damageFormula(user, target, skill, crit);
    if (skill.id === 'action_surge') {
      const second = damageFormula(user, target, { ...skill, power: 1 }, false);
      dmg += second.dmg;
      logs.push({ text: `${user.name} strikes twice!` });
    }
    if (skill.id === 'sneak_attack' || user.states.some((s) => s.id === 'hide')) {
      dmg = Math.floor(dmg * 1.15);
      user.states = user.states.filter((s) => s.id !== 'hide');
    }
    target.currentHp = Math.max(0, target.currentHp - dmg);
    const tags = [crit ? 'CRIT!' : '', affinity ?? ''].filter(Boolean).join(' ');
    logs.push({
      text: `${target.name} takes ${dmg} ${skill.element} damage${tags ? ` (${tags})` : ''}.`,
      color: affinity === 'Weak!' ? '#9f9' : affinity === 'Resist!' ? '#fa6' : crit ? '#ff6' : '#fff',
    });

    if (skill.stateId && skill.kind !== 'buff' && target.currentHp > 0) {
      target.states = target.states.filter((s) => s.id !== skill.stateId);
      target.states.push({ id: skill.stateId, turns: skill.stateTurns ?? 2 });
      if (skill.id === 'reckless_attack') {
        user.states = user.states.filter((s) => s.id !== 'reckless');
        user.states.push({ id: 'reckless', turns: 1 });
      }
    }

    if (target.currentHp <= 0) {
      logs.push({ text: `${target.name} is defeated!`, color: '#f88' });
    }
  }

  return { logs, stolenGold, stolenItem };
}

/** Basic attack that doesn't require skill ownership. */
export function strike(user: Combatant, target: Combatant): CombatLogLine[] {
  const fake: SkillDef = {
    id: 'strike',
    name: 'Attack',
    description: '',
    mpCost: 0,
    learnLevel: 1,
    target: 'enemy',
    power: 1,
    element: 'physical',
    kind: 'physical',
  };
  const logs: CombatLogLine[] = [{ text: `${user.name} attacks!` }];
  if (target.states.some((s) => s.id === 'hide') && Math.random() < 0.55) {
    logs.push({ text: `${target.name} dodges from hiding!`, color: '#8cf' });
    return logs;
  }
  const crit = Math.random() < critChance(user);
  const { dmg, affinity } = damageFormula(user, target, fake, crit);
  target.currentHp = Math.max(0, target.currentHp - dmg);
  const tags = [crit ? 'CRIT!' : '', affinity ?? ''].filter(Boolean).join(' ');
  logs.push({
    text: `${target.name} takes ${dmg} physical damage${tags ? ` (${tags})` : ''}.`,
    color: affinity === 'Weak!' ? '#9f9' : affinity === 'Resist!' ? '#fa6' : crit ? '#ff6' : '#fff',
  });
  if (target.currentHp <= 0) logs.push({ text: `${target.name} is defeated!`, color: '#f88' });
  return logs;
}

/** Call each enemy turn — handles Ley Wraith phase transition. */
export function maybeBossPhase(enemy: Combatant): CombatLogLine[] {
  if (enemy.id.replace(/_\d+$/, '') !== 'ley_wraith') return [];
  if (enemy.phase2) return [];
  if (enemy.currentHp > enemy.stats.hp * 0.5) return [];
  enemy.phase2 = true;
  enemy.stats.mat += 4;
  enemy.stats.agi += 2;
  if (!enemy.skills.includes('ley_surge')) enemy.skills.push('ley_surge');
  if (!enemy.skills.includes('void_storm')) enemy.skills.push('void_storm');
  return [
    { text: 'The Ley Wraith fractures — Phase 2! Dark power surges!', color: '#d48cff' },
  ];
}

export function enemyAi(enemy: Combatant, heroes: Combatant[]): { skillId?: string; target: Combatant } {
  const living = heroes.filter((h) => h.currentHp > 0);
  const target = living.slice().sort((a, b) => a.currentHp - b.currentHp)[0];
  const usable = enemy.skills.filter((id) => SKILLS[id] && enemy.currentMp >= SKILLS[id].mpCost);
  const preferHeavy =
    enemy.phase2 && usable.filter((id) => id === 'void_storm' || id === 'ley_surge');
  const pool = preferHeavy && preferHeavy.length && Math.random() < 0.65 ? preferHeavy : usable;
  if (pool.length && Math.random() < (enemy.phase2 ? 0.75 : 0.55)) {
    const skillId = pool[Math.floor(Math.random() * pool.length)];
    return { skillId, target };
  }
  return { target };
}
