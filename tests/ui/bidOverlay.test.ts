// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { BidOverlay } from '../../src/ui/dom/screens/BidOverlay';
import type { Action } from '../../src/engine/types';

const bids = (vals: number[]): Action[] => vals.map((value) => ({ type: 'bid', seat: 0, value }));

describe('BidOverlay', () => {
  it('clamps +/- to the legal bid range', () => {
    const onAction = vi.fn();
    const node = BidOverlay({ legal: [...bids([17, 18, 19]), { type: 'pass', seat: 0 }], onAction });
    const ring = node.querySelector('.bid-ring')!;
    const minus = node.querySelector('[data-act="minus"]') as HTMLButtonElement;
    const plus = node.querySelector('[data-act="plus"]') as HTMLButtonElement;
    expect(ring.textContent).toBe('17');
    minus.click(); expect(ring.textContent).toBe('17');   // clamped at min
    plus.click(); plus.click(); plus.click(); expect(ring.textContent).toBe('19'); // clamped at max
  });

  it('emits the selected bid and pass', () => {
    const onAction = vi.fn();
    const node = BidOverlay({ legal: [...bids([16, 17]), { type: 'pass', seat: 0 }], onAction });
    (node.querySelector('[data-act="plus"]') as HTMLButtonElement).click();
    (node.querySelector('[data-act="bid"]') as HTMLButtonElement).click();
    expect(onAction).toHaveBeenCalledWith({ type: 'bid', seat: 0, value: 17 });
    (node.querySelector('[data-act="pass"]') as HTMLButtonElement).click();
    expect(onAction).toHaveBeenCalledWith({ type: 'pass', seat: 0 });
  });
});
