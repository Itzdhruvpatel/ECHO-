// Screens, keyboard input and the fixed 60 tick loop.

import * as A from './render/art.ts';
import { drawFight, fxEvents, resetFx } from './render/fight.ts';
import { drawLab, drawLanding, drawMenu, drawSelect, drawSummit, MENU, menuOn, type EchoInfo, type Hot } from './render/screens.ts';
import { B, createSim, step, type Sim, type SimEvent } from './core/sim.ts';
import { play, toggleMute, unlockAudio } from './audio.ts';
import { cpuInput, makeCpu, type Cpu } from './core/ai.ts';
import { ROSTER, type FighterId } from './core/data.ts';
import { Recorder } from './echo/recorder.ts';
import { EchoBrain, MIN_MATCHES, record, refresh, status } from './echo/echo.ts';
import { habits, type Habits } from './echo/habits.ts';
import type { MatchRecord } from './echo/store.ts';

const canvas = document.getElementById('c') as HTMLCanvasElement;
A.setCtx(canvas.getContext('2d')!);

const KEYS: Record<string, number> = {
  KeyW: B.UP, KeyS: B.DOWN, KeyA: B.LEFT, KeyD: B.RIGHT,
  KeyU: B.FP, KeyI: B.BP, KeyJ: B.FK, KeyK: B.BK,
  KeyL: B.BLOCK, Space: B.BLOCK, KeyO: B.SPECIAL, KeyP: B.POWER, Semicolon: B.OVERCLOCK,
};
const held = new Set<string>();
let latched = 0; // keys pressed since the last tick, so a quick tap is never lost

type Screen = 'landing' | 'menu' | 'select' | 'summit' | 'lab' | 'fight';
let screen: Screen = 'landing', screenT0 = 0, now = 0;
let menuSel = 0, selIdx = 0, debug = false, pressStart = false;
let mode: 'arcade' | 'echo' = 'arcade';
let sim: Sim | null = null, cpu: Cpu | null = null, brain: EchoBrain | null = null, rec: Recorder | null = null;
let player: FighterId = 'kaal', acc = 0, saved = false;

// ---------- the Echo's data ----------
let hab: Habits | null = null;
const useMatches = (ms: MatchRecord[] | null) => { if (ms) hab = habits(ms); };
refresh().then(useMatches).catch(() => { /* IndexedDB blocked: the game still plays, the Echo just never wakes */ });

function echoInfo(): EchoInfo {
  return {
    matches: status.matches, samples: status.samples, need: Math.max(0, MIN_MATCHES - status.matches),
    training: status.training, progress: status.progress, ready: status.ready,
    acc: status.info?.valAcc ?? 0, loss: status.info?.loss ?? [],
    lines: hab?.lines ?? [], dist: hab?.dist ?? [],
  };
}

function go(s: Screen) { screen = s; screenT0 = now; }

function startFight() {
  const opp = mode === 'echo' ? player : ROSTER[Math.floor(Math.random() * ROSTER.length)];
  const seed = (Math.random() * 2 ** 32) >>> 0;
  sim = createSim(player, opp);
  cpu = makeCpu(seed);
  brain = mode === 'echo' ? new EchoBrain(seed) : null;
  rec = new Recorder();
  saved = false;
  acc = 0;
  resetFx();
  go('fight');
}

function saveFight(s: Sim) {
  if (saved || !rec) return;
  saved = true;
  record({ fighter: s.f[0].id, opponent: s.f[1].id, at: Date.now(), won: s.wins[0] > s.wins[1], x: rec.x, y: rec.y })
    .then(useMatches).catch(() => {});
}

const chooseMenu = (i: number) => {
  if (i < 0) { pressStart = true; return; }
  menuSel = i;
  const id = MENU[i].id;
  if (!menuOn(id, echoInfo())) return;
  if (id === 'lab') go('lab');
  else { mode = id === 'echo' ? 'echo' : 'arcade'; go('select'); }
};
const pickFighter = (i: number) => {
  selIdx = i;
  player = ROSTER[i];
  if (mode === 'echo') go('summit'); else startFight();
};
const labFight = () => { mode = 'echo'; go('select'); };

