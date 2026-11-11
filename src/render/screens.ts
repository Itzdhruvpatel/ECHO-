// Landing page, main menu and fighter select, drawn in the trailer style.
// `hot(x, y, w, h)` registers a clickable rect and returns true while the mouse is over it.

import * as A from './art.ts';
import { FIGHTERS, ROSTER } from '../core/data.ts';
import { touchMode } from '../input.ts';

export type Hot = (x: number, y: number, w: number, h: number, onClick: () => void) => boolean;
const { W, H } = A;

export const MENU = [
  { id: 'arcade', name: 'ARCADE TOWER', desc: 'Climb 99 floors. Your Echo waits at the top.' },
  { id: 'tutorial', name: 'TUTORIAL', desc: 'Learn every control, one move at a time.' },
  { id: 'versus', name: 'VERSUS', desc: 'Two players, one keyboard or two gamepads.' },
  { id: 'lab', name: 'ECHO LAB', desc: 'Watch your Echo train on your fights.' },
  { id: 'hunt', name: 'ECHO HUNT', desc: 'Fight other players\' Echoes.' },
  { id: 'practice', name: 'PRACTICE', desc: 'A dummy that never dies. Full meter.' },
  { id: 'settings', name: 'SETTINGS', desc: 'Graphics, sound, difficulty, fullscreen.' },
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

export interface LandingLinks { start: () => void; trailer: () => void; nav: (id: string) => void }

export function drawLanding(t: number, hot: Hot, L: LandingLinks) {
  drawLandingBody(t, hot, L.start);
  // nav bar, as in the trailer
  const x = A.x;
  x.fillStyle = 'rgba(4,6,10,.7)'; x.fillRect(0, 0, W, 64); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, 64, W, 1);
  A.glitchText('ECHO', 48, 33, 28, t, '#fff', '900', A.HEAVY, 0.15, 'left');
  ['FIGHTERS', 'STORY', 'ECHO LAB', 'MODES'].forEach((n, i) => {
    const on = hot(640 + i * 120 - 55, 14, 110, 38, () => L.nav(n));
    A.text(n, 640 + i * 120, 33, 14, on ? '#29f0ff' : '#c9d1d9', A.MONO, 'bold', 'center', 1, 3);
  });
  const on = hot(1120, 16, 120, 34, L.start);
  x.strokeStyle = '#ff2a44'; x.lineWidth = 2; x.fillStyle = on ? 'rgba(255,42,68,.3)' : 'rgba(0,0,0,0)';
  x.beginPath(); x.roundRect(1120, 16, 120, 34, 3); x.fill(); x.stroke();
  A.text('PLAY FREE', 1180, 33, 13, '#fff', A.MONO, 'bold', 'center', 1, 2);
  const tv = hot(515, 521, 250, 50, L.trailer);
  A.button(640, 546, 250, 50, 'WATCH TRAILER', false, tv, false, t);
}

function drawLandingBody(t: number, hot: Hot, start: () => void) {
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
  A.text('RUNS IN YOUR BROWSER  //  PC AND LAPTOP RECOMMENDED  //  PHONE READY', W / 2, 610, 12, '#8a949d', A.MONO, 'bold', 'center', a, 3);
  A.post(t, A.seg(t, 0, 0.35));
}

