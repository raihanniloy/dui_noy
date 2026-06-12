import type { Card, Team } from './types';

const POINTS: Partial<Record<Card['rank'], number>> = { J: 3, '9': 2, A: 1, '10': 1 };
export const cardPoints = (c: Card): number => POINTS[c.rank] ?? 0;
export const trickPoints = (cards: readonly Card[]): number =>
  cards.reduce((s, c) => s + cardPoints(c), 0);

export interface HandInput {
  bid: number;
  bidderTeam: Team;
  /** Card points per team, last-trick +1 bonus already included (sums to 29). */
  cardPointsByTeam: readonly [number, number];
  tricksByTeam: readonly [number, number];
  marriageTeam: Team | null;
  stake: 1 | 2 | 4;
}

export interface HandOutcome { target: number; success: boolean; delta: number }

/** delta applies to the bidder team's game score; other team unchanged. */
export function scoreHand(i: HandInput): HandOutcome {
  let target = i.bid;
  if (i.marriageTeam !== null) {
    target = i.marriageTeam === i.bidderTeam ? Math.max(16, target - 4) : Math.min(28, target + 4);
  }
  const pts = i.cardPointsByTeam[i.bidderTeam];
  const success = pts >= target;
  let delta = success ? i.stake : -i.stake;
  if (success && i.tricksByTeam[i.bidderTeam] === 8) delta += 1;
  if (!success && i.tricksByTeam[i.bidderTeam] === 0) delta -= 1;
  return { target, success, delta };
}
