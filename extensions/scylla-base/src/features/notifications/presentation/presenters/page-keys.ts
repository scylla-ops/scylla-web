/** What a key does on the full page. */
export type PageKey = 'next' | 'previous' | 'open' | 'read' | 'done' | 'select';

const KEYS: Readonly<Record<string, PageKey>> = {
  j: 'next',
  k: 'previous',
  Enter: 'open',
  u: 'read',
  e: 'done',
  x: 'select',
};

const TEXT_TAGS: ReadonlySet<string> = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const interactive = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    TEXT_TAGS.has(target.tagName) ||
    target.isContentEditable ||
    target.closest('[role="dialog"], [role="listbox"], [role="menu"]') !== null
  );
};

/** The action of a key. A key does nothing with a modifier, or while the focus is in a field. */
export const pageKey = (event: KeyboardEvent): PageKey | null => {
  if (event.ctrlKey || event.metaKey || event.altKey || interactive(event.target)) return null;
  // Enter on a button or a link is that control's own action.
  if (event.key === 'Enter' && event.target instanceof HTMLElement) {
    if (event.target.closest('a, button')) return null;
  }
  return KEYS[event.key] ?? null;
};
