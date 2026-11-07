// Watches the player's inputs during a fight and turns every decision window
// into one (features, action) training row.

import { DECISION_TICKS, features, labelAction } from '../core/features.ts';
import type { Sim } from '../core/sim.ts';

export class Recorder {
  x: number[] = [];
  y: number[] = [];
  private feat: number[] | null = null;
  private facing: 1 | -1 = 1;
  private held: number[] = [];
  private prev = 0;
  private last = 0;
  private side = 0; // the player is always fighter 0

  // Call once per tick, before step(), with the bits the player is about to send.
  tick(s: Sim, bits: number) {
    if (s.phase !== 'fight') { this.feat = null; this.last = bits; return; }
    if (s.tick % DECISION_TICKS === 0) {
      if (this.feat) {
        this.x.push(...this.feat);
        this.y.push(labelAction(this.held, this.prev, s.f[this.side], this.facing));
      }
      this.feat = features(s, this.side);
      this.facing = s.f[this.side].facing;
      this.prev = this.last;
      this.held = [];
    }
    this.held.push(bits);
    this.last = bits;
  }

  get rows() { return this.y.length; }
}
