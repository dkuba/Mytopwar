import assert from 'node:assert/strict';
// Import the runtime as well as content: data-only tests cannot catch engine syntax errors.
import { Game } from '../src/core/game.js';
assert.equal(typeof Game, 'function');
import { UNIT_TYPES, STARTING_SQUAD } from '../src/data/units.js';
import { ENEMY_TYPES } from '../src/data/enemies.js';
import { ARTIFACTS } from '../src/data/artifacts.js';
import { BOSSES } from '../src/data/bosses.js';
import { LEVELS, WAVE_ARCHETYPES } from '../src/data/levels.js';
import { RNG } from '../src/core/random.js';

assert.equal(Object.keys(UNIT_TYPES).length, 12, 'expected 12 troop archetypes');
assert.equal(Object.keys(ENEMY_TYPES).length, 14, 'expected 14 enemy archetypes');
assert.equal(ARTIFACTS.length, 24, 'expected 24 artifacts');
assert.equal(LEVELS.length, 12, 'expected 12 campaign levels');
assert.ok(Object.keys(BOSSES).length >= 10, 'expected at least 10 boss archetypes');
assert.equal(STARTING_SQUAD.length, 4, 'campaign must begin with a small visible squad');

for (const [name, u] of Object.entries(UNIT_TYPES)) {
  assert.ok(u.hp > 0 && u.damage >= 0 && u.fireRate > 0 && u.range > 0, `invalid unit ${name}`);
}
for (const [name, e] of Object.entries(ENEMY_TYPES)) {
  assert.ok(e.hp > 0 && e.speed > 0 && e.damage >= 0 && e.cost > 0, `invalid enemy ${name}`);
}
for (const a of ARTIFACTS) {
  assert.ok(a.id && a.name && a.description && typeof a.apply === 'function', `invalid artifact ${a.id}`);
}
for (const [name, table] of Object.entries(WAVE_ARCHETYPES)) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `wave weights must sum to 1: ${name}`);
  for (const [enemy] of table) assert.ok(ENEMY_TYPES[enemy], `unknown enemy ${enemy} in ${name}`);
}
for (const [index, level] of LEVELS.entries()) {
  assert.ok(level.events.length >= 3, `level ${index + 1} too short`);
  assert.equal(level.events.at(-1).type, 'boss', `level ${index + 1} must end with boss`);
  assert.ok(BOSSES[level.events.at(-1).id], `unknown boss in level ${index + 1}`);
  for (const ev of level.events) {
    if (ev.kind && ev.options) for (const o of ev.options) assert.ok(UNIT_TYPES[o.unit], `unknown reward unit ${o.unit}`);
    if (ev.kind && ev.type === 'wave') assert.ok(WAVE_ARCHETYPES[ev.kind], `unknown wave kind ${ev.kind}`);
  }
}

const a = new RNG(12345), b = new RNG(12345);
for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next(), 'seeded RNG must be deterministic');

console.log('Last Column verification passed');
console.log(`${Object.keys(UNIT_TYPES).length} units, ${Object.keys(ENEMY_TYPES).length} enemies, ${ARTIFACTS.length} artifacts, ${LEVELS.length} levels, ${Object.keys(BOSSES).length} bosses`);
