import { describe, it, expect } from 'vitest';
import { newGame, applyAction } from '../../src/engine/game';
import type { GameState } from '../../src/engine/game';
import type { Action, GameEvent, Seat } from '../../src/engine/types';

function must(state: GameState, action: Action): GameState {
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(`illegal: ${r.reason} for ${JSON.stringify(action)}`);
  return r.state;
}

/** Drive a fresh game to trumpSelection: opener bids 16, others pass. */
function toTrumpSelection(seed = 7): GameState {
  let s = newGame(seed);
  const opener = ((s.dealer + 1) % 4) as Seat;
  s = must(s, { type: 'bid', seat: opener, value: 16 });
  for (let i = 2; i <= 4; i++) {
    const seat = ((s.dealer + i) % 4) as Seat;
    s = must(s, { type: 'pass', seat });
  }
  return s;
}

describe('game setup flow', () => {
  it('newGame: bidding phase, 4 cards each, opener to act', () => {
    const s = newGame(1);
    expect(s.phase).toBe('bidding');
    for (const h of s.hands) expect(h).toHaveLength(4);
    expect(s.bidding.turn).toBe((s.dealer + 1) % 4);
    expect(s.stock).toHaveLength(16);
  });

  it('bidding done → second deal of 4 → trumpSelection, bidder to act', () => {
    const s = toTrumpSelection();
    expect(s.phase).toBe('trumpSelection');
    for (const h of s.hands) expect(h).toHaveLength(8);
    expect(s.stock).toHaveLength(0);
    expect(s.bid).toEqual({ seat: (s.dealer + 1) % 4, value: 16 });
  });

  it('only bidder may choose trump', () => {
    const s = toTrumpSelection();
    const notBidder = ((s.bid!.seat + 1) % 4) as Seat;
    const r = applyAction(s, { type: 'chooseTrump', seat: notBidder, mode: { kind: 'joker' } });
    expect(r.ok).toBe(false);
  });

  it('chooseTrump → doubleWindow with both opponents queued', () => {
    let s = toTrumpSelection();
    const bidder = s.bid!.seat;
    s = must(s, { type: 'chooseTrump', seat: bidder, mode: { kind: 'seventh' } });
    expect(s.phase).toBe('doubleWindow');
    expect(s.trump!.seventhCard).toEqual(s.hands[bidder]![6]);
    const opp = s.doubleQueue;
    expect(opp).toHaveLength(2);
    for (const o of opp) expect(o % 2).not.toBe(bidder % 2);
  });

  it('both opponents decline → playing, stake 1, left of dealer leads', () => {
    let s = toTrumpSelection();
    s = must(s, { type: 'chooseTrump', seat: s.bid!.seat, mode: { kind: 'suit', suit: 'hearts' } });
    s = must(s, { type: 'declineDouble', seat: s.doubleQueue[0]! });
    s = must(s, { type: 'declineDouble', seat: s.doubleQueue[0]! });
    expect(s.phase).toBe('playing');
    expect(s.stake).toBe(1);
    expect(s.leader).toBe((s.dealer + 1) % 4);
  });

  it('double → bid team may redouble; redouble → stake 4', () => {
    let s = toTrumpSelection();
    const bidder = s.bid!.seat;
    s = must(s, { type: 'chooseTrump', seat: bidder, mode: { kind: 'suit', suit: 'hearts' } });
    s = must(s, { type: 'double', seat: s.doubleQueue[0]! });
    expect(s.stake).toBe(2);
    expect(s.doubleQueue.every(q => q % 2 === bidder % 2)).toBe(true); // bid team responds
    s = must(s, { type: 'redouble', seat: s.doubleQueue[0]! });
    expect(s.stake).toBe(4);
    expect(s.phase).toBe('playing');
  });

  it('double then both bid-team decline → playing at stake 2', () => {
    let s = toTrumpSelection();
    s = must(s, { type: 'chooseTrump', seat: s.bid!.seat, mode: { kind: 'suit', suit: 'hearts' } });
    s = must(s, { type: 'double', seat: s.doubleQueue[0]! });
    s = must(s, { type: 'declineDouble', seat: s.doubleQueue[0]! });
    s = must(s, { type: 'declineDouble', seat: s.doubleQueue[0]! });
    expect(s.phase).toBe('playing');
    expect(s.stake).toBe(2);
  });

  it('event sequence: BiddingWon before second deal, TrumpChosen suit, Doubled before Redoubled, ends playing', () => {
    const allEvents: GameEvent[] = [];
    let s = newGame(7);
    const dealer = s.dealer;
    const opener = ((dealer + 1) % 4) as Seat;

    function step(action: Action): void {
      const r = applyAction(s, action);
      if (!r.ok) throw new Error(`illegal: ${r.reason} for ${JSON.stringify(action)}`);
      allEvents.push(...r.events);
      s = r.state;
    }

    step({ type: 'bid', seat: opener, value: 16 });
    for (let i = 2; i <= 4; i++) {
      step({ type: 'pass', seat: ((dealer + i) % 4) as Seat });
    }
    const bidder = s.bid!.seat;
    step({ type: 'chooseTrump', seat: bidder, mode: { kind: 'suit', suit: 'hearts' } });
    step({ type: 'double', seat: s.doubleQueue[0]! });
    step({ type: 'redouble', seat: s.doubleQueue[0]! });

    // BiddingWon occurs before second batch CardsDealt
    const bwIdx = allEvents.findIndex(e => e.type === 'BiddingWon');
    const firstCardsDealtIdx = allEvents.findIndex(e => e.type === 'CardsDealt');
    expect(bwIdx).toBeGreaterThanOrEqual(0);
    expect(firstCardsDealtIdx).toBeGreaterThan(bwIdx);

    // TrumpChosen has kind 'suit'
    const trumpChosen = allEvents.find(
      (e): e is Extract<GameEvent, { type: 'TrumpChosen' }> => e.type === 'TrumpChosen',
    );
    expect(trumpChosen).toBeDefined();
    expect(trumpChosen!.kind).toBe('suit');

    // Doubled then Redoubled in order
    const doubledIdx = allEvents.findIndex(e => e.type === 'Doubled');
    const redoubledIdx = allEvents.findIndex(e => e.type === 'Redoubled');
    expect(doubledIdx).toBeGreaterThanOrEqual(0);
    expect(redoubledIdx).toBeGreaterThan(doubledIdx);

    // final state phase 'playing'
    expect(s.phase).toBe('playing');
  });

  it('chooseTrump joker → trump.revealed===true, trump.suit===null', () => {
    let s = toTrumpSelection();
    const bidder = s.bid!.seat;
    s = must(s, { type: 'chooseTrump', seat: bidder, mode: { kind: 'joker' } });
    expect(s.trump!.revealed).toBe(true);
    expect(s.trump!.suit).toBeNull();
  });

  it('double from wrong seat (not first in queue) → not_your_turn', () => {
    let s = toTrumpSelection();
    s = must(s, { type: 'chooseTrump', seat: s.bid!.seat, mode: { kind: 'suit', suit: 'hearts' } });
    const wrongSeat = s.doubleQueue[1]!;
    const r = applyAction(s, { type: 'double', seat: wrongSeat });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_your_turn');
  });

  it('bid from wrong seat (not opener) → rejected', () => {
    const s = newGame(1);
    const wrongSeat = ((s.dealer + 2) % 4) as Seat;
    const r = applyAction(s, { type: 'bid', seat: wrongSeat, value: 16 });
    expect(r.ok).toBe(false);
  });
});
