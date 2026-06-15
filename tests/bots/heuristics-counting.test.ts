import { describe, it, expect } from 'vitest';
import { scorePlay } from '../../src/bots/heuristics';
import { emptyMemory, observe } from '../../src/bots/cardMemory';
import type { Card, Suit, Rank, GameEvent, Seat } from '../../src/engine/types';
import type { PlayerView } from '../../src/engine/game';

const c = (suit: Suit, rank: Rank): Card => ({ suit, rank });
const play = (seat: number, card: Card): GameEvent => ({ type: 'CardPlayed', seat: seat as Seat, card });

const view = (over: Partial<PlayerView>): PlayerView => ({
  seat: 0, phase: 'playing', hand: [], dealer: 0,
  bidding: { turn: 0, highest: null, passed: [false,false,false,false], done: false },
  bid: { seat: 0, value: 16 }, trumpKind: 'suit', trumpSuit: 'spades', trumpRevealed: true,
  stake: 1, trick: [], leader: 0, trickNo: 0, cardPointsByTeam: [0,0], tricksByTeam: [0,0],
  marriageTeam: null, scores: [0,0], doubleQueue: [],
  ...over,
} as PlayerView);

describe('scorePlay uses voids', () => {
  it('a boss lead is worth less when an opponent is void in that suit (trump live)', () => {
    const v = view({ trumpSuit: 'spades', trumpRevealed: true, trick: [] });
    const memNoVoid = emptyMemory();
    const memVoid = observe(emptyMemory(), play(1, c('clubs', '7')), 'hearts'); // seat 1 void hearts
    const lead = c('hearts', 'J'); // boss (nothing higher)
    expect(scorePlay(lead, v, memVoid)).toBeLessThan(scorePlay(lead, v, memNoVoid));
  });

  it('no void penalty against a partner void (only opponents matter)', () => {
    const v = view({ trumpSuit: 'spades', trumpRevealed: true, trick: [] });
    const memNoVoid = emptyMemory();
    const memPartnerVoid = observe(emptyMemory(), play(2, c('clubs', '7')), 'hearts'); // seat 2 = partner
    const lead = c('hearts', 'J');
    expect(scorePlay(lead, v, memPartnerVoid)).toBe(scorePlay(lead, v, memNoVoid));
  });
});

describe('scorePlay uses trumps-out', () => {
  it('trumping to win costs less as more trumps are gone', () => {
    const v = view({ trumpSuit: 'spades', trumpRevealed: true, seat: 0,
      trick: [{ seat: 3, card: c('hearts', 'A') }] }); // hearts led; we trump with spades
    let memHi = emptyMemory();
    for (const r of ['8', '9', '10', 'J'] as Rank[]) memHi = observe(memHi, play(1, c('spades', r)), 'clubs');
    const memLo = emptyMemory();
    const trumpWin = c('spades', '7');
    expect(scorePlay(trumpWin, v, memHi)).toBeGreaterThan(scorePlay(trumpWin, v, memLo));
  });
});
