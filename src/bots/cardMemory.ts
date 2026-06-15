import type { Card, GameEvent, Seat, Suit } from '../engine/types';
import { RANKS } from '../engine/deck';
import { rankStrength } from '../engine/tricks';

const key = (c: Card): string => `${c.suit}-${c.rank}`;

export interface CardMemory {
  readonly played: ReadonlySet<string>;
  readonly playedBySuit: Readonly<Record<Suit, number>>;
  readonly voids: Readonly<Record<Seat, ReadonlySet<Suit>>>;
  readonly trumpRevealed: boolean;
}

export function emptyMemory(): CardMemory {
  return {
    played: new Set<string>(),
    playedBySuit: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 },
    voids: { 0: new Set<Suit>(), 1: new Set<Suit>(), 2: new Set<Suit>(), 3: new Set<Suit>() },
    trumpRevealed: false,
  };
}

/** ledSuit = suit led in the trick this event belongs to (null when the event is the lead or not a play). */
export function observe(mem: CardMemory, ev: GameEvent, ledSuit: Suit | null): CardMemory {
  if (ev.type === 'TrumpRevealed') return { ...mem, trumpRevealed: true };
  if (ev.type === 'CardPlayed') {
    const played = new Set(mem.played);
    played.add(key(ev.card));
    const playedBySuit = { ...mem.playedBySuit, [ev.card.suit]: mem.playedBySuit[ev.card.suit] + 1 };
    let voids = mem.voids;
    if (ledSuit !== null && ev.card.suit !== ledSuit) {
      const seatVoids = new Set(mem.voids[ev.seat]);
      seatVoids.add(ledSuit);
      voids = { ...mem.voids, [ev.seat]: seatVoids };
    }
    return { ...mem, played, playedBySuit, voids };
  }
  return mem;
}

/** True if no higher-strength card of `card`'s own suit remains unplayed. */
export function isBoss(card: Card, mem: CardMemory): boolean {
  for (const r of RANKS) {
    if (rankStrength(r) > rankStrength(card.rank) && !mem.played.has(key({ suit: card.suit, rank: r }))) {
      return false;
    }
  }
  return true;
}

/** Count of trump cards already played. */
export function trumpsPlayed(mem: CardMemory, trumpSuit: Suit): number {
  return mem.playedBySuit[trumpSuit];
}
