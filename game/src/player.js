// Midnight Vault v2 — the thief: movement, tools and the noise they make.
// Walk is quiet, running is loud enough to pull a guard over, sneaking is
// slow and silent, and carpet swallows every footstep — even a sprint.
// Coins are thrown with a click, the EMP with F, a camera hack with E.
import { THIEF } from './config.js';

export class Thief {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.facing = 0;
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.coins = THIEF.coins;
    this.emps = THIEF.emps;
    this.hacks = THIEF.hacks;
    this.thrownCoins = [];
    this.stepPhase = 0;
  }

  update(dt, world, input) {
    const ax = input.axis();
    this.running = input.running && (ax.x !== 0 || ax.y !== 0);
    this.sneaking = input.sneaking;
    const speed = this.sneaking ? THIEF.sneak : this.running ? THIEF.run : THIEF.walk;
    const mag = Math.hypot(ax.x, ax.y) || 1;
    const vx = (ax.x / mag) * speed;
    const vy = (ax.y / mag) * speed;
    this.moving = ax.x !== 0 || ax.y !== 0;
    if (this.moving) {
      this.facing = Math.atan2(vy, vx);
      this.stepPhase += dt * (this.sneaking ? 5 : this.running ? 11 : 8);
      this.slide(world, vx * dt, 0);
      this.slide(world, 0, vy * dt);
    }
    for (const c of this.thrownCoins) c.t += dt;
    this.thrownCoins = this.thrownCoins.filter((c) => c.t < 1.2);
  }

  slide(world, dx, dy) {
    const nx = this.x + dx;
    const ny = this.y + dy;
    if (!world.blocked(nx, ny, THIEF.radius)) {
      this.x = nx;
      this.y = ny;
    }
  }

  // How far away a guard hears these footsteps, or 0 for silence.
  noiseRadius(world) {
    if (world.onCarpet(this.x, this.y)) return 0;
    return this.running ? 95 : 0;
  }

  throwCoin(x, y) {
    if (this.coins <= 0) return false;
    this.coins -= 1;
    this.thrownCoins.push({ x, y, t: 0 });
    return true;
  }

  fireEmp() {
    if (this.emps <= 0) return false;
    this.emps -= 1;
    return true;
  }
}
