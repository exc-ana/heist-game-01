// Midnight Vault v2 — the vault itself: tile grid, loot, collision and sight.
// The map text becomes a grid of tile kinds plus the loot, the exit and the
// thief's start. Everything that moves asks this class what is solid, what
// can be seen across a room, and whether a route is even possible.
import { TILE, COLS, ROWS, TILES } from './config.js';

const MARKS = {
  '#': TILES.WALL,
  '.': TILES.FLOOR,
  ',': TILES.CARPET,
  ':': TILES.SHADOW,
  '*': TILES.LAMP,
  X: TILES.CRATE,
};
const LOOT_MARKS = { G: 'gold', V: 'vault', A: 'painting', S: 'safe' };

export class World {
  constructor(level) {
    this.title = level.title;
    this.grid = new Uint8Array(COLS * ROWS);
    this.loot = [];
    this.lamps = [];
    this.exit = { x: 0, y: 0 };
    this.start = { x: 0, y: 0 };
    for (let row = 0; row < ROWS; row++) {
      const line = level.map[row] ?? '';
      for (let col = 0; col < COLS; col++) {
        const ch = line[col] ?? '#';
        let kind = MARKS[ch];
        if (kind === undefined) {
          if (LOOT_MARKS[ch]) {
            kind = TILES.FLOOR;
            this.loot.push({
              kind: LOOT_MARKS[ch],
              x: (col + 0.5) * TILE,
              y: (row + 0.5) * TILE,
              taken: false,
              crack: 0,
            });
          } else if (ch === 'P') {
            kind = TILES.FLOOR;
            this.start = { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
          } else if (ch === 'E') {
            kind = TILES.FLOOR;
            this.exit = { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
          } else {
            kind = TILES.WALL;
          }
        }
        this.grid[row * COLS + col] = kind;
        if (kind === TILES.LAMP) {
          this.lamps.push({ x: (col + 0.5) * TILE, y: (row + 0.5) * TILE });
        }
      }
    }
    this.vaultTotal = this.loot.filter((l) => l.kind === 'vault').length;
    this.goldTaken = 0;
    this.def = level;
  }

  tileAt(px, py) {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return TILES.WALL;
    return this.grid[row * COLS + col];
  }

  solidAt(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    const kind = this.grid[row * COLS + col];
    return kind === TILES.WALL || kind === TILES.CRATE;
  }

  solidPx(px, py) {
    return this.solidAt(Math.floor(px / TILE), Math.floor(py / TILE));
  }

  // True when a circle of radius r centred at (x, y) touches a solid tile.
  blocked(x, y, r) {
    const c0 = Math.floor((x - r) / TILE);
    const c1 = Math.floor((x + r) / TILE);
    const r0 = Math.floor((y - r) / TILE);
    const r1 = Math.floor((y + r) / TILE);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (!this.solidAt(col, row)) continue;
        const nearX = Math.max(col * TILE, Math.min(x, (col + 1) * TILE));
        const nearY = Math.max(row * TILE, Math.min(y, (row + 1) * TILE));
        if ((x - nearX) ** 2 + (y - nearY) ** 2 < r * r) return true;
      }
    }
    return false;
  }

  // True when nothing solid stands between the two points.
  lineClear(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.solidPx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  onCarpet(x, y) {
    return this.tileAt(x, y) === TILES.CARPET;
  }

  inShadow(x, y) {
    return this.tileAt(x, y) === TILES.SHADOW;
  }

  // Nearest pocketable loot within reach. Safes are never pocketed on
  // touch — they open only by cracking, which the game handles itself.
  lootAt(x, y) {
    for (const l of this.loot) {
      if (l.taken || l.kind === 'safe') continue;
      if (Math.hypot(l.x - x, l.y - y) < 26) return l;
    }
    return null;
  }

  takeLoot(item) {
    if (item.taken) return;
    item.taken = true;
    if (item.kind === 'gold') this.goldTaken += 1;
  }

  get allVaultTaken() {
    return this.loot.filter((l) => l.kind === 'vault').every((l) => l.taken);
  }

  atExit(x, y) {
    return Math.hypot(this.exit.x - x, this.exit.y - y) < 30;
  }

  // Every loot, the exit, the start, each sentry spawn and waypoint and
  // each lens must be reachable on foot from the start, and every patrol
  // leg must be a straight clear line.
  validate() {
    const problems = [];
    const seen = new Set();
    const queue = [[Math.floor(this.start.x / TILE), Math.floor(this.start.y / TILE)]];
    seen.add(queue[0].join(','));
    while (queue.length) {
      const [cx, cy] = queue.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        const key = `${nx},${ny}`;
        if (!seen.has(key) && !this.solidAt(nx, ny)) {
          seen.add(key);
          queue.push([nx, ny]);
        }
      }
    }
    const reachable = (px, py) => seen.has(`${Math.floor(px / TILE)},${Math.floor(py / TILE)}`);
    if (!reachable(this.start.x, this.start.y)) problems.push('start is walled in');
    if (!reachable(this.exit.x, this.exit.y)) problems.push('exit is unreachable');
    for (const l of this.loot) {
      if (!reachable(l.x, l.y)) problems.push(`${l.kind} loot is unreachable`);
    }
    for (const s of this.def.guards) {
      const sx = (s.tx + 0.5) * TILE;
      const sy = (s.ty + 0.5) * TILE;
      if (!reachable(sx, sy)) problems.push(`${s.kind} sentry spawns unreachable`);
      const points = s.path.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
      for (const p of points) {
        if (!reachable(p.x, p.y)) problems.push(`${s.kind} waypoint is unreachable`);
      }
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if (!this.lineClear(a.x, a.y, b.x, b.y)) {
          problems.push(`${s.kind} patrol leg is blocked`);
        }
      }
    }
    for (const lens of this.def.cameras) {
      const lx = (lens.tx + 0.5) * TILE;
      const ly = (lens.ty + 0.5) * TILE;
      if (!reachable(lx, ly)) problems.push('lens is unreachable');
    }
    if (this.vaultTotal < 1) problems.push('no vault loot');
    if (this.loot.length < 1) problems.push('no loot at all');
    return problems;
  }
}
