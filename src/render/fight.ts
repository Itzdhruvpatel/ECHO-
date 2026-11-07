// Draws a Sim: stage, fighters posed from their state, sparks, screen shake, HUD, banners,
// super power and Overclock effects, and the Deletion cinematic.
// Effects here are cosmetic only and never feed back into the simulation.

import * as A from './art.ts';
import { FIGHTERS, MOVES } from '../core/data.ts';
import { DOWN_FRAMES, hitbox, hurtbox, type Fighter, type Sim, type SimEvent } from '../core/sim.ts';

const GY = 640, SCALE = 1.3;
const W = A.W, H = A.H;

interface Spark { x: number; y: number; t0: number; col: string; n: number; pow: number; seed: number }
let sparks: Spark[] = [], shake = 0, flash = 0, seed = 1;
let combo = { n: 0, who: 0, t: -9 };
let power = { who: 0, name: '', t: -9, from: 0, to: 0 };
let overclock = { who: 0, name: '', t: -9, col: '#ff8a1f' };
const ghost = [1, 1], fall = [0, 0];

export function resetFx() {
  sparks = []; shake = 0; flash = 0;
  combo = { n: 0, who: 0, t: -9 };
  power = { who: 0, name: '', t: -9, from: 0, to: 0 };
  overclock = { who: 0, name: '', t: -9, col: '#ff8a1f' };
  ghost[0] = ghost[1] = 1; fall[0] = fall[1] = 0;
}

export function fxEvents(ev: SimEvent[], s: Sim, t: number) {
  for (const e of ev) {
    if (e.type === 'power') { power = { who: e.who, name: e.name!, t, from: e.x, to: e.y }; continue; }
    if (e.type === 'super') { overclock = { who: e.who, name: e.name!, t, col: FIGHTERS[s.f[e.who].id].color }; flash = 0.5; continue; }
    const col = e.type === 'block' ? '#7fd8ff' : FIGHTERS[s.f[e.who].id].color;
    sparks.push({ x: e.x, y: GY - e.y, t0: t, col, n: e.type === 'block' ? 14 : 30, pow: e.pow, seed: seed++ * 31 });
    shake = Math.max(shake, (e.type === 'block' ? 4 : 12) * e.pow);
    if (e.type === 'ko') flash = 1;
    if ((e.combo ?? 0) >= 2) combo = { n: e.combo!, who: e.who, t };
  }
}

function comboText(t: number) {
  const age = t - combo.t;
  if (age > 1.3) return;
  const left = combo.who === 0, xx = left ? 60 : W - 60, a = 1 - A.seg(age, 1, 1.3);
  A.x.save(); A.x.globalAlpha = a;
  A.glitchText(`${combo.n} HIT`, xx, 380, 64 * A.lerp(1.3, 1, A.eOut(Math.min(1, age / 0.12))), t, left ? '#ffb15a' : '#29f0ff', '900', A.HEAVY, 0.4, left ? 'left' : 'right');
  A.text(view.echoSide === combo.who ? 'YOUR OWN COMBO' : 'COMBO', xx, 424, 16, '#fff', A.MONO, 'bold', left ? 'left' : 'right', 1, 4);
  A.x.restore();
}

// Hit and hurt boxes plus state readout, toggled with H.
function debugBoxes(s: Sim) {
  const x = A.x;
  x.save(); x.lineWidth = 2;
  s.f.forEach((f, i) => {
    const hu = hurtbox(f), hb = hitbox(f);
    if (hu) { x.strokeStyle = '#3dff8a'; x.fillStyle = 'rgba(61,255,138,.12)'; x.fillRect(hu.x0, GY - hu.y1, hu.x1 - hu.x0, hu.y1 - hu.y0); x.strokeRect(hu.x0, GY - hu.y1, hu.x1 - hu.x0, hu.y1 - hu.y0); }
    if (hb) { x.strokeStyle = f.hasHit ? 'rgba(255,42,68,.4)' : '#ff2a44'; x.fillStyle = 'rgba(255,42,68,.2)'; x.fillRect(hb.x0, GY - hb.y1, hb.x1 - hb.x0, hb.y1 - hb.y0); x.strokeRect(hb.x0, GY - hb.y1, hb.x1 - hb.x0, hb.y1 - hb.y0); }
    const m = f.move ? MOVES[f.move] : null;
    const info = `${f.state.toUpperCase()} ${f.frame}${m ? `  ${m.name.toUpperCase()} S${m.startup} A${m.active} R${m.recovery}` : ''}`;
    A.text(info, i ? W - 40 : 40, 130, 13, '#3dff8a', A.MONO, 'bold', i ? 'right' : 'left');
  });
  A.text('HITBOX VIEW  (H)', W / 2, 130, 12, '#3dff8a', A.MONO, 'bold', 'center', 1, 3);
  x.restore();
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
      else if (f.frame <= a1) p = m.rehit ? A.mixPose(hitPose, P.whip, (Math.sin(f.frame * 0.8) + 1) / 2) : hitPose;
      else p = A.mixPose(hitPose, base, A.ease(Math.min(1, (f.frame - a1) / m.recovery)));
      if ((m.pose === 'whip' || m.pose === 'spin') && f.frame >= m.startup - 2 && f.frame <= a1 + 8) whip = 1;
      break;
    }
    case 'hitstun': p = P.hit; break;
    case 'down': case 'ko': p = P.stag; break;
    case 'win': p = A.mixPose(P.idle, P.raise, Math.min(1, f.frame / 15)); break;
  }
  return { p, whip };
}

