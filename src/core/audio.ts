/** Procedural Web Audio: scrubbing loop, pops, stamps. No audio files. */
export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private scrub: { src: AudioBufferSourceNode; f: BiquadFilterNode; g: GainNode } | null = null;
  volume = 0.7;
  muted = false;

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = last * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = last; }
    this.apply();
  }

  apply() { if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.7; }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, t0 = 0) {
    if (!this.ctx || !this.master) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }

  private burst(freq: number, q: number, dur: number, vol: number, t0 = 0) {
    if (!this.ctx || !this.master || !this.noise) return;
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random(), dur + 0.05);
  }

  /** continuous scrubbing sound: level 0..1, pitch by gunk type */
  setScrub(level: number, freq: number) {
    if (!this.ctx || !this.master || !this.noise) return;
    if (!this.scrub) {
      const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      s.buffer = this.noise; s.loop = true; f.type = 'bandpass'; f.Q.value = 1.4; g.gain.value = 0;
      s.connect(f).connect(g).connect(this.master); s.start();
      this.scrub = { src: s, f, g };
    }
    const t = this.ctx.currentTime;
    this.scrub.g.gain.setTargetAtTime(Math.min(0.5, level * 0.5), t, 0.03);
    this.scrub.f.frequency.setTargetAtTime(freq * (0.85 + level * 0.4), t, 0.05);
  }

  squeak() { this.tone('sine', 1400 + Math.random() * 600, 900, 0.06, 0.04); }
  sparkle() { this.tone('sine', 2200 + Math.random() * 1500, 3000, 0.08, 0.03); }
  pop() { this.tone('square', 520, 1040, 0.08, 0.08); this.tone('sine', 1560, 2080, 0.15, 0.06, 0.06); }
  coin() { this.tone('square', 988, 988, 0.06, 0.05); this.tone('square', 1319, 1319, 0.12, 0.05, 0.06); }
  full() { this.tone('triangle', 330, 220, 0.25, 0.1); }
  stamp() {
    this.burst(180, 0.8, 0.25, 0.9); this.tone('sine', 90, 50, 0.25, 0.5);
    [784, 988, 1175, 1568].forEach((f, i) => this.tone('triangle', f, f, 0.2, 0.08, 0.15 + i * 0.07));
  }
  buy() { [523, 659, 784].forEach((f, i) => this.tone('triangle', f, f, 0.1, 0.09, i * 0.05)); }
  click() { this.tone('square', 1500, 1000, 0.03, 0.04); }
  bell() { [659, 523].forEach((f, i) => this.tone('sine', f, f, 0.5, 0.12, i * 0.25)); }
}
