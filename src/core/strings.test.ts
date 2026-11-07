// A full string must chain and combo on a standing opponent. Run: npm test
import assert from 'node:assert/strict';
import { B, createSim, step, type Sim } from './sim.ts';
import type { FighterId } from './data.ts';

const KEY: Record<string, number> = { U: B.FP, I: B.BP, J: B.FK, K: B.BK };

function fightReady(p1: FighterId, p2: FighterId): Sim {
  const s = createSim(p1, p2);
  while (s.phase !== 'fight') step(s, [0, 0]);
  s.f[0].x = 560;
  s.f[1].x = 640;
  return s;
}

// Press each key for 2 ticks, 9 ticks apart, and return the biggest combo the dummy took.
function play(p1: FighterId, keys: string): number {
  const s = fightReady(p1, 'rook');
  let best = 0;
  const seq = keys.split(' ');
  for (let t = 0; t < 120; t++) {
    const k = Math.floor(t / 9), press = t % 9 < 2 && k < seq.length ? KEY[seq[k]] : 0;
    for (const e of step(s, [press, 0])) best = Math.max(best, e.combo ?? 0);
  }
  return best;
}

for (const [p1, keys, hits] of [['kaal', 'U U I', 3], ['kaal', 'J K', 2], ['vanta', 'U I J', 3], ['vanta', 'I I', 2], ['rook', 'I U', 2], ['rook', 'J J', 2]] as [FighterId, string, number][]) {
  const got = play(p1, keys);
  assert.equal(got, hits, `${p1} ${keys}: expected ${hits} hit combo, got ${got}`);
  console.log(`ok  ${p1} ${keys}: ${got} hit combo`);
}
