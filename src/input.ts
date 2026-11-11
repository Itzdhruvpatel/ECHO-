// Every way to play: keyboard (two players), gamepads and an on-screen touch pad.
// Fight input is button bits per player; menu input is a stream of named presses.

import * as A from './render/art.ts';
import { B } from './core/sim.ts';

const KEYS_P1: Record<string, number> = {
  KeyW: B.UP, KeyS: B.DOWN, KeyA: B.LEFT, KeyD: B.RIGHT,
  KeyU: B.FP, KeyI: B.BP, KeyJ: B.FK, KeyK: B.BK,
  KeyL: B.BLOCK, Space: B.BLOCK, KeyO: B.SPECIAL, KeyP: B.POWER, Semicolon: B.OVERCLOCK,
};
// Player 2 on the same keyboard: arrows and the number pad.
const KEYS_P2: Record<string, number> = {
  ArrowUp: B.UP, ArrowDown: B.DOWN, ArrowLeft: B.LEFT, ArrowRight: B.RIGHT,
  Numpad7: B.FP, Numpad8: B.BP, Numpad4: B.FK, Numpad5: B.BK,
  Numpad0: B.BLOCK, Numpad9: B.SPECIAL, Numpad6: B.POWER, Numpad3: B.OVERCLOCK,
};
export const isGameKey = (code: string) => code in KEYS_P1 || code in KEYS_P2;

const held = new Set<string>();
const latched = [0, 0]; // pressed since the last tick, so a quick tap is never lost
export function keyDown(code: string) {
  held.add(code);
  latched[0] |= KEYS_P1[code] ?? 0;
  latched[1] |= KEYS_P2[code] ?? 0;
}
export const keyUp = (code: string) => held.delete(code);
export const clearKeys = () => held.clear();

// ---------- gamepads (standard mapping) ----------
const PAD_BITS: [number, number][] = [
  [0, B.FK], [1, B.BK], [2, B.FP], [3, B.BP], [4, B.POWER], [5, B.BLOCK], [6, B.OVERCLOCK], [7, B.SPECIAL],
  [12, B.UP], [13, B.DOWN], [14, B.LEFT], [15, B.RIGHT],
];
const PAD_NAV: [number, string][] = [[0, 'PadA'], [1, 'PadB'], [8, 'PadSelect'], [9, 'PadStart'], [12, 'ArrowUp'], [13, 'ArrowDown'], [14, 'ArrowLeft'], [15, 'ArrowRight']];
const padPrev: number[][] = [[], [], [], []];

function padBits(p: Gamepad): number {
  let b = 0;
  for (const [i, bit] of PAD_BITS) if (p.buttons[i]?.pressed) b |= bit;
  const [ax, ay] = p.axes;
  if (ax < -0.5) b |= B.LEFT; if (ax > 0.5) b |= B.RIGHT;
  if (ay < -0.5) b |= B.UP; if (ay > 0.5) b |= B.DOWN;
  return b;
}

// Menu presses from every connected pad since the last call.
export function padPresses(): string[] {
  const out: string[] = [];
  const pads = navigator.getGamepads?.() ?? [];
  for (const p of pads) {
    if (!p || p.index > 3) continue;
    const prev = padPrev[p.index], now = p.buttons.map(b => (b.pressed ? 1 : 0));
    const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
    now[12] ||= ay < -0.5 ? 1 : 0; now[13] ||= ay > 0.5 ? 1 : 0; now[14] ||= ax < -0.5 ? 1 : 0; now[15] ||= ax > 0.5 ? 1 : 0;
    for (const [i, name] of PAD_NAV) if (now[i] && !prev[i]) out.push(name);
    padPrev[p.index] = now;
  }
  return out;
}

// ---------- touch ----------
// true once the player touches the screen (or on a touch-only device), so prompts say TAP and show touch keys
export let touchMode = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

