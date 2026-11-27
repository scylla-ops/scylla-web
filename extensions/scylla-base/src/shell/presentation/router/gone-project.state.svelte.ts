/**
 * The project of the URL that does not exist, or that this user cannot read (the two look the
 * same). The shell reads it, to show no sidebar and no crumb of a project that is not there.
 */
let id = $state<string | null>(null);

export const goneProject = {
  get id(): string | null {
    return id;
  },
  mark(projectId: string): void {
    id = projectId;
  },
  /** Only the one that marked it clears it: a page that leaves must not clear its successor. */
  clear(projectId: string): void {
    if (id === projectId) id = null;
  },
};
