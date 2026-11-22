// Midnight Vault — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales
// it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walk: 175,
  sneak: 95,
  run: 265,
  coins: 3,
  emp: 1,
};

export const GUARD = {
  radius: 14,
  patrol: 105,
  investigate: 150,
  chase: 215,
  coneRange: 270,
  coneHalf: 0.61, // ~35 degrees
  rays: 26,
  suspiciousAt: 35,
  spottedAt: 100,
  // Suspicion gained per second while the thief is inside the cone.
  gainClose: 95,
  gainMid: 55,
  gainFar: 30,
  gainSneak: 0.45,
  gainShadow: 0.35,
  gainRun: 1.6,
  decay: 22,
  investigateTime: 4,
  searchTime: 5,
};

export const CAMERA = {
  range: 300,
  coneHalf: 0.44, // ~25 degrees
  rays: 22,
  sweep: 0.9, // radians either side of the base angle
  sweepSpeed: 0.55, // radians per second
  alarmGain: 34, // alarm points per second while the thief is seen
  offlineSeconds: 6, // how long one EMP keeps every camera dark
};

export const ALARM = {
  max: 100,
  decay: 9, // points per second while unseen
  lockdownAt: 100, // alarm full: every guard hunts the thief
  lockdownSeconds: 6,
};

export const LOOT = {
  gold: 100,
  vault: 500,
};

export const COIN = {
  radius: 5,
  hearRadius: 240,
  throwSpeed: 420,
};

export const PALETTE = {
  backdrop: '#0a0c12',
  floorA: '#171a24',
  floorB: '#14171f',
  floorLine: '#1e2230',
  wall: '#2b3040',
  wallTop: '#3d4459',
  wallTrim: '#c9a227',
  crate: '#5a4632',
  crateTop: '#7a6248',
  shadow: '#0e1424',
  shadowEdge: '#1b2742',
  gold: '#f2c94c',
  vault: '#7ee7ff',
  exit: '#39d98a',
  exitGlow: '#1d7a4c',
  player: '#e8e4d8',
  playerCloak: '#232838',
  guard: '#e5534b',
  guardDark: '#8c2f2a',
  cone: 'rgba(229, 83, 75, 0.20)',
  coneEdge: 'rgba(229, 83, 75, 0.45)',
  coneSuspicious: 'rgba(242, 201, 76, 0.28)',
  cam: '#ff9f43',
  camCone: 'rgba(255, 159, 67, 0.18)',
  camConeEdge: 'rgba(255, 159, 67, 0.5)',
  alarm: '#e5534b',
  alarmWarn: '#f2c94c',
  panel: '#12151f',
  panelEdge: '#2a3040',
  text: '#eef1f5',
  muted: '#8b93a3',
  danger: '#ff5a4e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault.best';
