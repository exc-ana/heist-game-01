// Midnight Vault — the room itself: tiles, collision, line of sight.
// A level's data becomes a 32x18 tile grid. Tile kinds:
//   0 floor, 1 wall (solid, blocks sight), 2 crate (solid, blocks sight),
//   3 shadow floor (walkable; the thief is hard to see standing on it).

import { COLS, ROWS, TILE } from './config.js';

export const T_FLOOR = 0;
export const T_WALL = 1;
export const T_CRATE = 2;
export const T_SHADOW = 3;

export class World {
  constructor(level) {
    this.level = level;
    this.grid = new Uint8Array(COLS * ROWS);
    // Border walls.
    for (let x = 0; x < COLS; x++) {
      this.set(x, 0, T_WALL);
      this.set(x, ROWS - 1, T_WALL);
    }
    for (let y = 0; y < ROWS; y++) {
      this.set(0, y, T_WALL);
      this.set(COLS - 1, y, T_WALL);
    }
    for (const w of level.walls) {
      for (let y = w.y; y < w.y + w.h; y++) {
        for (let x = w.x; x < w.x + w.w; x++) this.set(x, y, T_WALL);
      }
    }
    for (const [x, y] of level.crates) this.set(x, y, T_CRATE);
    for (const [x, y] of level.shadow) {
      if (this.get(x, y) === T_FLOOR) this.set(x, y, T_SHADOW);
    }
    this.loot = level.loot.map((l) => ({
      x: (l.x + 0.5) * TILE,
      y: (l.y + 0.5) * TILE,
      tileX: l.x,
      tileY: l.y,
      kind: l.kind,
      taken: false,
    }));
    this.exit = { x: (level.exit.x + 0.5) * TILE, y: (level.exit.y + 0.5) * TILE };
    this.playerStart = {
      x: (level.playerStart.x + 0.5) * TILE,
      y: (level.playerStart.y + 0.5) * TILE,
    };
    this.vaultTotal = this.loot.filter((l) => l.kind === 'vault').length;
  }

  set(x, y, v) {
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) this.grid[y * COLS + x] = v;
  }

  get(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return T_WALL;
    return this.grid[y * COLS + x];
  }

  tileAt(px, py) {
    return this.get(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  isSolid(px, py) {
    const t = this.tileAt(px, py);
    return t === T_WALL || t === T_CRATE;
  }

  blocksSight(px, py) {
    return this.isSolid(px, py);
  }

  isShadow(px, py) {
    return this.tileAt(px, py) === T_SHADOW;
  }

  /** Circle-vs-tiles collision: slide along walls, never tunnel through. */
  moveCircle(x, y, dx, dy, radius) {
    let nx = x + dx;
    if (!this.isSolid(nx + Math.sign(dx) * radius, y - radius + 1) &&
        !this.isSolid(nx + Math.sign(dx) * radius, y + radius - 1)) {
      x = nx;
    }
    let ny = y + dy;
    if (!this.isSolid(x - radius + 1, ny + Math.sign(dy) * radius) &&
        !this.isSolid(x + radius - 1, ny + Math.sign(dy) * radius)) {
      y = ny;
    }
    return { x, y };
  }

  /** True when the segment between two points crosses no solid tile. */
  hasLineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / (TILE / 3)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.blocksSight(x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  /** Distance to the first solid tile along a ray, capped at maxDist. */
  rayDistance(x, y, angle, maxDist) {
    const step = 6;
    const dx = Math.cos(angle) * step;
    const dy = Math.sin(angle) * step;
    let cx = x;
    let cy = y;
    for (let d = step; d <= maxDist; d += step) {
      cx += dx;
      cy += dy;
      if (this.blocksSight(cx, cy)) return d;
    }
    return maxDist;
  }

  lootAt(px, py) {
    for (const l of this.loot) {
      if (!l.taken && Math.hypot(l.x - px, l.y - py) < TILE * 0.7) return l;
    }
    return null;
  }

  takeLoot(l) {
    l.taken = true;
  }

  get vaultTaken() {
    return this.loot.filter((l) => l.kind === 'vault' && l.taken).length;
  }

  get allVaultTaken() {
    return this.vaultTaken >= this.vaultTotal;
  }

  get goldTaken() {
    return this.loot.filter((l) => l.kind === 'gold' && l.taken).length;
  }

  atExit(px, py) {
    return Math.hypot(this.exit.x - px, this.exit.y - py) < TILE * 0.8;
  }

  /** Flood-fill from the player start; returns every tile that cannot be reached. */
  validate() {
    const problems = [];
    const seen = new Uint8Array(COLS * ROWS);
    const stack = [[this.level.playerStart.x, this.level.playerStart.y]];
    seen[this.level.playerStart.y * COLS + this.level.playerStart.x] = 1;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;
        if (seen[ny * COLS + nx]) continue;
        const t = this.get(nx, ny);
        if (t === T_WALL || t === T_CRATE) continue;
        seen[ny * COLS + nx] = 1;
        stack.push([nx, ny]);
      }
    }
    const mustReach = [];
    for (const l of this.level.loot) mustReach.push(['loot ' + l.kind, l.x, l.y]);
    mustReach.push(['exit', this.level.exit.x, this.level.exit.y]);
    mustReach.push(['player start', this.level.playerStart.x, this.level.playerStart.y]);
    for (const g of this.level.guards) {
      mustReach.push(['guard spawn', g.x, g.y]);
      for (const [wx, wy] of g.waypoints) mustReach.push(['guard waypoint', wx, wy]);
    }
    for (const c of this.level.cameras) mustReach.push(['camera', c.x, c.y]);
    for (const [label, tx, ty] of mustReach) {
      if (!seen[ty * COLS + tx]) problems.push(`${label} at (${tx},${ty}) unreachable`);
    }
    // Every guard patrol segment must be a clear straight line.
    for (const g of this.level.guards) {
      for (let i = 0; i + 1 < g.waypoints.length; i++) {
        const [ax, ay] = g.waypoints[i];
        const [bx, by] = g.waypoints[i + 1];
        const x0 = (ax + 0.5) * TILE;
        const y0 = (ay + 0.5) * TILE;
        const x1 = (bx + 0.5) * TILE;
        const y1 = (by + 0.5) * TILE;
        if (!this.hasLineOfSight(x0, y0, x1, y1)) {
          problems.push(`guard patrol segment (${ax},${ay})->(${bx},${by}) blocked`);
        }
      }
    }
    // Rows must be consistent: no loot/exit on a solid tile.
    for (const l of this.level.loot) {
      const t = this.get(l.x, l.y);
      if (t === T_WALL || t === T_CRATE) problems.push(`loot at (${l.x},${l.y}) on solid tile`);
    }
    return problems;
  }
}
