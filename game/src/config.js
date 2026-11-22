// Midnight Vault v2 — every number the game balances on, in one place.
// Sizes, speeds, sight cones, loot values and tool limits live here so a
// tweak lands once and the whole game follows it.
export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 46;

// Tile kinds stored in the world grid.
export const TILES = { WALL: 0, FLOOR: 1, CARPET: 2, SHADOW: 3, LAMP: 4, CRATE: 5 };

export const THIEF = {
  radius: 13,
  walk: 165,
  run: 238,
  sneak: 92,
  coins: 3,
  emps: 1,
  hacks: 2,
};

// One profile per sentry kind: how fast it walks and chases, how far and
// how wide it sees, and how fast it grows suspicious.
export const SENTRY_KINDS = {
  patrol: { speed: 78, chase: 128, view: 232, half: 0.62, gain: 1.0, roam: 1.0 },
  warden: { speed: 0, chase: 55, view: 305, half: 0.5, gain: 1.45, roam: 0 },
  rover: { speed: 118, chase: 168, view: 178, half: 0.72, gain: 0.85, roam: 1.5 },
};

export const SENTRY = {
  radius: 13,
  catch: 27,
  sweep: 1.15,
  max: 100,
  decay: 26,
  chaseTime: 2.2,
  searchTime: 3.0,
  investigateTime: 4.0,
};

export const LENS = {
  view: 252,
  half: 0.55,
  sweep: 0.85,
  sweepSpeed: 0.55,
  alarmGain: 13,
  empOff: 6,
  hackOff: 8,
  hackRange: 95,
};

export const METER = { max: 100, decay: 9, lockdown: 6 };

export const PRIZE = { gold: 100, painting: 150, safe: 250, vault: 500 };

export const SAFE_CRACK = 2.0;
export const COIN_HEAR = 150;
