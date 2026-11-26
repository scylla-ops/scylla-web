import { describe, it, expect, vi } from 'vitest';
import { ENTER_MS, EXIT_MS, RISE_PX, enter, exit } from '../enter.ts';
import { enterOnActivate } from '../enter.attachments.ts';
import { REFLOW_MS, reflow } from '../reflow.ts';
import { FOLD_MS, UNFOLD_MS } from '../fold.ts';

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));
};

const rect = (top: number) => new DOMRect(0, top, 100, 20);

/** The MutationObserver calls back in a microtask. */
const settle = () => new Promise(resolve => setTimeout(resolve));

describe('enter and exit', () => {
  it('fades in and rises a little, then leaves with a shorter fade', () => {
    setReducedMotion(false);

    expect(enter().duration).toBe(ENTER_MS);
    expect(exit().duration).toBe(EXIT_MS);
    expect(EXIT_MS).toBeLessThan(ENTER_MS);
    expect(enter().css?.(0, 1)).toBe(`opacity: 0; transform: translateY(${RISE_PX}px)`);
    expect(enter().css?.(1, 0)).toBe('opacity: 1; transform: translateY(0px)');
    expect(exit().css?.(0.5, 0.5)).toBe('opacity: 0.5');
  });

  it('keeps every move in the range of 120 to 250 ms, the exit shorter than the enter', () => {
    for (const [enterMs, exitMs] of [
      [ENTER_MS, EXIT_MS],
      [UNFOLD_MS, FOLD_MS],
    ]) {
      expect(enterMs).toBeLessThanOrEqual(250);
      expect(exitMs).toBeGreaterThanOrEqual(120);
      expect(exitMs).toBeLessThan(enterMs);
    }
    expect(REFLOW_MS).toBeLessThanOrEqual(250);
  });

  it('is instant for a person who asked for less motion', () => {
    setReducedMotion(true);

    expect(enter().duration).toBe(0);
    expect(exit().duration).toBe(0);
  });
});

describe('reflow', () => {
  it('slides an item from its old place to its new one, in a fixed time', () => {
    setReducedMotion(false);
    const node = document.createElement('li');

    const move = reflow(node, { from: rect(0), to: rect(400) });

    expect(move.duration).toBe(REFLOW_MS);
    expect(move.css?.(0.5, 0.5)).toBe('transform: translate(0px, -200px)');
  });

  it('keeps still an item that does not move, or that the pointer drags', () => {
    setReducedMotion(false);
    const node = document.createElement('li');

    expect(reflow(node, { from: rect(40), to: rect(40) }).duration).toBe(0);
    expect(reflow(node, { from: rect(0), to: rect(40) }, { still: true }).duration).toBe(0);
  });

  it('is instant for a person who asked for less motion', () => {
    setReducedMotion(true);
    const node = document.createElement('li');

    expect(reflow(node, { from: rect(0), to: rect(40) }).duration).toBe(0);
  });
});

describe('enterOnActivate', () => {
  const mount = (state: string) => {
    const node = document.createElement('div');
    node.dataset.state = state;
    document.body.append(node);
    const detach = enterOnActivate(node);
    return { node, detach };
  };

  it('plays the enter each time the element becomes active, not when it mounts', async () => {
    setReducedMotion(false);
    const { node, detach } = mount('active');
    await settle();
    expect(node.animate).not.toHaveBeenCalled();

    node.dataset.state = 'inactive';
    await settle();
    expect(node.animate).not.toHaveBeenCalled();

    node.dataset.state = 'active';
    await settle();
    expect(node.animate).toHaveBeenCalledTimes(1);
    expect(vi.mocked(node.animate).mock.calls[0][1]).toMatchObject({ duration: ENTER_MS });

    detach();
    node.remove();
  });

  it('plays nothing for a person who asked for less motion', async () => {
    setReducedMotion(true);
    const { node, detach } = mount('inactive');

    node.dataset.state = 'active';
    await settle();

    expect(node.animate).not.toHaveBeenCalled();
    detach();
    node.remove();
  });
});
