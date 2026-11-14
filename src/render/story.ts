// Story scenes for the Spire run, following the concept trailer:
// the opening, floor cards, the floor 61 twist, the Archive, the final choice and the endings.

import * as A from './art.ts';
import { FIGHTERS, type FighterId } from '../core/data.ts';
import type { Hot } from './screens.ts';
import { touchMode } from '../input.ts';

const { W, H } = A;
const skip = (t: number) => { if (t > 1) A.text((touchMode ? 'TAP TO SKIP' : 'ENTER  SKIP'), W - 40, H - 30, 11, '#5c636b', A.MONO, 'bold', 'right', 1, 4); };

export const OPENING_SECONDS = 5.2;

export function drawOpening(t: number) {
  const x = A.x, D = OPENING_SECONDS;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#070a14'); g.addColorStop(1, '#0a1a26'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.save(); x.translate(0, A.lerp(30, 0, A.eOut(A.seg(t, 0, D))));
  A.skyline(520, '#0b1422', 21, 1.1, true); A.skyline(560, '#05080e', 31, 1.4, false);
  x.restore();
  const wg = x.createLinearGradient(0, 540, 0, H); wg.addColorStop(0, 'rgba(10,40,60,.92)'); wg.addColorStop(1, '#020406'); x.fillStyle = wg; x.fillRect(0, 540, W, H);
  x.strokeStyle = 'rgba(41,240,255,.15)';
  for (let i = 0; i < 14; i++) { x.beginPath(); const y = 548 + i * 12; x.moveTo(0, y); for (let xx = 0; xx <= W; xx += 30) x.lineTo(xx, y + Math.sin(xx * 0.015 + t * 1.5 + i) * 3); x.stroke(); }
  A.rain(t, 420, 0.35);
  if (t > 2.75 && t < 2.95) { x.fillStyle = `rgba(200,220,255,${0.6 * (1 - A.seg(t, 2.75, 2.95))})`; x.fillRect(0, 0, W, H); }
  const a1 = A.seg(t, 0.4, 1.0);
  A.glitchText('2089', W / 2, 230, 150 * A.lerp(1.15, 1, A.eOut(a1)), t, `rgba(255,255,255,${a1})`, '900', A.HEAVY, 1 - A.seg(t, 0.4, 1.6));
  const s2 = 'MUMBAI IS UNDERWATER.';
  A.text(s2.slice(0, Math.floor(A.seg(t, 1.3, 2.3) * s2.length)), W / 2, 345, 34, '#bfe9ff', A.MONO, 'bold', 'center', 1, 6);
  if (t > 2.85) A.glitchText('THE DEAD ARE TAKING BOOKINGS.', W / 2, 410, 40, t, '#ff2a44', '900', A.HEAVY, 0.6 * (1 - A.seg(t, 2.85, 3.6)));
  if (t > 3.7) A.text('99 FLOORS. ONE RESTORATION. CLIMB.', W / 2, 470, 18, '#7d8590', A.MONO, 'bold', 'center', A.seg(t, 3.7, 4.1), 6);
  skip(t);
  A.post(t, A.seg(t, 0, 0.5) * (1 - A.seg(t, D - 0.4, D)));
}

export const CARD_SECONDS = 2.6;

