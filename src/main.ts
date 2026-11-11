// Screens, input, game modes, the Spire run and the fixed 60 tick loop.

import * as A from './render/art.ts';
import { drawFight, fxEvents, resetFx, timeScale } from './render/fight.ts';
import {
  backButton, drawLab, drawPause, PAUSE_ITEMS, drawLanding, drawMenu, drawSelect, drawSettings, drawSummit, CARDS, MENU, SETTING_ROWS, menuOn,
  type EchoInfo, type Hot, type Settings,
} from './render/screens.ts';
import * as story from './render/story.ts';
import { createSim, step, type Sim, type SimEvent } from './core/sim.ts';
import { play, say, setMuted, toggleMute, unlockAudio } from './audio.ts';
import { cpuInput, makeCpu, type Cpu } from './core/ai.ts';
import { ROSTER, STARTERS, type FighterId } from './core/data.ts';
import { Recorder } from './echo/recorder.ts';
import { EchoBrain, MIN_MATCHES, record, refresh, resetEcho, status } from './echo/echo.ts';
import { habits, type Habits } from './echo/habits.ts';
import { Taunter } from './echo/taunts.ts';
import type { MatchRecord } from './echo/store.ts';
import * as input from './input.ts';
import { Trainer, drawTrainer, type DummyMode } from './tutorial.ts';

const canvas = document.getElementById('c') as HTMLCanvasElement;
A.setCtx(canvas.getContext('2d')!);

// ---------- settings ----------
function load<T>(key: string, fallback: T): T {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? '{}') }; } catch { return fallback; }
}
// phones start on LOW graphics so the fight holds 60 fps
const settings: Settings = load('echo-settings', { graphics: input.touchMode ? 'LOW' : 'HIGH', sound: 'ON', difficulty: 'NORMAL', fullscreen: 'ON' });
let tutorialDone = (() => { try { return localStorage.getItem('echo-tutorial') === 'done'; } catch { return false; } })();
function applySettings() {
  A.setLow(settings.graphics === 'LOW');
  setMuted(settings.sound === 'OFF');
  try { localStorage.setItem('echo-settings', JSON.stringify(settings)); } catch { /* private mode */ }
}
applySettings();

// ---------- fullscreen ----------
function enterFullscreen() {
  if (settings.fullscreen !== 'ON' || document.fullscreenElement) return;
  document.documentElement.requestFullscreen?.().then(() => {
    (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {});
  }).catch(() => {});
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else { settings.fullscreen = 'ON'; enterFullscreen(); }
}

// ---------- trailer ----------
const trailerBox = document.getElementById('trailer') as HTMLDivElement;
const trailer = trailerBox.querySelector('video') as HTMLVideoElement;
function showTrailer() { trailerBox.style.display = 'block'; trailer.currentTime = 0; trailer.play().catch(() => {}); }
function hideTrailer() { trailer.pause(); trailerBox.style.display = 'none'; }
trailer.addEventListener('ended', hideTrailer);
trailerBox.addEventListener('click', e => { if (e.target === trailerBox) hideTrailer(); });
const trailerOpen = () => trailerBox.style.display === 'block';

// ---------- state ----------
type Screen = 'landing' | 'menu' | 'select' | 'summit' | 'lab' | 'fight' | 'train' | 'settings'
  | 'controls' | 'opening' | 'card' | 'twist' | 'archive' | 'choice' | 'ending' | 'fallen';
let screenNow: Screen = 'landing', screenT0 = 0, now = 0;
let menuSel = 0, selIdx = 0, setSel = 0, confirmReset = false, debug = false, pressStart = false, choice = 0;
let paused = false, pauseSel = 0;
let mode: 'tower' | 'echo' | 'versus' = 'tower';
let selFor: 'p1' | 'p2' | 'train' | 'practice' = 'p1';
let taunter: Taunter | null = null;
let sim: Sim | null = null, cpu: Cpu | null = null, brain: EchoBrain | null = null, rec: Recorder | null = null, trainer: Trainer | null = null;
let player: FighterId = 'kaal', player2: FighterId = 'rook', acc = 0, saved = false, towerAfterTutorial = false;