export const menuOn = (id: MenuId, _e: EchoInfo) => id !== 'hunt';

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
    if (Math.floor(t * 4) % 2 === 0) A.glitchText((touchMode ? 'TAP TO START' : 'PRESS START'), W / 2, H / 2, 64, t, '#fff', '900', A.HEAVY, 0.4);
    A.post(t, A.seg(t, 0, 0.2));
    return;
  }
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, 0, 560, H);
  A.text('MAIN MENU', 80, 110, 14, '#7d8590', A.MONO, 'bold', 'left', 1, 8);
  MENU.forEach((m, i) => {
    const y = 170 + i * 62, on = i === sel, en = menuOn(m.id, e);
    hot(60, y - 26, 440, 52, () => choose(i));
    if (on) {
      const g = x.createLinearGradient(60, 0, 500, 0); g.addColorStop(0, 'rgba(255,42,68,.55)'); g.addColorStop(1, 'rgba(255,42,68,0)');
      x.fillStyle = g; x.fillRect(60, y - 24, 440, 48); x.fillStyle = '#ff2a44'; x.fillRect(60, y - 24, 5, 48);
    }
    if (on) A.glitchText(m.name, 84, y, 32, t, en ? '#fff' : '#8a9199', '900', A.HEAVY, 0.2, 'left');
    else A.text(m.name, 84, y, 30, en ? '#5c636b' : '#2f3439', A.HEAVY, '900', 'left');
    if (!en) A.text('SOON', 480, y, 11, '#5c636b', A.MONO, 'bold', 'right', 1, 3);
  });
  const d = MENU[sel], en = menuOn(d.id, e);
  x.fillStyle = 'rgba(2,8,12,.75)'; x.fillRect(640, 440, 560, 170);
  x.strokeStyle = 'rgba(41,240,255,.5)'; x.lineWidth = 1; x.strokeRect(640, 440, 560, 170);
  A.text(d.name, 664, 474, 26, '#fff', A.HEAVY, '900', 'left');
  A.text(d.desc, 664, 512, 17, '#bfe9ff', A.COND, 'bold', 'left');
  const hint = en ? (touchMode ? 'TAP TO CHOOSE' : 'W / S  SELECT     ENTER  CONFIRM     F  FULLSCREEN') : 'NOT IN THIS BUILD YET';
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
  if (!touchMode) A.text('ESC  BACK', 80, 663, 13, '#7d8590', A.MONO, 'bold', 'left', 1, 4);
  A.post(t);
}

// Floor 99: the split screen face-off before the Echo fight, with the player's real habits.
export function drawSummit(t: number, id: string, lines: string[], note: string | null, hot: Hot, go: () => void) {
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
  if (note) A.text(note, W / 2, 690, 13, '#29f0ff', A.MONO, 'bold', 'center', 1, 4);
  else if (t > 3.6) A.text((touchMode ? 'TAP TO FIGHT' : 'PRESS ENTER'), W / 2, 690, 12, '#8a949d', A.MONO, 'bold', 'center', Math.floor(t * 2) % 2 ? 1 : 0.4, 4);
  A.post(t, A.seg(t, 0, 0.2));
}

// All eight fighters from the design, as in the trailer. Version 1 plays the first three.
export const CARDS = [
  { look: 'kaal', n: 'KAAL', w: 'URUMI WHIP SWORD', pw: 'REWIND', d: "KAAL'S LOOP", col: '#ff8a1f', weapon: 'urumi', ver: 1, bulk: 0 },
  { look: 'vanta', n: 'VANTA', w: 'TWIN KUKRIS', pw: 'SHADOW PHASE', d: 'FACELESS', col: '#a45cff', weapon: 'kukri', ver: 1, bulk: 0 },
  { look: 'rook', n: 'ROOK', w: 'HYDRAULIC HAMMER', pw: 'IRON WILL', d: 'FOUNDATION', col: '#ff4d2e', weapon: 'hammer', ver: 1, bulk: 1.35 },
  { look: 'ion', n: 'ION', w: 'ELECTRIC CHAIN SICKLE', pw: 'OVERCHARGE', d: 'FULL THROTTLE', col: '#ffe14d', weapon: 'sickle', ver: 2, bulk: 0 },
  { look: 'bhairav', n: 'BHAIRAV', w: 'FIRE TRIDENT', pw: 'THIRD EYE', d: 'BURN THE ARCHIVE', col: '#4d7cff', weapon: 'trident', ver: 2, bulk: 1.15 },
  { look: 'mirae', n: 'MIRAE', w: 'GLASS KATANA', pw: 'REFLECTION', d: 'GLASS COFFIN', col: '#bff6ff', weapon: 'katana', ver: 2, bulk: 0 },
  { look: 'sora', n: 'SORA', w: 'STEEL WAR FANS', pw: 'UPDRAFT', d: 'EYE OF THE STORM', col: '#5dff9a', weapon: 'fans', ver: 3, bulk: 0 },
  { look: 'glitch', n: 'GLITCH', w: 'STOLEN ARSENAL', pw: 'DESYNC', d: 'CTRL Z', col: '#ff2fa0', weapon: 'glitch', ver: 3, bulk: 0 },
];

