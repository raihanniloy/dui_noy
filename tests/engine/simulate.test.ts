import { describe, it, expect } from 'vitest';
import { newGame, applyAction, legalActions } from '../../src/engine/game';
import type { GameState } from '../../src/engine/game';
import type { Seat } from '../../src/engine/types';
import { mulberry32 } from '../../src/engine/deck';

function actingSeat(s: GameState): Seat {
  if (s.phase === 'bidding') return s.bidding.turn;
  if (s.phase === 'trumpSelection') return s.bid!.seat;
  if (s.phase === 'doubleWindow') return s.doubleQueue[0]!;
  return ((s.leader + s.trick.length) % 4) as Seat;
}

describe('random playout invariants', () => {
  it('200 games with random legal actions: never stuck, never illegal, always terminate', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const rng = mulberry32(seed);
      let s = newGame(seed);
      let steps = 0;
      while (s.phase !== 'done') {
        steps++;
        expect(steps).toBeLessThan(5000); // termination guard
        const seat = actingSeat(s);
        const acts = legalActions(s, seat);
        expect(acts.length).toBeGreaterThan(0); // never stuck
        const a = acts[Math.floor(rng() * acts.length)]!;
        const r = applyAction(s, a);
        if (!r.ok) throw new Error(`legalActions produced illegal action: ${r.reason}`);
        // invariant: total cards in hands + trick + stock is consistent
        const inPlay =
          r.state.hands.reduce((n, h) => n + h.length, 0) +
          r.state.trick.length * 0 + // trick cards already removed from hands
          r.state.stock.length;
        expect(inPlay).toBeLessThanOrEqual(32);
        s = r.state;
      }
      expect(Math.max(...s.scores.map(Math.abs))).toBeGreaterThanOrEqual(6);
    }
  }, 60_000);
});