// Floor banner before each tower fight, with the climb so far.
export function drawFloorCard(t: number, floor: number, me: FighterId, opp: FighterId, oppEcho: boolean, temple: boolean) {
  const x = A.x, M = FIGHTERS[me], O = FIGHTERS[opp], col = oppEcho ? '#29f0ff' : O.color;
  const zoom = 1 + 0.04 * t;
  x.save(); x.translate(W / 2, H / 2); x.scale(zoom, zoom); x.translate(-W / 2, -H / 2);
  if (temple) A.temple(t); else A.stage(t);
  x.fillStyle = A.mixc(col, -0.75) + 'aa'; x.fillRect(0, 0, W, H);
  A.rain(t, 200, 0.2, 0.3);
  A.drawFighter({ x: 860, y: 640, f: -1, s: 1.3, p: A.POSE.idle, look: oppEcho ? A.ECHO_LOOK[opp] : opp, weapon: O.weapon, wcol: col, echo: oppEcho }, t);
  A.drawFighter({ x: 420, y: 640, f: 1, s: 1.3, p: A.mixPose(A.POSE.idle, A.POSE.block, 0.3), look: me, weapon: M.weapon, wcol: M.color }, t);
  x.restore();
  if (t < 0.1) { x.fillStyle = `rgba(255,255,255,${0.6 * (1 - t / 0.1)})`; x.fillRect(0, 0, W, H); }
  x.fillStyle = 'rgba(0,0,0,.7)'; x.fillRect(0, 26, 520, 86); x.fillStyle = col; x.fillRect(0, 26, 8, 86);
  A.text(`FLOOR ${floor}`, 30, 52, 20, '#fff', A.MONO, 'bold', 'left', 1, 5);
  A.glitchText(`${M.name}  VS  ${oppEcho ? 'YOUR ECHO' : O.name}`, 30, 88, 34, t, '#fff', '900', A.HEAVY, 0.3, 'left');
  A.text(oppEcho ? 'TRAINED ON YOUR FIGHTS' : O.weaponName, 1250, 60, 15, col, A.MONO, 'bold', 'right', 1, 3);
  // tower progress
  x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(1236, 140, 16, 420);
  const fp = (floor - 10 + 10 * A.seg(t, 0, CARD_SECONDS)) / 99;
  x.save(); A.glow('#29f0ff', 12); x.fillStyle = '#29f0ff'; x.fillRect(1236, 140 + 420 * (1 - fp), 16, 420 * fp); x.restore();
  A.text('99', 1244, 128, 12, '#29f0ff', A.MONO, 'bold', 'center');
  A.post(t, A.seg(t, 0, 0.2) * (1 - A.seg(t, CARD_SECONDS - 0.2, CARD_SECONDS)));
}

export const TWIST_SECONDS = 5;

// Floor 61: the player finds their own body.
export function drawTwist(t: number, me: FighterId) {
  const x = A.x, M = FIGHTERS[me];
  const push = 1 + 0.08 * A.seg(t, 0, TWIST_SECONDS);
  x.save(); x.translate(W / 2, 560); x.scale(push, push); x.translate(-W / 2, -560);
  A.temple(t);
  x.save(); x.translate(760, 570); x.rotate(-Math.PI / 2 + 0.05); x.translate(-760, -570);
  A.drawFighter({ x: 760, y: 610, f: 1, s: 1.2, p: A.POSE.stag, look: me, dim: true }, t);
  x.restore();
  A.drawFighter({ x: 520, y: 600, f: 1, s: 1.25, p: A.mixPose(A.POSE.idle, A.POSE.stag, A.seg(t, 1.2, 2.2)), look: me, weapon: M.weapon, wcol: M.color }, t);
  x.restore();
  A.rain(t, 120, 0.12, 0.1);
  A.text('FLOOR 61  //  THE FLOODED TEMPLE', 40, 50, 16, '#7d8590', A.MONO, 'bold', 'left', A.seg(t, 0.2, 0.5), 4);
  if (t > 0.9) A.glitchText('THAT BODY IS YOURS.', W / 2, 150, 58, t, '#ffffff', '900', A.HEAVY, 0.35 * (1 - A.seg(t, 0.9, 1.8)) + 0.15);
  if (t > 2.4) {
    const n = Math.floor(A.lerp(1, 4096, A.eOut(A.seg(t, 2.4, 3.8))));
    A.glitchText(`RUN ${String(n).padStart(4, '0')}`, W / 2, 235, 84, t, '#ff2a44', '900', A.MONO, 0.7);
    A.text('YOU HAVE CLIMBED THIS TOWER BEFORE. YOU HAVE DIED HERE BEFORE.', W / 2, 295, 19, '#bfe9ff', A.COND, 'bold', 'center', A.seg(t, 3.4, 3.8), 2);
  }
  skip(t);
  A.post(t, A.seg(t, 0, 0.3) * (1 - A.seg(t, TWIST_SECONDS - 0.3, TWIST_SECONDS)));
}

export const ARCHIVE_SECONDS = 6.5;

