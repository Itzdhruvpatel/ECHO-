// Random button mashing for thousands of fights: nothing may crash, go NaN, leave the stage
// or get stuck in one state. Run: npm test
import assert from 'node:assert/strict';
import { WALL_L, WALL_R, createSim, step, type Sim } from './sim.ts';
import { ROSTER } from './data.ts';

let seed = 12345;
const rand = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
const LIMIT: Record<string, number> = { hitstun: 200, blockstun: 120, down: 120, attack: 200, dash: 30, jump: 120 };

function check(s: Sim, where: string) {
  for (const f of s.f) {
    for (const k of ['x', 'y', 'vx', 'vy', 'hp', 'meter'] as const) assert.ok(Number.isFinite(f[k]), `${where}: ${k} is ${f[k]}`);
    assert.ok(f.x >= WALL_L - 1 && f.x <= WALL_R + 1, `${where}: x out of stage ${f.x}`);
    assert.ok(f.y >= 0 && f.y < 600, `${where}: y out of range ${f.y}`);
    assert.ok(f.meter >= 0 && f.meter <= 300, `${where}: meter ${f.meter}`);
    const lim = LIMIT[f.state];
    if (lim && s.phase === 'fight') assert.ok(f.frame < lim, `${where}: stuck in ${f.state} for ${f.frame} ticks (move ${f.move})`);
  }
}

let fights = 0, ticks = 0;
for (let n = 0; n < 120; n++) {
  const a = ROSTER[n % 3], b = ROSTER[Math.floor(n / 3) % 3];
  const s = createSim(a, b);
  // each side holds a random set of buttons for a random short time, sometimes with full meter
  const held: [number, number][] = [[0, 0], [0, 0]];
  for (let t = 0; t < 40000 && s.phase !== 'over'; t++) {
    for (const h of held) if (--h[1] <= 0) { h[0] = Math.floor(rand() * 4096); h[1] = 1 + Math.floor(rand() * 12); }
    if (rand() < 0.002) s.f[Math.floor(rand() * 2)].meter = 300;
    step(s, [held[0][0], held[1][0]]);
    ticks++;
    check(s, `${a} vs ${b} fight ${n} tick ${t}`);
  }
  assert.equal(s.phase, 'over', `${a} vs ${b} fight ${n} never ended (round ${s.round}, wins ${s.wins})`);
  fights++;
}
console.log(`ok  fuzz: ${fights} random fights, ${ticks} ticks, no broken states`);
