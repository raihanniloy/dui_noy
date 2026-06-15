// src/ui/scenes/TableScene.ts
import Phaser from 'phaser';
import { GameClient } from '../GameClient';
import { cardKey } from '../cardKey';
import { playSfx, isMuted, setMuted } from '../sound';
import type { Difficulty } from '../../bots/bot';
import type { Action, Card, GameEvent, Seat, Suit } from '../../engine/types';
import type { PlayerView } from '../../engine/game';

const W = 720, H = 1280;
const CARD_W = 96, CARD_H = 134;

const SEAT_POS: Record<Seat, { x: number; y: number }> = {
  0: { x: W / 2, y: H - 150 },     // you (bottom)
  1: { x: W - 80, y: H / 2 - 40 }, // right opponent (East)
  2: { x: W / 2, y: 150 },         // partner (top)
  3: { x: 80, y: H / 2 - 40 },     // left opponent (West)
};
const TRICK_POS: Record<Seat, { x: number; y: number }> = {
  0: { x: W / 2, y: H / 2 + 90 },
  1: { x: W / 2 + 100, y: H / 2 },
  2: { x: W / 2, y: H / 2 - 90 },
  3: { x: W / 2 - 100, y: H / 2 },
};
const SUIT_GLYPH: Record<Suit, string> = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };

export class TableScene extends Phaser.Scene {
  private client!: GameClient;
  private trickLayer!: Phaser.GameObjects.Container;
  private handLayer!: Phaser.GameObjects.Container;
  private uiLayer!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private trumpText!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  private glows!: Record<Seat, Phaser.GameObjects.Arc>;

  constructor() { super('Table'); }

