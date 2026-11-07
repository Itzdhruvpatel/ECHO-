// The Echo talks while it fights: lines built from the player's Habit Report and
// from what the player does right now. Cosmetic only, never touches the fight.

import { FIGHTERS, MOVES } from '../core/data.ts';
import { A } from '../core/features.ts';
import type { Sim, SimEvent } from '../core/sim.ts';
import type { Habits } from './habits.ts';

const COOLDOWN = 3.2; // seconds between lines
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];

// moves that count as the player's favorite attack
const FAV_MOVES: Record<number, string[]> = {
  [A.FRONT_PUNCH]: ['fp', 'fp2'], [A.BACK_PUNCH]: ['bp'], [A.FRONT_KICK]: ['fk'], [A.BACK_KICK]: ['bk'], [A.THROW]: ['throw'],
};

export class Taunter {
  line = '';
  at = -99;
  private said = new Set<string>(); // one-off lines already used this fight
  private idle = 0;
  private prevState = 'idle';
  private hab: Habits | null;
  private fresh = false; // a new line was said this tick

  constructor(hab: Habits | null) { this.hab = hab; }

  private say(now: number, text: string, force = false): boolean {
    if (!force && now - this.at < COOLDOWN) return false;
    this.line = text;
    this.fresh = true;
    this.at = now;
    return true;
  }
  private once(now: number, key: string, text: string) {
    if (this.said.has(key)) return;
    if (this.say(now, text, true)) this.said.add(key);
  }

  // Call after each fight tick. The player is fighter 0, the Echo fighter 1.
  update(s: Sim, ev: SimEvent[], p1Bits: number, now: number): string | null {
    this.fresh = false;
    const me = s.f[0], echo = s.f[1], st = this.hab?.stats, F = FIGHTERS[me.id];
    const started = me.state === 'attack' && me.frame === 0 ? me.move : null;

    if (s.phase === 'fight' && s.phaseFrame === 20 && s.round === 1) {
      this.say(now, pick([
        'I KNOW EVERY HABIT YOU HAVE.',
        'YOU BUILT ME. NOW TRY TO BREAK ME.',
        ...(st ? [`YOU JUMP AFTER BLOCKING ${st.jumpAfterBlock}% OF THE TIME. I COUNTED.`, `${st.favName}. THAT IS ALL YOU HAVE.`] : []),
      ]), true);
    }
    if (s.phase === 'fight') {
      // the player does exactly what the Habit Report says
      if (me.state === 'jump' && me.frame === 0 && (this.prevState === 'block' || this.prevState === 'blockstun'))
        this.say(now, pick(['THERE IT IS. YOU JUMP AFTER BLOCKING.', 'JUMPING OUT OF BLOCK? I KNEW IT.']));
      if (started && st) {
        const fav = st.favAction === A.SPECIAL ? [F.special] : FAV_MOVES[st.favAction] ?? [];
        if (fav.includes(started)) this.say(now, pick([`${st.favName}. AGAIN.`, 'YOUR FAVORITE. OF COURSE.', 'PREDICTABLE.']));
      }
      for (const e of ev) {
        if (e.type === 'block' && e.who === 0) this.say(now, pick(['SAW IT COMING.', 'TOO SLOW. I KNOW THAT ONE.', 'I BLOCKED THAT IN TRAINING.']));
        if (e.type === 'hit' && e.who === 1 && (e.combo ?? 0) >= 3) this.say(now, pick(['THAT IS YOUR COMBO. I JUST DO IT BETTER.', 'RECOGNIZE THIS ONE?']), true);
        if (e.type === 'hit' && e.who === 0 && (e.pow >= 1.2 || (e.combo ?? 0) >= 3)) this.say(now, pick(['LUCKY.', 'WRITING THAT DOWN.', 'NEW HABIT. SAVED.']));
        if (e.type === 'power' && e.who === 0) this.say(now, me.hp / me.maxHp < 0.4 ? `PANIC ${F.power}. JUST LIKE ALWAYS.` : `${F.power}? I HAVE THAT TOO.`, true);
        if (e.type === 'super' && e.who === 1) this.say(now, `${MOVES[FIGHTERS[echo.id].overclock].name.toUpperCase()}. YOUR MOVE. MY TIMING.`, true);
      }
      this.idle = p1Bits ? 0 : this.idle + 1;
      if (this.idle === 240) this.say(now, pick(['SCARED OF YOURSELF?', 'YOU NEVER WAIT THIS LONG. NERVOUS?']));
      if (echo.hp / echo.maxHp < 0.25) this.once(now, 'low', 'YOU CANNOT DELETE YOURSELF.');
      if (me.hp / me.maxHp < 0.2) this.once(now, 'win', 'THIS IS HOW YOU LOSE. I HAVE SEEN IT.');
    }
    if (s.phase === 'outro' && s.phaseFrame === 80) {
      this.say(now, s.roundWinner === 1 ? pick(['TEACH ME MORE.', 'ONE MORE ROUND OF DATA.']) : pick(['I AM STILL LEARNING.', 'NEXT TIME I WILL KNOW THAT TOO.']), true);
    }
    if (s.phase === 'finish' && s.phaseFrame === 10 && s.roundWinner === 1) this.say(now, 'I AM THE ORIGINAL NOW.', true);
    this.prevState = me.state;
    return this.fresh ? this.line : null;
  }
}

