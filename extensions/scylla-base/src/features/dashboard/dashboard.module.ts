import { msg } from '@lingui/core/macro';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import { Permission } from '@platform/authz';
import type { ScyllaModule } from '@scylla/core-sdk';

export const DashboardModule = {
  id: 'dashboard',
  domain: {},
  routes: {
    workspace: [
      {
        path: 'dashboard',
        // The overview reads the workspace; every workspace redirect lands here.
        permission: Permission.READ_WORKSPACE,
        breadcrumb: () => ({ label: msg`Dashboard` }),
        page: () => import('./presentation/ui/Dashboard/Dashboard.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Overview`,
          icon: LayoutDashboard,
          order: 10,
          group: { id: 'dashboard', title: msg`Dashboard`, icon: LayoutDashboard },
        },
      },
    ],
  },
} satisfies ScyllaModule;
