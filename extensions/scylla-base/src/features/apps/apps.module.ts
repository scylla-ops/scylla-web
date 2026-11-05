import type { NavGroup, ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import BlocksIcon from '@lucide/svelte/icons/blocks';
import ServerIcon from '@lucide/svelte/icons/server';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { AppServiceClient } from '@base/generated/scylla/apps/v1/app_service.client.ts';
import { JobServiceClient } from '@base/generated/scylla/pipelines/v1/job_service.client.ts';
import { AccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import { AgentServiceClient } from '@base/generated/scylla/agents/v1/agent_service.client.ts';
import { DefaultAppsRepository } from './infrastructure/default-apps.repository.ts';

const transport = grpcTransport.getTransport();
const appsRepository = new DefaultAppsRepository(
  new AppServiceClient(transport),
  new JobServiceClient(transport),
  new AccessServiceClient(transport),
  new AgentServiceClient(transport),
);

/** The agents and the other apps fold under one item of the sidebar. */
const MACHINES: NavGroup = { id: 'machines', title: msg`Machines`, icon: ServerIcon };

/** The page of an agent, under its list. */
const agentDetails = {
  path: ':appId',
  permission: Permission.READ_APP,
  breadcrumb: () => ({ label: msg`Agent`, detail: msg`Detail` }),
  page: () => import('./presentation/ui/AgentDetails/AgentDetails.page.svelte'),
};

/** The page of another app, under its list. */
const appDetails = {
  path: ':appId',
  permission: Permission.READ_APP,
  breadcrumb: () => ({ label: msg`App`, detail: msg`Detail` }),
  page: () => import('./presentation/ui/AppDetails/AppDetails.page.svelte'),
};

/** Two lists of the apps of a workspace: the agents, which run jobs, and the other apps. */
export const AppsModule = {
  id: 'apps',
  domain: {
    appsRepository,
  },
  routes: {
    workspace: [
      {
        path: 'agents',
        permission: Permission.LIST_APPS_BY_WORKSPACE,
        breadcrumb: () => ({ label: msg`Agents` }),
        page: () => import('./presentation/ui/Agents/Agents.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Agents`,
          icon: ServerIcon,
          order: 40,
          group: MACHINES,
        },
        children: [agentDetails],
      },
      {
        path: 'apps',
        permission: Permission.LIST_APPS_BY_WORKSPACE,
        breadcrumb: () => ({ label: msg`Apps` }),
        page: () => import('./presentation/ui/Apps/Apps.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Apps`,
          icon: BlocksIcon,
          order: 41,
          group: MACHINES,
        },
        children: [appDetails],
      },
    ],
  },
} satisfies ScyllaModule;
