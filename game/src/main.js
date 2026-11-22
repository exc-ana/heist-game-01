// Midnight Vault v2 — the game loop and the screens between heists.
// States: title → playing → caught | level-complete → victory.
// The loop runs on requestAnimationFrame; the simulation steps at a fixed
// 1/60s so a staged screenshot always looks the same.
import { VIEW_W, VIEW_H, SENTRY, LENS, METER, PRIZE, SAFE_CRACK, COIN_HEAR } from './config.js';
import { LEVELS } from './levels.js';
import { World } from './world.js';
import { Sentry, SENTRY_STATE } from './guard.js';
import { Lens } from './camera.js';
import { Thief } from './player.js';
import { Controls } from './input.js';
import { SoundBank } from './audio.js';
import { Renderer } from './render.js';
import { mulberry32, hashSeed } from './random.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? '20261122');

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Controls(canvas);
    this.sounds = new SoundBank();
    this.levelIndex = 0;
    this.totalTime = 0;
    this.spottedCount = 0;
    this.score = 0;
    this.status = 'title';
    this.time = 0;
    this.clock = 0;
    this.accumulator = 0;
    this.lastNow = 0;
    this.lastStep = 0;
    this.paused = false;
    this.alarm = 0;
    this.lockdown = 0;
    this.caughtReason = '';
    this.best = 0;
    try {
      this.best = Number(window.localStorage?.getItem('midnight-vault.best') ?? 0) || 0;
    } catch {
      this.best = 0;
    }
    this.sparkles = [];
    this.fadeT = 0;
    this.loadLevel(0);
    const rng = mulberry32(hashSeed(`dust:${seed}`));
    this.renderer.seedDust(rng, 90);
    if (shot) {
      stageShot(this, shot);
      // A staged shot never steps the simulation, so the fade would sit
      // at 0 and darken the whole frame — lift it outright.
      this.fadeT = 1;
    }
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  loadLevel(index) {
    this.levelIndex = index;
    const def = LEVELS[index];
    this.world = new World(def);
    const problems = this.world.validate();
    if (problems.length) throw new Error(`Vault "${def.title}" is broken: ${problems.join('; ')}`);
    this.player = new Thief(this.world.start);
    this.guards = def.guards.map((s) => new Sentry(s));
    this.cameras = def.cameras.map((l) => new Lens(l));
    this.time = 0;
    this.status = 'title';
    this.paused = false;
    this.alarm = 0;
    this.lockdown = 0;
    this.caughtReason = '';
    this.sparkles = [];
    this.fadeT = 0;
  }

  start() {
    this.sounds.ensure();
    if (this.status === 'title') {
      this.status = 'playing';
      this.time = 0;
    } else if (this.status === 'level-complete') {
      this.loadLevel((this.levelIndex + 1) % LEVELS.length);
      this.status = 'playing';
    } else if (this.status === 'victory' || this.status === 'caught') {
      this.spottedCount = 0;
      this.totalTime = 0;
      this.score = 0;
      this.loadLevel(0);
      this.status = 'playing';
    }
  }

  handleKeys() {
    const hit = this.input.hit;
    if (hit.has('KeyM')) this.sounds.toggleMute();
    if (hit.has('KeyR') && (this.status === 'playing' || this.status === 'caught')) {
      this.loadLevel(this.levelIndex);
      this.status = 'playing';
    }
    if (hit.has('KeyP') && this.status === 'playing') this.paused = !this.paused;
    if (hit.has('KeyF') && this.status === 'playing' && !this.paused) {
      if (this.player.fireEmp()) {
        for (const cam of this.cameras) cam.shutdown(LENS.empOff);
        this.sounds.emp();
      }
    }
    if (hit.has('KeyE') && this.status === 'playing' && !this.paused) {
      if (this.player.hacks > 0) {
        let best = null;
        let bestD = LENS.hackRange;
        for (const cam of this.cameras) {
          if (cam.offline > 0) continue;
          const d = Math.hypot(cam.x - this.player.x, cam.y - this.player.y);
          if (d < bestD) {
            best = cam;
            bestD = d;
          }
        }
        if (best) {
          this.player.hacks -= 1;
          best.shutdown(LENS.hackOff);
          this.sounds.hack();
        }
      }
    }
    if (hit.has('Enter') || hit.has('Space')) {
      if (this.status !== 'playing' || this.paused) {
        this.paused = false;
        this.start();
      }
    }
    const click = this.input.consumeClick();
    if (click && this.status === 'playing' && !this.paused) {
      this.sounds.ensure();
      if (click.y >= 46 && !this.world.solidPx(click.x, click.y)) {
        if (this.player.throwCoin(click.x, click.y)) this.sounds.coin();
      }
    }
    this.input.endFrame();
  }

  update(dt) {
    if (this.status !== 'playing' || this.paused) return;
    this.time += dt;
    this.totalTime += dt;
    this.fadeT = Math.min(1, this.fadeT + dt * 2);
    const player = this.player;
    player.update(dt, this.world, this.input);

    // A thrown coin rings out: guards inside its earshot come to look.
    for (const coin of player.thrownCoins) {
      for (const g of this.guards) {
        if (Math.hypot(g.x - coin.x, g.y - coin.y) < COIN_HEAR) {
          g.suspicion = Math.max(g.suspicion, 40);
          g.lastSeen = { x: coin.x, y: coin.y };
          if (g.state === SENTRY_STATE.PATROL) {
            g.state = SENTRY_STATE.INVESTIGATE;
            g.stateTime = 0;
          }
        }
      }
    }
    // Running feet carry: guards close enough hear them and look over.
    const noise = player.noiseRadius(this.world);
    if (noise > 0) {
      for (const g of this.guards) {
        if (Math.hypot(g.x - player.x, g.y - player.y) < noise) {
          g.suspicion = Math.min(100, g.suspicion + dt * 14);
          g.lastSeen = { x: player.x, y: player.y };
        }
      }
    }

    for (const g of this.guards) g.update(dt, this.world, player);
    let cameraSees = false;
    for (const cam of this.cameras) {
      cam.update(dt, this.world, player);
      if (cam.seeing) cameraSees = true;
    }

    // The alarm meter: cameras feed it, hiding starves it.
    if (cameraSees) {
      this.alarm = Math.min(METER.max, this.alarm + LENS.alarmGain * dt);
    } else {
      this.alarm = Math.max(0, this.alarm - METER.decay * dt);
    }
    if (this.alarm >= METER.max && this.lockdown <= 0) {
      this.lockdown = METER.lockdown;
      for (const g of this.guards) {
        g.suspicion = 100;
        g.lastSeen = { x: player.x, y: player.y };
        g.state = SENTRY_STATE.CHASE;
        g.stateTime = 0;
      }
    }
    if (this.lockdown > 0) {
      this.lockdown -= dt;
      this.sounds.startAlarm();
    } else {
      this.sounds.stopAlarm();
    }

    // Guard events: stings when suspicion or a chase starts.
    for (const g of this.guards) {
      if (g.state === SENTRY_STATE.CHASE && !g._chaseSounded) {
        g._chaseSounded = true;
        this.sounds.spotted();
        if (g.kind === 'warden') this.sounds.wardenSting();
        this.spottedCount += 1;
      } else if (g.state !== SENTRY_STATE.CHASE) {
        g._chaseSounded = false;
      }
      if (g.suspicion >= 60 && g.suspicion < 100 && !g._suspSounded) {
        g._suspSounded = true;
        this.sounds.suspicious();
      } else if (g.suspicion < 60) {
        g._suspSounded = false;
      }
    }

    // Footsteps: a soft tick each stride, quieter while sneaking.
    if (player.moving && Math.floor(player.stepPhase) !== this.lastStep) {
      this.lastStep = Math.floor(player.stepPhase);
      this.sounds.footstep(player.sneaking);
    }

    // Safes do not open on touch: stand beside one and crack it.
    for (const l of this.world.loot) {
      if (l.kind !== 'safe' || l.taken) continue;
      if (Math.hypot(l.x - player.x, l.y - player.y) < 46) {
        const before = Math.floor(l.crack * 4);
        l.crack += dt;
        if (Math.floor(l.crack * 4) !== before) this.sounds.safeTick();
        if (l.crack >= SAFE_CRACK) {
          this.world.takeLoot(l);
          this.score += PRIZE.safe;
          this.sounds.safeOpen();
          this.sparkles.push({ x: l.x, y: l.y, t: 0 });
        }
      } else {
        l.crack = Math.max(0, l.crack - dt * 2);
      }
    }

    // Pocket loot by walking over it.
    const loot = this.world.lootAt(player.x, player.y);
    if (loot) {
      this.world.takeLoot(loot);
      if (loot.kind === 'vault') {
        this.score += PRIZE.vault;
        this.sounds.vaultPickup();
      } else if (loot.kind === 'painting') {
        this.score += PRIZE.painting;
        this.sounds.paintChime();
      } else {
        this.score += PRIZE.gold;
        this.sounds.pickup();
      }
      this.sparkles.push({ x: loot.x, y: loot.y, t: 0 });
    }
    for (const s of this.sparkles) s.t += dt;
    this.sparkles = this.sparkles.filter((s) => s.t < 0.6);

    // Caught: a guard reached the thief.
    if (this.guards.some((g) => Math.hypot(g.x - player.x, g.y - player.y) < SENTRY.catch)) {
      this.status = 'caught';
      this.caughtReason =
        this.lockdown > 0
          ? 'The alarm hit 100% — lockdown. A guard ran you down.'
          : 'A guard caught you in the open.';
      this.sounds.caught();
      this.sounds.stopAlarm();
      return;
    }

    // Escape: every vault diamond pocketed and the thief on the exit.
    if (this.world.allVaultTaken && this.world.atExit(player.x, player.y)) {
      const timeBonus = Math.max(0, 300 - Math.floor(this.time)) * 2;
      this.score += timeBonus;
      if (this.levelIndex + 1 < LEVELS.length) {
        this.status = 'level-complete';
        this.sounds.win();
      } else {
        this.status = 'victory';
        this.sounds.win();
        if (this.score > this.best) {
          this.best = this.score;
          try {
            window.localStorage?.setItem('midnight-vault.best', String(this.best));
          } catch {
            // Private mode: the best haul just does not persist.
          }
        }
      }
    }
  }

  draw() {
    this.renderer.draw(this, this.clock);
  }

  frame(now) {
    const dt = Math.min(0.1, (now - this.lastNow) / 1000 || 0);
    this.lastNow = now;
    this.clock += dt;
    this.handleKeys();
    // In a staged screenshot the world is frozen: draw once, never step.
    if (!shot) {
      this.accumulator += dt;
      while (this.accumulator >= STEP) {
        this.update(STEP);
        this.accumulator -= STEP;
      }
    }
    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  run() {
    this.lastStep = 0;
    requestAnimationFrame((t) => {
      this.lastNow = t;
      this.frame(t);
    });
  }
}

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const game = new Game(canvas);
// Expose the live game for play-testing from the console and automation.
window.__midnightVault = game;
game.run();

// The page background stays dark so the canvas sits in a vault frame.
document.body.style.background = '#0a0c12';
document.title = 'Midnight Vault — a heist game';