// Who lost the match and is standing dazed for the Deletion, or -1.
const finished = (s: Sim) => (s.phase === 'finish' || s.phase === 'deletion') ? 1 - s.roundWinner : -1;

// How a fight is shown: the Echo side, its live model panel and the Archive's callout.
export interface FightView {
  debug?: boolean;
  echoSide?: number;
  panel?: { top: [string, number][]; acc: number; loss: number[] };
  callout?: string;
  rec?: boolean;
  temple?: boolean; // floor 61 stage
  floor?: number;
  overHint?: string;
  names?: [string, string]; // HUD labels, for versus
}
let view: FightView = {};

// look, weapon color and glitch flag for fighter i (the Echo is a black and cyan copy)
function skin(s: Sim, i: number) {
  const id = s.f[i].id, echo = view.echoSide === i;
  return { look: echo ? A.ECHO_LOOK[id] : id, wcol: echo ? '#29f0ff' : FIGHTERS[id].color, echo, weapon: FIGHTERS[id].weapon };
}

function drawOne(s: Sim, i: number, t: number) {
  const f = s.f[i], x = A.x;
  const dazed = finished(s) === i;
  const lying = !dazed && f.y === 0 && ((f.state === 'down' && f.frame < DOWN_FRAMES - 10) || f.state === 'ko');
  fall[i] += ((lying ? 1 : 0) - fall[i]) * 0.25;
  let { p, whip } = poseOf(f, t);
  if (dazed) p = A.mixPose(A.POSE.stag, A.POSE.hit, (Math.sin(t * 2) + 1) * 0.15);
  if (s.phase === 'finish' && i === s.roundWinner) p = A.mixPose(A.POSE.idle, A.POSE.block, 0.2);
  x.save();
  if (fall[i] > 0.01) {
    x.translate(f.x, GY - 16 * fall[i]);
    x.rotate(-f.facing * fall[i] * Math.PI / 2);
    x.translate(-f.x, -GY);
  }
  if (f.invuln > 0) x.globalAlpha = 0.35;
  A.drawFighter({ x: f.x, y: GY, air: dazed ? 0 : f.y, f: f.facing, s: SCALE, p, whip, ...skin(s, i) }, t);
  x.restore();
  if (f.armor > 0) ironWill(f, t);
}

// ---------- power and Overclock effects ----------
function coils(cx: number, cy: number, t: number, a: number) {
  const x = A.x;
  x.save(); x.globalCompositeOperation = 'lighter'; A.glow('#ff8a1f', 22);
  for (let i = 0; i < 9; i++) {
    const r = 70 + i * 13, rot = t * (6 + i) * (i % 2 ? 1 : -1);
    x.strokeStyle = `rgba(255,${150 + i * 10},60,${a * (0.5 + 0.05 * i)})`; x.lineWidth = 2.5;
    x.beginPath(); x.ellipse(cx, cy, r, r * 0.55, rot * 0.2, rot, rot + 2.2); x.stroke();
  }
  x.restore();
}

function ironWill(f: Fighter, t: number) {
  const x = A.x, a = Math.min(1, f.armor / 30) * (0.5 + 0.3 * Math.sin(t * 12));
  x.save(); x.globalCompositeOperation = 'lighter';
  A.glow('#d9e1e7', 18); x.strokeStyle = `rgba(217,225,231,${a})`; x.lineWidth = 3;
  for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(f.x, GY - 120, 70 + i * 8, 140 + i * 8, 0, 0, 7); x.stroke(); }
  x.restore();
}

