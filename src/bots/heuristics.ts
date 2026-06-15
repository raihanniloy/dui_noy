import type { Card, Rank, Suit, TrumpMode } from '../engine/types';
import { teamOf } from '../engine/types';
import { SUITS } from '../engine/deck';
import { MIN_BID, MAX_BID } from '../engine/bidding';
import type { PlayerView } from '../engine/game';
import { rankStrength, trickWinner } from '../engine/tricks';
import { cardPoints } from '../engine/scoring';
import { isBoss, type CardMemory } from './cardMemory';

const CONTROL: Partial<Record<Rank, number>> = { J: 4, '9': 3, A: 2, '10': 1 };

export function handStrength(hand: readonly Card[]): number {
  let s = 0;
  for (const c of hand) s += CONTROL[c.rank] ?? 0;
  for (const suit of SUITS) {
    const len = hand.filter(c => c.suit === suit).length;
    if (len > 2) s += len - 2; // length bonus past a doubleton
  }
  return s;
}

export function bidDecision(view: PlayerView): { value: number } | { pass: true } {
  const strength = handStrength(view.hand);
  if (strength < 8) return { pass: true };
  const want = Math.min(MAX_BID, MIN_BID + Math.max(0, Math.floor((strength - 8) / 2)));
  const floor = (view.bidding.highest?.value ?? MIN_BID - 1) + 1;
  const value = Math.max(MIN_BID, floor);
  if (value > want) return { pass: true }; // market rose above our ceiling (want <= MAX_BID)
  return { value };
}

export function chooseTrumpMode(hand: readonly Card[]): TrumpMode {
  let best: Suit = SUITS[0]!;
  let bestScore = -1;
  for (const suit of SUITS) {
    const cards = hand.filter(c => c.suit === suit);
    const score = cards.length * 2 + cards.reduce((a, c) => a + (CONTROL[c.rank] ?? 0), 0);
    if (score > bestScore) { bestScore = score; best = suit; }
  }
  const longest = hand.filter(c => c.suit === best).length;
  if (longest <= 2) return { kind: 'seventh' }; // balanced-weak gamble
  return { kind: 'suit', suit: best };
}

export function doubleDecision(view: PlayerView): 'double' | 'redouble' | 'decline' {
  const strength = handStrength(view.hand);
  if (view.stake === 2) return strength >= 12 ? 'redouble' : 'decline'; // bid team responding
  return strength >= 11 ? 'double' : 'decline'; // opponent considering double
}

/** Heuristic value of playing `card` from the current view. Higher = better. */
export function scorePlay(card: Card, view: PlayerView, mem: CardMemory): number {
  const trump = view.trumpSuit; // null when concealed to this seat or joker
  const revealed = view.trumpRevealed;
  const trick = view.trick;
  const ledSuit = trick.length > 0 ? trick[0]!.card.suit : null;

  if (ledSuit === null) {
    // Leading.
    let s = 0;
    if (isBoss(card, mem)) s += 10;
    s += rankStrength(card.rank) * 0.1;
    if (trump !== null && revealed && card.suit === trump) s -= 5; // conserve trump
    return s;
  }

  // Following: evaluate the trick as if we played `card`.
  const trumpForEval = revealed && trump !== null ? trump : null;
  const hypothetical = [...trick, { seat: view.seat, card }];
  const weWin = trickWinner(hypothetical, trumpForEval) === view.seat;
  const partnerWinningNow =
    trick.length > 0 && teamOf(trickWinner(trick, trumpForEval)) === teamOf(view.seat);
  const trickPts = hypothetical.reduce((a, p) => a + cardPoints(p.card), 0);

  let s = 0;
  if (weWin) {
    s += 5 + trickPts; // take the trick and its points
    s -= rankStrength(card.rank) * 0.3; // win as cheaply as possible
    if (trump !== null && card.suit === trump) s -= 2; // mild trump cost
  } else {
    if (partnerWinningNow) s += cardPoints(card); // feed points to partner
    else s -= cardPoints(card); // deny points to opponents
    s -= rankStrength(card.rank) * 0.1; // throw weak cards
  }
  return s;
}

/** Reveal trump when it can benefit us. Bidder (knows suit) reveals only holding trump. */
export function revealDecision(view: PlayerView): boolean {
  if (view.trumpSuit !== null) return view.hand.some(c => c.suit === view.trumpSuit);
  return true; // concealed to us — reveal to seek the must-trump advantage
}

/** Declaring marriage always shifts the target in our team's favor. */
export function marriageDecision(_view: PlayerView): boolean {
  return true;
}
