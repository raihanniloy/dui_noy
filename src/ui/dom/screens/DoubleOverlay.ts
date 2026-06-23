// src/ui/dom/screens/DoubleOverlay.ts
import { el } from '../el';
import type { Action } from '../types';

const LABEL: Record<string, string> = { double: 'Double', redouble: 'Redouble', declineDouble: 'No' };

export function DoubleOverlay(opts: { legal: Action[]; onAction(a: Action): void }): HTMLElement {
  const buttons = opts.legal.map((a) =>
    el('button', { class: a.type === 'declineDouble' ? 'pill pill-quiet' : 'pill pill-primary', text: LABEL[a.type] ?? a.type,
      onclick: () => opts.onAction(a) }));

  return el('div', { class: 'overlay', style: 'position:relative;height:100%;width:100%' }, [
    el('div', { class: 'overlay-dim' }),
    el('div', { class: 'sheet' }, [
      el('div', { class: 'display-md', style: 'text-align:center;margin-bottom:6px', text: 'Double?' }),
      el('div', { class: 'caption', style: 'text-align:center;color:var(--color-ink-muted-48);margin-bottom:20px', text: 'Raise the stake on this hand.' }),
      el('div', { style: 'display:flex;flex-direction:column;gap:10px' }, buttons),
    ]),
  ]);
}
