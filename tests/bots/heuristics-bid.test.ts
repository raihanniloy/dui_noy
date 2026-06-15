import { describe, it, expect } from 'vitest';
import { handStrength, bidDecision, chooseTrumpMode, doubleDecision } from '../../src/bots/heuristics';
import type { Card, Suit, Rank } from '../../src/engine/types';
import type { PlayerView } from '../../src/engine/game';

const c = (suit: Suit, rank: Rank): Card => ({ suit, rank });

const weak: Card[] = [c('hearts','7'), c('hearts','8'), c('clubs','7'), c('clubs','8'),
  c('diamonds','7'), c('diamonds','8'), c('spades','7'), c('spades','8')];
const strong: Card[] = [c('hearts','J'), c('hearts','9'), c('hearts','A'), c('hearts','10'),
  c('hearts','K'), c('clubs','J'), c('clubs','9'), c('spades','A')];

const view = (hand: Card[], highest: { seat: 0|1|2|3; value: number } | null = null): PlayerView =>
  ({ seat: 0, hand, bidding: { turn: 0, highest, passed: [false,false,false,false], done: false },
     stake: 1 } as unknown as PlayerView);

describe('handStrength', () => {
  it('adding a J raises strength', () => {
    const base = [c('hearts','7'), c('clubs','8')];
    expect(handStrength([...base, c('spades','J')])).toBeGreaterThan(handStrength(base));
  });
  it('strong hand outscores weak hand', () => {
    expect(handStrength(strong)).toBeGreaterThan(handStrength(weak));
  });
});

describe('bidDecision', () => {
  it('passes on a weak hand', () => {
    expect(bidDecision(view(weak))).toEqual({ pass: true });
  });
  it('bids on a strong hand, at least 16', () => {
    const d = bidDecision(view(strong));
    expect('value' in d).toBe(true);
    if ('value' in d) expect(d.value).toBeGreaterThanOrEqual(16);
  });
  it('respects the current floor (must exceed highest)', () => {
    const d = bidDecision(view(strong, { seat: 1, value: 20 }));
    if ('value' in d) expect(d.value).toBeGreaterThan(20);
  });
  it('passes when the floor exceeds what the hand is worth', () => {
    const moderate = [c('hearts','J'), c('hearts','9'), c('clubs','10'), c('clubs','8'),
      c('diamonds','7'), c('diamonds','8'), c('spades','7'), c('spades','8')];
    expect(bidDecision(view(moderate, { seat: 1, value: 18 }))).toEqual({ pass: true });
  });
});

describe('chooseTrumpMode', () => {
  it('picks the long strong suit', () => {
    const m = chooseTrumpMode(strong); // 5 hearts
    expect(m).toEqual({ kind: 'suit', suit: 'hearts' });
  });
  it('gambles seventh when balanced-weak (no suit longer than 2)', () => {
    expect(chooseTrumpMode(weak).kind).toBe('seventh');
  });
});

describe('doubleDecision', () => {
  it('opponent doubles with a strong hand', () => {
    expect(doubleDecision(view(strong))).toBe('double');
  });
  it('declines with a weak hand', () => {
    expect(doubleDecision(view(weak))).toBe('decline');
  });
  it('bid team redoubles with a strong hand at stake 2', () => {
    const v = { ...view(strong), stake: 2 } as unknown as PlayerView;
    expect(doubleDecision(v)).toBe('redouble');
  });
});
