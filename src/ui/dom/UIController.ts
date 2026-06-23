// src/ui/dom/UIController.ts
import type { GameClient } from '../GameClient';
import type { Screen } from './Screen';
import type { ScreenId, TableView, SummaryData } from './types';
import type { Action, GameEvent } from '../../engine/types';
import type { Phase } from '../../engine/game';
import { BidOverlay } from './screens/BidOverlay';
import { TrumpOverlay } from './screens/TrumpOverlay';
import { DoubleOverlay } from './screens/DoubleOverlay';
import { SummaryOverlay } from './screens/SummaryOverlay';
import { GameOverOverlay } from './screens/GameOverOverlay';

export function phaseToScreen(phase: Phase, isOver: boolean): ScreenId | 'play' {
  if (isOver) return 'gameover';
  switch (phase) {
    case 'bidding': return 'bid';
    case 'trumpSelection': return 'trump';
    case 'doubleWindow': return 'double';
    default: return 'play';
  }
}

export interface UIControllerDeps {
  client: GameClient;
  table: TableView;
  screen: Screen;
  onRematch(): void;
  delayMs?: number;
}

export class UIController {
  private readonly client: GameClient;
  private readonly table: TableView;
  private readonly screen: Screen;
  private readonly onRematch: () => void;
  private readonly delayMs: number;

  constructor(deps: UIControllerDeps) {
    this.client = deps.client; this.table = deps.table; this.screen = deps.screen;
    this.onRematch = deps.onRematch; this.delayMs = deps.delayMs ?? 450;
  }

  async run(): Promise<void> {
    this.table.show();
    while (!this.client.isOver()) {
      const view = this.client.view();
      const active = this.client.currentSeat();
      this.table.render(view, active);

      if (this.client.isHumanTurn()) {
        const action = await this.awaitHuman();
        const r = this.client.applyHuman(action);
        if (r.ok) await this.absorbEvents(r.events);
      } else {
        const events = this.client.stepBot();
        await this.absorbEvents(events);
        await this.delay(this.delayMs);
      }

      // Hand boundary: show the summary sheet when a hand was just scored.
      const handScored = this.lastHandScored;
      if (handScored) { this.lastHandScored = null; await this.showSummary(handScored); }
    }
    this.showGameOver();
  }

  private lastHandScored: Extract<GameEvent, { type: 'HandScored' }> | null = null;

  private async absorbEvents(events: GameEvent[]): Promise<void> {
    for (const ev of events) if (ev.type === 'HandScored') this.lastHandScored = ev;
    await this.table.animateEvents(events);
  }

  private async awaitHuman(): Promise<Action> {
    const legal = this.client.legal();
    const target = phaseToScreen(this.client.view().phase, false);
    if (target === 'play') { this.screen.hideAll(); return this.table.awaitCardPlay(legal); }
    return new Promise<Action>((resolve) => {
      const onAction = (a: Action): void => { this.screen.hideAll(); resolve(a); };
      const node = target === 'bid' ? BidOverlay({ legal, onAction })
        : target === 'trump' ? TrumpOverlay({ legal, onAction })
        : DoubleOverlay({ legal, onAction });
      this.screen.mount(target, node);
      this.screen.show(target);
    });
  }

  private async showSummary(ev: Extract<GameEvent, { type: 'HandScored' }>): Promise<void> {
    const v = this.client.view();
    const usIsBidder = ev.bidderTeam === 0;
    const data: SummaryData = {
      success: ev.success, delta: usIsBidder ? ev.delta : -ev.delta, bidValue: ev.target,
      usPoints: v.cardPointsByTeam[0], themPoints: v.cardPointsByTeam[1],
      usTricks: v.tricksByTeam[0], themTricks: v.tricksByTeam[1],
      scoreUs: v.scores[0], scoreThem: v.scores[1], matchOver: this.client.isOver(),
    };
    await new Promise<void>((resolve) => {
      const node = SummaryOverlay({ data, onNext: () => { this.screen.hideAll(); resolve(); } });
      this.screen.mount('summary', node); this.screen.show('summary');
    });
  }

  private showGameOver(): void {
    const [us, them] = this.client.scores();
    const weWin = us >= 6 || them <= -6;
    const node = GameOverOverlay({ weWin, scoreUs: us, scoreThem: them, onRematch: () => { this.screen.hideAll(); this.onRematch(); } });
    this.screen.mount('gameover', node); this.screen.show('gameover');
  }

  private delay(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
}
