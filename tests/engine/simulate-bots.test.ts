import { describe, it, expect } from 'vitest';
import { newGame, applyAction, legalActions, playerView, currentSeat, WIN_TARGET } from '../../src/engine/game';
import type { Seat, Suit } from '../../src/engine/types';
import { mulberry32 } from '../../src/engine/deck';
import { makeBot, type Difficulty } from '../../src/bots/bot';
import { emptyMemory, observe, type CardMemory } from '../../src/bots/cardMemory';

// No @types/node in this project's tsconfig, so reach process via a narrowly-typed
// globalThis cast (Node/vitest always provides it at runtime) instead of adding a dep.
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const GAMES = Number(env?.SIM_GAMES ?? 200);
const freshMem = (): CardMemory[] => [emptyMemory(), emptyMemory(), emptyMemory(), emptyMemory()];

describe('bot-vs-bot simulation', () => {
  it(`${GAMES} games: invariants hold and bots are not random`, () => {
    let handsTotal = 0;
    let handsBidMet = 0;

    for (let seed = 1; seed <= GAMES; seed++) {
      const bots = ([0, 1, 2, 3] as Seat[]).map(i =>
        makeBot((i % 2 === 0 ? 'hard' : 'easy') as Difficulty, mulberry32(seed * 1000 + i)),
      );
      let mem = freshMem();
      let s = newGame(seed);
      let steps = 0;
      let trickPts = 0;
      let tricks = 0;

      while (s.phase !== 'done') {
        expect(++steps).toBeLessThan(6000);
        const seat = currentSeat(s);
        const legal = legalActions(s, seat);
        expect(legal.length).toBeGreaterThan(0);
        const action = bots[seat]!.decideAction(playerView(s, seat), legal, mem[seat]!);

        const ledSuit: Suit | null =
          s.phase === 'playing' && s.trick.length > 0 ? s.trick[0]!.card.suit : null;

        const r = applyAction(s, action);
        if (!r.ok) throw new Error(`seed ${seed}: bot action illegal: ${r.reason}`);

        for (const ev of r.events) {
          if (ev.type === 'HandStarted') {
            mem = freshMem();
          } else {
            for (let i = 0; i < 4; i++) mem[i] = observe(mem[i]!, ev, ledSuit);
          }
          if (ev.type === 'TrickWon') { tricks++; trickPts += ev.points; }
          if (ev.type === 'HandScored') {
            handsTotal++;
            if (ev.success) handsBidMet++;
            expect(trickPts).toBe(29); // 28 card points + last-trick bonus
            expect(tricks).toBe(8);
            expect(ev.cardPointsByTeam[0] + ev.cardPointsByTeam[1]).toBe(29);
            expect(ev.tricksByTeam[0] + ev.tricksByTeam[1]).toBe(8);
            trickPts = 0;
            tricks = 0;
          }
        }
        s = r.state;
      }
      expect(Math.max(...s.scores.map(Math.abs))).toBeGreaterThanOrEqual(WIN_TARGET);
    }

    expect(handsTotal).toBeGreaterThanOrEqual(GAMES); // every game completes at least one hand
    expect(handsBidMet / handsTotal).toBeGreaterThan(0.25); // bots not playing randomly
  }, 120_000);
});
