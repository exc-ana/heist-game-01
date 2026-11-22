// Midnight Vault v2 — every sound, synthesized live in WebAudio.
// No audio files: short oscillator blips and a filtered alarm drone, all
// built when the player first presses a key. Mute with M.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmNode = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext ?? window.webkitAudioContext;
        this.ctx = new AC();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopAlarm();
    return this.muted;
  }

  tone(freq, dur, type = 'sine', gain = 0.08, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  footstep(sneak) {
    this.tone(sneak ? 130 : 95, 0.06, 'triangle', sneak ? 0.015 : 0.035);
  }

  pickup() {
    this.tone(660, 0.09, 'sine', 0.07);
    this.tone(990, 0.12, 'sine', 0.05, 1320);
  }

  vaultPickup() {
    this.tone(523, 0.1, 'triangle', 0.08);
    this.tone(784, 0.14, 'triangle', 0.08);
    this.tone(1046, 0.2, 'sine', 0.06);
  }

  paintChime() {
    this.tone(880, 0.16, 'sine', 0.06);
    this.tone(1174, 0.22, 'sine', 0.05);
  }

  coin() {
    this.tone(1250, 0.07, 'square', 0.04, 900);
  }

  suspicious() {
    this.tone(330, 0.16, 'sawtooth', 0.05, 392);
  }

  spotted() {
    this.tone(220, 0.14, 'sawtooth', 0.08, 440);
    this.tone(440, 0.2, 'sawtooth', 0.06, 660);
  }

  wardenSting() {
    this.tone(196, 0.3, 'sawtooth', 0.07, 98);
  }

  caught() {
    this.tone(160, 0.5, 'sawtooth', 0.09, 55);
  }

  win() {
    this.tone(523, 0.12, 'triangle', 0.08);
    this.tone(659, 0.12, 'triangle', 0.08);
    this.tone(784, 0.24, 'triangle', 0.08);
  }

  emp() {
    this.tone(1200, 0.35, 'sawtooth', 0.06, 120);
  }

  hack() {
    this.tone(980, 0.06, 'square', 0.05);
    this.tone(1240, 0.06, 'square', 0.05);
    this.tone(1560, 0.1, 'square', 0.05);
  }

  safeTick() {
    this.tone(1800, 0.03, 'square', 0.03);
  }

  safeOpen() {
    this.tone(392, 0.1, 'triangle', 0.07);
    this.tone(587, 0.18, 'triangle', 0.07);
  }

  startAlarm() {
    if (!this.ctx || this.muted || this.alarmNode) return;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 110;
    amp.gain.value = 0.025;
    osc.connect(amp).connect(this.ctx.destination);
    osc.start();
    this.alarmNode = { osc, amp };
  }

  stopAlarm() {
    if (!this.alarmNode) return;
    try {
      this.alarmNode.osc.stop();
    } catch {
      // Already stopped.
    }
    this.alarmNode = null;
  }
}
