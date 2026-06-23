// src/ui/scenes/TableScene.ts
import Phaser from 'phaser';
import { cardKey } from '../cardKey';
import { playSfx } from '../sound';
import { tableReady } from '../dom/tableBridge';
import type { TableView } from '../dom/types';
import type { Action, Card, GameEvent, Seat, Suit } from '../../engine/types';
import type { PlayerView } from '../../engine/game';

const W = 720, H = 1280;
const CARD_W = 96, CARD_H = 134;

const SEAT_POS: Record<Seat, { x: number; y: number }> = {
  0: { x: W / 2, y: H - 150 }, 1: { x: W - 80, y: H / 2 - 40 },
  2: { x: W / 2, y: 150 }, 3: { x: 80, y: H / 2 - 40 },
};
const TRICK_POS: Record<Seat, { x: number; y: number }> = {
  0: { x: W / 2, y: H / 2 + 90 }, 1: { x: W / 2 + 100, y: H / 2 },
  2: { x: W / 2, y: H / 2 - 90 }, 3: { x: W / 2 - 100, y: H / 2 },
};
const SUIT_GLYPH: Record<Suit, string> = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };

export class TableScene extends Phaser.Scene implements TableView {
  private trickLayer!: Phaser.GameObjects.Container;
  private handLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private glows!: Record<Seat, Phaser.GameObjects.Arc>;

  constructor() { super('Table'); }

  // Hardware back during a game is handled by the DOM controller; expose a hook it can call.
  create(): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x1d1d1f); // charcoal table
    this.trickLayer = this.add.container(0, 0);
    this.handLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);
    this.buildSeats();
    tableReady(this);
  }

  show(): void { this.scene.setVisible(true); this.scene.resume(); }
  hide(): void { this.scene.setVisible(false); }

  private seatLabel(s: Seat): string {
    return s === 0 ? 'You' : s === 2 ? 'Partner' : s === 1 ? 'East' : 'West';
  }

  private buildSeats(): void {
    this.glows = {} as Record<Seat, Phaser.GameObjects.Arc>;
    ([0, 1, 2, 3] as Seat[]).forEach((s) => {
      const p = SEAT_POS[s];
      if (s !== 0) for (let i = 0; i < 3; i++) this.add.image(p.x - 14 + i * 14, p.y, 'card_back').setDisplaySize(48, 67);
      this.glows[s] = this.add.circle(p.x, p.y, 46, 0x2997ff, 0).setStrokeStyle(5, 0x2997ff, 0);
      this.add.text(p.x, p.y + 52, this.seatLabel(s), { fontSize: '24px', color: '#cccccc' }).setOrigin(0.5);
    });
  }

  render(view: PlayerView, activeSeat: Seat | -1): void {
    ([0, 1, 2, 3] as Seat[]).forEach((s) =>
      this.glows[s].setStrokeStyle(5, 0x2997ff, s === activeSeat ? 1 : 0));
    this.renderHand(view);
  }

  private renderHand(v: PlayerView): void {
    this.handLayer.removeAll(true);
    const n = v.hand.length;
    const spread = Math.min(CARD_W * 0.72, (W - 140) / Math.max(n, 1));
    const startX = W / 2 - (spread * (n - 1)) / 2;
    v.hand.forEach((card, i) => {
      const img = this.add.image(startX + i * spread, H - 150, cardKey(card)).setDisplaySize(CARD_W, CARD_H);
      img.setData('card', card);
      this.handLayer.add(img);
    });
  }

  awaitCardPlay(legal: Action[]): Promise<Action> {
    const playable = new Set(
      legal.filter((a): a is Extract<Action, { type: 'playCard' }> => a.type === 'playCard').map((a) => cardKey(a.card)),
    );
    return new Promise<Action>((resolve) => {
      const extras: Phaser.GameObjects.GameObject[] = [];
      const finish = (a: Action): void => { this.clearHandInput(); extras.forEach((o) => o.destroy()); resolve(a); };
      (this.handLayer.list as Phaser.GameObjects.Image[]).forEach((img) => {
        const card = img.getData('card') as Card;
        if (playable.has(cardKey(card))) {
          img.setAlpha(1).setInteractive({ useHandCursor: true });
          img.on('pointerup', () => { playSfx(this, 'play'); finish({ type: 'playCard', seat: 0, card }); });
        } else img.setAlpha(0.45);
      });
      const reveal = legal.find((a) => a.type === 'revealTrump');
      const marriage = legal.find((a) => a.type === 'declareMarriage');
      let bx = W / 2 - 150;
      if (reveal) { extras.push(this.actionButton(bx, H - 60, 'Reveal', () => finish(reveal))); bx += 190; }
      if (marriage) { extras.push(this.actionButton(bx, H - 60, 'Marriage', () => finish(marriage))); }
    });
  }

  private actionButton(x: number, y: number, label: string, onUp: () => void): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, label, { fontSize: '40px', color: '#fff', backgroundColor: '#0066cc', padding: { x: 18, y: 8 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerup', onUp);
    this.uiLayer.add(t);
    return t;
  }

  private clearHandInput(): void {
    (this.handLayer.list as Phaser.GameObjects.Image[]).forEach((img) => {
      img.removeAllListeners(); img.disableInteractive(); img.setAlpha(1);
    });
  }

  async animateEvents(events: GameEvent[]): Promise<void> {
    for (const ev of events) {
      if (ev.type === 'CardPlayed') await this.animateCardPlayed(ev.seat, ev.card);
      else if (ev.type === 'TrickWon') await this.animateTrickWon(ev.seat);
      else if (ev.type === 'TrumpRevealed') this.showToast(`Trump ${SUIT_GLYPH[ev.suit]}`);
      else if (ev.type === 'MarriageDeclared') this.showToast('Marriage!');
    }
  }

  private animateCardPlayed(seat: Seat, card: Card): Promise<void> {
    const from = SEAT_POS[seat], to = TRICK_POS[seat];
    const img = this.add.image(from.x, from.y, seat === 0 ? cardKey(card) : 'card_back').setDisplaySize(CARD_W, CARD_H);
    this.trickLayer.add(img);
    playSfx(this, 'play');
    return new Promise<void>((res) => {
      this.tweens.add({ targets: img, x: to.x, y: to.y, duration: 200, ease: 'Quad.out',
        onComplete: () => { if (seat !== 0 && img.scene) img.setTexture(cardKey(card)).setDisplaySize(CARD_W, CARD_H); res(); } });
    });
  }

  private animateTrickWon(winner: Seat): Promise<void> {
    const to = SEAT_POS[winner];
    const targets = (this.trickLayer.list.slice() as Phaser.GameObjects.Image[]).filter((o) => o.scene);
    playSfx(this, 'win');
    return new Promise<void>((res) => {
      if (targets.length === 0) { res(); return; }
      this.tweens.add({ targets, x: to.x, y: to.y, alpha: 0, duration: 250, ease: 'Quad.in',
        onComplete: () => { this.trickLayer.removeAll(true); res(); } });
    });
  }

  private showToast(text: string): void {
    const t = this.add.text(W / 2, H / 2 - 200, text, { fontSize: '40px', color: '#fff', backgroundColor: '#0066cc', padding: { x: 24, y: 12 } }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, delay: 1100, duration: 500, onComplete: () => t.destroy() });
  }
}
