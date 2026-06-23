// src/ui/dom/types.ts
import type { Action, GameEvent, Seat, Suit } from '../../engine/types';
import type { PlayerView } from '../../engine/game';
import type { Difficulty } from '../../bots/bot';

export type ScreenId = 'splash' | 'menu' | 'setup' | 'bid' | 'trump' | 'double' | 'summary' | 'gameover';

export interface SetupChoice { difficulty: Difficulty; points: number; }

export interface SummaryData {
  success: boolean; delta: number; bidValue: number;
  usPoints: number; themPoints: number; usTricks: number; themTricks: number;
  scoreUs: number; scoreThem: number; matchOver: boolean;
}

/** Imperative surface the Phaser table exposes to the controller. */
export interface TableView {
  render(view: PlayerView, activeSeat: Seat | -1): void;
  animateEvents(events: GameEvent[]): Promise<void>;
  /** Resolves with the human's playCard / revealTrump / declareMarriage choice. */
  awaitCardPlay(legal: Action[]): Promise<Action>;
  show(): void;
  hide(): void;
}

export type { Action, GameEvent, Seat, Suit, PlayerView, Difficulty };
