// Midnight Vault — everything the player sees: the room, the cones, the
// thief, the HUD with its alarm meter, and every screen between heists.
// The canvas is a fixed 1280x720 logical field, scaled to the window.

import { FIELD, TILE, COLS, ROWS, GUARD, CAMERA, PALETTE, FONT } from './config.js';
import { T_WALL, T_CRATE, T_SHADOW } from './world.js';
import { mulberry32, hashSeed } from './random.js';

function conePolygon(world, x, y, angle, half, range, rays) {
  const pts = [{ x, y }];
  for (let i = 0; i <= rays; i++) {
    const a = angle - half + (2 * half * i) / rays;
    const d = world.rayDistance(x, y, a, range);
    pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return pts;
}

function tracePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dust = [];
  }

  seedDust(rng, n) {
    this.dust = [];
    for (let i = 0; i < n; i++) {
      this.dust.push({
        x: rng() * FIELD.width,
        y: rng() * FIELD.height,
        r: 0.6 + rng() * 1.6,
        a: 0.05 + rng() * 0.12,
      });
    }
  }

  draw(game, clock) {
    const ctx = this.ctx;
    const { world } = game;
    ctx.save();
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    this.drawFloor(ctx, world);
    this.drawLoot(ctx, world, clock);
    this.drawExit(ctx, world, clock);
    this.drawCoins(ctx, game);
    this.drawCones(ctx, game);
    this.drawGuards(ctx, game);
    this.drawCameras(ctx, game);
    this.drawPlayer(ctx, game);
    this.drawDust(ctx);
    this.drawHud(ctx, game);
    ctx.restore();
  }

  drawFloor(ctx, world) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = world.get(x, y);
        const px = x * TILE;
        const py = y * TILE;
        if (t === T_WALL) {
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(px, py, TILE, 5);
          ctx.strokeStyle = PALETTE.wallTrim;
          ctx.globalAlpha = 0.25;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
          ctx.globalAlpha = 1;
        } else if (t === T_CRATE) {
          ctx.fillStyle = PALETTE.floorA;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = PALETTE.crate;
          ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
          ctx.fillStyle = PALETTE.crateTop;
          ctx.fillRect(px + 4, py + 4, TILE - 8, 6);
          ctx.strokeStyle = '#3a2d1f';
          ctx.strokeRect(px + 4.5, py + 4.5, TILE - 9, TILE - 9);
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
          ctx.fillRect(px, py, TILE, TILE);
          if (t === T_SHADOW) {
            ctx.fillStyle = PALETTE.shadow;
            ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            ctx.strokeStyle = PALETTE.shadowEdge;
            ctx.strokeRect(px + 2.5, py + 2.5, TILE - 5, TILE - 5);
          }
          ctx.strokeStyle = PALETTE.floorLine;
          ctx.globalAlpha = 0.5;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  drawLoot(ctx, world, clock) {
    for (const l of world.loot) {
      if (l.taken) continue;
      const bob = Math.sin(clock * 2 + l.x) * 2;
      if (l.kind === 'vault') {
        // A blue diamond, glowing: the loot the whole heist is about.
        ctx.save();
        ctx.translate(l.x, l.y + bob);
        ctx.shadowColor = PALETTE.vault;
        ctx.shadowBlur = 14;
        ctx.fillStyle = PALETTE.vault;
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 13);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(l.x, l.y + bob);
        ctx.fillStyle = PALETTE.gold;
        ctx.shadowColor = PALETTE.gold;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#8a6d1f';
        ctx.font = 'bold 11px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0.5);
        ctx.restore();
      }
    }
  }

  drawExit(ctx, world, clock) {
    const e = world.exit;
    const open = world.allVaultTaken;
    const pulse = open ? 0.75 + Math.sin(clock * 4) * 0.25 : 0.35;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.exit;
    ctx.shadowColor = PALETTE.exit;
    ctx.shadowBlur = open ? 22 : 8;
    ctx.fillRect(e.x - 18, e.y - 18, 36, 36);
    ctx.restore();
    ctx.fillStyle = PALETTE.exitGlow;
    ctx.fillRect(e.x - 18, e.y - 18, 36, 36);
    ctx.strokeStyle = PALETTE.exit;
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 18.5, e.y - 18.5, 37, 37);
    ctx.fillStyle = '#04120a';
    ctx.font = 'bold 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', e.x, e.y + 0.5);
    ctx.lineWidth = 1;
  }

  drawCoins(ctx, game) {
    const p = game.player;
    ctx.fillStyle = PALETTE.gold;
    for (const c of p.thrownCoins) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(242,201,76,0.5)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10 + Math.sin(c.ttl * 9) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.coinFlight) {
      ctx.beginPath();
      ctx.arc(p.coinFlight.x, p.coinFlight.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCones(ctx, game) {
    const { world, guards, cameras } = game;
    for (const cam of cameras) {
      if (cam.offline > 0) continue;
      const pts = cam.conePolygon(world);
      ctx.fillStyle = cam.seeing ? 'rgba(255, 90, 78, 0.30)' : PALETTE.camCone;
      tracePath(ctx, pts);
      ctx.fill();
      ctx.strokeStyle = PALETTE.camConeEdge;
      ctx.stroke();
    }
    for (const g of guards) {
      const pts = conePolygon(world, g.x, g.y, g.angle, GUARD.coneHalf, GUARD.coneRange, GUARD.rays);
      const hot = g.state === 'chase';
      const warm = g.suspicion >= 35;
      ctx.fillStyle = hot
        ? 'rgba(255, 90, 78, 0.34)'
        : warm
          ? PALETTE.coneSuspicious
          : PALETTE.cone;
      tracePath(ctx, pts);
      ctx.fill();
      ctx.strokeStyle = hot ? 'rgba(255,90,78,0.6)' : PALETTE.coneEdge;
      ctx.stroke();
    }
  }

  drawGuards(ctx, game) {
    for (const g of game.guards) {
      ctx.save();
      ctx.translate(g.x, g.y);
      // Body: a red-uniformed guard, facing its patrol direction.
      ctx.rotate(g.angle);
      ctx.fillStyle = PALETTE.guardDark;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(3, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      // Cap brim and torch.
      ctx.fillStyle = '#2b2f3a';
      ctx.fillRect(8, -7, 8, 14);
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(14, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Suspicion mark above the head.
      if (g.suspicion > 1) {
        const w = 30;
        const pct = g.suspicion / 100;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(g.x - w / 2, g.y - 30, w, 5);
        ctx.fillStyle = g.suspicion >= 100 ? PALETTE.danger : g.suspicion >= 35 ? PALETTE.alarmWarn : '#e8e4d8';
        ctx.fillRect(g.x - w / 2, g.y - 30, w * pct, 5);
        if (g.suspicion >= 100) {
          ctx.fillStyle = PALETTE.danger;
          ctx.font = 'bold 15px ' + FONT;
          ctx.textAlign = 'center';
          ctx.fillText('!', g.x, g.y - 34);
        } else if (g.suspicion >= 35) {
          ctx.fillStyle = PALETTE.alarmWarn;
          ctx.font = 'bold 14px ' + FONT;
          ctx.textAlign = 'center';
          ctx.fillText('?', g.x, g.y - 34);
        }
      }
    }
  }

  drawCameras(ctx, game) {
    for (const cam of game.cameras) {
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.rotate(cam.angle);
      ctx.fillStyle = cam.offline > 0 ? '#555b66' : PALETTE.cam;
      ctx.fillRect(-4, -9, 14, 18);
      ctx.fillStyle = cam.offline > 0 ? '#333' : '#ffd166';
      ctx.beginPath();
      ctx.arc(12, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (cam.offline > 0) {
        ctx.fillStyle = '#cfd3da';
        ctx.font = 'bold 10px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText('OFFLINE', cam.x, cam.y - 16);
      }
    }
  }

  drawPlayer(ctx, game) {
    const p = game.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    // Noise ring while running.
    if (p.running && p.moving) {
      ctx.strokeStyle = 'rgba(238,241,245,0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 26 + Math.sin(game.clock * 10) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Shadow bonus: a blue ring says "hidden here".
    if (p.inShadow) {
      ctx.strokeStyle = 'rgba(126, 231, 255, 0.55)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.rotate(p.facing);
    ctx.fillStyle = PALETTE.playerCloak;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(2, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    // Hood point and mask.
    ctx.fillStyle = PALETTE.playerCloak;
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(17, 0);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#11141b';
    ctx.fillRect(4, -4, 6, 8);
    ctx.restore();
    if (p.inShadow) {
      ctx.fillStyle = PALETTE.vault;
      ctx.font = 'bold 10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', p.x, p.y - 22);
    }
  }

  drawDust(ctx) {
    ctx.fillStyle = '#ffffff';
    for (const d of this.dust) {
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, game) {
    const { world, player } = game;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, FIELD.width, 44);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 44, FIELD.width, 2);
    // Left: level name above, loot / coins / EMP below.
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText(game.level.name, 14, 16);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.fillText(
      `◆ ${world.vaultTaken}/${world.vaultTotal} vault   $ ${game.score}   ◉ coins ×${player.coins}   EMP ×${player.emp}`,
      14, 33,
    );

    // Alarm meter, centre: the number the whole heist turns on.
    const ax = FIELD.width / 2 - 130;
    const aw = 260;
    const pct = game.alarm / 100;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = 'bold 11px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', ax, 12);
    ctx.fillStyle = '#05070a';
    ctx.fillRect(ax, 20, aw, 14);
    ctx.fillStyle = pct >= 0.75 ? PALETTE.alarm : pct >= 0.4 ? PALETTE.alarmWarn : '#39d98a';
    ctx.fillRect(ax, 20, aw * pct, 14);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.strokeRect(ax + 0.5, 20.5, aw, 14);
    ctx.fillStyle = pct >= 0.75 ? PALETTE.danger : PALETTE.text;
    ctx.font = 'bold 12px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(game.alarm)}%`, ax + aw + 42, 27);
    if (game.alarm >= 75) {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = 'bold 12px ' + FONT;
      ctx.textAlign = 'left';
      ctx.fillText('LOCKDOWN SOON', ax + aw + 48, 27);
    }

    // Right: timer, level, spotted count.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px ' + FONT;
    const mm = Math.floor(game.time / 60);
    const ss = Math.floor(game.time % 60).toString().padStart(2, '0');
    ctx.fillText(`${mm}:${ss}`, FIELD.width - 14, 16);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.fillText(`Level ${game.levelIndex + 1}/3   Spotted ×${game.spottedCount}`, FIELD.width - 14, 33);
    ctx.textAlign = 'left';
  }

  drawTitle(ctx, game, best) {
    this.dim(ctx, 0.72);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 64px ' + FONT;
    ctx.fillText('MIDNIGHT VAULT', FIELD.width / 2, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px ' + FONT;
    ctx.fillText(game.level.name, FIELD.width / 2, 238);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '16px ' + FONT;
    ctx.fillText(game.level.intro, FIELD.width / 2, 272);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '16px ' + FONT;
    const lines = [
      'WASD / arrows — move      Shift — sneak      Space — run (loud)',
      'Click a floor tile — throw a coin      F — EMP (cameras off, once)',
      'Pocket every ◆ vault diamond, then reach the green EXIT.',
      'Guards and cameras feed the ALARM. At 100% the vault locks down.',
    ];
    lines.forEach((l, i) => ctx.fillText(l, FIELD.width / 2, 330 + i * 28));
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText('Press Enter to begin the heist', FIELD.width / 2, 480);
    if (best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '14px ' + FONT;
      ctx.fillText(`Best score: $ ${best}`, FIELD.width / 2, 514);
    }
  }

  drawCaught(ctx, game, reason) {
    this.dim(ctx, 0.6);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.danger;
    ctx.font = 'bold 56px ' + FONT;
    ctx.fillText('CAUGHT!', FIELD.width / 2, 280);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '19px ' + FONT;
    ctx.fillText(reason, FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '16px ' + FONT;
    ctx.fillText(`Score so far: $ ${game.score}    ·    Time ${Math.floor(game.time)}s`, FIELD.width / 2, 368);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText('Press R to retry this vault, Enter for the title screen', FIELD.width / 2, 420);
  }

  drawLevelComplete(ctx, game) {
    this.dim(ctx, 0.55);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.exit;
    ctx.font = 'bold 48px ' + FONT;
    ctx.fillText('CLEAN GETAWAY', FIELD.width / 2, 270);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '19px ' + FONT;
    ctx.fillText(
      `${game.level.name} cleared — $ ${game.score}   ·   ${Math.floor(game.time)}s   ·   spotted ×${game.spottedCount}`,
      FIELD.width / 2, 322,
    );
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText('Press Enter for the next vault', FIELD.width / 2, 372);
  }

  drawVictory(ctx, game) {
    this.dim(ctx, 0.6);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 52px ' + FONT;
    ctx.fillText('THE VAULT IS YOURS', FIELD.width / 2, 260);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '20px ' + FONT;
    ctx.fillText(
      `All three vaults emptied — final score $ ${game.score} in ${Math.floor(game.totalTime)}s`,
      FIELD.width / 2, 312,
    );
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '16px ' + FONT;
    ctx.fillText(`Times spotted: ${game.spottedCount}`, FIELD.width / 2, 348);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText('Press Enter to run it back', FIELD.width / 2, 398);
  }

  drawPaused(ctx) {
    this.dim(ctx, 0.55);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 44px ' + FONT;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '16px ' + FONT;
    ctx.fillText('Press P to keep sneaking', FIELD.width / 2, 372);
  }

  dim(ctx, alpha) {
    ctx.fillStyle = `rgba(5, 7, 10, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
}
