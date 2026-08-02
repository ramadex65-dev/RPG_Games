/** Lightweight procedural audio via Web Audio — no asset files / no credits. */

type MusicId = 'title' | 'town' | 'dungeon' | 'battle' | 'boss' | 'none';

class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicId: MusicId = 'none';
  private step = 0;
  muted = false;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.18;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.45;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  unlock(): void {
    try {
      this.ensure();
    } catch {
      /* ignore */
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  private beep(
    freq: number,
    dur: number,
    type: OscillatorType = 'square',
    vol = 0.2,
    dest?: GainNode | null,
  ): void {
    if (this.muted) return;
    try {
      const ctx = this.ensure();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      // linearRamp avoids InvalidStateError from exponentialRamp when gain is ~0
      g.gain.setValueAtTime(Math.max(0.0001, vol), ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.max(0.01, dur));
      osc.connect(g);
      g.connect(dest ?? this.sfxGain!);
      osc.start();
      osc.stop(ctx.currentTime + Math.max(0.01, dur));
    } catch {
      /* never let audio kill the game loop */
    }
  }

  sfx(name: 'move' | 'confirm' | 'cancel' | 'hit' | 'heal' | 'menu' | 'victory' | 'defeat' | 'step'): void {
    switch (name) {
      case 'move':
      case 'menu':
        this.beep(520, 0.04, 'square', 0.08);
        break;
      case 'confirm':
        this.beep(660, 0.06, 'square', 0.12);
        this.beep(880, 0.08, 'square', 0.1);
        break;
      case 'cancel':
        this.beep(240, 0.07, 'triangle', 0.1);
        break;
      case 'hit':
        this.beep(180, 0.05, 'sawtooth', 0.16);
        this.beep(90, 0.1, 'square', 0.12);
        break;
      case 'heal':
        this.beep(523, 0.08, 'sine', 0.1);
        this.beep(659, 0.1, 'sine', 0.1);
        this.beep(784, 0.12, 'sine', 0.1);
        break;
      case 'victory':
        this.beep(523, 0.1, 'square', 0.12);
        this.beep(659, 0.1, 'square', 0.12);
        this.beep(784, 0.18, 'square', 0.14);
        break;
      case 'defeat':
        this.beep(220, 0.2, 'triangle', 0.14);
        this.beep(165, 0.3, 'triangle', 0.12);
        break;
      case 'step':
        this.beep(140, 0.03, 'triangle', 0.04);
        break;
    }
  }

  playMusic(id: MusicId): void {
    if (this.musicId === id) return;
    this.stopMusic();
    this.musicId = id;
    if (id === 'none' || this.muted) return;
    this.ensure();
    this.step = 0;
    const patterns: Record<Exclude<MusicId, 'none'>, number[]> = {
      title: [262, 330, 392, 330, 349, 392, 440, 392],
      town: [294, 330, 349, 392, 349, 330, 294, 262],
      dungeon: [196, 185, 175, 165, 175, 185, 196, 220],
      battle: [392, 311, 349, 262, 392, 415, 349, 311],
      boss: [155, 147, 139, 131, 139, 147, 155, 185],
    };
    const wave: Record<Exclude<MusicId, 'none'>, OscillatorType> = {
      title: 'triangle',
      town: 'triangle',
      dungeon: 'sawtooth',
      battle: 'square',
      boss: 'sawtooth',
    };
    const tempo: Record<Exclude<MusicId, 'none'>, number> = {
      title: 280,
      town: 320,
      dungeon: 260,
      battle: 180,
      boss: 160,
    };
    const notes = patterns[id];
    const type = wave[id];
    const interval = tempo[id];

    const tick = () => {
      if (this.musicId !== id || this.muted) return;
      const freq = notes[this.step % notes.length];
      this.beep(freq, interval / 1000 * 0.7, type, 0.07, this.musicGain);
      // soft bass
      this.beep(freq / 2, interval / 1000 * 0.85, 'triangle', 0.04, this.musicGain);
      this.step += 1;
      this.musicTimer = window.setTimeout(tick, interval) as unknown as number;
    };
    tick();
  }

  stopMusic(): void {
    if (this.musicTimer != null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicId = 'none';
  }
}

export const Audio = new AudioBus();
