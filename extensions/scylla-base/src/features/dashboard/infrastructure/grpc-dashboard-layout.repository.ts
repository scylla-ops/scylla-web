import type { IDashboardServiceClient } from '@base/generated/scylla/dashboards/v1/dashboard_service.client.ts';
import { required, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  DashboardChange,
  DashboardDraft,
  DashboardLayoutRepository,
  StoredDashboard,
} from '@base/features/dashboard/domain/repository/dashboard-layout.repository.ts';
import * as grpcDashboard from './grpc-dashboard.mapper.ts';

const PAGE_SIZE = 100;

/** The dashboards on the server. The list reads the widgets of each dashboard. */
export class GrpcDashboardLayoutRepository implements DashboardLayoutRepository {
  constructor(private readonly client: IDashboardServiceClient) {}

  public async list(workspaceId: string): Promise<StoredDashboard[]> {
    const dashboards = [];
    let token = '';
    do {
      const response = await this.client.listDashboards({
        workspaceId: wrapId(workspaceId),
        page: { size: PAGE_SIZE, token },
      }).response;
      dashboards.push(...response.dashboards);
      token = response.page?.nextToken ?? '';
    } while (token);
    return Promise.all(
      dashboards.map(async dashboard => {
        const response = await this.client.getDashboard({ dashboardId: dashboard.id }).response;
        return grpcDashboard.toStored(required(response.dashboard, 'dashboard'), response.widgets);
      }),
    );
  }

  public async create(workspaceId: string, draft: DashboardDraft): Promise<StoredDashboard> {
    const response = await this.client.createDashboard({
      workspaceId: wrapId(workspaceId),
      name: draft.name,
      visibility: grpcDashboard.toVisibility(draft.visibility),
      widgets: grpcDashboard.toWidgets(draft.widgets),
    }).response;
    return { ...grpcDashboard.toStored(required(response.dashboard, 'dashboard')), widgets: draft.widgets };
  }

  public async update(change: DashboardChange): Promise<StoredDashboard> {
    const response = await this.client.updateDashboard({
      dashboardId: wrapId(change.id),
      version: BigInt(change.version),
      ...(change.name !== undefined && { name: change.name }),
      visibility: grpcDashboard.toVisibility(change.visibility),
      ...(change.widgets && { widgets: grpcDashboard.toWidgets(change.widgets) }),
    }).response;
    const stored = grpcDashboard.toStored(required(response.dashboard, 'dashboard'));
    return change.widgets ? { ...stored, widgets: change.widgets } : stored;
  }

  public async remove(id: string): Promise<void> {
    await this.client.deleteDashboard({ dashboardId: wrapId(id) }).response;
  }

  public async setTeamDefault(workspaceId: string, id: string): Promise<StoredDashboard> {
    const response = await this.client.setTeamDefaultDashboard({
      workspaceId: wrapId(workspaceId),
      dashboardId: wrapId(id),
    }).response;
    return grpcDashboard.toStored(required(response.dashboard, 'dashboard'));
  }
}
