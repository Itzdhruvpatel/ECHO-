// Balance check: equal CPUs play every pairing many times, from both sides.
// Run: node scripts/balance.ts   (prints each fighter's overall win rate)
import { createSim, step } from '../src/core/sim.ts';
import { cpuInput, makeCpu } from '../src/core/ai.ts';
import { ROSTER, type FighterId } from '../src/core/data.ts';

const N = Number(process.argv[2] ?? 100);
const wins: Record<string, number> = {}, games: Record<string, number> = {};
const pair: Record<string, string> = {};
for (const a of ROSTER) for (const b of ROSTER) {
  if (a === b) continue;
  let aw = 0;
  for (let n = 0; n < N; n++) {
    const s = createSim(a, b), c = [makeCpu(1000 + n * 7), makeCpu(5000 + n * 13)];
    for (let t = 0; t < 60000 && s.phase !== 'over'; t++) step(s, [cpuInput(s, 0, c[0]), cpuInput(s, 1, c[1])]);
    const w: FighterId | null = s.wins[0] > s.wins[1] ? a : s.wins[1] > s.wins[0] ? b : null;
    if (w === a) aw++;
    for (const f of [a, b]) games[f] = (games[f] ?? 0) + 1;
    if (w) wins[w] = (wins[w] ?? 0) + 1;
  }
  pair[`${a} vs ${b}`] = `${Math.round((100 * aw) / N)}%`;
}
console.log(pair);
for (const f of ROSTER) console.log(`${f}: ${Math.round((100 * (wins[f] ?? 0)) / games[f])}% wins`);
