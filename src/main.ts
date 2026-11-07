// Screens, keyboard input and the fixed 60 tick loop.

import * as A from './render/art.ts';
import { drawFight, fxEvents, resetFx } from './render/fight.ts';
import { drawLanding, drawMenu, drawSelect, MENU, type Hot } from './render/screens.ts';
import { B, createSim, step, type Sim } from './core/sim.ts';
import { cpuInput, makeCpu, type Cpu } from './core/ai.ts';
import { ROSTER, type FighterId } from './core/data.ts';

const canvas = document.getElementById('c') as HTMLCanvasElement;
A.setCtx(canvas.getContext('2d')!);

const KEYS: Record<string, number> = {
  KeyW: B.UP, KeyS: B.DOWN, KeyA: B.LEFT, KeyD: B.RIGHT,
  KeyU: B.FP, KeyI: B.BP, KeyJ: B.FK, KeyK: B.BK,
  KeyL: B.BLOCK, Space: B.BLOCK, KeyO: B.SPECIAL,
};
const held = new Set<string>();
let latched = 0; // keys pressed since the last tick, so a quick tap is never lost

type Screen = 'landing' | 'menu' | 'select' | 'fight';
let screen: Screen = 'landing', screenT0 = 0, now = 0;
let menuSel = 0, selIdx = 0;
let sim: Sim | null = null, cpu: Cpu | null = null, player: FighterId = 'kaal', acc = 0;

function go(s: Screen) { screen = s; screenT0 = now; }

function startFight(p: FighterId) {
  player = p;
  const opp = ROSTER[Math.floor(Math.random() * ROSTER.length)];
  sim = createSim(p, opp);
  cpu = makeCpu((Math.random() * 2 ** 32) >>> 0);
  acc = 0;
  resetFx();
  go('fight');
}

const chooseMenu = (i: number) => { menuSel = i; if (MENU[i].on) go('select'); };
const pickFighter = (i: number) => { selIdx = i; startFight(ROSTER[i]); };

addEventListener('keydown', e => {
  if (e.code in KEYS || e.code.startsWith('Arrow')) e.preventDefault();
  if (!e.repeat) { held.add(e.code); latched |= KEYS[e.code] ?? 0; }
  if (e.repeat) return;
  const up = e.code === 'KeyW' || e.code === 'ArrowUp', down = e.code === 'KeyS' || e.code === 'ArrowDown';
  const left = e.code === 'KeyA' || e.code === 'ArrowLeft', right = e.code === 'KeyD' || e.code === 'ArrowRight';
  const ok = e.code === 'Enter' || e.code === 'KeyU', back = e.code === 'Escape';
  if (screen === 'landing') { if (ok || e.code === 'Space') go('menu'); }
  else if (screen === 'menu') {
    if (up) menuSel = (menuSel + MENU.length - 1) % MENU.length;
    if (down) menuSel = (menuSel + 1) % MENU.length;
    if (ok) chooseMenu(menuSel);
    if (back) go('landing');
  } else if (screen === 'select') {
    if (left) selIdx = (selIdx + ROSTER.length - 1) % ROSTER.length;
    if (right) selIdx = (selIdx + 1) % ROSTER.length;
    if (ok) pickFighter(selIdx);
    if (back) go('menu');
  } else if (screen === 'fight') {
    if (back) go('select');
    if (e.code === 'Enter' && sim?.phase === 'over') startFight(player);
  }
});
addEventListener('keyup', e => held.delete(e.code));
addEventListener('blur', () => held.clear());

// Mouse and tap: screens register hot rects each frame.
let mouse = { x: -1, y: -1 }, hots: { x: number; y: number; w: number; h: number; fn: () => void }[] = [];
const toCanvas = (e: PointerEvent) => {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (A.W / r.width), y: (e.clientY - r.top) * (A.H / r.height) };
};
canvas.addEventListener('pointermove', e => { mouse = toCanvas(e); });
canvas.addEventListener('pointerdown', e => {
  const p = toCanvas(e);
  const h = hots.find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  h?.fn();
});
const hot: Hot = (x, y, w, h, fn) => {
  hots.push({ x, y, w, h, fn });
  return mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
};

function heldBits() {
  let b = 0;
  for (const k of held) b |= KEYS[k] ?? 0;
  return b;
}

let last = 0;
function frame(ms: number) {
  now = ms / 1000;
  const dt = Math.min(0.1, now - last);
  last = now;
  const t = now - screenT0;
  hots = [];
  if (screen === 'landing') drawLanding(t, hot, () => go('menu'));
  else if (screen === 'menu') drawMenu(t, menuSel, hot, chooseMenu);
  else if (screen === 'select') drawSelect(t, selIdx, hot, pickFighter);
  else if (sim && cpu) {
    acc += dt;
    while (acc >= 1 / 60) {
      acc -= 1 / 60;
      const ev = step(sim, [heldBits() | latched, cpuInput(sim, 1, cpu)]);
      latched = 0;
      fxEvents(ev, sim, now);
    }
    drawFight(sim, now);
  }
  canvas.style.cursor = hots.some(r => mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) ? 'pointer' : 'default';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
