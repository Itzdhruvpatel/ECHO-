// Landing page, main menu and fighter select, drawn in the trailer style.
// `hot(x, y, w, h)` registers a clickable rect and returns true while the mouse is over it.

import * as A from './art.ts';
import { FIGHTERS, ROSTER } from '../core/data.ts';

export type Hot = (x: number, y: number, w: number, h: number, onClick: () => void) => boolean;
const { W, H } = A;

export const MENU = [
  { name: 'ARCADE TOWER', desc: 'Best of 3 against the CPU. Your Echo waits at the top of the Spire.', on: true },
  { name: 'VERSUS', desc: 'Two players, one keyboard or two gamepads.', on: false },
  { name: 'ECHO LAB', desc: 'Watch your Echo train on your fights.', on: false },
];

export function drawLanding(t: number, hot: Hot, start: () => void) {
  const x = A.x;
  A.stage(t * 0.5);
  x.fillStyle = 'rgba(2,3,8,.62)'; x.fillRect(0, 0, W, H);
  A.rain(t, 180, 0.18);
  const br = Math.sin(t * 2.2) * 0.03;
  A.drawFighter({ x: 150, y: 770, f: 1, s: 2.2, p: A.mixPose(A.POSE.idle, A.POSE.block, 0.2 + br), look: 'kaal', weapon: 'urumi', wcol: '#ff8a1f' }, t);
  A.drawFighter({ x: 1130, y: 770, f: -1, s: 2.2, p: A.mixPose(A.POSE.idle, A.POSE.block, 0.2 - br), look: 'echo', weapon: 'urumi', wcol: '#29f0ff', echo: true }, t);
  const vg = x.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(0,0,0,.55)'); vg.addColorStop(0.25, 'rgba(0,0,0,0)'); vg.addColorStop(0.8, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.8)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
  const a = A.eOut(A.seg(t, 0, 0.8));
  x.save(); x.globalAlpha = a; x.translate(0, (1 - a) * 20);
  A.text('A FIGHTING GAME THAT LEARNS YOU', W / 2, 160, 15, '#29f0ff', A.MONO, 'bold', 'center', 1, 8);
  A.glitchText('ECHO', W / 2, 262, 170, t, '#ffffff', '900', A.HEAVY, 0.3);
  A.text('YOU SPENT THE WHOLE TOURNAMENT TEACHING YOUR KILLER', W / 2, 372, 21, '#dfe6ec', A.COND, 'bold', 'center', 1, 3);
  x.restore();
  const hover = hot(515, 441, 250, 58, start);
  A.button(640, 470, 250, 58, 'START GAME', true, hover, false, t);
  A.text('PRESS ENTER', W / 2, 530, 12, '#8a949d', A.MONO, 'bold', 'center', Math.floor(t * 2) % 2 ? 1 : 0.4, 4);
  A.text('RUNS IN YOUR BROWSER  //  PC AND LAPTOP RECOMMENDED', W / 2, 610, 12, '#8a949d', A.MONO, 'bold', 'center', a, 3);
  A.post(t, A.seg(t, 0, 0.35));
}

export function drawMenu(t: number, sel: number, hot: Hot, choose: (i: number) => void) {
  const x = A.x;
  x.fillStyle = '#04050a'; x.fillRect(0, 0, W, H);
  A.spire(930, 760, 620, t, 0.8);
  A.rain(t, 120, 0.15);
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, 0, 560, H);
  A.text('MAIN MENU', 80, 110, 14, '#7d8590', A.MONO, 'bold', 'left', 1, 8);
  MENU.forEach((m, i) => {
    const y = 190 + i * 70, on = i === sel;
    hot(60, y - 28, 440, 56, () => choose(i));
    if (on) {
      const g = x.createLinearGradient(60, 0, 500, 0); g.addColorStop(0, 'rgba(255,42,68,.55)'); g.addColorStop(1, 'rgba(255,42,68,0)');
      x.fillStyle = g; x.fillRect(60, y - 24, 440, 48); x.fillStyle = '#ff2a44'; x.fillRect(60, y - 24, 5, 48);
    }
    if (on) A.glitchText(m.name, 84, y, 32, t, '#fff', '900', A.HEAVY, 0.2, 'left');
    else A.text(m.name, 84, y, 30, m.on ? '#8a9199' : '#3c4248', A.HEAVY, '900', 'left');
    if (!m.on) A.text('SOON', 480, y, 11, '#5c636b', A.MONO, 'bold', 'right', 1, 3);
  });
  const d = MENU[sel];
  x.fillStyle = 'rgba(2,8,12,.75)'; x.fillRect(640, 440, 560, 150);
  x.strokeStyle = 'rgba(41,240,255,.5)'; x.lineWidth = 1; x.strokeRect(640, 440, 560, 150);
  A.text(d.name, 664, 474, 26, '#fff', A.HEAVY, '900', 'left');
  A.text(d.desc, 664, 512, 17, '#bfe9ff', A.COND, 'bold', 'left');
  A.text(d.on ? 'W / S  SELECT     ENTER  CONFIRM' : 'NOT IN THIS BUILD YET', 664, 560, 12, '#29f0ff', A.MONO, 'bold', 'left', 1, 2);
  A.post(t);
}

