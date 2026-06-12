// Rule decisions (from plan):
// 1. First bidder (seat left of dealer) is forced to open at 16 — no all-pass redeal.
// 2. The current highest bidder cannot pass; auction ends when the other three seats have passed.

import type { Seat } from './types';

export const MIN_BID = 16;
export const MAX_BID = 28;

export interface BiddingState {
  readonly turn: Seat;
  readonly highest: { seat: Seat; value: number } | null;
  readonly passed: readonly [boolean, boolean, boolean, boolean];
  readonly done: boolean;
}

export type BidError =
  | 'not_your_turn'
  | 'bid_too_low'
  | 'bid_too_high'
  | 'bidding_done'
  | 'must_bid'
  | 'holder_cannot_pass';

export function initBidding(first: Seat): BiddingState {
  return { turn: first, highest: null, passed: [false, false, false, false], done: false };
}

/** Returns the next seat clockwise from `from` that has not passed. */
function nextActive(passed: readonly boolean[], from: Seat): Seat {
  let n = from;
  do {
    n = ((n + 1) % 4) as Seat;
  } while (passed[n]);
  return n;
}

export function applyBid(s: BiddingState, seat: Seat, value: number): BiddingState | BidError {
  if (s.done) return 'bidding_done';
  if (seat !== s.turn) return 'not_your_turn';
  if (value > MAX_BID) return 'bid_too_high';
  // Must be >= MIN_BID and must exceed current highest (if any)
  if (value < MIN_BID || value <= (s.highest?.value ?? MIN_BID - 1)) return 'bid_too_low';
  return { ...s, highest: { seat, value }, turn: nextActive(s.passed, seat) };
}

export function applyPass(s: BiddingState, seat: Seat): BiddingState | BidError {
  if (s.done) return 'bidding_done';
  if (seat !== s.turn) return 'not_your_turn';
  // Opener (highest === null) is forced to bid — cannot pass.
  if (s.highest === null) return 'must_bid';
  // Current highest bidder cannot pass.
  if (s.highest.seat === seat) return 'holder_cannot_pass';
  const p = s.passed;
  const passed: BiddingState['passed'] = [
    seat === 0 ? true : p[0],
    seat === 1 ? true : p[1],
    seat === 2 ? true : p[2],
    seat === 3 ? true : p[3],
  ];
  // Count non-holder passes: auction ends when three other seats have all passed.
  const nonHolderPasses = passed.filter((p, i) => p && i !== s.highest!.seat).length;
  if (nonHolderPasses >= 3) return { ...s, passed, done: true };
  return { ...s, passed, turn: nextActive(passed, seat) };
}
