import { msg } from '@lingui/core/macro';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import { Permission } from '@platform/authz';
import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { DashboardServiceClient } from '@base/generated/scylla/dashboards/v1/dashboard_service.client.ts';
import { AgentServiceClient } from '@base/generated/scylla/agents/v1/agent_service.client.ts';
import { TriggerServiceClient } from '@base/generated/scylla/pipelines/v1/trigger_service.client.ts';
import { GrpcAttentionRepository } from './infrastructure/grpc-attention.repository.ts';
import { GrpcDashboardLayoutRepository } from './infrastructure/grpc-dashboard-layout.repository.ts';
import { GrpcSlotUsageRepository } from './infrastructure/grpc-slot-usage.repository.ts';
import { GrpcSchedulesRepository } from './infrastructure/grpc-schedules.repository.ts';
import { LocalDashboardPreferences } from './infrastructure/local-dashboard-preferences.ts';
import DashboardPanel from './presentation/ui/DashboardPanel/DashboardPanel.svelte';

const dashboardClient = new DashboardServiceClient(grpcTransport.getTransport());
const dashboardLayoutRepository = new GrpcDashboardLayoutRepository(dashboardClient);
const attentionRepository = new GrpcAttentionRepository(dashboardClient);
const dashboardPreferences = new LocalDashboardPreferences();
const schedulesRepository = new GrpcSchedulesRepository(new TriggerServiceClient(grpcTransport.getTransport()));
const slotUsageRepository = new GrpcSlotUsageRepository(new AgentServiceClient(grpcTransport.getTransport()));

const page = () => import('./presentation/ui/Dashboard/Dashboard.page.svelte');

export const DashboardModule = {
  id: 'dashboard',
  domain: {
    dashboardLayoutRepository,
    dashboardPreferences,
    attentionRepository,
    slotUsageRepository,
    schedulesRepository,
  },
  routes: {
    workspace: [
      {
        path: 'dashboard',
        // The overview reads the workspace; every workspace redirect lands here.
        permission: Permission.READ_WORKSPACE,
        breadcrumb: () => ({ label: msg`Dashboard` }),
        page,
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
      },
    ],
  },
  shell: {
    secondSidebarPanels: { dashboard: DashboardPanel },
  },
} satisfies ScyllaModule;
