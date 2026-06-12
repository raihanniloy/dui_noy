import { describe, it, expect } from 'vitest';
import { cardPoints, trickPoints, scoreHand } from '../../src/engine/scoring';
import { makeDeck } from '../../src/engine/deck';
import type { Card, Suit, Rank } from '../../src/engine/types';

const c = (suit: Suit, rank: Rank): Card => ({ suit, rank });

describe('cardPoints', () => {
  it('J=3 9=2 A=1 10=1 others=0; full deck sums to 28', () => {
    expect(cardPoints(c('hearts', 'J'))).toBe(3);
    expect(cardPoints(c('hearts', '9'))).toBe(2);
    expect(cardPoints(c('hearts', 'A'))).toBe(1);
    expect(cardPoints(c('hearts', '10'))).toBe(1);
    expect(cardPoints(c('hearts', 'K'))).toBe(0);
    expect(trickPoints(makeDeck())).toBe(28);
  });
});

describe('scoreHand', () => {
  const base = {
    bid: 17,
    bidderTeam: 0 as const,
    cardPointsByTeam: [17, 12] as [number, number], // 28 + 1 last-trick bonus
    tricksByTeam: [4, 4] as [number, number],
    marriageTeam: null,
    stake: 1 as const,
  };
  it('meets bid: +stake', () => {
    expect(scoreHand(base)).toEqual({ target: 17, success: true, delta: 1 });
  });
  it('fails bid: -stake', () => {
    const r = scoreHand({ ...base, bid: 20 });
    expect(r).toEqual({ target: 20, success: false, delta: -1 });
  });
  it('doubled stake', () => {
    expect(scoreHand({ ...base, stake: 2 }).delta).toBe(2);
    expect(scoreHand({ ...base, bid: 20, stake: 4 }).delta).toBe(-4);
  });
  it('bidder-team marriage lowers target, floor 16', () => {
    expect(scoreHand({ ...base, bid: 20, marriageTeam: 0 }).target).toBe(16);
    expect(scoreHand({ ...base, bid: 24, marriageTeam: 0 }).target).toBe(20);
  });
  it('opponent marriage raises target, cap 28', () => {
    expect(scoreHand({ ...base, bid: 17, marriageTeam: 1 }).target).toBe(21);
    expect(scoreHand({ ...base, bid: 26, marriageTeam: 1 }).target).toBe(28);
  });
  it('all rounds won: extra +1', () => {
    const r = scoreHand({ ...base, cardPointsByTeam: [29, 0], tricksByTeam: [8, 0] });
    expect(r.delta).toBe(2);
  });
  it('all rounds lost: extra -1', () => {
    const r = scoreHand({ ...base, bid: 20, cardPointsByTeam: [0, 29], tricksByTeam: [0, 8] });
    expect(r.delta).toBe(-2);
  });
});
