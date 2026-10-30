import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { AgentAdminServiceClient } from '@base/generated/scylla/agent/v1/agent_admin.client.ts';
import { JobServiceClient } from '@base/generated/scylla/job/v1/job.client.ts';
import { PipelineServiceClient } from '@base/generated/scylla/pipeline/v1/pipeline.client.ts';
import { DefaultAgentsRepository } from './infrastructure/default-agents.repository.ts';

const repository = new DefaultAgentsRepository(
  new AgentAdminServiceClient(grpcTransport.getTransport()),
  new JobServiceClient(grpcTransport.getTransport()),
  new PipelineServiceClient(grpcTransport.getTransport()),
);

export const AgentsModule = {
  id: 'agents',
  domain: {
    agentsRepository: repository,
  },
  routes: {
    organization: [
      {
        path: 'agents',
        permission: Permission.LIST_AGENTS,
        breadcrumb: () => ({ label: msg`Agents` }),
        page: () => import('./presentation/ui/Agents/Agents.page.svelte'),
        nav: { section: 'organization', title: msg`Agents`, icon: HardDriveIcon, order: 40 },
        children: [
          {
            path: ':agentId',
            permission: Permission.READ_APP,
            breadcrumb: () => ({ label: msg`Agent details` }),
            page: () => import('./presentation/ui/AgentDetails/AgentDetails.page.svelte'),
          },
        ],
      },
    ],
  },
} satisfies ScyllaModule;
