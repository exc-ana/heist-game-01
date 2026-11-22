// Midnight Vault v2 — the sentries: patrol, warden and rover.
// A sentry watches a cone. Seen, the thief's suspicion climbs; at full it
// gives chase, at a whiff it walks over to look, and when the trail goes
// cold it searches, then drifts back to its route. A warden never leaves
// its post — it sweeps one long cone and trusts it. A rover is fast and
// nervous, with a short cone and a slow fuse.
import { TILE, SENTRY_KINDS, SENTRY } from './config.js';

export const SENTRY_STATE = {
  PATROL: 'patrol',
  INVESTIGATE: 'investigate',
  CHASE: 'chase',
  SEARCH: 'search',
  RETURN: 'return',
};

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Sentry {
  constructor(def) {
    const profile = SENTRY_KINDS[def.kind];
    this.kind = def.kind;
    this.profile = profile;
    this.x = (def.tx + 0.5) * TILE;
    this.y = (def.ty + 0.5) * TILE;
    this.home = { x: this.x, y: this.y };
    this.route = def.path.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    this.leg = 0;
    this.face = def.face ?? 0;
    this.angle = this.face;
    this.state = SENTRY_STATE.PATROL;
    this.suspicion = 0;
    this.lastSeen = null;
    this.stateTime = 0;
    this.sweepT = 0;
    this.walkPhase = 0;
    this.seenFactor = 1;
    this.caughtPlayer = false;
  }

  // True when the thief stands inside this sentry's cone with a clear
  // line of sight. A thief crouched in shadow only shows up close, and
  // even then suspicion grows at a quarter pace.
  canSee(world, thief) {
    const dx = thief.x - this.x;
    const dy = thief.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.profile.view) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.angle)) > this.profile.half) return false;
    if (!world.lineClear(this.x, this.y, thief.x, thief.y)) return false;
    if (world.inShadow(thief.x, thief.y)) {
      if (dist > 90) return false;
      this.seenFactor = 0.25;
    } else {
      this.seenFactor = 1;
    }
    return true;
  }

  moveToward(dt, world, tx, ty, speed) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    if (!world.blocked(nx, this.y, SENTRY.radius)) this.x = nx;
    if (!world.blocked(this.x, ny, SENTRY.radius)) this.y = ny;
    this.angle = Math.atan2(dy, dx);
    this.walkPhase += step * 0.09;
    return Math.hypot(tx - this.x, ty - this.y) < 6;
  }

  update(dt, world, thief) {
    const seen = this.canSee(world, thief);
    if (seen) {
      const dist = Math.hypot(thief.x - this.x, thief.y - this.y);
      const closeness = 1 - (dist / this.profile.view) * 0.6;
      this.suspicion += 42 * closeness * this.profile.gain * this.seenFactor * dt;
      this.lastSeen = { x: thief.x, y: thief.y };
      if (this.suspicion >= SENTRY.max) {
        this.suspicion = SENTRY.max;
        if (this.state !== SENTRY_STATE.CHASE) {
          this.state = SENTRY_STATE.CHASE;
          this.stateTime = 0;
        }
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - SENTRY.decay * dt);
    }
    this.stateTime += dt;

    if (this.state === SENTRY_STATE.PATROL) {
      if (this.kind === 'warden') {
        this.sweepT += dt;
        this.angle = this.face + Math.sin(this.sweepT * 0.5) * SENTRY.sweep;
      } else if (this.route.length > 1) {
        const target = this.route[(this.leg + 1) % this.route.length];
        if (this.moveToward(dt, world, target.x, target.y, this.profile.speed)) {
          this.leg = (this.leg + 1) % this.route.length;
        }
      }
      if (this.suspicion >= 60 && this.lastSeen) {
        this.state = SENTRY_STATE.INVESTIGATE;
        this.stateTime = 0;
      }
    } else if (this.state === SENTRY_STATE.INVESTIGATE) {
      if (this.lastSeen) {
        const speed = this.profile.speed * 1.15;
        if (this.moveToward(dt, world, this.lastSeen.x, this.lastSeen.y, speed)) {
          this.state = SENTRY_STATE.SEARCH;
          this.stateTime = 0;
        }
      }
      if (this.suspicion < 25) {
        this.state = SENTRY_STATE.RETURN;
        this.stateTime = 0;
      }
    } else if (this.state === SENTRY_STATE.CHASE) {
      this.moveToward(dt, world, thief.x, thief.y, this.profile.chase);
      if (!seen && this.stateTime > SENTRY.chaseTime) {
        this.state = SENTRY_STATE.SEARCH;
        this.stateTime = 0;
      }
      if (this.suspicion < 30) {
        this.state = SENTRY_STATE.RETURN;
        this.stateTime = 0;
      }
    } else if (this.state === SENTRY_STATE.SEARCH) {
      this.angle += dt * 0.9;
      if (this.stateTime > SENTRY.searchTime) {
        this.state = SENTRY_STATE.RETURN;
        this.stateTime = 0;
      }
    } else if (this.state === SENTRY_STATE.RETURN) {
      const spot = this.route[this.leg] ?? this.home;
      if (this.moveToward(dt, world, spot.x, spot.y, this.profile.speed)) {
        this.state = SENTRY_STATE.PATROL;
        this.suspicion = 0;
        this.stateTime = 0;
      }
    }
  }
}
