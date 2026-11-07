// Tutorial and practice: a fight against a dummy that never dies, with step by step lessons
// that each wait until the player has actually done the move.

import * as A from './render/art.ts';
import { FIGHTERS, MOVES, type FighterId } from './core/data.ts';
import { B, ROUND_TIME, createSim, step, type Sim, type SimEvent } from './core/sim.ts';

type Watch = { s: Sim; ev: SimEvent[]; started: string | null };
interface Lesson { title: string; how: string; keys: string; need: number; meter?: boolean; dummyAttacks?: boolean; count: (w: Watch) => number }

// the string each fighter learns, as keys and its finishing move
const STRING: Record<FighterId, [string, string]> = { kaal: ['U  U  I', 'k_monsoon'], vanta: ['U  I  J', 'v_flurry'], rook: ['I  U', 'r_piledriver'] };

function lessons(id: FighterId): Lesson[] {
  const F = FIGHTERS[id], [sKeys, sMove] = STRING[id];
  const me = (w: Watch) => w.s.f[0];
  const started = (...ids: string[]) => (w: Watch) => (w.started && ids.includes(w.started) ? 1 : 0);
  const event = (type: SimEvent['type'], who = 0) => (w: Watch) => w.ev.filter(e => e.type === type && e.who === who).length;
  return [
    { title: 'MOVE', how: 'Walk toward the dummy and back again.', keys: 'A  D', need: 50, count: w => (me(w).state === 'walk' ? 1 : 0) },
    { title: 'JUMP', how: 'Jump straight up, or hold a direction to jump in or away.', keys: 'W', need: 2, count: w => (me(w).state === 'jump' && me(w).frame === 0 ? 1 : 0) },
    { title: 'CROUCH', how: 'Hold down. High attacks pass over your head.', keys: 'S', need: 40, count: w => (me(w).state === 'crouch' ? 1 : 0) },
    { title: 'DASH', how: 'Tap a direction twice, fast.', keys: 'D  D', need: 2, count: w => (me(w).state === 'dash' && me(w).frame === 0 ? 1 : 0) },
    { title: 'BLOCK', how: 'The dummy fights back now. Hold block as it attacks. Add S to block low sweeps.', keys: 'L  OR  SPACE', need: 3, dummyAttacks: true, count: event('block', 1) },
    { title: 'PUNCH', how: 'Front punch is fast. Back punch hits harder.', keys: 'U   I', need: 4, count: started('fp', 'bp', 'fp2') },
    { title: 'KICK', how: 'Front kick has reach. Back kick sweeps low and knocks down.', keys: 'J   K', need: 4, count: started('fk', 'bk') },
    { title: 'THROW', how: 'Get close and press both together. Throws beat blocking.', keys: 'U + J', need: 1, count: event('throw') },
    { title: 'SPECIAL', how: `Your weapon special: ${MOVES[F.special].name}.`, keys: 'O', need: 2, count: started(F.special) },
    { title: 'STRING', how: `Press the keys in rhythm for ${MOVES[sMove].name}.`, keys: sKeys, need: 1, count: started(sMove) },
    { title: 'SUPER POWER', how: `Costs 1 meter bar. Yours is ${F.power}.`, keys: 'P', need: 1, meter: true, count: event('power') },
    { title: 'OVERCLOCK', how: `Costs all 3 bars: ${MOVES[F.overclock].name}.`, keys: ';', need: 1, meter: true, count: event('super') },
    { title: 'READY', how: 'Finish round 1 or 2 with your special for a Last Breath. After the final K.O., press S S O to delete them.', keys: 'ENTER', need: Infinity, count: () => 0 },
  ];
}

export type DummyMode = 'stand' | 'block' | 'fight';

export class Trainer {
  s: Sim;
  list: Lesson[];
  step = 0;
  count = 0;
  doneAt = -1;
  dummy: DummyMode = 'stand';
  readonly lessonsOn: boolean;
  private tick = 0;
  private id: FighterId;

  constructor(id: FighterId, opp: FighterId, lessonsOn: boolean) {
    this.id = id;
    this.lessonsOn = lessonsOn;
    this.list = lessons(id);
    this.s = this.fresh(opp);
  }

  private fresh(opp: FighterId): Sim {
    const s = createSim(this.id, opp);
    while (s.phase !== 'fight') step(s, [0, 0]);
    return s;
  }

  get lesson(): Lesson | null { return this.lessonsOn ? this.list[this.step] : null; }
  get finished() { return this.lessonsOn && this.step === this.list.length - 1; }

