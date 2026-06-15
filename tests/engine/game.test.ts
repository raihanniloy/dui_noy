import { describe, it, expect } from 'vitest';
import { newGame, currentSeat } from '../../src/engine/game';

describe('currentSeat', () => {
  it('returns the opener (left of dealer) at the start of bidding', () => {
    const s = newGame(1);
    // newGame deals with dealer 0, so the opener is seat 1.
    expect(s.phase).toBe('bidding');
    expect(currentSeat(s)).toBe(s.bidding.turn);
    expect(currentSeat(s)).toBe(1);
  });
});
