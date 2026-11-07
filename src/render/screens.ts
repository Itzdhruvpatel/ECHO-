// Landing page, main menu and fighter select, drawn in the trailer style.
// `hot(x, y, w, h)` registers a clickable rect and returns true while the mouse is over it.

import * as A from './art.ts';
import { FIGHTERS, ROSTER } from '../core/data.ts';

export type Hot = (x: number, y: number, w: number, h: number, onClick: () => void) => boolean;
const { W, H } = A;

export const MENU = [
  { id: 'arcade', name: 'ARCADE TOWER', desc: 'Best of 3 against the CPU. Every fight teaches your Echo.' },
  { id: 'echo', name: 'FIGHT YOUR ECHO', desc: 'Floor 99. A neural network trained on how you fight.' },
  { id: 'lab', name: 'ECHO LAB', desc: 'Your Habit Report and the Echo\'s training.' },
  { id: 'versus', name: 'VERSUS', desc: 'Two players, one keyboard or two gamepads.' },
] as const;
export type MenuId = (typeof MENU)[number]['id'];

// What the menu and lab know about the Echo.
export interface EchoInfo {
  matches: number;
  samples: number;
  need: number; // matches still needed before the Echo can wake up
  training: boolean;
  progress: number;
  ready: boolean;
  acc: number;
  loss: number[];
  lines: string[];
  dist: [string, number][];
}

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

export const menuOn = (id: MenuId, e: EchoInfo) => id === 'arcade' || id === 'lab' || (id === 'echo' && e.ready);

function echoLine(e: EchoInfo) {
  const state = e.training ? `TRAINING ${Math.round(e.progress * 100)}%` : e.ready ? 'MODEL READY' : `${e.need} MORE FIGHT${e.need === 1 ? '' : 'S'} TO WAKE IT`;
  return `YOUR ECHO:  ${e.samples.toLocaleString('en-US')} MOVES RECORDED  //  ${state}`;
}

export function drawMenu(t: number, sel: number, pressed: boolean, e: EchoInfo, hot: Hot, choose: (i: number) => void) {
  const x = A.x;
  x.fillStyle = '#04050a'; x.fillRect(0, 0, W, H);
  A.spire(930, 760, 620, t, 0.8);
  A.rain(t, 120, 0.15);
  if (!pressed) {
    hot(0, 0, W, H, () => choose(-1));
    if (Math.floor(t * 4) % 2 === 0) A.glitchText('PRESS START', W / 2, H / 2, 64, t, '#fff', '900', A.HEAVY, 0.4);
    A.post(t, A.seg(t, 0, 0.2));
    return;
  }
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, 0, 560, H);
  A.text('MAIN MENU', 80, 110, 14, '#7d8590', A.MONO, 'bold', 'left', 1, 8);
  MENU.forEach((m, i) => {
    const y = 190 + i * 66, on = i === sel, en = menuOn(m.id, e);
    hot(60, y - 28, 440, 56, () => choose(i));
    if (on) {
      const g = x.createLinearGradient(60, 0, 500, 0); g.addColorStop(0, 'rgba(255,42,68,.55)'); g.addColorStop(1, 'rgba(255,42,68,0)');
      x.fillStyle = g; x.fillRect(60, y - 24, 440, 48); x.fillStyle = '#ff2a44'; x.fillRect(60, y - 24, 5, 48);
    }
    if (on) A.glitchText(m.name, 84, y, 32, t, en ? '#fff' : '#8a9199', '900', A.HEAVY, 0.2, 'left');
    else A.text(m.name, 84, y, 30, en ? '#5c636b' : '#2f3439', A.HEAVY, '900', 'left');
    if (m.id === 'versus') A.text('SOON', 480, y, 11, '#5c636b', A.MONO, 'bold', 'right', 1, 3);
    if (m.id === 'echo' && !en) A.text('LOCKED', 480, y, 11, '#ff6b7d', A.MONO, 'bold', 'right', 1, 3);
  });
  const d = MENU[sel], en = menuOn(d.id, e);
  x.fillStyle = 'rgba(2,8,12,.75)'; x.fillRect(640, 440, 560, 170);
  x.strokeStyle = 'rgba(41,240,255,.5)'; x.lineWidth = 1; x.strokeRect(640, 440, 560, 170);
  A.text(d.name, 664, 474, 26, '#fff', A.HEAVY, '900', 'left');
  A.text(d.desc, 664, 512, 17, '#bfe9ff', A.COND, 'bold', 'left');
  const hint = en ? 'W / S  SELECT     ENTER  CONFIRM' : d.id === 'echo' ? `WIN OR LOSE ${e.need} MORE ARCADE FIGHTS FIRST` : 'NOT IN THIS BUILD YET';
  A.text(hint, 664, 548, 12, en ? '#7d8590' : '#ff6b7d', A.MONO, 'bold', 'left', 1, 2);
  A.text(echoLine(e), 664, 586, 12, '#29f0ff', A.MONO, 'bold', 'left', 1, 2);
  A.post(t);
}

