// Draws a Sim: stage, fighters posed from their state, sparks, screen shake, HUD and round banners.
// Effects here are cosmetic only and never feed back into the simulation.

import * as A from './art.ts';
import { FIGHTERS, MOVES } from '../core/data.ts';
import { DOWN_FRAMES, type Fighter, type Sim, type SimEvent } from '../core/sim.ts';

const GY = 640, SCALE = 1.3;
const W = A.W;

interface Spark { x: number; y: number; t0: number; col: string; n: number; pow: number; seed: number }
let sparks: Spark[] = [], shake = 0, flash = 0, seed = 1;
const ghost = [1, 1], fall = [0, 0];

export function resetFx() {
  sparks = []; shake = 0; flash = 0;
  ghost[0] = ghost[1] = 1; fall[0] = fall[1] = 0;
}

export function fxEvents(ev: SimEvent[], s: Sim, t: number) {
  for (const e of ev) {
    const col = e.type === 'block' ? '#7fd8ff' : FIGHTERS[s.f[e.who].id].color;
    sparks.push({ x: e.x, y: GY - e.y, t0: t, col, n: e.type === 'block' ? 14 : 30, pow: e.pow, seed: seed++ * 31 });
    shake = Math.max(shake, (e.type === 'block' ? 4 : 12) * e.pow);
    if (e.type === 'ko') flash = 1;
  }
}

function poseOf(f: Fighter, t: number) {
  const P: Record<string, typeof A.POSE.idle> = A.POSE;
  let p = A.mixPose(P.idle, P.block, 0.15 + Math.sin(t * 2.2) * 0.04), whip = 0;
  switch (f.state) {
    case 'walk': {
      const w = Math.sin(f.frame * 0.25);
      p = { ...P.idle, fh: P.idle.fh + w * 0.35, bh: P.idle.bh - w * 0.35, fk: P.idle.fk - Math.max(0, -w) * 0.5, bk: P.idle.bk - Math.max(0, w) * 0.5 };
      break;
    }
    case 'crouch': p = P.crouch; break;
    case 'block': case 'blockstun':
      p = f.crouching ? { ...P.crouch, fs: P.block.fs, fe: P.block.fe, bs: P.block.bs, be: P.block.be } : P.block;
      break;
    case 'jump': p = P.jump; break;
    case 'dash': p = { ...P.idle, lean: f.vx * f.facing > 0 ? 0.4 : -0.3 }; break;
    case 'attack': {
      const m = MOVES[f.move!], base = f.y > 0 ? P.jump : P.idle, hitPose = P[m.pose], a1 = m.startup + m.active;
      if (f.frame <= m.startup) p = A.mixPose(base, m.wind ? P[m.wind] : hitPose, A.ease(f.frame / m.startup));
      else if (f.frame <= a1) p = hitPose;
      else p = A.mixPose(hitPose, base, A.ease(Math.min(1, (f.frame - a1) / m.recovery)));
      if (m.pose === 'whip' && f.frame >= m.startup - 2 && f.frame <= a1 + 8) whip = 1;
      break;
    }
    case 'hitstun': p = P.hit; break;
    case 'down': case 'ko': p = P.stag; break;
    case 'win': p = A.mixPose(P.idle, P.raise, Math.min(1, f.frame / 15)); break;
  }
  return { p, whip };
}

function drawOne(f: Fighter, i: number, t: number) {
  const x = A.x, D = FIGHTERS[f.id];
  const lying = f.y === 0 && ((f.state === 'down' && f.frame < DOWN_FRAMES - 10) || f.state === 'ko');
  fall[i] += ((lying ? 1 : 0) - fall[i]) * 0.25;
  const { p, whip } = poseOf(f, t);
  x.save();
  if (fall[i] > 0.01) {
    x.translate(f.x, GY - 16 * fall[i]);
    x.rotate(-f.facing * fall[i] * Math.PI / 2);
    x.translate(-f.x, -GY);
  }
  A.drawFighter({ x: f.x, y: GY, air: f.y, f: f.facing, s: SCALE, p, look: f.id, weapon: D.weapon, wcol: D.color, whip }, t);
  x.restore();
}

