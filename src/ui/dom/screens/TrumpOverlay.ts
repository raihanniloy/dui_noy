// src/ui/dom/screens/TrumpOverlay.ts
import { el } from '../el';
import type { Action, Suit } from '../types';

const GLYPH: Record<Suit, string> = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
const RED = new Set<Suit>(['hearts', 'diamonds']);

export function TrumpOverlay(opts: { legal: Action[]; onAction(a: Action): void }): HTMLElement {
  const choices = opts.legal.filter((a): a is Extract<Action, { type: 'chooseTrump' }> => a.type === 'chooseTrump');
  let selectedIdx = -1;
  const tiles: HTMLElement[] = [];

  choices.forEach((a, i) => {
    const label = a.mode.kind === 'suit' ? GLYPH[a.mode.suit] : a.mode.kind === 'seventh' ? '7th' : 'Joker';
    const color = a.mode.kind === 'suit' && RED.has(a.mode.suit) ? '#cc3b30' : 'var(--color-ink)';
    const tile = el('div', { class: 'suit-tile', style: `color:${color}`, text: label });
    tile.addEventListener('click', () => {
      if (selectedIdx === i) { opts.onAction(a); return; }   // second tap confirms
      selectedIdx = i;
      tiles.forEach((t) => t.classList.remove('sel'));
      tile.classList.add('sel');
    });
    tiles.push(tile);
  });

  return el('div', { class: 'overlay', style: 'position:relative;height:100%;width:100%' }, [
    el('div', { class: 'overlay-dim' }),
    el('div', { class: 'sheet' }, [
      el('div', { class: 'caption', style: 'text-align:center;color:var(--color-ink-muted-48)', text: 'You won the bid' }),
      el('div', { class: 'display-md', style: 'text-align:center;margin:6px 0 22px', text: 'Choose trump' }),
      el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:14px' }, tiles),
      el('div', { class: 'caption', style: 'text-align:center;color:var(--color-ink-muted-48);margin-top:18px', text: 'Tap a suit, tap again to confirm' }),
    ]),
  ]);
}
