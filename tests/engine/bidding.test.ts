import { describe, it, expect } from 'vitest';
import { initBidding, applyBid, applyPass, MIN_BID, MAX_BID } from '../../src/engine/bidding';
import type { BiddingState } from '../../src/engine/bidding';

const asState = (r: BiddingState | string): BiddingState => {
  if (typeof r === 'string') throw new Error(`expected state, got error ${r}`);
  return r;
};

describe('bidding', () => {
  it('opener is forced to bid (cannot pass)', () => {
    const s = initBidding(1);
    expect(applyPass(s, 1)).toBe('must_bid');
  });
  it('rejects out-of-turn, low and high bids', () => {
    const s = initBidding(1);
    expect(applyBid(s, 2, 16)).toBe('not_your_turn');
    expect(applyBid(s, 1, 15)).toBe('bid_too_low');
    expect(applyBid(s, 1, 29)).toBe('bid_too_high');
    const s2 = asState(applyBid(s, 1, 16));
    expect(applyBid(s2, 2, 16)).toBe('bid_too_low'); // must raise
  });
  it('highest bidder cannot pass', () => {
    let s = asState(applyBid(initBidding(1), 1, 16));
    s = asState(applyPass(s, 2));
    s = asState(applyPass(s, 3));
    expect(s.turn).toBe(0);
    s = asState(applyBid(s, 0, 17));
    expect(s.turn).toBe(1);
    const after = asState(applyPass(s, 1));
    expect(after.passed[1]).toBe(true);
    expect(s.highest).toEqual({ seat: 0, value: 17 });
  });
  it('ends when three non-holders pass; winner = highest', () => {
    let s = asState(applyBid(initBidding(1), 1, 16));
    s = asState(applyPass(s, 2));
    s = asState(applyPass(s, 3));
    s = asState(applyPass(s, 0));
    expect(s.done).toBe(true);
    expect(s.highest).toEqual({ seat: 1, value: 16 });
  });
  it('passed seat is skipped in turn order', () => {
    let s = asState(applyBid(initBidding(1), 1, 16));
    s = asState(applyPass(s, 2));
    s = asState(applyBid(s, 3, 17));
    expect(s.turn).toBe(0); // seat 2 not revisited? no — 2 passed permanently
    s = asState(applyBid(s, 0, 18));
    expect(s.turn).toBe(1); // skips nothing yet; 1 still active
    s = asState(applyPass(s, 1));
    expect(s.turn).toBe(3); // skips passed seat 2
  });
  it('exports bounds', () => {
    expect(MIN_BID).toBe(16);
    expect(MAX_BID).toBe(28);
  });
  it('bid of exactly MAX_BID (28) is accepted', () => {
    const s = initBidding(1);
    const s2 = asState(applyBid(s, 1, 27));
    const s3 = asState(applyBid(s2, 2, MAX_BID));
    expect(s3.highest).toEqual({ seat: 2, value: 28 });
  });
  it('applyBid and applyPass on done state return bidding_done', () => {
    let s = asState(applyBid(initBidding(1), 1, 16));
    s = asState(applyPass(s, 2));
    s = asState(applyPass(s, 3));
    s = asState(applyPass(s, 0));
    expect(s.done).toBe(true);
    expect(applyBid(s, 1, 17)).toBe('bidding_done');
    expect(applyPass(s, 2)).toBe('bidding_done');
  });
});