// The touch label for a keyboard key, for prompts and the tutorial.
const TOUCH_KEYS: Record<string, string> = { W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT', L: 'BLK', SPACE: 'BLK', O: 'SP', P: 'PWR', ';': 'OC', ENTER: 'TAP', 'U + J': 'THR' };
export function keyLabel(keys: string): string {
  if (!touchMode) return keys;
  if (TOUCH_KEYS[keys]) return TOUCH_KEYS[keys];
  return keys.split(/\s+/).filter(k => k && k !== 'OR').map(k => TOUCH_KEYS[k] ?? k).filter((k, i, a) => i === 0 || k !== a[i - 1]).join('  ');
}
// ---------- touch layout (saved per device) ----------
interface TouchButton { label: string; bit: number; x: number; y: number; r: number; col: string }
// default positions, sized for thumbs: the game is scaled down on a phone, so radii are generous
const BUTTONS: TouchButton[] = [
  { label: 'U', bit: B.FP, x: 965, y: 510, r: 50, col: '#ffffff' },
  { label: 'I', bit: B.BP, x: 1075, y: 455, r: 50, col: '#ffffff' },
  { label: 'J', bit: B.FK, x: 985, y: 630, r: 50, col: '#ffffff' },
  { label: 'K', bit: B.BK, x: 1095, y: 575, r: 50, col: '#ffffff' },
  { label: 'SP', bit: B.SPECIAL, x: 1195, y: 500, r: 50, col: '#ff8a1f' },
  { label: 'BLK', bit: B.BLOCK, x: 1205, y: 630, r: 52, col: '#29f0ff' },
  { label: 'THR', bit: B.FP | B.FK, x: 860, y: 625, r: 40, col: '#bfe9ff' },
  { label: 'PWR', bit: B.POWER, x: 1150, y: 360, r: 40, col: '#ffb15a' },
  { label: 'OC', bit: B.OVERCLOCK, x: 1240, y: 290, r: 36, col: '#ff2a44' },
];
const STICK_HOME: [number, number] = [190, 540];

export interface TouchLayout { sens: number; size: number; opacity: number; stick: [number, number]; pos: Record<string, [number, number]> }
const defaultLayout = (): TouchLayout => ({ sens: 7, size: 1, opacity: 6, stick: [...STICK_HOME], pos: Object.fromEntries(BUTTONS.map(b => [b.label, [b.x, b.y]])) });
function loadLayout(): TouchLayout {
  const d = defaultLayout();
  try { const s = JSON.parse(localStorage.getItem('echo-touch') ?? '{}'); return { ...d, ...s, pos: { ...d.pos, ...(s.pos ?? {}) } }; } catch { return d; }
}
export const layout = loadLayout();
export function saveLayout() { try { localStorage.setItem('echo-touch', JSON.stringify(layout)); } catch { /* private mode */ } }
export function resetLayout() { Object.assign(layout, defaultLayout()); saveLayout(); }

const btnPos = (b: TouchButton) => layout.pos[b.label] ?? [b.x, b.y];
const btnR = (b: TouchButton) => b.r * layout.size;
function buttonAt(x: number, y: number): TouchButton | null {
  let best: TouchButton | null = null, bd = Infinity;
  for (const b of BUTTONS) { const [bx, by] = btnPos(b), d = Math.hypot(x - bx, y - by); if (d < btnR(b) * 1.3 && d < bd) { best = b; bd = d; } }
  return best;
}

// ---------- floating joystick ----------
// The stick appears where the thumb lands on the left side and follows it, so reversing is instant.
const STICK_ZONE = 600, STICK_R = 80;
const touches = new Map<number, { x: number; y: number }>();
let stickId: number | null = null;
const origin = { x: 0, y: 0 };
// sensitivity 1..10 sets the dead zone: 10 reacts to a few pixels, 1 needs a long push
const deadZone = () => 34 - (layout.sens - 1) * 3.3;

export function touchStart(id: number, x: number, y: number) {
  touchMode = true;
  touches.set(id, { x, y });
  if (stickId === null && x < STICK_ZONE && !buttonAt(x, y)) { stickId = id; origin.x = x; origin.y = y; }
}
export function touchMove(id: number, x: number, y: number) {
  if (!touches.has(id)) return;
  touches.set(id, { x, y });
  if (id === stickId) {
    const dx = x - origin.x, dy = y - origin.y, d = Math.hypot(dx, dy);
    if (d > STICK_R) { origin.x = x - (dx / d) * STICK_R; origin.y = y - (dy / d) * STICK_R; }
  }
}
export function touchEnd(id: number) { touches.delete(id); if (id === stickId) stickId = null; }

function stickBits(): number {
  const t = stickId === null ? null : touches.get(stickId);
  if (!t) return 0;
  const dx = t.x - origin.x, dy = t.y - origin.y;
  if (Math.hypot(dx, dy) < deadZone()) return 0;
  const a = Math.atan2(dy, dx); // 8 way
  let b = 0;
  if (Math.cos(a) > 0.38) b |= B.RIGHT;
  if (Math.cos(a) < -0.38) b |= B.LEFT;
  if (Math.sin(a) > 0.38) b |= B.DOWN;
  if (Math.sin(a) < -0.38) b |= B.UP;
  return b;
}

function touchBits(): number {
  let b = stickBits();
  for (const [id, { x, y }] of touches) if (id !== stickId) b |= buttonAt(x, y)?.bit ?? 0;
  return b;
}

const DIRS = B.UP | B.DOWN | B.LEFT | B.RIGHT;

function drawPad(active: number, alpha: number, editing: string | null) {
  const x = A.x;
  x.save();
  // stick: base where the thumb landed (or its home spot), knob toward the thumb
  const t = stickId === null ? null : touches.get(stickId);
  const [hx, hy] = t ? [origin.x, origin.y] : layout.stick;
  let kx = hx, ky = hy;
  if (t) { const dx = t.x - origin.x, dy = t.y - origin.y, d = Math.hypot(dx, dy) || 1, k = Math.min(d, STICK_R) / d; kx = hx + dx * k; ky = hy + dy * k; }
  x.globalAlpha = alpha;
  x.strokeStyle = editing === 'stick' ? '#ffb15a' : '#ffffff'; x.lineWidth = 3;
  x.fillStyle = 'rgba(255,255,255,.08)';
  x.beginPath(); x.arc(hx, hy, STICK_R + 30, 0, 7); x.fill(); x.stroke();
  x.fillStyle = active & DIRS ? '#29f0ff' : 'rgba(255,255,255,.55)';
  x.beginPath(); x.arc(kx, ky, 42, 0, 7); x.fill();
  // stick bits never include attack buttons, so test the button bits without the stick
  const pressed = touchBits() & ~DIRS;
  for (const b of BUTTONS) {
    const [bx, by] = btnPos(b), r = btnR(b), on = (pressed & b.bit) === b.bit;
    x.fillStyle = on ? b.col : 'rgba(0,0,0,.45)'; x.strokeStyle = editing === b.label ? '#ffb15a' : b.col; x.lineWidth = editing === b.label ? 5 : 3;
    x.beginPath(); x.arc(bx, by, r, 0, 7); x.fill(); x.stroke();
    A.text(b.label, bx, by, (b.label.length > 1 ? 13 : 20) * layout.size, on ? '#000' : b.col, A.HEAVY, '900');
  }
  x.restore();
}

export function drawTouchPad() {
  if (touchMode) drawPad(touchBits(), 0.15 + layout.opacity * 0.08, null);
}

// ---------- layout editor ----------
let dragging: string | null = null;
const dragOff = [0, 0];
// true when the press grabbed a button or the stick home, so it moves instead of playing
export function editorDown(id: number, x: number, y: number): boolean {
  const b = buttonAt(x, y);
  if (b) { const [bx, by] = btnPos(b); dragging = b.label; dragOff[0] = bx - x; dragOff[1] = by - y; return true; }
  if (Math.hypot(x - layout.stick[0], y - layout.stick[1]) < STICK_R + 30) {
    dragging = 'stick'; dragOff[0] = layout.stick[0] - x; dragOff[1] = layout.stick[1] - y; return true;
  }
  touchStart(id, x, y); // anywhere else: try the stick out
  return false;
}
export function editorMove(id: number, x: number, y: number) {
  if (!dragging) { touchMove(id, x, y); return; }
  const nx = Math.min(1250, Math.max(30, x + dragOff[0])), ny = Math.min(700, Math.max(240, y + dragOff[1]));
  if (dragging === 'stick') layout.stick = [nx, ny]; else layout.pos[dragging] = [nx, ny];
}
export function editorUp(id: number) { if (dragging) { dragging = null; saveLayout(); } touchEnd(id); }

const DIR_NAMES: [number, string][] = [[B.UP, 'UP'], [B.DOWN, 'DOWN'], [B.LEFT, 'LEFT'], [B.RIGHT, 'RIGHT']];
type Hotspot = (x: number, y: number, w: number, h: number, fn: () => void) => boolean;

export function drawEditor(t: number, hot: Hotspot, done: () => void) {
  const x = A.x, W = A.W;
  x.fillStyle = '#05060a'; x.fillRect(0, 0, W, A.H);
  x.strokeStyle = 'rgba(41,240,255,.07)'; x.lineWidth = 1;
  for (let i = 0; i < 33; i++) { x.beginPath(); x.moveTo(i * 40, 0); x.lineTo(i * 40, A.H); x.stroke(); }
  A.glitchText('TOUCH CONTROLS', 40, 36, 30, t, '#fff', '900', A.HEAVY, 0.2, 'left');
  A.text('DRAG ANY BUTTON OR THE STICK TO MOVE IT.  TOUCH THE EMPTY LEFT SIDE TO TEST THE STICK.', 42, 70, 11, '#7d8590', A.MONO, 'bold', 'left', 1, 2);
  // value rows: label, shown value, change by a step
  const rows: [string, number, (d: number) => void][] = [
    ['STICK SENSITIVITY', layout.sens, d => { layout.sens = Math.min(10, Math.max(1, layout.sens + d)); }],
    ['BUTTON SIZE', Math.round(layout.size * 10), d => { layout.size = Math.min(1.5, Math.max(0.6, Math.round((layout.size + d * 0.1) * 10) / 10)); }],
    ['VISIBILITY', layout.opacity, d => { layout.opacity = Math.min(10, Math.max(1, layout.opacity + d)); }],
  ];
  rows.forEach(([name, v, change], i) => {
    const bx = 40 + i * 290, y = 108;
    A.text(name, bx, y, 12, '#bfe9ff', A.MONO, 'bold', 'left', 1, 2);
    const minus = hot(bx, y + 14, 56, 46, () => { change(-1); saveLayout(); });
    const plus = hot(bx + 180, y + 14, 56, 46, () => { change(1); saveLayout(); });
    for (const [px, on, s] of [[bx, minus, '-'], [bx + 180, plus, '+']] as [number, boolean, string][]) {
      x.fillStyle = on ? 'rgba(41,240,255,.35)' : 'rgba(0,0,0,.6)'; x.strokeStyle = '#29f0ff'; x.lineWidth = 2;
      x.fillRect(px, y + 14, 56, 46); x.strokeRect(px, y + 14, 56, 46);
      A.text(s, px + 28, y + 38, 26, '#fff', A.HEAVY, '900');
    }
    A.text(String(v), bx + 118, y + 38, 26, '#29f0ff', A.HEAVY, '900');
  });
  const reset = hot(930, 112, 140, 50, resetLayout), fin = hot(1090, 112, 150, 50, () => { saveLayout(); done(); });
  for (const [bx, w, label, on, col] of [[930, 140, 'RESET', reset, '#ff2a44'], [1090, 150, 'DONE', fin, '#3dff8a']] as [number, number, string, boolean, string][]) {
    x.fillStyle = on ? col + '55' : 'rgba(0,0,0,.6)'; x.strokeStyle = col; x.lineWidth = 2;
    x.beginPath(); x.roundRect(bx, 112, w, 50, 4); x.fill(); x.stroke();
    A.text(label, bx + w / 2, 138, 18, '#fff', A.HEAVY, '900');
  }
  const active = touchBits();
  const dirs = DIR_NAMES.filter(([b]) => active & b).map(([, n]) => n).join(' + ') || 'CENTER';
  A.text(`STICK: ${dirs}`, 42, 205, 14, active & DIRS ? '#29f0ff' : '#5c636b', A.MONO, 'bold', 'left', 1, 3);
  drawPad(active, 0.15 + layout.opacity * 0.08, dragging);
}

// Fight bits for player i this tick: keyboard, its gamepad and, for player 1, the touch pad.
export function bitsFor(i: number): number {
  let b = latched[i];
  latched[i] = 0;
  const map = i === 0 ? KEYS_P1 : KEYS_P2;
  for (const k of held) b |= map[k] ?? 0;
  const pad = navigator.getGamepads?.()[i];
  if (pad) b |= padBits(pad);
  if (i === 0) b |= touchBits();
  return b;
}
