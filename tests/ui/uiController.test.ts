import { describe, it, expect } from 'vitest';
import { phaseToScreen } from '../../src/ui/dom/UIController';

describe('phaseToScreen', () => {
  it('maps engine phases to screens', () => {
    expect(phaseToScreen('bidding', false)).toBe('bid');
    expect(phaseToScreen('trumpSelection', false)).toBe('trump');
    expect(phaseToScreen('doubleWindow', false)).toBe('double');
    expect(phaseToScreen('playing', false)).toBe('play');
    expect(phaseToScreen('done', true)).toBe('gameover');
  });
});
