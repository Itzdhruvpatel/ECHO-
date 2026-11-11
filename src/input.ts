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
const touches = new Map<number, { x: number; y: number }>();
// sized for thumbs: the game is scaled down on a phone, so radii here are generous
const DPAD = { x: 175, y: 545, r: 135 };
interface TouchButton { label: string; bit: number; x: number; y: number; r: number; col: string }
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

export function touchStart(id: number, x: number, y: number) { touchMode = true; touches.set(id, { x, y }); }
export function touchMove(id: number, x: number, y: number) { if (touches.has(id)) touches.set(id, { x, y }); }
export const touchEnd = (id: number) => touches.delete(id);

function touchBits(): number {
  let b = 0;
  for (const { x, y } of touches.values()) {
    const dx = x - DPAD.x, dy = y - DPAD.y, d = Math.hypot(dx, dy);
    if (d < DPAD.r * 1.6 && x < 640) {
      if (d > 22) {
        const a = Math.atan2(dy, dx); // 8 way
        if (Math.cos(a) > 0.38) b |= B.RIGHT; if (Math.cos(a) < -0.38) b |= B.LEFT;
        if (Math.sin(a) > 0.38) b |= B.DOWN; if (Math.sin(a) < -0.38) b |= B.UP;
      }
      continue;
    }
    // nearest button only, so a thumb between two buttons does not press both
    let best: TouchButton | null = null, bd = Infinity;
    for (const btn of BUTTONS) { const d = Math.hypot(x - btn.x, y - btn.y); if (d < btn.r * 1.3 && d < bd) { best = btn; bd = d; } }
    if (best) b |= best.bit;
  }
  return b;
}

export function drawTouchPad() {
  if (!touchMode) return;
  const x = A.x, active = touchBits();
  x.save();
  x.globalAlpha = 0.5;
  x.strokeStyle = '#ffffff'; x.lineWidth = 2;
  x.beginPath(); x.arc(DPAD.x, DPAD.y, DPAD.r, 0, 7); x.stroke();
  const dirs: [number, number, number][] = [[B.UP, 0, -1], [B.DOWN, 0, 1], [B.LEFT, -1, 0], [B.RIGHT, 1, 0]];
  for (const [bit, ux, uy] of dirs) {
    x.fillStyle = active & bit ? '#29f0ff' : 'rgba(255,255,255,.35)';
    x.beginPath(); x.arc(DPAD.x + ux * 72, DPAD.y + uy * 72, 26, 0, 7); x.fill();
  }
  for (const btn of BUTTONS) {
    const on = (active & btn.bit) === btn.bit;
    x.fillStyle = on ? btn.col : 'rgba(0,0,0,.45)'; x.strokeStyle = btn.col;
    x.beginPath(); x.arc(btn.x, btn.y, btn.r, 0, 7); x.fill(); x.stroke();
    A.text(btn.label, btn.x, btn.y, btn.label.length > 1 ? 13 : 20, on ? '#000' : btn.col, A.HEAVY, '900');
  }
  x.restore();
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
