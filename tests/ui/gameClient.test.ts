import { describe, it, expect } from 'vitest';
import { GameClient } from '../../src/ui/GameClient';
import { makeBot } from '../../src/bots/bot';
import { mulberry32 } from '../../src/engine/deck';
import { emptyMemory } from '../../src/bots/cardMemory';

describe('GameClient', () => {
  it('drives a full match to a ±6 result with only legal moves', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const client = new GameClient(seed, 'hard');
      // Script the human seat with a bot so the match runs unattended.
      const human = makeBot('hard', mulberry32(seed * 7 + 1));
      let steps = 0;
      while (!client.isOver()) {
        expect(++steps).toBeLessThan(6000);
        if (client.isHumanTurn()) {
          const action = human.decideAction(client.view(), client.legal(), emptyMemory());
          const r = client.applyHuman(action);
          expect(r.ok, `seed ${seed}: ${r.ok ? '' : r.reason}`).toBe(true);
        } else {
          client.stepBot();
        }
      }
      const [us, them] = client.scores();
      expect(Math.max(Math.abs(us), Math.abs(them))).toBeGreaterThanOrEqual(6);
    }
  });

  it('reports the human seat only on seat 0 turns', () => {
    const client = new GameClient(1, 'easy');
    expect(client.isHumanTurn()).toBe(client.currentSeat() === 0);
  });
});
