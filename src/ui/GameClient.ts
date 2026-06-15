// src/ui/GameClient.ts
import {
  newGame, applyAction, legalActions, playerView,
  currentSeat as engineCurrentSeat,
  type GameState, type PlayerView, type ApplyResult,
} from '../engine/game';
import type { Action, GameEvent, Seat, Suit } from '../engine/types';
import { mulberry32 } from '../engine/deck';
import { makeBot, type Bot, type Difficulty } from '../bots/bot';
import { emptyMemory, observe, type CardMemory } from '../bots/cardMemory';

/**
 * Headless driver around the engine + bots. Human is seat 0; seats 1/2/3 are bots.
 * Seat 2 (the human's partner) always plays Hard; seats 1 and 3 use the chosen difficulty.
 */
export class GameClient {
  private state: GameState;
  private mem: CardMemory[];
  private readonly bots: (Bot | null)[];

  constructor(seed: number, opponentDifficulty: Difficulty) {
    this.state = newGame(seed);
    this.mem = [emptyMemory(), emptyMemory(), emptyMemory(), emptyMemory()];
    this.bots = ([0, 1, 2, 3] as Seat[]).map((seat) =>
      seat === 0
        ? null
        : makeBot(seat === 2 ? 'hard' : opponentDifficulty, mulberry32(seed * 1000 + seat)),
    );
  }

  currentSeat(): Seat { return engineCurrentSeat(this.state); }
  isOver(): boolean { return this.state.phase === 'done'; }
  isHumanTurn(): boolean { return !this.isOver() && this.currentSeat() === 0; }
  view(): PlayerView { return playerView(this.state, 0); }
  legal(): Action[] { return legalActions(this.state, 0); }
  scores(): readonly [number, number] { return this.state.scores; }

  /** Step the current bot. Precondition: current seat is a bot. Returns the emitted events. */
  stepBot(): GameEvent[] {
    const seat = this.currentSeat();
    const bot = this.bots[seat];
    if (!bot) throw new Error(`stepBot called on human seat ${seat}`);
    const action = bot.decideAction(playerView(this.state, seat), legalActions(this.state, seat), this.mem[seat]!);
    return this.applyAndAbsorb(action, (r) => {
      if (!r.ok) throw new Error(`bot action illegal: ${r.reason}`);
    });
  }

  /** Apply a human (seat 0) action. Returns the engine result so the UI can reject illegal input. */
  applyHuman(action: Action): ApplyResult {
    const ledSuit = this.ledSuit();
    const r = applyAction(this.state, action);
    if (r.ok) { this.state = r.state; this.absorb(r.events, ledSuit); }
    return r;
  }

  private applyAndAbsorb(action: Action, onResult: (r: ApplyResult) => void): GameEvent[] {
    const ledSuit = this.ledSuit();
    const r = applyAction(this.state, action);
    onResult(r);
    if (!r.ok) return [];
    this.state = r.state;
    this.absorb(r.events, ledSuit);
    return r.events;
  }

  private ledSuit(): Suit | null {
    return this.state.phase === 'playing' && this.state.trick.length > 0
      ? this.state.trick[0]!.card.suit
      : null;
  }

  private absorb(events: GameEvent[], ledSuit: Suit | null): void {
    for (const ev of events) {
      if (ev.type === 'HandStarted') {
        this.mem = [emptyMemory(), emptyMemory(), emptyMemory(), emptyMemory()];
      } else {
        for (let i = 0; i < 4; i++) this.mem[i] = observe(this.mem[i]!, ev, ledSuit);
      }
    }
  }
}