// Echo Lab: the Habit Report, the training curve and what the Echo does most.
export function drawLab(t: number, e: EchoInfo, hot: Hot, fight: () => void) {
  const x = A.x;
  x.fillStyle = '#03070a'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(41,240,255,.06)'; x.lineWidth = 1;
  for (let i = 0; i < 33; i++) { x.beginPath(); x.moveTo(i * 40, 0); x.lineTo(i * 40, H); x.stroke(); }
  A.glitchText('ECHO LAB', 80, 70, 46, t, '#fff', '900', A.HEAVY, 0.25, 'left');
  A.text('THE ARCHIVE HAS BEEN WATCHING YOU FIGHT', 82, 112, 13, '#29f0ff', A.MONO, 'bold', 'left', 1, 4);
  const box = (bx: number, by: number, bw: number, bh: number, title: string) => {
    x.fillStyle = 'rgba(2,10,16,.8)'; x.fillRect(bx, by, bw, bh);
    x.strokeStyle = 'rgba(41,240,255,.45)'; x.strokeRect(bx, by, bw, bh);
    A.text(title, bx + 18, by + 22, 12, '#7d8590', A.MONO, 'bold', 'left', 1, 4);
  };
  // training
  box(80, 150, 520, 220, 'MODEL');
  A.text(`${e.matches} FIGHTS  //  ${e.samples.toLocaleString('en-US')} MOVES`, 98, 198, 20, '#fff', A.COND, 'bold', 'left');
  const state = e.training ? 'TRAINING' : e.ready ? 'READY' : 'ASLEEP';
  A.text(state, 578, 198, 24, e.ready || e.training ? '#29f0ff' : '#ff6b7d', A.HEAVY, '900', 'right');
  x.fillStyle = 'rgba(41,240,255,.12)'; x.fillRect(98, 222, 480, 10);
  x.fillStyle = '#29f0ff'; x.fillRect(98, 222, 480 * (e.training ? e.progress : e.ready ? 1 : (e.matches / (e.matches + e.need))), 10);
  if (e.loss.length > 1) {
    const max = Math.max(...e.loss), min = Math.min(...e.loss);
    x.strokeStyle = '#ff8a1f'; x.lineWidth = 2; x.beginPath();
    e.loss.forEach((l, i) => { const lx = 98 + (i / (e.loss.length - 1)) * 300, ly = 350 - 60 * ((l - min) / (max - min || 1)); i ? x.lineTo(lx, ly) : x.moveTo(lx, ly); });
    x.stroke();
    A.text('TRAINING LOSS', 98, 282, 11, '#ff8a1f', A.MONO, 'bold', 'left', 1, 2);
    A.text(`MATCHES YOUR CHOICES`, 578, 300, 11, '#7d8590', A.MONO, 'bold', 'right', 1, 2);
    A.text(`${Math.round(e.acc * 100)}%`, 578, 336, 40, '#fff', A.HEAVY, '900', 'right');
  } else A.text(e.need ? `PLAY ${e.need} MORE ARCADE FIGHT${e.need === 1 ? '' : 'S'} TO WAKE YOUR ECHO` : 'FIRST TRAINING RUN STARTING', 98, 300, 14, '#bfe9ff', A.MONO, 'bold', 'left', 1, 2);
  // habit report
  box(640, 150, 560, 220, 'HABIT REPORT');
  if (e.lines.length) e.lines.slice(0, 3).forEach((l, i) => A.text(l, 658, 200 + i * 44, 19, i === 0 ? '#fff' : '#9df6ff', A.MONO, 'bold', 'left', 1, 1));
  else A.text('NOT ENOUGH DATA YET', 658, 200, 18, '#5c636b', A.MONO, 'bold', 'left', 1, 2);
  // action mix
  box(80, 400, 1120, 210, 'WHAT YOU DO MOST');
  e.dist.slice(0, 8).forEach(([name, v], i) => {
    const cx = 98 + (i % 4) * 276, cy = 450 + Math.floor(i / 4) * 70;
    A.text(name, cx, cy, 13, '#bfe9ff', A.MONO, 'bold', 'left', 1, 1);
    x.fillStyle = 'rgba(41,240,255,.12)'; x.fillRect(cx, cy + 14, 240, 10);
    x.fillStyle = '#29f0ff'; x.fillRect(cx, cy + 14, 240 * Math.min(1, v * 3), 10);
    A.text(`${Math.round(v * 100)}%`, cx + 240, cy, 13, '#fff', A.MONO, 'bold', 'right');
  });
  if (e.ready) {
    const hover = hot(950, 636, 250, 54, fight);
    A.button(1075, 663, 250, 54, 'FIGHT YOUR ECHO', true, hover, false, t);
  }
  A.text('ESC  BACK', 80, 663, 13, '#7d8590', A.MONO, 'bold', 'left', 1, 4);
  A.post(t);
}

