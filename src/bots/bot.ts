import type { Action } from '../engine/types';
import type { Rng } from '../engine/deck';
import type { PlayerView } from '../engine/game';
import type { CardMemory } from './cardMemory';
import {
  bidDecision, chooseTrumpMode, doubleDecision,
  scorePlay, revealDecision, marriageDecision,
} from './heuristics';

export type Difficulty = 'easy' | 'hard';

// Max additive jitter on easy card-play scores. ~4x the largest rank-strength delta at
// leading (rankStrength * 0.1), so an easy bot frequently misorders close options but
// still won't throw away a clearly-winning play.
const NOISE = 4;

export interface Bot {
  decideAction(view: PlayerView, legal: readonly Action[], mem: CardMemory): Action;
}

export function makeBot(difficulty: Difficulty, rng: Rng): Bot {
  const jitter = (base: number): number => (difficulty === 'easy' ? base + NOISE * rng() : base);

  return {
    decideAction(view, legal, mem) {
      const has = (t: Action['type']): boolean => legal.some(a => a.type === t);

      // Bidding.
      if (has('bid') || has('pass')) {
        const d = bidDecision(view);
        if ('value' in d) {
          const exact = legal.find(a => a.type === 'bid' && a.value === d.value);
          if (exact) return exact;
        }
        const pass = legal.find(a => a.type === 'pass');
        if ('pass' in d && pass) return pass;
        const bids = legal.filter(a => a.type === 'bid'); // emitted ascending
        // Forced opener, or our wanted value isn't on offer: bid the lowest legal value
        // rather than pass. (bidDecision derives value from the floor, so this is rare.)
        if (bids.length > 0) return bids[0]!;
        return pass ?? legal[0]!;
      }

      // Trump selection.
      if (has('chooseTrump')) {
        const mode = chooseTrumpMode(view.hand);
        const wantSuit = mode.kind === 'suit' ? mode.suit : null;
        const match = legal.find(a => {
          if (a.type !== 'chooseTrump' || a.mode.kind !== mode.kind) return false;
          return a.mode.kind !== 'suit' || a.mode.suit === wantSuit;
        });
        return match ?? legal.find(a => a.type === 'chooseTrump')!;
      }

      // Double window.
      if (has('double') || has('redouble') || has('declineDouble')) {
        const d = doubleDecision(view);
        const decline = legal.find(a => a.type === 'declineDouble')!;
        if (d === 'double') return legal.find(a => a.type === 'double') ?? decline;
        if (d === 'redouble') return legal.find(a => a.type === 'redouble') ?? decline;
        return decline;
      }

      // Playing: reveal / marriage are separate actions taken before the card.
      const reveal = legal.find(a => a.type === 'revealTrump');
      if (reveal && revealDecision(view)) return reveal;
      const marriage = legal.find(a => a.type === 'declareMarriage');
      if (marriage && marriageDecision(view)) return marriage;

      const plays = legal.filter(
        (a): a is Extract<Action, { type: 'playCard' }> => a.type === 'playCard',
      );
      let best: Action = plays[0] ?? legal[0]!;
      let bestScore = -Infinity;
      for (const p of plays) {
        const score = jitter(scorePlay(p.card, view, mem));
        if (score > bestScore) { bestScore = score; best = p; }
      }
      return best;
    },
  };
}
