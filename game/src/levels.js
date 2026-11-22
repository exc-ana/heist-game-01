// Midnight Vault — the three heists, as data.
// Coordinates are tiles on a 32x18 grid (tile 40px, field 1280x720).
// Border walls are added by the world; everything below is interior.
// Loot: { kind: 'gold' } is optional score, { kind: 'vault' } must all
// be pocketed before the exit opens. Guards patrol straight segments;
// every waypoint pair must be clear of solid tiles (validated).

export const LEVELS = [
  {
    name: 'The Gilded Gallery',
    intro: 'A moonlit museum. Pocket the vault diamond and reach the green exit unseen.',
    walls: [
      { x: 15, y: 4, w: 1, h: 3 }, // spine, upper half
      { x: 15, y: 11, w: 1, h: 3 }, // spine, lower half
      { x: 6, y: 6, w: 4, h: 1 },
      { x: 22, y: 6, w: 4, h: 1 },
      { x: 6, y: 11, w: 4, h: 1 },
      { x: 22, y: 11, w: 4, h: 1 },
    ],
    crates: [
      [5, 3], [6, 3], [5, 4],
      [25, 3], [26, 3], [26, 4],
      [5, 13], [6, 13], [6, 14],
      [25, 13], [26, 13], [25, 14],
      [10, 8], [10, 9],
      [21, 8], [21, 9],
    ],
    shadow: [
      [3, 1], [4, 1], [5, 1], [6, 1], [25, 1], [26, 1], [27, 1], [28, 1],
      [3, 16], [4, 16], [5, 16], [6, 16], [25, 16], [26, 16], [27, 16], [28, 16],
      [12, 8], [12, 9], [19, 8], [19, 9],
    ],
    loot: [
      { x: 4, y: 8, kind: 'gold' },
      { x: 27, y: 8, kind: 'gold' },
      { x: 16, y: 8, kind: 'vault' },
      { x: 10, y: 14, kind: 'gold' },
      { x: 21, y: 3, kind: 'gold' },
    ],
    exit: { x: 29, y: 8 },
    playerStart: { x: 2, y: 8 },
    guards: [
      { x: 4, y: 2, waypoints: [[4, 2], [28, 2]], speed: 1 },
      { x: 4, y: 15, waypoints: [[4, 15], [28, 15]], speed: 1 },
    ],
    cameras: [
      { x: 16, y: 1, angle: Math.PI / 2 },
      { x: 16, y: 16, angle: -Math.PI / 2 },
    ],
  },
  {
    name: 'The Iron Vault',
    intro: 'A bank after hours. Two vault diamonds, one in each strongroom.',
    walls: [
      { x: 10, y: 2, w: 1, h: 6 }, // left strongroom wall, door at y 8-9
      { x: 10, y: 10, w: 1, h: 6 },
      { x: 21, y: 2, w: 1, h: 6 }, // right strongroom wall, door at y 8-9
      { x: 21, y: 10, w: 1, h: 6 },
      { x: 12, y: 4, w: 4, h: 1 },
      { x: 17, y: 13, w: 3, h: 1 },
    ],
    crates: [
      [4, 4], [5, 4], [4, 5],
      [26, 12], [27, 12], [27, 13],
      [13, 9], [14, 9],
      [18, 7], [18, 8],
    ],
    shadow: [
      [2, 2], [3, 2], [2, 3],
      [28, 15], [29, 15], [29, 14],
      [12, 15], [13, 15],
      [19, 2], [20, 2],
    ],
    loot: [
      { x: 5, y: 8, kind: 'vault' },
      { x: 26, y: 8, kind: 'vault' },
      { x: 2, y: 15, kind: 'gold' },
      { x: 29, y: 2, kind: 'gold' },
      { x: 16, y: 2, kind: 'gold' },
      { x: 16, y: 15, kind: 'gold' },
    ],
    exit: { x: 29, y: 15 },
    playerStart: { x: 2, y: 2 },
    guards: [
      { x: 16, y: 3, waypoints: [[16, 3], [16, 14]], speed: 1 },
      { x: 3, y: 6, waypoints: [[3, 6], [7, 6]], speed: 1 },
      { x: 24, y: 11, waypoints: [[24, 11], [28, 11]], speed: 1 },
    ],
    cameras: [
      { x: 16, y: 1, angle: Math.PI / 2 },
      { x: 16, y: 16, angle: -Math.PI / 2 },
    ],
  },
  {
    name: 'The Penthouse Roof',
    intro: 'Open rooftop, four guards, three cameras. Take both diamonds and vanish.',
    walls: [
      { x: 5, y: 5, w: 4, h: 1 },
      { x: 23, y: 5, w: 4, h: 1 },
      { x: 5, y: 12, w: 4, h: 1 },
      { x: 23, y: 12, w: 4, h: 1 },
      { x: 15, y: 7, w: 2, h: 4 }, // central skylight block
    ],
    crates: [
      [3, 3], [4, 3], [3, 4],
      [27, 3], [28, 3], [28, 4],
      [3, 13], [4, 13], [3, 14],
      [27, 13], [28, 13], [28, 14],
      [10, 5], [11, 5],
      [20, 12], [21, 12],
      [12, 9], [19, 9],
    ],
    shadow: [
      [2, 1], [3, 1], [28, 1], [29, 1],
      [2, 16], [3, 16], [28, 16], [29, 16],
      [8, 8], [8, 9], [23, 8], [23, 9],
      [15, 2], [16, 2], [15, 15], [16, 15],
    ],
    loot: [
      { x: 8, y: 8, kind: 'vault' },
      { x: 23, y: 8, kind: 'vault' },
      { x: 4, y: 8, kind: 'gold' },
      { x: 27, y: 8, kind: 'gold' },
      { x: 16, y: 4, kind: 'gold' },
      { x: 16, y: 13, kind: 'gold' },
    ],
    exit: { x: 29, y: 8 },
    playerStart: { x: 2, y: 8 },
    guards: [
      { x: 6, y: 2, waypoints: [[6, 2], [25, 2]], speed: 1 },
      { x: 6, y: 15, waypoints: [[6, 15], [25, 15]], speed: 1 },
      { x: 5, y: 6, waypoints: [[5, 6], [5, 11]], speed: 1 },
      { x: 26, y: 6, waypoints: [[26, 6], [26, 11]], speed: 1 },
    ],
    cameras: [
      { x: 16, y: 1, angle: Math.PI / 2 },
      { x: 16, y: 16, angle: -Math.PI / 2 },
      { x: 30, y: 8, angle: Math.PI },
    ],
  },
];
