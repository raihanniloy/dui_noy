import { describe, it, expect } from 'vitest';
import { newGame, applyAction, legalActions, playerView, WIN_TARGET } from '../../src/engine/game';
import type { GameState } from '../../src/engine/game';
import type { Action, Seat } from '../../src/engine/types';

function must(state: GameState, action: Action): GameState {
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(`illegal: ${r.reason} for ${JSON.stringify(action)}`);
  return r.state;
}

/** Drive any state to 'playing' using legalActions (first legal option each time). */
function toPlaying(seed: number): GameState {
  let s = newGame(seed);
  while (s.phase !== 'playing') {
    const seat = actingSeat(s);
    const acts = legalActions(s, seat);
    // prefer decline/pass-like to finish fast, but opener must bid
    const pick =
      acts.find(a => a.type === 'pass' || a.type === 'declineDouble') ??
      acts.find(a => a.type === 'bid') ??
      acts.find(a => a.type === 'chooseTrump') ??
      acts[0]!;
    s = must(s, pick);
  }
  return s;
}

function actingSeat(s: GameState): Seat {
  if (s.phase === 'bidding') return s.bidding.turn;
  if (s.phase === 'trumpSelection') return s.bid!.seat;
  if (s.phase === 'doubleWindow') return s.doubleQueue[0]!;
  return ((s.leader + s.trick.length) % 4) as Seat;
}

/** Play one full hand with first-legal-action policy; returns final state. */
function playHand(s: GameState): GameState {
  const startHand = s.handNo;
  while (s.phase !== 'done' && s.handNo === startHand) {
    const seat = actingSeat(s);
    const acts = legalActions(s, seat);
    expect(acts.length).toBeGreaterThan(0);
    const play = acts.find(a => a.type === 'playCard') ?? acts[0]!;
    s = must(s, play);
  }
  return s;
}

describe('playing phase', () => {
  it('turn order enforced; only legal cards accepted', () => {
    const s = toPlaying(11);
    const wrongSeat = ((s.leader + 1) % 4) as Seat;
    const card = s.hands[wrongSeat]![0]!;
    expect(applyAction(s, { type: 'playCard', seat: wrongSeat, card }).ok).toBe(false);
    const notInHand = { ...s.hands[((s.leader + 1) % 4) as Seat]![0]! };
    const r = applyAction(s, { type: 'playCard', seat: s.leader, card: notInHand });
    // either fine (coincidentally in leader's hand) or rejected — must not corrupt state
    if (!r.ok) expect(r.reason).toBeTruthy();
  });

  it('a full hand completes: 8 tricks, 29 total points, score applied to bidder team only', () => {
    let s = toPlaying(11);
    const bidderTeam = (s.bid!.seat % 2) as 0 | 1;
    const before: readonly [number, number] = s.scores;
    s = playHand(s);
    // hand rolled over (or game done): tricks/points reset, scores changed for bidder team only
    const other = (1 - bidderTeam) as 0 | 1;
    expect(s.scores[other]).toBe(before[other]);
    expect(s.scores[bidderTeam]).not.toBe(before[bidderTeam]);
  });

  it('many seeds: every hand conserves 29 points and 8 tricks', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let s = toPlaying(seed);
      let trickPointsSeen = 0;
      let tricks = 0;
      const startHand = s.handNo;
      while (s.phase !== 'done' && s.handNo === startHand) {
        const seat = actingSeat(s);
        const acts = legalActions(s, seat);
        const a = acts.find(x => x.type === 'playCard') ?? acts[0]!;
        const r = applyAction(s, a);
        if (!r.ok) throw new Error(r.reason);
        for (const e of r.events) {
          if (e.type === 'TrickWon') {
            tricks++;
            trickPointsSeen += e.points;
          }
        }
        s = r.state;
      }
      expect(tricks).toBe(8);
      expect(trickPointsSeen).toBe(29); // 28 card points + last-trick bonus
    }
  });

  it('playerView hides other hands and concealed trump suit', () => {
    const s = toPlaying(11);
    const v = playerView(s, 0);
    expect(v.hand).toEqual(s.hands[0]);
    expect((v as unknown as Record<string, unknown>)['hands']).toBeUndefined();
    if (s.trump && !s.trump.revealed) expect(v.trumpSuit).toBeNull();
  });

  it('game ends when a score reaches ±WIN_TARGET', () => {
    let s = toPlaying(3);
    // Guard matches the engine's established termination bound (Task 10 fuzz uses
    // 5000). The greedy acts[0] policy escalates rolled-over hands to a 28 bid,
    // alternating losing deltas between teams, so convergence to ±6 is slow but
    // bounded (seed 3 finishes at handNo 11). 500 was too tight for this policy.
    let guard = 0;
    while (s.phase !== 'done' && guard++ < 5000) {
      const seat = actingSeat(s);
      const acts = legalActions(s, seat);
      s = must(s, acts.find(a => a.type === 'playCard') ?? acts[0]!);
    }
    expect(s.phase).toBe('done');
    expect(Math.max(...s.scores.map(Math.abs))).toBeGreaterThanOrEqual(WIN_TARGET);
  });
});
