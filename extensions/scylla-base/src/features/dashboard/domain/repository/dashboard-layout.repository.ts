import type { DashboardLayout } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';

/** The dashboards of one workspace. The browser holds them until a route of the server does. */
export interface DashboardLayoutRepository {
  /** The default dashboard comes first, also when nothing is stored. */
  list(workspaceId: string): Promise<DashboardLayout[]>;
  save(workspaceId: string, dashboards: readonly DashboardLayout[]): Promise<void>;
}
