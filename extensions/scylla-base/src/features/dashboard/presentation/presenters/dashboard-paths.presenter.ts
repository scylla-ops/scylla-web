/** The path of a dashboard in its workspace. The default one is also at `dashboard`. */
export const dashboardPath = (id: string, isDefault: boolean): string =>
  isDefault ? 'dashboard' : `dashboards/${id}`;
