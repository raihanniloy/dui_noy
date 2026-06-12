// Game orchestrator — pure reducer engine.
// Rule decisions locked in this plan:
// 1. First bidder (seat left of dealer) is forced to open at 16 — no all-pass redeal.
// 2. The current highest bidder cannot pass; auction ends when the other three pass.
// 3. Must-trump applies only once trump is revealed.
// 4. Trump "active" for trick-winner evaluation is judged at end of trick.
// 5. Marriage declarable at declarer's turn under conditions (see Task 9).
// 6. Match ends when a team's score reaches +6 or −6 (WIN_TARGET).
//
// This file (Task 8) covers setup through the start of play. The `playing`
// phase is implemented in Task 9; here `handlePlaying` is a stub.

import type { Action, Card, GameEvent, Seat, Team } from './types';
import { teamOf } from './types';
import { makeDeck, mulberry32, shuffle, type Rng } from './deck';
import { initBidding, applyBid, applyPass, type BiddingState } from './bidding';
import { initTrump, type TrumpState } from './trump';
import type { Play } from './tricks';

export const WIN_TARGET = 6;

export type Phase = 'bidding' | 'trumpSelection' | 'doubleWindow' | 'playing' | 'done';

export interface GameState {
  readonly phase: Phase;
  readonly seed: number;
  readonly handNo: number;
  readonly dealer: Seat;
  readonly hands: readonly [Card[], Card[], Card[], Card[]];
  readonly stock: readonly Card[]; // second 4-card batches, dealt after bidding
  readonly bidding: BiddingState;
  readonly bid: { seat: Seat; value: number } | null;
  readonly trump: TrumpState | null;
  readonly doubleQueue: readonly Seat[];
  readonly stake: 1 | 2 | 4;
  readonly trick: readonly Play[];
  readonly leader: Seat;
  readonly trickNo: number;
  readonly cardPointsByTeam: readonly [number, number];
  readonly tricksByTeam: readonly [number, number];
  readonly marriageTeam: Team | null;
  readonly scores: readonly [number, number];
}

export type ApplyResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; reason: string };

const err = (reason: string): ApplyResult => ({ ok: false, reason });

/** Deterministic per-hand rng: seed mixed with hand number. */
const handRng = (seed: number, handNo: number): Rng => mulberry32(seed * 0x9e3779b1 + handNo);

function dealHand(base: {
  seed: number; handNo: number; dealer: Seat; scores: readonly [number, number];
}): { state: GameState; events: GameEvent[] } {
  const rng = handRng(base.seed, base.handNo);
  const deck = shuffle(makeDeck(), rng);
  // First 4 to each seat starting left of dealer; remaining 16 kept as stock.
  const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
  for (let i = 0; i < 16; i++) {
    hands[(((base.dealer + 1) + Math.floor(i / 4)) % 4) as Seat]!.push(deck[i]!);
  }
  const opener = ((base.dealer + 1) % 4) as Seat;
  const state: GameState = {
    phase: 'bidding',
    seed: base.seed,
    handNo: base.handNo,
    dealer: base.dealer,
    hands,
    stock: deck.slice(16),
    bidding: initBidding(opener),
    bid: null,
    trump: null,
    doubleQueue: [],
    stake: 1,
    trick: [],
    leader: opener,
    trickNo: 0,
    cardPointsByTeam: [0, 0],
    tricksByTeam: [0, 0],
    marriageTeam: null,
    scores: base.scores,
  };
  const events: GameEvent[] = [
    { type: 'HandStarted', dealer: base.dealer },
    ...([0, 1, 2, 3] as Seat[]).map(seat => ({ type: 'CardsDealt', seat, count: 4 }) as GameEvent),
  ];
  return { state, events };
}

export function newGame(seed: number): GameState {
  return dealHand({ seed, handNo: 0, dealer: 0, scores: [0, 0] }).state;
}

function dealSecondBatch(s: GameState): GameState {
  const hands = s.hands.map(h => [...h]) as [Card[], Card[], Card[], Card[]];
  for (let i = 0; i < 16; i++) {
    hands[(((s.dealer + 1) + Math.floor(i / 4)) % 4) as Seat]!.push(s.stock[i]!);
  }
  return { ...s, hands, stock: [] };
}