function go(s: Screen) { screenNow = s; screenT0 = now; confirmReset = false; paused = false; }

function autoPause() { if ((screenNow === 'fight' && sim?.phase !== 'over') || screenNow === 'train') { paused = true; pauseSel = 0; } }
function choosePause(i: number) {
  pauseSel = i;
  paused = false;
  if (i === 1) { if (screenNow === 'train' && trainer) startTrainer(trainer.lessonsOn); else startFight(); }
  if (i === 2) go('menu');
}

// ---------- the Spire ----------
interface Floor { fl: number; opp?: FighterId; delay: number; skill: number; temple?: boolean; twist?: boolean; echo?: boolean }
let tower: Floor[] = [], floorIdx = 0;

function buildTower(me: FighterId): Floor[] {
  const others = ROSTER.filter(r => r !== me).sort(() => Math.random() - 0.5);
  const m = { EASY: 1.4, NORMAL: 1, HARD: 0.7 }[settings.difficulty] ?? 1;
  const k = { EASY: -0.15, NORMAL: 0, HARD: 0.15 }[settings.difficulty] ?? 0;
  const f = (fl: number, opp: FighterId | undefined, delay: number, skill: number, extra: Partial<Floor> = {}): Floor =>
    ({ fl, opp, delay: Math.round(delay * m), skill: Math.min(1, Math.max(0, skill + k)), ...extra });
  return [f(12, others[0], 22, 0.2), f(37, others[1], 17, 0.4), f(61, me, 13, 0.6, { temple: true, twist: true }), f(88, others[0], 10, 0.85), f(99, undefined, 12, 0.7, { echo: true })];
}
const floor = () => tower[floorIdx];
function enterFloor() { const f = floor(); go(f.twist ? 'twist' : f.echo ? 'summit' : 'card'); }
function startTower() { tower = buildTower(player); floorIdx = 0; go('opening'); }

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

// ---------- fights ----------
function startFight() {
  const f = mode === 'tower' ? floor() : null;
  const echo = mode === 'echo' || !!f?.echo;
  const opp = mode === 'versus' ? player2 : echo ? player : f!.opp!;
  const seed = (Math.random() * 2 ** 32) >>> 0;
  sim = createSim(player, opp);
  cpu = makeCpu(seed, f?.delay ?? 15, f?.skill ?? 0.5);
  brain = echo ? new EchoBrain(seed) : null;
  taunter = echo ? new Taunter(hab) : null;
  rec = mode === 'versus' ? null : new Recorder();
  saved = false;
  acc = 0;
  resetFx();
  go('fight');
}

function startTrainer(lessons: boolean) {
  const opp = ROSTER[(ROSTER.indexOf(player) + 1) % ROSTER.length];
  trainer = new Trainer(player, opp, lessons);
  acc = 0;
  resetFx();
  go('train');
}

function finishTutorial() {
  tutorialDone = true;
  try { localStorage.setItem('echo-tutorial', 'done'); } catch { /* private mode */ }
  if (towerAfterTutorial) { towerAfterTutorial = false; startTower(); } else go('menu');
}

function saveFight(s: Sim) {
  if (saved || !rec) return;
  saved = true;
  record({ fighter: s.f[0].id, opponent: s.f[1].id, at: Date.now(), won: s.wins[0] > s.wins[1], x: rec.x, y: rec.y })
    .then(useMatches).catch(() => {});
}

function afterFight() {
  const won = sim!.wins[0] > sim!.wins[1];
  if (mode !== 'tower') { startFight(); return; }
  if (!won) { go('fallen'); return; }
  if (floor().echo) { go('archive'); return; }
  floorIdx++;
  enterFloor();
}

function summitNote(): string | null {
  return status.training ? `YOUR ECHO IS STILL LEARNING YOU  ${Math.round(status.progress * 100)}%` : null;
}
function leaveSummit() { if (!status.training) startFight(); }

