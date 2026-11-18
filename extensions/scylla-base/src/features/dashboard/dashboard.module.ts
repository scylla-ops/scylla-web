import { msg } from '@lingui/core/macro';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import { Permission } from '@platform/authz';
import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { DashboardServiceClient } from '@base/generated/scylla/dashboards/v1/dashboard_service.client.ts';
import { GrpcDashboardLayoutRepository } from './infrastructure/grpc-dashboard-layout.repository.ts';
import { LocalDashboardPreferences } from './infrastructure/local-dashboard-preferences.ts';
import DashboardPanel from './presentation/ui/DashboardPanel/DashboardPanel.svelte';

const dashboardLayoutRepository = new GrpcDashboardLayoutRepository(
  new DashboardServiceClient(grpcTransport.getTransport()),
);
const dashboardPreferences = new LocalDashboardPreferences();

const page = () => import('./presentation/ui/Dashboard/Dashboard.page.svelte');

export const DashboardModule = {
  id: 'dashboard',
  domain: {
    dashboardLayoutRepository,
    dashboardPreferences,
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
