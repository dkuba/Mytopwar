/** World-space rules shared by simulation, renderer and tests. */
export const LIMITS = Object.freeze({ army: 120, enemies: 700, effects: 240, objects: 80, halfRoad: 6 });
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const distance2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
export const isAlive = (u) => u.hp > 0 && !u.dead;
export class Random {
  constructor(seed = 1) { this.state = (seed >>> 0) || 1; }
  next() { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state / 4294967296; }
  range(a, b) { return a + this.next() * (b - a); }
  pick(a) { return a[Math.floor(this.next() * a.length)]; }
  shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
}
export function formation(index, count, center = 0) {
  const cols = Math.min(10, Math.max(2, Math.ceil(Math.sqrt(count) * 1.15)));
  const row = Math.floor(index / cols), inRow = Math.min(cols, count - row * cols);
  return { x: clamp(center, -3.5, 3.5) + (index % cols - (inRow - 1) / 2) * 0.43, z: -0.35 - row * 0.43 };
}
export function inside(u, shape, padding = 0) {
  if (shape.shape === 'rect') return Math.abs(u.x - shape.x) <= shape.width / 2 + padding && Math.abs(u.z - shape.z) <= shape.depth / 2 + padding;
  return distance2(u, shape) <= ((shape.radius || 1) + padding) ** 2;
}
/** Gate values affect the whole squad only when its marked center crosses the gate. */
export function gateCount(count, op, value) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid gate value');
  if (op === 'add') return clamp(count + Math.floor(value), 0, LIMITS.army);
  if (op === 'multiply') return clamp(Math.floor(count * value), 0, LIMITS.army);
  if (op === 'subtract') return Math.max(0, count - Math.floor(value));
  if (op === 'divide') return value > 0 ? Math.floor(count / value) : count;
  return count;
}
/** Nearby searches avoid scanning the entire enemy population for every shooter. */
export class Grid {
  constructor(size = 4) { this.size = size; this.cells = new Map(); }
  rebuild(entities) {
    this.cells.clear();
    for (const e of entities) {
      if (!isAlive(e) || e.hidden) continue;
      const key = `${Math.floor(e.x / this.size)},${Math.floor(e.z / this.size)}`;
      if (!this.cells.has(key)) this.cells.set(key, []);
      this.cells.get(key).push(e);
    }
  }
  near(x, z, radius) {
    const out = [], s = this.size;
    for (let a = Math.floor((x - radius) / s); a <= Math.floor((x + radius) / s); a++) {
      for (let b = Math.floor((z - radius) / s); b <= Math.floor((z + radius) / s); b++) {
        const cell = this.cells.get(`${a},${b}`); if (cell) out.push(...cell);
      }
    }
    return out;
  }
}
