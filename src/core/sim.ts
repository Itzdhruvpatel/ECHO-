// Deterministic fixed-tick fight simulation (60 ticks per second).
// No rendering or browser imports, so it runs headless for tests and training later.

import { FIGHTERS, MOVES, type Btn, type FighterId, type MoveData } from './data.ts';

export const B = { UP: 1, DOWN: 2, LEFT: 4, RIGHT: 8, FP: 16, BP: 32, FK: 64, BK: 128, BLOCK: 256, SPECIAL: 512 };
export const ATTACK_BUTTONS = B.FP | B.BP | B.FK | B.BK | B.SPECIAL;
const BTN = [B.FP, B.BP, B.FK, B.BK, B.SPECIAL]; // index order used by Fighter.age
const FP = 0, BP = 1, FK = 2, BK = 3, SP = 4;
const BTN_INDEX: Record<Btn, number> = { FP, BP, FK, BK };
const CHAIN_WINDOW = 10; // recovery frames during which a string can still continue

export const BUFFER = 8;
export const WALL_L = 140, WALL_R = 1140;
export const STAND_H = 230, CROUCH_H = 150, HALF_W = 35;
export const ROUND_TIME = 99 * 60, INTRO_FRAMES = 100, OUTRO_FRAMES = 200, DOWN_FRAMES = 45;
const GRAVITY = 0.9, JUMP_V = 18, JUMP_VX = 5, DASH_FRAMES = 14, DASH_WINDOW = 12, MIN_GAP = 70, METER_MAX = 300;

export type FState = 'idle' | 'walk' | 'crouch' | 'jump' | 'dash' | 'attack' | 'block' | 'hitstun' | 'blockstun' | 'down' | 'ko' | 'win';
export type Phase = 'intro' | 'fight' | 'outro' | 'over';

export interface Fighter {
  id: FighterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  maxHp: number;
  meter: number;
  state: FState;
  frame: number;
  move: string | null;
  hasHit: boolean;
  airUsed: boolean;
  stun: number;
  kd: boolean;
  crouching: boolean;
  combo: number;
  held: number;
  age: number[]; // frames since each attack button was pressed; BUFFER means none waiting
  tapDir: number;
  tapAge: number;
  dashReq: number;
}

export interface SimEvent {
  type: 'hit' | 'block' | 'throw' | 'ko';
  who: number; // attacker index
  x: number;
  y: number;
  pow: number;
  combo?: number; // hits in a row the defender has taken, including this one
}

export interface Sim {
  tick: number;
  phase: Phase;
  phaseFrame: number;
  round: number;
  timer: number;
  wins: [number, number];
  roundWinner: number;
  hitstop: number;
  f: [Fighter, Fighter];
}

function makeFighter(id: FighterId, x: number, facing: 1 | -1): Fighter {
  const hp = FIGHTERS[id].hp;
  return {
    id, x, y: 0, vx: 0, vy: 0, facing, hp, maxHp: hp, meter: 0,
    state: 'idle', frame: 0, move: null, hasHit: false, airUsed: false, stun: 0, kd: false, crouching: false, combo: 0,
    held: 0, age: BTN.map(() => BUFFER), tapDir: 0, tapAge: DASH_WINDOW, dashReq: 0,
  };
}

export function createSim(p1: FighterId, p2: FighterId): Sim {
  return {
    tick: 0, phase: 'intro', phaseFrame: 0, round: 1, timer: ROUND_TIME, wins: [0, 0], roundWinner: -1, hitstop: 0,
    f: [makeFighter(p1, 440, 1), makeFighter(p2, 840, -1)],
  };
}

function setState(f: Fighter, st: FState) {
  f.state = st;
  f.frame = 0;
}

// Edge detection plus an 8 frame press buffer. Buffer ages freeze during hitstop.
function readInput(f: Fighter, bits: number, frozen: boolean) {
  const edge = bits & ~f.held;
  for (let i = 0; i < BTN.length; i++) {
    if (edge & BTN[i]) f.age[i] = 0;
    else if (!frozen && f.age[i] < BUFFER) f.age[i]++;
  }
  const dirEdge = edge & (B.LEFT | B.RIGHT);
  if (dirEdge) {
    if (dirEdge === f.tapDir && f.tapAge < DASH_WINDOW) f.dashReq = dirEdge;
    f.tapDir = dirEdge;
    f.tapAge = 0;
  } else if (!frozen && f.tapAge < DASH_WINDOW) f.tapAge++;
  if (f.tapAge >= DASH_WINDOW) f.dashReq = 0;
  f.held = bits;
}

