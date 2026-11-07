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

// Super powers and Overclock spend meter and do their thing.
function power(p1: FighterId, button: number) {
  const s = fightReady(p1, 'rook');
  s.f[0].meter = 300;
  const evs = [];
  for (let t = 0; t < 200; t++) {
    if (t === 70) s.f[0].hp = 500; // for Rewind: take "damage" after history fills
    evs.push(...step(s, [t >= 80 && t < 82 ? button : 0, 0]));
  }
  return { s, evs };
}
{
  const k = power('kaal', B.POWER);
  assert.ok(k.evs.some(e => e.type === 'power'), 'Rewind did not fire');
  assert.equal(k.s.f[0].hp, 1000, 'Rewind did not restore health');
  const v = power('vanta', B.POWER);
  assert.ok(v.s.f[0].x > v.s.f[1].x, 'Shadow Phase did not cross behind the opponent');
  const r = power('rook', B.POWER);
  assert.ok(r.evs.some(e => e.type === 'power') && r.s.f[0].meter === 200, 'Iron Will did not fire');
  for (const id of ['kaal', 'vanta', 'rook'] as FighterId[]) {
    const o = power(id, B.OVERCLOCK);
    assert.ok(o.evs.some(e => e.type === 'super'), `${id} Overclock did not start`);
    assert.ok(o.evs.filter(e => e.type === 'hit').length >= 1, `${id} Overclock never hit`);
  }
  console.log('ok  super powers and Overclock supers');
}

// A round 1 K.O. with the special is a Last Breath; with a normal it is not.
for (const [press, want] of [[B.SPECIAL, true], [B.BP, false]] as [number, boolean][]) {
  const s = fightReady('rook', 'kaal');
  s.f[1].hp = 20;
  for (let t = 0; t < 80; t++) step(s, [t < 2 ? press : 0, 0]);
  assert.equal(s.phase, 'outro', 'round did not end');
  assert.equal(s.lastBreath, want, `Last Breath should be ${want}`);
}
console.log('ok  Last Breath only on a special K.O.');

// A player who wins by K.O. and enters nothing still gets their Deletion.
{
  const s = fightReady('kaal', 'rook');
  s.wins[0] = 1;
  s.f[1].hp = 20;
  for (let t = 0; t < 1200 && s.phase !== 'over'; t++) step(s, [t < 2 ? B.BP : 0, 0]);
  assert.ok(s.deleted, 'K.O. win without input should still play the Deletion');
  console.log('ok  Deletion plays even without the input');
}

for (const [p1, keys, hits] of [['kaal', 'U U I', 3], ['kaal', 'J K', 2], ['vanta', 'U I J', 3], ['vanta', 'I I', 2], ['rook', 'I U', 2], ['rook', 'J J', 2]] as [FighterId, string, number][]) {
  const got = play(p1, keys);
  assert.equal(got, hits, `${p1} ${keys}: expected ${hits} hit combo, got ${got}`);
  console.log(`ok  ${p1} ${keys}: ${got} hit combo`);
}
