// Midnight Vault — the game loop and the screens between heists.
// States: title → playing → caught | level-complete → victory.
// The loop runs on requestAnimationFrame; the simulation steps at a
// fixed 1/60s so a staged screenshot always looks the same.

import { FIELD, STEP, GUARD, CAMERA, ALARM, LOOT, COIN } from './config.js';
import { LEVELS } from './levels.js';
import { World } from './world.js';
import { Guard, GUARD_STATE } from './guard.js';
import { Camera } from './camera.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { Renderer } from './render.js';
import { mulberry32, hashSeed } from './random.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? '20261122');

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
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
    this.paused = false;
    this.alarm = 0;
    this.lockdown = 0; // seconds left of lockdown hunting
    this.caughtReason = '';
    this.best = Number(window.localStorage?.getItem('midnight-vault.best') ?? 0) || 0;
    this.loadLevel(0);
    this.input.onKey = (code) => this.handleKey(code);
    this.input.onClick = () => this.handleClick();
  }

  get level() {
    return LEVELS[this.levelIndex];
  }

  loadLevel(index) {
    this.levelIndex = index;
    const level = LEVELS[index];
    this.world = new World(level);
    const problems = this.world.validate();
    if (problems.length) throw new Error(`Level "${level.name}" is broken: ${problems.join('; ')}`);
    this.player = new Player(this.world.playerStart);
    this.guards = level.guards.map((g) => new Guard(g));
    this.cameras = level.cameras.map((c) => new Camera(c));
    this.time = 0;
    this.status = 'title';
    this.paused = false;
    this.alarm = 0;
    this.lockdown = 0;
    this.caughtReason = '';
    const rng = mulberry32(hashSeed(`${level.name}:${seed}`));
    this.renderer.seedDust(rng, 90);
    if (shot) stageShot(this, shot);
  }

  get allVaultTaken() {
    return this.world.allVaultTaken;
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

  handleKey(code) {
    this.sounds.ensure();
    if (code === 'KeyM') {
      this.sounds.toggleMute();
      return;
    }
    if (code === 'KeyR' && (this.status === 'playing' || this.status === 'caught')) {
      this.loadLevel(this.levelIndex);
      this.status = 'playing';
      return;
    }
    if (code === 'KeyP' && this.status === 'playing') {
      this.paused = !this.paused;
      return;
    }
    if (code === 'KeyF' && this.status === 'playing' && !this.paused) {
      if (this.player.fireEmp()) {
        for (const cam of this.cameras) cam.shutdown(CAMERA.offlineSeconds);
        this.sounds.emp();
      }
      return;
    }
    if (code === 'Enter' || code === 'Space') {
      if (this.status !== 'playing' || this.paused) this.start();
    }
  }

  handleClick() {
    this.sounds.ensure();
    if (this.status !== 'playing' || this.paused) {
      this.start();
      return;
    }
    const click = this.input.consumeClick();
    if (!click) return;
    // Clicking the HUD does nothing; clicking the floor throws a coin.
    if (click.y < 46) return;
    if (this.world.isSolid(click.x, click.y)) return;
    if (this.player.throwCoin(click.x, click.y)) {
      this.sounds.coin();
    }
  }

  update(dt) {
    if (this.status !== 'playing' || this.paused) return;
    this.time += dt;
    this.totalTime += dt;
    const player = this.player;
    player.update(dt, this.world, this.input);

    // Coin rings and running feet draw the guards' attention.
    for (const coin of player.thrownCoins) {
      for (const g of this.guards) {
        if (Math.hypot(g.x - coin.x, g.y - coin.y) < COIN.hearRadius) {
          g.suspicion = Math.max(g.suspicion, 40);
          g.lastSeen = { x: coin.x, y: coin.y };
          if (g.state === GUARD_STATE.PATROL) {
            g.state = GUARD_STATE.INVESTIGATE;
            g.stateTime = 0;
          }
        }
      }
    }
    const noise = player.noiseRadius();
    if (noise > 0) {
      for (const g of this.guards) {
        if (Math.hypot(g.x - player.x, g.y - player.y) < noise) {
          g.suspicion = Math.min(100, g.suspicion + dt * 14);
          g.lastSeen = { x: player.x, y: player.y };
        }
      }
    }

    // Guards and cameras.
    for (const g of this.guards) g.update(dt, this.world, player);
    let cameraSees = false;
    for (const cam of this.cameras) {
      cam.update(dt, this.world, player);
      if (cam.seeing) cameraSees = true;
    }

    // The alarm meter: cameras feed it, hiding starves it.
    if (cameraSees) {
      this.alarm = Math.min(ALARM.max, this.alarm + CAMERA.alarmGain * dt);
    } else {
      this.alarm = Math.max(0, this.alarm - ALARM.decay * dt);
    }
    if (this.alarm >= ALARM.max && this.lockdown <= 0) {
      this.lockdown = ALARM.lockdownSeconds;
      for (const g of this.guards) {
        g.suspicion = 100;
        g.lastSeen = { x: player.x, y: player.y };
        g.state = GUARD_STATE.CHASE;
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
      if (g.state === GUARD_STATE.CHASE && !g._chaseSounded) {
        g._chaseSounded = true;
        this.sounds.spotted();
        this.spottedCount += 1;
      } else if (g.state !== GUARD_STATE.CHASE) {
        g._chaseSounded = false;
      }
      if (g.suspicion >= GUARD.suspiciousAt && g.suspicion < 100 && !g._suspSounded) {
        g._suspSounded = true;
        this.sounds.suspicious();
      } else if (g.suspicion < GUARD.suspiciousAt) {
        g._suspSounded = false;
      }
    }

    // Footsteps: a soft tick each stride, quieter while sneaking.
    if (player.moving && Math.floor(player.stepPhase) !== this.lastStep) {
      this.lastStep = Math.floor(player.stepPhase);
      this.sounds.footstep(player.sneaking);
    }

    // Pocket loot by walking over it.
    const loot = this.world.lootAt(player.x, player.y);
    if (loot) {
      this.world.takeLoot(loot);
      this.score += loot.kind === 'vault' ? LOOT.vault : LOOT.gold;
      if (loot.kind === 'vault') this.sounds.vaultPickup();
      else this.sounds.pickup();
      if (this.world.allVaultTaken) this.sounds.exitOpen();
    }

    // Caught: a guard reached the thief.
    if (this.guards.some((g) => g.caughtPlayer)) {
      this.status = 'caught';
      this.caughtReason = this.lockdown > 0
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
            // Private mode: best score just does not persist.
          }
        }
      }
    }
  }

  draw() {
    const ctx = this.renderer.ctx;
    this.renderer.draw(this, this.clock);
    if (this.paused && this.status === 'playing') {
      this.renderer.drawPaused(ctx);
    } else if (this.status === 'title') {
      this.renderer.drawTitle(ctx, this, this.best);
    } else if (this.status === 'caught') {
      this.renderer.drawCaught(ctx, this, this.caughtReason);
    } else if (this.status === 'level-complete') {
      this.renderer.drawLevelComplete(ctx, this);
    } else if (this.status === 'victory') {
      this.renderer.drawVictory(ctx, this);
    }
  }

  frame(now) {
    const dt = Math.min(0.1, (now - this.lastNow) / 1000 || 0);
    this.lastNow = now;
    this.clock += dt;
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
canvas.width = FIELD.width;
canvas.height = FIELD.height;
const game = new Game(canvas);
// Expose the live game for play-testing from the console and automation.
window.__midnightVault = game;
game.run();

// The page background stays dark so the canvas sits in a vault frame.
document.body.style.background = '#0a0c12';
document.title = 'Midnight Vault — a heist game';