const pressed = (f: Fighter, i: number) => f.age[i] < BUFFER;
const consume = (f: Fighter, ...idx: number[]) => { for (const i of idx) f.age[i] = BUFFER; };

function startMove(f: Fighter, id: string) {
  f.move = id;
  f.hasHit = false;
  setState(f, 'attack');
  if (f.y === 0) f.vx = 0;
}

// Returns true when the input was handled (an attack started, or we are waiting on a throw).
function tryAttack(f: Fighter): boolean {
  // Throw = front punch + front kick together. A lone FP or FK waits one tick for its partner.
  if (pressed(f, FP) && pressed(f, FK)) { consume(f, FP, FK); startMove(f, 'throw'); return true; }
  if ((pressed(f, FP) && f.age[FP] < 1) || (pressed(f, FK) && f.age[FK] < 1)) return true;
  if (pressed(f, SP)) { consume(f, SP); startMove(f, FIGHTERS[f.id].special); return true; }
  const order: [number, string][] = [[BP, 'bp'], [BK, 'bk'], [FK, 'fk'], [FP, 'fp']];
  for (const [i, id] of order) if (pressed(f, i)) { consume(f, i); startMove(f, id); return true; }
  return false;
}

function movement(f: Fighter, bits: number) {
  const fwd = f.facing === 1 ? B.RIGHT : B.LEFT, back = f.facing === 1 ? B.LEFT : B.RIGHT;
  f.crouching = !!(bits & B.DOWN);
  if (bits & B.BLOCK) {
    if (f.state !== 'block') setState(f, 'block');
    f.vx = 0;
    return;
  }
  if (bits & B.UP) {
    f.vy = JUMP_V;
    f.vx = bits & fwd ? JUMP_VX * f.facing : bits & back ? -JUMP_VX * f.facing : 0;
    f.airUsed = false;
    setState(f, 'jump');
    return;
  }
  if (f.dashReq) {
    f.vx = (f.dashReq === B.RIGHT ? 1 : -1) * FIGHTERS[f.id].dash;
    f.dashReq = 0;
    setState(f, 'dash');
    return;
  }
  if (bits & B.DOWN) {
    if (f.state !== 'crouch') setState(f, 'crouch');
    f.vx = 0;
    return;
  }
  const d = bits & fwd ? 1 : bits & back ? -1 : 0;
  if (d) {
    if (f.state !== 'walk') setState(f, 'walk');
    f.vx = d * f.facing * FIGHTERS[f.id].walk * (d < 0 ? 0.8 : 1);
  } else {
    if (f.state !== 'idle') setState(f, 'idle');
    f.vx = 0;
  }
}

export interface Box { x0: number; x1: number; y0: number; y1: number }

// Where a fighter can be hit, in stage coordinates (y up from the floor). Null while invulnerable.
export function hurtbox(f: Fighter): Box | null {
  if (f.state === 'down' || f.state === 'ko') return null;
  const low = f.state === 'crouch' || ((f.state === 'block' || f.state === 'blockstun') && f.crouching);
  return { x0: f.x - HALF_W, x1: f.x + HALF_W, y0: f.y, y1: f.y + (low ? CROUCH_H : STAND_H) };
}

// The active attack box, only during a move's active frames.
export function hitbox(f: Fighter): Box | null {
  if (f.state !== 'attack' || !f.move) return null;
  const m = MOVES[f.move];
  if (f.frame <= m.startup || f.frame > m.startup + m.active) return null;
  const ax0 = f.x + f.facing * m.x0, ax1 = f.x + f.facing * m.x1;
  return { x0: Math.min(ax0, ax1), x1: Math.max(ax0, ax1), y0: f.y + m.y0, y1: f.y + m.y1 };
}

