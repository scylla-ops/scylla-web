import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { AppServiceClient } from '@base/generated/scylla/apps/v1/app_service.client.ts';
import { JobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import { AccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import { DefaultAppsRepository } from './infrastructure/default-apps.repository.ts';

const transport = grpcTransport.getTransport();
const appsRepository = new DefaultAppsRepository(
  new AppServiceClient(transport),
  new JobServiceClient(transport),
  new AccessServiceClient(transport),
);

/** One page for the apps of a workspace; the agents are the apps that run jobs. */
export const AppsModule = {
  id: 'apps',
  domain: {
    appsRepository,
  },
  routes: {
    workspace: [
      {
        path: 'apps',
        permission: Permission.LIST_APPS_BY_WORKSPACE,
        breadcrumb: () => ({ label: msg`Apps` }),
        page: () => import('./presentation/ui/Apps/Apps.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Apps and agents`,
          icon: HardDriveIcon,
          order: 40,
        },
        children: [
          {
            path: ':appId',
            permission: Permission.READ_APP,
            breadcrumb: () => ({ label: msg`App`, detail: msg`Detail` }),
            page: () => import('./presentation/ui/AppDetails/AppDetails.page.svelte'),
          },
        ],
      },
      // The old address of the agents: the agents are a view of the apps now.
      { path: 'agents', redirect: 'apps' },
    ],
  },
} satisfies ScyllaModule;
