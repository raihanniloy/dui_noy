import type { Card, Rank, Seat, Suit } from './types';

const STRENGTH: readonly Rank[] = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
export const rankStrength = (r: Rank): number => STRENGTH.indexOf(r);

export interface Play { readonly seat: Seat; readonly card: Card }

/** trumpSuit null = joker mode or trump treated as inactive. */
export function trickWinner(plays: readonly Play[], trumpSuit: Suit | null): Seat {
  if (plays.length === 0) throw new Error('trickWinner: empty trick');
  let best = plays[0]!;
  for (const p of plays.slice(1)) {
    const bTrump = trumpSuit !== null && best.card.suit === trumpSuit;
    const cTrump = trumpSuit !== null && p.card.suit === trumpSuit;
    if (cTrump && !bTrump) {
      best = p;
    } else if (
      cTrump === bTrump &&
      p.card.suit === best.card.suit &&
      rankStrength(p.card.rank) > rankStrength(best.card.rank)
    ) {
      best = p;
    }
  }
  return best.seat;
}

export function legalPlays(
  hand: readonly Card[],
  ledSuit: Suit | null,
  trumpSuit: Suit | null,
  trumpRevealed: boolean,
): Card[] {
  if (ledSuit === null) return [...hand];
  const follow = hand.filter(c => c.suit === ledSuit);
  if (follow.length > 0) return follow;
  if (trumpRevealed && trumpSuit !== null) {
    const trumps = hand.filter(c => c.suit === trumpSuit);
    if (trumps.length > 0) return trumps;
  }
  return [...hand];
}
