// Midnight Vault — keyboard and mouse, nothing else.
// WASD/arrows move, Shift sneaks, Space runs, F fires the EMP,
// click a floor tile to throw a coin, P pauses, R restarts, M mutes,
// Enter starts or advances. The canvas scales, so clicks are mapped
// back into the 1280x720 logical field before the game sees them.

import { FIELD } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.sneak = false;
    this.run = false;
    this.onKey = null; // (code) => void, for one-shot keys
    this.onClick = null; // () => void, after consumeClick has a point
    this._click = null;
    this._keys = new Set();

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this._keys.add(e.code);
      this._applyKeys();
      if (this.onKey) this.onKey(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this._keys.delete(e.code);
      this._applyKeys();
    });
    window.addEventListener('blur', () => {
      this._keys.clear();
      this._applyKeys();
    });
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = FIELD.width / rect.width;
      const sy = FIELD.height / rect.height;
      this._click = {
        x: (e.clientX - rect.left) * sx,
        y: (e.clientY - rect.top) * sy,
      };
      if (this.onClick) this.onClick();
    });
  }

  _applyKeys() {
    const k = this._keys;
    this.up = k.has('KeyW') || k.has('ArrowUp');
    this.down = k.has('KeyS') || k.has('ArrowDown');
    this.left = k.has('KeyA') || k.has('ArrowLeft');
    this.right = k.has('KeyD') || k.has('ArrowRight');
    this.sneak = k.has('ShiftLeft') || k.has('ShiftRight');
    this.run = k.has('Space');
  }

  /** Take the pending click point (or null); the game decides what it means. */
  consumeClick() {
    const c = this._click;
    this._click = null;
    return c;
  }
}
