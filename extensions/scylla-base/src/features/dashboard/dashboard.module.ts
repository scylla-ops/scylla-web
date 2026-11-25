import { msg } from '@lingui/core/macro';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import { Permission } from '@platform/authz';
import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { DashboardServiceClient } from '@base/generated/scylla/dashboards/v1/dashboard_service.client.ts';
import { AgentServiceClient } from '@base/generated/scylla/agents/v1/agent_service.client.ts';
import { TriggerServiceClient } from '@base/generated/scylla/pipelines/v1/trigger_service.client.ts';
import { ActivityServiceClient } from '@base/generated/scylla/activity/v1/activity_service.client.ts';
import { VcsConnectionServiceClient } from '@base/generated/scylla/integrations/v1/vcs_connection_service.client.ts';
import { GrpcAttentionRepository } from './infrastructure/grpc-attention.repository.ts';
import { GrpcDashboardLayoutRepository } from './infrastructure/grpc-dashboard-layout.repository.ts';
import { GrpcSlotUsageRepository } from './infrastructure/grpc-slot-usage.repository.ts';
import { GrpcAgentMetricsRepository } from './infrastructure/grpc-agent-metrics.repository.ts';
import { GrpcSchedulesRepository } from './infrastructure/grpc-schedules.repository.ts';
import { GrpcActivityRepository } from './infrastructure/grpc-activity.repository.ts';
import { GrpcDeliveryStatsRepository } from './infrastructure/grpc-delivery-stats.repository.ts';
import { LocalDashboardPreferences } from './infrastructure/local-dashboard-preferences.ts';
import DashboardPanel from './presentation/ui/DashboardPanel/DashboardPanel.svelte';
import { dashboardView } from './presentation/ui/dashboard-view.state.svelte.ts';

const dashboardClient = new DashboardServiceClient(grpcTransport.getTransport());
const dashboardLayoutRepository = new GrpcDashboardLayoutRepository(dashboardClient);
const attentionRepository = new GrpcAttentionRepository(dashboardClient);
const dashboardPreferences = new LocalDashboardPreferences();
const activityRepository = new GrpcActivityRepository(new ActivityServiceClient(grpcTransport.getTransport()));
const triggerClient = new TriggerServiceClient(grpcTransport.getTransport());
const schedulesRepository = new GrpcSchedulesRepository(triggerClient);
const deliveryStatsRepository = new GrpcDeliveryStatsRepository(
  new VcsConnectionServiceClient(grpcTransport.getTransport()),
  triggerClient,
);
const agentClient = new AgentServiceClient(grpcTransport.getTransport());
const slotUsageRepository = new GrpcSlotUsageRepository(agentClient);
const agentMetricsRepository = new GrpcAgentMetricsRepository(agentClient);

const page = () => import('./presentation/ui/Dashboard/Dashboard.page.svelte');

/** A link to the dashboard of the page, never to `dashboard`: it opens the default of each person. */
const share = { url: () => dashboardView.shareUrl };

export const DashboardModule = {
  id: 'dashboard',
  domain: {
    dashboardLayoutRepository,
    dashboardPreferences,
    attentionRepository,
    slotUsageRepository,
    agentMetricsRepository,
    schedulesRepository,
    activityRepository,
    deliveryStatsRepository,
  },
  routes: {
    workspace: [
      {
        path: 'dashboard',
        // The overview reads the workspace; every workspace redirect lands here.
        permission: Permission.READ_WORKSPACE,
        breadcrumb: () => ({ label: msg`Dashboard` }),
        page,
        share,
        nav: {
          section: 'workspace',
          title: msg`Overview`,
          keywords: msg`dashboard home`,
          icon: LayoutDashboard,
          order: 10,
          group: { id: 'dashboard', title: msg`Dashboard`, icon: LayoutDashboard },
        },
      },
      {
        path: 'dashboards/:dashboardId',
        permission: Permission.READ_WORKSPACE,
        breadcrumb: () => ({ label: msg`Dashboard` }),
        page,
        share,
      },
    ],
  },
  shell: {
    secondSidebarPanels: { dashboard: DashboardPanel },
  },
} satisfies ScyllaModule;
