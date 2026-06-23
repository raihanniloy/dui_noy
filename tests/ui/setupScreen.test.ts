// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { SetupScreen } from '../../src/ui/dom/screens/SetupScreen';

function chipRow(node: HTMLElement, label: string): HTMLElement {
  const head = [...node.querySelectorAll('.caption-strong')].find((e) => e.textContent!.includes(label))!;
  return head.parentElement!.querySelector('.chip-row') as HTMLElement;
}

describe('SetupScreen', () => {
  it('defaults to hard / 6 and deals that', () => {
    const onDeal = vi.fn();
    const node = SetupScreen({ onBack: () => {}, onDeal });
    (node.querySelector('button.pill-primary') as HTMLButtonElement).click();
    expect(onDeal).toHaveBeenCalledWith({ difficulty: 'hard', points: 6 });
  });

  it('selecting a chip moves the highlight and changes the deal payload', () => {
    const onDeal = vi.fn();
    const node = SetupScreen({ onBack: () => {}, onDeal });
    const diff = chipRow(node, 'Difficulty');
    const easy = [...diff.querySelectorAll('.chip')].find((c) => c.textContent === 'Easy') as HTMLElement;
    easy.click();
    expect(easy.classList.contains('chip-on')).toBe(true);
    expect(diff.querySelectorAll('.chip-on').length).toBe(1);
    (node.querySelector('button.pill-primary') as HTMLButtonElement).click();
    expect(onDeal).toHaveBeenCalledWith({ difficulty: 'easy', points: 6 });
  });
});
