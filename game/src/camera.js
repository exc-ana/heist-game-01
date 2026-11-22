// Midnight Vault v2 — the lenses: wall cameras that sweep a cone and feed
// the alarm. A camera that sees the thief pours into the alarm meter; a
// hacked or EMP'd camera goes dark for a while and sees nothing.
import { TILE, LENS } from './config.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Lens {
  constructor(def) {
    this.x = (def.tx + 0.5) * TILE;
    this.y = (def.ty + 0.5) * TILE;
    this.base = def.face;
    this.arc = def.arc ?? LENS.sweep;
    this.angle = this.base;
    this.seeing = false;
    this.offline = 0;
    this.t = 0;
  }

  update(dt, world, thief) {
    this.t += dt;
    if (this.offline > 0) {
      this.offline -= dt;
      this.seeing = false;
      return;
    }
    this.angle = this.base + Math.sin(this.t * LENS.sweepSpeed) * this.arc;
    const dx = thief.x - this.x;
    const dy = thief.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > LENS.view) {
      this.seeing = false;
      return;
    }
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.angle)) > LENS.half) {
      this.seeing = false;
      return;
    }
    this.seeing = world.lineClear(this.x, this.y, thief.x, thief.y);
  }

  shutdown(seconds) {
    this.offline = Math.max(this.offline, seconds);
  }
}