// ---------- menus ----------
const chooseMenu = (i: number) => {
  if (i < 0) { pressStart = true; return; }
  menuSel = i;
  const id = MENU[i].id;
  if (!menuOn(id, echoInfo())) return;
  if (id === 'lab') go('lab');
  else if (id === 'settings') { setSel = 0; go('settings'); }
  else {
    mode = id === 'versus' ? 'versus' : 'tower';
    selFor = id === 'versus' ? 'p1' : id === 'tutorial' ? 'train' : id === 'practice' ? 'practice' : 'p1';
    go('select');
  }
};

const pickFighter = (i: number) => {
  selIdx = i;
  if (i >= STARTERS) { play('block'); return; } // locked until the Spire unlocks it
  const id = ROSTER[i];
  if (selFor === 'train') { player = id; startTrainer(true); return; }
  if (selFor === 'practice') { player = id; startTrainer(false); return; }
  if (mode === 'versus') {
    if (selFor === 'p1') { player = id; selFor = 'p2'; go('select'); return; }
    player2 = id; startFight(); return;
  }
  player = id;
  if (mode === 'echo') go('summit');
  else if (!tutorialDone) { towerAfterTutorial = true; startTrainer(true); }
  else startTower();
};
const labFight = () => { mode = 'echo'; selFor = 'p1'; go('select'); };
const pickEnding = (i: number) => { choice = i; go('ending'); };

function changeSetting(row: number, dir: number) {
  setSel = row;
  const r = SETTING_ROWS[row];
  if (r.key === 'controls') { go('controls'); return; }
  if (r.key === 'reset') {
    if (!confirmReset) { confirmReset = true; return; }
    confirmReset = false;
    resetEcho().then(() => { hab = null; }).catch(() => {});
    return;
  }
  const opts = r.opts as readonly string[], cur = opts.indexOf(settings[r.key]);
  settings[r.key] = opts[(cur + dir + opts.length) % opts.length];
  if (r.key === 'fullscreen') { if (settings.fullscreen === 'ON') enterFullscreen(); else if (document.fullscreenElement) document.exitFullscreen(); }
  applySettings();
}

const TIMED: Partial<Record<Screen, [number, () => void]>> = {
  opening: [story.OPENING_SECONDS, () => enterFloor()],
  card: [story.CARD_SECONDS, () => startFight()],
  twist: [story.TWIST_SECONDS, () => go('card')],
  archive: [story.ARCHIVE_SECONDS, () => go('choice')],
};

const DUMMY: DummyMode[] = ['stand', 'block', 'fight'];

