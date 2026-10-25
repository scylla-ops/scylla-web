import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';
import type { JobDrag } from './job-drag.state.svelte.ts';

// A private type: an editor or an input that takes `text/plain` does not take the id of a job.
const JOB_TYPE = 'application/x-scylla-job';

/**
 * Makes a grip draggable: it carries its job, and the row that contains it is the dragged picture.
 * A grip, not the row: Firefox does not start a native drag from a mousedown on a button.
 */
export const dragJob =
  (options: () => { id: string; drag: JobDrag }): Attachment<HTMLElement> =>
  node => {
    const { id, drag } = untrack(options);

    const onDragStart = (event: DragEvent) => {
      const row = node.closest('li');
      event.dataTransfer?.setData(JOB_TYPE, id);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove';
      if (row) event.dataTransfer?.setDragImage?.(row, 0, 0);
      drag.start(id);
    };
    const onDragEnd = () => drag.end();

    node.draggable = true;
    node.addEventListener('dragstart', onDragStart);
    node.addEventListener('dragend', onDragEnd);
    return () => {
      node.draggable = false;
      // The grip left during the drag (the job was removed): no `dragend` comes.
      if (drag.dragged === id) drag.end();
      node.removeEventListener('dragstart', onDragStart);
      node.removeEventListener('dragend', onDragEnd);
    };
  };

/**
 * Makes an element a place to drop a job: a job (`target`), or the "runs first" zone (`null`).
 * Alt keeps the other dependencies; the cursor shows a copy then.
 */
export const acceptJobDrop =
  (options: () => { target: string | null; drag: JobDrag }): Attachment<HTMLElement> =>
  node => {
    const { target, drag } = untrack(options);
    const keeps = (event: DragEvent) => event.altKey && target !== null;

    const onDragOver = (event: DragEvent) => {
      if (!drag.canDrop(target)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = keeps(event) ? 'copy' : 'move';
      drag.hover(target);
    };
    const onDragLeave = (event: DragEvent) => {
      if (!node.contains(event.relatedTarget as Node | null)) drag.leave(target);
    };
    const onDrop = (event: DragEvent) => {
      if (!drag.canDrop(target)) return;
      event.preventDefault();
      drag.drop(target, keeps(event));
    };

    node.addEventListener('dragover', onDragOver);
    node.addEventListener('dragleave', onDragLeave);
    node.addEventListener('drop', onDrop);
    return () => {
      node.removeEventListener('dragover', onDragOver);
      node.removeEventListener('dragleave', onDragLeave);
      node.removeEventListener('drop', onDrop);
    };
  };
