import { msg } from '@lingui/core/macro';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import { Permission } from '@platform/authz';
import type { ScyllaModule } from '@scylla/core-sdk';
import { LocalDashboardLayoutRepository } from './infrastructure/local-dashboard-layout.repository.ts';
import { dashboardLinks } from './presentation/ui/dashboard-links.state.svelte.ts';
import { shownDashboard } from './presentation/ui/dashboard-layout.state.svelte.ts';

const dashboardLayoutRepository = new LocalDashboardLayoutRepository();

export const DashboardModule = {
  id: 'dashboard',
  domain: {
    dashboardLayoutRepository,
  },
  routes: {
    workspace: [
      {
        path: 'dashboard',
        // The overview reads the workspace; every workspace redirect lands here.
        permission: Permission.READ_WORKSPACE,
        breadcrumb: () => ({ label: msg`Overview` }),
        page: () => import('./presentation/ui/Dashboard/Dashboard.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Overview`,
          keywords: msg`dashboard home`,
          icon: LayoutDashboard,
          order: 10,
          group: { id: 'dashboard', title: msg`Dashboards`, icon: LayoutDashboard },
        },
      },
      {
        path: 'dashboards/:dashboardId',
        permission: Permission.READ_WORKSPACE,
        breadcrumb: ({ dashboardName }) => ({ label: dashboardName ?? msg`Dashboard` }),
        page: () => import('./presentation/ui/Dashboard/Dashboard.page.svelte'),
      },
    ],
  },
  shell: {
    secondSidebarLinks: dashboardLinks,
    breadcrumbParams: () => ({ dashboardName: shownDashboard.name }),
  },
} satisfies ScyllaModule;
