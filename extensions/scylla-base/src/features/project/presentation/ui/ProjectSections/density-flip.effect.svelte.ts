import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import { ENTER_EASING, prefersReducedMotion, REFLOW_MS } from '@scylla/ui';

const CELLS = ':scope > [data-card]';

const boxesOf = (grid: HTMLElement): Map<string, DOMRect> =>
  new Map(
    [...grid.querySelectorAll<HTMLElement>(CELLS)].map(cell => [
      cell.dataset.card ?? '',
      cell.getBoundingClientRect(),
    ]),
  );

/**
 * A section takes another density: each card slides from its old place to its new one and fades
 * in its new shape (FLIP), as `reflow` for a move. With a reduced motion, the change is instant.
 * The component calls it, and puts the attachment that it gives on its grid.
 */
export const flipDensity = (density: () => string): Attachment<HTMLElement> => {
  let grid: HTMLElement | null = null;
  let last = untrack(density);
  let before: Map<string, DOMRect> | null = null;

  // Before the grid and its cards change: their old places.
  $effect.pre(() => {
    if (density() !== last && grid) before = boxesOf(grid);
  });
  $effect(() => {
    const next = density();
    if (next === last) return;
    last = next;
    const from = before;
    before = null;
    if (!grid || !from || prefersReducedMotion()) return;
    for (const cell of grid.querySelectorAll<HTMLElement>(CELLS)) {
      const old = from.get(cell.dataset.card ?? '');
      const to = cell.getBoundingClientRect();
      const dx = old ? old.left - to.left : 0;
      const dy = old ? old.top - to.top : 0;
      cell.animate(
        [
          { opacity: 0, transform: `translate(${dx}px, ${dy}px)` },
          { opacity: 1, transform: 'none' },
        ],
        { duration: REFLOW_MS, easing: ENTER_EASING },
      );
    }
  });

  return node => {
    grid = node;
    return () => {
      if (grid === node) grid = null;
    };
  };
};
