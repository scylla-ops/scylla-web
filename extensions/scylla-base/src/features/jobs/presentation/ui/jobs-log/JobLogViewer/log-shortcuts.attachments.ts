import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';

/** The keys of the log viewer. Each one also has a control with a label in the toolbar. */
export interface LogShortcuts {
  /** `/` */
  search: () => void;
  /** `E` */
  nextError: () => void;
  /** `Shift+E` */
  previousError: () => void;
  /** `F` */
  toggleFullscreen: () => void;
  /** `Escape`, only in full screen. */
  exitFullscreen?: () => void;
}

/** A key typed in a field, or in a menu or a dialog that is open, is not a shortcut. */
const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest('input, textarea, select, [role="menu"], [role="dialog"], [role="listbox"]')) {
    return true;
  }
  return false;
};

/**
 * Listens to the keys of the log on the window, while the viewer is on the page. A key with
 * Ctrl, Cmd or Alt stays for the browser.
 */
export const listenToLogShortcuts =
  (shortcuts: () => LogShortcuts): Attachment<HTMLElement> =>
  element => {
    const window = element.ownerDocument.defaultView;
    if (!window) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;

      const keys = untrack(shortcuts);
      let action: (() => void) | undefined;
      if (event.key === '/') action = keys.search;
      else if (event.key === 'e' && !event.shiftKey) action = keys.nextError;
      else if (event.key === 'E' && event.shiftKey) action = keys.previousError;
      else if (event.key === 'f' && !event.shiftKey) action = keys.toggleFullscreen;
      else if (event.key === 'Escape') action = keys.exitFullscreen;
      if (!action) return;

      event.preventDefault();
      action();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  };