function checkHit(s: Sim, i: number, m: MoveData, ev: SimEvent[]) {
  const a = s.f[i], d = s.f[1 - i];
  const hb = hitbox(a), hu = hurtbox(d);
  if (!hb || !hu) return;
  if (hb.x1 < hu.x0 || hb.x0 > hu.x1 || hb.y1 < hu.y0 || hb.y0 > hu.y1) return;
  if (m.level === 'throw' && d.y > 0) return; // throws whiff on airborne targets

  a.hasHit = true;
  const ex = a.facing === 1 ? Math.max(hb.x0, hu.x0) : Math.min(hb.x1, hu.x1);
  const ey = (Math.max(hb.y0, hu.y0) + Math.min(hb.y1, hu.y1)) / 2;
  a.meter = Math.min(METER_MAX, a.meter + m.dmg * 0.3);
  d.meter = Math.min(METER_MAX, d.meter + m.dmg * 0.15);

  const blocking = m.level !== 'throw' && (d.state === 'block' || d.state === 'blockstun') && d.y === 0 && (m.level !== 'low' || d.crouching);
  if (blocking) {
    d.hp -= Math.floor(m.dmg * 0.1);
    d.stun = m.blockstun;
    setState(d, 'blockstun');
    d.vx = a.facing * 5;
    s.hitstop = m.hitstop >> 1;
    ev.push({ type: 'block', who: i, x: ex, y: ey, pow: m.pow * 0.6 });
  } else {
    d.combo = d.state === 'hitstun' ? d.combo + 1 : 1;
    d.hp -= Math.round(m.dmg * Math.max(0.5, 1 - 0.1 * (d.combo - 1))); // combo damage scaling
    d.move = null;
    d.kd = !!m.kd || d.y > 0;
    d.stun = m.level === 'throw' ? 30 : m.hitstun;
    setState(d, 'hitstun');
    d.vx = a.facing * (m.push ?? 6);
    if (m.level === 'throw') d.vy = 13;
    else if (d.y > 0) d.vy = 8;
    else if (m.kd) d.vy = 6;
    s.hitstop = m.hitstop;
    ev.push({ type: m.level === 'throw' ? 'throw' : 'hit', who: i, x: ex, y: ey, pow: m.pow, combo: d.combo });
  }
  if (d.hp <= 0) {
    d.hp = 0;
    d.kd = true;
    d.state = 'ko';
    if (d.vy === 0) d.vy = 9;
    s.hitstop = 24;
    ev.push({ type: 'ko', who: i, x: ex, y: ey, pow: 2 });
    endRound(s, i);
  }
}

function updateFighter(s: Sim, i: number, bits: number, ev: SimEvent[]) {
  const f = s.f[i], o = s.f[1 - i];
  readInput(f, bits, false);
  f.frame++;
  const st = f.state;
  if (st === 'idle' || st === 'walk' || st === 'crouch' || st === 'block') {
    f.facing = o.x >= f.x ? 1 : -1;
    if (!tryAttack(f)) movement(f, bits);
  } else if (st === 'jump') {
    if (!f.airUsed && f.age.slice(0, 4).some(a => a < BUFFER)) {
      consume(f, FP, BP, FK, BK);
      f.airUsed = true;
      f.move = 'jk';
      f.hasHit = false;
      setState(f, 'attack');
    }
  } else if (st === 'dash') {
    if (f.frame >= DASH_FRAMES) { f.vx = 0; setState(f, 'idle'); }
  } else if (st === 'attack') {
    const m = MOVES[f.move!];
    const a1 = m.startup + m.active;
    if (m.lunge && f.frame <= a1) f.vx = m.lunge * f.facing;
    if (!f.hasHit) checkHit(s, i, m, ev);
    const chain = FIGHTERS[f.id].chains[f.move!];
    if (chain && f.state === 'attack' && f.frame > m.startup && f.frame <= a1 + CHAIN_WINDOW) {
      for (const [btn, next] of Object.entries(chain)) {
        const bi = BTN_INDEX[btn as Btn];
        if (pressed(f, bi)) { consume(f, bi); startMove(f, next!); break; }
      }
    }
    if (f.state === 'attack' && f.frame >= a1 + m.recovery) {
      f.move = null;
      setState(f, f.y > 0 ? 'jump' : 'idle');
    }
  } else if (st === 'hitstun' || st === 'blockstun') {
    const grounded = f.y === 0 && f.vy === 0;
    if (grounded && f.kd && f.frame > 3) { f.kd = false; setState(f, 'down'); }
    else if (grounded && f.frame >= f.stun) setState(f, 'idle');
  } else if (st === 'down') {
    if (f.frame >= DOWN_FRAMES) setState(f, 'idle');
  }
  physics(f);
}

