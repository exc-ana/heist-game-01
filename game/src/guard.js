// Midnight Vault — the guards: waypoint patrols, vision cones, suspicion.
// States: patrol → suspicious (investigate the last seen spot) →
// spotted (chase the thief) → search (lost the thief, look around) →
// return (walk back to the patrol route). Suspicion 0–100; at 100 the
// guard spots the thief and gives chase. A guard that touches the thief
// catches them. Detection is faster up close, slower when the thief
// sneaks or hides in shadow, faster when the thief runs.

import { GUARD, TILE } from './config.js';
import { clamp } from './random.js';

export const GUARD_STATE = {
  PATROL: 'patrol',
  INVESTIGATE: 'investigate',
  CHASE: 'chase',
  SEARCH: 'search',
  RETURN: 'return',
};

function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(current, target, maxStep) {
  const d = angleDiff(target, current);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

export class Guard {
  constructor(def) {
    this.x = (def.x + 0.5) * TILE;
    this.y = (def.y + 0.5) * TILE;
    this.waypoints = def.waypoints.map(([wx, wy]) => ({
      x: (wx + 0.5) * TILE,
      y: (wy + 0.5) * TILE,
    }));
    this.speed = def.speed || 1;
    this.wpIndex = 1 % this.waypoints.length;
    this.angle = angleTo(this.x, this.y, this.waypoints[this.wpIndex].x, this.waypoints[this.wpIndex].y);
    this.state = GUARD_STATE.PATROL;
    this.suspicion = 0;
    this.lastSeen = null;
    this.stateTime = 0;
    this.searchSpots = [];
    this.caughtPlayer = false;
    this.wasSeen = false; // true while the thief is inside this cone this frame
  }

  /** Cone test: range, angle, line of sight. Returns 0..1 (0 = not seen). */
  sees(world, px, py, sneaking, inShadow, running) {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD.coneRange) return 0;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, this.angle)) > GUARD.coneHalf) return 0;
    if (!world.hasLineOfSight(this.x, this.y, px, py)) return 0;
    let gain = dist < 110 ? GUARD.gainClose : dist < 190 ? GUARD.gainMid : GUARD.gainFar;
    if (sneaking) gain *= GUARD.gainSneak;
    if (inShadow) gain *= GUARD.gainShadow;
    if (running) gain *= GUARD.gainRun;
    return gain;
  }

  update(dt, world, player) {
    this.stateTime += dt;
    this.wasSeen = false;
    const gain = this.sees(
      world, player.x, player.y, player.sneaking, player.inShadow, player.running,
    );
    if (gain > 0) {
      this.wasSeen = true;
      this.suspicion = clamp(this.suspicion + gain * dt, 0, 100);
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.suspicion = clamp(this.suspicion - GUARD.decay * dt, 0, 100);
    }

    if (this.suspicion >= GUARD.spottedAt && this.state !== GUARD_STATE.CHASE) {
      this.state = GUARD_STATE.CHASE;
      this.stateTime = 0;
    } else if (this.suspicion >= GUARD.suspiciousAt && this.state === GUARD_STATE.PATROL) {
      this.state = GUARD_STATE.INVESTIGATE;
      this.stateTime = 0;
    }

    switch (this.state) {
      case GUARD_STATE.PATROL:
        this.patrol(dt, world, GUARD.patrol * this.speed);
        break;
      case GUARD_STATE.INVESTIGATE: {
        const target = this.lastSeen;
        if (target && this.moveToward(dt, world, target.x, target.y, GUARD.investigate * this.speed)) {
          this.state = GUARD_STATE.SEARCH;
          this.stateTime = 0;
          this.searchSpots = [target];
        } else if (this.stateTime > GUARD.investigateTime) {
          this.state = GUARD_STATE.SEARCH;
          this.stateTime = 0;
        }
        break;
      }
      case GUARD_STATE.CHASE: {
        const target = this.lastSeen || { x: player.x, y: player.y };
        if (this.wasSeen) {
          this.moveToward(dt, world, player.x, player.y, GUARD.chase * this.speed);
        } else if (this.moveToward(dt, world, target.x, target.y, GUARD.chase * this.speed)) {
          this.state = GUARD_STATE.SEARCH;
          this.stateTime = 0;
        }
        if (this.stateTime > GUARD.searchTime + 3) {
          this.state = GUARD_STATE.RETURN;
          this.stateTime = 0;
        }
        break;
      }
      case GUARD_STATE.SEARCH:
        // Look around the last seen spot, then give up.
        this.angle += Math.sin(this.stateTime * 2.2) * dt * 1.4;
        if (this.stateTime > GUARD.searchTime || this.suspicion < 5) {
          this.state = GUARD_STATE.RETURN;
          this.stateTime = 0;
        }
        break;
      case GUARD_STATE.RETURN: {
        const wp = this.nearestWaypoint();
        if (this.moveToward(dt, world, wp.x, wp.y, GUARD.patrol * this.speed)) {
          this.wpIndex = this.waypoints.indexOf(wp);
          this.state = GUARD_STATE.PATROL;
          this.stateTime = 0;
        }
        break;
      }
    }

    // Caught: a guard that reaches the thief ends the heist.
    if (Math.hypot(player.x - this.x, player.y - this.y) < GUARD.radius + 13) {
      this.caughtPlayer = true;
    }
  }

  nearestWaypoint() {
    let best = this.waypoints[0];
    let bestD = Infinity;
    for (const wp of this.waypoints) {
      const d = Math.hypot(wp.x - this.x, wp.y - this.y);
      if (d < bestD) {
        bestD = d;
        best = wp;
      }
    }
    return best;
  }

  patrol(dt, world, speed) {
    const target = this.waypoints[this.wpIndex];
    if (this.moveToward(dt, world, target.x, target.y, speed)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
    }
  }

  /** Walk toward a point; returns true when arrived. Turns to face the walk. */
  moveToward(dt, world, tx, ty, speed) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const want = Math.atan2(dy, dx);
    this.angle = turnToward(this.angle, want, dt * 6);
    const step = Math.min(dist, speed * dt);
    const pos = world.moveCircle(this.x, this.y, Math.cos(this.angle) * step, Math.sin(this.angle) * step, GUARD.radius);
    this.x = pos.x;
    this.y = pos.y;
    return dist - step < 4;
  }
}
