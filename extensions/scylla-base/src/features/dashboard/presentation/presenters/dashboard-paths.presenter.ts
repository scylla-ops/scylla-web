/** The path of a dashboard in its workspace. The default one is also at `dashboard`. */
export const dashboardPath = (id: string, isDefault: boolean): string =>
  isDefault ? 'dashboard' : `dashboards/${id}`;

/**
 * The link of a dashboard for another person: its own path, never `dashboard`, which opens the
 * default dashboard of each person. `search` keeps the period.
 */
export const dashboardLink = (
  origin: string,
  workspaceSlug: string,
  id: string,
  search: string,
): string => `${origin}/${workspaceSlug}/${dashboardPath(id, false)}${search}`;