function puff(cx: number, cy: number, age: number) {
  if (age > 0.6) return;
  const x = A.x, r = A.rng(Math.floor(cx));
  x.save();
  for (let i = 0; i < 14; i++) {
    const ang = r() * 6.283, d = (40 + r() * 80) * A.eOut(age / 0.6), rad = 30 + r() * 30;
    const g = x.createRadialGradient(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.6, 0, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.6, rad);
    g.addColorStop(0, `rgba(40,10,70,${0.7 * (1 - age / 0.6)})`); g.addColorStop(1, 'rgba(20,5,40,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.6, rad, 0, 7); x.fill();
  }
  x.restore();
}

function powerFx(s: Sim, t: number) {
  const age = t - power.t;
  if (age > 1.4) return;
  const f = s.f[power.who], x = A.x;
  if (f.id === 'kaal') {
    // ghosts along the rewind path, warm tint and expanding clock rings
    x.save(); x.fillStyle = `rgba(255,170,60,${0.12 * (1 - age / 1.4)})`; x.fillRect(0, 0, W, H);
    x.strokeStyle = `rgba(255,200,120,${0.5 * (1 - age / 1.4)})`; x.lineWidth = 3;
    for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(f.x, 470, 60 + i * 40 + ((age * 120) % 40), 0, 7); x.stroke(); }
    x.restore();
    if (age < 0.8) for (let i = 1; i < 5; i++) {
      x.save(); x.globalAlpha = 0.18 * (1 - age / 0.8);
      A.drawFighter({ x: A.lerp(power.from, power.to, i / 5), y: GY, f: f.facing, s: SCALE, p: A.POSE.idle, look: 'kaal', dim: true }, t);
      x.restore();
    }
  } else if (f.id === 'vanta') {
    puff(power.from, GY - 110, age);
    puff(power.to, GY - 110, age);
  }
}

function overclockFx(s: Sim, t: number) {
  s.f.forEach((f, i) => {
    if (f.state !== 'attack' || f.move !== FIGHTERS[f.id].overclock) return;
    const m = MOVES[f.move], o = s.f[1 - i], live = f.frame > m.startup && f.frame <= m.startup + m.active;
    if (f.id === 'kaal') coils(f.x + f.facing * 20, 520, t, live ? 1 : 0.4);
    if (f.id === 'vanta' && live) {
      const x = A.x, r = A.rng(Math.floor(t * 30));
      x.save(); x.fillStyle = 'rgba(0,0,0,.72)'; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = 'lighter'; A.glow('#a45cff', 16);
      for (let k = 0; k < 4; k++) {
        const a = r() * 6.283, len = 220 + r() * 160, cx = o.x, cy = GY - 120;
        x.strokeStyle = k % 2 ? '#ffffff' : '#a45cff'; x.lineWidth = 2 + r() * 3;
        x.beginPath(); x.moveTo(cx - Math.cos(a) * len / 2, cy - Math.sin(a) * len / 2); x.lineTo(cx + Math.cos(a) * len / 2, cy + Math.sin(a) * len / 2); x.stroke();
      }
      x.restore();
    }
  });
}

function bannerFx(t: number) {
  const pa = t - power.t;
  if (pa < 1.2) {
    const a = A.seg(pa, 0, 0.2);
    A.glitchText(`SUPER POWER // ${power.name}`, W / 2, 250, 54 * A.lerp(1.3, 1, A.eOut(a)), t, `rgba(255,177,90,${1 - A.seg(pa, 0.9, 1.2)})`, '900', A.HEAVY, 0.5);
  }
  const oa = t - overclock.t;
  if (oa < 1.8) {
    const a = A.seg(oa, 0, 0.2), fade = 1 - A.seg(oa, 1.5, 1.8);
    A.x.fillStyle = `rgba(0,0,0,${0.35 * fade})`; A.x.fillRect(0, 196, W, 108);
    A.glitchText('OVERCLOCK', W / 2, 228, 30, t, `rgba(255,255,255,${fade})`, '900', A.MONO, 0.3);
    A.x.save(); A.x.globalAlpha = fade;
    A.glitchText(overclock.name.toUpperCase(), W / 2, 272, 58 * A.lerp(1.3, 1, A.eOut(a)), t, overclock.col, '900', A.HEAVY, 0.5);
    A.x.restore();
  }
}