function physics(f: Fighter) {
  f.x += f.vx;
  if (f.y > 0 || f.vy > 0) {
    f.vy -= GRAVITY;
    f.y += f.vy;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      if (f.state === 'jump' || f.state === 'attack') { f.move = null; f.vx = 0; setState(f, 'idle'); }
    }
  } else if (f.state !== 'walk' && f.state !== 'dash') {
    f.vx *= 0.8;
    if (Math.abs(f.vx) < 0.05) f.vx = 0;
  }
}

// Keep fighters from overlapping and inside the walls. A big height gap lets jumps cross over.
function separate(s: Sim) {
  const [a, b] = s.f;
  if (Math.abs(a.y - b.y) < 120) {
    const dx = b.x - a.x;
    if (Math.abs(dx) < MIN_GAP) {
      const dir = dx !== 0 ? Math.sign(dx) : a.facing;
      const push = (MIN_GAP - Math.abs(dx)) / 2;
      a.x -= dir * push;
      b.x += dir * push;
    }
  }
  for (const f of s.f) f.x = Math.min(WALL_R, Math.max(WALL_L, f.x));
  if (Math.abs(a.y - b.y) < 120 && Math.abs(b.x - a.x) < MIN_GAP - 0.01) {
    const dir = b.x >= a.x ? 1 : -1;
    if (a.x <= WALL_L || a.x >= WALL_R) b.x = a.x + dir * MIN_GAP;
    else a.x = b.x - dir * MIN_GAP;
  }
}

function endRound(s: Sim, winner: number) {
  s.phase = 'outro';
  s.phaseFrame = 0;
  s.roundWinner = winner;
  if (winner >= 0) s.wins[winner]++;
}

function nextRound(s: Sim) {
  if (s.wins[0] >= 2 || s.wins[1] >= 2) { s.phase = 'over'; return; }
  s.round++;
  s.f = [makeFighter(s.f[0].id, 440, 1), makeFighter(s.f[1].id, 840, -1)];
  s.timer = ROUND_TIME;
  s.roundWinner = -1;
  s.phase = 'intro';
  s.phaseFrame = 0;
}

// Advance one tick. inputs are held button bits for player 1 and player 2.
export function step(s: Sim, inputs: [number, number]): SimEvent[] {
  const ev: SimEvent[] = [];
  s.tick++;
  if (s.phase === 'over') return ev;
  const live = s.phase === 'fight';
  if (s.hitstop > 0) {
    s.hitstop--;
    for (let i = 0; i < 2; i++) readInput(s.f[i], live ? inputs[i] : 0, true);
    return ev;
  }
  // P1 updates first, so same-frame hits never trade yet. A resolve pass can fix that later.
  for (let i = 0; i < 2; i++) updateFighter(s, i, live ? inputs[i] : 0, ev);
  separate(s);
  s.phaseFrame++;
  if (s.phase === 'intro' && s.phaseFrame >= INTRO_FRAMES) {
    s.phase = 'fight';
    s.phaseFrame = 0;
  } else if (s.phase === 'fight' && --s.timer <= 0) {
    const [a, b] = s.f, ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
    endRound(s, ra > rb ? 0 : rb > ra ? 1 : -1);
  } else if (s.phase === 'outro') {
    const w = s.roundWinner >= 0 ? s.f[s.roundWinner] : null;
    if (w && s.phaseFrame > 50 && ['idle', 'walk', 'crouch', 'block'].includes(w.state)) setState(w, 'win');
    if (s.phaseFrame >= OUTRO_FRAMES) nextRound(s);
  }
  return ev;
}
