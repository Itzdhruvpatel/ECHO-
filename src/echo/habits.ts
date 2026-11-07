// The Habit Report: plain-language patterns pulled from the player's recorded fights.

import { FIGHTERS, MOVES, type FighterId } from '../core/data.ts';
import { A, ACTIONS, N_FEATURES } from '../core/features.ts';
import type { MatchRecord } from './store.ts';

// feature layout (see core/features.ts)
const HP = 4, MY_STATE = 12, OP_PHASE = 12 + 24;
const BLOCK = 6, BLOCKSTUN = 8;
const JUMPS = [A.JUMP_UP, A.JUMP_IN, A.JUMP_BACK];
const ATTACKS = [A.FRONT_PUNCH, A.BACK_PUNCH, A.FRONT_KICK, A.BACK_KICK, A.THROW, A.SPECIAL];

export interface Habits {
  lines: string[]; // short facts for the Floor 99 intro
  callout: string; // the Archive's line during the Echo fight
  dist: [string, number][]; // action share, most used first
  fighter: FighterId;
}

const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

export function habits(matches: MatchRecord[]): Habits | null {
  const rows: { f: number[]; y: number; prev: number[] | null }[] = [];
  const used: Record<string, number> = {};
  for (const m of matches) {
    used[m.fighter] = (used[m.fighter] ?? 0) + 1;
    for (let k = 0; k < m.y.length; k++) {
      rows.push({ f: m.x.slice(k * N_FEATURES, (k + 1) * N_FEATURES), y: m.y[k], prev: k ? m.x.slice((k - 1) * N_FEATURES, k * N_FEATURES) : null });
    }
  }
  if (rows.length < 30) return null;
  const fighter = (Object.entries(used).sort((a, b) => b[1] - a[1])[0][0]) as FighterId;
  const F = FIGHTERS[fighter];

  // 1. jumping out of block
  const afterBlock = rows.filter(r => r.prev && (r.prev[MY_STATE + BLOCK] || r.prev[MY_STATE + BLOCKSTUN]) && !r.f[MY_STATE + BLOCKSTUN]);
  const jumpAfterBlock = pct(afterBlock.filter(r => JUMPS.includes(r.y)).length, afterBlock.length);
  // 2. favorite attack
  const atk = ATTACKS.map(a => [a, rows.filter(r => r.y === a).length] as const).sort((a, b) => b[1] - a[1])[0];
  const atkName = atk[0] === A.SPECIAL ? MOVES[F.special].name.toUpperCase() : ACTIONS[atk[0]];
  // 3. super power under pressure
  const powers = rows.filter(r => r.y === A.SUPER_POWER);
  const powerHp = powers.length ? Math.round(100 * powers.reduce((n, r) => n + r.f[HP], 0) / powers.length) : 0;
  // 4. blocking when attacked
  const attacked = rows.filter(r => r.f[OP_PHASE] || r.f[OP_PHASE + 1]); // opponent in startup or active frames
  const blocks = pct(attacked.filter(r => r.y === A.BLOCK_HIGH || r.y === A.BLOCK_LOW).length, attacked.length);

  const lines = [
    `YOU JUMP AFTER BLOCKING: ${jumpAfterBlock}%`,
    `FAVORITE ATTACK: ${atkName}`,
    powers.length ? `YOU PANIC ${F.power} AT ${powerHp}% HP` : `YOU BLOCK WHEN ATTACKED: ${blocks}%`,
    'I KNOW EVERY HABIT YOU HAVE',
  ];
  const n = rows.length;
  const dist = ACTIONS.map((name, a) => [name, rows.filter(r => r.y === a).length / n] as [string, number]).sort((a, b) => b[1] - a[1]);
  return { lines, callout: `ARCHIVE: YOU BLOCK WHEN ATTACKED ${blocks}% OF THE TIME`, dist, fighter };
}
