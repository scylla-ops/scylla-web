import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import type { NodeDrag } from './node-drag.state.svelte.ts';

// A private type: an editor or an input that takes `text/plain` does not take the id of a node.
const NODE_TYPE = 'application/x-scylla-node';

/**
 * Makes a grip draggable: it carries its node, and the row that contains it is the dragged picture.
 * A grip, not the row: Firefox does not start a native drag from a mousedown on a button.
 */
export const dragNode =
  (options: () => { id: string; drag: NodeDrag }): Attachment<HTMLElement> =>
  element => {
    const { id, drag } = untrack(options);

    const onDragStart = (event: DragEvent) => {
      const row = element.closest('li');
      event.dataTransfer?.setData(NODE_TYPE, id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove';
      if (row) event.dataTransfer?.setDragImage?.(row, 0, 0);
      drag.start(id);
    };
    const onDragEnd = () => drag.end();

    element.draggable = true;
    element.addEventListener('dragstart', onDragStart);
    element.addEventListener('dragend', onDragEnd);
    return () => {
      element.draggable = false;
      // The grip left during the drag (the node was removed): no `dragend` comes.
      if (drag.dragged === id) drag.end();
      element.removeEventListener('dragstart', onDragStart);
      element.removeEventListener('dragend', onDragEnd);
    };
  };

/**
 * Makes an element a place to drop a node: a node (`target`), or the "runs first" zone (`null`).
 * Alt keeps the other dependencies; the cursor shows a copy then.
 */
export const acceptNodeDrop =
  (options: () => { target: string | null; drag: NodeDrag }): Attachment<HTMLElement> =>
  element => {
    const { target, drag } = untrack(options);
    const keeps = (event: DragEvent) => event.altKey && target !== null;

    const onDragOver = (event: DragEvent) => {
      if (!drag.canDrop(target)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = keeps(event) ? 'copy' : 'move';
      drag.hover(target);
    };
    const onDragLeave = (event: DragEvent) => {
      if (!element.contains(event.relatedTarget as Node | null)) drag.leave(target);
    };
    const onDrop = (event: DragEvent) => {
      if (!drag.canDrop(target)) return;
      event.preventDefault();
      drag.drop(target, keeps(event));
    };

    element.addEventListener('dragover', onDragOver);
    element.addEventListener('dragleave', onDragLeave);
    element.addEventListener('drop', onDrop);
    return () => {
      element.removeEventListener('dragover', onDragOver);
      element.removeEventListener('dragleave', onDragLeave);
      element.removeEventListener('drop', onDrop);
    };
  };