// One named press from the keyboard or a gamepad.
function handleKey(code: string) {
  unlockAudio();
  if (trailerOpen()) { if (code === 'Escape' || code === 'Enter' || code === 'PadB' || code === 'PadA') hideTrailer(); return; }
  if (code === 'KeyM') toggleMute();
  if (code === 'KeyF') toggleFullscreen();
  const inFight = screenNow === 'fight' || screenNow === 'train';
  const up = code === 'KeyW' || code === 'ArrowUp', down = code === 'KeyS' || code === 'ArrowDown';
  const left = code === 'KeyA' || code === 'ArrowLeft', right = code === 'KeyD' || code === 'ArrowRight';
  const ok = code === 'Enter' || code === 'PadStart' || (!inFight && (code === 'KeyU' || code === 'PadA'));
  const back = code === 'Escape' || code === 'PadSelect' || (!inFight && code === 'PadB');
  if (!inFight && (up || down || left || right || ok || back)) play('ui');
  if (paused) {
    if (up) pauseSel = (pauseSel + PAUSE_ITEMS.length - 1) % PAUSE_ITEMS.length;
    if (down) pauseSel = (pauseSel + 1) % PAUSE_ITEMS.length;
    if (ok || code === 'KeyU' || code === 'PadA') choosePause(pauseSel);
    else if (back || code === 'PadB') paused = false;
    return;
  }
  const timed = TIMED[screenNow];
  if (timed) { if (ok || code === 'Space') timed[1](); if (back) go('menu'); return; }
  switch (screenNow) {
    case 'landing': if (ok || code === 'Space') { enterFullscreen(); go('menu'); } break;
    case 'menu':
      if (!pressStart) { pressStart = true; return; }
      if (up) menuSel = (menuSel + MENU.length - 1) % MENU.length;
      if (down) menuSel = (menuSel + 1) % MENU.length;
      if (ok) chooseMenu(menuSel);
      if (back) go('landing');
      break;
    case 'select':
      if (left) selIdx = (selIdx + CARDS.length - 1) % CARDS.length;
      if (right) selIdx = (selIdx + 1) % CARDS.length;
      if (ok) pickFighter(selIdx);
      if (back) { if (selFor === 'p2') selFor = 'p1'; else go('menu'); }
      break;
    case 'settings':
      if (up) setSel = (setSel + SETTING_ROWS.length - 1) % SETTING_ROWS.length;
      if (down) setSel = (setSel + 1) % SETTING_ROWS.length;
      if (left) changeSetting(setSel, -1);
      if (right || (ok && (SETTING_ROWS[setSel].key === 'reset' || SETTING_ROWS[setSel].key === 'controls'))) changeSetting(setSel, 1);
      if (back) go('menu');
      break;
    case 'summit': if (ok || code === 'Space') leaveSummit(); if (back) go('menu'); break;
    case 'lab': if (ok && status.ready) labFight(); if (back) go('menu'); break;
    case 'controls': if (back || ok) go('settings'); break;
    case 'choice': if (left || right) choice = 1 - choice; if (ok) pickEnding(choice); break;
    case 'ending': if (ok && now - screenT0 > 5) go('menu'); break;
    case 'fallen': if (ok) enterFloor(); if (back) go('menu'); break;
    case 'train':
      if (back) { paused = true; pauseSel = 0; }
      if (code === 'KeyH') debug = !debug;
      if (code === 'KeyT' && trainer && !trainer.lessonsOn) trainer.dummy = DUMMY[(DUMMY.indexOf(trainer.dummy) + 1) % DUMMY.length];
      if (code === 'Enter' && trainer?.lessonsOn) { if (trainer.finished) finishTutorial(); else trainer.next(); }
      break;
    case 'fight':
      if (back) { paused = true; pauseSel = 0; }
      if (code === 'KeyH') debug = !debug;
      if (ok && sim?.phase === 'over') afterFight();
      break;
  }
}

