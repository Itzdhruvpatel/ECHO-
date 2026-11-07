// Synthesized sound effects with the Web Audio API. No audio files to load.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
export let muted = false;

// Browsers only allow audio after a user gesture, so this runs on the first key or click.
export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
}

export function setMuted(v: boolean) {
  muted = v;
  if (master) master.gain.value = muted ? 0 : 0.5;
}
export const toggleMute = () => setMuted(!muted);

let noiseBuf: AudioBuffer | null = null;
function noise(): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ctx!.createBuffer(1, ctx!.sampleRate, ctx!.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function env(g: GainNode, peak: number, attack: number, decay: number) {
  const t = ctx!.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function burst(type: BiquadFilterType, freq: number, q: number, peak: number, decay: number) {
  const src = ctx!.createBufferSource(), f = ctx!.createBiquadFilter(), g = ctx!.createGain();
  src.buffer = noise(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  src.connect(f).connect(g).connect(master!);
  env(g, peak, 0.003, decay);
  src.start(); src.stop(ctx!.currentTime + decay + 0.05);
}

function tone(type: OscillatorType, from: number, to: number, peak: number, decay: number) {
  const o = ctx!.createOscillator(), g = ctx!.createGain(), t = ctx!.currentTime;
  o.type = type; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + decay);
  o.connect(g).connect(master!);
  env(g, peak, 0.004, decay);
  o.start(); o.stop(t + decay + 0.05);
}

export type Sfx = 'hit' | 'heavy' | 'block' | 'whoosh' | 'throw' | 'ko' | 'power' | 'super' | 'ui' | 'deletion';

export function play(name: Sfx, pow = 1) {
  if (!ctx || muted) return;
  switch (name) {
    case 'hit': burst('lowpass', 1800, 1, 0.5 * pow, 0.12); tone('sine', 160, 50, 0.6 * pow, 0.14); break;
    case 'heavy': burst('lowpass', 900, 1, 0.8, 0.25); tone('sine', 110, 30, 0.9, 0.3); break;
    case 'block': burst('bandpass', 3200, 6, 0.35, 0.08); tone('triangle', 900, 700, 0.15, 0.06); break;
    case 'whoosh': burst('bandpass', 1400, 1.5, 0.18 * pow, 0.16); break;
    case 'throw': burst('lowpass', 600, 1, 0.7, 0.3); tone('sine', 90, 35, 0.8, 0.35); break;
    case 'ko': tone('sawtooth', 220, 40, 0.5, 1.2); burst('lowpass', 500, 1, 0.8, 0.9); break;
    case 'power': tone('sine', 300, 1200, 0.3, 0.4); tone('triangle', 600, 2400, 0.15, 0.3); break;
    case 'super': tone('sawtooth', 80, 400, 0.35, 0.9); burst('highpass', 4000, 1, 0.3, 0.8); break;
    case 'ui': tone('square', 880, 880, 0.08, 0.05); break;
    case 'deletion': tone('sawtooth', 60, 30, 0.6, 2); burst('lowpass', 300, 1, 0.9, 1.5); tone('sine', 2000, 200, 0.2, 1.2); break;
  }
}
