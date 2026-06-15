// Game orchestrator — pure reducer engine.
// Rule decisions locked in this plan:
// 1. First bidder (seat left of dealer) is forced to open at 16 — no all-pass redeal.
// 2. The current highest bidder cannot pass; auction ends when the other three pass.
// 3. Must-trump applies only once trump is revealed.
// 4. Trump "active" for trick-winner evaluation is judged at end of trick.
// 5. Marriage declarable at declarer's turn under conditions (see Task 9).
// 6. Match ends when a team's score reaches +6 or −6 (WIN_TARGET).
//
// This file covers setup through the full playing phase: reveal, marriage,
// trick resolution, hand scoring, and hand rollover.

import type { Action, Card, GameEvent, Seat, Suit, Team } from './types';
import { teamOf, sameCard } from './types';
import { makeDeck, mulberry32, shuffle, type Rng } from './deck';
import { initBidding, applyBid, applyPass, MIN_BID, MAX_BID, type BiddingState } from './bidding';
import { initTrump, type TrumpState } from './trump';
import { legalPlays, trickWinner, type Play } from './tricks';
import { scoreHand, trickPoints } from './scoring';

export const WIN_TARGET = 6;

export type Phase = 'bidding' | 'trumpSelection' | 'doubleWindow' | 'playing' | 'done';