export function drawSelect(t: number, sel: number, hot: Hot, pick: (i: number) => void) {
  const x = A.x;
  x.fillStyle = '#05060a'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(41,240,255,.07)'; x.lineWidth = 1;
  for (let i = 0; i < 40; i++) { x.beginPath(); x.moveTo(i * 40 - (t * 20) % 40, 0); x.lineTo(i * 40 - (t * 20) % 40, H); x.stroke(); }
  for (let j = 0; j < 20; j++) { x.beginPath(); x.moveTo(0, j * 40); x.lineTo(W, j * 40); x.stroke(); }
  A.glitchText('CHOOSE YOUR FIGHTER', W / 2, 62, 46, t, '#fff', '900', A.HEAVY, 0.25);
  A.text('A / D  BROWSE     ENTER  FIGHT     ESC  BACK', W / 2, 106, 15, '#29f0ff', A.MONO, 'bold', 'center', 1, 4);
  const cw = 250, gap = 24, x0 = (W - (cw * 3 + gap * 2)) / 2, cy = 140, ch = 400;
  ROSTER.forEach((id, i) => {
    const F = FIGHTERS[id], on = i === sel, cx = x0 + i * (cw + gap);
    hot(cx, cy, cw, ch, () => pick(i));
    const g = x.createLinearGradient(0, cy, 0, cy + ch); g.addColorStop(0, on ? F.color + '55' : '#11141c'); g.addColorStop(1, '#07080c');
    x.fillStyle = g; x.fillRect(cx, cy, cw, ch);
    x.save(); x.beginPath(); x.rect(cx, cy, cw, ch); x.clip();
    const pose = on ? A.mixPose(A.POSE.idle, A.POSE.raise, (Math.sin(t * 5) * 0.5 + 0.5) * 0.35) : A.POSE.idle;
    A.drawFighter({ x: cx + cw / 2 - 6, y: cy + ch - 92, f: 1, s: 1.2, p: pose, look: id, dim: !on, weapon: F.weapon, wcol: F.color, whip: 0 }, t + i);
    x.restore();
    x.save();
    x.strokeStyle = on ? F.color : 'rgba(255,255,255,.18)'; x.lineWidth = on ? 3 : 1; if (on) A.glow(F.color, 20); x.strokeRect(cx, cy, cw, ch);
    x.restore();
    x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(cx, cy + ch - 72, cw, 72);
    A.text(F.name, cx + cw / 2, cy + ch - 50, 28, on ? '#fff' : '#9aa0aa', A.HEAVY, '900');
    A.text(F.weaponName, cx + cw / 2, cy + ch - 22, 12, on ? F.color : '#6c717a', A.COND, 'bold');
  });
  const F = FIGHTERS[ROSTER[sel]];
  x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(80, 572, W - 160, 112);
  x.strokeStyle = F.color; x.lineWidth = 2; x.strokeRect(80, 572, W - 160, 112);
  A.glitchText(F.name, 120, 628, 54, t, F.color, '900', A.HEAVY, 0.3, 'left');
  [['WEAPON', F.weaponName], ['SUPER POWER', F.power], ['STYLE', F.style]].forEach(([lab, v], j) => {
    const xx = 470 + j * 255;
    A.text(lab, xx, 606, 13, '#7d8590', A.MONO, 'bold', 'left', 1, 3);
    A.text(v, xx, 640, 19, '#fff', A.COND, 'bold', 'left');
  });
  A.text(F.moveList, 470, 670, 12, F.color, A.MONO, 'bold', 'left', 1, 1);
  A.post(t);
}
