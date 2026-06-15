import { describe, it, expect, beforeEach } from 'vitest';
import { soundKey, setMuted, isMuted, SFX_KEYS } from '../../src/ui/sound';
import { sounds } from '../../assets.js';

describe('sound', () => {
  beforeEach(() => setMuted(false));

  it('maps every sfx to an existing sound asset', () => {
    for (const sfx of SFX_KEYS) {
      expect(sounds[soundKey(sfx)], `${sfx} -> ${soundKey(sfx)}`).toBeDefined();
    }
  });

  it('toggles mute state', () => {
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
  });
});
