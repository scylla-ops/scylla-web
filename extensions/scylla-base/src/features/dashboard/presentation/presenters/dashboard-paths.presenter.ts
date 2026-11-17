import { DEFAULT_DASHBOARD_ID } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';

/** The route that makes a new dashboard and opens it in the edit mode. */
export const NEW_DASHBOARD_ID = 'new';
export const NEW_DASHBOARD_PATH = `dashboards/${NEW_DASHBOARD_ID}`;

/** The path of a dashboard in its workspace. The default dashboard is `dashboard`, the others `dashboards/<id>`. */
export const dashboardPath = (id: string): string =>
  id === DEFAULT_DASHBOARD_ID ? 'dashboard' : `dashboards/${id}`;