addEventListener('keydown', e => {
  if (input.isGameKey(e.code) || e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  input.keyDown(e.code);
  handleKey(e.code);
});
addEventListener('keyup', e => input.keyUp(e.code));
addEventListener('blur', () => { input.clearKeys(); autoPause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
// no long-press menu or text selection on touch screens
addEventListener('contextmenu', e => e.preventDefault());

// ---------- mouse and touch ----------
let mouse = { x: -1, y: -1 }, hots: { x: number; y: number; w: number; h: number; fn: () => void }[] = [];
// canvas uses object-fit: contain, so map through the letterboxed game area
function toCanvas(e: PointerEvent) {
  const r = canvas.getBoundingClientRect(), k = Math.min(r.width / A.W, r.height / A.H);
  const ox = (r.width - A.W * k) / 2, oy = (r.height - A.H * k) / 2;
  return { x: (e.clientX - r.left - ox) / k, y: (e.clientY - r.top - oy) / k };
}
canvas.addEventListener('pointermove', e => {
  mouse = toCanvas(e);
  if (screenNow === 'controls') input.editorMove(e.pointerId, mouse.x, mouse.y);
  else if (e.pointerType === 'touch') input.touchMove(e.pointerId, mouse.x, mouse.y);
});
canvas.addEventListener('pointerdown', e => {
  unlockAudio();
  const p = toCanvas(e);
  // last registered wins: it was drawn on top
  const h = hots.findLast(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  if (screenNow === 'controls') { if (h) h.fn(); else input.editorDown(e.pointerId, p.x, p.y); return; }
  if (e.pointerType === 'touch') input.touchStart(e.pointerId, p.x, p.y);
  if (screenNow === 'landing') enterFullscreen();
  h?.fn();
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
  canvas.addEventListener(ev, e => { if (screenNow === 'controls') input.editorUp(e.pointerId); else input.touchEnd(e.pointerId); });
}
const hot: Hot = (x, y, w, h, fn) => {
  hots.push({ x, y, w, h, fn });
  return mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
};
// on touch screens the fight gets a small menu button and tap-to-continue
function touchExtras() {
  if (!input.touchMode) return;
  hot(560, 650, 160, 50, () => { paused = true; pauseSel = 0; });
  A.text('PAUSE', 640, 676, 13, '#7d8590', A.MONO, 'bold', 'center', 1, 4);
}

// ---------- the loop ----------
const ROUND_WORDS = ['', 'one', 'two', 'three', 'four', 'five'];

function sounds(s: Sim, ev: SimEvent[], prevPhase: string) {
  for (const e of ev) {
    if (e.type === 'hit') play(e.pow >= 1.4 ? 'heavy' : 'hit', e.pow);
    else play(e.type);
    if (e.type === 'ko') say(s.lastBreath ? 'Last breath' : 'K. O.');
    if (e.type === 'super') say('Overclock');
    if (e.type === 'power') say(e.name!.toLowerCase());
  }
  for (const f of s.f) if (f.state === 'attack' && f.frame === 0) play('whoosh', f.move === 'fp' || f.move === 'fk' ? 0.7 : 1);
  if (s.phase === 'intro' && s.phaseFrame === 1) say(`Round ${ROUND_WORDS[s.round] ?? s.round}`);
  if (s.phase === 'intro' && s.phaseFrame === 60) say('Fight!');
  if (s.phase === 'finish' && prevPhase !== 'finish') say('Delete them');
  if (s.phase === 'deletion' && prevPhase !== 'deletion') { play('deletion'); say('Deletion'); }
  if (s.phase === 'over' && prevPhase !== 'over' && screenNow === 'fight') say(s.wins[0] > s.wins[1] ? 'You win' : brain ? 'Your echo wins' : 'You lose');
}

function fightTick(s: Sim) {
  const p1 = input.bitsFor(0);
  rec?.tick(s, p1);
  const p2 = mode === 'versus' ? input.bitsFor(1) : brain ? brain.input(s, 1) : cpuInput(s, 1, cpu!);
  const phase = s.phase;
  const ev = step(s, [p1, p2]);
  fxEvents(ev, s, now);
  sounds(s, ev, phase);
  const line = taunter?.update(s, ev, p1, now);
  if (line) say(line.toLowerCase(), true);
  if (s.phase === 'over') saveFight(s);
}

function overHint(s: Sim): string {
  const won = s.wins[0] > s.wins[1];
  const tap = input.touchMode;
  if (mode !== 'tower') return tap ? 'TAP TO REMATCH  //  MENU BUTTON BELOW' : 'ENTER  REMATCH     //     ESC  MAIN MENU';
  return (tap ? 'TAP  ' : 'ENTER  ') + (won ? (floor().echo ? 'FACE THE ARCHIVE' : 'CLIMB ON') : 'CONTINUE');
}

let last = 0;
function frame(ms: number) {
  now = ms / 1000;
  const dt = Math.min(0.1, now - last);
  last = now;
  const t = now - screenT0;
  hots = [];
  for (const code of input.padPresses()) handleKey(code);
  const timed = TIMED[screenNow];
  if (timed && t >= timed[0]) timed[1]();
  if (timed) hot(0, 0, A.W, A.H, timed[1]);
  const f = mode === 'tower' && tower.length ? floor() : null;
  switch (screenNow) {
    case 'landing': drawLanding(t, hot, { start: () => go('menu'), trailer: showTrailer, nav: n => { pressStart = true; if (n === 'ECHO LAB') go('lab'); else if (n === 'STORY') showTrailer(); else if (n === 'FIGHTERS') { mode = 'tower'; selFor = 'p1'; go('select'); } else go('menu'); } }); break;
    case 'menu': drawMenu(t, menuSel, pressStart, echoInfo(), hot, chooseMenu); break;
    case 'select': drawSelect(t, selIdx, mode === 'versus' ? (selFor === 'p2' ? 'PLAYER 2' : 'PLAYER 1') : '', mode === 'versus' && selFor === 'p2' ? ROSTER.indexOf(player) : -1, hot, pickFighter); break;
    case 'settings': drawSettings(t, setSel, settings, confirmReset, hot, changeSetting); break;
    case 'controls': input.drawEditor(t, hot, () => go('settings')); break;
    case 'lab': drawLab(t, echoInfo(), hot, labFight); break;
    case 'summit': drawSummit(t, player, hab?.lines ?? [], summitNote(), hot, leaveSummit); break;
    case 'opening': story.drawOpening(t); break;
    case 'card': story.drawFloorCard(t, f!.fl, player, f!.opp ?? player, !!f!.echo, !!f!.temple); break;
    case 'twist': story.drawTwist(t, player); break;
    case 'archive': story.drawArchive(t); break;
    case 'choice': story.drawChoice(t, choice, hot, pickEnding); break;
    case 'ending': hot(0, 0, A.W, A.H, () => { if (now - screenT0 > 5) go('menu'); }); story.drawEnding(t, choice, player); break;
    case 'fallen': hot(0, 0, A.W, A.H, enterFloor); story.drawFallen(t, f?.fl ?? 0, !!f?.echo); break;
    case 'train':
      if (!trainer) break;
      acc += dt;
      if (paused) acc = 0;
      while (acc >= 1 / 60) { acc -= 1 / 60; const p = input.bitsFor(0); const s = trainer.s, ph = s.phase; const ev = trainer.update(p, now); fxEvents(ev, trainer.s, now); sounds(trainer.s, ev, ph); }
      drawFight(trainer.s, now, { debug, names: ['YOU', 'DUMMY'] });
      drawTrainer(trainer, now);
      if (input.touchMode && trainer.lessonsOn && !trainer.finished) { const tr = trainer; hot(340, 128, 600, 150, () => tr.next()); }
      if (input.touchMode && !trainer.lessonsOn) { const tr = trainer; hot(440, 150, 400, 40, () => { tr.dummy = DUMMY[(DUMMY.indexOf(tr.dummy) + 1) % DUMMY.length]; }); }
      if (trainer.lessonsOn && trainer.finished) hot(0, 0, A.W, A.H, finishTutorial);
      touchExtras();
      break;
    case 'fight':
      if (!sim) break;
      acc += dt * timeScale(now);
      if (paused) acc = 0;
      while (acc >= 1 / 60) { acc -= 1 / 60; fightTick(sim); }
      if (sim.phase === 'over') hot(0, 0, A.W, A.H, afterFight);
      drawFight(sim, now, {
        debug, rec: mode !== 'versus', temple: f?.temple, floor: f?.fl, overHint: overHint(sim),
        names: mode === 'versus' ? ['P1', 'P2'] : undefined,
        echoSide: brain ? 1 : undefined,
        panel: brain ? { top: brain.top(5), acc: status.info?.valAcc ?? 0, loss: status.info?.loss ?? [] } : undefined,
        callout: brain ? hab?.callout : undefined,
        taunt: taunter?.line ? { text: taunter.line, age: now - taunter.at } : undefined,
      });
      if (sim.phase !== 'over') touchExtras();
      break;
  }
  if ((screenNow === 'fight' || screenNow === 'train') && !paused) input.drawTouchPad();
  if (paused) drawPause(now - screenT0, pauseSel, hot, choosePause);
  if (input.touchMode && ['select', 'lab', 'settings', 'summit', 'fallen'].includes(screenNow)) backButton(hot, () => { if (screenNow === 'select' && selFor === 'p2') selFor = 'p1'; else go('menu'); });
  canvas.style.cursor = hots.some(r => mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) ? 'pointer' : 'default';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// installable app: cache the game for offline play (production builds only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
