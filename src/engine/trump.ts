// Trump modes (rule decision from plan):
// - suit: bidder names a suit, kept concealed until revealed during play.
// - seventh: trump suit is determined by the 7th card dealt to the bidder (index 6), concealed.
// - joker: no trump suit; treated as already "revealed" (nothing to reveal).

import type { Card, Suit, TrumpMode } from './types';

export interface TrumpState {
  readonly mode: TrumpMode; // kept for event emission (TrumpChosen needs kind) and 7th-card UX
  readonly suit: Suit | null; // null only in joker mode
  readonly revealed: boolean; // joker mode is born "revealed" (nothing to reveal)
  readonly seventhCard: Card | null;
}

/** bidderHand must be the full 8-card hand in deal order; index 6 is the 7th dealt card. */
export function initTrump(mode: TrumpMode, bidderHand: readonly Card[]): TrumpState {
  if (mode.kind === 'joker') {
    return { mode, suit: null, revealed: true, seventhCard: null };
  }
  if (mode.kind === 'seventh') {
    const seventh = bidderHand[6]!;
    return { mode, suit: seventh.suit, revealed: false, seventhCard: seventh };
  }
  // suit mode
  return { mode, suit: mode.suit, revealed: false, seventhCard: null };
}
