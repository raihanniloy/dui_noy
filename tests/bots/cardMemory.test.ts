import { describe, it, expect } from 'vitest';
import { emptyMemory, observe, isBoss, trumpsOut } from '../../src/bots/cardMemory';
import type { Card, Suit, Rank, GameEvent } from '../../src/engine/types';

const c = (suit: Suit, rank: Rank): Card => ({ suit, rank });
const played = (seat: number, card: Card): GameEvent => ({ type: 'CardPlayed', seat: seat as 0, card });

describe('cardMemory', () => {
  it('records plays and per-suit counts', () => {
    let m = emptyMemory();
    m = observe(m, played(0, c('hearts', 'A')), null);
    m = observe(m, played(1, c('hearts', '7')), 'hearts');
    expect(m.played.has('hearts-A')).toBe(true);
    expect(m.played.has('hearts-7')).toBe(true);
    expect(m.playedBySuit.hearts).toBe(2);
    expect(m.playedBySuit.spades).toBe(0);
  });

  it('records a void when a seat plays off the led suit', () => {
    let m = emptyMemory();
    m = observe(m, played(0, c('hearts', 'A')), null); // leads hearts
    m = observe(m, played(1, c('spades', '7')), 'hearts'); // seat 1 cannot follow hearts
    expect(m.voids[1].has('hearts')).toBe(true);
    expect(m.voids[0].has('hearts')).toBe(false);
  });

  it('no void when following suit', () => {
    let m = emptyMemory();
    m = observe(m, played(1, c('hearts', '9')), 'hearts');
    expect(m.voids[1].has('hearts')).toBe(false);
  });

  it('TrumpRevealed sets the flag', () => {
    let m = emptyMemory();
    expect(m.trumpRevealed).toBe(false);
    m = observe(m, { type: 'TrumpRevealed', suit: 'spades' }, null);
    expect(m.trumpRevealed).toBe(true);
  });

  it('isBoss: J always boss; 9 boss only after J of suit played', () => {
    let m = emptyMemory();
    expect(isBoss(c('hearts', 'J'), m)).toBe(true);
    expect(isBoss(c('hearts', '9'), m)).toBe(false); // J still out
    m = observe(m, played(0, c('hearts', 'J')), null);
    expect(isBoss(c('hearts', '9'), m)).toBe(true);
  });

  it('trumpsOut counts trump cards played', () => {
    let m = emptyMemory();
    m = observe(m, played(0, c('spades', '7')), null);
    m = observe(m, played(1, c('spades', 'K')), 'spades');
    expect(trumpsOut(m, 'spades')).toBe(2);
  });
});
