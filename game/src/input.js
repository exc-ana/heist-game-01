// Midnight Vault v2 — the controls: keyboard and mouse, nothing else.
// Held keys steer the thief; a press is caught once per frame so the game
// can answer Enter, R, F, E, P and M exactly once; a click on the floor
// queues a coin throw at that spot.
export class Controls {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.hit = new Set();
    this.clicks = [];
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.hit.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('mousedown', (e) => {
      const box = canvas.getBoundingClientRect();
      this.clicks.push({ x: e.clientX - box.left, y: e.clientY - box.top });
    });
  }

  axis() {
    let x = 0;
    let y = 0;
    if (this.down.has('KeyA') || this.down.has('ArrowLeft')) x -= 1;
    if (this.down.has('KeyD') || this.down.has('ArrowRight')) x += 1;
    if (this.down.has('KeyW') || this.down.has('ArrowUp')) y -= 1;
    if (this.down.has('KeyS') || this.down.has('ArrowDown')) y += 1;
    return { x, y };
  }

  get running() {
    return this.down.has('ShiftLeft') || this.down.has('ShiftRight');
  }

  get sneaking() {
    return this.down.has('KeyC') || this.down.has('ControlLeft');
  }

  consumeClick() {
    return this.clicks.shift() ?? null;
  }

  endFrame() {
    this.hit.clear();
  }
}
