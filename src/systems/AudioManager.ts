import type { SoundKind } from '../core/types';

/** Procedural Web Audio synth — no external audio files. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private hum: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private last: Record<string, number> = {};
  volume = 0.7;
  muted = false;

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.applyVolume();
    const len = this.ctx.sampleRate;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  applyVolume() { if (this.master) this.master.gain.value = this.muted ? 0 : this.volume * 0.6; }

  private throttle(key: string, ms: number) {
    const now = performance.now();
    if (now - (this.last[key] ?? 0) < ms) return true;
    this.last[key] = now;
    return false;
  }

  private noiseBurst(type: BiquadFilterType, freq: number, q: number, dur: number, vol: number, t0 = 0) {
    const c = this.ctx!, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const t = c.currentTime + t0;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, t0 = 0) {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain();
    const t = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /** Impact sound. `size` 0..1 lowers the pitch for big objects, `power` 0..1.5 scales loudness. */
  impact(kind: SoundKind, power: number, size: number) {
    if (!this.ctx || this.muted || this.throttle('imp', 35)) return;
    const p = Math.min(1.2, 0.35 + power * 0.6);
    const pitch = 1 - size * 0.55;
    switch (kind) {
      case 'metal':
        this.noiseBurst('bandpass', 2600 * pitch, 2, 0.08, p * 0.7);
        this.tone('triangle', 900 * pitch + Math.random() * 300, 500 * pitch, 0.25 + size * 0.3, p * 0.18);
        this.tone('sine', 140 * pitch, 50, 0.15, p * 0.5);
        break;
      case 'plastic':
        for (let i = 0; i < 3; i++) this.noiseBurst('lowpass', 1600 * pitch, 1, 0.04, p * 0.5, i * 0.02);
        this.tone('sine', 220 * pitch, 90, 0.08, p * 0.3);
        break;
      case 'glass':
        this.noiseBurst('highpass', 4500, 1, 0.07, p * 0.4);
        this.tone('sine', 2400 + Math.random() * 1500, 2000, 0.18, p * 0.12);
        break;
      case 'wood':
        this.noiseBurst('bandpass', 600 * pitch, 3, 0.07, p * 0.7);
        this.tone('triangle', 190 * pitch, 110, 0.12, p * 0.45);
        break;
      case 'rubber':
        this.tone('sine', 160 * pitch, 60, 0.14, p * 0.6);
        break;
      case 'exotic':
        this.tone('sawtooth', 300 * pitch, 80, 0.2, p * 0.15);
        this.noiseBurst('bandpass', 1800 * pitch, 6, 0.1, p * 0.5);
        this.tone('sine', 60, 30, 0.25, p * 0.6);
        break;
    }
  }

  crunch(kind: SoundKind, size: number) {
    if (!this.ctx || this.muted || this.throttle('crunch', 90)) return;
    const pitch = 1 - size * 0.5;
    const f = kind === 'metal' || kind === 'exotic' ? 1400 : kind === 'glass' ? 3500 : kind === 'wood' ? 700 : 1000;
    this.noiseBurst('bandpass', f * pitch * (0.7 + Math.random() * 0.6), 4, 0.06, 0.35);
    if (kind === 'metal' && Math.random() < 0.4) this.tone('triangle', 300 * pitch + Math.random() * 200, 200, 0.2, 0.06);
  }

  shatter() {
    if (!this.ctx || this.muted || this.throttle('shatter', 60)) return;
    this.noiseBurst('highpass', 3500, 1, 0.3, 0.5);
    for (let i = 0; i < 5; i++) this.tone('sine', 2500 + Math.random() * 3000, 1800, 0.15, 0.06, i * 0.03 + Math.random() * 0.03);
  }

  snap(kind: SoundKind) {
    if (!this.ctx || this.muted || this.throttle('snap', 50)) return;
    if (kind === 'wood') { this.noiseBurst('bandpass', 1200, 2, 0.12, 0.6); this.tone('square', 260, 120, 0.06, 0.1); }
    else this.noiseBurst('bandpass', 2000, 3, 0.1, 0.5);
  }

  collapse(kind: SoundKind, size: number) {
    if (!this.ctx || this.muted) return;
    const pitch = 1 - size * 0.6;
    this.noiseBurst('lowpass', 900 * pitch, 1, 0.45, 0.8);
    this.tone('sine', 110 * pitch, 35, 0.45, 0.7);
    if (kind === 'metal') this.tone('triangle', 600 * pitch, 250, 0.5, 0.1);
  }

  reward() {
    if (!this.ctx || this.muted || this.throttle('rew', 80)) return;
    this.tone('square', 880, 880, 0.06, 0.06);
    this.tone('square', 1320, 1320, 0.1, 0.06, 0.06);
  }

  buy() {
    if (!this.ctx || this.muted) return;
    [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.12, i * 0.06));
  }

  click() { if (this.ctx && !this.muted && !this.throttle('click', 40)) this.tone('square', 1800, 1200, 0.03, 0.05); }

  fanfare() {
    if (!this.ctx || this.muted) return;
    [392, 523, 659, 784, 1046].forEach((f, i) => { this.tone('square', f, f, 0.18, 0.07, i * 0.09); this.tone('triangle', f / 2, f / 2, 0.2, 0.08, i * 0.09); });
  }

  /** Continuous hydraulic/motor hum for presses. level 0 = off. */
  setHum(level: number, pitch = 1) {
    if (!this.ctx || !this.master) return;
    if (!this.hum) {
      const c = this.ctx;
      const osc = c.createOscillator(), osc2 = c.createOscillator(), gain = c.createGain(), filter = c.createBiquadFilter();
      osc.type = 'sawtooth'; osc2.type = 'square';
      filter.type = 'lowpass'; filter.frequency.value = 400;
      gain.gain.value = 0;
      osc.connect(filter); osc2.connect(filter); filter.connect(gain).connect(this.master);
      osc.start(); osc2.start();
      this.hum = { osc, osc2, gain, filter };
    }
    const t = this.ctx.currentTime;
    this.hum.gain.gain.setTargetAtTime(this.muted ? 0 : level * 0.12, t, 0.05);
    this.hum.osc.frequency.setTargetAtTime(48 * pitch, t, 0.1);
    this.hum.osc2.frequency.setTargetAtTime(48 * pitch * 1.01, t, 0.1);
    this.hum.filter.frequency.setTargetAtTime(250 + 500 * level * pitch, t, 0.1);
  }
}
