// The Echo on the page side: training status, loading the trained model, and the
// controller that plays the boss by sampling the model's predicted action.

import { ACTIONS, DECISION_TICKS, N_ACTIONS, actionBits, features, legalMask } from '../core/features.ts';
import { cpuInput, makeCpu, type Cpu } from '../core/ai.ts';
import type { Sim } from '../core/sim.ts';
import { allMatches, saveMatch, type MatchRecord } from './store.ts';

export const MIN_MATCHES = 3;
const MODEL_URL = 'indexeddb://echo-model';

export interface TrainInfo { samples: number; matches: number; loss: number[]; valAcc: number; counts: number[]; at: number }
export const status = {
  matches: 0,
  samples: 0,
  training: false,
  progress: 0,
  ready: false,
  info: null as TrainInfo | null,
};

// ---------- data and training ----------
let tf: typeof import('@tensorflow/tfjs') | null = null;
let model: import('@tensorflow/tfjs').LayersModel | null = null;
let worker: Worker | null = null;

function loadInfo(): TrainInfo | null {
  try { return JSON.parse(localStorage.getItem('echo-train') ?? 'null'); } catch { return null; }
}

export async function refresh(): Promise<MatchRecord[]> {
  const ms = await allMatches();
  status.matches = ms.length;
  status.samples = ms.reduce((n, m) => n + m.y.length, 0);
  status.info = loadInfo();
  if (status.info && !model) await loadModel();
  return ms;
}

async function loadModel() {
  tf ??= await import('@tensorflow/tfjs');
  await tf.setBackend('cpu');
  try { model = await tf.loadLayersModel(MODEL_URL); status.ready = true; } catch { model = null; status.ready = false; }
}

let again = false; // a fight finished mid-training: train once more when this run ends

export function train() {
  if (status.training) { again = true; return; }
  if (status.matches < MIN_MATCHES) return;
  worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  status.training = true;
  status.progress = 0;
  worker.onmessage = async (e: MessageEvent) => {
    const d = e.data;
    if (d.type === 'progress') status.progress = d.epoch / d.epochs;
    if (d.type === 'error') status.training = false;
    if (d.type === 'done') {
      const info: TrainInfo = { samples: d.samples, matches: d.matches, loss: d.loss, valAcc: d.valAcc, counts: d.counts, at: Date.now() };
      try { localStorage.setItem('echo-train', JSON.stringify(info)); } catch { /* private mode: keep it in memory */ }
      status.info = info;
      model = null;
      await loadModel();
      status.training = false;
      if (again) { again = false; train(); }
    }
  };
  worker.postMessage('train');
}

export async function record(m: MatchRecord): Promise<MatchRecord[] | null> {
  if (m.y.length < 10) return null;
  await saveMatch(m);
  const ms = await refresh();
  train();
  return ms;
}

// ---------- the boss ----------
export class EchoBrain {
  probs = new Float32Array(N_ACTIONS); // last prediction, shown on the HUD
  action = 0;
  private queue: { at: number; bits: number }[] = [];
  private out = 0;
  private fallback: Cpu;
  private delay: number;
  private temp: number;

  constructor(seed: number, delay = 12, temp = 0.7) {
    this.fallback = makeCpu(seed);
    this.delay = delay;
    this.temp = temp;
  }

  input(s: Sim, i: number): number {
    if (!model || !tf || s.phase !== 'fight') return cpuInput(s, i, this.fallback);
    while (this.queue.length && this.queue[0].at <= s.tick) this.out = this.queue.shift()!.bits;
    if (s.tick % DECISION_TICKS === 0) {
      const f = s.f[i], feats = features(s, i), m = model, t = tf;
      const p = t.tidy(() => (m.predict(t.tensor2d([feats])) as import('@tensorflow/tfjs').Tensor).dataSync());
      const mask = legalMask(f);
      // temperature sampling keeps the Echo from being a perfect, predictable copy
      let sum = 0;
      const w = Array.from(p, (v, k) => { const x = mask[k] ? Math.pow(v, 1 / this.temp) : 0; sum += x; return x; });
      let r = Math.random() * sum, a = 0;
      for (; a < N_ACTIONS - 1; a++) if ((r -= w[a]) <= 0) break;
      this.probs = Float32Array.from(w, v => v / (sum || 1));
      this.action = a;
      for (let k = 0; k < DECISION_TICKS; k++) this.queue.push({ at: s.tick + this.delay + k, bits: actionBits(a, f.facing, k) });
    }
    return this.out;
  }

  // Top predicted actions for the live model panel.
  top(n: number): [string, number][] {
    return Array.from(this.probs, (v, k) => [ACTIONS[k], v] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, n);
  }
}
