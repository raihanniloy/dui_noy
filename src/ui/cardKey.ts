// src/ui/cardKey.ts
import type { Card, Rank } from '../engine/types';

// Kenney number cards are zero-padded (07..10); faces pass through.
const RANK_CODE: Record<Rank, string> = {
  '7': '07', '8': '08', '9': '09', '10': '10',
  J: 'J', Q: 'Q', K: 'K', A: 'A',
};

/** Texture key for a card, e.g. `card_spades_07`. Unique per card (no duplicates in a deck). */
export function cardKey(card: Card): string {
  return `card_${card.suit}_${RANK_CODE[card.rank]}`;
}