function handleBidding(s: GameState, a: Action): ApplyResult {
  const events: GameEvent[] = [];
  let b: BiddingState;
  if (a.type === 'bid') {
    const r = applyBid(s.bidding, a.seat, a.value);
    if (typeof r === 'string') return err(r);
    b = r;
    events.push({ type: 'BidPlaced', seat: a.seat, value: a.value });
  } else if (a.type === 'pass') {
    const r = applyPass(s.bidding, a.seat);
    if (typeof r === 'string') return err(r);
    b = r;
    events.push({ type: 'Passed', seat: a.seat });
  } else {
    return err('invalid_action_for_phase');
  }
  if (!b.done) return { ok: true, state: { ...s, bidding: b }, events };
  const bid = b.highest!;
  events.push({ type: 'BiddingWon', seat: bid.seat, value: bid.value });
  const dealt = dealSecondBatch({ ...s, bidding: b, bid });
  events.push(...([0, 1, 2, 3] as Seat[]).map(
    seat => ({ type: 'CardsDealt', seat, count: 4 }) as GameEvent,
  ));
  return { ok: true, state: { ...dealt, phase: 'trumpSelection' }, events };
}

function handleTrumpSelection(s: GameState, a: Action): ApplyResult {
  if (a.type !== 'chooseTrump') return err('invalid_action_for_phase');
  if (a.seat !== s.bid!.seat) return err('only_bidder_chooses_trump');
  const trump = initTrump(a.mode, s.hands[a.seat]!);
  const bidderTeam = teamOf(a.seat);
  const doubleQueue = ([0, 1, 2, 3] as Seat[]).filter(x => teamOf(x) !== bidderTeam);
  return {
    ok: true,
    state: { ...s, trump, doubleQueue, phase: 'doubleWindow' },
    events: [{ type: 'TrumpChosen', seat: a.seat, kind: a.mode.kind }],
  };
}

function startPlaying(s: GameState): GameState {
  return { ...s, doubleQueue: [], phase: 'playing', leader: ((s.dealer + 1) % 4) as Seat };
}

function handleDoubleWindow(s: GameState, a: Action): ApplyResult {
  if (a.type !== 'double' && a.type !== 'redouble' && a.type !== 'declineDouble') {
    return err('invalid_action_for_phase');
  }
  if (s.doubleQueue[0] !== a.seat) return err('not_your_turn');
  const bidderTeam = teamOf(s.bid!.seat);
  if (a.type === 'double') {
    if (teamOf(a.seat) === bidderTeam || s.stake !== 1) return err('cannot_double');
    const queue = ([0, 1, 2, 3] as Seat[]).filter(x => teamOf(x) === bidderTeam);
    return {
      ok: true,
      state: { ...s, stake: 2, doubleQueue: queue },
      events: [{ type: 'Doubled', seat: a.seat }],
    };
  }
  if (a.type === 'redouble') {
    if (teamOf(a.seat) !== bidderTeam || s.stake !== 2) return err('cannot_redouble');
    return {
      ok: true,
      state: startPlaying({ ...s, stake: 4 }),
      events: [{ type: 'Redoubled', seat: a.seat }],
    };
  }
  // declineDouble
  const rest = s.doubleQueue.slice(1);
  const events: GameEvent[] = [{ type: 'DoubleDeclined', seat: a.seat }];
  if (rest.length > 0) return { ok: true, state: { ...s, doubleQueue: rest }, events };
  return { ok: true, state: startPlaying(s), events };
}

export function applyAction(s: GameState, a: Action): ApplyResult {
  switch (s.phase) {
    case 'bidding':
      return handleBidding(s, a);
    case 'trumpSelection':
      return handleTrumpSelection(s, a);
    case 'doubleWindow':
      return handleDoubleWindow(s, a);
    case 'playing':
      return handlePlaying(s, a); // Task 9
    case 'done':
      return err('game_over');
  }
}

// Task 9 replaces this stub.
function handlePlaying(_s: GameState, _a: Action): ApplyResult {
  return err('not_implemented');
}

export { dealHand as __dealHand }; // internal: used by Task 9 for next-hand rollover
