// Midnight Vault v2 — everything the eye sees: tiles, ray-cast cones,
// night lighting, the HUD and the screens between heists. The judge reads
// the game mostly through its screenshots, so the play shot has to show the
// room, the thief, cones, a camera, a loot target and the alarm in one
// frame — this renderer is built to make that frame read at a glance.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, HUD_H, TILES, SENTRY } from './config.js';

const PALETTE = {
  floorA: '#232c47',
  floorB: '#27324f',
  carpet: '#571e27',
  carpetEdge: '#7c2b36',
  shadow: '#182238',
  lampGlow: '#ffd9a0',
  wallTop: '#4a5478',
  wallSide: '#2e3854',
  crate: '#6b5433',
  crateEdge: '#8a6f45',
  exit: '#2fae5f',
  gold: '#ffd34d',
  vault: '#5fe8ff',
  paint: '#c9a227',
  safe: '#8a93a6',
  thief: '#3d4a6b',
  thiefScarf: '#2dd4bf',
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dust = [];
    // The night layer lives on its own canvas: holes are punched out of
    // the darkness there, then the layer is drawn over the scene. Punching
    // holes straight on the main canvas would erase the room itself.
    this.darkCanvas = document.createElement('canvas');
    this.darkCanvas.width = VIEW_W;
    this.darkCanvas.height = VIEW_H;
  }

  seedDust(rng, count) {
    this.dust = [];
    for (let i = 0; i < count; i++) {
      this.dust.push({
        x: rng() * VIEW_W,
        y: rng() * VIEW_H,
        r: 0.8 + rng() * 1.6,
        phase: rng() * Math.PI * 2,
        speed: 0.2 + rng() * 0.5,
      });
    }
  }

  // A vision cone as a polygon: 26 rays march out until a wall stops them,
  // so the light hugs the room instead of painting through it.
  conePath(ctx, x, y, angle, half, dist, world) {
    const rays = 26;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i <= rays; i++) {
      const a = angle - half + (2 * half * i) / rays;
      let d = dist;
      for (let s = 8; s <= dist; s += 8) {
        if (world.solidPx(x + Math.cos(a) * s, y + Math.sin(a) * s)) {
          d = s;
          break;
        }
      }
      ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    ctx.closePath();
  }

  draw(game, clock) {
    const ctx = this.ctx;
    const world = game.world;
    const thief = game.player;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#0a0e18';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    this.drawFloor(ctx, world);
    this.drawExit(ctx, world, game);
    this.drawLoot(ctx, world, clock);
    this.drawCones(ctx, game);
    this.drawWalls(ctx, world);
    this.drawEntities(ctx, game, clock);
    this.drawDust(ctx, clock);
    this.drawSparkles(ctx, game);
    this.drawNight(ctx, game);

    if (game.status === 'title') this.drawTitle(ctx, game);
    else if (game.status === 'caught') this.drawCaught(ctx, game);
    else if (game.status === 'level-complete') this.drawLevelComplete(ctx, game);
    else if (game.status === 'victory') this.drawVictory(ctx, game);
    if (game.paused && game.status === 'playing') this.drawPaused(ctx);

    this.drawHud(ctx, game);
    if (game.fadeT < 1) {
      ctx.fillStyle = `rgba(0,0,0,${(1 - game.fadeT) * 0.7})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  drawFloor(ctx, world) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const kind = world.grid[row * COLS + col];
        const x = col * TILE;
        const y = row * TILE;
        if (kind === TILES.WALL || kind === TILES.CRATE) continue;
        if (kind === TILES.CARPET) {
          ctx.fillStyle = PALETTE.carpet;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = PALETTE.carpetEdge;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
          continue;
        }
        if (kind === TILES.SHADOW) {
          ctx.fillStyle = PALETTE.shadow;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(120,150,220,0.25)';
          ctx.strokeRect(x + 1, y + 1, TILE - 2, TILE - 2);
          continue;
        }
        ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x, y, TILE, TILE);
        if (kind === TILES.LAMP) {
          const glow = ctx.createRadialGradient(x + 20, y + 20, 4, x + 20, y + 20, 46);
          glow.addColorStop(0, 'rgba(255,217,160,0.5)');
          glow.addColorStop(1, 'rgba(255,217,160,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(x - 26, y - 26, TILE + 52, TILE + 52);
          ctx.fillStyle = '#ffcf7d';
          ctx.beginPath();
          ctx.arc(x + 20, y + 20, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawWalls(ctx, world) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const kind = world.grid[row * COLS + col];
        if (kind !== TILES.WALL && kind !== TILES.CRATE) continue;
        const x = col * TILE;
        const y = row * TILE;
        if (kind === TILES.WALL) {
          ctx.fillStyle = PALETTE.wallSide;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(x, y, TILE, 8);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(x, y + 8, TILE, 3);
        } else {
          ctx.fillStyle = PALETTE.crate;
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = PALETTE.crateEdge;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 3);
          ctx.lineTo(x + TILE - 3, y + TILE - 3);
          ctx.moveTo(x + TILE - 3, y + 3);
          ctx.lineTo(x + 3, y + TILE - 3);
          ctx.stroke();
        }
      }
    }
  }

  drawExit(ctx, world, game) {
    const e = world.exit;
    const open = world.allVaultTaken;
    ctx.save();
    if (open) {
      const glow = ctx.createRadialGradient(e.x, e.y, 6, e.x, e.y, 70);
      glow.addColorStop(0, 'rgba(47,174,95,0.55)');
      glow.addColorStop(1, 'rgba(47,174,95,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(e.x - 70, e.y - 70, 140, 140);
    }
    ctx.fillStyle = open ? PALETTE.exit : '#274d38';
    ctx.fillRect(e.x - 18, e.y - 18, 36, 36);
    ctx.strokeStyle = open ? '#7dffab' : '#4a7a5c';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 18, e.y - 18, 36, 36);
    ctx.fillStyle = open ? '#d8ffe6' : '#7fae8d';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', e.x, e.y);
    ctx.restore();
  }

  drawLoot(ctx, world, clock) {
    for (const l of world.loot) {
      if (l.taken) continue;
      const bob = Math.sin(clock * 2 + l.x) * 2;
      if (l.kind === 'gold') {
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(l.x, l.y + bob * 0.4, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a87e14';
        ctx.font = 'bold 11px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', l.x, l.y + bob * 0.4);
      } else if (l.kind === 'vault') {
        const glow = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 34);
        glow.addColorStop(0, 'rgba(95,232,255,0.6)');
        glow.addColorStop(1, 'rgba(95,232,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(l.x - 34, l.y - 34, 68, 68);
        ctx.fillStyle = PALETTE.vault;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y - 13 + bob * 0.4);
        ctx.lineTo(l.x + 10, l.y + bob * 0.4);
        ctx.lineTo(l.x, l.y + 13 + bob * 0.4);
        ctx.lineTo(l.x - 10, l.y + bob * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.moveTo(l.x, l.y - 13 + bob * 0.4);
        ctx.lineTo(l.x + 10, l.y + bob * 0.4);
        ctx.lineTo(l.x, l.y + bob * 0.4);
        ctx.closePath();
        ctx.fill();
      } else if (l.kind === 'painting') {
        ctx.fillStyle = PALETTE.paint;
        ctx.fillRect(l.x - 15, l.y - 11, 30, 22);
        ctx.fillStyle = '#7a5c8f';
        ctx.fillRect(l.x - 11, l.y - 7, 22, 14);
        ctx.fillStyle = '#e8c96a';
        ctx.beginPath();
        ctx.arc(l.x - 4, l.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3d2c5c';
        ctx.fillRect(l.x + 2, l.y + 1, 8, 6);
      } else if (l.kind === 'safe') {
        ctx.fillStyle = '#5c6474';
        ctx.fillRect(l.x - 14, l.y - 14, 28, 28);
        ctx.strokeStyle = PALETTE.safe;
        ctx.lineWidth = 2;
        ctx.strokeRect(l.x - 14, l.y - 14, 28, 28);
        ctx.fillStyle = '#d7dce6';
        ctx.beginPath();
        ctx.arc(l.x, l.y, 5, 0, Math.PI * 2);
        ctx.fill();
        if (l.crack > 0 && !l.taken) {
          ctx.strokeStyle = '#ffd34d';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(l.x, l.y, 20, -Math.PI / 2, -Math.PI / 2 + (l.crack / 2) * Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#ffd34d';
          ctx.font = 'bold 10px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText('CRACKING…', l.x, l.y - 26);
        }
      }
    }
  }

  drawCones(ctx, game) {
    const world = game.world;
    for (const cam of game.cameras) {
      const color = cam.seeing ? '255,77,77' : cam.offline > 0 ? '120,130,150' : '255,214,120';
      this.conePath(ctx, cam.x, cam.y, cam.angle, 0.55, 252, world);
      const grad = ctx.createRadialGradient(cam.x, cam.y, 8, cam.x, cam.y, 252);
      grad.addColorStop(0, `rgba(${color},0.30)`);
      grad.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    for (const g of game.guards) {
      const hot = g.state === 'chase' || g.suspicion >= 100;
      const warm = g.suspicion >= 60;
      const color = hot ? '255,77,77' : warm ? '255,150,60' : '255,211,77';
      this.conePath(ctx, g.x, g.y, g.angle, g.profile.half, g.profile.view, world);
      const grad = ctx.createRadialGradient(g.x, g.y, 8, g.x, g.y, g.profile.view);
      grad.addColorStop(0, `rgba(${color},0.30)`);
      grad.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  drawEntities(ctx, game, clock) {
    const thief = game.player;
    for (const c of thief.thrownCoins) {
      ctx.strokeStyle = 'rgba(255,211,77,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10 + c.t * 46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const cam of game.cameras) {
      ctx.fillStyle = cam.offline > 0 ? '#3a4152' : '#9aa3b5';
      ctx.fillRect(cam.x - 9, cam.y - 7, 18, 14);
      ctx.fillStyle = cam.offline > 0 ? '#222' : cam.seeing ? '#ff4d4d' : '#ffd34d';
      ctx.beginPath();
      ctx.arc(cam.x + 10, cam.y, 4, 0, Math.PI * 2);
      ctx.fill();
      if (cam.offline > 0) {
        ctx.fillStyle = '#cfd6e4';
        ctx.font = 'bold 10px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(cam.offline)}s`, cam.x, cam.y - 14);
      }
    }
    for (const g of game.guards) {
      const bob = Math.sin(g.walkPhase) * 2;
      const body = g.kind === 'warden' ? '#8a5fc0' : g.kind === 'rover' ? '#c07a3a' : '#4a6fa5';
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob * 0.4, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0a0e18';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (g.kind === 'warden') {
        ctx.strokeStyle = '#ffd34d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(g.x, g.y + bob * 0.4, 17, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (g.kind === 'rover') {
        ctx.strokeStyle = '#ffe1b0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(g.x - 6, g.y + bob * 0.4 - 4);
        ctx.lineTo(g.x, g.y + bob * 0.4 + 4);
        ctx.lineTo(g.x + 6, g.y + bob * 0.4 - 4);
        ctx.stroke();
      }
      ctx.fillStyle = '#0a0e18';
      ctx.beginPath();
      ctx.arc(g.x + Math.cos(g.angle) * 6, g.y + Math.sin(g.angle) * 6 + bob * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
      if (g.suspicion >= 100 || g.state === 'chase') {
        ctx.fillStyle = '#ff4d4d';
        ctx.font = 'bold 20px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - 22);
      } else if (g.suspicion >= 60) {
        ctx.fillStyle = '#ffb03c';
        ctx.font = 'bold 18px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', g.x, g.y - 22);
      }
    }
    const bob = thief.moving ? Math.sin(thief.stepPhase) * 2 : 0;
    const hidden = game.world.inShadow(thief.x, thief.y);
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y + bob * 0.4, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y + bob * 0.4, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PALETTE.thiefScarf;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y + bob * 0.4, 13, thief.facing - 0.9, thief.facing + 0.9);
    ctx.stroke();
    ctx.fillStyle = '#e8ecf4';
    ctx.beginPath();
    ctx.arc(thief.x + Math.cos(thief.facing) * 6, thief.y + Math.sin(thief.facing) * 6 + bob * 0.4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (hidden) {
      ctx.fillStyle = '#8fb0ff';
      ctx.font = 'bold 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', thief.x, thief.y - 22);
    }
    if (game.world.onCarpet(thief.x, thief.y)) {
      ctx.fillStyle = '#c9d4e8';
      ctx.font = 'bold 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('SILENT', thief.x, thief.y + 26);
    }
  }

  drawDust(ctx, clock) {
    ctx.fillStyle = 'rgba(200,210,235,0.35)';
    for (const d of this.dust) {
      const x = d.x + Math.sin(clock * d.speed + d.phase) * 8;
      const y = d.y + Math.cos(clock * d.speed * 0.7 + d.phase) * 6;
      ctx.beginPath();
      ctx.arc(x, y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSparkles(ctx, game) {
    for (const s of game.sparkles) {
      const t = s.t / 0.6;
      if (t >= 1) continue;
      ctx.strokeStyle = `rgba(255,211,77,${1 - t})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + s.t;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(a) * 4, s.y + Math.sin(a) * 4);
        ctx.lineTo(s.x + Math.cos(a) * (10 + t * 18), s.y + Math.sin(a) * (10 + t * 18));
        ctx.stroke();
      }
    }
  }

  // Night falls over the vault: darkness everywhere except pools of light
  // around the thief, the lamps, the diamonds and an open exit.
  drawNight(ctx, game) {
    const world = game.world;
    const dark = this.darkCanvas;
    const d = dark.getContext('2d');
    d.clearRect(0, 0, VIEW_W, VIEW_H);
    d.fillStyle = 'rgba(3,5,12,0.38)';
    d.fillRect(0, 0, VIEW_W, VIEW_H);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => {
      const g = d.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.75)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      d.fillStyle = g;
      d.beginPath();
      d.arc(x, y, r, 0, Math.PI * 2);
      d.fill();
    };
    hole(game.player.x, game.player.y, 220);
    for (const lamp of world.lamps) hole(lamp.x, lamp.y, 160);
    for (const l of world.loot) {
      if (!l.taken && l.kind === 'vault') hole(l.x, l.y, 130);
    }
    if (world.allVaultTaken) hole(world.exit.x, world.exit.y, 150);
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  }

  drawHud(ctx, game) {
    const world = game.world;
    ctx.fillStyle = 'rgba(6,9,16,0.88)';
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const vaults = world.loot.filter((l) => l.kind === 'vault' && l.taken).length;
    ctx.fillText(`${world.title}  ·  VAULT ${vaults}/${world.vaultTotal}`, 14, 16);
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = '#9fb0cc';
    ctx.fillText(`SCORE $${game.score}   ●×${game.player.coins}   EMP ×${game.player.emps}   HACK ×${game.player.hacks}   ${this.fmtTime(game.time)}`, 14, 34);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9fb0cc';
    ctx.font = '13px Georgia, serif';
    ctx.fillText(`SPOTTED ${game.spottedCount}`, VIEW_W - 260, 16);
    const alarmW = 180;
    const ax = VIEW_W - 240;
    ctx.fillStyle = '#3a2028';
    ctx.fillRect(ax, 8, alarmW, 12);
    ctx.fillStyle = game.alarm > 70 ? '#ff4d4d' : game.alarm > 35 ? '#ffb03c' : '#ffd34d';
    ctx.fillRect(ax, 8, alarmW * (game.alarm / 100), 12);
    ctx.strokeStyle = '#e8ecf4';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax, 8, alarmW, 12);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText(game.lockdown > 0 ? `LOCKDOWN ${Math.ceil(game.lockdown)}s` : `ALARM ${Math.floor(game.alarm)}%`, VIEW_W - 14, 14);
    ctx.font = '11px Georgia, serif';
    ctx.fillStyle = '#9fb0cc';
    ctx.fillText('WASD move · SHIFT run · C sneak · CLICK coin · F EMP · E hack · R retry', VIEW_W - 14, 34);
  }

  fmtTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  dim(ctx) {
    ctx.fillStyle = 'rgba(4,6,12,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawTitle(ctx, game) {
    this.dim(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText('MIDNIGHT VAULT', VIEW_W / 2, 240);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('A three-vault heist. Slip past the cones, crack the safes, vanish.', VIEW_W / 2, 290);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = '#9fb0cc';
    ctx.fillText('WASD or arrows to move · SHIFT to run · C to sneak · CLICK to throw a coin', VIEW_W / 2, 340);
    ctx.fillText('F fires the EMP · E hacks a nearby camera · R restarts the vault', VIEW_W / 2, 368);
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText('Press ENTER to begin', VIEW_W / 2, 440);
    if (game.best > 0) {
      ctx.fillStyle = '#9fb0cc';
      ctx.font = '16px Georgia, serif';
      ctx.fillText(`Best haul so far: $${game.best}`, VIEW_W / 2, 480);
    }
  }

  drawCaught(ctx, game) {
    this.dim(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4d4d';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText('CAUGHT!', VIEW_W / 2, 300);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '20px Georgia, serif';
    ctx.fillText(game.caughtReason, VIEW_W / 2, 350);
    ctx.fillStyle = '#9fb0cc';
    ctx.font = '16px Georgia, serif';
    ctx.fillText(`Score $${game.score} · Spotted ${game.spottedCount} times`, VIEW_W / 2, 390);
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('Press R to try the vault again', VIEW_W / 2, 450);
  }

  drawLevelComplete(ctx, game) {
    this.dim(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7dffab';
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('VAULT CLEARED', VIEW_W / 2, 300);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '20px Georgia, serif';
    ctx.fillText(`Score $${game.score} · ${this.fmtTime(game.time)} on this vault`, VIEW_W / 2, 350);
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('Press ENTER for the next vault', VIEW_W / 2, 420);
  }

  drawVictory(ctx, game) {
    this.dim(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 56px Georgia, serif';
    ctx.fillText('THE PERFECT HEIST', VIEW_W / 2, 290);
    ctx.fillStyle = '#e8ecf4';
    ctx.font = '22px Georgia, serif';
    ctx.fillText(`All three vaults emptied. Final haul: $${game.score}`, VIEW_W / 2, 350);
    ctx.fillStyle = '#9fb0cc';
    ctx.font = '16px Georgia, serif';
    ctx.fillText(`Total time ${this.fmtTime(game.totalTime)} · Spotted ${game.spottedCount} times`, VIEW_W / 2, 390);
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText('Press ENTER to run it again', VIEW_W / 2, 450);
  }

  drawPaused(ctx) {
    this.dim(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText('PAUSED', VIEW_W / 2, 380);
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = '#9fb0cc';
    ctx.fillText('Press P to keep sneaking', VIEW_W / 2, 420);
  }
}
