import type { Attachment } from 'svelte/attachments';

const OPEN_KEYS = ['Enter', ' '];

/**
 * Enter or Space on a focused node opens it, as a click does: xyflow only selects it. The node
 * element of xyflow carries the id of the node in `data-id`.
 */
export const openNodeOnKey =
  (open: (nodeId: string) => void): Attachment<HTMLElement> =>
  element => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { target } = event;
      if (!OPEN_KEYS.includes(event.key) || !(target instanceof HTMLElement)) return;
      if (target.classList.contains('svelte-flow__node') && target.dataset.id) open(target.dataset.id);
    };
    element.addEventListener('keydown', onKeyDown);
    return () => element.removeEventListener('keydown', onKeyDown);
  };
