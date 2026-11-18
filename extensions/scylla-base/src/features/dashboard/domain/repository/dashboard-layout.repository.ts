import type {
  DashboardLayout,
  DashboardSet,
  DashboardVisibility,
  LayoutWidget,
} from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';

/** A dashboard that the server keeps: its version comes back in each change. */
export interface StoredDashboard extends DashboardLayout {
  version: number;
  visibility: DashboardVisibility;
  teamDefault: boolean;
}

/** A dashboard to create. */
export interface DashboardDraft {
  name: string;
  widgets: readonly LayoutWidget[];
  visibility: DashboardVisibility;
}

/** A change of a dashboard of the `version` that the caller read. Unset fields do not change. */
export interface DashboardChange {
  id: string;
  version: number;
  name?: string;
  widgets?: readonly LayoutWidget[];
  visibility?: DashboardVisibility;
}

/** The dashboards of a workspace on the server (DashboardService). */
export interface DashboardLayoutRepository {
  /** The dashboards that the caller sees, with their widgets. */
  list(workspaceId: string): Promise<StoredDashboard[]>;
  create(workspaceId: string, draft: DashboardDraft): Promise<StoredDashboard>;
  /** A stale `version` gives a conflict (`ABORTED`): the caller reads the dashboards again. */
  update(change: DashboardChange): Promise<StoredDashboard>;
  remove(id: string): Promise<void>;
  /** The team default of the workspace: a dashboard that the workspace sees. */
  setTeamDefault(workspaceId: string, id: string): Promise<StoredDashboard>;
}

/** What the browser keeps: the default dashboard of the person, and the layouts of an older build. */
export interface DashboardPreferences {
  defaultId(workspaceId: string): string | null;
  setDefaultId(workspaceId: string, id: string): void;
  /** The layouts that the browser kept before the server did. `null` when there are none. */
  legacy(workspaceId: string): DashboardSet | null;
  /** Called after the import: the layouts are not imported a second time. */
  forgetLegacy(workspaceId: string): void;
}
