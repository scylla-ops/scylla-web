import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FOLD_MS, UNFOLD_MS } from '../fold.ts';
import { morphHeight } from '../morph-height.attachments.ts';

/** The box follows the new part for 1 s after a swap. */
const FOLLOW_MS = 1000;

const FRAME_MS = 16;

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));
};

/** The MutationObserver calls back in a microtask. */
const settle = () => new Promise(resolve => setTimeout(resolve));

/** A part of the box with a height that the test changes: jsdom has no layout. */
const part = (height: number) => {
  const node = document.createElement('div');
  node.style.height = `${height}px`;
  return Object.assign(node, { resize: (next: number) => (node.style.height = `${next}px`) });
};

/** Svelte starts the outro of a part: it is inert while it fades out. */
const leave = (node: HTMLElement) => {
  node.inert = true;
  node.setAttribute('inert', '');
};

/** The height of the box at each frame, for `ms`; `null` when it has no height of its own. */
const heights = (box: HTMLElement, ms: number, each?: (elapsed: number) => void) => {
  const seen: (number | null)[] = [];
  for (let elapsed = 0; elapsed < ms; elapsed += FRAME_MS) {
    each?.(elapsed);
    vi.advanceTimersByTime(FRAME_MS);
    seen.push(box.style.height === '' ? null : parseFloat(box.style.height));
  }
  return seen;
};

const numbers = (seen: (number | null)[]) =>
  seen.filter((height): height is number => height !== null);

let box: HTMLDivElement;
let detach: () => void;

beforeEach(() => {
  setReducedMotion(false);
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
  box = document.createElement('div');
  document.body.append(box);
});

afterEach(() => {
  detach?.();
  vi.useRealTimers();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('morphHeight', () => {
  it('moves the box once from the part that goes to the part that comes: the heights never add up', async () => {
    const chips = part(40);
    box.append(chips);
    detach = morphHeight(box);

    const cards = part(240);
    leave(chips);
    box.append(cards);
    await settle();

    expect(box.style.height).toBe('40px');
    expect(box.style.overflow).toBe('clip');
    const seen = heights(box, FOLLOW_MS + 4 * FRAME_MS, elapsed => {
      if (elapsed >= FOLD_MS) chips.remove();
    });
    const moving = numbers(seen);
    expect(moving.every((height, index) => index === 0 || height >= moving[index - 1])).toBe(true);
    expect(Math.min(...moving)).toBeGreaterThanOrEqual(40);
    expect(Math.max(...moving)).toBeLessThanOrEqual(240);
    expect(seen[Math.ceil(UNFOLD_MS / FRAME_MS) + 1]).toBe(240);
    expect(seen.at(-1)).toBeNull();
    expect(box.style.overflow).toBe('');
  });

  it('follows a part that grows while the box moves, with no jump after the move', async () => {
    const chips = part(40);
    box.append(chips);
    detach = morphHeight(box);

    const cards = part(240);
    leave(chips);
    box.append(cards);
    await settle();
    // The widgets of the cards mount before the first frame, their pipelines load during the move.
    cards.resize(260);
    const seen = heights(box, FOLLOW_MS + 4 * FRAME_MS, elapsed => {
      if (elapsed === 96) cards.resize(325);
      if (elapsed >= FOLD_MS) chips.remove();
    });

    const moving = numbers(seen).filter(
      (height, index, all) => index === 0 || height !== all[index - 1],
    );
    const steps = moving.slice(1).map((height, index) => height - moving[index]);
    expect(steps.every(step => step >= 0)).toBe(true);
    // The box slows down from its first frame to its last one: no kick, no jump.
    expect(steps.every((step, index) => index === 0 || step <= steps[index - 1] + 1)).toBe(true);
    expect(steps.at(-1)).toBeLessThan(2);
    expect(moving.at(-1)).toBeGreaterThan(320);
    expect(Math.max(...moving)).toBeLessThanOrEqual(325);
    expect(seen.at(-1)).toBeNull();
  });

  it('folds the box to the part that comes, as fold', async () => {
    const cards = part(240);
    box.append(cards);
    detach = morphHeight(box);

    const chips = part(40);
    leave(cards);
    box.append(chips);
    await settle();

    const seen = heights(box, FOLLOW_MS + 4 * FRAME_MS, elapsed => {
      if (elapsed >= FOLD_MS) cards.remove();
    });
    const moving = numbers(seen);
    expect(moving[0]).toBe(240);
    expect(moving.every((height, index) => index === 0 || height <= moving[index - 1])).toBe(true);
    expect(Math.min(...moving)).toBeGreaterThanOrEqual(40);
    expect(seen.at(-1)).toBeNull();
  });

  it('moves the box again for data that loads after the move, with no jump', async () => {
    const chips = part(40);
    box.append(chips);
    detach = morphHeight(box);

    const cards = part(240);
    leave(chips);
    box.append(cards);
    await settle();
    const seen = heights(box, FOLLOW_MS + 4 * FRAME_MS, elapsed => {
      if (elapsed >= FOLD_MS) chips.remove();
      if (elapsed === 400) cards.resize(325);
    });

    const at = (ms: number) => seen[Math.round(ms / FRAME_MS) - 1];
    expect(at(352)).toBe(240);
    const moving = numbers(seen);
    const steps = moving.slice(1).map((height, index) => height - moving[index]);
    expect(steps.every(step => step >= 0)).toBe(true);
    expect(Math.max(...steps.slice(Math.round(400 / FRAME_MS)))).toBeLessThan(85 / 2);
    expect(at(400 + UNFOLD_MS + 2 * FRAME_MS)).toBe(325);
    expect(seen.at(-1)).toBeNull();
  });

  it('keeps no height at rest: a change inside a part is instant', async () => {
    const cards = part(240);
    box.append(cards);
    detach = morphHeight(box);

    cards.append(document.createElement('article'));
    cards.resize(300);
    await settle();
    vi.advanceTimersByTime(FRAME_MS);

    expect(box.style.height).toBe('');
  });

  it('moves nothing for a person who asked for less motion', async () => {
    setReducedMotion(true);
    const chips = part(40);
    box.append(chips);
    detach = morphHeight(box);

    chips.remove();
    box.append(part(240));
    await settle();
    vi.advanceTimersByTime(FRAME_MS);

    expect(box.style.height).toBe('');
  });
});
