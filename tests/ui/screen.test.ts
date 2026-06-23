// @vitest-environment jsdom
// tests/ui/screen.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Screen } from '../../src/ui/dom/Screen';
import { el } from '../../src/ui/dom/el';

describe('Screen router', () => {
  let root: HTMLElement;
  beforeEach(() => { root = el('div'); document.body.append(root); });

  it('shows one screen and hides the rest', () => {
    const s = new Screen(root);
    s.mount('menu', el('div', { text: 'menu' }));
    s.mount('setup', el('div', { text: 'setup' }));
    s.show('menu');
    expect(s.current()).toBe('menu');
    expect(root.querySelectorAll('.screen.on').length).toBe(1);
    s.show('setup');
    expect(s.current()).toBe('setup');
    expect(root.querySelector('.screen.on')!.textContent).toBe('setup');
  });

  it('throws on unknown id', () => {
    const s = new Screen(root);
    expect(() => s.show('menu')).toThrow();
  });
});
