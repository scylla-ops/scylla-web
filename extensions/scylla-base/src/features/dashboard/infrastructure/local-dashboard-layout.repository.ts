import type { DashboardLayoutRepository } from '@base/features/dashboard/domain/repository/dashboard-layout.repository.ts';
import type { DashboardSet } from '@base/features/dashboard/domain/structs/dashboard-layout.struct.ts';
import * as storedDashboards from './stored-dashboards.mapper.ts';

const storageKey = (workspaceId: string) => `dashboards:${workspaceId}`;

type LayoutStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Keeps the dashboards in the storage of the browser, one key for each workspace. */
export class LocalDashboardLayoutRepository implements DashboardLayoutRepository {
  constructor(private readonly storage: () => LayoutStorage = () => localStorage) {}

  public get(workspaceId: string): Promise<DashboardSet | null> {
    return Promise.resolve().then(() =>
      storedDashboards.toDashboardSet(this.storage().getItem(storageKey(workspaceId))),
    );
  }

  public save(workspaceId: string, set: DashboardSet): Promise<void> {
    return Promise.resolve().then(() => {
      this.storage().setItem(storageKey(workspaceId), storedDashboards.toStored(set));
    });
  }
}
