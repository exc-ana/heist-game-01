// Midnight Vault v2 — staged scenes for the four screenshots.
// ?shot=title | play | alert | win, with ?seed= for the dust. Each scene is
// built from the same deterministic level data, so the same URL always
// renders the same picture. The play shot is the one that matters: one
// frame must show the room, the thief, guards with cones, a camera, a loot
// target and the alarm meter.
import { TILE, COLS, ROWS, TILES } from './config.js';
import { SENTRY_STATE } from './guard.js';

// The shadow tile nearest the middle of the room: the thief's crouch spot.
function shadowSpot(world) {
  let best = null;
  let bestD = Infinity;
  for (let row = 1; row < ROWS - 1; row++) {
    for (let col = 1; col < COLS - 1; col++) {
      if (world.grid[row * COLS + col] !== TILES.SHADOW) continue;
      const d = (col - COLS / 2) ** 2 + (row - ROWS / 2) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
      }
    }
  }
  return best ?? { x: 12.5 * TILE, y: 8.5 * TILE };
}

export function stageShot(game, shot) {
  const { world, player, guards, cameras } = game;
  if (shot === 'title') {
    game.status = 'title';
    return;
  }
  if (shot === 'play') {
    // Mid-heist: one vault diamond already pocketed, the thief crouched
    // in shadow near the middle, a guard grown suspicious and sweeping
    // its cone toward them, a camera sweeping, the alarm part-filled.
    game.status = 'playing';
    const vault = world.loot.find((l) => l.kind === 'vault');
    if (vault) {
      world.takeLoot(vault);
      game.score += 500;
    }
    const spot = shadowSpot(world);
    player.x = spot.x;
    player.y = spot.y;
    player.sneaking = true;
    player.facing = Math.PI / 4;
    const guard = guards[0];
    guard.x = (13.5) * TILE;
    guard.y = (5.5) * TILE;
    guard.suspicion = 58;
    guard.state = SENTRY_STATE.INVESTIGATE;
    guard.lastSeen = { x: player.x + 120, y: player.y - 40 };
    guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
    game.alarm = 31;
    game.time = 52;
    return;
  }
  if (shot === 'alert') {
    // Caught in the open: the nearest guard is chasing, suspicion full,
    // the alarm nearly tripped, a camera locked on.
    game.status = 'playing';
    const guard = guards[0];
    player.x = guard.x + 90;
    player.y = guard.y + 26;
    player.facing = Math.PI;
    guard.state = SENTRY_STATE.CHASE;
    guard.suspicion = 100;
    guard.lastSeen = { x: player.x, y: player.y };
    guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
    if (cameras[0]) {
      cameras[0].angle = Math.atan2(player.y - cameras[0].y, player.x - cameras[0].x);
      cameras[0].seeing = true;
    }
    game.alarm = 84;
    game.spottedCount = 1;
    game.time = 97;
    return;
  }
  if (shot === 'win') {
    // The getaway: every vault diamond pocketed, the thief one step from
    // the green exit, the alarm settling back down.
    game.status = 'playing';
    for (const l of world.loot) {
      if (l.kind === 'vault') {
        world.takeLoot(l);
        game.score += 500;
      }
    }
    player.x = world.exit.x - TILE * 1.5;
    player.y = world.exit.y + TILE * 0.5;
    player.facing = 0;
    game.alarm = 11;
    game.time = 151;
    return;
  }
  game.status = 'title';
}

export function shotList() {
  return ['title', 'play', 'alert', 'win'];
}

export function describeShot(shot) {
  return {
    title: 'Title screen',
    play: 'Mid-heist, sneaking past a patrol',
    alert: 'Spotted — a guard gives chase',
    win: 'All vault loot pocketed, reaching the exit',
  }[shot];
}
