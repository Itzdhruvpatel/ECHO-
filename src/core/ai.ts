// Rule-based CPU. Reads the fight about 10 times a second and acts after a reaction delay.
// Deterministic: all randomness comes from its own seeded generator.

import { ATTACK_BUTTONS, B, HALF_W, OVERCLOCK_COST, POWER_COST, type Sim } from './sim.ts';
import { FIGHTERS, MOVES, type Btn, type FighterId } from './data.ts';

export interface Cpu {
  seed: number;
  delay: number;
  queue: { at: number; bits: number }[];
  out: number;
  follow: number[]; // string follow-up presses chosen by the last decision
  busyUntil: number;
  skill: number; // 0 (sloppy) to 1 (sharp): scales blocking and how often it hesitates
}

// delay is the reaction time in ticks: about 24 (0.4 s) is easy, 9 (0.15 s) is hard.
export function makeCpu(seed: number, delay = 15, skill = 0.5): Cpu {
  return { seed: seed >>> 0 || 1, delay, queue: [], out: 0, follow: [], busyUntil: 0, skill };
}

function rand(c: Cpu): number {
  let s = c.seed;
  s = (s ^ (s << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  c.seed = s;
  return s / 4294967296;
}

type Pick = [string, number];
const PERSONA: Record<FighterId, { range: number; block: number; attacks: Pick[] }> = {
  kaal: { range: 230, block: 0.45, attacks: [['special', 4], ['fk', 2], ['fp', 2], ['bk', 1], ['throw', 1]] },
  vanta: { range: 90, block: 0.3, attacks: [['fp', 3], ['fk', 3], ['bp', 2], ['bk', 2], ['special', 2], ['throw', 1]] },
  rook: { range: 100, block: 0.55, attacks: [['throw', 4], ['bp', 3], ['special', 3], ['fk', 1]] },
};
const BITS: Record<string, number> = { fp: B.FP, bp: B.BP, fk: B.FK, bk: B.BK, special: B.SPECIAL, throw: B.FP | B.FK };

function decide(s: Sim, i: number, c: Cpu): number {
  const me = s.f[i], op = s.f[1 - i];
  const dist = Math.abs(op.x - me.x);
  const fwd = op.x >= me.x ? B.RIGHT : B.LEFT, back = fwd === B.RIGHT ? B.LEFT : B.RIGHT;
  const P = PERSONA[me.id];
  const r = rand(c);

  const low = me.hp / me.maxHp < 0.35;
  if (me.id === 'kaal' && me.state === 'hitstun' && low && me.meter >= POWER_COST && r < 0.5) return B.POWER; // panic Rewind
  if (me.meter >= OVERCLOCK_COST && dist < 220 && r < 0.3) return B.OVERCLOCK;
  if (me.meter >= POWER_COST && rand(c) < 0.06) {
    if (me.id === 'vanta' && dist > 200) return B.POWER;
    if (me.id === 'rook' && dist > 180) return B.POWER; // armor up to walk through zoning
  }
  const sk = 0.5 + c.skill; // 0.5 to 1.5
  if (op.state === 'attack' && op.move && dist < 360 && r < P.block * sk) return B.BLOCK | (MOVES[op.move].level === 'low' ? B.DOWN : 0);
  if (dist < 150 && r < 0.12 * sk) return B.BLOCK;
  if (r < 0.17 * (2 - sk)) return 0; // hesitate
  if (r < 0.21 * (2 - sk) + 0.04) return B.UP | (rand(c) < 0.6 ? fwd : 0);

  const opts = P.attacks.filter(([k]) => {
    const m = MOVES[k === 'special' ? FIGHTERS[me.id].special : k];
    const reach = m.x1 + HALF_W + (m.lunge ? m.lunge * (m.startup + m.active) * 0.7 : 0);
    return dist <= reach && dist + HALF_W >= m.x0;
  });
  if (opts.length && rand(c) < 0.7) {
    let roll = rand(c) * opts.reduce((n, o) => n + o[1], 0);
    for (const [k, w] of opts) if ((roll -= w) <= 0) {
      // sometimes finish the string that starts with this move
      let cur = k === 'special' ? FIGHTERS[me.id].special : k;
      const chains = FIGHTERS[me.id].chains;
      while (chains[cur] && rand(c) < 0.65) {
        const [btn, next] = Object.entries(chains[cur])[0];
        c.follow.push(B[btn as Btn]);
        cur = next!;
      }
      return BITS[k];
    }
  }
  if (dist > P.range + 30) return fwd;
  if (dist < P.range - 60) return back;
  return rand(c) < 0.5 ? 0 : rand(c) < 0.5 ? fwd : back;
}

export function cpuInput(s: Sim, i: number, c: Cpu): number {
  if (s.phase === 'finish') {
    // the CPU always performs its Deletion: down, down, special
    if (s.roundWinner !== i) return 0;
    const f = s.phaseFrame;
    return f === 40 || f === 41 || f === 46 || f === 47 ? B.DOWN : f === 52 || f === 53 ? B.SPECIAL : 0;
  }
  while (c.queue.length && c.queue[0].at <= s.tick) c.out = c.queue.shift()!.bits;
  if (s.phase === 'fight' && s.tick % 6 === 0 && s.tick >= c.busyUntil) {
    const bits = decide(s, i, c);
    const at = s.tick + c.delay;
    // press for 2 ticks, then keep only movement and block held
    c.queue.push({ at, bits }, { at: at + 2, bits: bits & ~ATTACK_BUTTONS });
    c.follow.forEach((b, j) => c.queue.push({ at: at + 9 * (j + 1), bits: b }, { at: at + 9 * (j + 1) + 2, bits: 0 }));
    c.busyUntil = s.tick + 9 * c.follow.length + 3;
    c.queue.sort((p, q) => p.at - q.at);
    c.follow.length = 0;
  }
  if (s.phase !== 'fight') { c.queue.length = 0; c.out = 0; c.busyUntil = 0; }
  return c.out;
}