// After the Echo falls: the Archive explains where every Echo goes.
export function drawArchive(t: number) {
  const x = A.x, cx = W / 2, cy = 330, a = A.eOut(A.seg(t, 0, 1));
  x.fillStyle = '#010204'; x.fillRect(0, 0, W, H);
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const r = (60 + i * 26) * a, rot = t * (0.4 + i * 0.07) * (i % 2 ? 1 : -1);
    x.strokeStyle = `rgba(41,240,255,${0.12 + 0.03 * (i % 4)})`; x.lineWidth = 1 + (i % 3);
    x.setLineDash([4 + i * 3, 8 + i]); x.beginPath(); x.arc(cx, cy, r, rot, rot + 5.5); x.stroke();
  }
  x.setLineDash([]);
  x.font = `bold 12px ${A.MONO}`;
  for (let i = 0; i < 90; i++) { const r = A.rng(i + 900), ang = r() * 6.283 + t * 0.3, rad = 120 + r() * 360; x.fillStyle = `rgba(41,240,255,${0.3 * r()})`; x.fillText(r() > 0.5 ? '1' : '0', cx + Math.cos(ang) * rad * a, cy + Math.sin(ang) * rad * 0.6 * a); }
  x.restore();
  const open = A.eOut(A.seg(t, 0.4, 1.2)) * (Math.floor(t * 10) % 31 === 0 ? 0.1 : 1);
  x.save(); A.glow('#29f0ff', 30); x.fillStyle = '#031016'; x.strokeStyle = '#29f0ff'; x.lineWidth = 3;
  x.beginPath(); x.ellipse(cx, cy, 170, 70 * open + 1, 0, 0, 7); x.fill(); x.stroke();
  x.beginPath(); x.ellipse(cx, cy, 60 * open, 60 * open, 0, 0, 7); x.clip();
  const pr = t > 4.2 ? '#000' : '#ff1e3c';
  A.glow(pr, 40); x.fillStyle = pr; x.beginPath(); x.arc(cx + Math.sin(t * 1.5) * 10, cy, 34, 0, 7); x.fill();
  x.restore();
  A.text('THE ARCHIVE', cx, 60, 18, '#29f0ff', A.MONO, 'bold', 'center', A.seg(t, 0.3, 0.6), 10);
  const lines: [number, string, string][] = [[1.3, 'EVERY ECHO YOU BEAT IS SENT FORWARD IN TIME', '#fff'], [2.3, 'TO FIGHT A WAR THREE YEARS FROM NOW', '#fff'], [3.2, 'AGAINST THE NULL', '#ff2a44']];
  lines.forEach(([at, s, col], i) => { if (t > at && t < 4.3) A.text(s, cx, 510 + i * 40, i === 2 ? 30 : 22, col, i === 2 ? A.HEAVY : A.COND, i === 2 ? '900' : 'bold', 'center', A.seg(t, at, at + 0.25), 2); });
  if (t > 4.3) {
    if (t < 4.45) { x.fillStyle = `rgba(255,30,60,${0.6 * (1 - A.seg(t, 4.3, 4.45))})`; x.fillRect(0, 0, W, H); }
    A.glitchText('THE NULL IS WHAT I BECOME.', cx, 560, 54, t, '#ffffff', '900', A.HEAVY, A.lerp(2.4, 0.5, A.seg(t, 4.3, 5.2)));
  }
  skip(t);
  A.post(t, A.seg(t, 0, 0.3) * (1 - A.seg(t, ARCHIVE_SECONDS - 0.3, ARCHIVE_SECONDS)));
}

export const CHOICES = [
  { title: 'SAVE THE FUTURE', sub: 'DESTROY THE CORE. EVERYONE RESTORED IS ERASED.', col: '#29f0ff' },
  { title: 'SAVE YOURSELF', sub: 'WALK AWAY. YOUR ECHO GOES TO WAR.', col: '#ff8a1f' },
];

export function drawChoice(t: number, sel: number, hot: Hot, pick: (i: number) => void) {
  const x = A.x;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  const a = A.seg(t, 0, 0.4);
  CHOICES.forEach((c, i) => {
    const px = i ? 660 : 100, on = sel === i;
    hot(px, 190, 520, 300, () => pick(i));
    x.save(); x.globalAlpha = a;
    const g = x.createLinearGradient(px, 0, px + 520, 0); g.addColorStop(0, c.col + (on ? '44' : '14')); g.addColorStop(1, '#000');
    x.fillStyle = g; x.fillRect(px, 190, 520, 300);
    x.strokeStyle = on ? c.col : 'rgba(255,255,255,.15)'; x.lineWidth = on ? 3 : 1; if (on) A.glow(c.col, 24); x.strokeRect(px, 190, 520, 300);
    x.restore();
    A.glitchText(c.title, px + 260, 300, 44, t, on ? '#fff' : '#555', '900', A.HEAVY, on ? 0.4 : 0);
    A.text(c.sub, px + 260, 370, 15, on ? c.col : '#444', A.MONO, 'bold', 'center', 1, 1);
  });
  A.text('THE TRUE ENDING', W / 2, 110, 18, '#7d8590', A.MONO, 'bold', 'center', a, 10);
  if (t > 1.2) A.glitchText('CHOOSE.', W / 2, 600, 70, t, '#ff2a44', '900', A.HEAVY, 0.9);
  A.text((touchMode ? 'TAP A CHOICE' : 'A / D  CHOOSE     ENTER  CONFIRM'), W / 2, 670, 12, '#5c636b', A.MONO, 'bold', 'center', 1, 4);
  A.post(t, A.seg(t, 0, 0.3));
}

