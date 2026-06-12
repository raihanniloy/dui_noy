import { describe, it, expect } from 'vitest';
import { rankStrength, legalPlays, trickWinner } from '../../src/engine/tricks';
import type { Card, Suit, Rank } from '../../src/engine/types';

const c = (suit: Suit, rank: Rank): Card => ({ suit, rank });

describe('rankStrength', () => {
  it('orders J > 9 > A > 10 > K > Q > 8 > 7', () => {
    const order: Rank[] = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
    for (let i = 1; i < order.length; i++) {
      expect(rankStrength(order[i]!)).toBeGreaterThan(rankStrength(order[i - 1]!));
    }
  });
});

describe('legalPlays', () => {
  const hand = [c('hearts', 'J'), c('hearts', '7'), c('spades', '9'), c('clubs', 'A')];
  it('leading: anything', () => {
    expect(legalPlays(hand, null, 'spades', true)).toHaveLength(4);
  });
  it('must follow led suit', () => {
    expect(legalPlays(hand, 'hearts', 'spades', true)).toEqual([c('hearts', 'J'), c('hearts', '7')]);
  });
  it('cannot follow + trump revealed: must trump', () => {
    expect(legalPlays(hand, 'diamonds', 'spades', true)).toEqual([c('spades', '9')]);
  });
  it('cannot follow + trump concealed: anything', () => {
    expect(legalPlays(hand, 'diamonds', 'spades', false)).toHaveLength(4);
  });
  it('cannot follow + no trump in hand: anything', () => {
    const noTrump = [c('hearts', 'J'), c('clubs', 'A')];
    expect(legalPlays(noTrump, 'diamonds', 'spades', true)).toHaveLength(2);
  });
  it('joker mode (trumpSuit null): follow or anything', () => {
    expect(legalPlays(hand, 'diamonds', null, true)).toHaveLength(4);
  });
});

describe('trickWinner', () => {
  it('highest of led suit wins without trump', () => {
    const winner = trickWinner(
      [
        { seat: 0, card: c('hearts', 'A') },
        { seat: 1, card: c('hearts', '9') },
        { seat: 2, card: c('clubs', 'J') }, // off-suit J loses
        { seat: 3, card: c('hearts', '7') },
      ],
      null,
    );
    expect(winner).toBe(1); // 9 beats A in 29
  });
  it('any trump beats led suit', () => {
    const winner = trickWinner(
      [
        { seat: 0, card: c('hearts', 'J') },
        { seat: 1, card: c('spades', '7') },
        { seat: 2, card: c('hearts', '9') },
        { seat: 3, card: c('hearts', 'A') },
      ],
      'spades',
    );
    expect(winner).toBe(1);
  });
  it('highest trump wins among trumps', () => {
    const winner = trickWinner(
      [
        { seat: 0, card: c('hearts', 'A') },
        { seat: 1, card: c('spades', '7') },
        { seat: 2, card: c('spades', '9') },
        { seat: 3, card: c('spades', 'J') },
      ],
      'spades',
    );
    expect(winner).toBe(3);
  });
});