  create(data: { difficulty: Difficulty; seed: number }): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0b3d2e); // felt
    this.client = new GameClient(data.seed, data.difficulty);

    this.trickLayer = this.add.container(0, 0);
    this.handLayer = this.add.container(0, 0);
    this.uiLayer = this.add.container(0, 0);

    this.buildHud();
    this.buildSeats();
    this.render();
    void this.runLoop();
  }

  // ---- static / HUD ----
  private buildHud(): void {
    this.scoreText = this.add.text(20, 24, '', { fontSize: '30px', color: '#fff' });
    this.trumpText = this.add.text(W - 20, 24, '', { fontSize: '30px', color: '#fff' }).setOrigin(1, 0);
    this.muteBtn = this.add.text(W - 20, 70, '🔊', { fontSize: '30px' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerup', () => {
      const m = !isMuted();
      setMuted(m);
      this.muteBtn.setText(m ? '🔇' : '🔊');
    });
  }

  private seatLabel(s: Seat): string {
    return s === 0 ? 'You' : s === 2 ? 'Partner' : s === 1 ? 'East' : 'West';
  }

  private buildSeats(): void {
    this.glows = {} as Record<Seat, Phaser.GameObjects.Arc>;
    ([0, 1, 2, 3] as Seat[]).forEach((s) => {
      const p = SEAT_POS[s];
      if (s !== 0) {
        for (let i = 0; i < 3; i++) {
          this.add.image(p.x - 14 + i * 14, p.y, 'card_back').setDisplaySize(48, 67);
        }
      }
      this.glows[s] = this.add.circle(p.x, p.y, 46, 0xffd34d, 0).setStrokeStyle(5, 0xffd34d, 0);
      this.add.text(p.x, p.y + 52, this.seatLabel(s), { fontSize: '24px', color: '#cde' }).setOrigin(0.5);
    });
  }

  // ---- dynamic render ----
  private render(): void {
    const v = this.client.view();
    this.scoreText.setText(`Us ${v.scores[0]}  ·  Them ${v.scores[1]}`);
    const trump = v.trumpRevealed && v.trumpSuit ? SUIT_GLYPH[v.trumpSuit] : (v.trumpKind ? '?' : '—');
    const bid = v.bid ? `bid ${v.bid.value}` : '';
    this.trumpText.setText(`Trump ${trump}  ${bid}`.trim());

    const active = this.client.isOver() ? -1 : this.client.currentSeat();
    ([0, 1, 2, 3] as Seat[]).forEach((s) =>
      this.glows[s].setStrokeStyle(5, 0xffd34d, s === active ? 1 : 0));

    this.renderHand(v);
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

  // ---- turn loop ----
  private async runLoop(): Promise<void> {
    while (!this.client.isOver()) {
      if (this.client.isHumanTurn()) {
        const action = await this.awaitHumanAction();
        const r = this.client.applyHuman(action);
        if (r.ok) await this.animateEvents(r.events);
      } else {
        const events = this.client.stepBot();
        await this.animateEvents(events);
        await this.delay(450);
      }
      this.render();
    }
    this.showMatchOverlay();
  }

  // PLACEHOLDER — replaced in Task 9. Auto-plays so a full match runs unattended.
  private async awaitHumanAction(): Promise<Action> {
    await this.delay(250);
    const legal = this.client.legal();
    return legal.find((a) => a.type === 'playCard') ?? legal[0]!;
  }

  // ---- animation ----
  private async animateEvents(events: GameEvent[]): Promise<void> {
    for (const ev of events) {
      if (ev.type === 'CardPlayed') await this.animateCardPlayed(ev.seat, ev.card);
      else if (ev.type === 'TrickWon') await this.animateTrickWon(ev.seat);
      else if (ev.type === 'HandScored') {
        this.showToast(`${ev.success ? 'Bid made' : 'Bid set'}  (${ev.delta >= 0 ? '+' : ''}${ev.delta})`);
        await this.delay(900);
      } else if (ev.type === 'TrumpRevealed') this.showToast(`Trump ${SUIT_GLYPH[ev.suit]}`);
      else if (ev.type === 'MarriageDeclared') this.showToast('Marriage!');
    }
  }

  private animateCardPlayed(seat: Seat, card: Card): Promise<void> {
    const from = SEAT_POS[seat];
    const to = TRICK_POS[seat];
    const img = this.add.image(from.x, from.y, seat === 0 ? cardKey(card) : 'card_back')
      .setDisplaySize(CARD_W, CARD_H);
    this.trickLayer.add(img);
    playSfx(this, 'play');
    return new Promise<void>((res) => {
      this.tweens.add({
        targets: img, x: to.x, y: to.y, duration: 200, ease: 'Quad.out',
        onComplete: () => {
          // Guard: a trick-clear (removeAll) can destroy this image before the flip fires.
          if (seat !== 0 && img.scene) img.setTexture(cardKey(card)).setDisplaySize(CARD_W, CARD_H);
          res();
        },
      });
    });
  }

  private animateTrickWon(winner: Seat): Promise<void> {
    const to = SEAT_POS[winner];
    const targets = (this.trickLayer.list.slice() as Phaser.GameObjects.Image[]).filter((o) => o.scene);
    playSfx(this, 'win');
    return new Promise<void>((res) => {
      if (targets.length === 0) { res(); return; }
      this.tweens.add({
        targets, x: to.x, y: to.y, alpha: 0, duration: 250, ease: 'Quad.in',
        onComplete: () => { this.trickLayer.removeAll(true); res(); },
      });
    });
  }

  // ---- helpers / overlays ----
  private delay(ms: number): Promise<void> {
    return new Promise<void>((res) => { this.time.delayedCall(ms, res); });
  }

  private showToast(text: string): void {
    const t = this.add.text(W / 2, H / 2 - 200, text, {
      fontSize: '40px', color: '#222', backgroundColor: '#ffd34d', padding: { x: 24, y: 12 },
    }).setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, delay: 1100, duration: 500, onComplete: () => t.destroy() });
  }

  private showMatchOverlay(): void {
    const [us, them] = this.client.scores();
    const weWin = us >= 6 || them <= -6;
    playSfx(this, 'matchWin');
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6);
    this.add.text(W / 2, H / 2 - 80, weWin ? 'You win!' : 'You lose', { fontSize: '76px', color: '#ffd34d' }).setOrigin(0.5);
    this.add.text(W / 2, H / 2, `Us ${us} · Them ${them}`, { fontSize: '40px', color: '#fff' }).setOrigin(0.5);
    const btn = this.add.text(W / 2, H / 2 + 130, 'Rematch', {
      fontSize: '52px', color: '#222', backgroundColor: '#ffd34d', padding: { x: 40, y: 18 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerup', () => { playSfx(this, 'button'); this.scene.start('Menu'); });
  }
}