const ENDINGS = [
  ['THE CORE BURNS.', 'EVERY RESTORATION FADES, ONE BY ONE. YOU GO LAST.', 'THE NULL NEVER WAKES UP.'],
  ['YOU WALK OUT OF THE SPIRE ALIVE.', 'THREE YEARS FROM NOW, YOUR ECHO MARCHES INTO THE WAR.', 'IT FIGHTS EXACTLY LIKE YOU.'],
];

export function drawEnding(t: number, choice: number, me: FighterId, unlock: FighterId | null) {
  const x = A.x, M = FIGHTERS[me];
  x.fillStyle = '#020306'; x.fillRect(0, 0, W, H);
  A.spire(W / 2, 760, 640, t, choice === 0 ? 0.35 * (1 - A.seg(t, 0, 4)) : 0.35);
  A.rain(t, 160, 0.15);
  if (choice === 1) A.drawFighter({ x: A.lerp(640, 1400, A.seg(t, 2, 9)), y: 700, f: 1, s: 1.1, p: A.POSE.idle, look: me, weapon: M.weapon, wcol: M.color, dim: true }, t);
  ENDINGS[choice].forEach((line, i) => {
    const at = 0.5 + i * 1.6;
    if (t > at) A.text(line, W / 2, 200 + i * 60, i === 0 ? 34 : 22, i === 2 ? CHOICES[choice].col : '#fff', i === 0 ? A.HEAVY : A.COND, i === 0 ? '900' : 'bold', 'center', A.seg(t, at, at + 0.5), 2);
  });
  if (t > 5.5) {
    A.glitchText('ECHO', W / 2, 470, 120 * A.lerp(1.2, 1, A.eOut(A.seg(t, 5.5, 6))), t, '#ffffff', '900', A.HEAVY, 0.4);
    if (unlock) {
      // the reward for clearing the Spire: the next fighter joins the roster
      const U = FIGHTERS[unlock], a = A.seg(t, 6, 6.4);
      A.text('NEW FIGHTER UNLOCKED', W / 2, 545, 14, '#ffb15a', A.MONO, 'bold', 'center', a, 6);
      x.save(); x.globalAlpha = a;
      A.glitchText(U.name, W / 2, 590, 44, t, U.color, '900', A.HEAVY, 0.4);
      x.restore();
      A.drawFighter({ x: 1080, y: 700, f: -1, s: 1, p: A.mixPose(A.POSE.idle, A.POSE.raise, 0.3), look: unlock, weapon: U.weapon, wcol: U.color, dim: t < 6 }, t);
    } else A.text('THANKS FOR PLAYING', W / 2, 560, 16, '#29f0ff', A.MONO, 'bold', 'center', A.seg(t, 6, 6.4), 6);
    A.text((touchMode ? 'TAP FOR MAIN MENU' : 'ENTER  MAIN MENU'), W / 2, unlock ? 660 : 640, 12, '#7d8590', A.MONO, 'bold', 'center', A.seg(t, 6.5, 7), 4);
  }
  A.post(t, A.seg(t, 0, 0.6));
}

// Lost on a tower floor.
export function drawFallen(t: number, floor: number, toEcho: boolean) {
  const x = A.x;
  x.fillStyle = '#050002'; x.fillRect(0, 0, W, H);
  A.spire(W / 2, 760, 640, t, 0.25);
  A.rain(t, 140, 0.12);
  A.glitchText(toEcho ? 'YOUR ECHO TOOK YOUR PLACE' : 'THE SPIRE KEEPS YOU', W / 2, 260, toEcho ? 56 : 70, t, '#ff2a44', '900', A.HEAVY, 0.5);
  A.text(`FALLEN ON FLOOR ${floor}`, W / 2, 340, 20, '#bfe9ff', A.MONO, 'bold', 'center', A.seg(t, 0.5, 1), 6);
  A.text((touchMode ? 'TAP TO TRY THIS FLOOR AGAIN' : 'ENTER  TRY THIS FLOOR AGAIN     //     ESC  MAIN MENU'), W / 2, 460, 14, '#7d8590', A.MONO, 'bold', 'center', A.seg(t, 1, 1.5), 4);
  A.post(t, A.seg(t, 0, 0.4));
}