export function drawSelect(t: number, sel: number, who: string, taken: number, hot: Hot, pick: (i: number) => void) {
  const x = A.x;
  x.fillStyle = '#05060a'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(41,240,255,.07)'; x.lineWidth = 1;
  for (let i = 0; i < 40; i++) { x.beginPath(); x.moveTo(i * 40 - (t * 20) % 40, 0); x.lineTo(i * 40 - (t * 20) % 40, H); x.stroke(); }
  for (let j = 0; j < 20; j++) { x.beginPath(); x.moveTo(0, j * 40); x.lineTo(W, j * 40); x.stroke(); }
  A.glitchText(who ? `${who}  //  CHOOSE YOUR FIGHTER` : 'CHOOSE YOUR FIGHTER', W / 2, 62, 46, t, '#fff', '900', A.HEAVY, 0.25);
  A.text('8 FIGHTERS  //  8 WEAPONS  //  8 DELETIONS', W / 2, 106, 17, '#29f0ff', A.MONO, 'bold', 'center', 1, 4);
  const cw = 142, gap = 9, x0 = (W - (cw * 8 + gap * 7)) / 2, cy = 140, ch = 400;
  CARDS.forEach((r, i) => {
    const appear = A.eOut(A.seg(t, i * 0.06, 0.4 + i * 0.06)), on = i === sel, cx = x0 + i * (cw + gap), locked = r.ver > 1;
    hot(cx, cy, cw, ch, () => pick(i));
    x.save(); x.globalAlpha = appear; x.translate(0, (1 - appear) * 40);
    const g = x.createLinearGradient(0, cy, 0, cy + ch); g.addColorStop(0, on ? r.col + '55' : '#11141c'); g.addColorStop(1, '#07080c');
    x.fillStyle = g; x.fillRect(cx, cy, cw, ch);
    x.save(); x.beginPath(); x.rect(cx, cy, cw, ch); x.clip();
    const pose = on && !locked ? A.mixPose(A.POSE.idle, A.POSE.raise, (Math.sin(t * 5) * 0.5 + 0.5) * 0.35) : A.POSE.idle;
    A.drawFighter({ x: cx + cw / 2 - 6, y: cy + ch - 92, f: 1, s: 0.95, p: pose, look: r.look, dim: !on || locked, weapon: r.weapon, wcol: r.col, bulk: r.bulk || undefined, whip: 0 }, t + i);
    x.restore();
    x.save(); x.strokeStyle = on ? r.col : 'rgba(255,255,255,.18)'; x.lineWidth = on ? 3 : 1; if (on) A.glow(r.col, 20); x.strokeRect(cx, cy, cw, ch); x.restore();
    if (taken === i) A.text('P1', cx + 14, cy + 18, 13, '#fff', A.MONO, 'bold', 'left', 1, 2);
    if (locked) { x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(cx, cy + 14, cw, 26); A.text(`LOCKED // V${r.ver}`, cx + cw / 2, cy + 27, 11, '#7d8590', A.MONO, 'bold', 'center', 1, 2); }
    x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(cx, cy + ch - 72, cw, 72);
    A.text(r.n, cx + cw / 2, cy + ch - 50, r.n.length > 6 ? 22 : 26, on ? '#fff' : '#9aa0aa', A.HEAVY, '900');
    A.text(r.w, cx + cw / 2, cy + ch - 22, 10.5, on ? r.col : '#6c717a', A.COND, 'bold');
    x.restore();
  });
  const r = CARDS[sel];
  x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(80, 572, W - 160, 112);
  x.strokeStyle = r.col; x.lineWidth = 2; x.strokeRect(80, 572, W - 160, 112);
  A.glitchText(r.n, 120, 620, 54, t, r.col, '900', A.HEAVY, 0.3, 'left');
  [['WEAPON', r.w], ['SUPER POWER', r.pw], ['DELETION', r.d]].forEach(([lab, v], j) => {
    const xx = 470 + j * 255;
    A.text(lab, xx, 600, 13, '#7d8590', A.MONO, 'bold', 'left', 1, 3);
    A.text(v, xx, 630, 19, '#fff', A.COND, 'bold', 'left');
  });
  const playable = ROSTER[sel];
  A.text(playable ? FIGHTERS[playable].moveList : `COMING IN VERSION ${r.ver}`, 470, 664, 11, playable ? r.col : '#7d8590', A.MONO, 'bold', 'left');
  A.text((touchMode ? 'TAP A FIGHTER' : 'A / D  BROWSE     ENTER  FIGHT     ESC  BACK'), W / 2, 706, 12, '#5c636b', A.MONO, 'bold', 'center', 1, 4);
  A.post(t);
}

