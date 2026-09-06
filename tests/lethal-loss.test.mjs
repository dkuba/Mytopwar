import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/sim/simulation.js';
import {spawnRow, spawnObject, updateObjects} from '../src/sim/world.js';
import {removeTroops} from '../src/sim/army.js';
const fresh = () => { const s = new Simulation(); s.events = []; return s; };

test('last stand covers lethal arithmetic gate and preserves loss accounting', () => {
  const s = fresh(); s.mods.laststand = 1;
  spawnRow(s, [{lane:0, op:'subtract', value:10}], .01);
  s.step();
  assert.equal(s.phase, 'running');
  assert.equal(s.units.length, 1);
  assert.equal(s.lastStandUsed, true);
  assert.equal(s.stats.lost, 4);
  assert.equal(s.stats.trapLoss, 4);
  assert.match(s.message.text, /ВТОРОЙ ШАНС/);
});
test('lethal mine triggers last stand once and a subsequent trap is terminal', () => {
  const s = fresh(); s.mods.laststand = 1;
  s.units.forEach(u => { u.x = 0; u.z = 0; });
  spawnObject(s, 'mine', 0, {z:.01, quota:10});
  s.step();
  assert.equal(s.phase, 'running'); assert.equal(s.units.length, 1);
  spawnRow(s, [{lane:0, op:'subtract', value:10}], .01); s.step();
  assert.equal(s.phase, 'defeat'); assert.equal(s.units.length, 0);
});
test('a later same-tick pickup cannot resurrect a defeated squad for free', () => {
  const s = fresh();
  spawnRow(s, [{lane:0, op:'subtract', value:10}], .01);
  spawnObject(s, 'pickup', 0, {z:.06, count:8});
  s.step();
  assert.equal(s.phase, 'defeat'); assert.equal(s.units.length, 0);
  assert.equal(s.stats.rescued, 0);
});
test('empty squads cannot enter reinforcement gates', () => {
  const s = fresh(); s.units = [];
  spawnRow(s, [{lane:0, op:'add', value:8}], .01);
  updateObjects(s, 1/60);
  assert.equal(s.units.length, 0); assert.equal(s.stats.gates, 0);
});
test('partial trap losses never consume last stand', () => {
  const s = fresh(); s.mods.laststand = 1;
  const count = removeTroops(s, [s.units[0].id], 'trap');
  assert.equal(count, 1); assert.equal(s.units.length, 3);
  assert.equal(s.lastStandUsed, false);
});
