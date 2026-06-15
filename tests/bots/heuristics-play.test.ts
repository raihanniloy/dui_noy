import { describe, it, expect } from 'vitest';
import { scorePlay, revealDecision, marriageDecision } from '../../src/bots/heuristics';
import { emptyMemory } from '../../src/bots/cardMemory';
import type { Card, Suit, Rank } from '../../src/engine/types';
import type { PlayerView } from '../../src/engine/game';

const c = (suit: Suit, rank: Rank): Card => ({ suit, rank });

const playView = (over: Partial<PlayerView>): PlayerView => ({
  seat: 0, phase: 'playing', hand: [], dealer: 0,
  bidding: { turn: 0, highest: null, passed: [false,false,false,false], done: false },
  bid: { seat: 0, value: 16 }, trumpKind: 'suit', trumpSuit: 'spades', trumpRevealed: true,
  stake: 1, trick: [], leader: 0, trickNo: 0, cardPointsByTeam: [0,0], tricksByTeam: [0,0],
  marriageTeam: null, scores: [0,0], doubleQueue: [],
  ...over,
} as PlayerView);

describe('scorePlay (following)', () => {
  it('prefers the cheaper of two winning cards of the led suit', () => {
    const v = playView({ trumpSuit: 'spades', trumpRevealed: true,
      trick: [{ seat: 3, card: c('hearts', '7') }] });
    const mem = emptyMemory();
    const sA = scorePlay(c('hearts', 'A'), v, mem);
    const s10 = scorePlay(c('hearts', '10'), v, mem);
    expect(s10).toBeGreaterThan(sA); // win cheaply: 10 beats 7, ranks lower than A
  });

  it('when losing, throws the low-point card and keeps the Ace', () => {
    // Led card: hearts J (highest hearts — we cannot beat it).
    // Candidates: hearts 7 (0 pt) vs hearts A (1 pt). Keep the Ace, throw the 7.
    const v = playView({ trumpSuit: 'spades', trumpRevealed: true,
      trick: [{ seat: 3, card: c('hearts', 'J') }] }); // J leads, unbeatable in hearts
    const mem = emptyMemory();
    const s7 = scorePlay(c('hearts', '7'), v, mem);
    const sA = scorePlay(c('hearts', 'A'), v, mem);
    expect(s7).toBeGreaterThan(sA); // throw 7 (0 pt), keep Ace (1 pt)
  });

  it('feeds points to a partner who is currently winning the trick', () => {
    // Partner (seat 2) leads hearts J — currently winning. We (seat 0) cannot beat it,
    // so dumping a point card onto the partner-won trick scores higher than a zero-point card.
    const v = playView({ trumpSuit: 'spades', trumpRevealed: true, seat: 0,
      trick: [{ seat: 2, card: c('hearts', 'J') }] });
    const mem = emptyMemory();
    const sAce = scorePlay(c('hearts', 'A'), v, mem); // 1 point fed to partner
    const s7 = scorePlay(c('hearts', '7'), v, mem);   // 0 points
    expect(sAce).toBeGreaterThan(s7);
  });
});

describe('scorePlay (leading)', () => {
  it('prefers leading a boss card', () => {
    const v = playView({ trick: [] });
    const mem = emptyMemory();
    expect(scorePlay(c('hearts', 'J'), v, mem)).toBeGreaterThan(scorePlay(c('hearts', '7'), v, mem));
  });
});

describe('revealDecision', () => {
  it('bidder with no trump in hand does not reveal', () => {
    const v = playView({ trumpSuit: 'spades', hand: [c('hearts','7'), c('clubs','9')] });
    expect(revealDecision(v)).toBe(false);
  });
  it('bidder holding trump reveals', () => {
    const v = playView({ trumpSuit: 'spades', hand: [c('spades','7'), c('clubs','9')] });
    expect(revealDecision(v)).toBe(true);
  });
  it('trump concealed to viewer: reveals (gamble)', () => {
    const v = playView({ trumpSuit: null, hand: [c('hearts','7')] });
    expect(revealDecision(v)).toBe(true);
  });
});

describe('marriageDecision', () => {
  it('always declares when offered (target shift favors own team)', () => {
    expect(marriageDecision(playView({}))).toBe(true);
  });
});