// ---------- Deletion cinematic ----------
function shards(cx: number, cy: number, dt: number) {
  const x = A.x, r = A.rng(99);
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 170; i++) {
    const sx = cx + (r() - 0.5) * 80, sy = cy - 120 + r() * 240, a = Math.atan2(sy - cy, sx - cx + 40) + (r() - 0.5), v = 200 + r() * 700;
    const px = sx + Math.cos(a) * v * dt, py = sy + Math.sin(a) * v * dt + 260 * dt * dt - 120 * dt, sz = 4 + r() * 12, rot = r() * 6 + dt * (r() * 10 - 5);
    const life = 1 - dt / (1.4 + r()); if (life <= 0) continue;
    x.save(); x.translate(px, py); x.rotate(rot); x.globalAlpha = life;
    x.fillStyle = r() > 0.3 ? '#29f0ff' : '#ff2fa0'; x.beginPath(); x.moveTo(0, -sz); x.lineTo(sz * 0.8, sz * 0.6); x.lineTo(-sz * 0.7, sz * 0.5); x.fill(); x.restore();
  }
  x.fillStyle = 'rgba(41,240,255,.5)'; x.font = `bold 13px ${A.MONO}`;
  for (let i = 0; i < 30; i++) { const r2 = A.rng(i + 500), yy = GY - ((dt * 500 + r2() * 600) % GY); x.globalAlpha = 0.6 * A.seg(dt, 0.2, 0.6); x.fillText(r2() > 0.5 ? '1' : '0', cx - 40 + r2() * 80, yy); }
  x.restore();
}

// ---------- Last Breath: the round 1 and 2 finisher ----------
const LB_FRAMES = 170;

function lastBreathScene(s: Sim, t: number) {
  const wi = s.roundWinner, w = { id: s.f[wi].id, x: 520, facing: 1 as 1 | -1 }, l = { facing: -1 as const };
  const ws = skin(s, wi), ls = skin(s, 1 - wi), P = A.POSE, x = A.x;
  const dt = s.phaseFrame / 60;
  let lx = 800, ly = 0, lp: object = P.hit, wp: object = P.idle, whip = 0, ghost = 1;
  if (w.id === 'kaal') {
    // the whip wraps them, swings them overhead and slams them down three times
    const k = Math.max(0, dt - 0.3), n = Math.floor(k / 0.7), p = (k % 0.7) / 0.7;
    if (dt < 0.3) { wp = A.mixPose(P.idle, P.whip, dt / 0.3); whip = 1; }
    else if (n < 3) {
      const from = n % 2 ? 380 : 800, to = n % 2 ? 800 : 380;
      lx = A.lerp(from, to, A.ease(p)); ly = Math.sin(p * Math.PI) * 260; wp = P.raise; whip = 0;
      if (p > 0.92) { shake = Math.max(shake, 18); A.sparks(lx, GY - 20, (p - 0.92) * 2, n * 7 + 3, '#ffb15a', 26, 1.3); }
      x.save(); A.glow('#ff8a1f', 14); x.strokeStyle = 'rgba(255,200,140,.85)'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(w.x + 20, GY - 250); x.quadraticCurveTo((w.x + lx) / 2, GY - 330 - ly * 0.3, lx, GY - 120 - ly); x.stroke(); x.restore();
    } else { lx = 380; lp = P.stag; ghost = 0; }
  } else if (w.id === 'vanta') {
    // an X slash across the chest, then she reappears behind for a spinning finish
    lx = 640;
    if (dt < 0.7) {
      wp = dt < 0.35 ? P.punch : P.whip; w.x = 540;
      const a = A.clamp((dt - 0.1) / 0.4);
      x.save(); x.globalCompositeOperation = 'lighter'; A.glow('#a45cff', 20); x.strokeStyle = '#f2e9ff'; x.lineWidth = 5;
      x.beginPath(); x.moveTo(lx - 70, GY - 230); x.lineTo(lx - 70 + 140 * a, GY - 230 + 160 * a); x.stroke();
      if (dt > 0.3) { const b = A.clamp((dt - 0.3) / 0.3); x.beginPath(); x.moveTo(lx + 70, GY - 230); x.lineTo(lx + 70 - 140 * b, GY - 230 + 160 * b); x.stroke(); }
      x.restore();
    } else if (dt < 1.1) { ghost = 1; w.x = -999; puff(540, GY - 110, dt - 0.7); puff(780, GY - 110, dt - 0.95); }
    else {
      w.x = 780; w.facing = -1; wp = P.spin;
      const k = A.clamp((dt - 1.3) / 0.8);
      if (dt > 1.3) { lx = A.lerp(640, 380, A.eOut(k)); ly = Math.sin(k * Math.PI) * 120; lp = k > 0.9 ? P.stag : P.hit; }
      if (dt > 1.3 && dt < 1.45) { shake = Math.max(shake, 16); A.sparks(700, GY - 140, dt - 1.3, 41, '#a45cff', 30, 1.4); }
    }
  } else {
    // buried to the knees, then launched into the wall
    if (dt < 0.5) { wp = A.mixPose(P.idle, P.raise, dt / 0.5); lx = 680; }
    else if (dt < 1.3) { wp = P.whip; lx = 680; ly = -70 * A.clamp((dt - 0.5) / 0.08); if (dt < 0.6) shake = Math.max(shake, 22); lp = P.stag; }
    else if (dt < 1.6) { wp = P.raise; lx = 680; ly = -70; lp = P.stag; }
    else {
      wp = P.upper; const k = A.clamp((dt - 1.6) / 0.5);
      lx = A.lerp(680, 1150, A.eOut(k)); ly = Math.sin(k * Math.PI * 0.8) * 220;
      if (k >= 1 && dt < 2.25) { shake = Math.max(shake, 20); A.sparks(1150, GY - 140, dt - 2.1, 77, '#ff4d2e', 34, 1.6); }
      lp = P.hit;
    }
  }
  x.save();
  if (ly < 0) { x.beginPath(); x.rect(0, 0, W, GY + 2); x.clip(); }
  if (ghost) A.drawFighter({ x: lx, y: GY - Math.min(0, ly), air: Math.max(0, ly), f: l.facing, s: SCALE, p: lp, ...ls }, t);
  x.restore();
  if (w.x > -100) A.drawFighter({ x: w.x, y: GY, f: w.facing, s: SCALE, p: wp, whip, ...ws }, t);
}

