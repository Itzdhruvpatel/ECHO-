// Same inputs must give the same final state. Run: npm test
import assert from 'node:assert/strict';
import { createSim, step } from './sim.ts';
import { cpuInput, makeCpu } from './ai.ts';
import type { FighterId } from './data.ts';

function run(p1: FighterId, p2: FighterId, seed: number) {
  const s = createSim(p1, p2);
  const cpus = [makeCpu(seed), makeCpu(seed + 1)];
  let hits = 0;
  for (let i = 0; i < 60000 && s.phase !== 'over'; i++) {
    const ev = step(s, [cpuInput(s, 0, cpus[0]), cpuInput(s, 1, cpus[1])]);
    hits += ev.filter(e => e.type === 'hit' || e.type === 'throw').length;
  }
  return { s, hits, json: JSON.stringify({ s, cpus }) };
}

for (const [p1, p2] of [['kaal', 'rook'], ['vanta', 'kaal'], ['rook', 'vanta']] as [FighterId, FighterId][]) {
  const a = run(p1, p2, 7), b = run(p1, p2, 7);
  assert.equal(a.json, b.json, `${p1} vs ${p2}: runs diverged`);
  assert.equal(a.s.phase, 'over', `${p1} vs ${p2}: match never finished`);
  assert.ok(a.hits > 0, `${p1} vs ${p2}: nobody landed a hit`);
  console.log(`ok  ${p1} vs ${p2}: ${a.s.tick} ticks, ${a.hits} hits, wins ${a.s.wins.join('-')}`);
}