// Floor 99: the split screen face-off before the Echo fight, with the player's real habits.
export function drawSummit(t: number, id: string, lines: string[], hot: Hot, go: () => void) {
  const x = A.x, F = FIGHTERS[id as keyof typeof FIGHTERS];
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  hot(0, 0, W, H, go);
  const split = A.eOut(A.seg(t, 0, 0.5));
  x.save(); x.beginPath(); x.moveTo(0, 0); x.lineTo(W / 2 + 40, 0); x.lineTo(W / 2 - 40, H); x.lineTo(0, H); x.clip();
  const lg = x.createLinearGradient(0, 0, W / 2, 0); lg.addColorStop(0, A.mixc(F.color, -0.8)); lg.addColorStop(1, '#0a0502'); x.fillStyle = lg; x.fillRect(0, 0, W, H);
  A.drawFighter({ x: A.lerp(-100, 330, split), y: 660, f: 1, s: 1.65, p: A.POSE.idle, look: id, weapon: F.weapon, wcol: F.color }, t);
  x.restore();
  x.save(); x.beginPath(); x.moveTo(W / 2 + 40, 0); x.lineTo(W, 0); x.lineTo(W, H); x.lineTo(W / 2 - 40, H); x.clip();
  const rg = x.createLinearGradient(W / 2, 0, W, 0); rg.addColorStop(0, '#00090c'); rg.addColorStop(1, '#002a33'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
  A.drawFighter({ x: A.lerp(1380, 950, split), y: 660, f: -1, s: 1.65, p: A.POSE.idle, look: A.ECHO_LOOK[id as keyof typeof A.ECHO_LOOK], weapon: F.weapon, wcol: '#29f0ff', echo: true }, t);
  x.restore();
  x.save(); A.glow('#fff', 20); x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.moveTo(W / 2 + 40, 0); x.lineTo(W / 2 - 40, H); x.stroke(); x.restore();
  A.glitchText('FLOOR 99', W / 2, 60, 26, t, '#fff', '900', A.MONO, 0.3);
  A.glitchText('VS', W / 2, 340, 120 * A.lerp(2, 1, A.eOut(A.seg(t, 0.3, 0.6))), t, '#ff2a44', '900', A.HEAVY, 0.8);
  A.text(F.name, 60, 120, 40, F.color, A.HEAVY, '900', 'left', split);
  A.text('YOUR ECHO', 1220, 120, 40, '#29f0ff', A.HEAVY, '900', 'right', split);
  lines.forEach((s, i) => {
    const a = 0.8 + i * 0.55;
    if (t > a) A.text(s.slice(0, Math.floor(A.seg(t, a, a + 0.35) * s.length)), 1220, 190 + i * 34, 17, i === 3 ? '#fff' : '#9df6ff', A.MONO, 'bold', 'right', 1, 1);
  });
  if (t > 3.2) A.glitchText('"I AM THE ORIGINAL."', 1220, 345, 30, t, '#ffffff', '900', A.HEAVY, 0.4, 'right');
  if (t > 3.6) A.text('PRESS ENTER', W / 2, 690, 12, '#8a949d', A.MONO, 'bold', 'center', Math.floor(t * 2) % 2 ? 1 : 0.4, 4);
  A.post(t, A.seg(t, 0, 0.2));
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
  A.text(F.moveList, 470, 670, 11, F.color, A.MONO, 'bold', 'left');
  A.post(t);
}
