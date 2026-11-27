import { cubicIn, cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import { fold, motionDuration, REFLOW_MS } from '@scylla/ui';

const IN_MS = 180;
const OUT_MS = 120;

/** A part of the reorder mode comes in: the bar, the text of a drop, the move icon of a card. */
export const reorderIn = (_node?: Element): TransitionConfig => ({
  duration: motionDuration(IN_MS),
  easing: cubicOut,
  css: t => `opacity: ${t}; transform: translateY(${(1 - t) * -4}px)`,
});

/** It goes out, faster. */
export const reorderOut = (_node?: Element): TransitionConfig => ({
  duration: motionDuration(OUT_MS),
  easing: cubicIn,
  css: t => `opacity: ${t}`,
});

/** A drop zone closes with `fold`; at once during a drag, when the slot takes its place. */
export const foldZone = (node: Element, { now = false }: { now?: boolean } = {}): TransitionConfig =>
  now ? { duration: 0 } : fold(node);

/** The cell of a grid: a card (`id`), or the slot. */
interface CellParams {
  id?: string;
  /** The slot fades out: a card is dragged. Else it goes at once, under the card that lands. */
  fade?: boolean;
}

/** The boxes of the cards that left a section in this update, by project. */
const leaving = new Map<string, DOMRect>();

/** A card leaves a section: its box stays for one update, for the section where it comes in. */
export const leave = (node: Element, { id, fade = false }: CellParams): TransitionConfig => {
  if (!id) return fade ? reorderOut(node) : { duration: 0 };
  const box = node.getBoundingClientRect();
  // A hidden grid gives no box: the card shows at once where it comes.
  if (box.width > 0) leaving.set(id, box);
  setTimeout(() => leaving.delete(id));
  return { duration: 0 };
};

/**
 * A card comes in a section: it slides from the box where it left another section in the same
 * update, else it shows at once. The slot fades in and grows a little.
 */
export const arrive =
  (node: Element, { id }: CellParams) =>
  (): TransitionConfig => {
    if (!id) {
      return {
        duration: motionDuration(IN_MS),
        easing: cubicOut,
        css: t => `opacity: ${t}; transform: scale(${0.96 + 0.04 * t})`,
      };
    }
    const from = leaving.get(id);
    leaving.delete(id);
    if (!from) return { duration: 0 };
    const to = node.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    return {
      duration: dx === 0 && dy === 0 ? 0 : motionDuration(REFLOW_MS),
      easing: cubicOut,
      css: (_t, u) => `transform: translate(${u * dx}px, ${u * dy}px)`,
    };
  };
