import { describe, it, expect } from 'vitest';
import { makeBot } from '../../src/bots/bot';
import { newGame, applyAction, legalActions, playerView } from '../../src/engine/game';
import type { GameState, PlayerView } from '../../src/engine/game';
import type { Action, Seat, Card, Suit, Rank } from '../../src/engine/types';
import { mulberry32 } from '../../src/engine/deck';
import { emptyMemory } from '../../src/bots/cardMemory';

const c = (suit: Suit, rank: Rank): Card => ({ suit, rank });

function actingSeat(s: GameState): Seat {
  if (s.phase === 'bidding') return s.bidding.turn;
  if (s.phase === 'trumpSelection') return s.bid!.seat;
  if (s.phase === 'doubleWindow') return s.doubleQueue[0]!;
  return ((s.leader + s.trick.length) % 4) as Seat;
}

// Minimal playing-phase view; trump concealed/joker so no trump-conserve penalty.
const leadView = (hand: Card[]): PlayerView => ({
  seat: 0, phase: 'playing', hand, dealer: 0,
  bidding: { turn: 0, highest: null, passed: [false, false, false, false], done: false },
  bid: { seat: 0, value: 16 }, trumpKind: 'joker', trumpSuit: null, trumpRevealed: false,
  stake: 1, trick: [], leader: 0, trickNo: 0, cardPointsByTeam: [0, 0], tricksByTeam: [0, 0],
  marriageTeam: null, scores: [0, 0], doubleQueue: [],
} as PlayerView);

describe('bot.decideAction', () => {
  it('always returns an action present in legalActions', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const bot = makeBot('hard', mulberry32(seed));
      let s = newGame(seed);
      let guard = 0;
      while (s.phase !== 'done' && guard++ < 4000) {
        const seat = actingSeat(s);
        const legal = legalActions(s, seat);
        const a = bot.decideAction(playerView(s, seat), legal, emptyMemory());
        const found = legal.some(x => JSON.stringify(x) === JSON.stringify(a));
        expect(found).toBe(true);
        const r = applyAction(s, a);
        expect(r.ok).toBe(true);
        if (!r.ok) break;
        s = r.state;
      }
      expect(s.phase).toBe('done');
    }
  });

  it('hard bot is deterministic for a fixed state', () => {
    const s = newGame(5);
    const seat = actingSeat(s);
    const legal = legalActions(s, seat);
    const view = playerView(s, seat);
    const a1 = makeBot('hard', mulberry32(1)).decideAction(view, legal, emptyMemory());
    const a2 = makeBot('hard', mulberry32(999)).decideAction(view, legal, emptyMemory());
    expect(JSON.stringify(a1)).toBe(JSON.stringify(a2)); // rng ignored when hard
  });

  it('easy bot varies its pick across rng draws when scores are close', () => {
    // Leading with four low, non-boss cards (higher ranks of each suit are unplayed,
    // so none is boss). Base scores cluster in [0, 0.1]; NOISE=4 jitter reorders them.
    const hand = [c('hearts', '7'), c('clubs', '8'), c('diamonds', '7'), c('spades', '8')];
    const view = leadView(hand);
    const legal: Action[] = hand.map(card => ({ type: 'playCard', seat: 0, card }));
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const a = makeBot('easy', mulberry32(i + 1)).decideAction(view, legal, emptyMemory());
      seen.add(JSON.stringify(a));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('hard bot does not vary on the same close-scores state', () => {
    const hand = [c('hearts', '7'), c('clubs', '8'), c('diamonds', '7'), c('spades', '8')];
    const view = leadView(hand);
    const legal: Action[] = hand.map(card => ({ type: 'playCard', seat: 0, card }));
    const a1 = makeBot('hard', mulberry32(3)).decideAction(view, legal, emptyMemory());
    const a2 = makeBot('hard', mulberry32(77)).decideAction(view, legal, emptyMemory());
    expect(JSON.stringify(a1)).toBe(JSON.stringify(a2));
  });
});
