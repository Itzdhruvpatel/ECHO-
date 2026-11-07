// Every action the Echo can output must be read back as the same action by the recorder.
// Run: npm test
import assert from 'node:assert/strict';
import { createSim, step } from './sim.ts';
import { ACTIONS, A, DECISION_TICKS, N_FEATURES, actionBits, features, labelAction } from './features.ts';

function replay(a: number) {
  const s = createSim('kaal', 'rook');
  while (s.phase !== 'fight') step(s, [0, 0]);
  s.f[0].meter = 300;
  if (a === A.JUMP_ATTACK) { // get airborne first
    for (let t = 0; t < 6; t++) step(s, [actionBits(A.JUMP_UP, 1, t), 0]);
  }
  const facing = s.f[0].facing, held: number[] = [], prev = s.f[0].held;
  for (let t = 0; t < DECISION_TICKS; t++) {
    const bits = actionBits(a, facing, t);
    held.push(bits);
    step(s, [bits, 0]);
  }
  return labelAction(held, prev, s.f[0], facing);
}

ACTIONS.forEach((name, a) => assert.equal(ACTIONS[replay(a)], name, `${name} was recorded as ${ACTIONS[replay(a)]}`));
const s = createSim('vanta', 'kaal');
assert.equal(features(s, 0).length, N_FEATURES);
assert.deepEqual(features(s, 0).slice(0, 2), features(s, 1).slice(0, 2), 'features should mirror for both sides');
console.log(`ok  ${ACTIONS.length} actions round trip, ${N_FEATURES} features`);
