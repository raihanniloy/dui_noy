import type { Card, Rank, Suit, TrumpMode } from '../engine/types';
import { SUITS } from '../engine/deck';
import { MIN_BID, MAX_BID } from '../engine/bidding';
import type { PlayerView } from '../engine/game';

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
