// A full string must chain and combo on a standing opponent. Run: npm test
import assert from 'node:assert/strict';
import { B, createSim, step, type Sim } from './sim.ts';
import { ROSTER, type FighterId } from './data.ts';

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
  for (const id of ROSTER) {
    const o = power(id, B.OVERCLOCK);
    assert.ok(o.evs.some(e => e.type === 'super'), `${id} Overclock did not start`);
    assert.ok(o.evs.filter(e => e.type === 'hit').length >= 1, `${id} Overclock never hit`);
  }
  console.log('ok  super powers and Overclock supers');
}

// The version 2 and 3 powers each do their own thing.
{
  const ion = power('ion', B.POWER);
  assert.ok(ion.s.f[0].charge > 0, 'Overcharge did not charge');
  // Third Eye, Reflection: the next hit from the opponent is cancelled
  for (const id of ['bhairav', 'mirae'] as FighterId[]) {
    const s = fightReady(id, 'kaal');
    s.f[0].meter = 300;
    s.f[0].x = 600; s.f[1].x = 690;
    for (let t = 0; t < 3; t++) step(s, [t < 2 ? B.POWER : 0, 0]);
    for (let t = 0; t < 40; t++) step(s, [0, t < 2 ? B.FP : 0]);
    assert.equal(s.f[0].hp, s.f[0].maxHp, `${id} power should cancel the next hit`);
  }
  // Shatter Guard: Mirae parries and the attacker gets hurt
  {
    const s = fightReady('mirae', 'kaal');
    s.f[0].x = 600; s.f[1].x = 690;
    for (let t = 0; t < 40; t++) step(s, [t < 2 ? B.SPECIAL : 0, t >= 3 && t < 5 ? B.FP : 0]);
    assert.ok(s.f[1].hp < s.f[1].maxHp && s.f[0].hp === s.f[0].maxHp, `parry should hurt the attacker: ${s.f[0].hp} ${s.f[1].hp}`);
  }
  // Updraft: jumps go higher
  const apex = (up: boolean) => {
    const s = fightReady('sora', 'rook');
    s.f[0].meter = 300;
    if (up) for (let t = 0; t < 3; t++) step(s, [t < 2 ? B.POWER : 0, 0]);
    let top = 0;
    for (let t = 0; t < 90; t++) { step(s, [t < 2 ? B.UP : 0, 0]); top = Math.max(top, s.f[0].y); }
    return top;
  };
  assert.ok(apex(true) > apex(false) * 1.4, 'Updraft should raise the jump');
  // Desync: Glitch slips back out of harm's way
  const g = power('glitch', B.POWER);
  assert.ok(g.evs.some(e => e.type === 'power'), 'Desync did not fire');
  console.log('ok  Overcharge, Third Eye, Reflection, Shatter Guard, Updraft, Desync');
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

// Same move, same frame, in range of each other: both get hit (a trade).
{
  const s = fightReady('kaal', 'kaal');
  s.f[0].x = 600; s.f[1].x = 680;
  for (let t = 0; t < 30; t++) step(s, [t < 2 ? B.FP : 0, t < 2 ? B.FP : 0]);
  assert.ok(s.f[0].hp < s.f[0].maxHp && s.f[1].hp < s.f[1].maxHp, `trade should hurt both: ${s.f[0].hp} ${s.f[1].hp}`);
  console.log('ok  same-frame hits trade');
}

// Rounds that keep timing out in a draw still end the match.
{
  const s = fightReady('rook', 'rook');
  for (let t = 0; t < 99 * 60 * 8 && s.phase !== 'over'; t++) step(s, [0, 0]);
  assert.equal(s.phase, 'over', `draws never ended (round ${s.round})`);
  console.log('ok  endless draws are capped');
}

// A player who wins by K.O. and enters nothing still gets their Deletion.
{
  const s = fightReady('kaal', 'rook');
  s.wins[0] = 1;
  s.f[1].hp = 20;
  for (let t = 0; t < 1200 && s.phase !== 'over'; t++) step(s, [t < 2 ? B.BP : 0, 0]);
  assert.ok(s.deleted, 'K.O. win without input should still play the Deletion');
  console.log('ok  Deletion plays even without the input');
}

for (const [p1, keys, hits] of [['kaal', 'U U I', 3], ['kaal', 'J K', 2], ['vanta', 'U I J', 3], ['vanta', 'I I', 2], ['rook', 'I U', 2], ['rook', 'J J', 2],
  ['ion', 'U J', 2], ['ion', 'J I', 2], ['bhairav', 'I I', 2], ['bhairav', 'K K', 2], ['mirae', 'U I', 2], ['mirae', 'J K', 2],
  ['sora', 'J J', 2], ['sora', 'U U', 2], ['glitch', 'I U', 2], ['glitch', 'J K', 2]] as [FighterId, string, number][]) {
  const got = play(p1, keys);
  assert.equal(got, hits, `${p1} ${keys}: expected ${hits} hit combo, got ${got}`);
  console.log(`ok  ${p1} ${keys}: ${got} hit combo`);
}
