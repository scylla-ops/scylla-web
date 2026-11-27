import type { RecentRow } from './command-row.ts';

const LIMIT = 8;

const keyOf = (workspaceId: string): string => `scylla-command-bar-recent:${workspaceId}`;

/** An id, or a row of the server search with what it shows: no live list gives it again. */
type Entry = string | RecentRow;

const isRecentRow = (value: unknown): value is RecentRow => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Partial<RecentRow>;
  return (
    typeof row.id === 'string' &&
    typeof row.group === 'string' &&
    typeof row.name === 'string' &&
    typeof row.href === 'string'
  );
};

const idOf = (entry: Entry): string => (typeof entry === 'string' ? entry : entry.id);

const readEntries = (workspaceId: string | null): Entry[] => {
  if (!workspaceId) return [];
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(keyOf(workspaceId)) ?? '[]');
    return Array.isArray(stored)
      ? stored.filter((entry): entry is Entry => typeof entry === 'string' || isRecentRow(entry))
      : [];
  } catch {
    return [];
  }
};

/** The ids of the last picks in a workspace, the last one first. The rows come from the live lists. */
export const readRecent = (workspaceId: string | null): string[] =>
  readEntries(workspaceId).map(idOf);

/** The stored rows of the server search among the last picks, the last one first. */
export const readRecentRows = (workspaceId: string | null): RecentRow[] =>
  readEntries(workspaceId).filter(isRecentRow);

/** `row`: what a row of the server search shows, kept with its id. */
export const addRecent = (workspaceId: string | null, rowId: string, row?: RecentRow): void => {
  if (!workspaceId) return;
  const entry: Entry = row ?? rowId;
  const next = [entry, ...readEntries(workspaceId).filter(item => idOf(item) !== rowId)].slice(
    0,
    LIMIT,
  );
  try {
    localStorage.setItem(keyOf(workspaceId), JSON.stringify(next));
  } catch {
    // A private window can refuse it: the bar works without the list.
  }
};
