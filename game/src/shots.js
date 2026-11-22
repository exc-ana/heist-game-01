// Midnight Vault — staged scenes for the screenshots.
// ?shot=title | play | alert | win, with ?seed= for the dust.
// Each scene is built from the same deterministic level data, so the
// same URL always renders the same picture. The play shot is the one
// that matters: one frame must show the room, the thief, guards with
// cones, a camera, a loot target and the alarm meter.

import { GUARD_STATE } from './guard.js';
import { TILE } from './config.js';

// Find a shadow tile near the middle of the room for the thief to crouch on.
function findShadowTile(world) {
  for (let y = 1; y < 17; y++) {
    for (let x = 1; x < 31; x++) {
      if (world.tileAt((x + 0.5) * TILE, (y + 0.5) * TILE) === 3) return { x, y };
    }
  }
  return { x: 12, y: 8 };
}

function aimGuardAt(guard, player) {
  guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
}

export function stageShot(game, shot) {
  const { world, player, guards, cameras } = game;
  if (shot === 'title') {
    game.status = 'title';
    return;
  }
  if (shot === 'play') {
    // Mid-heist: one vault diamond already pocketed, the thief crouched
    // in shadow at a cone's edge, a guard suspicious, a camera sweeping
    // across the room, the alarm meter part-filled.
    game.status = 'playing';
    const vault = world.loot.find((l) => l.kind === 'vault');
    if (vault) {
      world.takeLoot(vault);
      game.score += 500;
    }
    const shadow = findShadowTile(world);
    player.x = (shadow.x + 0.5) * TILE;
    player.y = (shadow.y + 0.5) * TILE;
    player.sneaking = true;
    player.facing = Math.PI / 4;
    const guard = guards[0];
    guard.suspicion = 55;
    guard.state = GUARD_STATE.INVESTIGATE;
    guard.lastSeen = { x: player.x + 120, y: player.y - 40 };
    aimGuardAt(guard, player);
    game.alarm = 34;
    game.time = 47;
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
    guard.state = GUARD_STATE.CHASE;
    guard.suspicion = 100;
    guard.lastSeen = { x: player.x, y: player.y };
    aimGuardAt(guard, player);
    if (cameras[0]) {
      cameras[0].angle = Math.atan2(player.y - cameras[0].y, player.x - cameras[0].x);
      cameras[0].seeing = true;
    }
    game.alarm = 82;
    game.spottedCount = 1;
    game.time = 96;
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
    game.alarm = 12;
    game.time = 148;
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
