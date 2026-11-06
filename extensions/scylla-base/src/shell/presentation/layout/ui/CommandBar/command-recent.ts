const LIMIT = 8;

const keyOf = (workspaceId: string): string => `scylla-command-bar-recent:${workspaceId}`;

/** The ids of the last picks in a workspace, the last one first. The rows come from the live lists. */
export const readRecent = (workspaceId: string | null): string[] => {
  if (!workspaceId) return [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(keyOf(workspaceId)) ?? '[]');
    return Array.isArray(stored) ? stored.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

export const addRecent = (workspaceId: string | null, rowId: string): void => {
  if (!workspaceId) return;
  const next = [rowId, ...readRecent(workspaceId).filter(id => id !== rowId)].slice(0, LIMIT);
  try {
    localStorage.setItem(keyOf(workspaceId), JSON.stringify(next));
  } catch {
    // A private window can refuse it: the bar works without the list.
  }
};
