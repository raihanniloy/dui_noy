// src/ui/dom/screens/BidOverlay.ts
import { el } from '../el';
import type { Action } from '../types';

export function BidOverlay(opts: { legal: Action[]; onAction(a: Action): void }): HTMLElement {
  const values = opts.legal.filter((a): a is Extract<Action, { type: 'bid' }> => a.type === 'bid').map((a) => a.value);
  const canPass = opts.legal.some((a) => a.type === 'pass');
  let idx = 0;

  const ring = el('div', { class: 'bid-ring', text: values.length ? String(values[idx]) : '—' });
  const refresh = (): void => { ring.textContent = values.length ? String(values[idx]) : '—'; };

  const minus = el('button', { class: 'round-btn', 'data-act': 'minus', text: '−',
    onclick: () => { if (idx > 0) { idx--; refresh(); } } });
  const plus = el('button', { class: 'round-btn', 'data-act': 'plus', text: '+',
    onclick: () => { if (idx < values.length - 1) { idx++; refresh(); } } });
  const pass = el('button', { 'data-act': 'pass', style: 'flex:1;height:54px;border-radius:9999px;border:1px solid rgba(255,255,255,.22);background:transparent;color:#fff;font-weight:600;font-size:16px;cursor:pointer', text: 'Pass',
    onclick: () => opts.onAction({ type: 'pass', seat: 0 }) });

  const controls: HTMLElement[] = [minus, ...(canPass ? [pass] : []), plus];
  const bidBtn = el('button', { 'data-act': 'bid', style: 'width:100%;height:46px;border-radius:9999px;border:none;cursor:pointer;font-weight:600;font-size:17px;color:#fff;background:var(--color-primary)', text: values.length ? `Bid ${values[idx]}` : 'Bid',
    onclick: () => { if (values.length) opts.onAction({ type: 'bid', seat: 0, value: values[idx]! }); } });
  // keep the bid button label in sync with the ring
  const syncLabel = (): void => { bidBtn.textContent = values.length ? `Bid ${values[idx]}` : 'Bid'; };
  minus.addEventListener('click', syncLabel); plus.addEventListener('click', syncLabel);

  return el('div', { class: 'overlay', style: 'position:relative;height:100%;width:100%' }, [
    el('div', { style: 'position:absolute;left:50%;top:120px;transform:translateX(-50%);text-align:center' }, [
      el('div', { class: 'caption', style: 'color:var(--color-body-muted);margin-bottom:10px', text: 'Your bid' }),
      ring,
      el('div', { class: 'fine-print', style: 'margin-top:10px', text: 'min 16 · max 28' }),
    ]),
    el('div', { style: 'position:absolute;bottom:194px;left:24px;right:24px;display:flex;align-items:center;gap:12px' }, controls),
    el('div', { style: 'position:absolute;bottom:130px;left:24px;right:24px' }, [bidBtn]),
  ]);
}