addEventListener('keydown', e => {
  if (e.code in KEYS || e.code.startsWith('Arrow')) e.preventDefault();
  if (!e.repeat) { held.add(e.code); latched |= KEYS[e.code] ?? 0; }
  if (e.repeat) return;
  unlockAudio();
  if (e.code === 'KeyM') toggleMute();
  const up = e.code === 'KeyW' || e.code === 'ArrowUp', down = e.code === 'KeyS' || e.code === 'ArrowDown';
  const left = e.code === 'KeyA' || e.code === 'ArrowLeft', right = e.code === 'KeyD' || e.code === 'ArrowRight';
  const ok = e.code === 'Enter' || e.code === 'KeyU', back = e.code === 'Escape';
  if (screen !== 'fight' && (up || down || left || right || ok || back)) play('ui');
  if (screen === 'landing') { if (ok || e.code === 'Space') go('menu'); }
  else if (screen === 'menu') {
    if (!pressStart) { pressStart = true; return; }
    if (up) menuSel = (menuSel + MENU.length - 1) % MENU.length;
    if (down) menuSel = (menuSel + 1) % MENU.length;
    if (ok) chooseMenu(menuSel);
    if (back) go('landing');
  } else if (screen === 'select') {
    if (left) selIdx = (selIdx + ROSTER.length - 1) % ROSTER.length;
    if (right) selIdx = (selIdx + 1) % ROSTER.length;
    if (ok) pickFighter(selIdx);
    if (back) go('menu');
  } else if (screen === 'summit') {
    if (ok || e.code === 'Space') startFight();
    if (back) go('select');
  } else if (screen === 'lab') {
    if (ok && status.ready) labFight();
    if (back) go('menu');
  } else if (screen === 'fight') {
    if (back) go(mode === 'echo' ? 'menu' : 'select');
    if (e.code === 'KeyH') debug = !debug;
    if (e.code === 'Enter' && sim?.phase === 'over') startFight();
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
  unlockAudio();
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

function sounds(s: Sim, ev: SimEvent[], prevPhase: string) {
  for (const e of ev) {
    if (e.type === 'hit') play(e.pow >= 1.4 ? 'heavy' : 'hit', e.pow);
    else play(e.type);
  }
  for (const f of s.f) if (f.state === 'attack' && f.frame === 0) play('whoosh', f.move === 'fp' || f.move === 'fk' ? 0.7 : 1);
  if (s.phase === 'deletion' && prevPhase !== 'deletion') play('deletion');
}

function fightTick(s: Sim) {
  const p1 = heldBits() | latched;
  latched = 0;
  rec!.tick(s, p1);
  const p2 = brain ? brain.input(s, 1) : cpuInput(s, 1, cpu!);
  const phase = s.phase;
  const ev = step(s, [p1, p2]);
  fxEvents(ev, s, now);
  sounds(s, ev, phase);
  if (s.phase === 'over') saveFight(s);
}

let last = 0;
function frame(ms: number) {
  now = ms / 1000;
  const dt = Math.min(0.1, now - last);
  last = now;
  const t = now - screenT0;
  hots = [];
  if (screen === 'landing') drawLanding(t, hot, () => go('menu'));
  else if (screen === 'menu') drawMenu(t, menuSel, pressStart, echoInfo(), hot, chooseMenu);
  else if (screen === 'select') drawSelect(t, selIdx, hot, pickFighter);
  else if (screen === 'lab') drawLab(t, echoInfo(), hot, labFight);
  else if (screen === 'summit') drawSummit(t, player, hab?.lines ?? [], hot, startFight);
  else if (sim) {
    acc += dt;
    while (acc >= 1 / 60) { acc -= 1 / 60; fightTick(sim); }
    drawFight(sim, now, {
      debug, rec: true,
      echoSide: brain ? 1 : undefined,
      panel: brain ? { top: brain.top(5), acc: status.info?.valAcc ?? 0, loss: status.info?.loss ?? [] } : undefined,
      callout: brain ? hab?.callout : undefined,
    });
  }
  canvas.style.cursor = hots.some(r => mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) ? 'pointer' : 'default';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
