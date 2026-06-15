import { describe, it, expect } from 'vitest';
import { initTrump } from '../../src/engine/trump';
import type { Card, Suit, Rank } from '../../src/engine/types';

const c = (suit: Suit, rank: Rank): Card => ({ suit, rank });
const hand8: Card[] = [
  c('hearts', '7'), c('hearts', '8'), c('hearts', '9'), c('hearts', '10'),
  c('clubs', 'J'), c('clubs', 'Q'), c('diamonds', 'K'), c('spades', 'A'),
];

describe('initTrump', () => {
  it('suit mode: concealed, suit set', () => {
    const t = initTrump({ kind: 'suit', suit: 'spades' }, hand8);
    expect(t).toMatchObject({ suit: 'spades', revealed: false, seventhCard: null });
  });
  it('seventh mode: suit = 7th dealt card (index 6), concealed', () => {
    const t = initTrump({ kind: 'seventh' }, hand8);
    expect(t.suit).toBe('diamonds');
    expect(t.seventhCard).toEqual(c('diamonds', 'K'));
    expect(t.revealed).toBe(false);
  });
  it('joker mode: no suit, counts as revealed', () => {
    const t = initTrump({ kind: 'joker' }, hand8);
    expect(t).toMatchObject({ suit: null, revealed: true, seventhCard: null });
  });
});
