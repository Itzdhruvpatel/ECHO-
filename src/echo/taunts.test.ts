// The Echo taunts on the right moments. Run: npm test
import assert from 'node:assert/strict';
import { B, createSim, step } from '../core/sim.ts';
import { A } from '../core/features.ts';
import { Taunter } from './taunts.ts';
import type { Habits } from './habits.ts';

const hab = { stats: { jumpAfterBlock: 41, favAction: A.SPECIAL, favName: 'COIL LASH', powerHp: -1, blocks: 30 } } as Habits;
const s = createSim('kaal', 'kaal');
const tr = new Taunter(hab);
const said: string[] = [];
let now = 0;
const tick = (bits: number) => { now += 1 / 60; const ev = step(s, [bits, 0]); const l = tr.update(s, ev, bits, now); if (l) said.push(l); };

while (s.phase !== 'fight') tick(0);
for (let i = 0; i < 30; i++) tick(0);
assert.equal(said.length, 1, 'opening taunt');

// favorite move (the special) after the cooldown
for (let i = 0; i < 200; i++) tick(0);
tick(B.SPECIAL); tick(B.SPECIAL);
assert.ok(said.some(l => l.includes('COIL LASH') || l.includes('FAVORITE') || l === 'PREDICTABLE.'), `favorite move taunt missing: ${said.join(' | ')}`);

// standing still for 4 seconds
for (let i = 0; i < 300; i++) tick(0);
assert.ok(said.some(l => l.includes('SCARED') || l.includes('NERVOUS')), `idle taunt missing: ${said.join(' | ')}`);
console.log(`ok  Echo taunts: ${said.length} lines`);
