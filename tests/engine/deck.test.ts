import { describe, it, expect } from 'vitest';
import { makeDeck, mulberry32, shuffle, SUITS, RANKS } from '../../src/engine/deck';

describe('deck', () => {
  it('makes 32 unique cards, 8 per suit', () => {
    const deck = makeDeck();
    expect(deck).toHaveLength(32);
    const keys = new Set(deck.map(c => `${c.suit}-${c.rank}`));
    expect(keys.size).toBe(32);
    for (const s of SUITS) expect(deck.filter(c => c.suit === s)).toHaveLength(8);
  });

  it('shuffle is deterministic for a given seed and does not mutate input', () => {
    const deck = makeDeck();
    const a = shuffle(deck, mulberry32(42));
    const b = shuffle(deck, mulberry32(42));
    const c = shuffle(deck, mulberry32(43));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).not.toEqual(deck); // overwhelmingly likely
    expect(deck).toEqual(makeDeck()); // input untouched
  });

  it('rng outputs in [0,1)', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
