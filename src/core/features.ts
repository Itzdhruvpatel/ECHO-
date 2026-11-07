// What the Echo sees and what it can do.
// Features describe the fight from one fighter's point of view. Actions are the 20 choices
// a player makes about 10 times a second. Both the recorder and the Echo use this file,
// so a recorded habit and a replayed habit mean the same thing.

import { MOVES } from './data.ts';
import { B, POWER_COST, OVERCLOCK_COST, ROUND_TIME, WALL_L, WALL_R, type FState, type Fighter, type Sim } from './sim.ts';

export const DECISION_TICKS = 6;

export const ACTIONS = [
  'IDLE', 'WALK IN', 'WALK BACK', 'DASH IN', 'DASH BACK', 'JUMP UP', 'JUMP IN', 'JUMP BACK',
  'CROUCH', 'BLOCK HIGH', 'BLOCK LOW', 'FRONT PUNCH', 'BACK PUNCH', 'FRONT KICK', 'BACK KICK',
  'THROW', 'SPECIAL', 'SUPER POWER', 'OVERCLOCK', 'JUMP ATTACK',
] as const;
export const N_ACTIONS = ACTIONS.length;
export const A = Object.fromEntries(ACTIONS.map((n, i) => [n.replace(/ /g, '_'), i])) as Record<string, number>;

const STATES: FState[] = ['idle', 'walk', 'crouch', 'jump', 'dash', 'attack', 'block', 'hitstun', 'blockstun', 'down', 'ko', 'win'];
export const N_FEATURES = 12 + STATES.length * 2 + 3 + 4;

function oneHot(out: number[], i: number, n: number) {
  for (let k = 0; k < n; k++) out.push(k === i ? 1 : 0);
}

// Feature vector for fighter i. Distances are signed toward the opponent, so a habit
// learned facing right is the same habit facing left.
export function features(s: Sim, i: number): number[] {
  const me = s.f[i], op = s.f[1 - i], dir = me.facing;
  const dx = (op.x - me.x) * dir;
  const behind = dir === 1 ? me.x - WALL_L : WALL_R - me.x;
  const out = [
    dx / 1000, Math.abs(op.x - me.x) / 1000, me.y / 200, op.y / 200,
    me.hp / me.maxHp, op.hp / op.maxHp, me.meter / OVERCLOCK_COST, op.meter / OVERCLOCK_COST,
    s.timer / ROUND_TIME, (me.vx * dir) / 15, (op.vx * dir) / 15, behind / 1000,
  ];
  oneHot(out, STATES.indexOf(me.state), STATES.length);
  oneHot(out, STATES.indexOf(op.state), STATES.length);
  const m = op.state === 'attack' && op.move ? MOVES[op.move] : null;
  const phase = !m ? -1 : op.frame <= m.startup ? 0 : op.frame <= m.startup + m.active ? 1 : 2;
  oneHot(out, phase, 3);
  oneHot(out, m ? ['high', 'mid', 'low', 'throw'].indexOf(m.level) : -1, 4);
  return out;
}

// Turn what a player pressed during one decision window into an action label.
// held[k] are the input bits on each tick of the window, prev the bits just before it.
export function labelAction(held: number[], prev: number, f: Fighter, facingAtStart: 1 | -1): number {
  const fwd = facingAtStart === 1 ? B.RIGHT : B.LEFT, back = facingAtStart === 1 ? B.LEFT : B.RIGHT;
  let edges = 0, last = prev;
  for (const h of held) { edges |= h & ~last; last = h; }
  const end = held[held.length - 1] ?? 0;
  if (edges & B.OVERCLOCK) return A.OVERCLOCK;
  if (edges & B.POWER) return A.SUPER_POWER;
  if (edges & B.SPECIAL) return A.SPECIAL;
  if (edges & B.FP && edges & B.FK) return A.THROW;
  if (edges & (B.FP | B.BP | B.FK | B.BK) && f.y > 0) return A.JUMP_ATTACK;
  if (edges & B.BP) return A.BACK_PUNCH;
  if (edges & B.BK) return A.BACK_KICK;
  if (edges & B.FK) return A.FRONT_KICK;
  if (edges & B.FP) return A.FRONT_PUNCH;
  if (f.state === 'dash' && f.frame < DECISION_TICKS) return f.vx * f.facing > 0 ? A.DASH_IN : A.DASH_BACK;
  if (edges & B.UP) return end & fwd ? A.JUMP_IN : end & back ? A.JUMP_BACK : A.JUMP_UP;
  if (end & B.BLOCK) return end & B.DOWN ? A.BLOCK_LOW : A.BLOCK_HIGH;
  if (end & B.DOWN) return A.CROUCH;
  if (end & fwd) return A.WALK_IN;
  if (end & back) return A.WALK_BACK;
  return A.IDLE;
}

// Input bits for tick t (0..5) of a decision window that performs action a.
export function actionBits(a: number, facing: 1 | -1, t: number): number {
  const fwd = facing === 1 ? B.RIGHT : B.LEFT, back = facing === 1 ? B.LEFT : B.RIGHT;
  const tap = (b: number) => (t < 2 ? b : 0);
  switch (a) {
    case A.WALK_IN: return fwd;
    case A.WALK_BACK: return back;
    case A.DASH_IN: return t === 0 || t === 2 ? fwd : 0;
    case A.DASH_BACK: return t === 0 || t === 2 ? back : 0;
    case A.JUMP_UP: return tap(B.UP);
    case A.JUMP_IN: return tap(B.UP) | fwd;
    case A.JUMP_BACK: return tap(B.UP) | back;
    case A.CROUCH: return B.DOWN;
    case A.BLOCK_HIGH: return B.BLOCK;
    case A.BLOCK_LOW: return B.BLOCK | B.DOWN;
    case A.FRONT_PUNCH: return tap(B.FP);
    case A.BACK_PUNCH: return tap(B.BP);
    case A.FRONT_KICK: return tap(B.FK);
    case A.BACK_KICK: return tap(B.BK);
    case A.THROW: return tap(B.FP | B.FK);
    case A.SPECIAL: return tap(B.SPECIAL);
    case A.SUPER_POWER: return tap(B.POWER);
    case A.OVERCLOCK: return tap(B.OVERCLOCK);
    case A.JUMP_ATTACK: return tap(B.FK);
    default: return 0;
  }
}

// Actions that cannot do anything right now are masked out before sampling.
export function legalMask(f: Fighter): number[] {
  return ACTIONS.map((_, a) =>
    (a === A.SUPER_POWER && f.meter < POWER_COST) || (a === A.OVERCLOCK && f.meter < OVERCLOCK_COST) || (a === A.JUMP_ATTACK && f.y === 0) ? 0 : 1);
}
