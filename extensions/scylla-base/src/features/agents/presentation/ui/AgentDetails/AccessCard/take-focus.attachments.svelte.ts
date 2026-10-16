import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';

/** Focuses the node each time `request` grows: for a control that a dialog removed. */
export const takeFocus =
  (request: () => number): Attachment<HTMLElement> =>
  node => {
    let last = untrack(request);
    $effect(() => {
      const next = request();
      if (next > last) node.focus();
      last = next;
    });
  };
