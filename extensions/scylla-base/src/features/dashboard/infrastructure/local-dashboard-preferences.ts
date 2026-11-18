import type { DashboardPreferences } from '@base/features/dashboard/domain/repository/dashboard-layout.repository.ts';
import type { DashboardSet } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import * as storedDashboards from './stored-dashboards.mapper.ts';

const legacyKey = (workspaceId: string) => `dashboards:${workspaceId}`;
const defaultKey = (workspaceId: string) => `dashboards-default:${workspaceId}`;

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The default dashboard of the person and the layouts of an older build, in the browser. */
export class LocalDashboardPreferences implements DashboardPreferences {
  constructor(private readonly storage: () => PreferenceStorage = () => localStorage) {}

  public defaultId(workspaceId: string): string | null {
    return this.storage().getItem(defaultKey(workspaceId));
  }

  public setDefaultId(workspaceId: string, id: string): void {
    this.storage().setItem(defaultKey(workspaceId), id);
  }

  public legacy(workspaceId: string): DashboardSet | null {
    return storedDashboards.toDashboardSet(this.storage().getItem(legacyKey(workspaceId)));
  }

  public forgetLegacy(workspaceId: string): void {
    this.storage().removeItem(legacyKey(workspaceId));
  }
}