// ---------- settings ----------
export interface Settings { graphics: string; sound: string; difficulty: string; fullscreen: string }
export const SETTING_ROWS = [
  { key: 'graphics', name: 'GRAPHICS', opts: ['HIGH', 'LOW'], help: 'LOW turns off glows, most rain and film grain.' },
  { key: 'sound', name: 'SOUND', opts: ['ON', 'OFF'], help: 'M also mutes during play.' },
  { key: 'difficulty', name: 'CPU DIFFICULTY', opts: ['EASY', 'NORMAL', 'HARD'], help: 'How fast the Spire CPUs react and block.' },
  { key: 'fullscreen', name: 'FULLSCREEN', opts: ['ON', 'OFF'], help: 'F toggles it anywhere.' },
  { key: 'reset', name: 'RESET ECHO DATA', opts: [], help: 'Deletes every recorded fight and the trained Echo.' },
] as const;

export function drawSettings(t: number, sel: number, s: Settings, confirmReset: boolean, hot: Hot, act: (row: number, dir: number) => void) {
  const x = A.x;
  x.fillStyle = '#04050a'; x.fillRect(0, 0, W, H);
  A.spire(1000, 760, 620, t, 0.5);
  A.glitchText('SETTINGS', 80, 80, 46, t, '#fff', '900', A.HEAVY, 0.25, 'left');
  SETTING_ROWS.forEach((row, i) => {
    const y = 190 + i * 80, on = i === sel;
    hot(60, y - 30, 760, 60, () => act(i, 1));
    if (on) { x.fillStyle = 'rgba(255,42,68,.25)'; x.fillRect(60, y - 30, 760, 60); x.fillStyle = '#ff2a44'; x.fillRect(60, y - 30, 5, 60); }
    A.text(row.name, 84, y - 4, 26, on ? '#fff' : '#8a9199', A.HEAVY, '900', 'left');
    A.text(row.help, 84, y + 20, 12, '#5c636b', A.MONO, 'bold', 'left', 1, 1);
    if (row.key === 'reset') A.text(confirmReset ? (touchMode ? 'TAP AGAIN TO DELETE' : 'PRESS ENTER AGAIN TO DELETE') : (touchMode ? 'TAP' : 'ENTER'), 800, y, 16, confirmReset ? '#ff2a44' : '#7d8590', A.MONO, 'bold', 'right', 1, 2);
    else A.text(`<  ${s[row.key]}  >`, 800, y, 20, on ? '#29f0ff' : '#5c636b', A.MONO, 'bold', 'right', 1, 2);
  });
  A.text((touchMode ? 'TAP A ROW TO CHANGE IT' : 'W / S  SELECT     A / D  CHANGE     ESC  BACK'), 80, 660, 13, '#7d8590', A.MONO, 'bold', 'left', 1, 4);
  A.post(t);
}


// Touch screens have no Escape key: a BACK button in the top right corner.
export function backButton(hot: Hot, fn: () => void) {
  const x = A.x, on = hot(W - 170, 16, 150, 46, fn);
  x.fillStyle = on ? 'rgba(255,42,68,.35)' : 'rgba(0,0,0,.6)'; x.strokeStyle = '#ff2a44'; x.lineWidth = 2;
  x.beginPath(); x.roundRect(W - 170, 16, 150, 46, 4); x.fill(); x.stroke();
  A.text('BACK', W - 95, 40, 16, '#fff', A.HEAVY, '900', 'center', 1, 3);
}
