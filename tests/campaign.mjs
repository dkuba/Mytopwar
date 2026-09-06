import {Simulation} from '../src/sim/simulation.js';
import {drive} from './bot.mjs';
import {campaignOptions} from '../scripts/campaign-options.mjs';
import {writeFile, rename} from 'node:fs/promises';

const {from, to, seeds} = campaignOptions(process.env);
const output = `test-results-campaign-${seeds.join('-')}-${from}-${to}.json`;
const reports = [];
for (const seed of seeds) for (let level = from; level <= to; level++) {
  const s = new Simulation({level, seed, commander: 'captain'});
  let peak = 4, peakEnemies = 0, ticks = 0;
  while (['running', 'choice'].includes(s.phase) && ticks++ < 240 * 60) {
    drive(s); s.step();
    peak = Math.max(peak, s.units.length);
    peakEnemies = Math.max(peakEnemies, s.enemies.length);
  }
  const r = {level, seed, outcome: s.phase, seconds: +s.time.toFixed(1),
    survivors: s.units.length, peakArmy: peak, peakEnemies, kills: s.stats.kills,
    gates: s.stats.gates, rescued: s.stats.rescued, trapLoss: s.stats.trapLoss};
  reports.push(r);
  // Commit evidence after each completed mission, not only after the last mission.
  await writeFile(output + '.tmp', JSON.stringify(reports, null, 2) + '\n');
  await rename(output + '.tmp', output);
  console.log(JSON.stringify(r));
}
if (reports.some(r => r.outcome !== 'victory')) process.exitCode = 1;