function hud(s: Sim) {
  const [a, b] = s.f;
  const ha = a.hp / a.maxHp, hb = b.hp / b.maxHp;
  ghost[0] = Math.max(ha, ghost[0] - 0.004);
  ghost[1] = Math.max(hb, ghost[1] - 0.004);
  A.bar(40, 34, 500, ha, ghost[0], FIGHTERS[a.id].color, false);
  A.bar(740, 34, 500, hb, ghost[1], FIGHTERS[b.id].color, true);
  A.text(`YOU // ${FIGHTERS[a.id].name}`, 44, 80, 22, '#fff', A.HEAVY, '900', 'left');
  A.text(`CPU // ${FIGHTERS[b.id].name}`, 1236, 80, 22, FIGHTERS[b.id].color, A.HEAVY, '900', 'right');
  const x = A.x;
  x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(588, 22, 104, 62);
  x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 2; x.strokeRect(588, 22, 104, 62);
  A.text(String(Math.ceil(s.timer / 60)), 640, 54, 40, '#fff', A.HEAVY, '900');
  for (let i = 0; i < 2; i++) {
    x.fillStyle = s.wins[0] > i ? FIGHTERS[a.id].color : 'rgba(255,255,255,.2)';
    x.beginPath(); x.arc(560 - i * 18, 98, 6, 0, 7); x.fill();
    x.fillStyle = s.wins[1] > i ? FIGHTERS[b.id].color : 'rgba(255,255,255,.2)';
    x.beginPath(); x.arc(720 + i * 18, 98, 6, 0, 7); x.fill();
  }
  A.meter(40, 690, a.meter / 100, '#ffb15a', false);
  A.meter(1240, 690, b.meter / 100, '#29f0ff', true);
}

function banners(s: Sim, t: number) {
  const f = s.phaseFrame;
  if (s.phase === 'intro') {
    if (f < 60) A.glitchText(`ROUND ${s.round}`, W / 2, 300, 96 * A.lerp(1.4, 1, A.eOut(Math.min(1, f / 15))), t, '#fff', '900', A.HEAVY, 0.5);
    else A.glitchText('FIGHT', W / 2, 300, 140 * A.lerp(1.6, 1, A.eOut(Math.min(1, (f - 60) / 10))), t, '#ff2a44', '900', A.HEAVY, 0.8);
    if (s.round === 1) A.text('WASD MOVE   U I J K ATTACK   U+J THROW   O SPECIAL   L / SPACE BLOCK   ESC MENU', W / 2, 420, 14, '#bfe9ff', A.MONO, 'bold', 'center', 1, 2);
  } else if (s.phase === 'outro') {
    const ko = s.f.some(q => q.hp <= 0);
    A.glitchText(ko ? 'K.O.' : 'TIME', W / 2, 300, 170 * A.lerp(1.8, 1, A.eOut(Math.min(1, f / 12))), t, '#ff2a44', '900', A.HEAVY, 0.7);
    if (f > 70) {
      const w = s.roundWinner;
      A.text(w < 0 ? 'DRAW' : `${FIGHTERS[s.f[w].id].name} WINS`, W / 2, 400, 34, '#fff', A.HEAVY, '900', 'center', Math.min(1, (f - 70) / 15), 6);
    }
  } else if (s.phase === 'over') {
    A.x.fillStyle = 'rgba(0,0,0,.55)'; A.x.fillRect(0, 0, W, A.H);
    const won = s.wins[0] > s.wins[1];
    A.glitchText(won ? 'YOU WIN' : 'YOU LOSE', W / 2, 290, 130, t, won ? '#ffffff' : '#ff2a44', '900', A.HEAVY, 0.6);
    A.text('ENTER  REMATCH     //     ESC  FIGHTER SELECT', W / 2, 400, 18, '#29f0ff', A.MONO, 'bold', 'center', 1, 4);
  }
}

export function drawFight(s: Sim, t: number) {
  const x = A.x;
  shake *= 0.86;
  x.save();
  x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  A.stage(t);
  A.rain(t, 200, 0.2);
  const order = s.f[0].state === 'attack' ? [1, 0] : [0, 1]; // attacker drawn on top
  for (const i of order) drawOne(s.f[i], i, t);
  sparks = sparks.filter(p => t - p.t0 < 0.7);
  for (const p of sparks) A.sparks(p.x, p.y, t - p.t0, p.seed, p.col, p.n, p.pow);
  x.restore();
  if (s.hitstop > 0) { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(0, 0, W, A.H); }
  if (flash > 0) { x.fillStyle = `rgba(255,255,255,${flash * 0.6})`; x.fillRect(0, 0, W, A.H); flash -= 0.04; }
  hud(s);
  banners(s, t);
  A.post(t);
}
