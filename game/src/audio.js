// Midnight Vault — every sound is synthesized with WebAudio; no audio
// files, no network. Footsteps tick, coins ring, loot chimes, suspicion
// stings, the alarm drones, and the getaway plays a little win jingle.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._alarmNodes = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopAlarm();
    return this.muted;
  }

  _tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  footstep(sneaking) {
    this._tone(sneaking ? 140 : 190, 0.05, 'triangle', sneaking ? 0.02 : 0.045);
  }

  coin() {
    this._tone(1568, 0.35, 'sine', 0.09, 0, 2093);
    this._tone(2093, 0.3, 'sine', 0.05, 0.06);
  }

  pickup() {
    this._tone(880, 0.12, 'sine', 0.09);
    this._tone(1318, 0.18, 'sine', 0.08, 0.08);
  }

  vaultPickup() {
    this._tone(659, 0.14, 'sine', 0.09);
    this._tone(988, 0.14, 'sine', 0.09, 0.1);
    this._tone(1318, 0.3, 'sine', 0.09, 0.2);
  }

  exitOpen() {
    this._tone(523, 0.2, 'triangle', 0.08);
    this._tone(784, 0.35, 'triangle', 0.08, 0.12);
  }

  suspicious() {
    this._tone(220, 0.25, 'sawtooth', 0.05, 0, 330);
  }

  spotted() {
    this._tone(440, 0.15, 'square', 0.06, 0, 660);
    this._tone(660, 0.25, 'square', 0.06, 0.12, 880);
  }

  caught() {
    this._tone(330, 0.4, 'sawtooth', 0.09, 0, 110);
    this._tone(165, 0.6, 'sawtooth', 0.09, 0.3, 55);
  }

  emp() {
    this._tone(1200, 0.5, 'sine', 0.08, 0, 90);
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this._tone(n, 0.28, 'triangle', 0.09, i * 0.13));
  }

  startAlarm() {
    if (!this.ctx || this.muted || this._alarmNodes) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 98;
    g.gain.value = 0.025;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 2.5;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(g.gain);
    osc.connect(g).connect(this.ctx.destination);
    osc.start();
    lfo.start();
    this._alarmNodes = { osc, lfo, g };
  }

  stopAlarm() {
    if (!this._alarmNodes) return;
    try {
      this._alarmNodes.osc.stop();
      this._alarmNodes.lfo.stop();
    } catch {
      // Already stopped.
    }
    this._alarmNodes = null;
  }
}
