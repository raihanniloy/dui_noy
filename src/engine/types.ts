export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export interface Card { readonly suit: Suit; readonly rank: Rank }
export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1; // seats 0&2 = team 0, seats 1&3 = team 1
export const teamOf = (s: Seat): Team => (s % 2) as Team;
export const sameCard = (a: Card, b: Card): boolean => a.suit === b.suit && a.rank === b.rank;

export type TrumpMode =
  | { kind: 'suit'; suit: Suit }
  | { kind: 'seventh' }
  | { kind: 'joker' };

export type Action =
  | { type: 'bid'; seat: Seat; value: number }
  | { type: 'pass'; seat: Seat }
  | { type: 'chooseTrump'; seat: Seat; mode: TrumpMode }
  | { type: 'double'; seat: Seat }
  | { type: 'redouble'; seat: Seat }
  | { type: 'declineDouble'; seat: Seat }
  | { type: 'revealTrump'; seat: Seat }
  | { type: 'declareMarriage'; seat: Seat }
  | { type: 'playCard'; seat: Seat; card: Card };

export type GameEvent =
  | { type: 'HandStarted'; dealer: Seat }
  | { type: 'CardsDealt'; seat: Seat; count: number }
  | { type: 'BidPlaced'; seat: Seat; value: number }
  | { type: 'Passed'; seat: Seat }
  | { type: 'BiddingWon'; seat: Seat; value: number }
  | { type: 'TrumpChosen'; seat: Seat; kind: TrumpMode['kind'] }
  | { type: 'Doubled'; seat: Seat }
  | { type: 'Redoubled'; seat: Seat }
  | { type: 'DoubleDeclined'; seat: Seat }
  | { type: 'TrumpRevealed'; suit: Suit }
  | { type: 'MarriageDeclared'; seat: Seat; team: Team }
  | { type: 'CardPlayed'; seat: Seat; card: Card }
  | { type: 'TrickWon'; seat: Seat; points: number }
  | { type: 'HandScored'; bidderTeam: Team; target: number; points: number; success: boolean; delta: number; cardPointsByTeam: readonly [number, number]; tricksByTeam: readonly [number, number] }
  | { type: 'GameOver'; scores: readonly [number, number] };