export interface GameState {
  readonly phase: Phase;
  readonly seed: number;
  readonly handNo: number;
  readonly dealer: Seat;
  readonly hands: readonly [readonly Card[], readonly Card[], readonly Card[], readonly Card[]];
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

/** Internal: hand setup/rollover. Exported for game.ts continuation + tests. */
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
  const hands: [Card[], Card[], Card[], Card[]] = [
    [...s.hands[0]], [...s.hands[1]], [...s.hands[2]], [...s.hands[3]],
  ];
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
  if (!s.bid) return err('internal_bid_missing');
  if (a.seat !== s.bid.seat) return err('only_bidder_chooses_trump');
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
  if (!s.bid) return err('internal_bid_missing');
  const bidderTeam = teamOf(s.bid.seat);
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

function actingSeatPlaying(s: GameState): Seat {
  return ((s.leader + s.trick.length) % 4) as Seat;
}

/** Seat whose turn it is. Caller must guard `phase !== 'done'` (done has no actor). */
export function currentSeat(s: GameState): Seat {
  if (s.phase === 'bidding') return s.bidding.turn;
  if (s.phase === 'trumpSelection') return s.bid!.seat;
  if (s.phase === 'doubleWindow') return s.doubleQueue[0]!;
  return actingSeatPlaying(s); // 'playing'
}

function handlePlaying(s: GameState, a: Action): ApplyResult {
  // Guard internal invariants once (decision: playing requires trump + bid set).
  if (!s.trump || !s.bid) return err('internal_state_missing');
  const trumpSuit = s.trump.suit;
  const revealed = s.trump.revealed;
  const ledSuit = s.trick.length > 0 ? s.trick[0]!.card.suit : null;
  const turn = actingSeatPlaying(s);

  if (a.type === 'revealTrump') {
    if (a.seat !== turn) return err('not_your_turn');
    if (revealed || trumpSuit === null) return err('trump_already_revealed');
    if (ledSuit === null) return err('cannot_reveal_when_leading');
    if (s.hands[a.seat]!.some(c => c.suit === ledSuit)) return err('can_follow_suit');
    return {
      ok: true,
      state: { ...s, trump: { ...s.trump, revealed: true } },
      events: [{ type: 'TrumpRevealed', suit: trumpSuit }],
    };
  }

  if (a.type === 'declareMarriage') {
    if (a.seat !== turn) return err('not_your_turn');
    if (!revealed || trumpSuit === null) return err('trump_not_revealed');
    if (s.marriageTeam !== null) return err('marriage_already_declared');
    if (s.tricksByTeam[teamOf(a.seat)] === 0) return err('team_has_no_trick');
    const hand = s.hands[a.seat]!;
    const hasK = hand.some(c => c.suit === trumpSuit && c.rank === 'K');
    const hasQ = hand.some(c => c.suit === trumpSuit && c.rank === 'Q');
    if (!hasK || !hasQ) return err('no_marriage_in_hand');
    const team = teamOf(a.seat);
    return {
      ok: true,
      state: { ...s, marriageTeam: team },
      events: [{ type: 'MarriageDeclared', seat: a.seat, team }],
    };
  }

  if (a.type !== 'playCard') return err('invalid_action_for_phase');
  if (a.seat !== turn) return err('not_your_turn');
  const hand = s.hands[a.seat]!;
  if (!hand.some(c => sameCard(c, a.card))) return err('card_not_in_hand');
  const legal = legalPlays(hand, ledSuit, trumpSuit, revealed);
  if (!legal.some(c => sameCard(c, a.card))) return err('illegal_card');

  // Remove the played card from the acting seat's hand; build the 4-tuple explicitly.
  const updatedHand: readonly Card[] = hand.filter(c => !sameCard(c, a.card));
  const hands: GameState['hands'] = [
    a.seat === 0 ? updatedHand : s.hands[0],
    a.seat === 1 ? updatedHand : s.hands[1],
    a.seat === 2 ? updatedHand : s.hands[2],
    a.seat === 3 ? updatedHand : s.hands[3],
  ];
  const trick: readonly Play[] = [...s.trick, { seat: a.seat, card: a.card }];
  const events: GameEvent[] = [{ type: 'CardPlayed', seat: a.seat, card: a.card }];

  if (trick.length < 4) {
    return { ok: true, state: { ...s, hands, trick }, events };
  }

  // Trick complete. Trump active if revealed by end of trick (rule decision 4).
  // revealTrump sets state.trump.revealed immediately, so by the 4th card of any
  // trick containing a post-reveal play, `revealed` is already true here.
  const trumpForTrick = s.trump.suit !== null && s.trump.revealed ? s.trump.suit : null;
  const winner = trickWinner(trick, trumpForTrick);
  const winnerTeam = teamOf(winner);
  const pts = trickPoints(trick.map(p => p.card)) + (s.trickNo === 7 ? 1 : 0);
  const cardPointsByTeam: readonly [number, number] = [
    winnerTeam === 0 ? s.cardPointsByTeam[0] + pts : s.cardPointsByTeam[0],
    winnerTeam === 1 ? s.cardPointsByTeam[1] + pts : s.cardPointsByTeam[1],
  ];
  const tricksByTeam: readonly [number, number] = [
    winnerTeam === 0 ? s.tricksByTeam[0] + 1 : s.tricksByTeam[0],
    winnerTeam === 1 ? s.tricksByTeam[1] + 1 : s.tricksByTeam[1],
  ];
  events.push({ type: 'TrickWon', seat: winner, points: pts });

  const next: GameState = {
    ...s, hands, trick: [], leader: winner, trickNo: s.trickNo + 1,
    cardPointsByTeam, tricksByTeam,
  };

  if (next.trickNo < 8) return { ok: true, state: next, events };

  // Hand over — score it; delta applies to bidder team only (decision 5/6).
  const bidderTeam = teamOf(s.bid.seat);
  const outcome = scoreHand({
    bid: s.bid.value,
    bidderTeam,
    cardPointsByTeam,
    tricksByTeam,
    marriageTeam: s.marriageTeam,
    stake: s.stake,
  });
  const scores: readonly [number, number] = [
    bidderTeam === 0 ? next.scores[0] + outcome.delta : next.scores[0],
    bidderTeam === 1 ? next.scores[1] + outcome.delta : next.scores[1],
  ];
  events.push({
    type: 'HandScored', bidderTeam, target: outcome.target,
    points: cardPointsByTeam[bidderTeam], success: outcome.success, delta: outcome.delta,
  });

  if (scores.some(v => Math.abs(v) >= WIN_TARGET)) {
    events.push({ type: 'GameOver', scores });
    return { ok: true, state: { ...next, scores, phase: 'done' }, events };
  }

  const rolled = dealHand({
    seed: s.seed, handNo: s.handNo + 1,
    dealer: ((s.dealer + 1) % 4) as Seat, scores,
  });
  events.push(...rolled.events);
  return { ok: true, state: rolled.state, events };
}

export interface PlayerView {
  seat: Seat;
  phase: Phase;
  hand: readonly Card[];
  dealer: Seat;
  bidding: BiddingState;
  bid: GameState['bid'];
  trumpKind: 'suit' | 'seventh' | 'joker' | null;
  trumpSuit: Suit | null; // null unless revealed, joker (stays null), or viewer is bidder
  trumpRevealed: boolean;
  stake: 1 | 2 | 4;
  trick: readonly Play[];
  leader: Seat;
  trickNo: number;
  cardPointsByTeam: readonly [number, number];
  tricksByTeam: readonly [number, number];
  marriageTeam: Team | null;
  scores: readonly [number, number];
  doubleQueue: readonly Seat[];
}

export function playerView(s: GameState, seat: Seat): PlayerView {
  const isBidder = s.bid?.seat === seat;
  const t = s.trump;
  return {
    seat,
    phase: s.phase,
    hand: s.hands[seat]!,
    dealer: s.dealer,
    bidding: s.bidding,
    bid: s.bid,
    trumpKind: t?.mode.kind ?? null,
    trumpSuit: t && (t.revealed || isBidder) ? t.suit : null,
    trumpRevealed: t?.revealed ?? false,
    stake: s.stake,
    trick: s.trick,
    leader: s.leader,
    trickNo: s.trickNo,
    cardPointsByTeam: s.cardPointsByTeam,
    tricksByTeam: s.tricksByTeam,
    marriageTeam: s.marriageTeam,
    scores: s.scores,
    doubleQueue: s.doubleQueue,
  };
}

export function legalActions(s: GameState, seat: Seat): Action[] {
  const acts: Action[] = [];
  if (s.phase === 'bidding') {
    if (s.bidding.turn !== seat) return [];
    const floor = (s.bidding.highest?.value ?? MIN_BID - 1) + 1;
    for (let v = Math.max(MIN_BID, floor); v <= MAX_BID; v++) {
      acts.push({ type: 'bid', seat, value: v });
    }
    if (s.bidding.highest !== null && s.bidding.highest.seat !== seat) {
      acts.push({ type: 'pass', seat });
    }
    return acts;
  }
  if (s.phase === 'trumpSelection') {
    if (s.bid!.seat !== seat) return [];
    for (const suit of ['clubs', 'diamonds', 'hearts', 'spades'] as const) {
      acts.push({ type: 'chooseTrump', seat, mode: { kind: 'suit', suit } });
    }
    acts.push({ type: 'chooseTrump', seat, mode: { kind: 'seventh' } });
    acts.push({ type: 'chooseTrump', seat, mode: { kind: 'joker' } });
    return acts;
  }
  if (s.phase === 'doubleWindow') {
    if (s.doubleQueue[0] !== seat) return [];
    acts.push({ type: 'declineDouble', seat });
    if (s.stake === 1) acts.push({ type: 'double', seat });
    if (s.stake === 2) acts.push({ type: 'redouble', seat });
    return acts;
  }
  if (s.phase === 'playing') {
    if (actingSeatPlaying(s) !== seat) return [];
    const t = s.trump!;
    const ledSuit = s.trick.length > 0 ? s.trick[0]!.card.suit : null;
    const hand = s.hands[seat]!;
    if (
      ledSuit !== null && !t.revealed && t.suit !== null &&
      !hand.some(c => c.suit === ledSuit)
    ) {
      acts.push({ type: 'revealTrump', seat });
    }
    if (
      t.revealed && t.suit !== null && s.marriageTeam === null &&
      s.tricksByTeam[teamOf(seat)] > 0 &&
      hand.some(c => c.suit === t.suit && c.rank === 'K') &&
      hand.some(c => c.suit === t.suit && c.rank === 'Q')
    ) {
      acts.push({ type: 'declareMarriage', seat });
    }
    for (const card of legalPlays(hand, ledSuit, t.suit, t.revealed)) {
      acts.push({ type: 'playCard', seat, card });
    }
    return acts;
  }
  return [];
}

export { dealHand };
