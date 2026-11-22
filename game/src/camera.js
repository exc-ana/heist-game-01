// Midnight Vault — the security cameras: wall domes that sweep their
// vision cone back and forth. A camera that sees the thief feeds the
// alarm meter; it never catches anyone itself. One EMP pulse knocks
// every camera offline for a few seconds.

import { CAMERA, TILE } from './config.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Camera {
  constructor(def) {
    this.x = (def.x + 0.5) * TILE;
    this.y = (def.y + 0.5) * TILE;
    this.baseAngle = def.angle;
    this.angle = def.angle;
    this.sweepPhase = 0;
    this.offline = 0; // seconds left dark
    this.seeing = false; // true while the thief is inside this cone
  }

  update(dt, world, player) {
    this.seeing = false;
    if (this.offline > 0) {
      this.offline -= dt;
      return;
    }
    this.sweepPhase += dt * CAMERA.sweepSpeed;
    this.angle = this.baseAngle + Math.sin(this.sweepPhase) * CAMERA.sweep;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CAMERA.range) return;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, this.angle)) > CAMERA.coneHalf) return;
    if (!world.hasLineOfSight(this.x, this.y, player.x, player.y)) return;
    this.seeing = true;
  }

  /** Cone polygon for the renderer: the arc clipped by walls. */
  conePolygon(world) {
    const pts = [{ x: this.x, y: this.y }];
    const n = CAMERA.rays;
    for (let i = 0; i <= n; i++) {
      const a = this.angle - CAMERA.coneHalf + (2 * CAMERA.coneHalf * i) / n;
      const d = world.rayDistance(this.x, this.y, a, CAMERA.range);
      pts.push({ x: this.x + Math.cos(a) * d, y: this.y + Math.sin(a) * d });
    }
    return pts;
  }

  shutdown(seconds) {
    this.offline = Math.max(this.offline, seconds);
  }
}
