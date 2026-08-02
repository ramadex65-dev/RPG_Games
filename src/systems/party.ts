import { getClass } from '../data/classes';
import { SKILLS } from '../data/skills';
import type { ClassId, Combatant, Stats } from '../data/types';

function scaleStats(base: Stats, growth: Stats, level: number): Stats {
  const levels = Math.max(0, level - 1);
  return {
    hp: base.hp + growth.hp * levels,
    mp: base.mp + growth.mp * levels,
    atk: base.atk + growth.atk * levels,
    def: base.def + growth.def * levels,
    mat: base.mat + growth.mat * levels,
    mdf: base.mdf + growth.mdf * levels,
    agi: base.agi + growth.agi * levels,
    luk: base.luk + growth.luk * levels,
  };
}

export function createHero(classId: ClassId, level = 1, slot = 0): Combatant {
  const cls = getClass(classId);
  const stats = scaleStats(cls.base, cls.growth, level);
  const skills = cls.skills.filter((id) => SKILLS[id].learnLevel <= level);
  return {
    id: `hero_${classId}_${slot}`,
    name: cls.name,
    isPlayer: true,
    classId,
    level,
    xp: 0,
    stats,
    currentHp: stats.hp,
    currentMp: stats.mp,
    skills,
    states: [],
    color: cls.color,
    equipment: {},
  };
}

export function xpToNext(level: number): number {
  return Math.floor(40 + level * 25 + level * level * 4);
}

export function grantXp(hero: Combatant, amount: number): string[] {
  const notes: string[] = [];
  hero.xp += amount;
  while (hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level);
    hero.level += 1;
    const cls = getClass(hero.classId!);
    const next = scaleStats(cls.base, cls.growth, hero.level);
    const hpGain = next.hp - hero.stats.hp;
    const mpGain = next.mp - hero.stats.mp;
    hero.stats = next;
    hero.currentHp = Math.min(next.hp, hero.currentHp + hpGain);
    hero.currentMp = Math.min(next.mp, hero.currentMp + mpGain);
    const unlocked = cls.skills.filter(
      (id) => SKILLS[id].learnLevel === hero.level && !hero.skills.includes(id),
    );
    for (const id of unlocked) {
      hero.skills.push(id);
      notes.push(`${hero.name} learned ${SKILLS[id].name}!`);
    }
    notes.push(`${hero.name} reached level ${hero.level}!`);
  }
  return notes;
}

export function effectiveStats(c: Combatant): Stats {
  const s = { ...c.stats };
  for (const st of c.states) {
    if (st.id === 'rage') {
      s.atk = Math.floor(s.atk * 1.5);
      s.def = Math.floor(s.def * 0.7);
    }
    if (st.id === 'bless') {
      s.atk = Math.floor(s.atk * 1.2);
      s.mat = Math.floor(s.mat * 1.2);
    }
    if (st.id === 'bless_mdf') s.mdf = Math.floor(s.mdf * 1.3);
    if (st.id === 'shield') s.def = Math.floor(s.def * 1.5);
    if (st.id === 'def_down') s.def = Math.floor(s.def * 0.75);
    if (st.id === 'bind') s.agi = Math.floor(s.agi * 0.5);
    if (st.id === 'hide') s.agi = Math.floor(s.agi * 1.4);
  }
  return s;
}