const BREAK = 1.6; // seconds into the Deletion when the loser shatters

function deletionScene(s: Sim, t: number) {
  // staged center screen like the trailer, whatever the fight's final positions were
  const w = { ...s.f[s.roundWinner], x: 540, facing: 1 as const }, l = { ...s.f[1 - s.roundWinner], x: 800, facing: -1 as const };
  const D = FIGHTERS[w.id], ws = skin(s, s.roundWinner), ls = skin(s, 1 - s.roundWinner);
  const dt = s.phaseFrame / 60, x = A.x;
  if (dt < 0.25) shake = Math.max(shake, 6);
  x.fillStyle = 'rgba(120,0,10,.35)'; x.fillRect(0, 0, W, H);
  const P = A.POSE;
  if (dt < BREAK) {
    const k = dt / BREAK;
    if (w.id === 'kaal') {
      // the final hit replays in a time loop, faster each time
      x.save(); x.strokeStyle = 'rgba(255,177,90,.7)'; A.glow('#ff8a1f', 16); x.lineWidth = 2;
      for (let i = 0; i < 4; i++) { const r = 110 + i * 34, a0 = t * (3 + i) * (i % 2 ? -1 : 1); x.beginPath(); x.arc(l.x, 470, r, a0, a0 + 4.6); x.stroke(); }
      x.restore();
      const cyc = (k * k * 9) % 1;
      for (let g = 3; g >= 1; g--) { x.save(); x.globalAlpha = 0.12 * g; A.drawFighter({ x: l.x - l.facing * g * 10, y: GY, f: l.facing, s: SCALE, p: A.mixPose(P.stag, P.hit, A.clamp(cyc * 2 - g * 0.2)), look: ls.look, dim: true }, t); x.restore(); }
      A.drawFighter({ x: l.x, y: GY, f: l.facing, s: SCALE, p: A.mixPose(P.stag, P.hit, A.eOut(A.clamp(cyc * 2))), ...ls }, t);
      if (cyc < 0.15) A.sparks(l.x - l.facing * 10, 470, cyc * 0.5, Math.floor(k * k * 9) * 13, '#ffb15a', 22, 1);
      A.text(`LOOP ${String(Math.floor(k * k * 9) + 1).padStart(2, '0')}`, l.x, 250, 22, '#ffb15a', A.MONO, 'bold', 'center', 1, 5);
    } else if (w.id === 'vanta') {
      // dragged into their own shadow
      const g = x.createRadialGradient(l.x, GY, 0, l.x, GY, 260 * k + 40);
      g.addColorStop(0, 'rgba(10,0,20,.9)'); g.addColorStop(1, 'rgba(10,0,20,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.save(); x.globalAlpha = 1 - k * 0.6;
      A.drawFighter({ x: l.x, y: GY + 60 * k * k, f: l.facing, s: SCALE, p: P.stag, look: ls.look, dim: true }, t);
      x.restore();
      puff(l.x, GY - 60, (dt % 0.6));
    } else {
      // hammered into the floor like a nail
      const hits = Math.floor(dt / 0.4), sink = Math.min(4, hits) * 38 + (dt % 0.4 < 0.08 ? 10 : 0);
      if (dt % 0.4 < 0.05) shake = 14;
      x.save(); x.beginPath(); x.rect(0, 0, W, GY + 2); x.clip();
      A.drawFighter({ x: l.x, y: GY + sink, f: l.facing, s: SCALE, p: P.stag, ...ls }, t);
      x.restore();
      x.strokeStyle = 'rgba(255,120,60,.7)'; x.lineWidth = 2;
      for (let i = 0; i < hits; i++) { x.beginPath(); x.moveTo(l.x - 40 - i * 20, GY); x.lineTo(l.x - 90 - i * 30, GY + 30); x.moveTo(l.x + 40 + i * 20, GY); x.lineTo(l.x + 90 + i * 30, GY + 30); x.stroke(); }
    }
  } else {
    shards(l.x, GY - 110, dt - BREAK);
    if (dt - BREAK < 0.2) { x.fillStyle = `rgba(255,255,255,${1 - (dt - BREAK) / 0.2})`; x.fillRect(0, 0, W, H); }
  }
  // winner
  const wp = w.id === 'rook' && dt < BREAK ? ((dt % 0.4) < 0.2 ? P.raise : P.whip) : dt < 0.4 ? P.idle : dt < BREAK ? P.raise : P.whip;
  A.drawFighter({ x: w.x, y: GY, f: w.facing, s: SCALE, p: wp, ...ws, whip: w.id === 'kaal' && dt > BREAK ? 1 : 0 }, t);
  if (dt < BREAK) A.glitchText(D.deletion, W / 2, 140, 44, t, D.color, '900', A.HEAVY, 0.3);
  if (dt > BREAK + 0.5) {
    const a = A.seg(dt, BREAK + 0.5, BREAK + 0.8);
    A.glitchText('DELETION', W / 2, 220, 110 * A.lerp(1.4, 1, A.eOut(a)), t, '#ff2a44', '900', A.HEAVY, 0.5);
    A.text(ls.echo ? 'ECHO DATA ABSORBED BY THE ARCHIVE' : ws.echo ? 'YOUR ECHO TAKES YOUR PLACE' : 'MEMORY DELETED BY THE ARCHIVE', W / 2, 300, 20, '#29f0ff', A.MONO, 'bold', 'center', A.seg(dt, BREAK + 0.9, BREAK + 1.2), 4);
  }
}

// ---------- HUD and banners ----------
function hud(s: Sim) {
  const [a, b] = s.f;
  const ha = a.hp / a.maxHp, hb = b.hp / b.maxHp;
  ghost[0] = Math.max(ha, ghost[0] - 0.004);
  ghost[1] = Math.max(hb, ghost[1] - 0.004);
  const bEcho = view.echoSide === 1, bCol = bEcho ? '#29f0ff' : FIGHTERS[b.id].color;
  A.bar(40, 34, 500, ha, ghost[0], FIGHTERS[a.id].color, false);
  A.bar(740, 34, 500, hb, ghost[1], bCol, true);
  A.text(`${view.names?.[0] ?? "YOU"} // ${FIGHTERS[a.id].name}`, 44, 80, 22, '#fff', A.HEAVY, '900', 'left');
  A.text(`${view.names?.[1] ?? (bEcho ? "ECHO" : "CPU")} // ${FIGHTERS[b.id].name}`, 1236, 80, 22, bCol, A.HEAVY, '900', 'right');
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
  A.text('METER', 270, 696, 12, '#aaa', A.MONO, 'bold', 'left', 1, 3);
  A.meter(1240, 690, b.meter / 100, '#29f0ff', true);
}

// The Archive is always recording the player.
function archiveRec(t: number) {
  if (!view.rec) return;
  if (Math.floor(t * 2) % 2 === 0) { A.x.save(); A.glow('#ff1e3c', 12); A.x.fillStyle = '#ff2a44'; A.x.beginPath(); A.x.arc(1080, 118, 6, 0, 7); A.x.fill(); A.x.restore(); }
  A.text('ARCHIVE REC', 1094, 118, 13, '#ff6b7d', A.MONO, 'bold', 'left', 1, 2);
}

// What the Echo's network wants to do right now, its training loss and its match rate.
function modelPanel(t: number) {
  const P = view.panel;
  if (!P) return;
  const x = A.x, px = 1012, py = 140;
  x.fillStyle = 'rgba(2,10,16,.78)'; x.fillRect(px, py, 236, 172);
  x.strokeStyle = 'rgba(41,240,255,.6)'; x.lineWidth = 1; x.strokeRect(px, py, 236, 172);
  A.text('ECHO MODEL  //  LIVE', px + 12, py + 16, 11, '#29f0ff', A.MONO, 'bold', 'left', 1, 1);
  P.top.slice(0, 4).forEach(([name, v], i) => {
    const yy = py + 38 + i * 21, on = i === 0;
    A.text(name, px + 12, yy + 5, 10.5, on ? '#fff' : '#8ea4ad', A.MONO, 'bold', 'left');
    x.fillStyle = 'rgba(41,240,255,.12)'; x.fillRect(px + 104, yy, 116, 10);
    x.fillStyle = on ? '#29f0ff' : 'rgba(41,240,255,.45)'; x.fillRect(px + 104, yy, 116 * Math.min(1, v), 10);
  });
  if (P.loss.length > 1) {
    const max = Math.max(...P.loss), min = Math.min(...P.loss);
    x.strokeStyle = '#ff8a1f'; x.lineWidth = 1.5; x.beginPath();
    P.loss.forEach((l, i) => { const lx = px + 12 + (i / (P.loss.length - 1)) * 120, ly = py + 160 - 26 * ((l - min) / (max - min || 1)); i ? x.lineTo(lx, ly) : x.moveTo(lx, ly); });
    x.stroke();
  }
  A.text('LOSS', px + 12, py + 128, 9.5, '#ff8a1f', A.MONO, 'bold', 'left');
  A.text(`MATCH ${Math.round(P.acc * 100)}%`, px + 224, py + 152, 13, '#fff', A.MONO, 'bold', 'right');
  void t;
}

function callout(s: Sim) {
  if (!view.callout || s.phase !== 'fight') return;
  const age = (s.timer > 0 ? (99 * 60 - s.timer) : 0) / 60;
  const lines: [string, number, number][] = [[view.callout, 1, 3.5], ['IT DODGES THE WAY YOU DODGE', 4, 6]];
  for (const [txt, a, b] of lines) {
    if (age < a || age > b) continue;
    const al = A.seg(age, a, a + 0.15) * (1 - A.seg(age, b - 0.2, b)), x = A.x, size = 24, y = 620;
    x.save(); x.globalAlpha = al; x.font = `bold ${size}px ${A.COND}`;
    const w = x.measureText(txt).width + 40;
    x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(W / 2 - w / 2, y - size * 0.9, w, size * 1.8);
    x.fillStyle = '#29f0ff'; x.fillRect(W / 2 - w / 2, y - size * 0.9, 4, size * 1.8);
    x.restore();
    A.text(txt, W / 2, y, size, '#29f0ff', A.COND, 'bold', 'center', al);
  }
}

function banners(s: Sim, t: number) {
  const f = s.phaseFrame;
  if (s.phase === 'intro') {
    if (f < 60) A.glitchText(`ROUND ${s.round}`, W / 2, 300, 96 * A.lerp(1.4, 1, A.eOut(Math.min(1, f / 15))), t, '#fff', '900', A.HEAVY, 0.5);
    else A.glitchText('FIGHT', W / 2, 300, 140 * A.lerp(1.6, 1, A.eOut(Math.min(1, (f - 60) / 10))), t, '#ff2a44', '900', A.HEAVY, 0.8);
    if (s.round === 1) {
      A.text('WASD MOVE   U I J K ATTACK   U+J THROW   O SPECIAL   L / SPACE BLOCK', W / 2, 420, 14, '#bfe9ff', A.MONO, 'bold', 'center', 1, 2);
      A.text('P SUPER POWER (1 BAR)   ;  OVERCLOCK (3 BARS)   H HITBOXES   ESC MENU', W / 2, 446, 14, '#ffb15a', A.MONO, 'bold', 'center', 1, 2);
    }
  } else if (s.phase === 'outro' && s.lastBreath && f < LB_FRAMES) {
    const name = FIGHTERS[s.f[s.roundWinner].id].lastBreath, a = Math.min(1, f / 12);
    A.glitchText('LAST BREATH', W / 2, 110, 26, t, '#ffffff', '900', A.MONO, 0.3);
    A.glitchText(name, W / 2, 160, 60 * A.lerp(1.4, 1, A.eOut(a)), t, FIGHTERS[s.f[s.roundWinner].id].color, '900', A.HEAVY, 0.5);
  } else if (s.phase === 'outro') {
    const ko = s.f.some(q => q.hp <= 0);
    A.glitchText(ko ? 'K.O.' : 'TIME', W / 2, 300, 170 * A.lerp(1.8, 1, A.eOut(Math.min(1, f / 12))), t, '#ff2a44', '900', A.HEAVY, 0.7);
    if (f > 70) {
      const w = s.roundWinner;
      A.text(w < 0 ? 'DRAW' : `${FIGHTERS[s.f[w].id].name} WINS`, W / 2, 400, 34, '#fff', A.HEAVY, '900', 'center', Math.min(1, (f - 70) / 15), 6);
    }
  } else if (s.phase === 'finish') {
    const a = Math.min(1, f / 15), fl = Math.floor(t * 8) % 2;
    A.glitchText('DELETE THEM', W / 2, 250, 120 * A.lerp(1.5, 1, A.eOut(a)), t, fl ? '#ff2a44' : '#ffffff', '900', A.HEAVY, 0.9);
    if (s.roundWinner === 0) A.text('S  S  O', W / 2, 340, 18, '#7d8590', A.MONO, 'bold', 'center', 1, 8);
  } else if (s.phase === 'over') {
    A.x.fillStyle = 'rgba(0,0,0,.55)'; A.x.fillRect(0, 0, W, H);
    const won = s.wins[0] > s.wins[1];
    A.glitchText(won ? 'YOU WIN' : 'YOU LOSE', W / 2, 290, 130, t, won ? '#ffffff' : '#ff2a44', '900', A.HEAVY, 0.6);
    A.text(view.overHint ?? 'ENTER  REMATCH     //     ESC  FIGHTER SELECT', W / 2, 400, 18, '#29f0ff', A.MONO, 'bold', 'center', 1, 4);
  }
}

export function drawFight(s: Sim, t: number, v: FightView = {}) {
  view = v;
  const x = A.x, debug = v.debug;
  shake *= 0.86;
  x.save();
  x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  if (v.temple) { A.temple(t); A.rain(t, 100, 0.1, 0.1); } else { A.stage(t); A.rain(t, 200, 0.2); }
  if (v.floor) A.text(`FLOOR ${v.floor}`, W / 2, 112, 13, '#7d8590', A.MONO, 'bold', 'center', 1, 5);
  if (s.phase === 'deletion') deletionScene(s, t);
  else if (s.phase === 'outro' && s.lastBreath && s.phaseFrame < LB_FRAMES) lastBreathScene(s, t);
  else {
    powerFx(s, t);
    const order = s.f[0].state === 'attack' ? [1, 0] : [0, 1]; // attacker drawn on top
    for (const i of order) drawOne(s, i, t);
    overclockFx(s, t);
    sparks = sparks.filter(p => t - p.t0 < 0.7);
    for (const p of sparks) A.sparks(p.x, p.y, t - p.t0, p.seed, p.col, p.n, p.pow);
    if (debug) debugBoxes(s);
  }
  x.restore();
  if (s.phase !== 'deletion') comboText(t);
  if (s.hitstop > 0) { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(0, 0, W, H); }
  if (flash > 0) { x.fillStyle = `rgba(255,255,255,${flash * 0.6})`; x.fillRect(0, 0, W, H); flash -= 0.04; }
  if (s.phase !== 'deletion') { hud(s); archiveRec(t); modelPanel(t); callout(s); }
  bannerFx(t);
  banners(s, t);
  A.post(t);
}
