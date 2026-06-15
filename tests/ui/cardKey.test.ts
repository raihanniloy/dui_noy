import { describe, it, expect } from 'vitest';
import { cardKey } from '../../src/ui/cardKey';
import { makeDeck } from '../../src/engine/deck';
import { cardsMedium } from '../../assets.js';

describe('cardKey', () => {
  it('maps a card to the Kenney key format', () => {
    expect(cardKey({ suit: 'spades', rank: '7' })).toBe('card_spades_07');
    expect(cardKey({ suit: 'hearts', rank: '10' })).toBe('card_hearts_10');
    expect(cardKey({ suit: 'clubs', rank: 'A' })).toBe('card_clubs_A');
  });

  it('maps every one of the 32 deck cards to an existing medium texture', () => {
    for (const card of makeDeck()) {
      const key = cardKey(card);
      expect(cardsMedium[key], `${card.suit} ${card.rank} -> ${key}`).toBeDefined();
    }
  });
});
