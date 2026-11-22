// Midnight Vault — the thief: walk, sneak, run, throw coins, fire the EMP.
// Sneaking is slow and quiet; running is fast and loud; standing in a
// shadow tile makes guards and cameras much slower to notice you.

import { PLAYER, COIN, TILE } from './config.js';

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 0; // radians, for the cloak's direction
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.inShadow = false;
    this.coins = PLAYER.coins;
    this.emp = PLAYER.emp;
    this.stepPhase = 0;
    this.coinFlight = null; // { x, y, tx, ty } while a coin is in the air
    this.thrownCoins = []; // landed coins guards can hear
  }

  update(dt, world, input) {
    let ix = 0;
    let iy = 0;
    if (input.left) ix -= 1;
    if (input.right) ix += 1;
    if (input.up) iy -= 1;
    if (input.down) iy += 1;
    this.sneaking = input.sneak && !input.run;
    this.running = input.run && !input.sneak;
    const speed = this.sneaking ? PLAYER.sneak : this.running ? PLAYER.run : PLAYER.walk;
    const len = Math.hypot(ix, iy) || 1;
    this.moving = ix !== 0 || iy !== 0;
    if (this.moving) {
      this.vx = (ix / len) * speed;
      this.vy = (iy / len) * speed;
      this.facing = Math.atan2(this.vy, this.vx);
      this.stepPhase += dt * (this.sneaking ? 5 : this.running ? 11 : 8);
    } else {
      this.vx = 0;
      this.vy = 0;
    }
    const pos = world.moveCircle(this.x, this.y, this.vx * dt, this.vy * dt, PLAYER.radius);
    this.x = pos.x;
    this.y = pos.y;
    this.inShadow = world.isShadow(this.x, this.y);

    // A thrown coin flies to its tile, then rings and waits to be heard.
    if (this.coinFlight) {
      const c = this.coinFlight;
      const dx = c.tx - c.x;
      const dy = c.ty - c.y;
      const dist = Math.hypot(dx, dy);
      const step = COIN.throwSpeed * dt;
      if (dist <= step) {
        this.thrownCoins.push({ x: c.tx, y: c.ty, ttl: 3 });
        this.coinFlight = null;
      } else {
        c.x += (dx / dist) * step;
        c.y += (dy / dist) * step;
      }
    }
    for (const c of this.thrownCoins) c.ttl -= dt;
    this.thrownCoins = this.thrownCoins.filter((c) => c.ttl > 0);
  }

  /** Throw a coin at a floor tile; returns false when out of coins. */
  throwCoin(tx, ty) {
    if (this.coins <= 0 || this.coinFlight) return false;
    this.coins -= 1;
    this.coinFlight = { x: this.x, y: this.y, tx, ty };
    return true;
  }

  /** Fire the EMP; returns false when already used up. */
  fireEmp() {
    if (this.emp <= 0) return false;
    this.emp -= 1;
    return true;
  }

  /** Loudness radius: guards inside it hear the thief running. */
  noiseRadius() {
    if (this.running && this.moving) return 150;
    if (this.moving && !this.sneaking) return 55;
    return 0;
  }
}
