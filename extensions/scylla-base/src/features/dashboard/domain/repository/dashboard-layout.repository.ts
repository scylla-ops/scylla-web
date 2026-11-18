import type { DashboardSet } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';

/** The dashboards of one workspace. The browser holds them until a route of the server does. */
export interface DashboardLayoutRepository {
  /** `null` when the workspace stored nothing: the caller makes the first set. */
  get(workspaceId: string): Promise<DashboardSet | null>;
  save(workspaceId: string, set: DashboardSet): Promise<void>;
}
