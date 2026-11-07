import type { Attachment } from 'svelte/attachments';

/**
 * Scrolls an element into view. A new request (a new object, also for the same node) scrolls
 * again: Svelte runs an attachment again when its expression gives a new function.
 */
export const revealOn =
  (_request: object): Attachment<HTMLElement> =>
  element =>
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