  private dummyBits(): number {
    const s = this.s, d = s.f[1], p = s.f[0], dist = Math.abs(p.x - d.x);
    const fwd = p.x > d.x ? B.RIGHT : B.LEFT;
    const attacks = this.lesson?.dummyAttacks || this.dummy === 'fight';
    if (attacks) {
      if (dist > 150) return fwd;
      const k = this.tick % 70;
      return k < 2 ? (this.tick % 140 < 70 ? B.FK : B.BK) : 0;
    }
    if (this.dummy === 'block') return B.BLOCK;
    return 0;
  }

  // One fixed tick. Returns the events so the page can draw sparks and play sounds.
  update(p1: number, now: number): SimEvent[] {
    const s = this.s;
    this.tick++;
    const ev = step(s, [p1, this.dummyBits()]);
    // nobody dies here: refill health once a combo ends, freeze the clock
    if (s.phase !== 'fight') { this.s = this.fresh(s.f[1].id); return ev; }
    s.timer = ROUND_TIME;
    s.f[0].hp = s.f[0].maxHp;
    if (s.f[1].state !== 'hitstun') s.f[1].hp = s.f[1].maxHp;
    const L = this.lesson;
    if (!this.lessonsOn || L?.meter) s.f[0].meter = 300;
    if (L && this.doneAt < 0) {
      const f = s.f[0];
      const started = f.state === 'attack' && f.frame === 0 ? f.move : null;
      this.count += L.count({ s, ev, started });
      if (this.count >= L.need) this.doneAt = now;
    }
    if (this.doneAt >= 0 && now - this.doneAt > 0.9) this.next();
    return ev;
  }

  next() {
    if (this.step < this.list.length - 1) this.step++;
    this.count = 0;
    this.doneAt = -1;
  }
}

export function drawTrainer(tr: Trainer, now: number) {
  const x = A.x, W = A.W;
  if (!tr.lessonsOn) {
    A.text('PRACTICE', W / 2, 140, 22, '#fff', A.HEAVY, '900', 'center', 1, 6);
    A.text(`T  DUMMY: ${tr.dummy.toUpperCase()}     H  HITBOXES     ESC  MENU`, W / 2, 172, 13, '#29f0ff', A.MONO, 'bold', 'center', 1, 3);
    return;
  }
  const L = tr.lesson!, done = tr.doneAt >= 0;
  const bx = 340, by = 128, bw = 600, bh = 150;
  x.fillStyle = 'rgba(2,8,12,.82)'; x.fillRect(bx, by, bw, bh);
  x.strokeStyle = done ? '#3dff8a' : 'rgba(41,240,255,.6)'; x.lineWidth = done ? 3 : 1; x.strokeRect(bx, by, bw, bh);
  A.text(`TUTORIAL  ${tr.step + 1} / ${tr.list.length}`, bx + 20, by + 22, 12, '#7d8590', A.MONO, 'bold', 'left', 1, 4);
  A.glitchText(L.title, bx + 20, by + 58, 34, now, done ? '#3dff8a' : '#ffffff', '900', A.HEAVY, 0.2, 'left');
  // key chip
  x.font = `900 22px ${A.HEAVY}`;
  const kw = Math.max(70, x.measureText(L.keys).width + 34), kx = bx + bw - 20 - kw;
  x.fillStyle = 'rgba(41,240,255,.15)'; x.fillRect(kx, by + 36, kw, 44);
  x.strokeStyle = '#29f0ff'; x.lineWidth = 2; x.strokeRect(kx, by + 36, kw, 44);
  A.text(L.keys, kx + kw / 2, by + 59, 22, '#29f0ff', A.HEAVY, '900');
  A.text(L.how, bx + 20, by + 100, 15, '#bfe9ff', A.COND, 'bold', 'left');
  if (Number.isFinite(L.need)) {
    x.fillStyle = 'rgba(41,240,255,.12)'; x.fillRect(bx + 20, by + 124, bw - 40, 8);
    x.fillStyle = done ? '#3dff8a' : '#29f0ff'; x.fillRect(bx + 20, by + 124, (bw - 40) * Math.min(1, tr.count / L.need), 8);
  }
  if (done) A.glitchText('NICE', W / 2, 330, 64, now, '#3dff8a', '900', A.HEAVY, 0.4);
  A.text(tr.finished ? 'ENTER  CONTINUE     ESC  MENU' : 'ENTER  SKIP STEP     ESC  MENU', W / 2, by + bh + 20, 11, '#7d8590', A.MONO, 'bold', 'center', 1, 4);
}
