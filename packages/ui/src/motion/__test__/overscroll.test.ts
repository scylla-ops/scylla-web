import { describe, it, expect, vi, afterEach } from 'vitest';
import { overscrollGlow } from '../overscroll.attachments.ts';

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));
};

const scroller = (atBottom: boolean) => {
  const node = document.createElement('div');
  document.body.append(node);
  Object.defineProperty(node, 'clientHeight', { value: 100 });
  Object.defineProperty(node, 'scrollHeight', { value: 400 });
  Object.defineProperty(node, 'scrollTop', { value: atBottom ? 300 : 0, writable: true });
  return node;
};

const wheel = (node: HTMLElement, deltaY: number) =>
  node.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true }));

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('overscrollGlow', () => {
  it('glows when the wheel pushes past the end, then releases', () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    const node = scroller(true);
    const detach = overscrollGlow({ edges: 'bottom', size: 'page' })(node);

    wheel(node, 120);
    expect(node.classList.contains('overscroll-glow')).toBe(true);
    expect(node.dataset.overscroll).toBe('rise');
    const first = Number(node.style.getPropertyValue('--overscroll-b'));
    expect(first).toBeGreaterThan(0);
    wheel(node, 120);
    expect(Number(node.style.getPropertyValue('--overscroll-b'))).toBeGreaterThan(first);

    vi.advanceTimersByTime(130);
    expect(node.dataset.overscroll).toBe('fall');
    expect(node.style.getPropertyValue('--overscroll-b')).toBe('0');
    detach?.();
    expect(node.classList.contains('overscroll-glow')).toBe(false);
  });

  it('does nothing away from the end, for a small delta or an up push on one edge', () => {
    setReducedMotion(false);
    const middle = scroller(false);
    overscrollGlow({ edges: 'bottom', size: 'page' })(middle);
    wheel(middle, 120);
    expect(middle.dataset.overscroll).toBeUndefined();

    const end = scroller(true);
    overscrollGlow({ edges: 'bottom', size: 'page' })(end);
    wheel(end, 2);
    wheel(end, -120);
    expect(end.dataset.overscroll).toBeUndefined();
  });

  it('glows on the top edge with both edges', () => {
    setReducedMotion(false);
    const node = scroller(false);
    overscrollGlow({ edges: 'both', size: 'page' })(node);
    wheel(node, -120);
    expect(Number(node.style.getPropertyValue('--overscroll-t'))).toBeGreaterThan(0);
    expect(node.style.getPropertyValue('--overscroll-b')).toBe('');
  });

  it('pulses once for a key that goes to the end', () => {
    setReducedMotion(false);
    const node = scroller(true);
    overscrollGlow({ edges: 'bottom', size: 'page' })(node);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(node.style.getPropertyValue('--overscroll-b')).toBe('0.6');
  });

  it('keeps a fixed intensity under reduced motion', () => {
    setReducedMotion(true);
    const node = scroller(true);
    overscrollGlow({ edges: 'bottom', size: 'page' })(node);
    wheel(node, 400);
    expect(node.style.getPropertyValue('--overscroll-b')).toBe('0.5');
  });
});
